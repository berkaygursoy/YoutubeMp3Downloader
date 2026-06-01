import os
import re
import uuid
import requests
from typing import Tuple, Optional

YOUTUBE_REGEX = re.compile(
    r'^(https?://)?(www\.)?(youtube\.com|youtu\.?be)/.+$'
)

def is_valid_youtube_url(url: str) -> bool:
    return bool(YOUTUBE_REGEX.match(url))

def extract_youtube_id(url: str) -> Optional[str]:
    """
    Extracts the 11-character YouTube video ID from a URL.
    """
    pattern = r'(?:https?://)?(?:www\.)?(?:youtube\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/\s]{11})'
    match = re.search(pattern, url)
    return match.group(1) if match else None

def get_video_info(url: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Fetches the video title and thumbnail using YouTube's official oEmbed API.
    Returns (title, thumbnail_url, error_message).
    """
    import urllib.request
    import urllib.parse
    import json

    try:
        oembed_url = f"https://www.youtube.com/oembed?url={urllib.parse.quote(url)}&format=json"
        req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data.get("title", "Unknown Title"), data.get("thumbnail_url"), None
    except Exception as e:
        return None, None, f"Failed to fetch video info: {str(e)}"

def get_cobalt_download_url(url: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """
    Gets the direct MP3 download URL from Cobalt API.
    Returns (download_url, video_title, thumbnail_url, error_message).
    """
    title, thumbnail_url, info_err = get_video_info(url)
    if not title:
        title = "audio"

    cobalt_api_url = os.environ.get("COBALT_API_URL", "https://api.cobalt.tools/api/json").strip()
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    payload = {
        "url": url,
        "isAudioOnly": True,
        "audioFormat": "mp3",
        "audioBitrate": "192"
    }

    try:
        response = requests.post(cobalt_api_url, json=payload, headers=headers, timeout=30)
        if response.status_code != 200:
            return None, None, None, f"Cobalt API error (Status {response.status_code}): {response.text}"
        
        data = response.json()
        download_url = data.get("url")
        if not download_url:
            err_text = data.get("text", "No download URL returned from Cobalt.")
            return None, None, None, f"Cobalt error: {err_text}"

        return download_url, title, thumbnail_url, None
    except Exception as e:
        return None, None, None, f"Failed to get download URL: {str(e)}"
