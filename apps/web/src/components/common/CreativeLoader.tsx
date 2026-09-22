import React from 'react';

interface CreativeLoaderProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

export default function CreativeLoader({
  title = 'DND STUDIO',
  subtitle = 'Loading...',
  fullScreen = false,
}: CreativeLoaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : '55vh',
        width: '100%',
        padding: '24px 16px',
        userSelect: 'none',
      }}
    >
      {/* Professional Minimal Corporate Spinner & Brand Mark */}
      <div style={{ position: 'relative', width: 48, height: 48, marginBottom: 16 }}>
        {/* Subtle background track */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid rgba(255, 255, 255, 0.08)',
          }}
        />
        {/* High-speed sleek accent spinner ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'var(--brand)',
            borderRightColor: 'rgba(108, 99, 255, 0.4)',
            animation: 'dndCorporateSpin 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        />
        {/* Center monogram / icon */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 800,
            color: 'var(--brand)',
            letterSpacing: '-0.02em',
          }}
        >
          D
        </div>
      </div>

      {/* Corporate Typography */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
          marginBottom: 4,
          fontFamily: 'var(--font-display)',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontWeight: 500,
        }}
      >
        {subtitle}
      </div>

      <style>{`
        @keyframes dndCorporateSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
