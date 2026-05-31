import type { Metadata } from "next";
import { Manrope, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Aura | Youtube Mp3 Dönüştürücü",
  description: "Yüksek kaliteli ses elde etmek için premium bir araç. Hareketli görüntü kaynaklarından ses çıkarımını (MP3) kayıpsız yapın.",
  keywords: ["ses çıkarımı", "mp3 dönüştürücü", "video to mp3", "kayıpsız ses", "aura studio", "high fidelity audio"],
  authors: [{ name: "Aura Studio" }],
  openGraph: {
    title: "Aura | Youtube Mp3 Dönüştürücü",
    description: "Yüksek kaliteli ses elde etmek için premium bir araç. Ödün vermek yok. Bozulma yok.",
    url: "https://aurastudio.app",
    siteName: "Aura Studio",
    images: [
      {
        url: "/icon.png",
        width: 800,
        height: 600,
        alt: "Aura Studio Logo",
      },
    ],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura | Youtube Mp3 Dönüştürücü",
    description: "Yüksek kaliteli ses elde etmek için premium bir araç. Ödün vermek yok. Bozulma yok.",
    images: ["/icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html
      lang="tr"
      className={`${manrope.variable} ${cormorant.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Aura Studio",
              "applicationCategory": "MultimediaApplication",
              "description": "Yüksek kaliteli ses elde etmek için premium bir araç.",
              "operatingSystem": "All"
            })
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <h1 className="sr-only">Aura Studio - Ses Çıkarımı</h1>
        {children}
      </body>
    </html>
  );
}
