import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const prisma = new PrismaClient();

const initial33Leads = [
  { name: 'K.M constructions', rating: 5.0, reviews: 30, address: 'No 2, 10th Cross St, Chennai, Tamil Nadu', phone: '8778273957', category: 'Construction company', url: 'https://www.google.com/maps/search/?api=1&query=K.M%20constructions&query_place_id=ChIJmxzHDUJhUjoRvPcbwEQhDoQ', priority: 'HOT', budgetLakhs: 65, projectType: 'Turnkey Construction & Architecture' },
  { name: 'Rajalakshmi Constructions', rating: 5.0, reviews: 10, address: '148, Radha Ave Main Rd, Chennai, Tamil Nadu', phone: '9941525262', category: 'Construction company', url: 'https://www.google.com/maps/search/?api=1&query=Rajalakshmi%20Constructions&query_place_id=ChIJa_W7cjdhUjoR0uIMhl1Q3hk', priority: 'HOT', budgetLakhs: 55, projectType: 'Turnkey Construction & Architecture' },
  { name: 'SPERANZA CONSTRUCTIONS, RENOVATION AND INTERIORS.', rating: 5.0, reviews: 33, address: '2, First street, C.D.N. Nagar Main Rd, Chennai, Tamil Nadu', phone: '9940888456', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=SPERANZA%20CONSTRUCTIONS%2C%20RENOVATION%20AND%20INTERIORS.&query_place_id=ChIJB5uofZJhUjoRj7EnwRWcQWk', priority: 'HOT', budgetLakhs: 70, projectType: 'Luxury Interior Renovation' },
  { name: 'RJ Constructions', rating: 3.9, reviews: 8, address: '1st Cross Street, 2nd Main Rd, Chennai, Tamil Nadu', phone: '8248791229', category: 'Construction company', url: 'https://www.google.com/maps/search/?api=1&query=RJ%20Constructions&query_place_id=ChIJO1LpCG9hUjoRUI3XwwuGUfk', priority: 'WARM', budgetLakhs: 45, projectType: 'Turnkey Construction & Architecture' },
  { name: 'Blessed builders', rating: 5.0, reviews: 5, address: 'Jayaram nagar, 1st St, Vanagaram, Tamil Nadu', phone: '9710618807', category: 'Construction company', url: 'https://www.google.com/maps/search/?api=1&query=Blessed%20builders&query_place_id=ChIJwxgxaWVhUjoRMxe01Wer9Kc', priority: 'HOT', budgetLakhs: 50, projectType: 'Turnkey Construction & Architecture' },
  { name: 'Tharun Construction', rating: 4.2, reviews: 9, address: '2nd Main Rd, Chennai, Tamil Nadu', phone: '9087888402', category: 'Construction company', url: 'https://www.google.com/maps/search/?api=1&query=Tharun%20Construction&query_place_id=ChIJKdPhcTRhUjoRJgXxdEb3iy0', priority: 'WARM', budgetLakhs: 48, projectType: 'Turnkey Construction & Architecture' },
  { name: 'R.K.CONSTRUCTION', rating: 3.8, reviews: 4, address: 'NO.5, R.K.BAVANAM, 7TH STREET IYYAPPA NAGAR, MADURAVOYAL, Chennai, Tamil Nadu', phone: '9840324264', category: 'Construction company', url: 'https://www.google.com/maps/search/?api=1&query=R.K.CONSTRUCTION&query_place_id=ChIJAYR7PlZhUjoRmyBs4uV7pok', priority: 'WARM', budgetLakhs: 52, projectType: 'Turnkey Construction & Architecture' },
  { name: 'Krishna Builders', rating: 5.0, reviews: 1, address: '36, 1st Cross St, Chennai, Tamil Nadu', phone: '9840073239', category: 'Construction company', url: 'https://www.google.com/maps/search/?api=1&query=Krishna%20Builders&query_place_id=ChIJn9iDHT9hUjoRKDDFnvRJcj0', priority: 'HOT', budgetLakhs: 60, projectType: 'Turnkey Construction & Architecture' },
  { name: 'Blue Well Restaurant', rating: 4.9, reviews: 112, address: '32, Alapakkam Main Rd, Chennai, Tamil Nadu', phone: '9360931010', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Blue%20Well%20Restaurant&query_place_id=ChIJWdUsFONhUjoRr9bOsUc3-uM', priority: 'HOT', budgetLakhs: 35, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: "The Madras cafe's", rating: 4.9, reviews: 18, address: '6, Chokkanathar St, Chennai, Tamil Nadu', phone: '7530001484', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=The%20Madras%20cafe%27s&query_place_id=ChIJ23o7SQBhUjoRNwIYZaoPR9Q', priority: 'HOT', budgetLakhs: 28, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'House of Tandoor', rating: 4.6, reviews: 346, address: 'Guru Brindhavan Garden, Vanagaram-Ambattur Rd, Adayalampattu, Tamil Nadu', phone: '9884600365', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=House%20of%20Tandoor&query_place_id=ChIJizLrGgBhUjoRahc-AapS51M', priority: 'HOT', budgetLakhs: 40, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: "SON'S Restaurant", rating: 4.1, reviews: 930, address: 'No 21, Chennai, Tamil Nadu', phone: '7358290985', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=SON%27S%20Restaurant&query_place_id=ChIJ20xB4NxhUjoRtax2mu6Tp-k', priority: 'WARM', budgetLakhs: 45, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Swarnamukhii Cloud Kitchen', rating: 4.5, reviews: 76, address: 'No14, Velan Nagar 9th St, Chennai, Tamil Nadu', phone: '9566111646', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Swarnamukhii%20Cloud%20Kitchen&query_place_id=ChIJZVqOcL1hUjoRuhRjkoGXVYE', priority: 'HOT', budgetLakhs: 25, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: "Tummie Filler's Restaurant", rating: 4.5, reviews: 42, address: '3536+MCG, Chokkalingam Naicker 5th St, Chennai, Tamil Nadu', phone: '8148018613', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Tummie%20Filler%27s%20Restaurant&query_place_id=ChIJzbUb1v5hUjoRvIhCgLJE6xA', priority: 'HOT', budgetLakhs: 30, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'FAMILY RESTAURANT', rating: 5.0, reviews: 1, address: 'Chennai, Tamil Nadu', phone: '8459946120', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=FAMILY%20RESTAURANT&query_place_id=ChIJFek8AnJhUjoRotAFtu5L5o4', priority: 'HOT', budgetLakhs: 25, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Resto Corner', rating: 5.0, reviews: 10, address: 'Plot No : 14, Abirami Nagar 4th St, Chennai, Tamil Nadu', phone: '9962212724', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Resto%20Corner&query_place_id=ChIJzfa_6BxhUjoRGfNyiXCEfMA', priority: 'HOT', budgetLakhs: 22, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Toast And Talk', rating: 4.7, reviews: 3, address: 'The Schram Academy 2, Chennai, Tamil Nadu', phone: '8122907708', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Toast%20And%20Talk&query_place_id=ChIJgbNhAD9hUjoR9N-ZsskJ8T4', priority: 'HOT', budgetLakhs: 26, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'MADURAVOYAL PANDIAN MESS', rating: 4.8, reviews: 1444, address: '132, Alapakkam Main Rd, opp. meenakshi school, Chennai, Tamil Nadu', phone: '9962566625', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=MADURAVOYAL%20PANDIAN%20MESS&query_place_id=ChIJuRDRe9lhUjoRVS4bxGPiXuc', priority: 'HOT', budgetLakhs: 38, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Arabian Home Food', rating: 4.3, reviews: 40, address: '123, Mettukuppam Rd, near EB Office, Chennai, Tamil Nadu', phone: '9884880570', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Arabian%20Home%20Food&query_place_id=ChIJcxswhAZhUjoRxGPTpuvDLuU', priority: 'WARM', budgetLakhs: 28, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Kadher Bhai Biryani Maduravoyal (K2B)', rating: 4.0, reviews: 1387, address: '3578+RRM, 4, Sannathi St, Chennai, Tamil Nadu', phone: '7397377725', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Kadher%20Bhai%20Biryani%20Maduravoyal%20(K2B)&query_place_id=ChIJ7VW4MMJhUjoR030-fphoxWU', priority: 'WARM', budgetLakhs: 35, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'BIRIYANI CHOWK', rating: 4.2, reviews: 29, address: 'Maduravoyal #15, MCK Layout, Bypass, Service Rd, Adayalampattu, Chennai, Tamil Nadu', phone: '8438184010', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=BIRIYANI%20CHOWK&query_place_id=ChIJO0Eg8MBhUjoRJJqJNoNgKGk', priority: 'WARM', budgetLakhs: 30, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Crown Brick Construction', rating: 4.0, reviews: 5, address: '171, Poonamallee High Rd, Chennai, Tamil Nadu', phone: '9600426219', category: 'Construction company', url: 'https://www.google.com/maps/search/?api=1&query=Crown%20Brick%20Construction&query_place_id=ChIJwxdv7l5hUjoRwSaMeueaiLs', priority: 'WARM', budgetLakhs: 50, projectType: 'Turnkey Construction & Architecture' },
  { name: 'RIVER SAND M SAND P SAND AVAILABLE', rating: 5.0, reviews: 38, address: 'Muthumari Amman Kovil street New subramanian Nagar, Chennai, Tamil Nadu', phone: '9941966474', category: 'Construction material wholesaler', url: 'https://www.google.com/maps/search/?api=1&query=RIVER%20SAND%20M%20SAND%20P%20SAND%20AVAILABLE&query_place_id=ChIJNfMH_DxhUjoR93KPadF6PtU', priority: 'HOT', budgetLakhs: 40, projectType: 'Industrial Infrastructure & Supply' },
  { name: '3Star Infra Engineering.', rating: 5.0, reviews: 4, address: 'Chennai, Tamil Nadu', phone: '7448633339', category: 'Construction machine rental service', url: 'https://www.google.com/maps/search/?api=1&query=3Star%20Infra%20Engineering.&query_place_id=ChIJjzfOw01hUjoRXWMjB4wYhng', priority: 'HOT', budgetLakhs: 60, projectType: 'Industrial Infrastructure & Supply' },
  { name: 'Salem RR Biryani - Maduravoyal Branch', rating: 3.3, reviews: 2324, address: 'Post Office stopping, Mumbai Hwy, Chennai, Tamil Nadu', phone: '4429492000', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Salem%20RR%20Biryani%20-%20Maduravoyal%20Branch&query_place_id=ChIJvWh76nZhUjoRnf4eZ0Pt1LQ', priority: 'WARM', budgetLakhs: 45, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: '2 Idly 1 Vadai Restaurant', rating: 4.0, reviews: 1015, address: '3528+GG9, Alapakkam Main Rd, Chennai, Tamil Nadu', phone: '7401654053', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=2%20Idly%201%20Vadai%20Restaurant&query_place_id=ChIJHUxSftlhUjoRVYLMzPXfxmw', priority: 'WARM', budgetLakhs: 30, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Hotel Pandian', rating: 3.7, reviews: 2793, address: 'No1/10 Poonamallee High Road, Ganapathy Nagar, Maduravoyal, Chennai, Tamil Nadu', phone: '9176558648', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Hotel%20Pandian&query_place_id=ChIJEaJS_3FhUjoRtX0_p_Dv0b4', priority: 'WARM', budgetLakhs: 35, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Sri Balavignesh Bhavan', rating: 3.8, reviews: 522, address: 'Kanchipuram - Chennai Rd, Chennai, Tamil Nadu', phone: '4423860491', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Sri%20Balavignesh%20Bhavan&query_place_id=ChIJH3llAHJhUjoRqeeUAqMODG4', priority: 'WARM', budgetLakhs: 28, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Hotel Shenbagaa Bhavan', rating: 3.9, reviews: 277, address: '340, Poonamallee High Rd, Chennai, Tamil Nadu', phone: '8939471378', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Hotel%20Shenbagaa%20Bhavan&query_place_id=ChIJMTNBAENhUjoR6jAc8TuNKCo', priority: 'HOT', budgetLakhs: 32, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'New Hyderabad Biriyani', rating: 3.7, reviews: 61, address: 'No.1, 98, Poonamallee High Rd, Chennai, Tamil Nadu', phone: '4424761776', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=New%20Hyderabad%20Biriyani&query_place_id=ChIJISLrLqthUjoRN5bNTyXtLzY', priority: 'WARM', budgetLakhs: 25, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Bismillah Biriyani Stall and tiffen centre', rating: 5.0, reviews: 2, address: 'Kkr ent hospital, 2nd Main Rd, opposite mmda, Chennai, Tamil Nadu', phone: '9342045120', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Bismillah%20Biriyani%20Stall%20and%20tiffen%20centre&query_place_id=ChIJDRVTJbhhUjoRB2CLuXKPxdk', priority: 'HOT', budgetLakhs: 20, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Naadan thattu', rating: 3.0, reviews: 2, address: 'No 48 a, 5th St, Chennai, Tamil Nadu', phone: '8848991423', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Naadan%20thattu&query_place_id=ChIJbdunz9xhUjoR3WrqF5yfVJs', priority: 'COLD', budgetLakhs: 18, projectType: 'Commercial Dining & Hospitality Fitout' },
  { name: 'Roopa Rekha bakery', rating: 4.0, reviews: 25, address: '13, Shridevikuppam Main Rd, Chennai, Tamil Nadu', phone: '9962900186', category: 'Restaurant', url: 'https://www.google.com/maps/search/?api=1&query=Roopa%20Rekha%20bakery&query_place_id=ChIJO0YttTBhUjoRDfaXWXvXQf8', priority: 'WARM', budgetLakhs: 22, projectType: 'Retail Bakery & Cafe Design' },
];

const new36InteriorLeads = [
  { name: 'Haia interiors', rating: 4.9, reviews: 99, address: '3524+2HM, Vanagaram, Tamil Nadu', phone: '9790766388', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Haia%20interiors&query_place_id=ChIJHVpHi4VhUjoRZHHDYK6GwLM', priority: 'HOT', budgetLakhs: 48, projectType: 'Luxury Interior Design & Fitout' },
  { name: 'Agaram interior', rating: 5.0, reviews: 8, address: 'Mettukuppam Rd, Vanagaram, Tamil Nadu', phone: '9840200713', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Agaram%20interior&query_place_id=ChIJs2CjXwBhUjoRkxvAoYwfV0M', priority: 'HOT', budgetLakhs: 42, projectType: 'Luxury Interior Design & Fitout' },
  { name: 'MAYA INTERIORS', rating: 4.9, reviews: 68, address: '3 chellammal Nagar, Mettu Rd, Thundalam, Thiruverkadu, Tamil Nadu', phone: '9840808883', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=MAYA%20INTERIORS&query_place_id=ChIJh2coR-BdUjoRsWbjq7INUiQ', priority: 'HOT', budgetLakhs: 55, projectType: 'Luxury Interior Design & Decor' },
  { name: 'DESIGN YOUR HOME INTERIOR', rating: 5.0, reviews: 2, address: '320/12, varasakthi, 95, Vinayagar Kovil St, near veterinary hospital and EB office, Vanagaram, Tamil Nadu', phone: '9092024502', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=DESIGN%20YOUR%20HOME%20INTERIOR&query_place_id=ChIJJWHSA7FnUjoRwiO51f_QQFA', priority: 'HOT', budgetLakhs: 38, projectType: 'Residential Interior Design' },
  { name: 'Ｓｒｅｅ Ｓａｉ Ｉｎｔｅｒｉｏｒｓ', rating: 3.4, reviews: 9, address: 'Vanagaram, Tamil Nadu', phone: '7550194215', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=%EF%BC%B3%EF%BD%92%EF%BD%85%EF%BD%85%20%EF%BC%B3%EF%BD%81%EF%BD%89%20%EF%BC%A9%EF%BD%8E%EF%BD%94%EF%BD%85%EF%BD%92%EF%BD%89%EF%BD%8F%EF%BD%92%EF%BD%93&query_place_id=ChIJ6c7W_zNhUjoRq0171ZdOVk0', priority: 'WARM', budgetLakhs: 30, projectType: 'Modular Interior Design' },
  { name: 'MRS interior decorator', rating: 5.0, reviews: 17, address: '345W+6M6 Cluster_ambattur 17, 12/27, Noombal Main Rd, Thiruverkadu, Tamil Nadu', phone: '9790755063', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=MRS%20interior%20decorator&query_place_id=ChIJGdXRY0JdUjoRZ5Z2d-wm3D0', priority: 'HOT', budgetLakhs: 44, projectType: 'Custom Woodwork & Interior Decor' },
  { name: 'Aganam Interiors', rating: 4.7, reviews: 6, address: '131, Poonamallee High Rd, Thiruverkadu, Tamil Nadu', phone: '9962221632', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Aganam%20Interiors&query_place_id=ChIJ5UxnYSphUjoRKEdvDIjHEVU', priority: 'HOT', budgetLakhs: 50, projectType: 'Turnkey Interior Architecture' },
  { name: 'Saran Decors', rating: 5.0, reviews: 3, address: '28/2A, Poonamallee High Rd, Chennai, Tamil Nadu', phone: '9841792224', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Saran%20Decors&query_place_id=ChIJv6S_TkRhUjoR5jqClGN4-2U', priority: 'HOT', budgetLakhs: 36, projectType: 'Interior Decor & Modular Kitchen' },
  { name: 'RK TEMPO DESIGNER', rating: 5.0, reviews: 8, address: '11 Masilamani, Vembuli Naicker St, Chennai, Tamil Nadu', phone: '9150779690', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=RK%20TEMPO%20DESIGNER&query_place_id=ChIJt6IWagBhUjoRvYAnYkMgRlw', priority: 'HOT', budgetLakhs: 40, projectType: 'Interior Design & Styling' },
  { name: 'Venus Interiors', rating: 5.0, reviews: 4, address: 'Chennai, Tamil Nadu', phone: '9841655848', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Venus%20Interiors&query_place_id=ChIJaf7yXXlhUjoRi6-M3dRfRNU', priority: 'HOT', budgetLakhs: 45, projectType: 'Modular Interior Design' },
  { name: 'NESH DESIGN STUDIO', rating: 4.8, reviews: 5, address: '1/146, Poonamallee High Rd, Chennai, Tamil Nadu', phone: '8531934330', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=NESH%20DESIGN%20STUDIO&query_place_id=ChIJz2pMbFJhUjoRTlN9u2XwWUU', priority: 'HOT', budgetLakhs: 52, projectType: 'Interior Architecture Studio' },
  { name: 'Aerocon R N Associates', rating: 4.8, reviews: 5, address: 'Indira Nagar shivaboothamedu, Chennai, Tamil Nadu', phone: '9566295602', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Aerocon%20R%20N%20Associates&query_place_id=ChIJ5VtxXNRhUjoRQQKk-wvup2Y', priority: 'HOT', budgetLakhs: 40, projectType: 'Commercial Interior Design' },
  { name: 'I Five Interiors', rating: 5.0, reviews: 11, address: 'RK Towers, Chokkanathar St, Chennai, Tamil Nadu', phone: '8438532235', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=I%20Five%20Interiors&query_place_id=ChIJDRKh-FZdUjoRoanhULW0deE', priority: 'HOT', budgetLakhs: 58, projectType: 'Modular Homes & Interior Design' },
  { name: 'Classic Home Interiors', rating: 4.6, reviews: 52, address: 'Mettukuppam Rd, Chennai, Tamil Nadu', phone: '8608054350', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Classic%20Home%20Interiors&query_place_id=ChIJ4QrDE0dhUjoRWr-ArbTbdDk', priority: 'HOT', budgetLakhs: 60, projectType: 'Luxury Residential Interior Design' },
  { name: 'Artistry Interiors & Netlon', rating: 4.8, reviews: 30, address: 'No3, Chandran Street, Chennai, Tamil Nadu', phone: '9677177726', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Artistry%20Interiors%20%26%20Netlon&query_place_id=ChIJ59g8dsxhUjoRDHHbqs6XbNc', priority: 'HOT', budgetLakhs: 46, projectType: 'Interior Decor & Renovation' },
  { name: "NEST'S INTERIORS", rating: 4.9, reviews: 12, address: '11 old 1/53 VINAYAGAR KOVIL STREET, 2nd St, Chennai, Tamil Nadu', phone: '8778113263', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=NEST\'S%20INTERIORS&query_place_id=ChIJo1xYIJVmUjoRlRQwdoHKSEM', priority: 'HOT', budgetLakhs: 48, projectType: 'Modern Residential Interiors' },
  { name: 'Eva Consociate The Interior Lab', rating: 4.8, reviews: 28, address: 'Hariom Complex, 135-A, Poonamallee High Rd, Chennai, Tamil Nadu', phone: '8778390270', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Eva%20Consociate%20The%20Interior%20Lab&query_place_id=ChIJa2CeGsRhUjoRJzv4TTiJW3g', priority: 'HOT', budgetLakhs: 56, projectType: 'Luxury Interior Lab & Fitout' },
  { name: 'D2 INTERIORS', rating: 4.7, reviews: 19, address: 'Old no 1/502 New no 1, 546, W Main Rd, Chennai, Tamil Nadu', phone: '9092342255', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=D2%20INTERIORS&query_place_id=ChIJZceKzKZhUjoRbiDii-Llsmg', priority: 'HOT', budgetLakhs: 44, projectType: 'Custom Interior Decorating' },
  { name: 'Greenspace Interior', rating: 4.5, reviews: 19, address: '2nd floor, 1/11A, Balambigai Nagar 4th St, Chennai, Tamil Nadu', phone: '9952869973', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Greenspace%20Interior&query_place_id=ChIJSQg-Qr9nUjoRkY27rK164Jw', priority: 'HOT', budgetLakhs: 42, projectType: 'Sustainable Interior Design' },
  { name: 'L2K interiors', rating: 4.3, reviews: 19, address: '2/169,mugalivakkam to madhanandhapuram, Main Rd, near Bharath petroleum, Chennai, Tamil Nadu', phone: '8939287874', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=L2K%20interiors&query_place_id=ChIJNysCGK1hUjoRMW0HNwmh5O0', priority: 'WARM', budgetLakhs: 38, projectType: 'Interior Decor & Styling' },
  { name: 'S S design', rating: 5.0, reviews: 4, address: 'No.288/2C, Mustaffa Street, Kandasamy Nagar Extn, Mettukuppam Rd, Vanagaram, Tamil Nadu', phone: '9941404046', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=S%20S%20design&query_place_id=ChIJtw-A8Y5hUjoRItl4UvC9afg', priority: 'HOT', budgetLakhs: 35, projectType: 'Interior Design & Custom Decor' },
  { name: 'RSK Interiors', rating: 5.0, reviews: 1, address: '72, Balaraman St, Chennai, Tamil Nadu', phone: '9940194731', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=RSK%20Interiors&query_place_id=ChIJcQ-tygRhUjoRfx-EfMHdl9I', priority: 'HOT', budgetLakhs: 36, projectType: 'Residential Interior Design' },
  { name: 'SS INTERIOR AND MODULAR', rating: 5.0, reviews: 1, address: 'Plot no 2, Thiru Vi Ka St, Chennai, Tamil Nadu', phone: '9962799022', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=SS%20INTERIOR%20AND%20MODULAR&query_place_id=ChIJP0dUYgBhUjoRB0V56R9r8e4', priority: 'HOT', budgetLakhs: 50, projectType: 'Modular Interior Solutions' },
  { name: 'Aadithya Agencies', rating: 5.0, reviews: 10, address: 'CSR towers, 5th Cross St, Chennai, Tamil Nadu', phone: '9840577538', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Aadithya%20Agencies&query_place_id=ChIJe5wqLgBhUjoRt92QAnvdL8M', priority: 'HOT', budgetLakhs: 45, projectType: 'Interior Decor & Styling' },
  { name: 'Home interior chennai', rating: 5.0, reviews: 2, address: '2/6, Kalaignar Street, Chennai, Tamil Nadu', phone: '9380937048', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Home%20interior%20chennai&query_place_id=ChIJWSI2ku9hUjoRSkKtPdCjnDA', priority: 'HOT', budgetLakhs: 48, projectType: 'Apartment Interior Design' },
  { name: 'SRIKO Associates', rating: 4.7, reviews: 15, address: 'No 110, Mugalivakkam Main Rd, Chennai, Tamil Nadu', phone: '9176009669', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=SRIKO%20Associates&query_place_id=ChIJDf_tb-ZgUjoRgy7HWKxvphM', priority: 'HOT', budgetLakhs: 54, projectType: 'Interior Architectural Design' },
  { name: 'Santhanu Interiors', rating: 4.8, reviews: 10, address: 'No.118, Poothapedu Main Rd, Chennai, Tamil Nadu', phone: '9444109972', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Santhanu%20Interiors&query_place_id=ChIJA6VuyNhgUjoRsPi0BYTGvN0', priority: 'WARM', budgetLakhs: 46, projectType: 'Turnkey Interior Design' },
  { name: 'Design i.O', rating: 5.0, reviews: 2, address: '14,Rajiv nagar, 1st St, Chennai, Tamil Nadu', phone: '7397296311', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Design%20i.O&query_place_id=ChIJuSZl-hBhUjoRmCg-GylpGk8', priority: 'HOT', budgetLakhs: 50, projectType: 'Modern Interior Design Studio' },
  { name: 'Ksj Interior', rating: 4.8, reviews: 10, address: '25, 7th Lane, 6th Cross St, Chennai, Tamil Nadu', phone: '9710588175', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Ksj%20Interior&query_place_id=ChIJm_D-z2lhUjoRP8mULyBpDb8', priority: 'WARM', budgetLakhs: 42, projectType: 'Custom Interior Design' },
  { name: 'R R CNC Wood Works', rating: 4.4, reviews: 75, address: '10, 1st St, Chennai, Tamil Nadu', phone: '9884444682', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=R%20R%20CNC%20Wood%20Works&query_place_id=ChIJaZQdLDZhUjoRpw5cgou99pQ', priority: 'HOT', budgetLakhs: 40, projectType: 'Custom Woodwork & CNC Interior Fitout' },
  { name: 'RAGAVENDRA INTERIOR', rating: 5.0, reviews: 6, address: '1, Balaraman St, Chennai, Tamil Nadu', phone: '8148048006', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=RAGAVENDRA%20INTERIOR&query_place_id=ChIJL9UXx7FhUjoR2m1rWSXNwCA', priority: 'HOT', budgetLakhs: 35, projectType: 'Plywood & Interior Supply' },
  { name: 'Pixel Space', rating: 3.0, reviews: 2, address: '330G, Poonamallee High Rd, Chennai, Tamil Nadu', phone: '9840785592', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Pixel%20Space&query_place_id=ChIJDVstqENhUjoRPPJIRkSReeU', priority: 'WARM', budgetLakhs: 38, projectType: 'Interior Space Design' },
  { name: 'SR Interior', rating: 5.0, reviews: 4, address: '30, Cauvery Nagar Main Rd, Thiruverkadu, Tamil Nadu', phone: '9941484565', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=SR%20Interior&query_place_id=ChIJy12YmCZhUjoRmVfQqIid0ag', priority: 'HOT', budgetLakhs: 40, projectType: 'Residential Interior Design' },
  { name: 'LEMON Transforming Spaces', rating: 4.7, reviews: 70, address: '33, Rajiv Gandhi St, Ayyappanthangal, Tamil Nadu', phone: '9499960791', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=LEMON%20Transforming%20Spaces&query_place_id=ChIJY3nZ03VhUjoRmbNrYOgAeTk', priority: 'HOT', budgetLakhs: 62, projectType: 'Premium Interior Transformation' },
  { name: 'Urban False Ceiling Works - Partition & Painting Contractors', rating: 5.0, reviews: 50, address: '29/2, Siva Ramiyar St, Adayalampattu, Chennai, Tamil Nadu', phone: '8778727722', category: 'Interior designer', url: 'https://www.google.com/maps/search/?api=1&query=Urban%20False%20Ceiling%20Works%20-%20Partition%20%26%20Painting%20Contractors&query_place_id=ChIJX0IebGJhUjoRSwK8tZQ09Y0', priority: 'HOT', budgetLakhs: 45, projectType: 'False Ceiling & Interior Partition' },
  { name: 'MJ ENTERPRISES', rating: 5.0, reviews: 52, address: 'No.66,4thcross st, chokkalingam nagar, Chennai, Tamil Nadu', phone: '8825504211', category: 'Construction company', url: 'https://www.google.com/maps/search/?api=1&query=MJ%20ENTERPRISES&query_place_id=ChIJB77fS01hUjoR5-37RE9tZpg', priority: 'HOT', budgetLakhs: 58, projectType: 'Turnkey Construction & Interior' },
];

async function main() {
  console.log('🚀 Running Full Master Clean & Seed for 69 Verified Leads...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const nirmal = await prisma.user.upsert({
    where: { email: 'nirmalkumar00727@gmail.com' },
    update: { name: 'Nirmal kumar N', role: 'ADMIN', initials: 'N' },
    create: { email: 'nirmalkumar00727@gmail.com', password: passwordHash, name: 'Nirmal kumar N', role: 'ADMIN', initials: 'N' },
  });

  const gayathri = await prisma.user.upsert({
    where: { email: 'gayathrideva2007@gmail.com' },
    update: { name: 'Gayathri', role: 'PRINCIPAL', initials: 'G' },
    create: { email: 'gayathrideva2007@gmail.com', password: passwordHash, name: 'Gayathri', role: 'PRINCIPAL', initials: 'G' },
  });

  await prisma.activity.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.fileAsset.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.lead.deleteMany({});

  try {
    await prisma.$executeRawUnsafe("SELECT setval(pg_get_serial_sequence('leads', 'serialNo'), 1, false);");
    console.log('Sequence reset to 1.');
  } catch (e) {}

  const all69Leads = [...initial33Leads, ...new36InteriorLeads];
  const owners = [gayathri, nirmal];

  for (let i = 0; i < all69Leads.length; i++) {
    const item = all69Leads[i];
    const serialNo = i + 1;
    const leadCode = `DND-${String(serialNo).padStart(3, '0')}`;
    const owner = owners[i % owners.length];

    const description = `📍 Google Maps Listing: ${item.name} (${item.category})\n` +
      `★ Rating: ⭐ ${item.rating} (${item.reviews} reviews)\n` +
      `🏢 Address: ${item.address}\n` +
      `🌐 Maps Link: ${item.url}\n` +
      `💡 Project: ${item.projectType}`;

    const tags = JSON.stringify([
      'Fresh Lead',
      item.category,
      item.address.split(',')[1]?.trim() || 'Chennai',
      item.rating >= 4.5 ? 'Top Rated' : 'Verified',
    ]);

    const winProb = item.priority === 'HOT' ? 75 : 50;

    await prisma.lead.create({
      data: {
        id: leadCode,
        serialNo,
        name: item.name,
        projectType: item.projectType,
        projectDescription: description,
        location: item.address,
        budgetLakhs: item.budgetLakhs,
        source: 'Google',
        priority: item.priority as any,
        phone: item.phone,
        email: `contact@${item.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)}.in`,
        ownerId: owner.id,
        winProbability: winProb,
        tags,
        stage: 'NEW',
        stageChangedAt: new Date(),
      },
    });

    console.log(`Created lead #${serialNo} (${leadCode}): ${item.name} - ${item.phone}`);
  }

  const count = await prisma.lead.count();
  console.log(`✅ Master Seed Complete! Exactly ${count} leads in database!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
