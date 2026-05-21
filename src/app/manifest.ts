import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nordic Run',
    short_name: 'Nordic Run',
    description: 'Le protocole d\'entraînement norvégien, adapté chaque jour à votre corps.',
    start_url: '/fr/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#06060a',
    orientation: 'portrait',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
  };
}
