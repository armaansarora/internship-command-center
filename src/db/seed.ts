import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { applications } from './schema';

function d(month: number, day: number): Date {
  return new Date(2026, month - 1, day);
}

const seedData: (typeof applications.$inferInsert)[] = [
  // === T1: RE Finance (15 applications) ===
  { company: 'JPMorgan Chase', role: 'Real Estate Finance Summer Analyst', tier: 'T1', sector: 'RE Finance', status: 'interview', appliedAt: d(1, 8), platform: 'Company Website', contactName: 'Sarah Chen', contactEmail: 'sarah.chen@jpmorgan.com', contactRole: 'Campus Recruiter', notes: 'HireVue interview scheduled. Completed video assessment. RE Finance division — CRE lending group.' },
  { company: 'Goldman Sachs', role: 'Real Estate Finance Analyst', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(1, 12), platform: 'Company Website', notes: 'Applied to Realty Management Division. Focus on equity and debt investments in RE.' },
  { company: 'Blackstone', role: 'Real Estate Summer Analyst', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(1, 15), platform: 'Company Website', notes: 'BREP fund — largest RE PE fund globally. Applied through main portal.' },
  { company: 'Brookfield Asset Management', role: 'Real Estate Finance Intern', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(1, 18), platform: 'LinkedIn', notes: 'Massive RE portfolio. Applied for NYC office.' },
  { company: 'Starwood Capital Group', role: 'Summer Analyst — Real Estate', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(1, 20), platform: 'Company Website', notes: 'Barry Sternlicht\'s firm. Opportunistic RE investments.' },
  { company: 'Ares Management', role: 'Real Estate Credit Summer Analyst', tier: 'T1', sector: 'RE Finance', status: 'rejected', appliedAt: d(1, 10), platform: 'Company Website', notes: 'RE debt strategies. Received rejection email 2/15.' },
  { company: 'Apollo Global Management', role: 'Real Estate Summer Analyst', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(1, 22), platform: 'Company Website', notes: 'Focus on commercial RE credit.' },
  { company: 'KKR', role: 'Real Estate Summer Analyst', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(1, 25), platform: 'Company Website', notes: 'RE equity and credit platform.' },
  { company: 'Cerberus Capital', role: 'Real Estate Finance Intern', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(2, 1), platform: 'LinkedIn', notes: 'Distressed RE debt focus.' },
  { company: 'Fortress Investment Group', role: 'Real Estate Credit Analyst Intern', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(2, 3), platform: 'Company Website' },
  { company: 'Greystar', role: 'Investments Summer Analyst', tier: 'T1', sector: 'RE Finance', status: 'under_review', appliedAt: d(1, 14), platform: 'Handshake', contactName: 'Mike Torres', contactEmail: 'mtorres@greystar.com', contactRole: 'HR Coordinator', notes: 'Largest apartment operator in US. HR confirmed application under review.' },
  { company: 'Nuveen Real Estate', role: 'Summer Analyst', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(2, 5), platform: 'Company Website', notes: 'TIAA subsidiary. Global RE investment manager.' },
  { company: 'PGIM Real Estate', role: 'Summer Analyst — Debt', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(2, 7), platform: 'Company Website', notes: 'Prudential RE arm. $210B AUM.' },
  { company: 'Hines', role: 'Summer Analyst — Acquisitions', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(2, 10), platform: 'LinkedIn' },
  { company: 'Related Companies', role: 'Finance Summer Intern', tier: 'T1', sector: 'RE Finance', status: 'applied', appliedAt: d(2, 12), platform: 'Company Website', notes: 'Hudson Yards developer. NYC focused.' },

  // === T2: Real Estate (20 applications) ===
  { company: 'CBRE Group', role: 'Valuation & Advisory Summer Intern', tier: 'T2', sector: 'Real Estate', status: 'in_progress', appliedAt: d(1, 10), platform: 'Handshake', contactName: 'Jennifer Walsh', contactEmail: 'jennifer.walsh@cbre.com', contactRole: 'University Relations', notes: 'Completed initial phone screen. Waiting for next round.' },
  { company: 'JLL', role: 'Capital Markets Summer Analyst', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(1, 15), platform: 'Company Website', notes: 'NYC Capital Markets team.' },
  { company: 'Cushman & Wakefield', role: 'Summer Analyst — Investment Sales', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(1, 18), platform: 'Handshake' },
  { company: 'Newmark', role: 'Summer Intern — Capital Markets', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(1, 20), platform: 'LinkedIn' },
  { company: 'Marcus & Millichap', role: 'Summer Intern', tier: 'T2', sector: 'Real Estate', status: 'rejected', appliedAt: d(1, 5), platform: 'Company Website', notes: 'Rejection received 2/1.' },
  { company: 'Colliers International', role: 'Summer Intern — Brokerage', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(1, 22), platform: 'Handshake' },
  { company: 'Berkadia', role: 'Summer Analyst — Mortgage Banking', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(1, 25), platform: 'Company Website', notes: 'Berkshire Hathaway / Jefferies JV. CRE lending.' },
  { company: 'Walker & Dunlop', role: 'Summer Analyst', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(1, 28), platform: 'LinkedIn' },
  { company: 'Eastdil Secured', role: 'Summer Analyst', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 1), platform: 'Company Website', notes: 'Elite RE investment bank. Applied NYC office.' },
  { company: 'RXR Realty', role: 'Summer Intern — Development', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 3), platform: 'LinkedIn', notes: 'NYC metro RE developer and investor.' },
  { company: 'Tishman Speyer', role: 'Summer Analyst', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 5), platform: 'Company Website', notes: 'Rockefeller Center, The Spiral. Major NYC owner.' },
  { company: 'SL Green Realty', role: 'Finance Summer Intern', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 7), platform: 'Handshake', notes: 'Largest office REIT in Manhattan.' },
  { company: 'Vornado Realty Trust', role: 'Summer Intern', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 9), platform: 'Company Website' },
  { company: 'Boston Properties', role: 'Development Summer Intern', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 11), platform: 'LinkedIn' },
  { company: 'Mack-Cali Realty', role: 'Summer Intern', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 13), platform: 'LinkedIn' },
  { company: 'AvalonBay Communities', role: 'Development Summer Intern', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 15), platform: 'Company Website', notes: 'Multifamily REIT.' },
  { company: 'Equity Residential', role: 'Summer Intern — Investments', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 17), platform: 'Handshake' },
  { company: 'Prologis', role: 'Summer Intern — Capital Deployment', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 19), platform: 'Company Website', notes: 'Global logistics RE. Largest industrial REIT.' },
  { company: 'Simon Property Group', role: 'Finance Summer Intern', tier: 'T2', sector: 'Real Estate', status: 'applied', appliedAt: d(2, 21), platform: 'LinkedIn' },
  { company: 'Beam Living', role: 'Summer Intern', tier: 'T2', sector: 'Real Estate', status: 'in_progress', appliedAt: d(1, 8), platform: 'Company Website', contactName: 'Lisa Park', contactEmail: 'lpark@beamliving.com', contactRole: 'Operations Manager', notes: 'Submitted cover letter. Had brief intro call.' },

  // === T3: Finance (25 applications) ===
  { company: 'Morgan Stanley', role: 'Investment Banking Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(1, 10), platform: 'Company Website', notes: 'Applied to RE & Gaming IB group.' },
  { company: 'Citigroup', role: 'Banking Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(1, 12), platform: 'Company Website' },
  { company: 'Bank of America', role: 'Global Corporate & Investment Banking Summer Analyst', tier: 'T3', sector: 'Finance', status: 'rejected', appliedAt: d(1, 5), platform: 'Company Website', notes: 'Rejection email received 2/10.' },
  { company: 'Merrill Lynch', role: 'Wealth Management Summer Intern', tier: 'T3', sector: 'Finance', status: 'in_progress', appliedAt: d(1, 15), platform: 'Referral', contactName: 'David Arora', contactEmail: 'david.arora@ml.com', contactRole: 'Managing Director', notes: 'Dad\'s referral. Warm introduction made. Follow up needed.' },
  { company: 'Wells Fargo', role: 'CRE Banking Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(1, 18), platform: 'Company Website', notes: 'CRE division specifically.' },
  { company: 'Deutsche Bank', role: 'Summer Analyst — CRE Finance', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(1, 20), platform: 'Company Website' },
  { company: 'Barclays', role: 'Investment Banking Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(1, 22), platform: 'Company Website' },
  { company: 'UBS', role: 'Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(1, 25), platform: 'LinkedIn' },
  { company: 'Jefferies', role: 'Investment Banking Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(1, 28), platform: 'Company Website', notes: 'RE-focused IB coverage.' },
  { company: 'Lazard', role: 'Financial Advisory Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 1), platform: 'Company Website' },
  { company: 'Evercore', role: 'Investment Banking Summer Analyst', tier: 'T3', sector: 'Finance', status: 'rejected', appliedAt: d(1, 3), platform: 'Company Website', notes: 'Competitive. Rejection 2/5.' },
  { company: 'Moelis & Company', role: 'Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 3), platform: 'LinkedIn' },
  { company: 'Rothschild & Co', role: 'Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 5), platform: 'Company Website' },
  { company: 'Macquarie Group', role: 'Summer Analyst — Infrastructure', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 7), platform: 'Company Website', notes: 'Infra and RE focus. Australian bank.' },
  { company: 'RBC Capital Markets', role: 'Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 9), platform: 'Handshake' },
  { company: 'BMO Capital Markets', role: 'Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 11), platform: 'LinkedIn' },
  { company: 'TD Securities', role: 'Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 13), platform: 'Handshake' },
  { company: 'PNC Financial', role: 'CRE Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 15), platform: 'Company Website' },
  { company: 'KeyBanc Capital Markets', role: 'Real Estate Capital Markets Intern', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 17), platform: 'LinkedIn' },
  { company: 'Capital One', role: 'Commercial Banking Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 19), platform: 'Company Website' },
  { company: 'Raymond James', role: 'Investment Banking Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 21), platform: 'Company Website' },
  { company: 'Stifel Financial', role: 'Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 23), platform: 'LinkedIn' },
  { company: 'Piper Sandler', role: 'Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 25), platform: 'Company Website' },
  { company: 'Cowen Inc', role: 'Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(2, 27), platform: 'LinkedIn' },
  { company: 'William Blair', role: 'Investment Banking Summer Analyst', tier: 'T3', sector: 'Finance', status: 'applied', appliedAt: d(3, 1), platform: 'Company Website' },

  // === T4: Other (15 applications) ===
  { company: 'Deloitte', role: 'Real Estate Consulting Summer Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(1, 15), platform: 'Company Website', notes: 'RE advisory practice.' },
  { company: 'PwC', role: 'Real Estate Advisory Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(1, 18), platform: 'Handshake' },
  { company: 'EY', role: 'Real Estate Advisory Summer Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(1, 20), platform: 'Handshake' },
  { company: 'KPMG', role: 'Real Estate Advisory Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(1, 22), platform: 'Company Website' },
  { company: 'Accenture', role: 'Strategy Consulting Summer Analyst', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(1, 25), platform: 'LinkedIn' },
  { company: 'McKinsey & Company', role: 'Summer Business Analyst', tier: 'T4', sector: 'Other', status: 'rejected', appliedAt: d(1, 3), platform: 'Company Website', notes: 'Long shot. Rejected 2/1.' },
  { company: 'Boston Consulting Group', role: 'Summer Associate', tier: 'T4', sector: 'Other', status: 'rejected', appliedAt: d(1, 5), platform: 'Company Website', notes: 'Rejected 1/28.' },
  { company: 'Bain & Company', role: 'Summer Associate Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(2, 1), platform: 'Company Website' },
  { company: 'Amazon', role: 'Finance & Real Estate Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(2, 5), platform: 'Company Website', notes: 'Corporate RE team.' },
  { company: 'Google', role: 'Real Estate & Workplace Services Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(2, 8), platform: 'Company Website' },
  { company: 'WeWork', role: 'Finance Summer Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(2, 10), platform: 'LinkedIn' },
  { company: 'Compass', role: 'Strategy & Operations Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(2, 14), platform: 'LinkedIn', notes: 'RE tech company.' },
  { company: 'Zillow Group', role: 'Business Operations Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(2, 18), platform: 'Company Website' },
  { company: 'CoStar Group', role: 'Research Summer Intern', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(2, 22), platform: 'Handshake', notes: 'CRE data/analytics.' },
  { company: 'Blackrock', role: 'Summer Analyst — Real Assets', tier: 'T4', sector: 'Other', status: 'applied', appliedAt: d(2, 26), platform: 'Company Website', notes: 'Real assets team covers RE and infra.' },
];

export async function seed() {
  const client = createClient({ url: 'file:./data/internship.db' });
  const seedDb = drizzle(client, { schema });

  // Clear existing data
  await seedDb.delete(applications);

  // Insert in batches of 20
  for (let i = 0; i < seedData.length; i += 20) {
    const batch = seedData.slice(i, i + 20);
    await seedDb.insert(applications).values(batch);
  }

  console.log(`Seeded ${seedData.length} applications`);
  client.close();
}

// Allow running directly: npx tsx src/db/seed.ts
const isDirectRun =
  process.argv[1]?.endsWith('seed.ts') ||
  process.argv[1]?.endsWith('seed.js');

if (isDirectRun) {
  seed()
    .then(() => {
      console.log('Seed complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
