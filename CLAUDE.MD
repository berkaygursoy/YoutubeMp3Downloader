1
Act as a Senior Full-Stack Developer specializing in Node.js, Next.js (App Router), Tailwind CSS, and shadcn/ui. I want to build a highly optimized, single-page YouTube-to-MP3 downloader web application. 

To maximize token efficiency and prevent unnecessary explanations, please adhere strictly to the following constraints and generate only the technical setup and production-ready code.
Don't ask me questions except for critical issues.
### Agent Execution Rules (For Multi-Agent/Autonomous Workflows):
1. **Parallel Sub-Agents for Independent Files:** For any independent file operations, file creation, or isolated module implementations, utilize parallel sub-agents to handle tasks concurrently.
2. **Modular Refactoring:** Divide any large-scale refactoring or major architectural changes into distinct, isolated agent tasks to maintain code integrity and avoid token overflow.

### Tech Stack & UI Requirements:
- **Frontend:** Next.js (App Router, TypeScript) styled with Tailwind CSS.
- **UI Components:** Use shadcn/ui inspired minimal design (clean input bar, a conversion status/progress state, and a download button).
- **Backend:** Node.js integrated via Next.js API Routes (Route Handlers) to keep the project unified and efficient.
- **Core Libraries:** Use `yt-dlp` (executed via Node's child_process) or a highly stable Node-equivalent like `@distube/ytdl-core` along with `fluent-ffmpeg`.

### Core Architectural Requirements (For Resource and Cost Efficiency):
1. **Memory Efficiency (Streaming):** Do not load or buffer entire video/audio files into the server's RAM. Stream the audio chunks directly from the source to FFmpeg, and stream the output directly to the user to avoid Out-Of-Memory (OOM) crashes on low-spec VPS.
2. **CPU Optimization:** Optimize FFmpeg arguments to extract ONLY the audio stream directly from YouTube and convert it to MP3 with efficient encoding (e.g., 192kbps) to save CPU cycles.
3. **Storage Cleanup:** If temporary files are created on the server, implement an automatic cleanup mechanism immediately after the download completes or fails, preventing disk space accumulation.
4. **Error Handling:** Include robust error handling for common video extraction issues (e.g., age restrictions, rate limits).

### Expected Output Structure:
1. **Frontend Component:** A single, clean Next.js page component (`page.tsx`) using Tailwind CSS and shadcn/ui layout for the downloader interface.
2. **Backend API Route:** A complete Next.js Route Handler (`route.ts`) that handles the POST request, processes the YouTube URL, runs the extraction/conversion pipeline efficiently, and returns the MP3 as a downloadable stream.

Do not write long introductory or concluding text. Focus entirely on clean, well-commented, high-performance code.