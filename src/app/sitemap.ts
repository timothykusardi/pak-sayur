// src/app/sitemap.ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://paksayur.com";

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/jadwal`, lastModified: new Date() },
    { url: `${base}/club`, lastModified: new Date() },
    { url: `${base}/menu`, lastModified: new Date() },
    { url: `${base}/kontak`, lastModified: new Date() },
    { url: `${base}/blog`, lastModified: new Date() },
  ];
}
