// src/app/layout.tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://paksayur.com"), // ganti kalau domain beda
  title: {
    default: "Pak Sayur – Sayur Segar Keliling Surabaya",
    template: "%s · Pak Sayur",
  },
  description:
    "Pak Sayur adalah layanan sayur dan daging segar keliling untuk perumahan premium di Surabaya. Higienis, terjadwal, dan terpercaya dengan jadwal kunjungan pagi hari.",
  openGraph: {
    title: "Pak Sayur – Sayur Segar Keliling Surabaya",
    description:
      "Layanan sayur dan daging segar keliling ke Graha Family, Royal Residence, Pakuwon City, dan perumahan lain di Surabaya. Pre-order via WhatsApp, antar pagi hari.",
    url: "/",
    siteName: "Pak Sayur",
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${serif.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-deep text-gold antialiased">
        {children}
      </body>
    </html>
  );
}
