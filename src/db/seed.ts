// @ts-nocheck
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { applications, companies, emails } from './schema';

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

const companyData: (typeof companies.$inferInsert)[] = [
  { name: 'JPMorgan Chase', domain: 'jpmorgan.com', industry: 'Investment Banking', sector: 'RE Finance', size: 'enterprise', headquarters: 'New York, NY', description: 'Global financial services firm with major CRE lending operations.', tier: 1, researchFreshness: 'fresh' },
  { name: 'Goldman Sachs', domain: 'goldmansachs.com', industry: 'Investment Banking', sector: 'RE Finance', size: 'enterprise', headquarters: 'New York, NY', description: 'Realty Management Division focuses on equity and debt RE investments.', tier: 1, researchFreshness: 'stale' },
  { name: 'Blackstone', domain: 'blackstone.com', industry: 'Private Equity', sector: 'RE Finance', size: 'enterprise', headquarters: 'New York, NY', description: 'Largest RE PE fund globally (BREP).', tier: 1, researchFreshness: 'fresh' },
  { name: 'CBRE Group', domain: 'cbre.com', industry: 'Commercial Real Estate', sector: 'Real Estate', size: 'enterprise', headquarters: 'Dallas, TX', description: 'World\'s largest commercial real estate services firm.', tier: 2, researchFreshness: 'stale' },
  { name: 'JLL', domain: 'jll.com', industry: 'Commercial Real Estate', sector: 'Real Estate', size: 'large', headquarters: 'Chicago, IL', description: 'Global real estate professional services firm.', tier: 2, researchFreshness: 'expired' },
  { name: 'Morgan Stanley', domain: 'morganstanley.com', industry: 'Investment Banking', sector: 'Finance', size: 'enterprise', headquarters: 'New York, NY', description: 'RE & Gaming IB group.', tier: 3, researchFreshness: 'fresh' },
  { name: 'Brookfield Asset Management', domain: 'brookfield.com', industry: 'Asset Management', sector: 'RE Finance', size: 'enterprise', headquarters: 'Toronto, ON', description: 'One of the world\'s largest alternative asset managers.', tier: 1, researchFreshness: 'stale' },
  { name: 'Hines', domain: 'hines.com', industry: 'Real Estate', sector: 'RE Finance', size: 'large', headquarters: 'Houston, TX', description: 'Global RE investment, development and property manager.', tier: 1, researchFreshness: 'expired' },
];

const emailData: (typeof emails.$inferInsert)[] = [
  { gmailId: 'seed_001', threadId: 'thread_001', subject: 'JPMorgan Chase: HireVue Interview Invitation', fromAddress: 'sarah.chen@jpmorgan.com', toAddress: 'armaan@example.com', snippet: 'We are pleased to invite you to complete a HireVue video interview for the Real Estate Finance Summer Analyst position.', classification: 'interview_invite', urgency: 'high', suggestedAction: 'Complete HireVue within 5 days', isProcessed: true, receivedAt: d(2, 20).toISOString() },
  { gmailId: 'seed_002', threadId: 'thread_002', subject: 'Your Application to Ares Management', fromAddress: 'campus-recruiting@aresmgmt.com', toAddress: 'armaan@example.com', snippet: 'Thank you for your interest in Ares Management. After careful review, we have decided to move forward with other candidates.', classification: 'rejection', urgency: 'low', suggestedAction: 'Archive and update application status', isProcessed: true, receivedAt: d(2, 15).toISOString() },
  { gmailId: 'seed_003', threadId: 'thread_003', subject: 'CBRE: Phone Screen Follow-Up', fromAddress: 'jennifer.walsh@cbre.com', toAddress: 'armaan@example.com', snippet: 'It was great speaking with you today! As discussed, I will be passing your information to the hiring manager for the next round.', classification: 'follow_up_needed', urgency: 'medium', suggestedAction: 'Send thank-you note within 24 hours', isProcessed: true, receivedAt: d(2, 25).toISOString() },
  { gmailId: 'seed_004', threadId: 'thread_004', subject: 'Merrill Lynch: Referral Introduction — David Arora', fromAddress: 'david.arora@ml.com', toAddress: 'armaan@example.com', snippet: 'I have connected you with our campus recruiting team. They should reach out shortly to schedule a first round.', classification: 'follow_up_needed', urgency: 'high', suggestedAction: 'Follow up with recruiting team if no response in 3 days', isProcessed: true, receivedAt: d(2, 18).toISOString() },
  { gmailId: 'seed_005', threadId: 'thread_005', subject: 'Greystar: Application Status Update', fromAddress: 'noreply@greystar.com', toAddress: 'armaan@example.com', snippet: 'Your application for the Investments Summer Analyst position is currently under review by our hiring committee.', classification: 'info_request', urgency: 'low', suggestedAction: 'No action needed — under review', isProcessed: true, receivedAt: d(3, 1).toISOString() },
  { gmailId: 'seed_006', threadId: 'thread_006', subject: 'Commercial Real Estate Weekly — Market Update', fromAddress: 'newsletter@creweekly.com', toAddress: 'armaan@example.com', snippet: 'This week: CRE lending rates stabilize, industrial demand surges in Q1 2026.', classification: 'newsletter', urgency: 'low', suggestedAction: null, isProcessed: true, receivedAt: d(3, 5).toISOString() },
  { gmailId: 'seed_007', threadId: 'thread_007', subject: 'Beam Living: Next Steps for Summer Intern Position', fromAddress: 'lpark@beamliving.com', toAddress: 'armaan@example.com', snippet: 'Thank you for the intro call. We would like to schedule a case study interview with our VP of Operations.', classification: 'interview_invite', urgency: 'high', suggestedAction: 'Respond with availability for case study interview', isProcessed: true, receivedAt: d(3, 3).toISOString() },
];

export async function seed() {
  const client = createClient({ url: 'file:./data/internship.db' });
  const seedDb = drizzle(client, { schema });

  // Clear existing data (emails & companies first due to foreign keys)
  await seedDb.delete(emails);
  await seedDb.delete(applications);
  await seedDb.delete(companies);

  // Insert companies
  await seedDb.insert(companies).values(companyData);
  console.log(`Seeded ${companyData.length} companies`);

  // Insert applications in batches of 20
  for (let i = 0; i < seedData.length; i += 20) {
    const batch = seedData.slice(i, i + 20);
    await seedDb.insert(applications).values(batch);
  }
  console.log(`Seeded ${seedData.length} applications`);

  // Insert emails
  await seedDb.insert(emails).values(emailData);
  console.log(`Seeded ${emailData.length} emails`);

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
