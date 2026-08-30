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
