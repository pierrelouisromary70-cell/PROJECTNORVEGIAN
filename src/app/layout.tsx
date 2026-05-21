import type { Metadata, Viewport } from 'next';
import './globals.css';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nordicrun.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Nordic Run — La méthode d\'entraînement norvégienne, adaptée à votre corps',
    template: '%s · Nordic Run',
  },
  description:
    'Coaching course à pied basé sur la méthode norvégienne. Allures calibrées par VDOT, adaptées chaque jour à votre fatigue, votre cycle et vos contraintes de temps. 14 jours gratuits.',
  keywords: ['méthode norvégienne', 'entraînement course à pied', 'double seuil', 'VDOT', 'Jack Daniels', 'plan marathon', 'plan 10K', 'plan semi', 'coaching running', 'Ingebrigtsen'],
  authors: [{ name: 'Nordic Run' }],
  creator: 'Nordic Run',
  publisher: 'Nordic Run',
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    title: 'Nordic Run — La méthode d\'entraînement norvégienne',
    description: 'Allures calibrées par votre VDOT, adaptées chaque jour à votre fatigue, votre cycle et vos contraintes de temps.',
    url: baseUrl,
    siteName: 'Nordic Run',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nordic Run — La méthode d\'entraînement norvégienne',
    description: 'Allures calibrées par votre VDOT, adaptées chaque jour. 14 jours gratuits.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: {
    canonical: '/',
    languages: { 'fr-FR': '/fr', 'en-US': '/en' },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#06060a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
