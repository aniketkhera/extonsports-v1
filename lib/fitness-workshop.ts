// The POWER x SeRa Fitness "Health & Fitness Workshop", Fri 30 Oct 2026 (added 2026-10-21).
//
// One place for what the page at /fitnessworkshop and the exit-door TV slide both say. The words are
// the organiser's flyer's; the price and the Zelle number are the organiser's own Google Form's,
// which is the form this one replaces (Aniket, 2026-10-21: "the link to register, go there, and
// create a form at our end - extonsports.com/fitnessworkshop").
//
// Sign-ups are filed by the platform (orangish-app /api/public/workshop-registration, slug
// "fitnessworkshop"), which keeps its own copy of the closing time and refuses after it. The copy
// here only decides what the page shows; the platform's is the one that matters.

export const WORKSHOP = {
  slug: "fitnessworkshop",
  url: "https://www.extonsports.com/fitnessworkshop",
  title: "Health & Fitness Workshop",
  presenters: "POWER x SeRa Fitness",
  tagline: "A fun, high-energy, Bollywood-inspired workout.",
  blurb: "Move, sweat and celebrate with an amazing community of women.",
  day: "Friday, October 30",
  dayShort: "Fri Oct 30",
  time: "6:00 PM – 8:00 PM",
  where: "Exton Sports Center, 4 Tabas Lane, Building 2, Exton, PA",
  landmark: "opposite Apna Bazar",
  instructors: ["Nischita Bhargav", "Keerthi Gumma"],
  themes: [
    { k: "Dance", v: "Bollywood-inspired workout" },
    { k: "Fitness", v: "Move, sweat, get stronger" },
    { k: "Fun", v: "Energetic sessions" },
    { k: "Community", v: "Meet and connect with amazing women" },
  ],
  pricePerPerson: 10,
  zelleTo: "(201) 925-2710",
  organiser: "Seema Kizhakkey",
  power: { email: "papowerwomen@gmail.com", site: "power-women.org" },
  /** 6:00 PM EDT on the day. After this the page says sign-ups have closed. */
  closesAt: "2026-10-30T22:00:00Z",
  /** 8:00 PM EDT. After this the TV slide comes down by itself. */
  endsAt: "2026-10-31T00:00:00Z",
} as const;

export function workshopOpen(now: Date = new Date()): boolean {
  return now.getTime() < Date.parse(WORKSHOP.closesAt);
}

export function workshopOver(now: Date = new Date()): boolean {
  return now.getTime() >= Date.parse(WORKSHOP.endsAt);
}
