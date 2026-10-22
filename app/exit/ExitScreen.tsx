"use client";

import useReloadOnDeploy from "../components/useReloadOnDeploy";
import { ScreenHeader, BookingBand, BAND_GAP, BOOK_BAND, BAND_STAMP } from "../components/ScreenChrome";
import ScreenStamp from "../components/ScreenStamp";
import { BG, INK, BOX } from "../components/tv-palette";
import StarterHero from "./StarterHero";
import WorkshopHero from "./WorkshopHero";
import CccaHero from "./CccaHero";
import { usePromos } from "./promos";
import w from "./workshop.module.css";

/* The exit-door screen — the Squash Starter Pack (2026-10-20).
   ──────────────────────────────────────────────────────────────────────────
   The VIZIO WHD32M (32", 1920x1080) that was the "outside" TV now hangs indoors
   facing the EXIT door, for events and promotions. Aniket: "the first promotion we
   want to do is the squash starter pack - create a screen (with some animation) -
   you may keep the top and bottom strips as we have for the reception and vestibule
   TVs.. The CTA for this would be a QR Code to purchase the starter pack at Exton."

   So: /reception's header and booking band, unchanged (components/ScreenChrome —
   one copy for both screens), and between them the offer, a squash court with one
   rally playing on it, and a large SCAN TO BUY code.

   Then, on the first draft (2026-10-20), Aniket: "hide the small QR on this screen.
   also, mention what happens after they buy - "A SQUASHTIGERS coach will get in
   touch with you to schedule the 5 lessons"". So the band here has no booking QR
   (BookingBand showBookQr={false} — one code on this wall, the one that sells the
   pack), and his sentence sits under the code, where someone who has just scanned
   looks next.

   And the word (2026-10-20, Aniket): "instead of buy a starter pack, write "Enroll
   for a Starter Pack"". So the label over the code is ENROLL FOR A STARTER PACK, and
   the step under it AFTER YOU ENROLL: a family enrolls a child in lessons. The page the
   code opens still says Buy; that wording is the platform's.

   THE OFFER'S TERMS ARE THE OFFER PAGE'S (app.orangish.io/starter/exton-sports,
   read 2026-10-20), not ours: five 30-minute private lessons with a squash coach,
   $195 for all five, juniors under 19, once per player, no expiry. That page is
   where the rules are enforced (age, once-ever) and where the price comes from
   (Exton's rates row); this screen only repeats it. If the offer changes there,
   change the copy here the same day — a wall that quotes the wrong price is worse
   than none. The one line that is NOT the page's is the after-you-buy sentence,
   Aniket's (above). The page's own step 2, read the same day, says "Exton Sports
   will contact you to book your five sessions": two names for one step. Which is
   right is his call; until he makes it, the wall keeps his words.

   No data feed: nothing on it changes but the clock. It reloads itself on a deploy
   like every other screen (useReloadOnDeploy).

   ⚠️ WHICH TV SHOWS THIS IS NOT DECIDED HERE. From 2026-10-20 a TV shows it when
   its entry in app/components/tv-screens.ts says `shows: "starter-pack"` (today
   the outside set, at /outside). Which ADDRESS each set loads is tv-keeper's
   tvs.json on the N95 (orangish-cameras). Building this page changed no TV. */

export default function ExitScreen() {
  useReloadOnDeploy();
  /* Which promotions are up and which slot each holds: promos.ts, shared with the
     vestibule since 2026-10-21 so both walls change panels at the same moment.
     The Starter Pack's own panel is StarterHero.tsx since the same day. */
  const { up, slot } = usePromos();
  /* NO HEARTBEAT IN HERE, on purpose (2026-10-20). The freeze watchdog's beat is
     sent ONCE per page by whoever renders this, named by the ADDRESS: TvScreen.tsx
     as "outside" on /outside (the TV's own address), and app/exit/page.tsx as
     "exit" on the preview address, which is also the set's URL until tv-keeper is
     re-pointed. A fixed name in here would report the outside TV as "exit" on
     /outside, and a hook here as well as there would beat twice a minute. So a
     keyed TV on either address beats; the platform's SCREEN_PAGES has both names.
     Until this is DEPLOYED, the platform first (it refuses a page name it does not
     list), the earlier warning stands: give no TV showing this a keyed (#k=) url in
     tvs.json, or tv-keeper takes the silence for a frozen screen, relaunches it and
     then asks for a power cycle. The version stamp is in the band (BookingBand's
     `stamp`, BAND_STAMP), on the same pixels as the court board's. */

  return (
    <div style={{ position: "absolute", inset: 0, background: BG }}>
      {/* The same 16:9 box as /reception — see BOX — with the same paddings, so the
          header and the band land on exactly the same pixels on both screens. */}
      <div
        style={{
          ...BOX,
          position: "absolute", background: BG, color: INK,
          width: "calc(100 * var(--vw))", height: "calc(100 * var(--vh))",
          left: "calc(50% - 50 * var(--vw))", top: "calc(50% - 50 * var(--vh))",
          display: "flex", flexDirection: "column", padding: `calc(2.7 * var(--vh)) calc(2.2 * var(--vw)) calc(${BAND_GAP} + ${BOOK_BAND})`,
          overflow: "hidden",
        }}
      >
        <ScreenHeader />

        {/* One cell for both panels while the workshop is on (workshop.module.css
            swaps them every 5 s); otherwise the Starter Pack alone, as before. */}
        <div className={w.stack}>
        <StarterHero className={slot("starter")} />
        <CccaHero className={slot("ccca")} />
        {up.includes("workshop") && <WorkshopHero className={slot("workshop")} />}
        </div>

        {/* The version stamp (2026-10-20): keyed screens or ?diag only, in the
            band's corner under the number, as on /reception — see BAND_STAMP. */}
        <BookingBand showBookQr={false} stamp={<ScreenStamp style={BAND_STAMP} />} />
      </div>
    </div>
  );
}
