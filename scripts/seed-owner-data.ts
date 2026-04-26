/**
 * Seed realistic playable data into the owner's account.
 *
 * Wipes user-scoped rows in the relevant tables, then inserts a believable
 * internship-search pipeline so every floor of the building has something to
 * show. Run via:
 *
 *   npx tsx scripts/seed-owner-data.ts
 *
 * Idempotent — re-running clears prior seed and re-creates fresh data.
 */
import { createClient } from "@supabase/supabase-js";

const OWNER_USER_ID = "9e6df479-8aaa-4b34-8cce-e9998f9da3b6";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run:  vercel env pull .env.local  (then re-run this script)");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Helpers ──────────────────────────────────────────────────────────
const now = new Date();
const daysAgo = (d: number) => {
  const t = new Date(now);
  t.setUTCDate(t.getUTCDate() - d);
  return t.toISOString();
};
const daysFromNow = (d: number) => {
  const t = new Date(now);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString();
};
const dateOnly = (d: number) => daysAgo(d).slice(0, 10);

async function wipe() {
  const tables = [
    "rejection_reflections",
    "offers",
    "outreach_queue",
    "calendar_events",
    "interviews",
    "documents",
    "notifications",
    "applications",
    "contacts",
    "companies",
    "daily_snapshots",
    "progression_milestones",
    "agent_logs",
  ];
  for (const t of tables) {
    const { error } = await sb.from(t).delete().eq("user_id", OWNER_USER_ID);
    if (error) console.warn(`  warn: wipe ${t} → ${error.message}`);
  }
}

