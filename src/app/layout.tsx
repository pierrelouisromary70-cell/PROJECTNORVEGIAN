import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nordic Run',
  description: 'Coaching course à pied basé sur la méthode norvégienne',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
