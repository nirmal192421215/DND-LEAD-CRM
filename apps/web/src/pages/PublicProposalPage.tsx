import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import CreativeLoader from '../components/common/CreativeLoader';

interface ProposalData {
  id: string;
  amountLakhs: number;
  version: number;
  sentAt: string;
  status: 'Sent' | 'Viewed' | 'Accepted' | 'Rejected';
  viewCount: number;
  lead: {
    id: string;
    name: string;
    projectType: string;
    budgetLakhs: number;
    location: string;
    phone?: string;
    email?: string;
  };
  createdBy: {
    name: string;
    initials: string;
    email: string;
  };
}

export default function PublicProposalPage() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    if (!id) return;
    axios
      .get(`${apiBase}/proposals/public/${id}`)
      .then((res) => {
        setProposal(res.data.data);
        if (res.data.data.status === 'Accepted') setAccepted(true);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Proposal not found or link expired.');
      })
      .finally(() => setLoading(false));
  }, [id, apiBase]);

  const handleAccept = async () => {
    if (!id) return;
    setAccepting(true);
    try {
      await axios.post(`${apiBase}/proposals/public/${id}/accept`);
      setAccepted(true);
    } catch {
      alert('Failed to accept proposal. Please reach out via WhatsApp.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <CreativeLoader title="DND STUDIO" subtitle="Loading Client Proposal..." />;

  if (error || !proposal) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0b0f',
        color: '#f0f2f8',
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Proposal Not Found</h2>
          <p style={{ color: '#8b92a8', fontSize: '0.9rem', marginBottom: 20 }}>
            {error || 'This proposal link may have been updated or moved.'}
          </p>
          <a
            href="https://wa.me/919360931010"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#25D366',
              color: '#000',
              padding: '10px 20px',
              borderRadius: 20,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            💬 Contact DND Studio on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(108, 99, 255, 0.15), #0a0b0f 70%)',
      color: '#f0f2f8',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Container */}
      <div style={{ maxWidth: 740, width: '100%' }}>
        {/* Top Branding Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6c63ff, #10d9a0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 18,
              color: '#fff',
              boxShadow: '0 4px 20px rgba(108, 99, 255, 0.4)',
            }}>
              DND
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.3px' }}>
                DND Studio
              </div>
              <div style={{ fontSize: '0.78rem', color: '#8b92a8' }}>
                Engineering Modern Web & Mobile Systems
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 12,
              background: accepted ? 'rgba(16, 217, 160, 0.15)' : 'rgba(108, 99, 255, 0.15)',
              color: accepted ? '#10d9a0' : '#a78bfa',
              border: `1px solid ${accepted ? '#10d9a0' : 'rgba(108, 99, 255, 0.3)'}`,
            }}>
              {accepted ? '✅ ACCEPTED' : `VERSION ${proposal.version}`}
            </span>
          </div>
        </div>

        {/* Main Proposal Card */}
        <div style={{
          background: 'rgba(17, 19, 24, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(108, 99, 255, 0.1)',
          overflow: 'hidden',
        }}>
          {/* Hero Banner */}
          <div style={{
            padding: '32px 32px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'linear-gradient(180deg, rgba(108, 99, 255, 0.08) 0%, transparent 100%)',
          }}>
            <div style={{ fontSize: '0.8rem', color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 6 }}>
              Project Quotation & Scope
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
              {proposal.lead.name}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: '0.85rem', color: '#8b92a8' }}>
              <span>💼 {proposal.lead.projectType}</span>
              <span>📍 {proposal.lead.location}</span>
              <span>📅 {new Date(proposal.sentAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Scope & Deliverables */}
          <div style={{ padding: 32 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px 0', color: '#f0f2f8' }}>
              Included Deliverables & Scope
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 28 }}>
              {[
                { title: 'Custom UI/UX Design System', desc: 'Modern responsive interface tailored to brand identity with mobile optimization.' },
                { title: 'High-Performance Web & Mobile App', desc: 'Engineered with React / Next.js with lightning fast sub-second load times.' },
                { title: 'Robust Backend APIs & Database', desc: 'Secure cloud database persistence, automated authentication, and scalable endpoints.' },
                { title: 'Local SEO & Google Maps Optimization', desc: 'Structured schema metadata, fast indexing, and social share previews.' },
                { title: 'Deployment, Hosting & 30-Day SLA', desc: 'Production deployment to verified cloud domains with dedicated 30-day technical support.' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span style={{ fontSize: '1.1rem', color: '#10d9a0' }}>✓</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#f0f2f8', marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: '0.82rem', color: '#8b92a8', lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Box */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.12), rgba(16, 217, 160, 0.08))',
              border: '1px solid rgba(108, 99, 255, 0.3)',
              borderRadius: 16,
              padding: '24px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 32,
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Project Investment
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#f0f2f8', lineHeight: 1.1, marginTop: 4 }}>
                  ₹{proposal.amountLakhs} <span style={{ fontSize: '1.2rem', color: '#a78bfa' }}>Lakhs</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#8b92a8', marginTop: 4 }}>
                  All-inclusive engineering & deployment
                </div>
              </div>

              {/* Status / Call to action */}
              <div>
                {accepted ? (
                  <div style={{
                    padding: '12px 20px',
                    borderRadius: 12,
                    background: 'rgba(16, 217, 160, 0.15)',
                    border: '1px solid #10d9a0',
                    color: '#10d9a0',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span>🎉</span>
                    <span>Proposal Accepted!</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={accepting}
                    onClick={handleAccept}
                    style={{
                      background: 'linear-gradient(135deg, #10d9a0, #059669)',
                      color: '#000',
                      border: 'none',
                      borderRadius: 12,
                      padding: '14px 28px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(16, 217, 160, 0.4)',
                      transition: 'all 150ms',
                    }}
                  >
                    {accepting ? 'Confirming...' : '✅ Accept & Confirm Project'}
                  </button>
                )}
              </div>
            </div>

            {/* Questions / WhatsApp section */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              paddingTop: 20,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              <div style={{ fontSize: '0.85rem', color: '#8b92a8' }}>
                Prepared by <strong style={{ color: '#f0f2f8' }}>{proposal.createdBy.name}</strong> · DND Studio
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f0f2f8',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  🖨️ Print / Save PDF
                </button>
                <a
                  href={`https://wa.me/919360931010?text=${encodeURIComponent(`Hi Nirmal, reviewing the proposal for ${proposal.lead.name} (v${proposal.version}). I have a quick question.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid #25D366',
                    color: '#25D366',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  💬 Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
