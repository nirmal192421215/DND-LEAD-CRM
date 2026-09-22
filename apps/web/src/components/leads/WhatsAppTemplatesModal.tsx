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
  category: string;
  getText: (lead: Lead, userName: string) => string;
}

const TEMPLATES: Template[] = [
  {
    id: 'arch_intro',
    name: 'Architecture & 3D Elevation Intro',
    icon: '🏛️',
    tag: 'HIGH CONVERTING',
    category: 'Introduction',
    getText: (lead, userName) =>
      `Hi *${lead.name}*,\n\nThis is *${userName}* from *DND Studio (Architecture & Interior Design)*.\n\nWe noticed your esteemed work in *${lead.location || 'Tamil Nadu'}* and wanted to connect regarding your *${lead.projectType || 'Architecture & Construction'}* requirements.\n\nWe specialize in:\n✨ High-End 3D Elevations & Photorealistic Walkthroughs\n✨ Turnkey Interior Execution & Custom Modular BOQs\n✨ Structural CAD Engineering & Local Approvals\n\nWe would love to share our latest project portfolio with you. Would you be open for a brief 5-minute introductory call today?\n\nWarm regards,\n*${userName}* | DND Studio\n📞 +91 93609 31010`,
  },
  {
    id: 'turnkey_interior',
    name: 'Turnkey Interior & BOQ Consultation',
    icon: '💎',
    tag: 'LUXURY INTERIORS',
    category: 'Interiors',
    getText: (lead, userName) =>
      `Hello *${lead.name}*,\n\nReaching out from *DND Studio*. We partner with premier builders, architects, and homeowners for bespoke Turnkey Interior Solutions — from conceptual 3D mood boards to factory-precision execution with strict timeline guarantees.\n\nFor *${lead.name}*, we are pleased to extend a *Complimentary On-Site Inspection & Preliminary BOQ Estimate*.\n\nWould you like us to schedule a site review with our senior interior architect this week?\n\nBest regards,\n*${userName}* · DND Studio`,
  },
  {
    id: 'site_visit',
    name: 'Free Site Feasibility & Inspection',
    icon: '📐',
    tag: 'SITE VISIT',
    category: 'Inspection',
    getText: (lead, userName) =>
      `Hi *${lead.name}*,\n\nOur senior architectural & site engineering team is conducting project surveys in *${lead.location || 'your area'}* this week.\n\nWe would be glad to offer a *Zero-Cost Site Feasibility & Dimension Survey* for your *${lead.projectType || 'upcoming project'}*.\n\nWhich slot suits you best?\n1️⃣ Thursday / Friday Afternoon\n2️⃣ Weekend (Saturday Morning)\n\nLooking forward to meeting you on-site!\n\nRegards,\n*${userName}*, DND Studio`,
  },
  {
    id: 'meet_demo',
    name: '3D Walkthrough / Google Meet Review',
    icon: '🎥',
    tag: 'MEETING',
    category: 'Presentation',
    getText: (lead, userName) =>
      `Hi *${lead.name}*,\n\nLooking forward to presenting our live interactive 3D spatial layout & material concept for *${lead.name}*.\n\n🎥 *Google Meet Link:* ${lead.meetingUrl || 'https://meet.google.com/new'}\n🗓️ *Agenda:* 3D Walkthrough, Material Palette & Milestone Timeline\n\nPlease let me know if this timing works seamlessly for you!\n\nBest regards,\n*${userName}* — DND Studio`,
  },
  {
    id: 'proposal_review',
    name: 'Detailed BOQ & Proposal Follow-Up',
    icon: '📑',
    tag: 'PROPOSAL',
    category: 'Quotation',
    getText: (lead, userName) =>
      `Hi *${lead.name}*,\n\nWe have finalized the comprehensive Project Proposal, Material Specifications, and Milestone Schedule for *${lead.name}*.\n\n📋 *Highlights:*\n• Certified grade materials & hardware warranty\n• Milestone-linked transparent stage payments\n• Dedicated project engineer & live site updates\n\nPlease review when convenient. I am available right here if you'd like to adjust any specific scope or budget parameters.\n\nWarm regards,\n*${userName}*`,
  },
  {
    id: 'priority_offer',
    name: 'Priority Slot & Complimentary Package',
    icon: '🎁',
    tag: 'SPECIAL OFFER',
    category: 'Promotion',
    getText: (lead, userName) =>
      `Hi *${lead.name}*,\n\nQuick update from DND Studio — we are confirming project execution slots for the upcoming month in *${lead.location || 'Tamil Nadu'}*.\n\nClients confirming their *${lead.projectType || 'Turnkey Project'}* this week receive:\n✅ *Complimentary 3D VR Walkthrough Animation*\n✅ *Free Structural Electrical & Ceiling Lighting Layout*\n\nWould you like us to hold a priority slot for *${lead.name}*?\n\n— *${userName}*, DND Studio`,
  },
];

