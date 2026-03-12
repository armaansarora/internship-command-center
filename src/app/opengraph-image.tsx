import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Internship Command Center';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #4f46e5 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.08,
            backgroundSize: '40px 40px',
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          }}
        />
        {/* App icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            fontSize: 32,
            fontWeight: 700,
            color: 'white',
          }}
        >
          ICC
        </div>
        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-0.02em',
            marginBottom: 16,
          }}
        >
          Internship Command Center
        </div>
        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 400,
          }}
        >
          Track applications, generate cover letters, manage follow-ups
        </div>
      </div>
    ),
    { ...size }
  );
}
