import os
import sys
import urllib.parse
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure the local api/ folder is in python path for Vercel deployment imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

import uuid
from utils import is_valid_youtube_url, get_cobalt_download_url, get_video_info, extract_youtube_id
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
async def convert_video(request: ConvertRequest):
    url = request.url
    if not is_valid_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    youtube_id = extract_youtube_id(url)
    
    download_url, title, thumbnail_url, error = await run_in_threadpool(get_cobalt_download_url, url)
    
    if error or not download_url:
        raise HTTPException(status_code=500, detail=error or "Unknown error during conversion.")
    
    if youtube_id:
        try:
            # We save the download_url to db just for history purposes
            add_download(str(uuid.uuid4()), youtube_id, title, thumbnail_url, download_url)
        except Exception as e:
            print(f"Error saving to database: {e}")
    
    return {"download_url": download_url, "title": title}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("index:app", host="0.0.0.0", port=8000, reload=True)
