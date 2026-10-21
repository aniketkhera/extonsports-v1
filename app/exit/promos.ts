"use client";

import { makeTicker, useTick } from "../components/ticker";
import { WORKSHOP } from "../../lib/fitness-workshop";
import { BIRTHDAY } from "./BirthdayHero";
import w from "./workshop.module.css";

/* WHICH PROMOTIONS ARE UP, AND WHICH SLOT EACH HOLDS (2026-10-21).
   ──────────────────────────────────────────────────────────────────────────
   Moved out of ExitScreen.tsx when the vestibule screen took the same promotions
   on its right half (Aniket, 2026-10-21: "i also want the notices for starter
   pack, sera workshop, and the birthday"). One copy, so the two walls put up and
   take down the same panels at the same moment: the workshop leaves at 8pm on
   30 Oct and the birthday at midnight tonight, on BOTH screens, with no deploy.

   The Starter Pack is always up. The others join inside their own windows,
   decided on the SCREEN's clock, not at build time: a set stays up for weeks
   between reloads, and a panel has to come down by itself on the day.

   The ticker's server snapshot is 0, so the server and the first client render
   both show the Starter Pack alone and nothing mismatches; the others join a
   moment after the page starts (this was ExitScreen's workshopTicker, unchanged).

   Each panel 5 s. Two panels swap on a 10 s clock, three on a 15 s one; `slot(i)`
   is the class that gives panel i its turn (workshop.module.css, THE SWAP). With
   one panel it is "" and nothing animates. */
const promoTicker = makeTicker(30_000);

export function usePromos(): {
  withWorkshop: boolean;
  withBirthday: boolean;
  /** How many panels are up, 1-3. */
  count: number;
  /** The swap class for panel i, in the order Starter Pack, workshop, birthday. */
  slot: (i: number) => string;
  /** The birthday's index in that order: 2 while the workshop is up, else 1. */
  birthdaySlot: number;
} {
  const now = useTick(promoTicker);
  const withWorkshop = now > 0 && now < Date.parse(WORKSHOP.endsAt);
  // One evening only (2026-10-21, to midnight): see BirthdayHero.
  const withBirthday = now > 0 && now >= Date.parse(BIRTHDAY.startsAt) && now < Date.parse(BIRTHDAY.endsAt);
  const count = 1 + (withWorkshop ? 1 : 0) + (withBirthday ? 1 : 0);
  const slot = (i: number): string =>
    count === 2 ? [w.slideA, w.slideB][i] : count === 3 ? [w.slide3a, w.slide3b, w.slide3c][i] : "";
  return { withWorkshop, withBirthday, count, slot, birthdaySlot: withWorkshop ? 2 : 1 };
}
