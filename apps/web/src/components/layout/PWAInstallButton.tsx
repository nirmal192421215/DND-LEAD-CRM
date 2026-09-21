import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';

export const PWAInstallButton: React.FC = () => {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already installed in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast('DND CRM installed to your home screen! 📱✨', 'success');
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show iOS / general instruction
      setShowIosGuide(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="btn btn-secondary btn-sm"
        style={{
          fontSize: 11,
          padding: '4px 10px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
          borderColor: 'rgba(139, 92, 246, 0.35)',
          color: '#c4b5fd',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
        title="Install DND CRM to your phone or desktop home screen"
      >
        <span>📲</span>
        <span>Install App</span>
      </button>

      {showIosGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 380,
              padding: 24,
              backgroundColor: '#0f172a',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: 16,
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📲</div>
            <div className="font-display font-bold text-lg mb-8" style={{ color: '#f8fafc' }}>
              Install DND CRM
            </div>
            <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 16 }}>
              To install DND CRM on your phone:
              <br />
              <strong>1.</strong> Tap the <strong>Share</strong> button (⎋) in Safari/Chrome.
              <br />
              <strong>2.</strong> Scroll down and select <strong>"Add to Home Screen"</strong> (⊞).
              <br />
              <strong>3.</strong> Launch DND CRM directly from your phone like a native app!
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowIosGuide(false)}
              style={{ width: '100%', padding: '8px 16px' }}
            >
              Got it! 👍
            </button>
          </div>
        </div>
      )}
    </>
  );
};
export default PWAInstallButton;
