import { useState, useEffect } from 'react';

interface CreativeLoaderProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

const STAGES = [
  { icon: '⚡', text: 'Connecting to DND Cloud Server...' },
  { icon: '📊', text: 'Syncing 33 Fresh Local Leads...' },
  { icon: '📞', text: 'Calibrating Cellular Dialer & WhatsApp...' },
  { icon: '✨', text: 'Rendering Pipeline & Deal Analytics...' },
];

export default function CreativeLoader({
  title = 'DND Studio CRM',
  subtitle,
  fullScreen = false,
}: CreativeLoaderProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % STAGES.length);
    }, 1400);

    const progressTimer = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 30 : prev + Math.floor(Math.random() * 15) + 5));
    }, 400);

    return () => {
      clearInterval(stageTimer);
      clearInterval(progressTimer);
    };
  }, []);

  const currentStage = STAGES[stageIndex];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : '65vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        padding: '32px 16px',
      }}
    >
      {/* ── Background Ambient Glows ── */}
      <div
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108, 99, 255, 0.25) 0%, rgba(56, 189, 248, 0.1) 50%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'dndAura 4s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />

      {/* ── Background Ghost Skeleton UI (Adds immediate depth) ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 680,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          opacity: 0.12,
          pointerEvents: 'none',
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 180,
              borderRadius: 16,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)',
              border: '1px solid rgba(255,255,255,0.2)',
              animation: `dndShimmerCard 1.8s infinite ease-in-out ${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* ── Central High-Gloss Glassmorphic Command Card ── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 48px',
          background: 'linear-gradient(145deg, rgba(24, 28, 48, 0.88) 0%, rgba(12, 15, 29, 0.94) 100%)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRadius: 28,
          border: '1px solid rgba(139, 92, 246, 0.35)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(108, 99, 255, 0.2)',
          maxWidth: 440,
          width: '92%',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        {/* Animated Hologram Logo Centerpiece */}
        <div style={{ position: 'relative', width: 88, height: 88, marginBottom: 20 }}>
          {/* Pulsing Outer Neon Ring */}
          <div
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: '2px dashed rgba(56, 189, 248, 0.45)',
              animation: 'dndSpinReverse 6s linear infinite',
            }}
          />

          {/* High-speed gradient spinner */}
          <div
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: '50%',
              padding: 3,
              background: 'conic-gradient(from 0deg, #6c63ff, #38bdf8, #10d9a0, #f59e0b, #6c63ff)',
              animation: 'dndSpin 1s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />

          {/* Core Orb */}
          <div
            style={{
              position: 'absolute',
              inset: 4,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #312e81 0%, #0f172a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 20px rgba(108, 99, 255, 0.6), 0 0 25px rgba(56, 189, 248, 0.4)',
            }}
          >
            <span
              style={{
                fontSize: 32,
                filter: 'drop-shadow(0 0 12px #38bdf8)',
                animation: 'dndBoltPulse 1.2s ease-in-out infinite',
              }}
            >
              ⚡
            </span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.6px',
            color: '#ffffff',
            textShadow: '0 2px 10px rgba(108,99,255,0.4)',
            marginBottom: 8,
          }}
        >
          {title}
        </div>

        {/* High-Visibility Stage Chip */}
        <div
          key={stageIndex}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 20,
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.15)',
            marginBottom: 18,
            animation: 'dndFadeSlide 0.35s ease-out',
          }}
        >
          <span style={{ fontSize: 16 }}>{currentStage.icon}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#38bdf8',
              letterSpacing: '0.2px',
            }}
          >
            {subtitle || currentStage.text}
          </span>
        </div>

        {/* Progress Bar with Live % */}
        <div style={{ width: '100%', marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              System Status
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#10d9a0', fontFamily: 'var(--font-mono, monospace)' }}>
              {progress}%
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: 6,
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6c63ff 0%, #38bdf8 50%, #10d9a0 100%)',
                borderRadius: 6,
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.6)',
                transition: 'width 300ms ease-out',
              }}
            />
          </div>
        </div>

        {/* Live Active Indicators */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            marginTop: 20,
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10d9a0', boxShadow: '0 0 8px #10d9a0' }} />
            Supabase DB
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
            Render API
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6c63ff', boxShadow: '0 0 8px #6c63ff' }} />
            Vercel CDN
          </span>
        </div>
      </div>

      {/* Embedded Modern Keyframe Animations */}
      <style>{`
        @keyframes dndSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes dndSpinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes dndAura {
          0% { transform: scale(0.85); opacity: 0.4; }
          100% { transform: scale(1.25); opacity: 0.8; }
        }
        @keyframes dndBoltPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px #38bdf8); }
          50% { transform: scale(1.15); filter: drop-shadow(0 0 16px #6c63ff); }
        }
        @keyframes dndFadeSlide {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes dndShimmerCard {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.28; }
        }
      `}</style>
    </div>
  );
}
