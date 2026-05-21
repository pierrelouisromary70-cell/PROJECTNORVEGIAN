import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ background: '#06060a', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
        <div style={{ width: 14, height: 14, background: '#10b981', borderRadius: '50%' }} />
      </div>
    ),
    { ...size },
  );
}
