import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rawData = `1,K.M constructions,5.0,30.0,"No 2, 10th Cross St",Chennai,Tamil Nadu,IN,87782 73957,1 item,https://www.google.com/maps/search/?api=1&query=K.M%20constructions&query_place_id=ChIJmxzHDUJhUjoRvPcbwEQhDoQ,Construction company
2,Rajalakshmi Constructions,5.0,10.0,"148, Radha Ave Main Rd",Chennai,Tamil Nadu,IN,99415 25262,1 item,https://www.google.com/maps/search/?api=1&query=Rajalakshmi%20Constructions&query_place_id=ChIJa_W7cjdhUjoR0uIMhl1Q3hk,Construction company
3,"SPERANZA CONSTRUCTIONS, RENOVATION AND INTERIORS.",5.0,33.0,"2, First street, C.D.N. Nagar Main Rd",Chennai,Tamil Nadu,IN,99408 88456,1 item,https://www.google.com/maps/search/?api=1&query=SPERANZA%20CONSTRUCTIONS%2C%20RENOVATION%20AND%20INTERIORS.&query_place_id=ChIJB5uofZJhUjoRj7EnwRWcQWk,Construction company
5,RJ Constructions,3.9,8.0,"1st Cross Street, 2nd Main Rd",Chennai,Tamil Nadu,IN,82487 91229,1 item,https://www.google.com/maps/search/?api=1&query=RJ%20Constructions&query_place_id=ChIJO1LpCG9hUjoRUI3XwwuGUfk,Construction company
6,Blessed builders,5.0,5.0,"Jayaram nagar, 1st St",Vanagaram,Tamil Nadu,IN,97106 18807,1 item,https://www.google.com/maps/search/?api=1&query=Blessed%20builders&query_place_id=ChIJwxgxaWVhUjoRMxe01Wer9Kc,Construction company
7,Tharun Construction,4.2,9.0,2nd Main Rd,Chennai,Tamil Nadu,IN,90878 88402,1 item,https://www.google.com/maps/search/?api=1&query=Tharun%20Construction&query_place_id=ChIJKdPhcTRhUjoRJgXxdEb3iy0,Construction company
8,R.K.CONSTRUCTION,3.8,4.0,"NO.5, R.K.BAVANAM, 7TH STREET IYYAPPA NAGAR, MADURAVOYAL",Chennai,Tamil Nadu,IN,98403 24264,2 items,https://www.google.com/maps/search/?api=1&query=R.K.CONSTRUCTION&query_place_id=ChIJAYR7PlZhUjoRmyBs4uV7pok,Construction company
10,Krishna Builders,5.0,1.0,"36, 1st Cross St",Chennai,Tamil Nadu,IN,98400 73239,1 item,https://www.google.com/maps/search/?api=1&query=Krishna%20Builders&query_place_id=ChIJn9iDHT9hUjoRKDDFnvRJcj0,Construction company
11,Blue Well Restaurant,4.9,112.0,"32, Alapakkam Main Rd",Chennai,Tamil Nadu,IN,93609 31010,1 item,https://www.google.com/maps/search/?api=1&query=Blue%20Well%20Restaurant&query_place_id=ChIJWdUsFONhUjoRr9bOsUc3-uM,Restaurant
12,The Madras cafe's,4.9,18.0,"6, Chokkanathar St",Chennai,Tamil Nadu,IN,75300 01484,1 item,https://www.google.com/maps/search/?api=1&query=The%20Madras%20cafe%27s&query_place_id=ChIJ23o7SQBhUjoRNwIYZaoPR9Q,Family restaurant
13,House of Tandoor,4.6,346.0,"Guru Brindhavan Garden, Vanagaram-Ambattur Rd",Adayalampattu,Tamil Nadu,IN,98846 00365,1 item,https://www.google.com/maps/search/?api=1&query=House%20of%20Tandoor&query_place_id=ChIJizLrGgBhUjoRahc-AapS51M,Family restaurant
14,SON'S Restaurant,4.1,930.0,No 21,Chennai,Tamil Nadu,IN,73582 90985,3 items,https://www.google.com/maps/search/?api=1&query=SON%27S%20Restaurant&query_place_id=ChIJ20xB4NxhUjoRtax2mu6Tp-k,Fine dining restaurant
15,Swarnamukhii Cloud Kitchen,4.5,76.0,"No14, Velan Nagar 9th St",Chennai,Tamil Nadu,IN,95661 11646,1 item,https://www.google.com/maps/search/?api=1&query=Swarnamukhii%20Cloud%20Kitchen&query_place_id=ChIJZVqOcL1hUjoRuhRjkoGXVYE,Restaurant
18,Tummie Filler's Restaurant,4.5,42.0,"3536+MCG, Chokkalingam Naicker 5th St",Chennai,Tamil Nadu,IN,81480 18613,1 item,https://www.google.com/maps/search/?api=1&query=Tummie%20Filler%27s%20Restaurant&query_place_id=ChIJzbUb1v5hUjoRvIhCgLJE6xA,Family restaurant
20,FAMILY RESTAURANT,5.0,1.0,,Chennai,Tamil Nadu,IN,84599 46120,1 item,https://www.google.com/maps/search/?api=1&query=FAMILY%20RESTAURANT&query_place_id=ChIJFek8AnJhUjoRotAFtu5L5o4,Family restaurant
21,Resto Corner,5.0,10.0,"Plot No : 14, Abirami Nagar 4th St",Chennai,Tamil Nadu,IN,99622 12724,1 item,https://www.google.com/maps/search/?api=1&query=Resto%20Corner&query_place_id=ChIJzfa_6BxhUjoRGfNyiXCEfMA,Cafe
22,Toast And Talk,4.7,3.0,The Schram Academy 2,Chennai,Tamil Nadu,IN,81229 07708,1 item,https://www.google.com/maps/search/?api=1&query=Toast%20And%20Talk&query_place_id=ChIJgbNhAD9hUjoR9N-ZsskJ8T4,Restaurant
23,MADURAVOYAL PANDIAN MESS,4.8,1444.0,"132, Alapakkam Main Rd, opp. meenakshi school",Chennai,Tamil Nadu,IN,99625 66625,1 item,https://www.google.com/maps/search/?api=1&query=MADURAVOYAL%20PANDIAN%20MESS&query_place_id=ChIJuRDRe9lhUjoRVS4bxGPiXuc,Seafood restaurant
24,Arabian Home Food,4.3,40.0,"123, Mettukuppam Rd, near EB Office",Chennai,Tamil Nadu,IN,98848 80570,1 item,https://www.google.com/maps/search/?api=1&query=Arabian%20Home%20Food&query_place_id=ChIJcxswhAZhUjoRxGPTpuvDLuU,Arab restaurant
25,Kadher Bhai Biryani Maduravoyal (K2B),4.0,1387.0,"3578+RRM, 4, Sannathi St",Chennai,Tamil Nadu,IN,7397 377 725,1 item,https://www.google.com/maps/search/?api=1&query=Kadher%20Bhai%20Biryani%20Maduravoyal%20(K2B)&query_place_id=ChIJ7VW4MMJhUjoR030-fphoxWU,Biryani restaurant
26,BIRIYANI CHOWK,4.2,29.0,"Maduravoyal #15, MCK Layout, Bypass, Service Rd","Adayalampattu, Chennai",Tamil Nadu,IN,84381 84010,1 item,https://www.google.com/maps/search/?api=1&query=BIRIYANI%20CHOWK&query_place_id=ChIJO0Eg8MBhUjoRJJqJNoNgKGk,Family restaurant
27,Crown Brick Construction,,,"171, Poonamallee High Rd",Chennai,Tamil Nadu,IN,96004 26219,1 item,https://www.google.com/maps/search/?api=1&query=Crown%20Brick%20Construction&query_place_id=ChIJwxdv7l5hUjoRwSaMeueaiLs,Construction company
35,RIVER SAND M SAND P SAND AVAILABLE,5.0,38.0,Muthumari Amman Kovil street New subramanian Nagar,Chennai,Tamil Nadu,IN,99419 66474,5 items,https://www.google.com/maps/search/?api=1&query=RIVER%20SAND%20M%20SAND%20P%20SAND%20AVAILABLE&query_place_id=ChIJNfMH_DxhUjoR93KPadF6PtU,Construction material wholesaler
38,3Star Infra Engineering.,5.0,4.0,,Chennai,Tamil Nadu,IN,74486 33339,1 item,https://www.google.com/maps/search/?api=1&query=3Star%20Infra%20Engineering.&query_place_id=ChIJjzfOw01hUjoRXWMjB4wYhng,Construction machine rental service
40,Salem RR Biryani - Maduravoyal Branch,3.3,2324.0,"Post Office stopping, Mumbai Hwy",Chennai,Tamil Nadu,IN,44 2949 2000,2 items,https://www.google.com/maps/search/?api=1&query=Salem%20RR%20Biryani%20-%20Maduravoyal%20Branch&query_place_id=ChIJvWh76nZhUjoRnf4eZ0Pt1LQ,Biryani restaurant
41,2 Idly 1 Vadai Restaurant,4.0,1015.0,"3528+GG9, Alapakkam Main Rd",Chennai,Tamil Nadu,IN,74016 54053,1 item,https://www.google.com/maps/search/?api=1&query=2%20Idly%201%20Vadai%20Restaurant&query_place_id=ChIJHUxSftlhUjoRVYLMzPXfxmw,South Indian restaurant
43,Hotel Pandian,3.7,2793.0,"No1/10 Poonamallee High Road, Ganapathy Nagar, Maduravoyal",Chennai,Tamil Nadu,IN,91765 58648,1 item,https://www.google.com/maps/search/?api=1&query=Hotel%20Pandian&query_place_id=ChIJEaJS_3FhUjoRtX0_p_Dv0b4,South Indian restaurant
44,Sri Balavignesh Bhavan,3.8,522.0,Kanchipuram - Chennai Rd,Chennai,Tamil Nadu,IN,44 2386 0491,2 items,https://www.google.com/maps/search/?api=1&query=Sri%20Balavignesh%20Bhavan&query_place_id=ChIJH3llAHJhUjoRqeeUAqMODG4,South Indian restaurant
46,Hotel Shenbagaa Bhavan,3.9,277.0,"340, Poonamallee High Rd",Chennai,Tamil Nadu,IN,89394 71378,1 item,https://www.google.com/maps/search/?api=1&query=Hotel%20Shenbagaa%20Bhavan&query_place_id=ChIJMTNBAENhUjoR6jAc8TuNKCo,Vegan restaurant
47,New Hyderabad Biriyani,3.7,61.0,"No.1, 98, Poonamallee High Rd",Chennai,Tamil Nadu,IN,44 2476 1776,2 items,https://www.google.com/maps/search/?api=1&query=New%20Hyderabad%20Biriyani&query_place_id=ChIJISLrLqthUjoRN5bNTyXtLzY,Hyderabadi restaurant
48,Bismillah Biriyani Stall and tiffen centre,5.0,2.0,"Kkr ent hospital, 2nd Main Rd, opposite mmda",Chennai,Tamil Nadu,IN,93420 45120,2 items,https://www.google.com/maps/search/?api=1&query=Bismillah%20Biriyani%20Stall%20and%20tiffen%20centre&query_place_id=ChIJDRVTJbhhUjoRB2CLuXKPxdk,Tiffin center
49,Naadan thattu,3.0,2.0,"No 48 a, 5th St",Chennai,Tamil Nadu,IN,88489 91423,1 item,https://www.google.com/maps/search/?api=1&query=Naadan%20thattu&query_place_id=ChIJbdunz9xhUjoR3WrqF5yfVJs,Kerala restaurant
50,Roopa Rekha bakery,4.0,25.0,"13, Shridevikuppam Main Rd",Chennai,Tamil Nadu,IN,99629 00186,2 items,https://www.google.com/maps/search/?api=1&query=Roopa%20Rekha%20bakery&query_place_id=ChIJO0YttTBhUjoRDfaXWXvXQf8,Bakery`;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function cleanPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91 ${digits.slice(1, 6)} ${digits.slice(6)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return rawPhone.trim();
}

