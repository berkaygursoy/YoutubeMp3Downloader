import os
import sqlite3
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("TURSO_DATABASE_URL", "local.db")
AUTH_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "")

def get_connection():
    """
    Returns a connection to the database.
    If it's a remote Turso DB, it creates a libsql client.
    Otherwise, it uses the standard sqlite3 client for a local file.
    """
    if DATABASE_URL.startswith("libsql://") or DATABASE_URL.startswith("https://"):
        import libsql_client
        return libsql_client.create_client_sync(url=DATABASE_URL, auth_token=AUTH_TOKEN)
    else:
        conn = sqlite3.connect(DATABASE_URL)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    """
    Creates the tables if they do not exist.
    """
    create_table_query = """
    CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        youtube_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        thumbnail_url TEXT,
        file_path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    
    if DATABASE_URL.startswith("libsql://") or DATABASE_URL.startswith("https://"):
        client = get_connection()
        client.execute(create_table_query)
        client.close()
    else:
        conn = get_connection()
        with conn:
            conn.execute(create_table_query)
        conn.close()

def add_download(id_str: str, youtube_id: str, title: str, thumbnail_url: Optional[str], file_path: str):
    """
    Adds a download record to the database.
    """
    query = """
    INSERT OR REPLACE INTO downloads (id, youtube_id, title, thumbnail_url, file_path)
    VALUES (?, ?, ?, ?, ?);
    """
    if DATABASE_URL.startswith("libsql://") or DATABASE_URL.startswith("https://"):
        client = get_connection()
        client.execute(query, [id_str, youtube_id, title, thumbnail_url, file_path])
        client.close()
    else:
        conn = get_connection()
        with conn:
            conn.execute(query, (id_str, youtube_id, title, thumbnail_url, file_path))
        conn.close()

def get_download_by_youtube_id(youtube_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves a download record by its YouTube ID.
    """
    query = "SELECT * FROM downloads WHERE youtube_id = ?;"
    if DATABASE_URL.startswith("libsql://") or DATABASE_URL.startswith("https://"):
        client = get_connection()
        result = client.execute(query, [youtube_id])
        client.close()
        if result.rows:
            row = result.rows[0]
            return {
                "id": row[0],
                "youtube_id": row[1],
                "title": row[2],
                "thumbnail_url": row[3],
                "file_path": row[4],
                "created_at": row[5]
            }
        return None
    else:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, (youtube_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        return None
