"use client";

import Link from "next/link";
import { bookingOpensLabel, openSportsLabel } from "../../lib/opening";
import { SPORT_ORDER } from "../../lib/rates";
import { BOOK_COURT_URL } from "../../lib/booking";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { label: "Sports", href: "/#sports" },
  { label: "About", href: "/#about" },
  { label: "Visit", href: "/#about" },
];

export default function Nav() {
  const opensLabel = bookingOpensLabel();
  return (
    /* Side padding is the page's own 16px gutter (the sections' px-4) below
       sm, and the desktop 44px from sm up. It was 44px at every width until
       2026-10-13, which spent 88 of a 320px phone's pixels on padding and left
       the wordmark ~130px — see the font-size note below. */
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[var(--color-line)] px-4 sm:px-[44px]"
      style={{
        height: 64,
        background: "var(--nav-bg)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* ONE LINE AT EVERY WIDTH, fixed 2026-10-13. At a flat 1.45rem the
            wordmark is 287px of text, so on the live site it wrapped to two
            lines at 375 (a 70px box spilling out of the 64px header) and to
            three at 320, where "EXTON" was clipped off the top of the screen.

            So below ~423px the size follows the viewport instead. At the
            brand's 0.16em tracking the text is 12.4× its font size wide
            (measured in Oswald), and everything else on the row is fixed:
            32px of padding, the 38px badge and its 9px gap, the 30px theme
            switch and its 16px of margin — 125px, plus 10px of air. Hence
            (100vw − 135px) / 12.4: 14.9px at 320, 19.4px at 375, 20.6px at
            390. min() hands back 1.45rem from ~423px up, so tablet and
            desktop are untouched.

            The tracking is kept and the size gives instead, because the
            spacing is what makes it read as the wordmark. No floor on the
            size: a floor is exactly what would let it overflow again on a
            narrower phone. If the badge, the switch or the padding change,
            the 135 changes with them. nowrap is there so the name can never
            break onto a second line in a header with room for one. */}
        <Link
          href="/"
          className="brand-wordmark whitespace-nowrap"
          style={{ fontSize: "min(1.45rem, calc((100vw - 135px) / 12.4))" }}
        >
          <img
            src="/logo.png"
            alt="Exton Sports Center"
            width={38}
            height={38}
            style={{ display: "block", flexShrink: 0 }}
          />
          {/* Below sm the name gets a second line carrying OPEN 24×7, because
              a chip BESIDE it does not fit on a phone: the size formula above
              already spends every spare pixel, and reserving ~120px more would
              shrink the wordmark to about 12px at 390 and 7px at 320. From sm
              up this wrapper is a plain block holding the one line it always
              held, and the chip beside the wordmark takes over. */}
          <span className="flex flex-col items-start gap-[4px] sm:block">
            <span>
              EXTON <span className="brand-accent">SPORTS CENTER</span>
            </span>
            <span className="open-sub inline-flex items-center gap-[5px] sm:hidden" aria-hidden="true">
              <span className="open-dot" />
              Open 24×7
            </span>
          </span>
        </Link>

        {/* OPEN 24×7, 2026-10-14 — the club never closes, and that is the fact
            worth a badge now the "booking opens" chip below has nothing left to
            say. Styles, and why it is a soft tint rather than the solid glowing
            chip it started as: .open-chip in globals.css. Not a link: it is a statement, and the booking button
            on the right is the action.

            WIDTHS, measured at 1440 / 1024 / 900 / 768 / 640 / 390, not guessed:
            the full 115px chip collides with the nav links from 1024 to ~1050
            and with the booking button from 768 to ~810. So between md and xl
            it drops the word "Open" — the green dot already says it — and the
            full label shows from sm to md and from xl up. Phones: see the
            second line under the wordmark above. */}
        <span className="open-chip hidden sm:inline-flex items-center gap-2 shrink-0" aria-label="Open 24 hours a day, 7 days a week">
          <span className="open-dot" aria-hidden="true" />
          <span className="md:hidden xl:inline">Open&nbsp;</span>24×7
        </span>

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
        {/* lg:, not md:, since 2026-10-13. From md the links, the booking
            button and the switch make a 474px block, and with the 334px
            wordmark and 88px of padding the row needs 896px — so from 768 to
            895 (an iPad held upright) the wordmark wrapped to three lines and
            hung out of the header. These three are in-page anchors a scroll
            away; the booking button is the one that matters, and it stays
            at md. */}
        <ul className="hidden lg:flex items-stretch list-none">
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
          href={BOOK_COURT_URL}
          target="_blank"
          rel="noreferrer"
          className="book-glow hidden md:inline-flex items-center ml-4 px-4 py-2 bg-[var(--color-ember)] text-black text-mono text-[0.66rem] hover:bg-[var(--color-ember-hi)] transition-colors whitespace-nowrap"
        >
          {/* Carries the date until booking actually works, so the button is
              never an invitation to a page that cannot sell you anything. */}
          {opensLabel ? `Booking opens ${opensLabel}` : "Book a court or lane"}
        </a>

        {/* Theme switch sits outside the link list so it survives the md:
            breakpoint — the links collapse on mobile, the switch does not. */}
        <ThemeToggle className="ml-3 mr-1 md:ml-4 md:mr-0" />
      </div>
    </header>
  );
}
