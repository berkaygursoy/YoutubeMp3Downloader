import pytest
from utils import is_valid_youtube_url, extract_youtube_id

def test_is_valid_youtube_url_valid_links():
    valid_urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "http://youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://youtube.com/shorts/3xyz?feature=share",
        "www.youtube.com/watch?v=xyz",
        "youtube.com/watch?v=xyz"
    ]
    for url in valid_urls:
        assert is_valid_youtube_url(url) is True, f"Failed on valid URL: {url}"

def test_is_valid_youtube_url_invalid_links():
    invalid_urls = [
        "https://www.google.com/watch?v=dQw4w9WgXcQ",
        "http://vimeo.com/123456",
        "https://youtu.be.fake/dQw4w9WgXcQ",
        "just a random string",
        "youtube",
        "https://youtube.com" # Missing path
    ]
    for url in invalid_urls:
        assert is_valid_youtube_url(url) is False, f"Failed on invalid URL: {url}"

def test_extract_youtube_id():
    test_cases = [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ?t=12", "dQw4w9WgXcQ"),
        ("youtube.com/watch?v=kynr9ZCXtkw", "kynr9ZCXtkw"),
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ")
    ]
    for url, expected_id in test_cases:
        assert extract_youtube_id(url) == expected_id, f"Failed extracting from {url}"
