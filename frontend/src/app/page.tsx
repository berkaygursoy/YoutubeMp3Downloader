"use client";

import { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export default function Home(): React.ReactElement {
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
      const API_BASE_URL = process.env.NODE_ENV === "production" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
      
      // 1. Fetch metadata first
      const infoResponse = await fetch(`${API_BASE_URL}/api/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!infoResponse.ok) {
        const errorData = await infoResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || "Video bilgisi alınamadı");
      }

      const infoData = await infoResponse.json();
      setVideoTitle(infoData.title);
      if (infoData.thumbnail) {
        setThumbnail(infoData.thumbnail);
      }
      
      // 2. Start conversion
      setStatus("loading");
      
      const response = await fetch(`${API_BASE_URL}/api/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Video dönüştürülemedi");
      }

      // Handle direct download via Cobalt URL
      const data = await response.json();
      if (!data.download_url) {
        throw new Error("İndirme bağlantısı alınamadı");
      }

      const a = document.createElement("a");
      a.style.display = "none";
      a.href = data.download_url;
      a.download = `${infoData.title || "audio"}.mp3`.replace(/[/\\?%*:|"<>]/g, '-');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        setVideoTitle("");
        setThumbnail("");
      }, 5000); 
      setUrl("");
    } catch (err: unknown) {
      console.error(err);
      setStatus("error");
      if (err instanceof Error) {
        setErrorMessage(err.message || "Beklenmeyen bir hata oluştu");
      } else {
        setErrorMessage("Beklenmeyen bir hata oluştu");
      }
      setVideoTitle("");
      setThumbnail("");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col selection:bg-gold selection:text-black">
      {/* Elegant Header */}
      <header className="w-full p-8 md:p-12 flex justify-between items-center z-10 reveal-fade">
        <div className="font-sans text-xs tracking-[0.2em] uppercase text-white/50">
          Arşiv
        </div>
        <div className="font-serif italic text-gold text-lg">
          Aura
        </div>
        <div className="font-sans text-xs tracking-[0.2em] uppercase text-white/50">
          Stüdyo
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-5xl mx-auto z-10">
      
      {/* GEO SEO Additions */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Aura Studio MP3 Converter",
            "operatingSystem": "Web",
            "applicationCategory": "MultimediaApplication"
          })
        }}
      />
      <h2 className="sr-only">Özellikler</h2>
      <h2 className="sr-only">Kullanım</h2>

      {/* Decorative Background Elements */}
        
        {/* Massive, Breathing Typography */}
        <div className="text-center space-y-6 mb-24 reveal-up delay-200">
          <h1 className="font-serif text-5xl md:text-7xl lg:text-[110px] tracking-tight leading-[0.9] text-white font-light">
            Kusursuz <br />
            <span className="text-gold italic pr-4">çıkarım.</span>
          </h1>
          <p className="font-sans text-sm md:text-base tracking-widest uppercase text-white/40 max-w-xl mx-auto leading-relaxed pt-8">
            Hareketli görüntü kaynaklarından ses elde etmek için premium bir araç. <br className="hidden md:block"/> Ödün vermek yok. Bozulma yok.
          </p>
        </div>

        {/* Minimalist Form */}
        <div className="w-full max-w-2xl reveal-up delay-500">
          <form onSubmit={handleConvert} className="w-full relative group">
            <div className="relative flex items-end">
              <label htmlFor="url" className="sr-only">Video Kaynak Bağlantısı</label>
              <input
                id="url"
                type="url"
                placeholder="Kaynak bağlantısını girin..."
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={status === "loading"}
                className="w-full bg-transparent border-b border-white/20 text-white font-serif text-2xl md:text-4xl pl-0 pr-32 md:pr-48 py-6 focus:outline-none focus:border-gold transition-colors duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-white/20 placeholder:italic disabled:opacity-50"
              />
              
              <button
                type="submit"
                disabled={status === "loading" || status === "fetching_info" || !url}
                className={cn(
                  "absolute right-0 bottom-6 text-sm tracking-[0.2em] uppercase flex items-center gap-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  (!url || status === "loading" || status === "fetching_info") 
                    ? "text-white/20 pointer-events-none" 
                    : "text-gold hover:text-white"
                )}
              >
                {(status === "loading" || status === "fetching_info") ? (
                  <span className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-gold" />
                    <span className="hidden sm:inline">İşleniyor</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-3 group-hover/btn:translate-x-2 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]">
                    <span className="hidden sm:inline">Başlat</span>
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </button>
            </div>
            
            {/* The line that grows on hover */}
            <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-gold transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full"></div>
          </form>

          {/* Feedback & Result States */}
          <div className="mt-16 relative min-h-[200px]">
            {/* Thumbnail Preview with Sepia/Monochrome filter */}
            {thumbnail && (status === "loading" || status === "success") && (
              <div className="absolute inset-0 reveal-fade">
                <div className="relative w-full max-w-sm mx-auto aspect-video overflow-hidden rounded-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={thumbnail} 
                    alt="Source" 
                    className="object-cover w-full h-full scale-105 sepia-[.6] brightness-75 contrast-125 hover:scale-100 transition-transform duration-[2000ms] ease-[cubic-bezier(0.22,1,0.36,1)]" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-0 w-full text-center px-4">
                    <p className="font-serif italic text-gold text-lg truncate drop-shadow-md">{videoTitle}</p>
                  </div>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 text-center reveal-fade">
                <p className="font-serif italic text-red-400/80 text-xl">{errorMessage}</p>
                <p className="font-sans text-xs tracking-widest uppercase text-white/30 mt-4">İşlem başarısız</p>
              </div>
            )}
            
            {status === "success" && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 reveal-fade">
                <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold">Çıkarım Tamamlandı</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle glowing orb */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold/5 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white/5 blur-[120px]"></div>
        
        {/* Grain overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")'}}></div>
      </div>
    </main>
  );
}
