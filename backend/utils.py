import os
import re
import uuid
import tempfile
import base64
import yt_dlp
from typing import Tuple, Optional

YOUTUBE_REGEX = re.compile(
    r'^(https?://)?(www\.)?(youtube\.com|youtu\.?be)/.+$'
)

def is_valid_youtube_url(url: str) -> bool:
    return bool(YOUTUBE_REGEX.match(url))

def _get_cookies_file() -> Optional[str]:
    """
    Reads YOUTUBE_COOKIES env var (base64-encoded cookies.txt),
    writes it to a temp file and returns its path.
    Returns None if no cookies are configured.
    """
    cookies_b64 = os.environ.get("YOUTUBE_COOKIES", "").strip()
    if not cookies_b64:
        return None
    try:
        cookies_content = base64.b64decode(cookies_b64).decode("utf-8")
        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".txt", delete=False, encoding="utf-8"
        )
        tmp.write(cookies_content)
        tmp.close()
        return tmp.name
    except Exception:
        return None

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

def download_and_convert_to_mp3(url: str, output_dir: str = "downloads") -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Downloads a YouTube video and converts it to MP3 using yt-dlp.
    Uses cookies from YOUTUBE_COOKIES env var to bypass bot detection.
    Returns (file_path, video_title, error_message).
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    file_id = str(uuid.uuid4())
    output_template = os.path.join(output_dir, f"{file_id}.%(ext)s")
    cookies_file = _get_cookies_file()

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "js_runtimes": {
            "deno": {},
            "node": {},
        },
        "remote_components": ["ejs:github"],
    }

    if cookies_file:
        ydl_opts["cookiefile"] = cookies_file
    else:
        # Check if built-in OAuth2 login is enabled (replaces obsolete oauth2 plugin)
        if os.environ.get("YOUTUBE_OAUTH", "").strip().lower() == "true":
            ydl_opts["username"] = "oauth2"
            ydl_opts["password"] = ""
        else:
            # Allow specifying a local browser to extract cookies from (great for local development)
            browser_env = os.environ.get("YOUTUBE_BROWSER", "").strip().lower()
            if browser_env:
                ydl_opts["cookiesfrombrowser"] = (browser_env,)
            else:
                # Fallback: try multiple working player clients for 2026 without cookies
                ydl_opts["extractor_args"] = {
                    "youtube": {
                        "player_client": ["android_vr", "android", "web"],
                    }
                }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            title = info_dict.get("title", "audio")

            mp3_path = os.path.join(output_dir, f"{file_id}.mp3")
            if os.path.exists(mp3_path):
                return mp3_path, title, None

            return None, None, "MP3 conversion failed — ffmpeg may be missing."
    except Exception as e:
        return None, None, str(e)
    finally:
        if cookies_file and os.path.exists(cookies_file):
            os.remove(cookies_file)
