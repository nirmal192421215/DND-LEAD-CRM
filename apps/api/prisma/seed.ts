import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Bind Build ERP database...');

  // ─── Create Users ─────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const principal = await prisma.user.upsert({
    where: { email: 'arparthibanmoorthy@gmail.com' },
    update: {
      name: 'AR.PARTHIBAN MOORTHY',
      role: 'PRINCIPAL',
      initials: 'PM',
    },
    create: {
      email: 'arparthibanmoorthy@gmail.com',
      password: passwordHash,
      name: 'AR.PARTHIBAN MOORTHY',
      role: 'PRINCIPAL',
      initials: 'PM',
    },
  });

  // Keep legacy alias for backward compatibility
  await prisma.user.upsert({
    where: { email: 'principal@bindbuild.com' },
    update: { name: 'AR.PARTHIBAN MOORTHY' },
    create: {
      email: 'principal@bindbuild.com',
      password: passwordHash,
      name: 'AR.PARTHIBAN MOORTHY',
      role: 'PRINCIPAL',
      initials: 'PM',
    },
  });

  const sales1 = await prisma.user.upsert({
    where: { email: 'priya@bindbuild.com' },
    update: {},
    create: {
      email: 'priya@bindbuild.com',
      password: passwordHash,
      name: 'Priya Sharma',
      role: 'SALES',
      initials: 'PS',
    },
  });

  const sales2 = await prisma.user.upsert({
    where: { email: 'rahul@bindbuild.com' },
    update: {},
    create: {
      email: 'rahul@bindbuild.com',
      password: passwordHash,
      name: 'Rahul Verma',
      role: 'SALES',
      initials: 'RV',
    },
  });

  console.log('✅ Users created');

  // ─── Create Leads ─────────────────────────────────────────────────────────
  const leadsData = [
    {
      name: 'Ananya & Vikram Kapoor',
      projectType: 'Residential Villa',
      projectDescription: '4 BHK modern villa with home theater and terrace garden',
      location: 'Koramangala, Bangalore',
      budgetLakhs: 85,
      source: 'Instagram',
      priority: 'HOT',
      stage: 'PROPOSAL',
      phone: '+91 98765 43210',
      email: 'vikram.kapoor@gmail.com',
      winProbability: 75,
      tags: JSON.stringify(['Villa', 'Modern', 'High-Budget']),
      ownerId: sales1.id,
    },
    {
      name: 'TechStart Solutions Pvt Ltd',
      projectType: 'Commercial Office',
      projectDescription: 'Open-plan 5000 sqft tech office with collaborative zones',
      location: 'Whitefield, Bangalore',
      budgetLakhs: 120,
      source: 'Referral',
      priority: 'HOT',
      stage: 'NEGOTIATION',
      phone: '+91 99887 76655',
      email: 'ceo@techstart.in',
      winProbability: 85,
      tags: JSON.stringify(['Commercial', 'Corporate', 'Premium']),
      ownerId: principal.id,
    },
    {
      name: 'Neha Gupta',
      projectType: '3 BHK Apartment Interior',
      projectDescription: 'Complete interior for newly purchased flat, Scandinavian theme',
      location: 'HSR Layout, Bangalore',
      budgetLakhs: 28,
      source: 'Google',
      priority: 'WARM',
      stage: 'MEETING',
      phone: '+91 97654 32109',
      email: 'neha.gupta@yahoo.com',
      winProbability: 55,
      tags: JSON.stringify(['Apartment', 'Scandinavian', 'Compact']),
      ownerId: sales2.id,
    },
    {
      name: 'Rajesh & Meena Pillai',
      projectType: 'Traditional Kerala Home',
      projectDescription: 'Heritage-style home with teak wood accents and courtyard',
      location: 'Indiranagar, Bangalore',
      budgetLakhs: 65,
      source: 'Referral',
      priority: 'HOT',
      stage: 'WON',
      phone: '+91 96543 21098',
      email: 'rajesh.pillai@gmail.com',
      winProbability: 100,
      tags: JSON.stringify(['Traditional', 'Heritage', 'Teak']),
      ownerId: sales1.id,
    },
    {
      name: 'Flourish Cafe Chain',
      projectType: 'Cafe Interior - 3 Locations',
      projectDescription: 'Boho-chic cafe interiors across 3 outlets, consistent branding',
      location: 'Multiple - Bangalore',
      budgetLakhs: 45,
      source: 'Instagram',
      priority: 'WARM',
      stage: 'CONTACTED',
      phone: '+91 90123 45678',
      email: 'ops@flourishcafe.com',
      winProbability: 40,
      tags: JSON.stringify(['Commercial', 'Cafe', 'Chain']),
      ownerId: sales2.id,
    },
    {
      name: 'Dr. Sunita Agarwal',
      projectType: 'Dental Clinic Design',
      projectDescription: 'Modern, anxiety-reducing dental clinic with calming aesthetics',
      location: 'JP Nagar, Bangalore',
      budgetLakhs: 35,
      source: 'Website',
      priority: 'WARM',
      stage: 'PROPOSAL',
      phone: '+91 95432 10987',
      email: 'drsunita.agarwal@clinique.com',
      winProbability: 60,
      tags: JSON.stringify(['Healthcare', 'Clinic', 'Calming']),
      ownerId: principal.id,
    },
    {
      name: 'Harish Nair',
      projectType: 'Penthouse Redesign',
      projectDescription: 'Ultra-luxury penthouse with smart home integration',
      location: 'Hebbal, Bangalore',
      budgetLakhs: 200,
      source: 'Direct',
      priority: 'HOT',
      stage: 'NEW',
      phone: '+91 94321 09876',
      email: 'harishnair@hgroup.co.in',
      winProbability: 30,
      tags: JSON.stringify(['Penthouse', 'Ultra-Luxury', 'Smart-Home']),
      ownerId: principal.id,
    },
    {
      name: 'Meenakshi Reddy',
      projectType: '2 BHK Compact Interior',
      projectDescription: 'Space-optimized interior for young professional couple',
      location: 'Marathahalli, Bangalore',
      budgetLakhs: 15,
      source: 'Google',
      priority: 'COLD',
      stage: 'CONTACTED',
      phone: '+91 93210 98765',
      email: 'meenakshi.r@gmail.com',
      winProbability: 25,
      tags: JSON.stringify(['Compact', 'Budget', 'Functional']),
      ownerId: sales2.id,
    },
    {
      name: 'Greenleaf Coworking',
      projectType: 'Coworking Space',
      projectDescription: '8000 sqft biophilic coworking space with event area',
      location: 'Domlur, Bangalore',
      budgetLakhs: 95,
      source: 'Referral',
      priority: 'HOT',
      stage: 'MEETING',
      phone: '+91 92109 87654',
      email: 'founders@greenleaf.works',
      winProbability: 65,
      tags: JSON.stringify(['Coworking', 'Biophilic', 'Large-Scale']),
      ownerId: sales1.id,
    },
    {
      name: 'Prashant & Divya Kulkarni',
      projectType: 'Row House Interior',
      projectDescription: 'Contemporary row house with industrial touches',
      location: 'Sarjapur Road, Bangalore',
      budgetLakhs: 42,
      source: 'WalkIn',
      priority: 'WARM',
      stage: 'LOST',
      phone: '+91 91098 76543',
      email: 'prashant.kulkarni@gmail.com',
      winProbability: 0,
      tags: JSON.stringify(['Row-House', 'Industrial']),
      ownerId: sales2.id,
    },
    {
      name: 'Shalini Bose',
      projectType: 'Boutique Hotel - 12 Rooms',
      projectDescription: 'Heritage boutique hotel renovation near Cubbon Park',
      location: 'Cubbon Park Area, Bangalore',
      budgetLakhs: 180,
      source: 'Referral',
      priority: 'HOT',
      stage: 'PROPOSAL',
      phone: '+91 90987 65432',
      email: 'shalini@bosehotels.com',
      winProbability: 70,
      tags: JSON.stringify(['Hospitality', 'Heritage', 'Boutique']),
      ownerId: principal.id,
    },
    {
      name: 'Sanjay Mishra',
      projectType: 'Home Office Setup',
      projectDescription: 'Dedicated home office and study room for remote work',
      location: 'Electronic City, Bangalore',
      budgetLakhs: 8,
      source: 'Website',
      priority: 'COLD',
      stage: 'NEW',
      phone: '+91 89876 54321',
      email: 'sanjay.mishra@infosys.com',
      winProbability: 20,
      tags: JSON.stringify(['Home-Office', 'Small', 'Remote-Work']),
      ownerId: sales1.id,
    },
  ];

  const createdLeads = [];
  for (const lead of leadsData) {
    const created = await prisma.lead.upsert({
      where: { id: `seed-lead-${lead.name.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}` },
      update: {},
      create: {
        id: `seed-lead-${lead.name.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`,
        ...lead,
        stageChangedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        wonAt: lead.stage === 'WON' ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) : undefined,
        lostReason: lead.stage === 'LOST' ? 'Budget mismatch' : undefined,
      },
    });
    createdLeads.push(created);
  }

  console.log(`✅ ${createdLeads.length} leads created`);

  // ─── Seed Activities ───────────────────────────────────────────────────────
  const activityTemplates = [
    { type: 'CALL', text: 'Initial discovery call completed. Client is very interested.' },
    { type: 'WHATSAPP', text: 'Sent project portfolio via WhatsApp. Client appreciated the samples.' },
    { type: 'EMAIL', text: 'Detailed questionnaire sent. Awaiting response.' },
    { type: 'NOTE', text: 'Client prefers minimalist design with warm tones.' },
    { type: 'MEETING', text: 'Studio meeting held. Discussed timeline and key requirements.' },
  ];

  for (const lead of createdLeads.slice(0, 8)) {
    const numActivities = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numActivities; i++) {
      const template = activityTemplates[i % activityTemplates.length];
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          type: template.type,
          text: template.text,
          createdById: [principal.id, sales1.id, sales2.id][Math.floor(Math.random() * 3)],
          createdAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log('✅ Activities seeded');

  // ─── Seed Notes ───────────────────────────────────────────────────────────
  for (const lead of createdLeads.slice(0, 6)) {
    await prisma.note.create({
      data: {
        leadId: lead.id,
        text: `Key insight: Client has a very specific vision. Ensure the mood board is aligned before next meeting. Budget is flexible within 10%.`,
        pinned: true,
        createdById: [principal.id, sales1.id][Math.floor(Math.random() * 2)],
      },
    });
  }

  console.log('✅ Notes seeded');
  console.log('\n🎉 Seed complete!');
  console.log('\nDefault credentials:');
  console.log('  Principal: principal@bindbuild.com / password123');
  console.log('  Sales 1:   priya@bindbuild.com / password123');
  console.log('  Sales 2:   rahul@bindbuild.com / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