async function seedCompanies() {
  const rows = [
    {
      name: "Goldman Sachs",
      domain: "goldmansachs.com",
      industry: "Investment Banking",
      sector: "Financial Services",
      size: "10000+",
      headquarters: "New York, NY",
      description:
        "Leading global investment banking, securities, and investment management firm.",
      culture_summary:
        "Intense, hierarchical, high-leverage. Famous for face-time culture but increasingly hybrid. Top-tier mentorship if you can reach a senior MD.",
      recent_news:
        "Q3 IB revenue beat estimates by 14%. New hybrid policy leaked but unconfirmed.",
      tier: 1,
      research_freshness: daysAgo(2),
      key_people: [
        { name: "David Solomon", title: "CEO" },
        { name: "Denis Coleman", title: "CFO" },
      ],
      internship_intel:
        "Summer Analyst program is the canonical pipeline. ~3% acceptance. Interviews superday-style with 4-6 back-to-back 30-min slots.",
    },
    {
      name: "JPMorgan Chase",
      domain: "jpmorganchase.com",
      industry: "Investment Banking",
      sector: "Financial Services",
      size: "10000+",
      headquarters: "New York, NY",
      description:
        "Largest US bank by assets. Strong franchise across IB, markets, asset management.",
      culture_summary:
        "More structured than Goldman; better hours rep in M&A. Diversity programs are real, not theater.",
      recent_news:
        "Jamie Dimon shareholder letter emphasized AI productivity push and continued branch consolidation.",
      tier: 1,
      research_freshness: daysAgo(5),
      key_people: [
        { name: "Jamie Dimon", title: "CEO" },
        { name: "Jennifer Piepszak", title: "Co-CEO Commercial & Investment Bank" },
      ],
    },
    {
      name: "Morgan Stanley",
      domain: "morganstanley.com",
      industry: "Investment Banking",
      sector: "Financial Services",
      size: "10000+",
      headquarters: "New York, NY",
      description:
        "Top-tier investment bank with strong wealth management franchise.",
      culture_summary:
        "M&A advisory reputation is elite. Wealth management arm is the cash cow.",
      recent_news:
        "Wealth management AUM hit $5T. Tech IB league tables: #2 globally for tech M&A.",
      tier: 1,
      research_freshness: daysAgo(7),
    },
    {
      name: "Blackstone",
      domain: "blackstone.com",
      industry: "Private Equity",
      sector: "Alternatives",
      size: "1000-10000",
      headquarters: "New York, NY",
      description:
        "World's largest alternative asset manager. PE, real estate, credit, and hedge fund solutions.",
      culture_summary:
        "Selective, intense, deal-focused. The mecca for buyside ambitions.",
      recent_news:
        "Stephen Schwarzman op-ed in WSJ on the firm's $1.1T AUM milestone.",
      tier: 1,
      research_freshness: daysAgo(3),
      key_people: [
        { name: "Stephen Schwarzman", title: "CEO" },
        { name: "Jon Gray", title: "President & COO" },
      ],
    },
    {
      name: "Apollo Global Management",
      domain: "apollo.com",
      industry: "Private Equity",
      sector: "Alternatives",
      size: "1000-10000",
      headquarters: "New York, NY",
      description: "Global alternative investment manager with a credit-heavy book.",
      culture_summary:
        "Aggressive, contrarian. Marc Rowan's bets on private credit are paying off.",
      recent_news: "Apollo announced retail private credit fund partnership with Schwab.",
      tier: 2,
      research_freshness: daysAgo(10),
    },
    {
      name: "Jane Street",
      domain: "janestreet.com",
      industry: "Quantitative Trading",
      sector: "Hedge Funds",
      size: "1000-10000",
      headquarters: "New York, NY",
      description:
        "Quantitative trading firm with a notoriously selective hiring process and OCaml stack.",
      culture_summary:
        "Mensa-tier puzzle culture. No hierarchy. Best comp on the street for new grads.",
      recent_news:
        "Reportedly added 200+ trader-developers in 2025 push into systematic equities.",
      tier: 1,
      research_freshness: daysAgo(1),
    },
    {
      name: "Citadel",
      domain: "citadel.com",
      industry: "Hedge Fund",
      sector: "Hedge Funds",
      size: "1000-10000",
      headquarters: "Miami, FL",
      description: "Multi-strategy hedge fund founded by Ken Griffin.",
      culture_summary:
        "Pod-shop intensity. Cut-throat performance culture. Comp is famous.",
      tier: 1,
      research_freshness: daysAgo(8),
    },
    {
      name: "Stripe",
      domain: "stripe.com",
      industry: "Fintech",
      sector: "Technology",
      size: "1000-10000",
      headquarters: "San Francisco, CA",
      description:
        "Payments infrastructure company. The Collison brothers' shop. Engineering-led.",
      culture_summary:
        "Rigorous, written-first. Famous for the 'Increment' magazine and high engineering bar.",
      recent_news:
        "Stripe hit $1T in payment volume in 2025. Reportedly preparing for direct listing in 2026.",
      tier: 2,
      research_freshness: daysAgo(4),
    },
    {
      name: "Anthropic",
      domain: "anthropic.com",
      industry: "AI Research",
      sector: "Technology",
      size: "100-1000",
      headquarters: "San Francisco, CA",
      description:
        "AI safety company. Builders of Claude. Founded by ex-OpenAI researchers.",
      culture_summary:
        "Mission-driven, high-trust, Constitutional AI. Hiring bar absurdly high.",
      recent_news:
        "Claude Opus 4.7 (1M context) launched. Funding round at ~$200B valuation rumored.",
      tier: 1,
      research_freshness: daysAgo(2),
    },
    {
      name: "McKinsey & Company",
      domain: "mckinsey.com",
      industry: "Management Consulting",
      sector: "Consulting",
      size: "10000+",
      headquarters: "New York, NY",
      description: "The original strategy consulting firm. MBB.",
      culture_summary:
        "Up-or-out, polished, broad. Strong alumni network into PE/corporate.",
      tier: 2,
      research_freshness: daysAgo(15),
    },
    {
      name: "Bridgewater Associates",
      domain: "bridgewater.com",
      industry: "Hedge Fund",
      sector: "Hedge Funds",
      size: "1000-10000",
      headquarters: "Westport, CT",
      description: "Macro hedge fund founded by Ray Dalio.",
      culture_summary:
        "Radical transparency culture. Famous Principles. Polarizing internally.",
      tier: 2,
      research_freshness: daysAgo(20),
    },
    {
      name: "Two Sigma",
      domain: "twosigma.com",
      industry: "Quantitative Trading",
      sector: "Hedge Funds",
      size: "1000-10000",
      headquarters: "New York, NY",
      description: "Systematic, ML-driven hedge fund.",
      culture_summary: "Engineering-led. Less puzzle-y than Jane Street, more enterprise.",
      tier: 2,
      research_freshness: daysAgo(11),
    },
  ].map((c) => ({ ...c, user_id: OWNER_USER_ID }));

  const { data, error } = await sb.from("companies").insert(rows).select("id, name");
  if (error) throw error;
  return new Map(data!.map((r) => [r.name as string, r.id as string]));
}

