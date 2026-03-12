/**
 * Real resume, transcript, and cover letter data for Armaan Arora.
 * Source: ArmaanAroraResume.pdf, NYU_Transcript.pdf, ArmaanAroraCover_Letter.pdf
 * Last updated: 2026-03-06
 *
 * This is the SINGLE SOURCE OF TRUTH for all AI generation (cover letters,
 * follow-up emails). The Claude system prompt uses this data directly —
 * no fabrication is possible because the model can only reference what's here.
 */

export const RESUME = {
  name: 'Armaan S. Arora',
  contact: {
    address: '7 East 20th Street, New York, NY 10003',
    phone: '(516) 840-2501',
    email: 'armaan.arora@nyu.edu',
    altEmail: 'armaansarora20@gmail.com',
    linkedin: 'linkedin.com/in/armaansarora/',
  },

  education: {
    university: {
      school: 'New York University, SPS Schack Institute of Real Estate',
      shortName: 'NYU Schack',
      location: 'New York, NY',
      degree: 'B.S. in Real Estate',
      concentration: 'Real Estate Finance',
      expectedGraduation: 'May 2028',
      cumulativeGpa: '3.58',
      majorGpa: '3.87',
      honors: [
        "Dean's List (Fall 2025)",
        'NYU CAS Presidential Scholars Program (2024–2025)',
      ],
    },
    highSchool: {
      school: "St. Paul's School",
      location: 'Concord, NH',
      period: 'September 2021 – June 2024',
      gpa: '3.90/4.0',
      honors: ['Classical Honors Program Graduate'],
    },
  },

  experience: [
    {
      company: 'National Lecithin',
      location: 'Hicksville, NY',
      title: 'Summer Analyst Intern',
      period: 'May 2025 – August 2025',
      highlights: [
        'Identified outdated internal tools and led an AI modernization initiative with Perlon Labs, automating core workflows to reduce processing time and improve team productivity',
        'Negotiated with suppliers and customers amid sudden tariff hikes to keep prices competitive',
        'Maintained A/P and A/R records by logging invoices, posting payments, and monitoring outstanding balances',
        'Prepared, filed, and processed purchase orders; organized records for quick retrieval and status checks',
      ],
    },
    {
      company: 'JP Language Institute',
      location: 'Melville, NY',
      title: 'Department Head and Latin Instructor',
      period: 'June 2023 – August 2023',
      highlights: [
        'Led the Latin department and implemented a new curriculum and teaching methods',
        'Led multiple classes across varying skill levels and trained new teachers',
        'Established an annual class field trip to the Metropolitan Museum for hands-on learning',
        'Expanded Latin program enrollment by 25% through targeted outreach and recruitment initiatives',
      ],
    },
  ],

  leadership: [
    {
      org: 'Stern Real Estate Group (SREG)',
      role: 'Mentorship Program Member',
      description:
        'Selected for the mentorship program, building real estate knowledge, strengthening technical and interpersonal skills, and developing relationships with students and alumni',
    },
    {
      org: 'Schack Real Estate Club',
      role: 'Development Program Member',
      description:
        'Active member of the development program, engaging in professional development programming and industry-focused events',
    },
  ],

  skills: [
    'QuickBooks',
    'Excel',
    'PowerPoint',
    'Apollo.io',
    'HubSpot',
    'Microsoft Teams',
    'Generative AI tools',
  ],

  community: 'Volunteer at Mata Sahib Kaur Gurdwara, serving meals at community gatherings',

  // Full transcript data — used for academic context in AI generation
  transcript: {
    cumulativeGpa: '3.576',
    totalCreditsAttempted: 72,
    totalCreditsEarned: 44,
    semesters: [
      {
        term: 'Fall 2024',
        college: 'College of Arts and Science',
        major: 'Undecided',
        gpa: '3.556',
        courses: [
          { name: 'First-Year Cohort Meeting', code: 'COHRT-UA 10', credits: 0, grade: 'P' },
          { name: 'Elementary Punjabi I', code: 'COLU-UA 101', credits: 4, grade: 'A-' },
          { name: 'Introduction to Macroeconomics', code: 'ECON-UA 1', credits: 4, grade: 'B' },
          { name: 'Topics: Self and National Identity in Italian Fashion', code: 'FYSEM-UA 900', credits: 4, grade: 'A' },
          { name: 'Mathematics for Economics I', code: 'MATH-UA 131', credits: 4, grade: 'W' },
          { name: 'Freshman Scholars Seminar', code: 'SCHOL-UA 10', credits: 0, grade: 'P' },
        ],
      },
      {
        term: 'Spring 2025',
        college: 'College of Arts and Science',
        major: 'Undecided',
        gpa: '3.111',
        courses: [
          { name: 'Elementary Punjabi II', code: 'COLU-UA 102', credits: 4, grade: 'W' },
          { name: 'Introduction to Microeconomics', code: 'ECON-UA 2', credits: 4, grade: 'B' },
          { name: 'Writing as Inquiry', code: 'EXPOS-UA 1', credits: 4, grade: 'A' },
          { name: 'Mathematics for Economics I', code: 'MATH-UA 131', credits: 4, grade: 'C+' },
          { name: 'Freshman Scholars Seminar', code: 'SCHOL-UA 10', credits: 0, grade: 'P' },
        ],
      },
      {
        term: 'Fall 2025',
        college: 'School of Professional Studies',
        major: 'Real Estate',
        concentration: 'Real Estate Finance',
        gpa: '3.867',
        honors: "Dean's List",
        courses: [
          { name: 'Cultures & Contexts: Islamic Societies', code: 'CORE-UA 502', credits: 4, grade: 'A-' },
          { name: 'Intro to US Education Historical and Contemporary', code: 'HIST-UA 60', credits: 4, grade: 'A' },
          { name: 'Giordano Bruno and the Art of Memory', code: 'ITAL-UA 148', credits: 4, grade: 'A-' },
          { name: 'Real Estate Law', code: 'REBS1-UC 1002', credits: 4, grade: 'A' },
          { name: 'Urban Real Estate Economics', code: 'REBS1-UC 1060', credits: 4, grade: 'A' },
        ],
      },
      {
        term: 'Spring 2026',
        college: 'School of Professional Studies',
        major: 'Real Estate',
        concentration: 'Real Estate Finance',
        gpa: 'In Progress',
        courses: [
          { name: 'Calculus I', code: 'MATH-UA 121', credits: 4, grade: 'IP' },
          { name: 'Topics: Why Does College Cost So Much?', code: 'POL-UA 994', credits: 4, grade: 'IP' },
          { name: 'Real Estate Finance', code: 'REBS1-UC 1005', credits: 4, grade: 'IP' },
          { name: 'Real Estate Development', code: 'REBS1-UC 1010', credits: 4, grade: 'IP' },
          { name: 'Real Estate Accounting and Taxation', code: 'REBS1-UC 1012', credits: 4, grade: 'IP' },
        ],
      },
    ],
  },

  coursework: {
    completed: [
      'Real Estate Law',
      'Urban Real Estate Economics',
      'Introduction to Macroeconomics',
      'Introduction to Microeconomics',
      'Writing as Inquiry',
      'Mathematics for Economics I',
      'Elementary Punjabi I',
    ],
    current: [
      'Real Estate Finance',
      'Real Estate Development',
      'Real Estate Accounting and Taxation',
      'Calculus I',
    ],
  },

  // Writing style extracted from Armaan's actual cover letter to Beam Living
  writingStyle: {
    structure: '5-paragraph' as const,
    paragraphs: [
      'Genuine interest in the specific company — reference something concrete about their work, not generic praise',
      'National Lecithin bridge — connect A/P, A/R, invoices, purchase orders, clean records, follow-through to the target role',
      'Problem-solving and AI modernization — identifying what slows teams down, proposing improvements, analytical thinking',
      'SREG mentorship and academic growth — exposure to RE fundamentals, alumni network, thinking beyond finance to operations and execution',
      'Brief, honest close — one sentence expressing willingness to contribute, no begging',
    ],
    tone: 'honest, grounded, specific, organized, dependable' as const,
    avoids:
      'corporate buzzwords, fabricated facts, "I would be thrilled", "synergize", exaggeration, generic flattery' as const,
    keyPhrases: [
      'organized, dependable, and comfortable handling work that requires detail and follow-through',
      'keeping clean notes, checking details before sending things forward',
      'making sure people knew where something stood',
      'look at a process, identify where things break down, and make it easier for the next person',
      'strong work ethic, attention to detail, and a genuine willingness to help',
    ],
  },
} as const;

export type Resume = typeof RESUME;
