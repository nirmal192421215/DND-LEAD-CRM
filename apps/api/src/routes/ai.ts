import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const aiRouter = Router();
aiRouter.use(authenticate);

const PitchRequestSchema = z.object({
  leadId: z.string(),
  stage: z.enum(['NEW', 'CONTACTED', 'CALL_BACK', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  language: z.enum(['tanglish', 'english']).default('tanglish'),
  customNote: z.string().optional(),
});

interface PitchResponse {
  stage: string;
  language: 'tanglish' | 'english';
  headline: string;
  hook: string;
  valueProposition: string;
  stageAsk: string;
  fullCallScript: string;
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
  objections: Array<{ objection: string; rebuttal: string }>;
  keyBenefits: string[];
}

aiRouter.post('/pitch', async (req: AuthRequest, res: Response) => {
  const { leadId, stage: requestedStage, language, customNote } = PitchRequestSchema.parse(req.body);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      owner: { select: { name: true, email: true } },
      activities: { take: 5, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const activeStage = requestedStage || (lead.stage as any) || 'NEW';
  const ownerName = lead.owner?.name ?? 'Nirmal kumar';
  const clientName = lead.name;
  const location = lead.location.replace(/, Tamil Nadu/i, '').trim();
  const projectScope = lead.projectType || 'Custom Website & Mobile App';

  // Determine business niche
  const isRestaurant = /restaurant|cafe|bistro|dining|biryani|kitchen|food|seafood/i.test(lead.name + ' ' + (lead.projectType || ''));
  const isConstruction = /construction|builder|infra|renovation|homes|developer/i.test(lead.name + ' ' + (lead.projectType || ''));

  // Generate Stage-Aware Pitch Content
  const pitch = generateStageAwarePitch({
    leadId,
    clientName,
    ownerName,
    location,
    projectScope,
    budgetLakhs: lead.budgetLakhs,
    stage: activeStage,
    language,
    isRestaurant,
    isConstruction,
    customNote,
  });

  res.json({
    success: true,
    data: pitch,
  });
});

function generateStageAwarePitch({
  leadId,
  clientName,
  ownerName,
  location,
  projectScope,
  budgetLakhs,
  stage,
  language,
  isRestaurant,
  isConstruction,
}: {
  leadId: string;
  clientName: string;
  ownerName: string;
  location: string;
  projectScope: string;
  budgetLakhs: number;
  stage: string;
  language: 'tanglish' | 'english';
  isRestaurant: boolean;
  isConstruction: boolean;
  customNote?: string;
}): PitchResponse {
  const isTanglish = language === 'tanglish';

  if (isTanglish) {
    // ────────────── TANGLISH (TAMIL + ENGLISH) ──────────────
    if (stage === 'NEW') {
      return {
        stage: 'NEW',
        language: 'tanglish',
        headline: `Cold Discovery Hook for ${clientName} (${location})`,
        hook: `Vanakkam sir! Nirmal here from DND Studio Chennai. We noticed ${clientName} has great popularity in ${location}. Just 2 minutes pesalama sir?`,
        valueProposition: isRestaurant
          ? `Right now Swiggy/Zomato la 25% to 30% commission pogudhu sir. Nanga custom Direct Food Ordering Web App & WhatsApp QR Menu panrom — 100% profit direct-ah unga account ku varum, zero commission!`
          : isConstruction
          ? `Local-ah neraiya builders simple brochure vechirukanga sir. Nanga interactive 3D Project Showcase Website & WhatsApp Lead Capture System panrom — direct high-budget clients ungala reach pannuvanga.`
          : `Unga business ku high-converting modern Website & Mobile App build panrom sir — direct inquiries & sales automate panna mudiyum.`,
        stageAsk: `Unga business kaana live prototype ready-ah iruku sir. WhatsApp la oru 1-minute preview video anupalama, illana nalaiku 10 minutes Google Meet la paaklama?`,
        fullCallScript: `1. GREETING: "Vanakkam sir! Nirmal here from DND Studio Chennai. Epdi irukinga?"\n` +
          `2. HOOK: "Sir, ${location} la ${clientName} pathi paathom, romba nalla reviews iruku. Unga digital presence upgrade panna oru quick idea vechirukom."\n` +
          `3. VALUE: "${isRestaurant ? 'Swiggy/Zomato commission illama direct customer orders eduka custom web app panrom sir.' : 'Direct premium clients attract panna modern web & app solution panrom sir.'}"\n` +
          `4. THE ASK: "Sir, oru 2 minutes demo video unga WhatsApp ku anupuren, free time la paathu sollunga sir. Sent pannalama?"\n` +
          `5. CLOSING: "Nandri sir! Just now WhatsApp la preview link anupiten."`,
        whatsappMessage: `*Vanakkam from DND Studio! 🚀*\n\n` +
          `Hi *${clientName}* team,\n\n` +
          `We noticed your strong presence in *${location}*! We specialize in high-converting *${projectScope}* for growing businesses.\n\n` +
          `🔥 *What we deliver:*\n` +
          `• ⚡ Lightning fast modern website & mobile app\n` +
          `• 📱 Direct WhatsApp customer ordering & enquiry system\n` +
          `• 💰 0% commission on direct client orders\n` +
          `• 🚀 Ready & live in just 2 weeks\n\n` +
          `Can we share our 2-minute live demo link here on WhatsApp?\n\n` +
          `— *${ownerName}*, Founder @ DND Studio\n` +
          `📞 +91 9342626096 | 🌐 dndstudio.in`,
        emailSubject: `Modern Web & Mobile App Solution for ${clientName}`,
        emailBody: `Hi ${clientName} Team,\n\nI hope you are doing well.\n\nI am Nirmal from DND Studio, a Chennai-based web & app design studio. We recently analyzed your digital presence in ${location} and developed a tailored concept for ${projectScope}.\n\nWith our platform, businesses typically see a 35% increase in direct inquiries while saving on third-party aggregator costs.\n\nWould you be open to a quick 10-minute Google Meet demo this week?\n\nBest regards,\n${ownerName}\nDND Studio | +91 9342626096`,
        objections: [
          {
            objection: 'Already have Instagram / Facebook page',
            rebuttal: 'Super sir! But Instagram la direct payments, automated menu receipts, and SEO Google search rankings kedaikaadhu. Website irundha credibility 5x athigamaagum sir.',
          },
          {
            objection: 'Too expensive / Budget issue',
            rebuttal: 'Kavalapada vendam sir. Nanga flexible 50-50 milestone payments tharom. Orey maasathula direct orders மூலமா idhoda investment return aagidum.',
          },
          {
            objection: 'Now busy, call later',
            rebuttal: 'Kandippa sir, puriyudhu. Just 10 seconds la WhatsApp la oru demo link anupuren. Neenga free-ah irukum bothu paarunga sir. Eppo call back pannalam?',
          },
        ],
        keyBenefits: [
          'Zero platform commissions on direct orders',
          'Fast 2-week turnkey delivery',
          'Automated WhatsApp notifications for every enquiry',
          'Custom brand design tailored for Chennai market',
        ],
      };
    }

    if (stage === 'CONTACTED' || stage === 'CALL_BACK') {
      return {
        stage,
        language: 'tanglish',
        headline: `Demo Booking Script for ${clientName} (${stage === 'CALL_BACK' ? 'Re-Engagement' : 'Follow-Up'})`,
        hook: stage === 'CALL_BACK'
          ? `Vanakkam sir, Nirmal here from DND Studio. Munnaadi pesinapothu busy-ah irundhinga, so promised time ku call back panren sir.`
          : `Vanakkam sir, Nirmal from DND Studio. Sent details about ${projectScope} yesterday on WhatsApp. Paathingala sir?`,
        valueProposition: `Nanga ready panna template la live order flow and interactive mobile experience showcase panna oru quick 15-min Google Meet set pannalam sir. Screen share panni live-ah kaatren.`,
        stageAsk: `Inaiku evening 4 PM or nalaiku 11:30 AM Google Meet la 15 minutes screen share panni live demo paaklama sir? Etha time ungaluku convenient?`,
        fullCallScript: `1. RE-CONNECT: "Vanakkam sir, Nirmal from DND Studio. ${stage === 'CALL_BACK' ? 'Neenga keta time ku call back panren sir.' : 'WhatsApp la demo link share pannirunthen.'}"\n` +
          `2. BRIDGE: "Unga ${clientName} ku custom ${projectScope} epdi work aagum nu live prototype ready panni vechirukom."\n` +
          `3. VALUE DEMO: "Screen share la just 10 mins la live-ah unga mobile screen laye paathudalam sir."\n` +
          `4. THE ASK: "Inaiku evening 5 PM or nalaiku 11 AM Google Meet link anupalama sir? Just laptop illana phone laye open pannikalam."\n` +
          `5. CONFIRM: "Super sir, WhatsApp la Google Meet link ipove drop panren. Looking forward to talking!"`,
        whatsappMessage: `*Google Meet Demo for ${clientName} 🎥*\n\n` +
          `Hi *${clientName}* team,\n\n` +
          `Following our discussion, we have configured a customized live demo for *${projectScope}*.\n\n` +
          `In this 15-minute quick walkthrough, we will show you:\n` +
          `✅ Live interactive demo customized with your branding\n` +
          `✅ Direct mobile ordering / enquiry capture flow\n` +
          `✅ Complete timeline & launch plan\n\n` +
          `Would *Today 4:00 PM* or *Tomorrow 11:00 AM* work better for you?\n\n` +
          `— *${ownerName}*, DND Studio`,
        emailSubject: `Demo Invitation: Custom ${projectScope} for ${clientName}`,
        emailBody: `Hi ${clientName} Team,\n\nThank you for taking the time to speak earlier.\n\nWe have set up a working walkthrough for ${projectScope} to demonstrate how your business can generate direct online inquiries.\n\nPlease pick a convenient 15-minute slot for our Google Meet:\n- Option 1: Today at 4:30 PM\n- Option 2: Tomorrow at 11:00 AM\n\nLooking forward to meeting with you.\n\nBest regards,\n${ownerName}\nDND Studio`,
        objections: [
          {
            objection: 'Why Google Meet? Just send details on WhatsApp',
            rebuttal: 'WhatsApp la details text-ah irukum sir. Google Meet la 10 mins screen share panni live app-ah click panni unga kannu munnadi kaatren, appo ungaluku clarity kedaikum.',
          },
          {
            objection: 'No time for meetings this week',
            rebuttal: 'Puriyudhu sir, 10 minutes matum pothum. Neenga traveling la irundha kooda phone laye Meet link click pannalam sir.',
          },
        ],
        keyBenefits: [
          'Live interactive screen-share demo',
          'See your exact brand design before paying anything',
          'Clarify technical and delivery questions directly',
        ],
      };
    }

    if (stage === 'MEETING' || stage === 'PROPOSAL' || stage === 'NEGOTIATION') {
      return {
        stage,
        language: 'tanglish',
        headline: `Commercial Deal Closing Pitch for ${clientName} (${stage})`,
        hook: `Vanakkam sir! Demo meeting la project scope confirm pannom. Ungalukana commercial proposal & timeline draft finalize pannitom.`,
        valueProposition: `Unga ${projectScope} ku complete turnkey execution tharom — UI/UX Design, Development, Hosting Setup, WhatsApp API integration, and 3 months free technical support. All included in single package.`,
        stageAsk: `Advance payment 50% confirm panniteenga na, inaiku evening kulla design phase start panniduvom sir. Exactly 14 days la launch pannidalam. Approval tharalama sir?`,
        fullCallScript: `1. RECAP VALUE: "Sir, demo la paatha features ellam proposal la attach pannirukom."\n` +
          `2. PRICE JUSTIFICATION: "Total investment ₹${(leadId ? '1.5L - 2.5L' : '')}. Idhula design, development, live hosting and 3 months dedicated support cover aagudhu."\n` +
          `3. TIMELINE URGENCY: "Inaiku token advance confirm pannom na, current sprint la add panni exactly 2 weeks la deploy pannidalam sir."\n` +
          `4. OVERCOME HESITATION: "Price la ungaluku doubt irundha, milestone based-ah 50% now and 50% on live testing tharalam sir."\n` +
          `5. CLOSE: "Bank details / UPI QR WhatsApp la anupalama sir? Let's kick off this week!"`,
        whatsappMessage: `*DND Studio Proposal & Deliverables for ${clientName} 📄*\n\n` +
          `Hi *${clientName}* team,\n\n` +
          `Here is our finalized scope & quotation for *${projectScope}*:\n\n` +
          `📌 *Key Deliverables:*\n` +
          `1. Custom High-Performance Website & Web App\n` +
          `2. Direct WhatsApp Lead & Order Automation\n` +
          `3. Mobile-First Responsive Design & SEO Optimization\n` +
          `4. 3 Months Free Technical Maintenance & Updates\n\n` +
          `⏳ *Timeline:* 14 Working Days\n` +
          `💳 *Payment Terms:* 50% Advance on Kickoff · 50% on Live Deployment\n\n` +
          `Ready to start development this week? Let us know so we can share the invoice.\n\n` +
          `— *${ownerName}*, DND Studio`,
        emailSubject: `Project Proposal & Commercial Quotation — ${clientName}`,
        emailBody: `Dear ${clientName} Team,\n\nFollowing our productive demo discussion, please find attached our comprehensive project proposal for ${projectScope}.\n\nOur turnkey package includes:\n- Full UI/UX architecture & frontend engineering\n- Mobile responsiveness & WhatsApp integration\n- Domain, SSL & Cloud hosting setup\n- 90 days complimentary post-launch support\n\nWe are ready to commence sprint 1 upon receipt of the initial milestone advance.\n\nPlease review and let us know if you have any questions.\n\nWarm regards,\n${ownerName}\nPrincipal, DND Studio`,
        objections: [
          {
            objection: 'Can you reduce the quotation / discount please?',
            rebuttal: 'Sir, base code quality and cloud speed la nanga compromise panna maatom. Price drop panrathuku pathila, ungaluku 1 Year Free Domain & SSL + WhatsApp Automation free-ah bundle panni tharom sir (value ₹15,000).',
          },
          {
            objection: 'Need to discuss with partner / management',
            rebuttal: 'Kandippa sir. Partner kum oru quick 5-min video summary WhatsApp la drop panren, decision edukaradhuku romba easy-ah irukum. Nalaiku afternoon call pannalama?',
          },
        ],
        keyBenefits: [
          '50-50 milestone-based payment structure',
          'Strict 14-day delivery timeline with weekly demo check-ins',
          '90 days free post-launch support included',
        ],
      };
    }
  }

  // ────────────── PROFESSIONAL ENGLISH ──────────────
  return {
    stage,
    language: 'english',
    headline: `Executive Sales Script for ${clientName} (${stage})`,
    hook: `Hello, this is ${ownerName} from DND Studio in Chennai. We've been tracking ${clientName}'s momentum in ${location} and noticed an opportunity to expand your direct digital sales.`,
    valueProposition: isRestaurant
      ? `We build proprietary Direct Ordering Web Apps that eliminate high aggregator commissions (saving 25-30% per order) while capturing direct customer loyalty on WhatsApp.`
      : isConstruction
      ? `We design immersive 3D Project Portfolios & Lead Funnels that attract verified, high-ticket property buyers directly without expensive middleman listing fees.`
      : `We build high-converting Web Apps, Portfolios, and Mobile Solutions tailored to scale direct customer conversions and automate operational workflows.`,
    stageAsk: stage === 'NEW'
      ? `May I share a 60-second interactive preview on your WhatsApp, or schedule a quick 10-minute demo this week?`
      : stage === 'MEETING'
      ? `Let's schedule a 15-minute Google Meet walkthrough so you can experience the prototype firsthand.`
      : `We are prepared to initiate Sprint 1 upon advance confirmation. Shall we send across the project agreement?`,
    fullCallScript: `1. INTRODUCTION: "Good morning/afternoon, this is ${ownerName} from DND Studio. How are you doing today?"\n` +
      `2. CONTEXT: "I am reaching out specifically regarding ${clientName}. We noticed your strong customer rating in ${location}."\n` +
      `3. STRATEGY: "${isRestaurant ? 'Most restaurants lose 25-30% on commissions. We implement direct web ordering to capture 100% of profit.' : 'We develop high-performance web applications that convert search traffic into booked clients.'}"\n` +
      `4. CALL TO ACTION: "We have built a dedicated demo tailored for your brand. Can we schedule a brief 10-minute Google Meet demo tomorrow at 11 AM?"\n` +
      `5. NEXT STEP: "Thank you! I will send the meeting confirmation and calendar invite to your email right away."`,
    whatsappMessage: `*Greetings from DND Studio! 🚀*\n\n` +
      `Hi *${clientName}* team,\n\n` +
      `We recently reviewed your business in *${location}* and designed a high-impact digital proposal for *${projectScope}*.\n\n` +
      `🌟 *Core Deliverables:*\n` +
      `• Mobile-first, ultra-responsive web application\n` +
      `• Direct WhatsApp order & inquiry automation\n` +
      `• Zero middleman commissions\n` +
      `• 14-day turnaround to live production\n\n` +
      `Would you like to review our 2-minute live demo link here?\n\n` +
      `Best regards,\n` +
      `*${ownerName}* | DND Studio\n` +
      `📞 +91 9342626096`,
    emailSubject: `Digital Growth Proposal: Custom ${projectScope} for ${clientName}`,
    emailBody: `Dear ${clientName} Team,\n\nI hope this email finds you well.\n\nI am reaching out from DND Studio, a Chennai-based web and mobile application studio. Having observed ${clientName}'s standing in ${location}, we have developed a strategy to scale your direct digital revenue through ${projectScope}.\n\nOur custom-built applications typically increase direct sales conversion by 30-40% while streamlining client communications.\n\nCould we arrange a 10-minute Google Meet presentation this week to demonstrate how this functions?\n\nSincerely,\n${ownerName}\nFounder, DND Studio\n+91 9342626096`,
    objections: [
      {
        objection: 'We already have social media pages and Google listing',
        rebuttal: 'Social media is great for awareness, but a proprietary web application builds brand equity, processes automated transactions, and ranks on Google SEO for high-intent search buyers.',
      },
      {
        objection: 'Budget constraints / Need lower pricing',
        rebuttal: 'We structure our projects with milestone-based terms (50% upfront, 50% upon delivery) so the platform begins paying for itself through customer acquisition right from launch.',
      },
      {
        objection: 'Please send pricing and details first',
        rebuttal: 'I would be glad to. I will drop our 2-minute demo and portfolio deck to your WhatsApp right now so you can review at your convenience.',
      },
    ],
    keyBenefits: [
      'Tailored UI/UX designed to outperform local competitors',
      'Direct WhatsApp and payment gateway integration',
      'Fast 14-day production delivery with 90-day warranty',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3.1: AI LEAD PRIORITIZER
// Ranks all active leads every morning based on closing probability, stage urgency,
// deal size, proposal views, and days since last contact.
// ─────────────────────────────────────────────────────────────────────────────
aiRouter.post('/prioritize-leads', async (req: AuthRequest, res: Response) => {
  try {
    const activeLeads = await prisma.lead.findMany({
      where: {
        stage: { notIn: ['WON', 'LOST'] },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        activities: { take: 5, orderBy: { createdAt: 'desc' } },
        proposal: { select: { id: true, status: true, viewCount: true, lastViewedAt: true, amountLakhs: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = Date.now();

    const scoredLeads = activeLeads.map((lead) => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Stage Weight
      switch (lead.stage) {
        case 'NEGOTIATION':
          score += 45;
          reasons.push('Final negotiation stage — closing window active');
          break;
        case 'PROPOSAL':
          score += 40;
          reasons.push('Proposal presented — high conversion potential');
          break;
        case 'CALL_BACK':
          score += 35;
          reasons.push('Callback scheduled by client request');
          break;
        case 'MEETING':
          score += 30;
          reasons.push('Meeting / live demo stage in progress');
          break;
        case 'NEW':
          score += 25;
          reasons.push('Fresh inbound lead — rapid speed-to-lead advantage');
          break;
        case 'CONTACTED':
          score += 15;
          reasons.push('Contact established — qualification required');
          break;
      }

      // 2. Proposal Engagement Boost
      if (lead.proposal) {
        if (lead.proposal.viewCount > 0) {
          score += 25;
          reasons.push(`Client viewed proposal ${lead.proposal.viewCount} times`);
        }
        if (lead.proposal.status === 'Viewed') {
          score += 15;
        }
      }

      // 3. Callback Urgency
      if (lead.callBackAt) {
        const cbTime = new Date(lead.callBackAt).getTime();
        if (cbTime <= now) {
          score += 30;
          reasons.push('Scheduled callback is overdue — reach out immediately');
        } else if (cbTime <= now + 24 * 60 * 60 * 1000) {
          score += 20;
          reasons.push('Scheduled callback is due today');
        }
      }

      // 4. Budget Weight
      if (lead.budgetLakhs >= 3.0) {
        score += 25;
        reasons.push(`High ticket deal (₹${lead.budgetLakhs.toFixed(1)}L)`);
      } else if (lead.budgetLakhs >= 1.5) {
        score += 15;
        reasons.push(`Target budget deal (₹${lead.budgetLakhs.toFixed(1)}L)`);
      }

      // 5. Stagnation / Recency
      const daysSinceUpdate = Math.floor((now - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate >= 3 && ['PROPOSAL', 'NEGOTIATION', 'MEETING'].includes(lead.stage)) {
        score += 20;
        reasons.push(`No activity for ${daysSinceUpdate} days — prevent deal from going cold`);
      }

      // Phone verification
      const cleanPhone = (lead.phone || '').replace(/\D/g, '').slice(-10);
      const hasPhone = cleanPhone.length === 10;
      if (!hasPhone) {
        score -= 50; // Heavily penalize leads without valid phone numbers
      }

      // Determine Urgency
      const urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' =
        score >= 80 ? 'CRITICAL' : score >= 55 ? 'HIGH' : 'MEDIUM';

      // Conversion Likelihood (0 - 100%)
      const conversionLikelihood = Math.min(
        96,
        Math.max(15, Math.round((lead.winProbability || 25) * 0.4 + score * 0.6))
      );

      // Best Time to Call
      const nameLower = (lead.name + ' ' + (lead.projectType || '')).toLowerCase();
      const isRestaurant = /restaurant|cafe|bistro|dining|biryani|kitchen|food|seafood/i.test(nameLower);
      const isConstruction = /construction|builder|infra|renovation|homes|developer|interior/i.test(nameLower);

      const bestTimeToCall = isRestaurant
        ? '3:30 PM – 5:30 PM (Between lunch & dinner shifts)'
        : isConstruction
        ? '10:30 AM – 12:30 PM (Morning office hours)'
        : '11:00 AM – 1:30 PM (Optimal executive availability)';

      // Action & Angle
      let recommendedAction = '';
      let suggestedAngle = '';

      if (lead.proposal && lead.proposal.viewCount > 0) {
        recommendedAction = `Follow up on Proposal (Viewed ${lead.proposal.viewCount}x) — secure advance confirmation`;
        suggestedAngle = `"Sir, noticed you reviewed our proposal deliverables. Ready to lock in the 14-day delivery sprint?"`;
      } else if (lead.stage === 'CALL_BACK') {
        recommendedAction = `Call back on schedule: ${lead.callBackNote || 'Continue project discussion'}`;
        suggestedAngle = `"Vanakkam sir, following up as promised regarding the web application scope for ${lead.name}."`;
      } else if (lead.stage === 'MEETING') {
        recommendedAction = 'Confirm Google Meet walkthrough & send calendar invite';
        suggestedAngle = `"Sir, 10-minute demo ready. Would 11:30 AM or 4 PM work best for our screen share?"`;
      } else if (lead.stage === 'NEW') {
        recommendedAction = 'Execute 2-minute cold discovery call & send Tanglish preview';
        suggestedAngle = `"Vanakkam sir, Nirmal from DND Studio. We prepared a tailored digital prototype for ${lead.name}."`;
      } else {
        recommendedAction = 'Re-engage decision maker with updated portfolio concept';
        suggestedAngle = `"Sir, quick 60-second update on how our client web app can increase direct customer sales."`;
      }

      return {
        leadId: lead.id,
        serialNo: lead.serialNo,
        name: lead.name,
        phone: cleanPhone || lead.phone || '',
        location: lead.location,
        projectType: lead.projectType,
        budgetLakhs: lead.budgetLakhs,
        stage: lead.stage,
        priority: lead.priority,
        score,
        urgency,
        conversionLikelihood,
        recommendedAction,
        aiReason: reasons.slice(0, 2).join(' · ') || 'Active pipeline opportunity',
        bestTimeToCall,
        suggestedAngle,
        ownerName: lead.owner?.name || 'Nirmal kumar',
      };
    });

    // Sort by score descending
    scoredLeads.sort((a, b) => b.score - a.score);

    // Assign ranking
    const prioritized = scoredLeads.map((item, index) => ({
      ...item,
      priorityRank: index + 1,
    }));

    res.json({
      success: true,
      data: {
        totalActive: prioritized.length,
        criticalCount: prioritized.filter((l) => l.urgency === 'CRITICAL').length,
        highCount: prioritized.filter((l) => l.urgency === 'HIGH').length,
        pipelineValueLakhs: prioritized.reduce((acc, l) => acc + l.budgetLakhs, 0),
        prioritizedLeads: prioritized.slice(0, 15), // Return top 15 priority leads
      },
    });
  } catch (error: any) {
    console.error('Error prioritizing leads:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to prioritize leads' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3.2: AI CALL SUMMARY & ACTION ITEM GENERATOR
// Takes call notes or duration, detects sentiment, extracts concrete action items,
// recommends next CRM stage, and writes a tailored WhatsApp follow-up.
// ─────────────────────────────────────────────────────────────────────────────
const SummarizeCallSchema = z.object({
  leadId: z.string(),
  callText: z.string().min(3),
  durationSecs: z.number().optional().default(0),
  attended: z.boolean().optional().default(true),
});

aiRouter.post('/summarize-call', async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, callText, durationSecs, attended } = SummarizeCallSchema.parse(req.body);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        owner: { select: { name: true } },
      },
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const textLower = callText.toLowerCase();

    // 1. Detect Sentiment
    let sentiment: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'HESITANT' | 'PRICE_SENSITIVE' | 'NEGATIVE' = 'NEUTRAL';
    if (/ready to close|sign contract|take advance|approved|transfer money|let's start|deal confirmed/i.test(textLower)) {
      sentiment = 'VERY_POSITIVE';
    } else if (/interested|impressive|good concept|send quote|send proposal|schedule demo|wants demo|liked/i.test(textLower)) {
      sentiment = 'POSITIVE';
    } else if (/expensive|discount|reduce price|high rate|budget tight|less money|costly/i.test(textLower)) {
      sentiment = 'PRICE_SENSITIVE';
    } else if (/talk to partner|need time|busy|call back next week|think about it|not decided/i.test(textLower)) {
      sentiment = 'HESITANT';
    } else if (/not interested|don't call|already built|have someone|no requirement|cancel/i.test(textLower)) {
      sentiment = 'NEGATIVE';
    }

    // 2. Extract Action Items
    const actionItems: string[] = [];
    if (/quote|quotation|proposal|pricing|commercial/i.test(textLower)) {
      actionItems.push(`Prepare & send detailed quotation for ₹${lead.budgetLakhs}L with milestone terms`);
    }
    if (/demo|meet|meeting|screen share|presentation/i.test(textLower)) {
      actionItems.push('Schedule 15-minute Google Meet walkthrough demonstration');
    }
    if (/whatsapp|sample|portfolio|reference|links/i.test(textLower)) {
      actionItems.push('Drop live portfolio links and case studies on WhatsApp');
    }
    if (/call back|tomorrow|next week|after 4|evening/i.test(textLower)) {
      actionItems.push('Set CRM callback reminder with specific time slot');
    }
    if (/partner|director|management/i.test(textLower)) {
      actionItems.push('Draft 2-minute decision-maker summary for partner review');
    }
    if (actionItems.length === 0) {
      actionItems.push(`Send executive summary of discussion to ${lead.name}`);
      actionItems.push('Follow up in 48 hours to gauge progress');
    }

    // 3. Recommended Next Stage
    let recommendedNextStage: string = lead.stage;
    let winProbabilityDelta = 0;

    if (sentiment === 'VERY_POSITIVE') {
      recommendedNextStage = 'PROPOSAL';
      winProbabilityDelta = 25;
    } else if (sentiment === 'POSITIVE') {
      recommendedNextStage = lead.stage === 'NEW' ? 'MEETING' : 'PROPOSAL';
      winProbabilityDelta = 15;
    } else if (sentiment === 'PRICE_SENSITIVE') {
      recommendedNextStage = 'NEGOTIATION';
      winProbabilityDelta = 5;
    } else if (sentiment === 'HESITANT') {
      recommendedNextStage = 'CALL_BACK';
      winProbabilityDelta = 0;
    } else if (sentiment === 'NEGATIVE') {
      winProbabilityDelta = -20;
    }

    // 4. Tailored WhatsApp Follow-up Message
    const cleanPhone = (lead.phone || '').replace(/\D/g, '').slice(-10);
    const ownerName = lead.owner?.name || 'Nirmal kumar';

    let suggestedWhatsApp = '';
    if (sentiment === 'VERY_POSITIVE' || sentiment === 'POSITIVE') {
      suggestedWhatsApp =
        `*Vanakkam from DND Studio! 🚀*\n\n` +
        `Hi *${lead.name}* team,\n\n` +
        `Thank you for taking the time to speak today! As discussed, here is the quick recap for your *${lead.projectType || 'Web & Mobile App'}*:\n\n` +
        `• ⚡ Lightning-fast custom web application\n` +
        `• 📱 Direct WhatsApp customer inquiry automation\n` +
        `• ⏱️ Ready for launch within 14 working days\n\n` +
        `We are finalizing your custom proposal right now. Let us know if you would like us to send the PDF here on WhatsApp!\n\n` +
        `— *${ownerName}*, DND Studio\n` +
        `📞 +91 9342626096`;
    } else if (sentiment === 'PRICE_SENSITIVE') {
      suggestedWhatsApp =
        `*DND Studio — Flexible Project Milestones 🤝*\n\n` +
        `Hi *${lead.name}* team,\n\n` +
        `Great connecting with you today! We understand budget alignment is crucial. To make this risk-free for you:\n\n` +
        `✓ 50% on project kickoff · 50% upon live launch\n` +
        `✓ Complimentary 1-year Cloud Hosting & SSL included\n` +
        `✓ 90 days dedicated technical maintenance\n\n` +
        `Let us know if you would like to review the milestone plan!\n\n` +
        `— *${ownerName}*, DND Studio`;
    } else {
      suggestedWhatsApp =
        `*Greetings from DND Studio! 🌟*\n\n` +
        `Hi *${lead.name}* team,\n\n` +
        `Thank you for the quick chat. Dropping our contact details here so you have them on hand for your upcoming *${lead.projectType || 'digital project'}*.\n\n` +
        `Feel free to ping us here anytime!\n\n` +
        `— *${ownerName}*, Founder @ DND Studio\n` +
        `📞 +91 9342626096 | 🌐 dndstudio.in`;
    }

    // 5. Executive 2-Sentence Briefing
    const minutes = Math.floor(durationSecs / 60);
    const seconds = durationSecs % 60;
    const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const summary = attended
      ? `Completed ${durationStr} discussion with ${lead.name}. Sentiment detected as ${sentiment.replace('_', ' ')}. Client showed interest in ${lead.projectType || 'digital platform'} with target budget around ₹${lead.budgetLakhs}L.`
      : `Outbound call attempted to ${lead.name} (${durationStr}) was not answered. Follow up queued for optimal contact window.`;

    res.json({
      success: true,
      data: {
        leadId: lead.id,
        leadName: lead.name,
        phone: cleanPhone,
        sentiment,
        attended,
        durationFormatted: durationStr,
        executiveSummary: summary,
        actionItems,
        recommendedNextStage,
        winProbabilityDelta,
        suggestedWhatsApp,
      },
    });
  } catch (error: any) {
    console.error('Error summarizing call:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to summarize call' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3.4: CONVERSATION INTELLIGENCE (NOTE & CALL ANALYZER)
// Detects buying signals, objections, and sentiment from any raw text.
// ─────────────────────────────────────────────────────────────────────────────
aiRouter.post('/analyze-note', async (req: AuthRequest, res: Response) => {
  try {
    const { text } = z.object({ text: z.string().min(1) }).parse(req.body);
    const textLower = text.toLowerCase();

    const buyingSignals: string[] = [];
    if (/when can you deliver|delivery date|timeline|how soon/i.test(textLower)) buyingSignals.push('Timeline inquiry (High Intent)');
    if (/how much|cost|rate|pricing|quotation|payment/i.test(textLower)) buyingSignals.push('Pricing & Commercial interest');
    if (/demo|show me|walkthrough|sample|preview/i.test(textLower)) buyingSignals.push('Requested Product Demonstration');
    if (/start|advance|agreement|kickoff|contract/i.test(textLower)) buyingSignals.push('Closing / Kickoff Readiness');

    const objections: string[] = [];
    if (/expensive|budget|discount|reduce/i.test(textLower)) objections.push('Pricing / Budget constraint');
    if (/partner|director|boss|discuss/i.test(textLower)) objections.push('Multi-stakeholder approval needed');
    if (/busy|later|next month|next quarter/i.test(textLower)) objections.push('Timing / Postponement');
    if (/already have|current vendor|internal team/i.test(textLower)) objections.push('Competitor / Existing Solution');

    const sentiment =
      buyingSignals.length > objections.length ? 'POSITIVE' :
      objections.length > buyingSignals.length ? 'HESITANT' : 'NEUTRAL';

    res.json({
      success: true,
      data: {
        sentiment,
        buyingSignals,
        objections,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Analysis failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3.5: PREDICTIVE WIN PROBABILITY
// Automatically predicts closing probability based on lead behavior & velocity.
// ─────────────────────────────────────────────────────────────────────────────
aiRouter.post('/predict-win', async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = z.object({ leadId: z.string() }).parse(req.body);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: true,
        proposal: true,
        meetings: true,
      },
    });

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    let winRate = 15; // base

    if (lead.stage === 'NEGOTIATION') winRate += 55;
    else if (lead.stage === 'PROPOSAL') winRate += 40;
    else if (lead.stage === 'MEETING') winRate += 25;
    else if (lead.stage === 'CONTACTED') winRate += 10;

    if (lead.proposal?.viewCount && lead.proposal.viewCount > 0) winRate += 15;
    if (lead.proposal?.status === 'Accepted') winRate = 100;
    if (lead.totalCallDurationSecs > 180) winRate += 10;
    if (lead.activities.length >= 3) winRate += 5;

    winRate = Math.min(98, Math.max(5, winRate));

    // Update in DB
    await prisma.lead.update({
      where: { id: leadId },
      data: { winProbability: winRate },
    });

    res.json({
      success: true,
      data: {
        leadId,
        predictedWinRate: winRate,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to predict win rate' });
  }
});