async function seedContacts(companyIds: Map<string, string>) {
  const rows = [
    {
      name: "Sarah Chen",
      email: "sarah.chen@goldmansachs.com",
      title: "VP, TMT Investment Banking",
      company: "Goldman Sachs",
      relationship: "alumni-network",
      warmth: 78,
      last_contact_at: daysAgo(4),
      notes: "Yale '15. Replied warmly to my first cold email; happy to do a 15-min coffee chat.",
      linkedin_url: "https://linkedin.com/in/sarahchen-gs",
    },
    {
      name: "Michael Park",
      email: "michael.park@jpmorgan.com",
      title: "Associate, Equity Capital Markets",
      company: "JPMorgan Chase",
      relationship: "warm-intro",
      warmth: 85,
      last_contact_at: daysAgo(2),
      notes: "Introduced by my finance professor. Did a 30-min call last week — pushed my resume to recruiting.",
      linkedin_url: "https://linkedin.com/in/michaelpark-jpm",
      introduced_by: "Prof. Levitt",
    },
    {
      name: "Priya Raman",
      email: "priya.raman@morganstanley.com",
      title: "Vice President, Tech M&A",
      company: "Morgan Stanley",
      relationship: "informational",
      warmth: 62,
      last_contact_at: daysAgo(8),
      notes: "Cold-emailed via LinkedIn. Took the call — very candid about MS culture vs GS.",
    },
    {
      name: "Thomas O'Brien",
      email: "thomas.obrien@blackstone.com",
      title: "Senior Associate, Private Equity",
      company: "Blackstone",
      relationship: "alumni-network",
      warmth: 71,
      last_contact_at: daysAgo(6),
      notes: "Same college club. Said BX recruiting starts 9 months earlier than people think.",
    },
    {
      name: "Daniela Ortiz",
      email: "daniela.ortiz@apollo.com",
      title: "Recruiting Coordinator",
      company: "Apollo Global Management",
      relationship: "recruiter",
      warmth: 50,
      last_contact_at: daysAgo(12),
      notes: "Standard recruiter contact. Followed up about app status — said 'reviewing.'",
    },
    {
      name: "Jordan Lee",
      email: "jordan.lee@janestreet.com",
      title: "Trader",
      company: "Jane Street",
      relationship: "informational",
      warmth: 55,
      last_contact_at: daysAgo(15),
      notes: "Met at the Jane Street puzzle event. Will mock-interview if I make first round.",
    },
    {
      name: "Alexandra Kim",
      email: "akim@stripe.com",
      title: "University Recruiter",
      company: "Stripe",
      relationship: "recruiter",
      warmth: 60,
      last_contact_at: daysAgo(7),
      notes: "Pushed me toward the New Grad SWE pipeline rather than the internship one.",
    },
    {
      name: "Ben Mitchell",
      email: "ben.mitchell@anthropic.com",
      title: "Recruiting, Research Engineering",
      company: "Anthropic",
      relationship: "recruiter",
      warmth: 58,
      last_contact_at: daysAgo(9),
      notes: "Anthropic doesn't run a typical internship cycle — said keep an eye on careers page.",
    },
    {
      name: "Marcus Webb",
      email: "marcus.webb@mckinsey.com",
      title: "Engagement Manager",
      company: "McKinsey & Company",
      relationship: "alumni-network",
      warmth: 73,
      last_contact_at: daysAgo(3),
      notes: "Same college, two years older. Real candid about MBB hours — 'don't romanticize it.'",
    },
    {
      name: "Lin Wei",
      email: "lin.wei@twosigma.com",
      title: "Quantitative Researcher",
      company: "Two Sigma",
      relationship: "informational",
      warmth: 42,
      last_contact_at: daysAgo(22),
      notes: "Brief LinkedIn exchange. Hasn't replied in 3 weeks — going cool.",
    },
    {
      name: "Rachel Green",
      email: "rachel.green@bridgewater.com",
      title: "Investment Associate",
      company: "Bridgewater Associates",
      relationship: "alumni-network",
      warmth: 30,
      last_contact_at: daysAgo(35),
      notes: "Initial chat went well but we drifted apart — should re-engage.",
    },
    {
      name: "David Patel",
      email: "david.patel@citadel.com",
      title: "Recruiting, Equities",
      company: "Citadel",
      relationship: "recruiter",
      warmth: 50,
      last_contact_at: null,
      notes: "Sent a cold message via LinkedIn last week — no reply yet.",
    },
  ];

  const inserts = rows.map((r) => ({
    user_id: OWNER_USER_ID,
    name: r.name,
    email: r.email,
    title: r.title,
    company_id: companyIds.get(r.company) ?? null,
    relationship: r.relationship,
    warmth: r.warmth,
    last_contact_at: r.last_contact_at,
    notes: r.notes,
    linkedin_url: r.linkedin_url ?? null,
    introduced_by: r.introduced_by ?? null,
    source: "manual",
  }));

  const { data, error } = await sb.from("contacts").insert(inserts).select("id, name");
  if (error) throw error;
  return new Map(data!.map((r) => [r.name as string, r.id as string]));
}

