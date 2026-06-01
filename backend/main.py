import os
import urllib.parse
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from utils import is_valid_youtube_url, download_and_convert_to_mp3, get_video_info, extract_youtube_id
from database import init_db, add_download, get_download_by_youtube_id

app = FastAPI(title="YouTube to MP3 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()

class ConvertRequest(BaseModel):
    url: str

def remove_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Error removing file {path}: {e}")

@app.post("/api/info")
async def get_info(request: ConvertRequest):
    url = request.url
    if not is_valid_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    title, thumbnail, error = get_video_info(url)
    if error or not title:
        raise HTTPException(status_code=500, detail=error or "Failed to fetch video info")
    
    return {"title": title, "thumbnail": thumbnail}

from fastapi.concurrency import run_in_threadpool

@app.post("/api/convert")
async def convert_video(request: ConvertRequest, background_tasks: BackgroundTasks):
    url = request.url
    if not is_valid_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    youtube_id = extract_youtube_id(url)
    cache_enabled = os.environ.get("CACHE_FILES", "true").lower() == "true"
    
    if youtube_id and cache_enabled:
        cached = get_download_by_youtube_id(youtube_id)
        if cached and os.path.exists(cached["file_path"]):
            file_path = cached["file_path"]
            title = cached["title"]
            
            safe_title = urllib.parse.quote(f"{title}.mp3")
            return FileResponse(
                path=file_path, 
                media_type="audio/mpeg", 
                filename=f"{title}.mp3",
                headers={
                    "Content-Disposition": f"attachment; filename*=UTF-8''{safe_title}",
                    "X-Cache-Lookup": "HIT"
                }
            )

    file_path, title, thumbnail_url, error = await run_in_threadpool(download_and_convert_to_mp3, url)
    
    if error or not file_path:
        raise HTTPException(status_code=500, detail=error or "Unknown error during conversion.")
    
    if youtube_id:
        file_id = os.path.basename(file_path).split(".")[0]
        try:
            add_download(file_id, youtube_id, title, thumbnail_url, file_path)
        except Exception as e:
            print(f"Error saving to database: {e}")
    
    safe_title = urllib.parse.quote(f"{title}.mp3")
    
    if not cache_enabled:
        background_tasks.add_task(remove_file, file_path)
    
    return FileResponse(
        path=file_path, 
        media_type="audio/mpeg", 
        filename=f"{title}.mp3",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{safe_title}",
            "X-Cache-Lookup": "MISS"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
