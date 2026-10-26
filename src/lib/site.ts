export const site = {
  name: 'Securing High-Density Urban Airspaces',
  shortName: 'SkySec: Secure Urban Airspaces',
  program: 'NASA University Leadership Initiative',
  description:
    'A NASA University Leadership Initiative (ULI) project uniting eight institutions to identify, defend against, and design out cyberattacks on drones and air taxis in dense urban airspaces.',
  period: 'September 2024 – August 2027',
  /** Project inquiries: partnership, stakeholders, media, research questions. */
  contactEmail: 'pwei@gwu.edu',
  /** Questions or corrections about the website itself. */
  websiteEmail: 'i.sharifi@gwu.edu',
  acknowledgment:
    'This project is supported by the NASA Aeronautics Research Mission Directorate (ARMD) through the University Leadership Initiative (ULI).',
  disclaimer:
    'Any opinions, findings, conclusions, or recommendations expressed on this site are those of the authors and do not necessarily reflect the views of NASA.',
};

// Source: Wikimedia Commons, "NASA logo.svg". Use of the NASA insignia needs NASA approval before launch.
export const sponsorLogo = { name: 'NASA', logo: '/logos/nasa.svg', website: 'https://www.nasa.gov/' };

// NASA program contacts (named with the PI's approval).
export const nasaContacts = [
  { name: 'Dennis Iannicca', role: 'NASA Technical Monitor', since: '2026' },
  { name: 'Vincent Varouh', role: 'NASA Technical Monitor, 2024–2025', since: '2024' },
];

// External advisory board. Source: Peng Wei's website review comments, October 2026.
export const advisoryBoard = [
  { name: 'Charlie Leeper', affiliation: 'Johns Hopkins University Applied Physics Laboratory' },
  { name: 'Wes Ryan', affiliation: 'Northrop Grumman and ASTM' },
  { name: 'Hao Ren', affiliation: 'Honeywell Aerospace' },
  { name: 'Tony Boci', affiliation: 'L3Harris' },
  { name: 'Jordan Cohen', affiliation: 'SkyGrid' },
];

export const roleLabels = {
  pi: 'Principal Investigator',
  'site-pi': 'Site PI',
  'co-i': 'Co-Investigator',
  postdoc: 'Postdoctoral researcher',
  phd: 'PhD student',
  ms: 'MS student',
  undergrad: 'Undergraduate researcher',
  intern: 'Research intern',
  staff: 'Staff',
} as const;

export const roleGroupLabels = {
  staff: 'Staff',
  postdoc: 'Postdoctoral researchers',
  phd: 'PhD students',
  ms: 'MS students',
  undergrad: 'Undergraduate researchers',
  intern: 'Research interns',
} as const;

/**
 * Homepage hero animation. '3d' = WebGL city (src/scripts/airspace3d.ts), falling back to 2D when
 * WebGL is unavailable. '2d' = the original canvas animation (src/scripts/airspace.ts; a frozen
 * copy is in archive/hero-2d-2026-10-08/).
 */
export const heroAnimation: '3d' | '2d' = '3d';

export const nav = [
  { label: 'Research', href: '/research' },
  { label: 'Teams', href: '/teams' },
  { label: 'People', href: '/people' },
  { label: 'Demos', href: '/demos' },
  { label: 'Publications', href: '/publications' },
  { label: 'News', href: '/news' },
  { label: 'Outreach', href: '/outreach' },
  { label: 'About', href: '/about' },
];

/** Footer-only links. */
export const footerExtras = [{ label: 'Glossary', href: '/glossary' }];


export const challenges = [
  {
    id: 'TC1',
    title: 'Identify',
    heading: 'Identify vulnerabilities and model attack impact',
    body: 'Find the weak links in aircraft autonomy and in UTM/AAM architectures, quantify the risk of attacks, and detect them with machine learning.',
    tasks: [
      'Identify attacks and vulnerabilities in aircraft autonomy and traffic management architectures',
      'Model attack impacts and quantify attack risks',
      'Monitor and detect attacks with machine learning',
    ],
  },
  {
    id: 'TC2',
    title: 'Defend',
    heading: 'Defend aircraft and the airspace',
    body: 'Mitigate attack hazards before and during flight, for an individual aircraft and for many aircraft sharing the same urban airspace.',
    tasks: [
      'Manage security risks in flight planning with belief sharing',
      'Mitigate attack hazards during flight at the individual-aircraft level',
      'Mitigate attack hazards for multiple aircraft at the airspace level',
    ],
  },
  {
    id: 'TC3',
    title: 'Harden',
    heading: 'Design resilient, secure infrastructure',
    body: 'Harden system architectures with security properties, assure those properties formally, and robustify data flow between aircraft and services.',
    tasks: [
      'Harden the system architecture with security properties',
      'Assure the security properties of the integrated architecture',
      'Robustify communication between aircraft and traffic management services',
    ],
  },
] as const;
