import { useState, useEffect } from 'react';

interface CreativeLoaderProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

const CREATIVE_TIPS = [
  '⚡ Powering up DND Studio CRM Engine...',
  '🚀 Syncing 33 Fresh Local Leads & Direct Numbers...',
  '📞 Calibrating 1-Tap Cellular Dialer & Attendance Tracking...',
  '💬 Preparing WhatsApp Connect & Client Pitch Templates...',
  '✨ Loading Kanban Pipeline & Real-Time Deal Insights...',
];

export default function CreativeLoader({
  title = 'DND Studio',
  subtitle,
  fullScreen = false,
}: CreativeLoaderProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % CREATIVE_TIPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : '55vh',
        width: '100%',
        padding: '32px 16px',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* ── Central Glow Container ── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '36px 48px',
          background: 'rgba(15, 18, 30, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24,
          border: '1px solid rgba(108, 99, 255, 0.25)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(108, 99, 255, 0.15)',
          maxWidth: 420,
          width: '90%',
          textAlign: 'center',
        }}
      >
        {/* Animated Radial Pulse Rings */}
        <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 20 }}>
          {/* Outer Pulsing Aura */}
          <div
            style={{
              position: 'absolute',
              inset: -12,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(108, 99, 255, 0.4) 0%, rgba(56, 189, 248, 0) 70%)',
              animation: 'dndPulse 2s infinite ease-in-out',
            }}
          />

          {/* Rotating Gradient Spinner Ring */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              padding: 3,
              background: 'linear-gradient(135deg, #6c63ff, #38bdf8, #10d9a0, #6c63ff)',
              animation: 'dndSpin 1.2s linear infinite',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />

          {/* Inner Glowing Logo Orb */}
          <div
            style={{
              position: 'absolute',
              inset: 6,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 16px rgba(108, 99, 255, 0.4)',
            }}
          >
            <span
              style={{
                fontSize: 28,
                filter: 'drop-shadow(0 0 8px #6c63ff)',
                animation: 'dndFloat 2s ease-in-out infinite',
              }}
            >
              ⚡
            </span>
          </div>
        </div>

        {/* Brand Title */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.5px',
            background: 'linear-gradient(135deg, #ffffff 30%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 6,
          }}
        >
          {title}
        </div>

        {/* Dynamic Rotating Subtitle / Tip */}
        <div
          key={tipIndex}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            minHeight: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'dndFadeIn 0.4s ease-out',
          }}
        >
          {subtitle || CREATIVE_TIPS[tipIndex]}
        </div>

        {/* Animated Progress Bar */}
        <div
          style={{
            width: '100%',
            height: 4,
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 4,
            marginTop: 18,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '45%',
              background: 'linear-gradient(90deg, #6c63ff, #38bdf8, #10d9a0)',
              borderRadius: 4,
              animation: 'dndShimmer 1.4s infinite ease-in-out',
            }}
          />
        </div>
      </div>

      {/* Embedded Keyframes */}
      <style>{`
        @keyframes dndSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes dndPulse {
          0%, 100% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
        @keyframes dndFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes dndFadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes dndShimmer {
          0% { left: -45%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
