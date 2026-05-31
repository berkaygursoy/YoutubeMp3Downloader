import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['ffmpeg-static', 'fluent-ffmpeg', '@distube/ytdl-core'],
};

export default nextConfig;