async function seedApplications(
  companyIds: Map<string, string>,
  contactIds: Map<string, string>,
) {
  const rows = [
    {
      company: "Goldman Sachs",
      role: "Summer 2026 Investment Banking Analyst",
      status: "interview",
      sector: "Financial Services",
      tier: 1,
      applied_at: daysAgo(45),
      last_activity_at: daysAgo(4),
      contact: "Sarah Chen",
      location: "New York, NY",
      salary: "$110k base + bonus",
      notes: "Through superday next week. Need to lock the brain teasers.",
      url: "https://goldmansachs.com/careers/students/",
    },
    {
      company: "JPMorgan Chase",
      role: "Summer 2026 IB Analyst — TMT",
      status: "interview",
      sector: "Financial Services",
      tier: 1,
      applied_at: daysAgo(40),
      last_activity_at: daysAgo(2),
      contact: "Michael Park",
      location: "New York, NY",
      salary: "$110k base + bonus",
      notes: "First round done. HireVue pending.",
      url: "https://jpmorganchase.com/careers/programs/students",
    },
    {
      company: "Morgan Stanley",
      role: "Summer 2026 Tech M&A Analyst",
      status: "applied",
      sector: "Financial Services",
      tier: 1,
      applied_at: daysAgo(30),
      last_activity_at: daysAgo(8),
      contact: "Priya Raman",
      location: "New York, NY",
      notes: "Submitted application + reached out to Priya. Awaiting first-round signal.",
    },
    {
      company: "Blackstone",
      role: "Private Equity Summer Analyst",
      status: "screening",
      sector: "Alternatives",
      tier: 1,
      applied_at: daysAgo(35),
      last_activity_at: daysAgo(6),
      contact: "Thomas O'Brien",
      location: "New York, NY",
      notes: "Phone screen scheduled with HR for next Tuesday.",
    },
    {
      company: "Apollo Global Management",
      role: "PE Summer Analyst",
      status: "applied",
      sector: "Alternatives",
      tier: 2,
      applied_at: daysAgo(28),
      last_activity_at: daysAgo(12),
      contact: "Daniela Ortiz",
      location: "New York, NY",
      notes: "Applied, recruiter said 'reviewing'. No movement in 2 weeks.",
    },
    {
      company: "Jane Street",
      role: "Trader Internship — Summer 2026",
      status: "interview",
      sector: "Hedge Funds",
      tier: 1,
      applied_at: daysAgo(50),
      last_activity_at: daysAgo(3),
      contact: "Jordan Lee",
      location: "New York, NY",
      salary: "Compensation: market-leading",
      notes: "Final round next week — market-making game + estimation problems.",
    },
    {
      company: "Citadel",
      role: "Equities Trading Intern",
      status: "rejected",
      sector: "Hedge Funds",
      tier: 1,
      applied_at: daysAgo(55),
      last_activity_at: daysAgo(20),
      contact: "David Patel",
      location: "New York, NY",
      notes: "Rejected after first round. Fit-based — they wanted more equities exposure than I had.",
    },
    {
      company: "Stripe",
      role: "Software Engineering Intern — Payments",
      status: "offer",
      sector: "Technology",
      tier: 2,
      applied_at: daysAgo(60),
      last_activity_at: daysAgo(1),
      contact: "Alexandra Kim",
      location: "San Francisco, CA",
      salary: "$10,500/month",
      notes: "OFFER RECEIVED — 7-day decision window. Need to weigh against pending GS / JPM.",
    },
    {
      company: "Anthropic",
      role: "Research Engineering Intern",
      status: "applied",
      sector: "Technology",
      tier: 1,
      applied_at: daysAgo(20),
      last_activity_at: daysAgo(9),
      contact: "Ben Mitchell",
      location: "San Francisco, CA",
      notes: "Long shot — they don't run a typical cycle. Watching careers page weekly.",
    },
    {
      company: "McKinsey & Company",
      role: "Summer Business Analyst",
      status: "screening",
      sector: "Consulting",
      tier: 2,
      applied_at: daysAgo(25),
      last_activity_at: daysAgo(3),
      contact: "Marcus Webb",
      location: "New York, NY",
      notes: "Case interview prep deck — first round Tuesday.",
    },
    {
      company: "Two Sigma",
      role: "Quant Research Intern",
      status: "rejected",
      sector: "Hedge Funds",
      tier: 2,
      applied_at: daysAgo(40),
      last_activity_at: daysAgo(15),
      contact: "Lin Wei",
      location: "New York, NY",
      notes: "Auto-rejected at resume screen. Will autopsy this one.",
    },
    {
      company: "Bridgewater Associates",
      role: "Investment Associate Intern",
      status: "rejected",
      sector: "Hedge Funds",
      tier: 2,
      applied_at: daysAgo(48),
      last_activity_at: daysAgo(35),
      contact: "Rachel Green",
      location: "Westport, CT",
      notes: "Rejected at HR screen. Probably the radical-transparency culture-fit panel.",
    },
    {
      company: "Goldman Sachs",
      role: "Markets Sales & Trading Summer Analyst",
      status: "applied",
      sector: "Financial Services",
      tier: 1,
      applied_at: daysAgo(22),
      last_activity_at: daysAgo(22),
      location: "New York, NY",
      notes: "Second GS app — diversified bet across IB and S&T.",
    },
    {
      company: "JPMorgan Chase",
      role: "Markets Quantitative Research Intern",
      status: "discovered",
      sector: "Financial Services",
      tier: 2,
      applied_at: null,
      location: "New York, NY",
      notes: "Backup play — haven't applied yet. Need to align resume.",
    },
  ];

  const inserts = rows.map((r) => ({
    user_id: OWNER_USER_ID,
    company_id: companyIds.get(r.company) ?? null,
    company_name: r.company,
    role: r.role,
    position: r.role,
    status: r.status,
    sector: r.sector,
    tier: r.tier,
    applied_at: r.applied_at,
    last_activity_at: r.last_activity_at,
    location: r.location,
    salary: r.salary ?? null,
    notes: r.notes,
    url: r.url ?? null,
    contact_id: r.contact ? contactIds.get(r.contact) ?? null : null,
    source: "manual",
  }));

  const { data, error } = await sb.from("applications").insert(inserts).select("id, company_name, role, status");
  if (error) throw error;
  return data ?? [];
}

