// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://paksayur.com';

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/jadwal`, lastModified: new Date() },
    { url: `${base}/club`, lastModified: new Date() },
    // tambah halaman penting lain di sini
  ];
}
