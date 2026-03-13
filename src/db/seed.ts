import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { applications, companies, contacts, emails } from './schema';

function d(month: number, day: number): string {
  return new Date(2026, month - 1, day).toISOString();
}

// ---------------------------------------------------------------------------
// Seed application data — uses temporary _companyName / _contact fields
// that are stripped before insert. Only schema-valid fields go to the DB.
// ---------------------------------------------------------------------------
interface SeedApp {
  role: string;
  tier: number;
  sector: string;
  status:
    | 'discovered'
    | 'applied'
    | 'screening'
    | 'interview_scheduled'
    | 'interviewing'
    | 'under_review'
    | 'offer'
    | 'accepted'
    | 'rejected'
    | 'withdrawn';
  appliedAt: string;
  source: string;
  notes?: string;
  // Temporary linking fields (not inserted into DB)
  _companyName: string;
  _contact?: {
    name: string;
    email: string;
    title: string;
    relationship: 'alumni' | 'recruiter' | 'referral' | 'cold' | 'warm_intro';
  };
}

const seedData: SeedApp[] = [
  // === T1: RE Finance (15 applications) ===
  { _companyName: 'JPMorgan Chase', role: 'Real Estate Finance Summer Analyst', tier: 1, sector: 'RE Finance', status: 'interviewing', appliedAt: d(1, 8), source: 'Company Website', _contact: { name: 'Sarah Chen', email: 'sarah.chen@jpmorgan.com', title: 'Campus Recruiter', relationship: 'recruiter' }, notes: 'HireVue interview scheduled. Completed video assessment. RE Finance division — CRE lending group.' },
  { _companyName: 'Goldman Sachs', role: 'Real Estate Finance Analyst', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(1, 12), source: 'Company Website', notes: 'Applied to Realty Management Division. Focus on equity and debt investments in RE.' },
  { _companyName: 'Blackstone', role: 'Real Estate Summer Analyst', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(1, 15), source: 'Company Website', notes: 'BREP fund — largest RE PE fund globally. Applied through main portal.' },
  { _companyName: 'Brookfield Asset Management', role: 'Real Estate Finance Intern', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(1, 18), source: 'LinkedIn', notes: 'Massive RE portfolio. Applied for NYC office.' },
  { _companyName: 'Starwood Capital Group', role: 'Summer Analyst — Real Estate', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(1, 20), source: 'Company Website', notes: 'Barry Sternlicht\'s firm. Opportunistic RE investments.' },
  { _companyName: 'Ares Management', role: 'Real Estate Credit Summer Analyst', tier: 1, sector: 'RE Finance', status: 'rejected', appliedAt: d(1, 10), source: 'Company Website', notes: 'RE debt strategies. Received rejection email 2/15.' },
  { _companyName: 'Apollo Global Management', role: 'Real Estate Summer Analyst', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(1, 22), source: 'Company Website', notes: 'Focus on commercial RE credit.' },
  { _companyName: 'KKR', role: 'Real Estate Summer Analyst', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(1, 25), source: 'Company Website', notes: 'RE equity and credit platform.' },
  { _companyName: 'Cerberus Capital', role: 'Real Estate Finance Intern', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(2, 1), source: 'LinkedIn', notes: 'Distressed RE debt focus.' },
  { _companyName: 'Fortress Investment Group', role: 'Real Estate Credit Analyst Intern', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(2, 3), source: 'Company Website' },
  { _companyName: 'Greystar', role: 'Investments Summer Analyst', tier: 1, sector: 'RE Finance', status: 'under_review', appliedAt: d(1, 14), source: 'Handshake', _contact: { name: 'Mike Torres', email: 'mtorres@greystar.com', title: 'HR Coordinator', relationship: 'recruiter' }, notes: 'Largest apartment operator in US. HR confirmed application under review.' },
  { _companyName: 'Nuveen Real Estate', role: 'Summer Analyst', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(2, 5), source: 'Company Website', notes: 'TIAA subsidiary. Global RE investment manager.' },
  { _companyName: 'PGIM Real Estate', role: 'Summer Analyst — Debt', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(2, 7), source: 'Company Website', notes: 'Prudential RE arm. $210B AUM.' },
  { _companyName: 'Hines', role: 'Summer Analyst — Acquisitions', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(2, 10), source: 'LinkedIn' },
  { _companyName: 'Related Companies', role: 'Finance Summer Intern', tier: 1, sector: 'RE Finance', status: 'applied', appliedAt: d(2, 12), source: 'Company Website', notes: 'Hudson Yards developer. NYC focused.' },

  // === T2: Real Estate (20 applications) ===
  { _companyName: 'CBRE Group', role: 'Valuation & Advisory Summer Intern', tier: 2, sector: 'Real Estate', status: 'screening', appliedAt: d(1, 10), source: 'Handshake', _contact: { name: 'Jennifer Walsh', email: 'jennifer.walsh@cbre.com', title: 'University Relations', relationship: 'recruiter' }, notes: 'Completed initial phone screen. Waiting for next round.' },
  { _companyName: 'JLL', role: 'Capital Markets Summer Analyst', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(1, 15), source: 'Company Website', notes: 'NYC Capital Markets team.' },
  { _companyName: 'Cushman & Wakefield', role: 'Summer Analyst — Investment Sales', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(1, 18), source: 'Handshake' },
  { _companyName: 'Newmark', role: 'Summer Intern — Capital Markets', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(1, 20), source: 'LinkedIn' },
  { _companyName: 'Marcus & Millichap', role: 'Summer Intern', tier: 2, sector: 'Real Estate', status: 'rejected', appliedAt: d(1, 5), source: 'Company Website', notes: 'Rejection received 2/1.' },
  { _companyName: 'Colliers International', role: 'Summer Intern — Brokerage', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(1, 22), source: 'Handshake' },
  { _companyName: 'Berkadia', role: 'Summer Analyst — Mortgage Banking', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(1, 25), source: 'Company Website', notes: 'Berkshire Hathaway / Jefferies JV. CRE lending.' },
  { _companyName: 'Walker & Dunlop', role: 'Summer Analyst', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(1, 28), source: 'LinkedIn' },
  { _companyName: 'Eastdil Secured', role: 'Summer Analyst', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 1), source: 'Company Website', notes: 'Elite RE investment bank. Applied NYC office.' },
  { _companyName: 'RXR Realty', role: 'Summer Intern — Development', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 3), source: 'LinkedIn', notes: 'NYC metro RE developer and investor.' },
  { _companyName: 'Tishman Speyer', role: 'Summer Analyst', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 5), source: 'Company Website', notes: 'Rockefeller Center, The Spiral. Major NYC owner.' },
  { _companyName: 'SL Green Realty', role: 'Finance Summer Intern', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 7), source: 'Handshake', notes: 'Largest office REIT in Manhattan.' },
  { _companyName: 'Vornado Realty Trust', role: 'Summer Intern', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 9), source: 'Company Website' },
  { _companyName: 'Boston Properties', role: 'Development Summer Intern', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 11), source: 'LinkedIn' },
  { _companyName: 'Mack-Cali Realty', role: 'Summer Intern', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 13), source: 'LinkedIn' },
  { _companyName: 'AvalonBay Communities', role: 'Development Summer Intern', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 15), source: 'Company Website', notes: 'Multifamily REIT.' },
  { _companyName: 'Equity Residential', role: 'Summer Intern — Investments', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 17), source: 'Handshake' },
  { _companyName: 'Prologis', role: 'Summer Intern — Capital Deployment', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 19), source: 'Company Website', notes: 'Global logistics RE. Largest industrial REIT.' },
  { _companyName: 'Simon Property Group', role: 'Finance Summer Intern', tier: 2, sector: 'Real Estate', status: 'applied', appliedAt: d(2, 21), source: 'LinkedIn' },
  { _companyName: 'Beam Living', role: 'Summer Intern', tier: 2, sector: 'Real Estate', status: 'screening', appliedAt: d(1, 8), source: 'Company Website', _contact: { name: 'Lisa Park', email: 'lpark@beamliving.com', title: 'Operations Manager', relationship: 'warm_intro' }, notes: 'Submitted cover letter. Had brief intro call.' },

  // === T3: Finance (25 applications) ===
  { _companyName: 'Morgan Stanley', role: 'Investment Banking Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(1, 10), source: 'Company Website', notes: 'Applied to RE & Gaming IB group.' },
  { _companyName: 'Citigroup', role: 'Banking Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(1, 12), source: 'Company Website' },
  { _companyName: 'Bank of America', role: 'Global Corporate & Investment Banking Summer Analyst', tier: 3, sector: 'Finance', status: 'rejected', appliedAt: d(1, 5), source: 'Company Website', notes: 'Rejection email received 2/10.' },
  { _companyName: 'Merrill Lynch', role: 'Wealth Management Summer Intern', tier: 3, sector: 'Finance', status: 'screening', appliedAt: d(1, 15), source: 'Referral', _contact: { name: 'David Arora', email: 'david.arora@ml.com', title: 'Managing Director', relationship: 'referral' }, notes: 'Dad\'s referral. Warm introduction made. Follow up needed.' },
  { _companyName: 'Wells Fargo', role: 'CRE Banking Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(1, 18), source: 'Company Website', notes: 'CRE division specifically.' },
  { _companyName: 'Deutsche Bank', role: 'Summer Analyst — CRE Finance', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(1, 20), source: 'Company Website' },
  { _companyName: 'Barclays', role: 'Investment Banking Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(1, 22), source: 'Company Website' },
  { _companyName: 'UBS', role: 'Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(1, 25), source: 'LinkedIn' },
  { _companyName: 'Jefferies', role: 'Investment Banking Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(1, 28), source: 'Company Website', notes: 'RE-focused IB coverage.' },
  { _companyName: 'Lazard', role: 'Financial Advisory Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 1), source: 'Company Website' },
  { _companyName: 'Evercore', role: 'Investment Banking Summer Analyst', tier: 3, sector: 'Finance', status: 'rejected', appliedAt: d(1, 3), source: 'Company Website', notes: 'Competitive. Rejection 2/5.' },
  { _companyName: 'Moelis & Company', role: 'Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 3), source: 'LinkedIn' },
  { _companyName: 'Rothschild & Co', role: 'Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 5), source: 'Company Website' },
  { _companyName: 'Macquarie Group', role: 'Summer Analyst — Infrastructure', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 7), source: 'Company Website', notes: 'Infra and RE focus. Australian bank.' },
  { _companyName: 'RBC Capital Markets', role: 'Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 9), source: 'Handshake' },
  { _companyName: 'BMO Capital Markets', role: 'Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 11), source: 'LinkedIn' },
  { _companyName: 'TD Securities', role: 'Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 13), source: 'Handshake' },
  { _companyName: 'PNC Financial', role: 'CRE Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 15), source: 'Company Website' },
  { _companyName: 'KeyBanc Capital Markets', role: 'Real Estate Capital Markets Intern', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 17), source: 'LinkedIn' },
  { _companyName: 'Capital One', role: 'Commercial Banking Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 19), source: 'Company Website' },
  { _companyName: 'Raymond James', role: 'Investment Banking Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 21), source: 'Company Website' },
  { _companyName: 'Stifel Financial', role: 'Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 23), source: 'LinkedIn' },
  { _companyName: 'Piper Sandler', role: 'Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 25), source: 'Company Website' },
  { _companyName: 'Cowen Inc', role: 'Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(2, 27), source: 'LinkedIn' },
  { _companyName: 'William Blair', role: 'Investment Banking Summer Analyst', tier: 3, sector: 'Finance', status: 'applied', appliedAt: d(3, 1), source: 'Company Website' },

  // === T4: Other (15 applications) ===
  { _companyName: 'Deloitte', role: 'Real Estate Consulting Summer Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(1, 15), source: 'Company Website', notes: 'RE advisory practice.' },
  { _companyName: 'PwC', role: 'Real Estate Advisory Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(1, 18), source: 'Handshake' },
  { _companyName: 'EY', role: 'Real Estate Advisory Summer Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(1, 20), source: 'Handshake' },
  { _companyName: 'KPMG', role: 'Real Estate Advisory Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(1, 22), source: 'Company Website' },
  { _companyName: 'Accenture', role: 'Strategy Consulting Summer Analyst', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(1, 25), source: 'LinkedIn' },
  { _companyName: 'McKinsey & Company', role: 'Summer Business Analyst', tier: 4, sector: 'Other', status: 'rejected', appliedAt: d(1, 3), source: 'Company Website', notes: 'Long shot. Rejected 2/1.' },
  { _companyName: 'Boston Consulting Group', role: 'Summer Associate', tier: 4, sector: 'Other', status: 'rejected', appliedAt: d(1, 5), source: 'Company Website', notes: 'Rejected 1/28.' },
  { _companyName: 'Bain & Company', role: 'Summer Associate Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(2, 1), source: 'Company Website' },
  { _companyName: 'Amazon', role: 'Finance & Real Estate Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(2, 5), source: 'Company Website', notes: 'Corporate RE team.' },
  { _companyName: 'Google', role: 'Real Estate & Workplace Services Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(2, 8), source: 'Company Website' },
  { _companyName: 'WeWork', role: 'Finance Summer Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(2, 10), source: 'LinkedIn' },
  { _companyName: 'Compass', role: 'Strategy & Operations Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(2, 14), source: 'LinkedIn', notes: 'RE tech company.' },
  { _companyName: 'Zillow Group', role: 'Business Operations Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(2, 18), source: 'Company Website' },
  { _companyName: 'CoStar Group', role: 'Research Summer Intern', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(2, 22), source: 'Handshake', notes: 'CRE data/analytics.' },
  { _companyName: 'Blackrock', role: 'Summer Analyst — Real Assets', tier: 4, sector: 'Other', status: 'applied', appliedAt: d(2, 26), source: 'Company Website', notes: 'Real assets team covers RE and infra.' },
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
  { gmailId: 'seed_001', threadId: 'thread_001', subject: 'JPMorgan Chase: HireVue Interview Invitation', fromAddress: 'sarah.chen@jpmorgan.com', toAddress: 'armaan@example.com', snippet: 'We are pleased to invite you to complete a HireVue video interview for the Real Estate Finance Summer Analyst position.', classification: 'interview_invite', urgency: 'high', suggestedAction: 'Complete HireVue within 5 days', isProcessed: true, receivedAt: d(2, 20) },
  { gmailId: 'seed_002', threadId: 'thread_002', subject: 'Your Application to Ares Management', fromAddress: 'campus-recruiting@aresmgmt.com', toAddress: 'armaan@example.com', snippet: 'Thank you for your interest in Ares Management. After careful review, we have decided to move forward with other candidates.', classification: 'rejection', urgency: 'low', suggestedAction: 'Archive and update application status', isProcessed: true, receivedAt: d(2, 15) },
  { gmailId: 'seed_003', threadId: 'thread_003', subject: 'CBRE: Phone Screen Follow-Up', fromAddress: 'jennifer.walsh@cbre.com', toAddress: 'armaan@example.com', snippet: 'It was great speaking with you today! As discussed, I will be passing your information to the hiring manager for the next round.', classification: 'follow_up_needed', urgency: 'medium', suggestedAction: 'Send thank-you note within 24 hours', isProcessed: true, receivedAt: d(2, 25) },
  { gmailId: 'seed_004', threadId: 'thread_004', subject: 'Merrill Lynch: Referral Introduction — David Arora', fromAddress: 'david.arora@ml.com', toAddress: 'armaan@example.com', snippet: 'I have connected you with our campus recruiting team. They should reach out shortly to schedule a first round.', classification: 'follow_up_needed', urgency: 'high', suggestedAction: 'Follow up with recruiting team if no response in 3 days', isProcessed: true, receivedAt: d(2, 18) },
  { gmailId: 'seed_005', threadId: 'thread_005', subject: 'Greystar: Application Status Update', fromAddress: 'noreply@greystar.com', toAddress: 'armaan@example.com', snippet: 'Your application for the Investments Summer Analyst position is currently under review by our hiring committee.', classification: 'info_request', urgency: 'low', suggestedAction: 'No action needed — under review', isProcessed: true, receivedAt: d(3, 1) },
  { gmailId: 'seed_006', threadId: 'thread_006', subject: 'Commercial Real Estate Weekly — Market Update', fromAddress: 'newsletter@creweekly.com', toAddress: 'armaan@example.com', snippet: 'This week: CRE lending rates stabilize, industrial demand surges in Q1 2026.', classification: 'newsletter', urgency: 'low', suggestedAction: null, isProcessed: true, receivedAt: d(3, 5) },
  { gmailId: 'seed_007', threadId: 'thread_007', subject: 'Beam Living: Next Steps for Summer Intern Position', fromAddress: 'lpark@beamliving.com', toAddress: 'armaan@example.com', snippet: 'Thank you for the intro call. We would like to schedule a case study interview with our VP of Operations.', classification: 'interview_invite', urgency: 'high', suggestedAction: 'Respond with availability for case study interview', isProcessed: true, receivedAt: d(3, 3) },
];

export async function seed() {
  const client = createClient({ url: 'file:./data/internship.db' });
  const seedDb = drizzle(client, { schema });

  // Clear existing data (order matters for foreign keys)
  await seedDb.delete(emails);
  await seedDb.delete(applications);
  await seedDb.delete(contacts);
  await seedDb.delete(companies);

  // 1. Insert companies
  await seedDb.insert(companies).values(companyData);
  console.log(`Seeded ${companyData.length} companies`);

  // 2. Build company name → id map
  const allCompanies = await seedDb.select({ id: companies.id, name: companies.name }).from(companies);
  const companyNameToId = new Map<string, string>();
  for (const c of allCompanies) {
    companyNameToId.set(c.name, c.id);
  }

  // 3. Insert contacts from seed data and build a map for linking
  const contactInserts: (typeof contacts.$inferInsert)[] = [];
  // Track which seed indices have contacts so we can link after insert
  const seedIndexToContactKey: Map<number, string> = new Map();

  for (let i = 0; i < seedData.length; i++) {
    const app = seedData[i];
    if (app._contact) {
      const companyId = companyNameToId.get(app._companyName);
      const contactRow: typeof contacts.$inferInsert = {
        companyId: companyId ?? null,
        name: app._contact.name,
        email: app._contact.email,
        title: app._contact.title,
        relationship: app._contact.relationship,
      };
      contactInserts.push(contactRow);
      // Key by email since it's unique per contact
      seedIndexToContactKey.set(i, app._contact.email);
    }
  }

  if (contactInserts.length > 0) {
    await seedDb.insert(contacts).values(contactInserts);
  }
  console.log(`Seeded ${contactInserts.length} contacts`);

  // 4. Build contact email → id map
  const allContacts = await seedDb.select({ id: contacts.id, email: contacts.email }).from(contacts);
  const contactEmailToId = new Map<string, string>();
  for (const c of allContacts) {
    if (c.email) {
      contactEmailToId.set(c.email, c.id);
    }
  }

  // 5. Build application insert rows with companyId and contactId linked
  const appInserts: (typeof applications.$inferInsert)[] = seedData.map((app, i) => {
    const companyId = companyNameToId.get(app._companyName) ?? null;
    const contactEmail = seedIndexToContactKey.get(i);
    const contactId = contactEmail ? (contactEmailToId.get(contactEmail) ?? null) : null;

    return {
      companyId,
      role: app.role,
      tier: app.tier,
      sector: app.sector,
      status: app.status,
      appliedAt: app.appliedAt,
      source: app.source,
      notes: app.notes,
      contactId,
    };
  });

  // Insert applications in batches of 20
  for (let i = 0; i < appInserts.length; i += 20) {
    const batch = appInserts.slice(i, i + 20);
    await seedDb.insert(applications).values(batch);
  }
  console.log(`Seeded ${appInserts.length} applications`);

  // 6. Insert emails
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