async function seedDocuments(applications: { id: string; company_name: string | null; role: string }[]) {
  const drafts = [
    {
      app: applications.find((a) => a.company_name === "Goldman Sachs" && a.role.includes("IB")),
      title: "Cover Letter — Goldman IB",
      type: "cover_letter",
      content:
        "Dear Hiring Committee,\n\nI'm writing to apply for the Summer 2026 Investment Banking Analyst program at Goldman Sachs. Your TMT franchise's role in advising on the recent ServiceNow acquisition demonstrated exactly the kind of strategic complexity I want to learn from.\n\nAt [University], I've built a foundation in financial modeling through my work at the student investment fund, where we ran a long-short tech portfolio that returned 24% in 2025. I'm particularly drawn to the rigor of the GS Summer Analyst program and the depth of the M&A franchise.\n\nThank you for your consideration.\n\nBest,\nArmaan Arora",
      generated_by: "manual",
      is_active: true,
    },
    {
      app: applications.find((a) => a.company_name === "JPMorgan Chase" && a.role.includes("IB")),
      title: "Cover Letter — JPM TMT",
      type: "cover_letter",
      content:
        "Dear JPMorgan TMT Recruiting Team,\n\nThe scale and global reach of JPM's TMT franchise is exactly the kind of platform I want to learn from. I spoke last week with Michael Park (ECM Associate), who emphasized the breadth of deal exposure first-year analysts get — that's the differentiator that drew me to apply.\n\n[...]\n\nThank you for the consideration,\nArmaan",
      generated_by: "ai",
      is_active: true,
    },
    {
      app: applications.find((a) => a.company_name === "Jane Street"),
      title: "Application Note — Jane Street Trader",
      type: "cover_letter",
      content:
        "Dear Jane Street Recruiting,\n\nI'm applying for the Summer 2026 Trader Internship. The market-making puzzles at the campus event were the most engaging interview-adjacent experience I've had — and what struck me was how the firm doesn't pretend to know the answer; you build models, test them, kill them.\n\n[...]\n\nBest,\nArmaan",
      generated_by: "ai",
      is_active: true,
    },
    {
      app: applications.find((a) => a.company_name === "McKinsey & Company"),
      title: "Cover Letter — McKinsey BA",
      type: "cover_letter",
      content:
        "Dear McKinsey New York Recruiting,\n\nThree summers ago, I worked with my school's strategy club on a healthcare reimbursement model for a regional hospital — it taught me the reality of frameworks landing on messy data. That's what I want to do every day. McKinsey's work in Healthcare Systems and Services is where I want to be.\n\n[...]\n\nSincerely,\nArmaan Arora",
      generated_by: "manual",
      is_active: true,
    },
  ];

  const inserts = drafts
    .filter((d) => !!d.app)
    .map((d) => ({
      user_id: OWNER_USER_ID,
      application_id: d.app!.id,
      type: d.type,
      title: d.title,
      content: d.content,
      version: 1,
      is_active: d.is_active,
      generated_by: d.generated_by,
    }));
  const { error } = await sb.from("documents").insert(inserts);
  if (error) throw error;
}

