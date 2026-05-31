import os
import urllib.parse
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils import is_valid_youtube_url, download_and_convert_to_mp3, get_video_info

app = FastAPI(title="YouTube to MP3 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

    # Offload the synchronous yt-dlp download to a background thread
    file_path, title, error = await run_in_threadpool(download_and_convert_to_mp3, url)
    
    if error or not file_path:
        raise HTTPException(status_code=500, detail=error or "Unknown error during conversion.")
    
    # URL-encode the title for the filename header to avoid ascii errors
    safe_title = urllib.parse.quote(f"{title}.mp3")
    
    background_tasks.add_task(remove_file, file_path)
    
    return FileResponse(
        path=file_path, 
        media_type="audio/mpeg", 
        filename=f"{title}.mp3",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_title}"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
