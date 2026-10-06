"use client";

import Link from "next/link";
import { bookingOpensLabel, openSportsLabel } from "../../lib/opening";
import { SPORT_ORDER } from "../../lib/rates";
import { BOOK_COURTS_URL } from "../../lib/booking";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { label: "Sports", href: "/#sports" },
  { label: "About", href: "/#about" },
  { label: "Visit", href: "/#about" },
];

export default function Nav() {
  const opensLabel = bookingOpensLabel();
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[var(--color-line)]"
      style={{
        height: 64,
        padding: "0 44px",
        background: "var(--nav-bg)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <Link href="/" className="brand-wordmark text-[1.45rem]">
          <img
            src="/logo.png"
            alt="Exton Sports Center"
            width={38}
            height={38}
            style={{ display: "block", flexShrink: 0 }}
          />
          <span>
            EXTON <span className="brand-accent">SPORTS CENTER</span>
          </span>
        </Link>

        {/* The status chip beside the title — persistent (nav is sticky) and links
            to the booking section. Same glow and same breathing dot it has always
            had; only what it SAYS changed.

            It used to read "Opening Oct 5, 2026" and it is now derived from
            SPORT_BOOKING_OPENS, because a hard-coded date is a promise that
            expires: on the morning of the 5th it became a lie, and nothing but a
            person reading the nav would have caught it. openSportsLabel returns
            null once every sport is bookable, and the chip disappears — at that
            point "we are open" is not news worth a glowing badge.

            Hidden below `xl`, not `sm`: the old chip was five words and this one
            is nine. At 1024 it collided with the nav links and forced the wordmark
            to wrap onto three lines — checked, not guessed. The hero still carries
            the same fact at every width, so nothing is lost below xl.

            The ember breath (.opening-glow) drives border-color, so the border
            utility here is only the width/style — hover keeps the fill tint. */}
        {openSportsLabel(SPORT_ORDER) && (
          <Link
            href="/#rates"
            className="opening-glow hidden xl:inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--color-ember)]/45 hover:bg-[var(--color-ember)]/10 transition-colors whitespace-nowrap shrink-0"
          >
            <span className="relative flex h-[6px] w-[6px]">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-ember)] opacity-70 animate-ping" />
              <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[var(--color-ember)]" />
            </span>
            <span className="opening-glow-text text-mono text-[0.6rem] text-[var(--color-ember)]">
              {openSportsLabel(SPORT_ORDER)}
            </span>
          </Link>
        )}
      </div>

      <div className="flex items-center shrink-0">
        <ul className="hidden md:flex items-stretch list-none">
          {navLinks.map((l, i) => (
            <li key={l.label}>
              <Link
                href={l.href}
                className={`block px-[18px] text-[0.74rem] font-semibold text-mono text-white/60 hover:text-white hover:bg-white/[0.04] transition border-r border-white/[0.06] ${
                  i === 0 ? "border-l border-white/[0.06]" : ""
                }`}
                style={{ lineHeight: "64px" }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* THE DESKTOP BOOKING CTA, added 2026-10-02. Desktop had no
            persistent way to book — the only one lived in the rate card, so
            it was gone the moment you scrolled past it. The phone solves this
            with a floating bubble (see WhatsAppFab); on a wide screen a
            floating pill reads as an advert, and the nav is where people
            already look. md: only — below that the bubble carries it, and two
            booking CTAs on a 375px screen is one too many.

            The "Opening Oct 5" chip beside the wordmark is LEFT ALONE: it is
            a date, this is an action, and they do not compete for the same
            spot. Revisit once the doors open and the chip reads as stale. */}
        <a
          href={BOOK_COURTS_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden md:inline-flex items-center ml-4 px-4 py-2 bg-[var(--color-ember)] text-black text-mono text-[0.66rem] hover:bg-[var(--color-ember-hi)] transition-colors whitespace-nowrap"
        >
          {/* Carries the date until booking actually works, so the button is
              never an invitation to a page that cannot sell you anything. */}
          {opensLabel ? `Booking opens ${opensLabel}` : "Book a court"}
        </a>

        {/* Theme switch sits outside the link list so it survives the md:
            breakpoint — the links collapse on mobile, the switch does not. */}
        <ThemeToggle className="ml-3 mr-1 md:ml-4 md:mr-0" />
      </div>
    </header>
  );
}
