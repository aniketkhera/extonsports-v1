import type { Metadata } from "next";
import JobPostingLayout, {
  type JobPostingData,
} from "../../components/JobPostingLayout";

export const metadata: Metadata = {
  title: "Head Badminton Coach — Careers",
  description:
    "Founding Head Badminton Coach for a brand-new youth badminton academy in the Greater Philadelphia area. Full-time, $55,000–$70,000/yr + incentives, visa sponsorship available.",
  alternates: { canonical: "/careers/head-badminton-coach" },
  openGraph: {
    title: "Head Badminton Coach — SmashShuttler Badminton Academy",
    description:
      "Found a brand-new youth badminton academy from zero in Greater Philadelphia. Full-time · $55,000–$70,000/yr + incentives · visa sponsorship available.",
    url: "https://extonsports.com/careers/head-badminton-coach",
    type: "website",
  },
};

const APPLY_MAILTO =
  "mailto:info@extonsports.com?subject=Application%3A%20Head%20Badminton%20Coach&body=Please%20attach%20your%20resume%2C%20a%20brief%20cover%20letter%20describing%20your%20coaching%20philosophy%2C%20and%20two%20professional%20references.";

const jobPostingLd = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Head Badminton Coach",
  description:
    "Founding Head Badminton Coach to build a brand-new youth badminton academy in the Greater Philadelphia area from the ground up — establishing curriculum, recruiting the first cohort, completing USA Badminton club affiliation and sanctioning, and entering local and regional tournaments from year one.",
  employmentType: "FULL_TIME",
  datePosted: "2026-07-22",
  hiringOrganization: {
    "@type": "Organization",
    name: "SmashShuttler Badminton Academy",
    sameAs: "https://extonsports.com",
    logo: "https://extonsports.com/logo.png",
  },
  jobLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Philadelphia",
      addressRegion: "PA",
      addressCountry: "US",
    },
  },
  baseSalary: {
    "@type": "MonetaryAmount",
    currency: "USD",
    value: {
      "@type": "QuantitativeValue",
      minValue: 55000,
      maxValue: 70000,
      unitText: "YEAR",
    },
  },
  applicantLocationRequirements: { "@type": "Country", name: "US" },
  directApply: false,
};