async function seedInterviews(
  applications: { id: string; company_name: string | null; role: string }[],
  companyIds: Map<string, string>,
) {
  const rows = [
    {
      app: applications.find((a) => a.company_name === "Goldman Sachs" && a.role.includes("IB")),
      round: "Superday",
      format: "in-person",
      scheduled_at: daysFromNow(7),
      duration_minutes: 240,
      location: "200 West Street, New York, NY",
      interviewer_name: "Multiple — superday format",
      status: "scheduled",
      notes: "4 back-to-back 30-min slots: 2 technicals (DCF / LBO), 2 fit. Needed: deep on TMT recent deals.",
    },
    {
      app: applications.find((a) => a.company_name === "JPMorgan Chase" && a.role.includes("IB")),
      round: "First Round",
      format: "video",
      scheduled_at: daysFromNow(3),
      duration_minutes: 45,
      location: "Zoom",
      interviewer_name: "Andrew Zhang",
      interviewer_title: "Vice President, TMT",
      status: "scheduled",
      notes: "Behavioral + 1-2 technicals. Andrew is known for the 'walk me through your resume backwards' opener.",
    },
    {
      app: applications.find((a) => a.company_name === "Jane Street"),
      round: "Final",
      format: "in-person",
      scheduled_at: daysFromNow(10),
      duration_minutes: 180,
      location: "250 Vesey Street, New York, NY",
      interviewer_name: "Trading Floor Round Robin",
      status: "scheduled",
      notes: "Market-making game (fast bid-ask), estimation problems, pair coding in Python or OCaml.",
    },
    {
      app: applications.find((a) => a.company_name === "Blackstone"),
      round: "Phone Screen",
      format: "phone",
      scheduled_at: daysFromNow(2),
      duration_minutes: 30,
      location: "Phone",
      interviewer_name: "BX HR Recruiting",
      status: "scheduled",
      notes: "Standard fit screen; resume walkthrough.",
    },
    {
      app: applications.find((a) => a.company_name === "McKinsey & Company"),
      round: "First Round Case",
      format: "video",
      scheduled_at: daysFromNow(5),
      duration_minutes: 60,
      location: "Zoom",
      interviewer_name: "Marcus Webb",
      interviewer_title: "Engagement Manager",
      status: "scheduled",
      notes: "Marcus is my warm contact — he'll likely be one of the two case interviewers.",
    },
    {
      app: applications.find((a) => a.company_name === "Citadel"),
      round: "First Round",
      format: "video",
      scheduled_at: daysAgo(20),
      duration_minutes: 45,
      location: "Zoom",
      interviewer_name: "Equities trader",
      status: "completed",
      notes: "Past — went OK technically, equities knowledge gap was visible. Took the rejection on the chin.",
    },
  ];
  const inserts = rows
    .filter((r) => !!r.app)
    .map((r) => ({
      user_id: OWNER_USER_ID,
      application_id: r.app!.id,
      company_id: r.app!.company_name ? companyIds.get(r.app!.company_name) ?? null : null,
      round: r.round,
      format: r.format,
      scheduled_at: r.scheduled_at,
      duration_minutes: r.duration_minutes,
      location: r.location,
      interviewer_name: r.interviewer_name,
      interviewer_title: (r as { interviewer_title?: string }).interviewer_title ?? null,
      status: r.status,
      notes: r.notes,
    }));
  const { error } = await sb.from("interviews").insert(inserts);
  if (error) throw error;
}

async function seedOffer(applications: { id: string; company_name: string | null }[]) {
  const stripeApp = applications.find((a) => a.company_name === "Stripe");
  if (!stripeApp) return;
  const { error } = await sb.from("offers").insert({
    user_id: OWNER_USER_ID,
    application_id: stripeApp.id,
    company_name: "Stripe",
    role: "Software Engineering Intern — Payments",
    level: "Intern",
    location: "San Francisco, CA",
    base: 84000, // annualized equivalent for the intern hourly
    bonus: 0,
    equity: 0,
    sign_on: 5000,
    housing: 12000,
    benefits: { health: "PPO included", relocation: "$5k stipend", transit: "Caltrain pass" },
    received_at: daysAgo(1),
    deadline_at: daysFromNow(7),
    status: "received",
  });
  if (error) throw error;
}