function getProjectType(category: string, name: string): string {
  const c = (category || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (c.includes('construction') || n.includes('construction') || n.includes('builder')) {
    return 'Turnkey Architecture & Construction';
  }
  if (c.includes('interior') || n.includes('interior') || c.includes('renovation')) {
    return 'Luxury Interior Renovation';
  }
  if (c.includes('restaurant') || c.includes('cafe') || c.includes('dining') || c.includes('biryani') || c.includes('tiffin') || c.includes('mess')) {
    return 'Commercial Dining & Hospitality Fitout';
  }
  if (c.includes('bakery')) {
    return 'Retail Bakery & Cafe Design';
  }
  if (c.includes('material') || c.includes('wholesale') || c.includes('machine') || c.includes('rental') || c.includes('infra')) {
    return 'Industrial Infrastructure & Commercial Supply';
  }
  return 'Commercial Architecture & Fitout';
}

function getBudget(category: string, reviews: number): number {
  const c = (category || '').toLowerCase();
  if (c.includes('construction') || c.includes('builder')) {
    return 45 + Math.floor(Math.random() * 40); // 45L - 85L
  }
  if (c.includes('fine dining')) {
    return 35 + Math.floor(Math.random() * 25); // 35L - 60L
  }
  if (c.includes('restaurant') || c.includes('cafe')) {
    return 20 + Math.floor(Math.random() * 20); // 20L - 40L
  }
  if (c.includes('bakery') || c.includes('tiffin')) {
    return 15 + Math.floor(Math.random() * 15); // 15L - 30L
  }
  return 25 + Math.floor(Math.random() * 25);
}

function getPriority(rating: number, reviews: number): 'HOT' | 'WARM' | 'COLD' {
  if (rating >= 4.5 || reviews >= 100) return 'HOT';
  if (rating >= 3.8 || reviews >= 10) return 'WARM';
  return 'COLD';
}

async function retryOp<T>(op: () => Promise<T>, retries = 5, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await op();
    } catch (err: any) {
      console.warn(`Attempt ${i + 1} failed: ${err.message}. Retrying in ${delayMs}ms...`);
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('All retries failed');
}

async function main() {
  console.log('Connecting to database...');
  const gayathri = await retryOp(() =>
    prisma.user.findFirst({
      where: { email: 'gayathrideva2007@gmail.com' },
    })
  );
  const nirmal = await retryOp(() =>
    prisma.user.findFirst({
      where: { email: 'nirmalkumar00727@gmail.com' },
    })
  );

  const defaultOwnerId = gayathri?.id || nirmal?.id;
  if (!defaultOwnerId) {
    throw new Error('No user found in database to assign leads!');
  }

  // Ensure database leads are clean and reset sequence
  await retryOp(() => prisma.activity.deleteMany({}));
  await retryOp(() => prisma.note.deleteMany({}));
  await retryOp(() => prisma.meeting.deleteMany({}));
  await retryOp(() => prisma.fileAsset.deleteMany({}));
  await retryOp(() => prisma.proposal.deleteMany({}));
  await retryOp(() => prisma.notification.deleteMany({}));
  await retryOp(() => prisma.lead.deleteMany({}));

  try {
    await retryOp(() => prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('leads', 'serialNo'), 1, false);`));
    console.log('Reset sequence to 1');
  } catch (e) {
    console.warn('Could not reset sequence via raw query:', e);
  }

  const lines = rawData.split('\n').map(l => l.trim()).filter(Boolean);
  console.log(`Processing ${lines.length} fresh leads...`);

  let count = 0;
  for (const line of lines) {
    const cols = parseCSVLine(line);
    const [
      originalNo,
      name,
      ratingStr,
      reviewsStr,
      address,
      city,
      state,
      country,
      phoneRaw,
      items,
      mapsUrl,
      category,
    ] = cols;

    if (!name) continue;

    const rating = parseFloat(ratingStr) || 4.5;
    const reviews = parseFloat(reviewsStr) || 5;
    const locationParts = [address, city, state].filter(Boolean);
    const fullLocation = locationParts.join(', ') || 'Chennai, Tamil Nadu';
    const projectType = getProjectType(category, name);
    const budget = getBudget(category, reviews);
    const priority = getPriority(rating, reviews);
    const phone = cleanPhone(phoneRaw);

    const description = [
      category ? `Category: ${category}` : null,
      rating ? `Google Rating: ${rating} ⭐ (${reviews} reviews)` : null,
      address ? `Address: ${address}` : null,
      mapsUrl ? `Google Maps: ${mapsUrl}` : null,
    ].filter(Boolean).join(' | ');

    const tags = JSON.stringify([
      'Fresh Lead',
      category || 'Commercial',
      city || 'Chennai',
      rating >= 4.5 ? 'Top Rated' : 'Verified',
    ]);

    const winProbability = priority === 'HOT' ? 75 : priority === 'WARM' ? 50 : 30;

    const lead = await retryOp(() =>
      prisma.lead.create({
        data: {
          name,
          projectType,
          projectDescription: description,
          location: fullLocation,
          budgetLakhs: budget,
          source: 'Google',
          priority,
          stage: 'NEW',
          phone,
          email: null,
          ownerId: defaultOwnerId,
          winProbability,
          tags,
        },
      })
    );

    console.log(`Created lead #${lead.serialNo}: ${lead.name} (DND-${String(lead.serialNo).padStart(3, '0')}) - ${lead.phone}`);
    count++;
  }

  console.log(`\nSuccessfully created all ${count} fresh leads starting at DND-001!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
