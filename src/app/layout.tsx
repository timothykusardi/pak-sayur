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
  title: { default: "Pak Sayur", template: "%s · Pak Sayur" },
  description: "Higienis · Terjadwal · Terpercaya",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-deep text-gold antialiased">
        {children}
      </body>
    </html>
  );
}
