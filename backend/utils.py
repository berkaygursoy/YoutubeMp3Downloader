import os
import re
import uuid
import yt_dlp
from typing import Tuple, Optional

YOUTUBE_REGEX = re.compile(
    r'^(https?://)?(www\.)?(youtube\.com|youtu\.?be)/.+$'
)

def is_valid_youtube_url(url: str) -> bool:
    return bool(YOUTUBE_REGEX.match(url))

def get_video_info(url: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Fetches the video title and thumbnail without downloading.
    Returns (title, thumbnail_url, error_message).
    """
    ydl_opts = {
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web'],
                'player_skip': ['webpage', 'configs', 'js']
            }
        }
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=False)
            return info_dict.get('title', 'Unknown Title'), info_dict.get('thumbnail'), None
    except Exception as e:
        return None, None, str(e)

def download_and_convert_to_mp3(url: str, output_dir: str = "downloads") -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Downloads the YouTube video and converts it to MP3.
    Returns (file_path, video_title, error_message).
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    file_id = str(uuid.uuid4())
    output_template = os.path.join(output_dir, f"{file_id}_%(title)s.%(ext)s")

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_template,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web'],
                'player_skip': ['webpage', 'configs', 'js']
            }
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            title = info_dict.get('title', 'audio')
            
            for file in os.listdir(output_dir):
                if file.startswith(file_id) and file.endswith('.mp3'):
                    return os.path.join(output_dir, file), title, None
                    
            return None, None, "File was downloaded but MP3 conversion failed (ffmpeg might be missing)."
    except Exception as e:
        return None, None, str(e)