const data: JobPostingData = {
  academyLabel: "SmashShuttler Badminton Academy",
  title: "Head Badminton Coach",
  applyMailto: APPLY_MAILTO,
  applyEmail: "info@extonsports.com",
  eoeOrg: "SmashShuttler Badminton Academy",
  jsonLd: jobPostingLd,
  meta: [
    { k: "Location", v: "Philadelphia, PA (on-site)" },
    { k: "Employment type", v: "Full-time · Exempt" },
    { k: "Reports to", v: "Academy Director / Board of Directors" },
    {
      k: "Compensation",
      v: "$55,000–$70,000/yr, commensurate with experience, plus performance incentives",
    },
  ],
  about: [
    "We are launching a new youth badminton academy in the Greater Philadelphia area and are seeking a founding Head Badminton Coach to build the program from the ground up. This is a rare opportunity to establish a brand-new academy's identity, curriculum, and competitive standing rather than step into an existing structure — you will be the first technical hire and a defining voice in how the program takes shape.",
    "You will seed the academy from zero: recruiting the first cohort of players, standing up training infrastructure, and getting the academy formally plugged into the USA Badminton ecosystem (club affiliation, sanctioning, and pathway alignment), while also driving enrollment and securing entry into local and regional tournaments from year one.",
    "This is a hands-on, entrepreneurial leadership role for someone who loves developing young athletes, is energized by building something new rather than maintaining something established, communicates well with parents and players, and wants to help grow competitive badminton in a fast-expanding U.S. market. High-performance coaching experience is a must. Visa sponsorship is available for the right candidate.",
  ],
  responsibilities: [
    {
      group: "Academy Launch & Ecosystem Integration",
      items: [
        "Lead the ground-up build of the academy: establish training infrastructure, court/facility arrangements, equipment and stringing setup, and initial program structure.",
        "Drive founding-cohort player recruitment through community outreach, local school and league partnerships, clinics, and open trials.",
        "Complete USA Badminton (and applicable regional association) club affiliation and sanctioning, and align the program with USA Badminton's development pathways, coaching standards, and eligibility requirements.",
        "Build relationships with regional badminton clubs, leagues, and USA Badminton regional bodies to secure the academy's standing in the local badminton community from day one.",
        "Register and enter academy players/teams into appropriate local, regional, and national tournaments (including USAB-sanctioned junior events), managing scheduling, logistics, and compliance with tournament requirements.",
        "Represent the academy in ecosystem-building activities — league meetings, USA Badminton events, and partnerships with other clubs/academies — to establish credibility and visibility early on.",
      ],
    },
    {
      group: "Coaching & Player Development",
      items: [
        "Design and deliver age-appropriate training programs across singles and doubles play: footwork, strokes, serve/return, net play, deception, and tactical shot selection, for players roughly ages 6–18.",
        "Run individual, small-group, and team practice sessions with a focus on technical skill, court movement, physical conditioning, and mental resilience.",
        "Assess players regularly, set development goals, and track progress across skill levels, including pathway toward competitive/elite junior play.",
        "Prepare players and teams for tournaments, including match strategy, scouting, and in-competition coaching/mentoring.",
      ],
    },
    {
      group: "Program Leadership",
      items: [
        "Build and maintain a structured, season-long coaching curriculum and practice calendar.",
        "Recruit, train, and supervise assistant and volunteer coaches, ensuring consistent coaching standards.",
        "Support player recruitment, tryouts, squad selection, and roster management.",
        "Organize camps, clinics, and off-season development programs.",
      ],
    },
    {
      group: "Communication & Community",
      items: [
        "Serve as the primary point of contact for players and parents on athletic development.",
        "Foster a positive, inclusive, and disciplined team culture rooted in sportsmanship and respect.",
        "Represent the academy at local leagues, tournaments, and community events, and help grow participation in the Philadelphia area.",
      ],
    },
    {
      group: "Operations & Safety",
      items: [
        "Ensure all sessions meet health, safety, and child-protection standards, including proper equipment use and injury-prevention protocols.",
        "Maintain equipment (rackets, shuttles, stringing) and coordinate court and facility scheduling.",
        "Keep accurate records of attendance, evaluations, and incident reports.",
      ],
    },
  ],
  required: [
    "Proven playing and/or coaching experience in badminton at a competitive level (club, collegiate, national circuit, or higher).",
    "3+ years of coaching experience, ideally including youth development.",
    "A recognized coaching certification (e.g., USA Badminton coaching certification, Badminton World Federation Shuttle Time/Level coaching credential) or willingness to obtain USA Badminton certification within an agreed timeframe.",
    "Strong knowledge of modern badminton technique, singles/doubles tactics, and player-development pathways.",
    "Comfort operating in a startup/founding environment — able to build systems, curriculum, and processes without an existing playbook to follow.",
    "Demonstrated high-performance coaching experience — working with elite, representative, or pathway-level athletes (e.g., state/national age-group squads, junior national team pools, or collegiate programs), with the ability to design and deliver high-performance training plans, strength/conditioning coordination, and individualized athlete development pathways.",
    "Excellent communication, organization, and leadership skills.",
    "Ability to pass a background check and complete youth-safety / SafeSport certification.",
  ],
  preferred: [
    "Direct experience launching or standing up a new youth badminton or racquet-sports academy/program from scratch in the U.S., including navigating governing-body affiliation.",
    "Existing relationships within USA Badminton, regional associations, or the competitive junior tournament circuit.",
    "Current First Aid/CPR certification.",
    "Valid driver's license for travel to matches and tournaments.",
  ],
  conditions: [
    "Full-time schedule with regular evening and weekend hours during the season, aligned to practices, matches, and tournaments.",
    "Work is primarily indoors on badminton courts; requires physical activity, on-court demonstration of technique, and extended periods of movement.",
    "Some regional and occasional national travel for tournaments.",
  ],
  offer: [
    "Competitive salary with performance-based incentives.",
    "Visa sponsorship provided for qualified international candidates, including support with the work visa application and relocation process.",
    "The chance to found and shape a brand-new academy — build the curriculum, culture, and competitive program from the ground up rather than inherit someone else's.",
    "Direct support and investment in getting the academy affiliated with USA Badminton and competing regionally/nationally from year one.",
    "A supportive, community-driven environment and the chance to shape the next generation of American badminton players.",
  ],
};

export default function HeadBadmintonCoachPage() {
  return <JobPostingLayout data={data} />;
}
