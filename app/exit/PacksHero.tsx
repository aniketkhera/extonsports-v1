"use client";

import { makeTicker, useTick } from "../components/ticker";
import s from "./exit.module.css";
import k from "./packs.module.css";

/* Court packs, the vestibule's only panel (2026-11-03).
   ──────────────────────────────────────────────────────────────────────────
   Aniket: "we have that vestibule tv - have this 5/10 pack - remove others (like that
   Phoenix throwball and CCCA notice). show me a mockup first". So promos.ts gives the
   vestibule this panel alone.

   THE WORDS ARE THE PRINTED POSTER'S (orangish-app-wt-exton guides/court-packs-flyer,
   2026-10-26), which he approved after calling the detailed draft "too busy": the four
   prices as court-hours and lane-hours, "peak hours at the off-peak price, or less",
   each size with its own days "from your first game", and a code to the details at
   extonsports.com/packs. Its wording rules hold here too, and for the same reasons:
   no squash (it has no pack), no "unlimited / any time / 24-7", no "refundable", no
   "share / transfer", and court-hours rather than credits, because a credit is one
   court or lane for one hour, not one person.

   THE PRICES ARE court_pack_offers' rows at Exton, read live 2026-11-03 (badminton 5
   $200 / 10 $350, cricket 5 $275 / 10 $500, 60 and 120 days). The database sells; this
   wall only repeats it. Change a price there and change this the same day — a wall that
   quotes the wrong price is worse than none.

   THE COUPON is court_pack_coupons' DIWALI2026 (5% off, online only, valid_until
   2026-11-09 05:00 UTC = the end of Sun 8 Nov in Exton). Aniket, seeing it on the mock-up:
   "that's awesome.. push it to vestibule" -- so it is not a footnote: a gold chip beside
   NEW and a band of its own under the prices, in the festival's gold (the boards'
   SESSION_GOLD), never the peach of the prices. Both join and leave on
   the SCREEN's clock, like promos.ts's dated panels: a set stays up for weeks between
   reloads, and a code that has ended must not still be on the wall on Monday. The
   ticker's server snapshot is 0, so the first render has no line and nothing
   mismatches.

   THE CODE opens https://www.extonsports.com/packs, the poster's address (a 307 to
   /court-packs, checked live 2026-11-03), with no ?code=: the code ends on the 8th and
   the QR is for good. public/vestibule/packs-qr.svg is GENERATED from that URL (python
   segno, version 3, error level M, 4-module quiet zone, dark #0B1623 on white): change
   the URL, regenerate it, and decode it off a screenshot before shipping.

   No heartbeat (the page that renders this sends that). Only transform and opacity
   move: the copy rises in, the code's ring pings (exit.module.css). */

const PACKS_URL = "https://www.extonsports.com/packs";

const COUPON = { code: "DIWALI2026", percentOff: 5, until: "2026-11-09T05:00:00Z", untilWords: "Sun 8 Nov" };

const couponTicker = makeTicker(60_000);

const SPORTS: Array<{ name: string; unit: string; rows: Array<{ qty: number; price: number }> }> = [
  { name: "Badminton", unit: "court-hours", rows: [{ qty: 5, price: 200 }, { qty: 10, price: 350 }] },
  { name: "Cricket", unit: "lane-hours", rows: [{ qty: 5, price: 275 }, { qty: 10, price: 500 }] },
];

/* Each line's entrance, in seconds after load and again every 40 s (exit.module.css .rise). */
const at = (seconds: number) => ({ animationDelay: `${seconds}s` });

export default function PacksHero({ className }: { className?: string }) {
  const now = useTick(couponTicker);
  const couponUp = now > 0 && now < Date.parse(COUPON.until);
  const url = PACKS_URL.replace(/^https?:\/\/(www\.)?/, "");

  return (
    <section className={[k.hero, className].filter(Boolean).join(" ")} aria-label="Court packs">
      <div className={k.head}>
        <span className={k.chips}>
          <span className={`${k.chip} ${s.rise}`} style={at(0.1)}>New</span>
          {couponUp && <span className={`${k.chip} ${k.chipGold}`}>Diwali · {COUPON.percentOff}% off</span>}
        </span>
        <h2 className={`${k.title} ${s.rise}`} style={at(0.2)}>
          Court <span className={k.accent}>packs.</span>
        </h2>
        <p className={`${k.pitch} ${s.rise}`} style={at(0.45)}>
          Prepaid court time — <b>peak hours at the off-peak price, or less.</b>
        </p>
      </div>

      <div className={k.cards}>
        {SPORTS.map((sp, i) => (
          <div key={sp.name} className={`${k.card} ${s.rise}`} style={at(0.7 + i * 0.15)}>
            <div className={k.sport}>{sp.name}</div>
            {sp.rows.map((r) => (
              <div key={r.qty} className={k.row}>
                <span className={k.qty}>
                  <b>{r.qty}</b>
                  <i>{sp.unit}</i>
                </span>
                <span className={k.price}>
                  <small>$</small>
                  {r.price}
                </span>
              </div>
            ))}
          </div>
        ))}

        <div className={k.cta}>
          {/* The code and its label are ONE link, as on the other panels: the page is
              public, and nobody can scan a code on their own phone's screen. */}
          <a className={`${s.buy} ${s.riseOnce}`} href={PACKS_URL} aria-label="Buy a court pack at Exton Sports">
            <span className={`${s.scan} ${k.scan}`}>SCAN TO BUY</span>
            <span className={`${s.card} ${k.qrCard}`}>
              <span className={s.ring} aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
              <img className={s.code} src="/vestibule/packs-qr.svg" alt={`QR code: ${url}`} />
            </span>
          </a>
          <a className={k.url} href={PACKS_URL}>
            {url.split("/")[0]}/<span>{url.split("/")[1]}</span>
          </a>
        </div>
      </div>

      <div className={k.foot}>
        <p className={`${k.rule} ${s.rise}`} style={at(1.1)}>
          5-pack <b>60 days</b>
          <span className={k.dot}>·</span>
          10-pack <b>120 days</b> — <em>from your first game</em>
        </p>
        {couponUp && (
          <p className={k.coupon}>
            <span className={k.couponLead}>Diwali offer</span>
            <span>
              Use code <span className={k.code}>{COUPON.code}</span> for <b>{COUPON.percentOff}% off</b> any pack online,
              until {COUPON.untilWords}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