export default function WhatsAppTemplatesModal({ lead, onClose, onSent }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const senderName = user?.name ? user.name.split(' ')[0] : 'Nirmal';

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (lead.stage === 'SITE_VISIT' || lead.stage === 'CONTACTED') return 'site_visit';
    if (lead.stage === 'MEETING') return 'meet_demo';
    if (lead.stage === 'PROPOSAL') return 'proposal_review';
    if (lead.projectType?.toLowerCase().includes('interior')) return 'turnkey_interior';
    return 'arch_intro';
  });

  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];

  const [message, setMessage] = useState<string>(() => {
    return selectedTemplate.getText(lead, senderName);
  });

  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const handleTemplateSelect = (tmpl: Template) => {
    setSelectedTemplateId(tmpl.id);
    setMessage(tmpl.getText(lead, senderName));
  };

  const handleInsertVariable = (tag: string) => {
    setMessage((prev) => `${prev} ${tag}`);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast('Message copied to clipboard! 📋', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy to clipboard', 'error');
    }
  };

  const handleSendWhatsApp = async () => {
    const waPhone = cleanWhatsAppPhone(lead.phone);
    if (!waPhone) {
      toast('Lead does not have a valid 10-digit phone number for WhatsApp', 'error');
      return;
    }

    setIsSending(true);
    try {
      // 1. Copy message to clipboard automatically as convenience
      try {
        await navigator.clipboard.writeText(message);
      } catch {
        // ignore clipboard error if browser blocks it
      }

      // 2. Log activity to backend CRM timeline
      await api.post('/activities', {
        leadId: lead.id,
        type: 'WHATSAPP',
        text: `💬 Sent WhatsApp [${selectedTemplate.name}]:\n"${message.slice(0, 160)}${message.length > 160 ? '...' : ''}"`,
      });

      // 3. Launch WhatsApp directly with prefilled message
      // Using https://api.whatsapp.com/send directly opens WhatsApp app on mobile/macOS or WhatsApp Web
      const waUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(message)}`;
      
      const openedWindow = window.open(waUrl, '_blank');
      if (!openedWindow) {
        // If popup was blocked, fallback to direct location
        window.location.href = waUrl;
      }

      toast('✓ WhatsApp launched & message logged to timeline!', 'success');
      onSent();
      onClose();
    } catch (err) {
      console.warn('Activity logging fallback:', err);
      // Still open WhatsApp even if API logging encountered an issue
      const waUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      toast('WhatsApp opened! 💬', 'success');
      onSent();
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  // Format preview for WhatsApp bubble (convert *text* to <strong>)
  const renderFormattedPreview = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      // replace *word* with bold
      const parts = line.split(/(\*[^*]+\*)/g);
      return (
        <div key={idx} style={{ minHeight: line ? 'auto' : '0.8em', marginBottom: 2 }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('*') && part.endsWith('*')) {
              return <strong key={pIdx} style={{ color: '#fff', fontWeight: 600 }}>{part.slice(1, -1)}</strong>;
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        style={{
          maxWidth: 760,
          width: '96%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #12161f 0%, #0d1017 100%)',
          borderRadius: 16,
          border: '1px solid rgba(37, 211, 102, 0.25)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(37, 211, 102, 0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 20px',
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.073-1.927-.437-1.425-.589-2.357-2.029-2.428-2.124-.07-.095-.576-.767-.576-1.464 0-.697.362-1.039.49-1.182.129-.144.281-.18.376-.18.094 0 .188.001.271.006.088.004.205-.033.321.246.12.289.412 1.006.448 1.079.036.073.06.159.012.256-.048.096-.072.156-.144.24-.072.084-.153.188-.218.252-.072.072-.148.151-.064.295.084.144.373.615.8 1 .551.496 1.015.65 1.159.722.144.072.228.06.312-.036.085-.096.362-.42.458-.564.096-.144.192-.12.324-.072.133.048.843.397.988.469.144.072.24.108.277.169.036.06.036.35-.108.755z" />
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.661 1.435 5.176L2 22l4.981-1.399C8.423 21.493 10.151 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25c-1.637 0-3.155-.47-4.437-1.284l-.318-.198-2.966.833.842-2.888-.218-.328C4.013 15.12 3.5 13.607 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>WhatsApp Outreach Hub</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: 'rgba(37, 211, 102, 0.15)',
                    color: '#25D366',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Direct Send
                </span>
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Target Client: <strong style={{ color: '#fff' }}>{lead.name}</strong> •{' '}
                <span style={{ color: '#25D366', fontWeight: 600 }}>+91 {format10DigitPhone(lead.phone)}</span>
              </p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            style={{ borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
          }}
        >
          {/* Template Selection Cards */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Select High-Converting Architectural Pitch:
              </span>
              <span style={{ fontSize: '0.72rem', color: '#25D366' }}>
                ✓ Tailored for Architecture & Interiors
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 8,
              }}
            >
              {TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleTemplateSelect(tmpl)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(37, 211, 102, 0.16) 0%, rgba(18, 140, 126, 0.1) 100%)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1.5px solid #25D366' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 150ms ease',
                      position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{tmpl.icon}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 700 : 600,
                          color: isSelected ? '#25D366' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {tmpl.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-muted)',
                          marginTop: 2,
                        }}
                      >
                        {tmpl.tag}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ color: '#25D366', fontSize: '0.9rem', fontWeight: 700 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Insert Variables & View Switcher */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              padding: '6px 12px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Insert Variable:
              </span>
              {[
                { label: '+ Client Name', val: `*${lead.name}*` },
                { label: '+ Project Type', val: `*${lead.projectType || 'Architecture & Interior'}*` },
                { label: '+ Location', val: `*${lead.location || 'Tamil Nadu'}*` },
                { label: '+ Meet Link', val: lead.meetingUrl || 'https://meet.google.com/new' },
                { label: '+ Contact Phone', val: '+91 93609 31010' },
              ].map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsertVariable(pill.val)}
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 120ms',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#25D366')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: activeTab === 'editor' ? 700 : 500,
                  borderRadius: 6,
                  background: activeTab === 'editor' ? 'rgba(37, 211, 102, 0.15)' : 'transparent',
                  border: activeTab === 'editor' ? '1px solid #25D366' : '1px solid transparent',
                  color: activeTab === 'editor' ? '#25D366' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                ✏️ Edit Text
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: activeTab === 'preview' ? 700 : 500,
                  borderRadius: 6,
                  background: activeTab === 'preview' ? 'rgba(37, 211, 102, 0.15)' : 'transparent',
                  border: activeTab === 'preview' ? '1px solid #25D366' : '1px solid transparent',
                  color: activeTab === 'preview' ? '#25D366' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                💬 WhatsApp Preview
              </button>
            </div>
          </div>

          {/* Main Content Area: Editor vs WhatsApp Chat Bubble Mockup */}
          {activeTab === 'editor' ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Message Content (Personalize before sending):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copied ? '#25D366' : 'var(--text-muted)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{copied ? '✓ Copied' : '📋 Copy Text'}</span>
                  </button>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {message.length} chars
                  </span>
                </div>
              </div>
              <textarea
                className="form-input"
                rows={9}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0a0d13',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.5)',
                }}
              />
            </div>
          ) : (
            /* Real WhatsApp Chat Preview Bubble */
            <div
              style={{
                background: '#0b141a',
                backgroundImage:
                  'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                borderRadius: 12,
                padding: '20px 16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  background: '#005c4b',
                  color: '#e9edef',
                  borderRadius: '12px 0px 12px 12px',
                  padding: '12px 16px 8px 16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                  fontSize: '0.88rem',
                  lineHeight: 1.55,
                  position: 'relative',
                }}
              >
                {renderFormattedPreview(message)}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 4,
                    marginTop: 6,
                    fontSize: '0.68rem',
                    color: 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ color: '#53bdeb', fontSize: '0.85rem', fontWeight: 700 }}>✓✓</span>
                </div>
              </div>
            </div>
          )}

          {/* Activity Timeline Status Note */}
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(37, 211, 102, 0.05)',
              border: '1px dashed rgba(37, 211, 102, 0.2)',
            }}
          >
            <span style={{ color: '#25D366' }}>⚡</span>
            <span>
              Clicking <strong>Send via WhatsApp</strong> will launch WhatsApp with this message prefilled and log this touchpoint to the CRM timeline automatically.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '14px 20px',
            background: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSending}
            style={{
              padding: '10px 18px',
              fontSize: '0.86rem',
              borderRadius: 8,
            }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleCopyMessage}
              style={{
                padding: '10px 16px',
                fontSize: '0.86rem',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy Text'}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isSending || !message.trim()}
              style={{
                padding: '10px 22px',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #25D366 0%, #1da851 100%)',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 18px rgba(37, 211, 102, 0.4)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.073-1.927-.437-1.425-.589-2.357-2.029-2.428-2.124-.07-.095-.576-.767-.576-1.464 0-.697.362-1.039.49-1.182.129-.144.281-.18.376-.18.094 0 .188.001.271.006.088.004.205-.033.321.246.12.289.412 1.006.448 1.079.036.073.06.159.012.256-.048.096-.072.156-.144.24-.072.084-.153.188-.218.252-.072.072-.148.151-.064.295.084.144.373.615.8 1 .551.496 1.015.65 1.159.722.144.072.228.06.312-.036.085-.096.362-.42.458-.564.096-.144.192-.12.324-.072.133.048.843.397.988.469.144.072.24.108.277.169.036.06.036.35-.108.755z" />
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.661 1.435 5.176L2 22l4.981-1.399C8.423 21.493 10.151 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25c-1.637 0-3.155-.47-4.437-1.284l-.318-.198-2.966.833.842-2.888-.218-.328C4.013 15.12 3.5 13.607 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z" />
              </svg>
              <span>{isSending ? 'Sending...' : 'Send via WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