async function seedRejection(applications: { id: string; company_name: string | null }[]) {
  const reflections = [
    {
      app: applications.find((a) => a.company_name === "Two Sigma"),
      reasons: ["resume-bar-too-high", "no-warm-intro", "applied-late"],
      free_text:
        "Looking back: applied 4 weeks after their pipeline opened. Two Sigma fills 80% of slots in the first 10 days.",
    },
    {
      app: applications.find((a) => a.company_name === "Bridgewater Associates"),
      reasons: ["culture-fit", "limited-prep"],
      free_text:
        "I went in cold on the radical-transparency principles. Should've done more homework on Dalio's framework before the HR call.",
    },
  ].filter((r) => !!r.app);
  if (reflections.length === 0) return;
  const inserts = reflections.map((r) => ({
    user_id: OWNER_USER_ID,
    application_id: r.app!.id,
    reasons: r.reasons,
    free_text: r.free_text,
  }));
  const { error } = await sb.from("rejection_reflections").insert(inserts);
  if (error) throw error;
}

async function seedNotifications() {
  const rows = [
    {
      type: "interview-imminent",
      priority: "high",
      title: "JPM first-round in 3 days",
      body: "Andrew Zhang (VP, TMT) — 45 min Zoom. Resume walkthrough + 1-2 technicals.",
      source_agent: "coo",
      created_at: daysAgo(0.1),
    },
    {
      type: "offer-deadline",
      priority: "high",
      title: "Stripe offer — 7 days to decide",
      body: "Decision deadline next week. CRO suggests waiting on GS superday before responding.",
      source_agent: "cro",
      created_at: daysAgo(1),
    },
    {
      type: "contact-cooling",
      priority: "low",
      title: "Rachel Green has gone quiet",
      body: "You haven't spoken to Rachel Green (Bridgewater) in 35 days. A short note this week keeps the thread warm.",
      source_agent: "cno",
      created_at: daysAgo(2),
    },
    {
      type: "follow-up-due",
      priority: "medium",
      title: "Follow up with Daniela Ortiz",
      body: "Apollo recruiter contact — last touch 12 days ago. A short check-in is overdue.",
      source_agent: "coo",
      created_at: daysAgo(3),
    },
    {
      type: "agent-suggestion",
      priority: "medium",
      title: "CFO: pipeline conversion at 31% — above peer benchmark",
      body: "Of the 12 applications you've sent, 5 progressed to interview. That's a 42% reply rate, 31% interview conversion — top decile for top-tier IB.",
      source_agent: "cfo",
      created_at: daysAgo(5),
    },
  ];
  const inserts = rows.map((r) => ({
    user_id: OWNER_USER_ID,
    type: r.type,
    priority: r.priority,
    title: r.title,
    body: r.body,
    source_agent: r.source_agent,
    channels: ["pneumatic_tube"],
    is_read: false,
    is_dismissed: false,
    created_at: r.created_at,
  }));
  const { error } = await sb.from("notifications").insert(inserts);
  if (error) throw error;
}

async function seedSnapshots() {
  const rows: Array<Record<string, unknown>> = [];
  // Last 30 days of monotonically-growing snapshots — tells the Observatory
  // a story of "starting from zero, scaling up."
  for (let d = 30; d >= 0; d--) {
    const factor = Math.max(0, 30 - d) / 30; // 0 → 1
    const totalApps = Math.floor(2 + factor * 12); // 2 → 14
    const activePipeline = Math.floor(2 + factor * 8); // 2 → 10
    const interviews = Math.floor(factor * 5); // 0 → 5
    const offers = d <= 1 ? 1 : 0;
    const rejections = Math.floor(factor * 3);
    rows.push({
      user_id: OWNER_USER_ID,
      date: dateOnly(d),
      total_applications: totalApps,
      active_pipeline: activePipeline,
      interviews_scheduled: interviews,
      offers,
      rejections,
      emails_processed: Math.floor(factor * 80),
      agents_runs: Math.floor(factor * 35),
      total_cost_cents: Math.floor(factor * 220), // up to $2.20
      conversion_rate: factor > 0.3 ? 0.31 : 0,
      stale_count: Math.max(0, Math.floor(factor * 4) - 1),
      applied_count: totalApps - interviews - offers - rejections,
      screening_count: Math.floor(factor * 2),
      interview_count: interviews,
      offer_count: offers,
    });
  }
  const { error } = await sb.from("daily_snapshots").insert(rows);
  if (error) throw error;
}

