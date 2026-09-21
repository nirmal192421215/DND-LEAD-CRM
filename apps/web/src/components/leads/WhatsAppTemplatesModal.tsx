import { useState } from 'react';
import type { Lead } from '@bind-build/shared';
import { cleanWhatsAppPhone, format10DigitPhone } from '../../lib/utils';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface Props {
  lead: Lead;
  onClose: () => void;
  onSent: () => void;
}

interface Template {
  id: string;
  name: string;
  icon: string;
  tag: string;
  getText: (lead: Lead, userName: string) => string;
}

const TEMPLATES: Template[] = [
  {
    id: 'intro',
    name: 'New Lead Introduction',
    icon: '👋',
    tag: 'NEW / CONTACTED',
    getText: (lead, userName) =>
      `Hi ${lead.name},\n\nThis is ${userName} from DND Studio. We noticed your business in ${lead.location || 'Coimbatore'} and wanted to connect regarding custom web design, mobile apps, and business automation solutions.\n\nWould you be open for a brief 5-minute intro call today?`,
  },
  {
    id: 'callback',
    name: 'Follow-Up / Callback Check-In',
    icon: '⏰',
    tag: 'CALL BACK',
    getText: (lead, userName) =>
      `Hi ${lead.name},\n\nHope you're having a productive day! This is ${userName} following up on our earlier conversation regarding your ${lead.projectType || 'project'}.\n\nChecking in as discussed — is now a convenient time for a quick 5-minute call?`,
  },
  {
    id: 'meeting',
    name: 'Google Meet Demo Invitation',
    icon: '🎥',
    tag: 'MEETING',
    getText: (lead, userName) =>
      `Hi ${lead.name},\n\nLooking forward to presenting our live interactive demo for ${lead.name}.\n\n🎥 Google Meet Link: ${lead.meetingUrl || 'https://meet.google.com/new'}\n\nPlease let me know if this time works smoothly for you!\n\nBest regards,\n${userName} — DND Studio`,
  },
  {
    id: 'proposal',
    name: 'Proposal Review Follow-Up',
    icon: '📄',
    tag: 'PROPOSAL',
    getText: (lead, userName) =>
      `Hi ${lead.name},\n\nWe have prepared and shared the project proposal and timeline estimates for ${lead.name}.\n\nWhenever you have a moment, please review it. I am available here if you have any questions or would like to adjust the scope.\n\nWarm regards,\n${userName}`,
  },
  {
    id: 'offer',
    name: 'Special Design Sprint Offer',
    icon: '🎁',
    tag: 'SPECIAL OFFER',
    getText: (lead, userName) =>
      `Hi ${lead.name},\n\nQuick heads up — our development team has a priority sprint slot open for ${lead.location || 'local'} enterprises this month. If we kick off this week, we include a complimentary brand & SEO optimization package.\n\nLet me know if you'd like to reserve this slot!\n\n— ${userName}, DND Studio`,
  },
];

export default function WhatsAppTemplatesModal({ lead, onClose, onSent }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const senderName = user?.name ? user.name.split(' ')[0] : 'Nirmal';

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (lead.stage === 'CALL_BACK') return 'callback';
    if (lead.stage === 'MEETING') return 'meeting';
    if (lead.stage === 'PROPOSAL') return 'proposal';
    return 'intro';
  });

  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];

  const [message, setMessage] = useState<string>(() => {
    return selectedTemplate.getText(lead, senderName);
  });

  const [isLogging, setIsLogging] = useState(false);

  const handleTemplateSelect = (tmpl: Template) => {
    setSelectedTemplateId(tmpl.id);
    setMessage(tmpl.getText(lead, senderName));
  };

  const handleSendWhatsApp = async () => {
    const waPhone = cleanWhatsAppPhone(lead.phone);
    if (!waPhone) {
      toast('Lead does not have a valid phone number for WhatsApp', 'error');
      return;
    }

    setIsLogging(true);
    try {
      // 1. Log activity to backend (Phase 2.4)
      await api.post('/activities', {
        leadId: lead.id,
        type: 'WHATSAPP',
        text: `💬 Sent WhatsApp template "${selectedTemplate.name}":\n"${message.slice(0, 140)}${message.length > 140 ? '...' : ''}"`,
      });

      // 2. Open WhatsApp Web or Mobile App
      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      toast('WhatsApp opened & message logged to timeline! 💬', 'success');
      onSent();
      onClose();
    } catch {
      // Still open WhatsApp even if activity logging fails
      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      onClose();
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        style={{
          maxWidth: 680,
          width: '95%',
          background: 'rgba(17, 19, 24, 0.96)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(37, 211, 102, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(37, 211, 102, 0.12)',
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem' }}>💬</span>
            <div>
              <h2 className="modal-title" style={{ margin: 0, fontSize: '1.2rem', color: '#25D366' }}>
                WhatsApp Message Templates
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Sending to: <strong>{lead.name}</strong> ({format10DigitPhone(lead.phone)})
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Template Selector Pills */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
              Select Template:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleTemplateSelect(tmpl)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? 'rgba(37, 211, 102, 0.15)' : 'var(--bg-elevated)',
                      border: isSelected ? '1px solid #25D366' : '1px solid var(--border)',
                      color: isSelected ? '#25D366' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <span>{tmpl.icon}</span>
                    <span>{tmpl.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editable Text Area */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Message Preview (Click to edit):
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {message.length} characters
              </span>
            </div>
            <textarea
              className="form-input"
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                fontSize: '0.88rem',
                lineHeight: 1.5,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚡</span>
            <span>Automatically logs this message to the activity timeline when sent.</span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            borderTop: '1px solid var(--border)',
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLogging}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSendWhatsApp}
            disabled={isLogging || !message.trim()}
            style={{
              background: '#25D366',
              borderColor: '#25D366',
              color: '#000',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
            }}
          >
            <span>🚀</span>
            {isLogging ? 'Logging & Opening...' : 'Open in WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
