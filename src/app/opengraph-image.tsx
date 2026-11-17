import { ImageResponse } from 'next/og';

export const alt = ' — Connect, Collaborate, Grow';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: '#104832',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#c5e87a', fontSize: 28, fontWeight: 700 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: '#c5e87a' }} />
          
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Where Rwanda&apos;s Music Industry Connects.
          </div>
          <div style={{ color: '#d8e6dc', fontSize: 30 }}>Connect · Collaborate · Grow</div>
        </div>
        <div style={{ color: '#c5e87a', fontSize: 20, fontWeight: 700 }}>Powered by DCINTELIX</div>
      </div>
    ),
    size,
  );
}
