import { ImageResponse } from 'next/og';

export const alt = 'Nordic Run — La méthode d\'entraînement norvégienne, adaptée à votre corps';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #06060a 0%, #1a1a21 60%, #064e3b 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '60px 80px', color: 'white', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 18, height: 18, background: '#10b981', borderRadius: '50%' }} />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>Nordic Run</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2.5, display: 'flex', flexDirection: 'column' }}>
            <span>Le seul plan qui</span>
            <span style={{ color: '#34d399', fontStyle: 'italic' }}>apprend de votre corps.</span>
          </div>
          <div style={{ fontSize: 22, lineHeight: 1.4, color: '#b4b4bd', maxWidth: 880, display: 'flex' }}>
            La méthode d&apos;entraînement norvégienne, calibrée par votre VDOT et adaptée
            chaque jour à votre fatigue, vos contraintes de temps.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 22, color: '#888893', display: 'flex' }}>14 jours gratuits · 14,99 €/mois</div>
          <div style={{ fontSize: 22, color: '#34d399', fontWeight: 600, display: 'flex' }}>nordicrun.app</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