async function seedOutreach(
  contactIds: Map<string, string>,
  applications: { id: string; company_name: string | null }[],
) {
  const rows = [
    {
      contact: "Rachel Green",
      company: "Bridgewater Associates",
      type: "follow_up",
      subject: "Quick re-introduction",
      body: "Hi Rachel — wanted to drop a brief note since it's been a few weeks. Things on my end are picking up: I have superdays at Goldman and Jane Street next week. Would be great to grab 15 min if you have the time.",
      status: "pending_approval",
      generated_by: "ai",
    },
    {
      contact: "Daniela Ortiz",
      company: "Apollo Global Management",
      type: "follow_up",
      subject: "Following up on Apollo PE app",
      body: "Hi Daniela — circling back on the Apollo PE Summer Analyst app I submitted three weeks ago. Happy to provide any additional context if helpful for your review.",
      status: "pending_approval",
      generated_by: "ai",
    },
    {
      contact: "David Patel",
      company: "Citadel",
      type: "thank_you",
      subject: "Re: Equities recruiting timing",
      body: "David — thank you for the candid feedback after first round. Took the equities-exposure note seriously; building a personal portfolio P&L tracker over the next month. Will keep you posted.",
      status: "approved",
      generated_by: "ai",
    },
  ];
  const inserts = rows.map((r) => ({
    user_id: OWNER_USER_ID,
    contact_id: contactIds.get(r.contact) ?? null,
    application_id:
      applications.find((a) => a.company_name === r.company)?.id ?? null,
    type: r.type,
    subject: r.subject,
    body: r.body,
    status: r.status,
    generated_by: r.generated_by,
    approved_at: r.status === "approved" ? daysAgo(1) : null,
  }));
  const { error } = await sb.from("outreach_queue").insert(inserts);
  if (error) throw error;
}

async function seedProgression() {
  const milestones = [
    { milestone: "lobby_arrived", floor_unlocked: "L", unlocked_at: daysAgo(60) },
    { milestone: "war_room_unlocked", floor_unlocked: "7", unlocked_at: daysAgo(58) },
    { milestone: "first_application", floor_unlocked: null, unlocked_at: daysAgo(58) },
    { milestone: "rolodex_unlocked", floor_unlocked: "6", unlocked_at: daysAgo(45) },
    { milestone: "writing_room_unlocked", floor_unlocked: "5", unlocked_at: daysAgo(40) },
    { milestone: "situation_room_unlocked", floor_unlocked: "4", unlocked_at: daysAgo(30) },
    { milestone: "briefing_room_unlocked", floor_unlocked: "3", unlocked_at: daysAgo(20) },
    { milestone: "observatory_unlocked", floor_unlocked: "2", unlocked_at: daysAgo(15) },
    { milestone: "c_suite_unlocked", floor_unlocked: "1", unlocked_at: daysAgo(10) },
    { milestone: "first_offer_received", floor_unlocked: null, unlocked_at: daysAgo(1) },
  ];
  const inserts = milestones.map((m) => ({ ...m, user_id: OWNER_USER_ID }));
  const { error } = await sb.from("progression_milestones").insert(inserts);
  if (error) throw error;
}

async function seedProfile() {
  // Make the owner profile look like an onboarded user (lobby fast-lane to PH).
  const { error } = await sb
    .from("user_profiles")
    .upsert({
      id: OWNER_USER_ID,
      email: "armaansarora007@gmail.com",
      display_name: "Armaan",
      timezone: "America/New_York",
      onboarding_step: 99,
      progression_level: 9,
      subscription_tier: "team",
      last_floor_visited: "PH",
      preferences: {
        target_roles: ["Investment Banking", "Quant Trading", "Software Engineering"],
        target_sectors: ["Financial Services", "Hedge Funds", "Technology"],
        target_locations: ["New York, NY", "San Francisco, CA"],
      },
    });
  if (error) throw error;
}

async function main() {
  console.log("Seeding owner account:", OWNER_USER_ID);
  console.log("");

  console.log("  wiping prior data…");
  await wipe();

  console.log("  user_profiles…");
  await seedProfile();

  console.log("  companies (12)…");
  const companies = await seedCompanies();

  console.log("  contacts (12)…");
  const contacts = await seedContacts(companies);

  console.log("  applications (14)…");
  const applications = await seedApplications(companies, contacts);

  console.log("  cover letters (4)…");
  await seedDocuments(applications);

  console.log("  interviews (6)…");
  await seedInterviews(applications, companies);

  console.log("  offer (1 — Stripe)…");
  await seedOffer(applications);

  console.log("  rejection reflections (2)…");
  await seedRejection(applications);

  console.log("  outreach queue (3)…");
  await seedOutreach(contacts, applications);

  console.log("  notifications (5)…");
  await seedNotifications();

  console.log("  daily snapshots (31)…");
  await seedSnapshots();

  console.log("  progression milestones (10)…");
  await seedProgression();

  console.log("");
  console.log("Done. Visit https://www.interntower.com — your account now has");
  console.log("a believable internship-search story to play with.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
