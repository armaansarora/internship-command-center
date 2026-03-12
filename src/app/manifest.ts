import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Internship Command Center',
    short_name: 'ICC',
    description: 'Your internship command center',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f7ff',
    theme_color: '#7c3aed',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
