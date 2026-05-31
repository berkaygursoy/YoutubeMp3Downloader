"use client";

import { useState } from "react";
import { Download, Music, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "fetching_info" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setStatus("fetching_info");
    setErrorMessage("");
    setVideoTitle("");
    setThumbnail("");

    try {
      // 1. Fetch metadata first
      const infoResponse = await fetch("http://localhost:8000/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!infoResponse.ok) {
        const errorData = await infoResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to fetch video info");
      }

      const infoData = await infoResponse.json();
      setVideoTitle(infoData.title);
      if (infoData.thumbnail) {
        setThumbnail(infoData.thumbnail);
      }
      
      // 2. Start conversion
      setStatus("loading");
      
      const response = await fetch("http://localhost:8000/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to convert video");
      }

      // Handle file download
      const blob = await response.blob();
      
      // Extract filename from header if possible, else fallback
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${infoData.title}.mp3`.replace(/[/\\?%*:|"<>]/g, '-'); // Fallback safe name
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        setVideoTitle("");
        setThumbnail("");
      }, 5000); // Reset after 5s
      setUrl("");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "An unexpected error occurred");
      setVideoTitle("");
      setThumbnail("");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-4 selection:bg-purple-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-neutral-950 -z-10" />
      
      <div className="w-full max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center border border-neutral-800 shadow-xl shadow-black/50">
            <Music className="w-8 h-8 text-neutral-200" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            YouTube to <span className="text-neutral-400">MP3</span>
          </h1>
          <p className="text-neutral-400 text-lg">
            Convert any YouTube video to high-quality audio in seconds.
          </p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleConvert} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium text-neutral-300 ml-1">
                YouTube URL
              </label>
              <div className="relative">
                <input
                  id="url"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-4 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-700 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Thumbnail Preview */}
            {thumbnail && (status === "loading" || status === "success") && (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-neutral-800 shadow-xl animate-in fade-in zoom-in-95 duration-500">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnail} alt="Video Thumbnail" className="object-cover w-full h-full opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-sm font-medium text-neutral-200 line-clamp-2">
                  {videoTitle}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading" || status === "fetching_info" || !url}
              className={cn(
                "w-full rounded-2xl py-4 font-medium flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98]",
                (status === "loading" || status === "fetching_info")
                  ? "bg-neutral-800 text-neutral-400 cursor-not-allowed" 
                  : "bg-neutral-100 text-neutral-950 hover:bg-white shadow-lg shadow-white/10"
              )}
            >
              {status === "fetching_info" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Fetching Video Info...
                </>
              ) : status === "loading" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="truncate max-w-[200px] sm:max-w-[300px]">Converting: {videoTitle}</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Convert to MP3
                </>
              )}
            </button>
          </form>

          {/* Status Messages */}
          <div className="mt-6">
            {status === "error" && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">{errorMessage}</p>
              </div>
            )}
            
            {status === "success" && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">
                  Success! Your download should begin immediately.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-500 font-medium tracking-wide uppercase">
          Production Ready • High Quality Audio
        </p>

      </div>
    </main>
  );
}
