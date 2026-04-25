import { LAUNCH_CONFIG } from "@/lib/launch-config";

/**
 * Terms of Service — source of truth. Renders into /terms.
 *
 * Sections marked [REVIEW] should be reviewed by an attorney before launch
 * if you're collecting payment. The rest is a Termly-style skeleton hardened
 * for AI / OAuth-heavy SaaS at this price tier.
 */
export const TERMS_OF_SERVICE = {
  revisedOn: LAUNCH_CONFIG.brand.legalRevisedOn,
  sections: [
    {
      heading: "Acceptance",
      body: [
        `Welcome to ${LAUNCH_CONFIG.brand.name}. By creating an account, accessing, or using the product, you agree to these Terms. If you don't agree, don't use the product.`,
        `${LAUNCH_CONFIG.brand.legalEntity} ("we," "us") operates ${LAUNCH_CONFIG.brand.url()} and is the party you contract with.`,
      ],
    },
    {
      heading: "Eligibility",
      body: [
        `You must be at least ${LAUNCH_CONFIG.eligibility.minimumAge} years old to use ${LAUNCH_CONFIG.brand.name}. By signing up you represent that you are.`,
        "You must provide a valid email address that you control. We will use it to authenticate you and to send transactional notices.",
        "You must not use the product if you are barred from doing so under the laws of your jurisdiction or ours.",
      ],
    },
    {
      heading: "Your account",
      body: [
        "You are responsible for everything that happens under your account. Don't share credentials. If you suspect unauthorized access, change your password immediately and email us.",
        "You can connect third-party accounts (Google, LinkedIn, Gmail, Calendar). Doing so authorizes us to perform the actions described to you at the consent screen and in our Privacy Policy.",
        "You can disconnect any integration at any time in Settings, which revokes our access to that provider's data.",
      ],
    },
    {
      heading: "Acceptable use",
      body: [
        "You may not use the product to:",
        "— spam recruiters or hiring managers, or send any communication that violates anti-spam law (CAN-SPAM, CASL, GDPR, etc.);",
        "— scrape or otherwise harvest data from third-party sites in violation of those sites' terms (this includes the LinkedIn and Levels.fyi terms);",
        "— misrepresent yourself, fabricate applications, or otherwise commit fraud against employers;",
        "— use AI-generated outputs to deceive recruiters about authorship in ways that violate the recruiter's express expectations;",
        "— circumvent rate limits, quotas, or security controls;",
        "— resell, white-label, or redistribute the product or its outputs without a separate written agreement;",
        "— use the product to generate content that is illegal, harassing, defamatory, or that infringes intellectual property.",
      ],
    },
    {
      heading: "Your content",
      body: [
        "You own the content you create or upload. We claim no ownership over your applications, contacts, resumes, or any other data you bring.",
        "You grant us a limited license to host, display, process, and transmit your content as necessary to operate the product for you. This license ends when you delete the content or your account, except for backups that age out under our retention schedule.",
        "If your content infringes someone else's rights, you are responsible. We may remove infringing content on receipt of a valid notice.",
      ],
    },
    {
      heading: "AI-generated outputs",
      body: [
        "Our AI agents draft cover letters, briefs, follow-ups, and other text. These outputs are provisional. You are responsible for reviewing, editing, and standing behind anything you send to a third party.",
        "AI outputs can contain errors, hallucinations, or content that conflicts with the source material. Treat them as a first draft, never a final word.",
        "You retain ownership of AI outputs as between you and us, to the extent we have rights to grant. Underlying model providers retain rights as set out in their own terms.",
      ],
    },
    {
      heading: "Subscriptions and billing",
      body: [
        `${LAUNCH_CONFIG.brand.name} offers a Free tier (${LAUNCH_CONFIG.pricing.freeAppCap} applications, ${LAUNCH_CONFIG.pricing.freeAiCallsPerDay} AI calls per day) and paid Pro and Team tiers at $${LAUNCH_CONFIG.pricing.pro.price} and $${LAUNCH_CONFIG.pricing.team.price} per month.`,
        "Paid subscriptions are processed by Stripe. By subscribing, you authorize Stripe to charge your payment method on a recurring basis until you cancel.",
        "Subscriptions renew automatically at the end of each billing cycle. The renewal price will be the price posted at that time; we will notify you in advance of any increase.",
        LAUNCH_CONFIG.pricing.refundHeadline,
        LAUNCH_CONFIG.pricing.refundBody,
        "We may change pricing for new subscribers at any time. Existing subscribers receive at least 30 days' notice before any price increase takes effect for them.",
      ],
    },
    {
      heading: "Cancellation and termination",
      body: [
        "You can cancel your subscription at any time from Settings → Billing. Cancellation stops the next renewal; you retain paid-tier access through the end of the current billing cycle.",
        "You can delete your account at any time. Deletion is final. We honor it on the schedule described in our Privacy Policy.",
        "We may suspend or terminate your account if you breach these Terms, especially the acceptable-use rules, or if continuing to provide service to you exposes us to legal risk. We will give notice before termination unless doing so would itself create harm.",
      ],
    },
    {
      heading: "Service availability",
      body: [
        "We aim for high availability but do not guarantee uninterrupted service. Maintenance, third-party outages (Supabase, Vercel, Anthropic, OpenAI, Stripe, etc.), and force majeure events can interrupt the product.",
        "We are not liable for missed application deadlines, missed interview windows, or other time-sensitive consequences of outages. Set your own reminders for anything that matters.",
      ],
    },
    {
      heading: "Disclaimers",
      body: [
        `${LAUNCH_CONFIG.brand.name} is provided "as is" and "as available." We make no warranties, express or implied, regarding the product, including warranties of merchantability, fitness for a particular purpose, or non-infringement.`,
        "We do not provide career advice, legal advice, or financial advice. AI agent outputs are not advice.",
        "We do not guarantee that you will land an interview, an offer, or a job by using the product. Outcomes depend on you, the market, and the employer.",
      ],
    },
    {
      heading: "Limitation of liability",
      body: [
        "To the maximum extent allowed by law, our total liability to you for any claim arising out of or related to the product is capped at the greater of (a) the amount you paid us in the twelve months preceding the claim, or (b) one hundred US dollars.",
        "We are not liable for indirect, incidental, consequential, special, exemplary, or punitive damages, or for lost profits, lost opportunities, or lost data, even if we knew or should have known of the possibility.",
        "[REVIEW] Some jurisdictions don't allow certain liability exclusions. Where they don't, our liability is limited to the maximum extent allowed.",
      ],
    },
    {
      heading: "Indemnification",
      body: [
        "You agree to defend and indemnify us against any third-party claim arising from (a) your content, (b) your use of the product in violation of these Terms or applicable law, or (c) your interaction with employers, recruiters, or other third parties through the product.",
      ],
    },
    {
      heading: "Governing law and disputes",
      body: [
        `These Terms are governed by the laws of ${LAUNCH_CONFIG.brand.governingLaw}, without regard to conflict-of-laws principles.`,
        `Disputes arising out of these Terms or the product shall be brought exclusively in the state or federal courts located in ${LAUNCH_CONFIG.brand.governingLaw}, and you consent to personal jurisdiction there.`,
        "[REVIEW] Some startups prefer mandatory arbitration with a class-action waiver. That requires more careful drafting and is the kind of clause an attorney should tailor.",
      ],
    },
    {
      heading: "Changes to these Terms",
      body: [
        "We may revise these Terms. When we do, we'll update the date at the top and post a notice in the product. Material changes will require your re-acceptance before continuing to use paid features.",
      ],
    },
    {
      heading: "Contact",
      body: [
        `Questions about these Terms: ${LAUNCH_CONFIG.brand.supportEmail}.`,
        `Last revised: ${LAUNCH_CONFIG.brand.legalRevisedOn}.`,
      ],
    },
  ],
} as const;

export type TermsOfService = typeof TERMS_OF_SERVICE;
