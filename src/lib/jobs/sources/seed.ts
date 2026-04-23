/**
 * Seed source — deterministic, in-memory fallback jobs so the North Star loop
 * is demo-able and E2E-testable even without external API keys or working
 * Greenhouse / Lever boards at runtime.
 *
 * The seed library covers the most common role shapes a user is likely to
 * declare: software engineering intern, product manager, data / ML, and
 * operations / finance roles across a spread of target-tier companies.
 */
import type { SourceFetchResult, SourceJob } from "../types";

interface SeedDefinition {
  sourceId: string;
  company: string;
  role: string;
  url: string;
  location: string;
  department: string;
  description: string;
  postedDaysAgo: number;
}

const SEED_LIBRARY: readonly SeedDefinition[] = [
  {
    sourceId: "seed:stripe:swe-intern-nyc",
    company: "Stripe",
    role: "Software Engineer Intern — Payments Infrastructure",
    url: "https://stripe.com/jobs/listing/swe-intern-2026-nyc",
    location: "New York, NY",
    department: "Payments Infrastructure",
    description:
      "Stripe's Payments Infrastructure team builds the systems that move trillions of dollars of payment volume a year. As a software engineering intern, you'll ship production code that directly touches the payment lifecycle — authorization, capture, settlement, and reconciliation. You'll work in Ruby and Go on the services layer and in React on internal tools. We're looking for candidates with strong systems intuition, comfort writing well-tested code, and real curiosity about how money actually moves. This role is based in our New York office and sits inside a team of senior engineers who will invest in your growth.",
    postedDaysAgo: 2,
  },
  {
    sourceId: "seed:anthropic:swe-intern-sf",
    company: "Anthropic",
    role: "Software Engineer Intern — Model Serving",
    url: "https://www.anthropic.com/careers/roles/swe-intern-2026-sf",
    location: "San Francisco, CA",
    department: "Model Serving",
    description:
      "The Model Serving team at Anthropic owns the infrastructure that turns research breakthroughs into reliable production systems. As an engineering intern you'll work on the inference stack that powers the Claude API and Claude.ai. You'll get exposure to distributed systems, GPU scheduling, request routing, and rigorous safety evaluations shipped to hundreds of thousands of daily users. Strong candidates will be comfortable in Python and Rust, curious about transformer internals, and willing to argue with senior engineers when the data points a different direction.",
    postedDaysAgo: 5,
  },
  {
    sourceId: "seed:ramp:swe-intern-nyc",
    company: "Ramp",
    role: "Software Engineer Intern",
    url: "https://ramp.com/careers/swe-intern-nyc-2026",
    location: "New York, NY",
    department: "Engineering",
    description:
      "Ramp is the finance automation platform helping companies spend less and save more. As an intern, you'll join a product team shipping features to tens of thousands of finance leaders every week. Our stack is TypeScript, Python, and Postgres. We care about taste and craft — small teams, zero-tolerance for broken experiences, and a bias for shipping. Past interns have owned entire features end-to-end and returned as full-time engineers. We are looking for candidates who read the AWS docs for fun and treat every UI as an opportunity to remove friction.",
    postedDaysAgo: 7,
  },
  {
    sourceId: "seed:vercel:swe-intern-remote",
    company: "Vercel",
    role: "Frontend Engineer Intern (Remote)",
    url: "https://vercel.com/careers/frontend-intern-2026",
    location: "Remote (Americas)",
    department: "Web Platform",
    description:
      "Vercel is the platform for frontend developers. Our interns ship to millions of daily developers via Next.js, the Vercel Toolbar, and the deploy dashboard. You'll write TypeScript, React, and the odd pinch of Rust, and you'll have real ownership of a quarter-sized initiative. Ideal candidates have strong opinions about UI performance, are excited about React Server Components, and ship side projects in their spare time. Remote-friendly across the Americas.",
    postedDaysAgo: 3,
  },
  {
    sourceId: "seed:openai:swe-newgrad-sf",
    company: "OpenAI",
    role: "Software Engineer, New Grad — Applied Research",
    url: "https://openai.com/careers/swe-newgrad-applied-2026",
    location: "San Francisco, CA",
    department: "Applied Research",
    description:
      "OpenAI's Applied Research team builds products on top of the frontier models before anyone else. As a new-grad engineer you'll pair with research scientists to turn experiments into production APIs used by ChatGPT, the API platform, and internal tools. Expect a mix of Python, TypeScript, and distributed systems work. We're looking for engineers who combine software taste with strong research literacy — you read papers and you also ship.",
    postedDaysAgo: 10,
  },
  {
    sourceId: "seed:linear:swe-intern-remote",
    company: "Linear",
    role: "Software Engineer Intern",
    url: "https://linear.app/careers/swe-intern-2026",
    location: "Remote (US)",
    department: "Product Engineering",
    description:
      "Linear is the tool that software teams use to plan, track, and ship. Our interns work directly with founding engineers on core flows — issue graph, cycles, projects, and the command menu. We ship in TypeScript and run a tight ship: small code reviews, no-process-for-process-sake culture, weekly design reviews, and measurable performance budgets. Strong candidates obsess over keyboard interactions and motion timing and have at least one side project they are proud of.",
    postedDaysAgo: 6,
  },
  {
    sourceId: "seed:figma:design-tech-intern",
    company: "Figma",
    role: "Design Technologist Intern",
    url: "https://figma.com/careers/design-tech-intern-2026",
    location: "San Francisco, CA",
    department: "Growth",
    description:
      "Design Technologists at Figma sit between engineering and design. They prototype the next wave of features, ship marketing-site experiences that make engineers cry with joy, and build design-system tooling. As an intern you'll own shippable work on our product site, the plugin ecosystem, or the dev-mode surface. Strong candidates write clean React, have opinions about Framer Motion, and can push a Figma file to feel one level more alive than the next person's.",
    postedDaysAgo: 4,
  },
  {
    sourceId: "seed:notion:pm-intern-nyc",
    company: "Notion",
    role: "Product Manager Intern",
    url: "https://notion.so/careers/pm-intern-2026",
    location: "New York, NY",
    department: "Product",
    description:
      "Notion's PM intern will embed with a product team shipping to tens of millions of users. You'll own a contained problem — onboarding, templates, AI, or an integration surface — and you'll write specs, run user research, and partner with engineering and design from scoping to launch. We're looking for candidates with a previous internship in product (at any stage company), sharp written communication, and demonstrated ability to get usable software in front of people.",
    postedDaysAgo: 8,
  },
  {
    sourceId: "seed:databricks:ml-intern-sf",
    company: "Databricks",
    role: "Machine Learning Engineer Intern",
    url: "https://databricks.com/careers/ml-intern-2026",
    location: "San Francisco, CA",
    department: "ML Platform",
    description:
      "Databricks' ML Platform team runs the training + inference surface used inside Fortune 500s and fast-growing startups. As an intern you'll work on model-serving reliability, feature-store ergonomics, or evaluation tooling. Python, Scala, and PyTorch are the daily workload. You should be comfortable reading training code and comfortable leaving the office when the on-call load is rough.",
    postedDaysAgo: 11,
  },
  {
    sourceId: "seed:modal:swe-intern-nyc",
    company: "Modal",
    role: "Software Engineer Intern",
    url: "https://modal.com/careers/swe-intern-2026",
    location: "New York, NY",
    department: "Engineering",
    description:
      "Modal is serverless compute for AI teams. Our intern will ship code that runs billions of container seconds a month on bare-metal GPU fleets. You'll work in Python, Rust, and Go on the scheduler, the runtime, or the client SDK. Candidates should be comfortable reading Linux kernel source and debugging something that's actually broken for real users at 2am.",
    postedDaysAgo: 5,
  },
  {
    sourceId: "seed:cursor:swe-intern-remote",
    company: "Cursor",
    role: "Software Engineer Intern",
    url: "https://cursor.com/careers/swe-intern-2026",
    location: "Remote (US)",
    department: "Editor Team",
    description:
      "Cursor is the AI-first code editor. Our engineering interns get hands-on work across the editor surface — completion UX, agent loops, or the indexing pipeline that keeps projects warm. You'll write TypeScript and Rust and you'll be expected to ship something real within three weeks of joining. Ideal candidates are fast, opinionated, and have built at least one dev-tool that is actually used by people who weren't paid to use it.",
    postedDaysAgo: 9,
  },
  {
    sourceId: "seed:supabase:swe-intern-remote",
    company: "Supabase",
    role: "Software Engineer Intern (Postgres Platform)",
    url: "https://supabase.com/careers/swe-intern-2026",
    location: "Remote (Global)",
    department: "Postgres Platform",
    description:
      "Supabase is the open-source Firebase alternative built on Postgres. Our Postgres Platform intern will ship features across the managed-Postgres surface — replication, extensions, backup, or the CLI. You'll work in Go, TypeScript, and SQL. Strong candidates have opened at least one Postgres bug report and can explain MVCC at a party.",
    postedDaysAgo: 12,
  },
  {
    sourceId: "seed:mercury:swe-intern-sf",
    company: "Mercury",
    role: "Software Engineer Intern",
    url: "https://mercury.com/careers/swe-intern-2026",
    location: "San Francisco, CA",
    department: "Engineering",
    description:
      "Mercury builds banking for startups. Our intern ships code that touches real money movement — payments, cards, treasury. We write Haskell (yes really), Rust, and TypeScript. Candidates comfortable moving between backend systems and a product surface will thrive. We take correctness seriously, so expect a strong code-review culture and a lot of respect for types.",
    postedDaysAgo: 15,
  },
  {
    sourceId: "seed:airtable:swe-intern-sf",
    company: "Airtable",
    role: "Software Engineer Intern",
    url: "https://airtable.com/careers/swe-intern-2026",
    location: "San Francisco, CA",
    department: "Platform",
    description:
      "Airtable is the spreadsheet-database platform used by millions. As an engineering intern you'll work across the realtime-sync layer, the formula engine, or the automations / scripting surface. Our stack is TypeScript + Node + React. Candidates should have built at least one thing that involves collaboration, sync, or conflict resolution — a toy is fine.",
    postedDaysAgo: 13,
  },
  {
    sourceId: "seed:retool:swe-intern-nyc",
    company: "Retool",
    role: "Software Engineer Intern (New York)",
    url: "https://retool.com/careers/swe-intern-nyc-2026",
    location: "New York, NY",
    department: "Application Platform",
    description:
      "Retool is the internal-tools platform used by roughly every fintech ops team you've heard of. Our New York intern will work on the Application Platform — the React + TypeScript surface that ships tools to thousands of internal users every week. Candidates should care about bundle size, love a gnarly state-machine problem, and be comfortable owning a feature end-to-end.",
    postedDaysAgo: 1,
  },
  {
    sourceId: "seed:brex:swe-intern-sf",
    company: "Brex",
    role: "Software Engineer Intern",
    url: "https://brex.com/careers/swe-intern-2026",
    location: "San Francisco, CA",
    department: "Spend Platform",
    description:
      "Brex builds financial software for high-growth companies. Our intern will ship against the Spend Platform — cards, expense policy, or spend controls. Primarily TypeScript + Go. Candidates should have had one prior software internship, be comfortable in a live ops environment, and willing to ship a feature you'll be accountable for all quarter.",
    postedDaysAgo: 16,
  },
  {
    sourceId: "seed:plaid:swe-intern-sf",
    company: "Plaid",
    role: "Software Engineer Intern",
    url: "https://plaid.com/careers/swe-intern-2026",
    location: "San Francisco, CA",
    department: "Core Infrastructure",
    description:
      "Plaid powers the financial infrastructure for a large fraction of US fintech. As a Core Infrastructure intern you'll work on the ingestion pipeline, the account-linking service, or the ops/monitoring surface. Go + Python. Strong systems backgrounds preferred; you should be able to reason about throughput and latency in the same breath.",
    postedDaysAgo: 17,
  },
  {
    sourceId: "seed:robinhood:swe-intern-nyc",
    company: "Robinhood",
    role: "Software Engineer Intern",
    url: "https://robinhood.com/careers/swe-intern-2026",
    location: "New York, NY",
    department: "Brokerage Engineering",
    description:
      "Robinhood is rebuilding consumer finance. As an intern in Brokerage Engineering you'll work on real-time trade execution, account management, or the ledger system. Python + Go. Candidates should be comfortable operating at the intersection of correctness-critical backend code and product UX tradeoffs.",
    postedDaysAgo: 14,
  },
  {
    sourceId: "seed:snowflake:swe-newgrad-sf",
    company: "Snowflake",
    role: "Software Engineer, New Grad",
    url: "https://snowflake.com/careers/swe-newgrad-2026",
    location: "San Mateo, CA",
    department: "Compute Platform",
    description:
      "Snowflake is the cloud data platform used by the majority of the Fortune 500. As a new-grad engineer you'll join the Compute Platform team — the layer that schedules, executes, and caches query plans across a globally distributed warehouse. C++ and Java. Strong systems programming background required; comfortable reading research papers a plus.",
    postedDaysAgo: 18,
  },
  {
    sourceId: "seed:cloudflare:swe-intern-remote",
    company: "Cloudflare",
    role: "Software Engineer Intern (Workers)",
    url: "https://cloudflare.com/careers/swe-intern-workers-2026",
    location: "Remote (Global)",
    department: "Workers Platform",
    description:
      "Cloudflare Workers is the edge-compute platform used by millions of developers. As an intern on the Workers Platform team you'll ship code in Rust, TypeScript, and Go. You'll touch the runtime, the storage layer (D1, Durable Objects, R2), or the developer surface. Candidates should have built something real with serverless and be comfortable debugging across the stack.",
    postedDaysAgo: 9,
  },
  {
    sourceId: "seed:hex:swe-intern-sf",
    company: "Hex",
    role: "Software Engineer Intern",
    url: "https://hex.tech/careers/swe-intern-2026",
    location: "San Francisco, CA",
    department: "Product Engineering",
    description:
      "Hex is the modern data workspace — part notebook, part dashboard, part collaborative app. Our intern will work in TypeScript, Python, and a bit of Go. You'll ship features across the editor, the compute layer, or the publishing surface. Candidates should have strong data intuition and ship tasteful product UI.",
    postedDaysAgo: 20,
  },
  {
    sourceId: "seed:replit:swe-intern-sf",
    company: "Replit",
    role: "Software Engineer Intern",
    url: "https://replit.com/careers/swe-intern-2026",
    location: "San Francisco, CA",
    department: "Platform",
    description:
      "Replit builds the IDE and compute surface where millions of developers learn and ship. As a platform intern you'll work on the container runtime, the collaboration protocol, or the agent features. Go, TypeScript, and the odd pinch of Rust. We move quickly and ship often.",
    postedDaysAgo: 7,
  },
  {
    sourceId: "seed:datadog:swe-intern-nyc",
    company: "Datadog",
    role: "Software Engineer Intern",
    url: "https://datadog.com/careers/swe-intern-2026",
    location: "New York, NY",
    department: "Observability Platform",
    description:
      "Datadog is the observability platform used by a majority of the Fortune 500. As an intern you'll work on the ingestion pipeline (hundreds of petabytes a day), the query engine, or the notebook and dashboard surface. Go, Python, TypeScript. Systems backgrounds strongly preferred.",
    postedDaysAgo: 22,
  },
  {
    sourceId: "seed:atlassian:swe-intern-nyc",
    company: "Atlassian",
    role: "Software Engineer Intern (Jira)",
    url: "https://atlassian.com/careers/swe-intern-jira-2026",
    location: "New York, NY",
    department: "Jira",
    description:
      "Atlassian's Jira team ships to millions of teams daily. As an intern you'll own a contained feature area within the Jira surface — boards, automation, or the new AI-assisted workflows. Java + TypeScript. Prior experience shipping production code expected.",
    postedDaysAgo: 25,
  },
  {
    sourceId: "seed:gitlab:swe-intern-remote",
    company: "GitLab",
    role: "Software Engineer Intern (Remote)",
    url: "https://gitlab.com/jobs/swe-intern-2026",
    location: "Remote (Global)",
    department: "Platform",
    description:
      "GitLab is the all-remote DevOps platform. Our intern ships code against GitLab Core — issues, merge requests, CI/CD pipelines, or the code-search experience. Ruby on Rails + Vue. Candidates should be comfortable working async, writing clear issues, and owning work across time zones.",
    postedDaysAgo: 11,
  },
  {
    sourceId: "seed:mongodb:swe-intern-nyc",
    company: "MongoDB",
    role: "Software Engineer Intern",
    url: "https://mongodb.com/careers/swe-intern-2026",
    location: "New York, NY",
    department: "Atlas",
    description:
      "MongoDB's Atlas team runs the managed-database surface used by tens of thousands of companies. Intern focus areas include the control plane, the backup system, or the serverless surface. Go, TypeScript, and C++. Database-systems coursework preferred.",
    postedDaysAgo: 19,
  },
  {
    sourceId: "seed:hubspot:swe-intern-boston",
    company: "HubSpot",
    role: "Software Engineer Intern",
    url: "https://hubspot.com/careers/swe-intern-2026",
    location: "Cambridge, MA",
    department: "Product",
    description:
      "HubSpot is the CRM and growth platform for SMBs. As an engineering intern you'll ship features against the CRM, the marketing surface, or the sales hub. Java + TypeScript. Candidates should be comfortable inside a large codebase and shipping alongside a cross-functional team.",
    postedDaysAgo: 28,
  },
  {
    sourceId: "seed:shopify:swe-intern-toronto",
    company: "Shopify",
    role: "Software Developer Intern (R&D)",
    url: "https://shopify.com/careers/swe-intern-2026",
    location: "Toronto, ON",
    department: "R&D",
    description:
      "Shopify powers millions of merchants. Our R&D intern will ship code across the storefront, the admin surface, or the platform layer. Ruby on Rails, TypeScript, React. Candidates should have one prior production internship and a strong bias toward shipping.",
    postedDaysAgo: 6,
  },
  {
    sourceId: "seed:twilio:swe-intern-remote",
    company: "Twilio",
    role: "Software Engineer Intern (Remote)",
    url: "https://twilio.com/careers/swe-intern-2026",
    location: "Remote (US)",
    department: "Messaging Platform",
    description:
      "Twilio's Messaging Platform ships billions of SMS per quarter. Our intern will work on the routing engine, the carrier-integration layer, or the policy surface. Go + Java. Systems-heavy — not a beginner role.",
    postedDaysAgo: 30,
  },
  {
    sourceId: "seed:block:swe-intern-sf",
    company: "Block",
    role: "Software Engineer Intern (Cash App)",
    url: "https://block.xyz/careers/swe-intern-cashapp-2026",
    location: "San Francisco, CA",
    department: "Cash App",
    description:
      "Block's Cash App team serves tens of millions of daily users. Our intern will ship features across the money-movement surface, the investing product, or the growth funnel. Kotlin + Swift + TypeScript. Consumer-product instincts strongly preferred.",
    postedDaysAgo: 4,
  },
];

/**
 * Return the full seed library — deterministic ordering.
 * Dates are resolved against the caller-provided clock (default: Date.now())
 * so tests can freeze time.
 */
export function loadSeedJobs(now: Date = new Date()): SourceJob[] {
  return SEED_LIBRARY.map((s) => ({
    sourceName: "seed",
    sourceId: s.sourceId,
    company: s.company,
    role: s.role,
    url: s.url,
    location: s.location,
    department: s.department,
    description: s.description,
    postedAt: new Date(
      now.getTime() - s.postedDaysAgo * 86_400_000
    ).toISOString(),
  }));
}

export async function fetchSeedJobs(
  now: Date = new Date()
): Promise<SourceFetchResult> {
  return { source: "seed", jobs: loadSeedJobs(now), warnings: [] };
}
