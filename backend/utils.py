import os
import re
import uuid
from typing import Tuple, Optional

YOUTUBE_REGEX = re.compile(
    r'^(https?://)?(www\.)?(youtube\.com|youtu\.?be)/.+$'
)

def is_valid_youtube_url(url: str) -> bool:
    return bool(YOUTUBE_REGEX.match(url))

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
        req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data.get('title', 'Unknown Title'), data.get('thumbnail_url'), None
    except Exception as e:
        return None, None, f"Failed to fetch video info: {str(e)}"

def download_and_convert_to_mp3(url: str, output_dir: str = "downloads") -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Downloads the YouTube video and converts it to MP3.
    Returns (file_path, video_title, error_message).
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    file_id = str(uuid.uuid4())

    try:
        from pytubefix import YouTube
        import subprocess
        
        # use_oauth=False disables manual login, it uses built-in JS PoW generator
        yt = YouTube(url, use_oauth=False, allow_oauth_cache=True)
        title = yt.title or 'audio'
        
        stream = yt.streams.get_audio_only()
        if not stream:
            return None, None, "No audio stream found"
            
        temp_filename = f"{file_id}_temp"
        out_file = stream.download(output_path=output_dir, filename=temp_filename)
        
        final_path = os.path.join(output_dir, f"{file_id}.mp3")
        
        # Convert to proper mp3 using ffmpeg
        subprocess.run(["ffmpeg", "-i", out_file, "-q:a", "0", "-map", "a", final_path, "-y"], 
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        # Cleanup temp file
        if os.path.exists(out_file):
            os.remove(out_file)
            
        return final_path, title, None
    except Exception as e:
        return None, None, str(e)
