FROM python:3.11-slim

# Install ffmpeg which is required for yt-dlp audio extraction
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose the port Uvicorn runs on
EXPOSE 8000

# Run the FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
