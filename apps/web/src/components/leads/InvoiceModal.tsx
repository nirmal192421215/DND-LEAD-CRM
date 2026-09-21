import React, { useState } from 'react';
import { cleanPhone } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    serialNo?: number;
    name: string;
    phone?: string;
    location: string;
    projectType?: string;
    budgetLakhs: number;
  };
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, lead }) => {
  const { toast } = useToast();
  const [advancePercent, setAdvancePercent] = useState(50);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PARTIAL' | 'PAID'>('PENDING');

  if (!isOpen) return null;

  const totalAmountRupees = Math.round(lead.budgetLakhs * 100000);
  const advanceAmount = Math.round((totalAmountRupees * advancePercent) / 100);
  const balanceAmount = totalAmountRupees - advanceAmount;
  const invoiceNo = `INV-DND-${String(lead.serialNo || 1).padStart(3, '0')}`;
  const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleSendWhatsAppInvoice = () => {
    if (!lead.phone) {
      toast('No phone number available to send invoice', 'warning');
      return;
    }
    const cleanNum = cleanPhone(lead.phone);
    const message =
      `*DND Studio — Commercial Tax Invoice 📄*\n\n` +
      `Hi *${lead.name}* team,\n\n` +
      `Please find your project invoice details below:\n\n` +
      `📌 *Invoice No:* ${invoiceNo}\n` +
      `💼 *Project:* ${lead.projectType || 'Custom Web Application'}\n` +
      `💰 *Total Investment:* ₹${(lead.budgetLakhs).toFixed(2)} Lakhs (₹${totalAmountRupees.toLocaleString('en-IN')})\n` +
      `💳 *Milestone 1 (${advancePercent}% Advance):* ₹${advanceAmount.toLocaleString('en-IN')}\n` +
      `⏳ *Milestone 2 (On Live Launch):* ₹${balanceAmount.toLocaleString('en-IN')}\n\n` +
      `🏦 *Payment Options:*\n` +
      `• UPI / GPay / PhonePe: *9342626096@okaxis*\n` +
      `• Bank Transfer: DND Studio · Current A/c\n\n` +
      `Kindly share the transaction screenshot once completed to initiate Sprint 1.\n\n` +
      `— Nirmal kumar, DND Studio\n` +
      `📞 +91 9342626096`;

    window.open(`https://wa.me/91${cleanNum}?text=${encodeURIComponent(message)}`, '_blank');
    toast('Invoice shared via WhatsApp! 📱', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: '#090d16',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          padding: 30,
          borderRadius: 16,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls Bar (hidden during print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status:</span>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as any)}
              className="form-input"
              style={{ padding: '4px 8px', fontSize: 11, width: 'auto' }}
            >
              <option value="PENDING">⏳ Payment Pending</option>
              <option value="PARTIAL">🟡 Advance Received</option>
              <option value="PAID">✅ Paid in Full</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              style={{ fontSize: 11, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              🖨️ Print / PDF
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSendWhatsAppInvoice}
              style={{
                fontSize: 11,
                padding: '5px 12px',
                background: '#25D366',
                borderColor: '#25D366',
                color: '#000',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              💬 WhatsApp Invoice
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 18,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div id="printable-invoice">
          {/* Brand Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--brand)', letterSpacing: '0.04em' }}>
                  DND STUDIO
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(108, 99, 255, 0.2)',
                    color: '#a78bfa',
                  }}
                >
                  DIGITAL LABS
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Web & Mobile App Development
                <br />
                Chennai, Tamil Nadu · +91 9342626096
                <br />
                dndstudio.in · nirmalkumar00727@gmail.com
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                COMMERCIAL INVOICE
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)', marginTop: 2 }}>
                {invoiceNo}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Date: {currentDate}
              </div>
            </div>
          </div>

          {/* Client & Billing Details Box */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              padding: '14px 16px',
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 24,
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Billed To:
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{lead.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                📍 {lead.location}
              </div>
              {lead.phone && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  📞 +91 {cleanPhone(lead.phone)}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Payment Terms:
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                50% Kickoff Advance · 50% on Deployment
              </div>
              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginTop: 4 }}>
                Status: {paymentStatus}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Item / Deliverable</th>
                <th style={{ padding: '10px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Milestone</th>
                <th style={{ padding: '10px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>
                    {lead.projectType || 'Custom Web Application & Mobile Experience'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Sprint 1: UI/UX Architecture, Frontend Engineering & WhatsApp Integration
                  </div>
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                  Milestone 1 ({advancePercent}%)
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>
                  ₹{advanceAmount.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>
                    Production Launch, SSL & 90 Days Maintenance
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Sprint 2: Live Cloud Deployment, Domain Setup & Post-Launch Warranty
                  </div>
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                  Milestone 2 ({100 - advancePercent}%)
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>
                  ₹{balanceAmount.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals Breakdown */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <div style={{ width: 240 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>Subtotal:</span>
                <span>₹{totalAmountRupees.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                <span>Taxes:</span>
                <span style={{ color: '#10b981' }}>Included (0%)</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#f8fafc',
                }}
              >
                <span>Total Due:</span>
                <span style={{ color: 'var(--brand)' }}>₹{totalAmountRupees.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods & Bank Info */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              fontSize: 11,
              color: '#cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <strong style={{ color: '#a78bfa' }}>Payment Details:</strong>
              <div style={{ marginTop: 2 }}>
                UPI ID: <strong>9342626096@okaxis</strong> (GPay / PhonePe / Paytm)
              </div>
              <div>Account Name: <strong>Nirmal kumar N</strong></div>
            </div>
            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
              Authorized Signatory
              <div style={{ fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>DND STUDIO CHENNAI</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default InvoiceModal;
