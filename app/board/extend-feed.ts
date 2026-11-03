/* EXTEND ON THE BADMINTON TV (2026-11-03): the keyed feed's `extend`, checked, and the
   rules for what the panel draws this second.
   ──────────────────────────────────────────────────────────────────────────
   Aniket, 2026-11-02: from ten minutes before a paid booking ends until five minutes
   after, the badminton TV offers "extend 30 min / 1 hour" with a QR code each and the
   prices. The platform decides everything — who is offered, which courts, the price,
   the layout, the codes — and sends it as `extend` beside `lights` on the KEYED
   court-board only (orangish-app docs/court-extend.md §7.3, the one schema; the
   platform's lib/court-extend-offers.ts writes it). This file is the TV's half of that
   contract (§10.2), kept out of the components so node:test can pin it.

   ⛔ THE TV NEVER WORKS OUT A PRICE. No ÷ 2, no n × per court: every figure on screen
   is a total the server sent, formatted. `perCourt` is used only as a check — the
   one-court total must equal it, or the offer is dropped.

   ⛔ EVERY FIELD IS CHECKED, AND A FAILURE MEANS NO OFFER, NEVER A WRONG ONE. A
   malformed offer is dropped. Offers that disagree on `layout`, or more of them than
   the layout was measured for, draw no panel at all. A QR that is not the 33-unit
   geometry the fit check measured (29 modules + a 2-module quiet zone, version 3 at
   ECC M) is dropped: a denser code nobody measured at court distance is worse than
   none.

   ⛔ NEVER CARRIED OVER. A response without `extend` means no offers. This is the
   opposite of `lights`, which ReceptionBoard carries for three minutes: a price must
   not outlive the answer that quoted it.

   WHEN AN OFFER IS DRAWN (§10.8): the last good poll is at most 90 s old by this TV's
   clock, the board is not stale, this TV's clock was within 60 s of the server's
   `now` when that answer arrived, and opensAt ≤ now < closesAt. Otherwise the panel
   comes down, COMING UP returns, the entry's note falls back to "FREE AFTER", and
   nothing plays. The server sends an offer up to 12 min before its end and the TV
   draws it from 10 min (opensAt), so a 60 s poll never starts the panel late.

   NO QR LIBRARY. The platform encodes; the TV draws the path it is sent as a React
   attribute (QrCode in ExtendPanel.tsx). No markup is ever injected. */
import { clubNow } from "./board-lib";

/** The platform's QR: dark modules as one filled path, viewBox 0 0 size size. */
export type Qr = { size: number; d: string };

export type ExtendLayout = "one" | "multi" | "cards" | "cards-one-code";

export type ExtendLength = {
  /** Offered: priced, with at least one court free for the length and a code. When false
   *  (a committed offer whose other length is still on), everything below is empty but
   *  `why`, which says why. */
  available: boolean;
  /** How many of the offer's courts can take this length. */
  maxCourts: number;
  /** Cents for one court — the check on totals[0], nothing more. */
  perCourt: number | null;
  /** Cents: totals[i] is the price for i + 1 courts. Length maxCourts. */
  totals: number[];
  /** Where the all-ticked default continues when a court is taken next: courtIds. */
  moves: Array<{ from: string; to: string }>;
  /** The server's short reason when a court cannot take the length, e.g. "Court 1
   *  booked at 2:30 PM". Court labels only, never a holder. */
  why: string | null;
  /** The code for this length; null in 'cards-one-code', where the offer has one. */
  qr: Qr | null;
};

export type ExtendOffer = {
  /** Opaque, from the server: the React key. Never the offer id, never the code. */
  key: string;
  layout: ExtendLayout;
  /** 'paying': someone has pressed Pay. The codes stay; the face says PAYMENT IN PROGRESS. */
  state: "open" | "paying";
  /** The ON NOW entry it belongs to: club-local date and end minute (1440 = midnight). */
  date: string;
  end: number;
  endsAt: number;
  /** Drawn from here (end − 10 min) … */
  opensAt: number;
  /** … to here (end + 5 min), even from a payload that is otherwise still fresh. */
  closesAt: number;
  basis: "published" | "contract";
  /** courtIds still offered, labelled from the payload's own `courts`. */
  courts: string[];
  qr: Qr | null;
  lengths: { m30: ExtendLength; m60: ExtendLength };
};

/** A paid extension that continues on another court: the old court's "MOVE TO COURT 3"
 *  face, from `at` for five minutes (§9e E4). */
export type ExtendMove = { date: string; at: number; from: string; to: string };

/** One answer's `extend`, checked, with when it arrived on this TV's clock. */
export type ExtendView = {
  offers: ExtendOffer[];
  moves: ExtendMove[];
  /** The server's instant when it answered. */
  serverNow: number;
  /** This TV's clock when the answer arrived. */
  receivedAt: number;
};

const MINUTE = 60_000;
/** The last good poll may be this old (§10.8). */
export const EXTEND_FRESH_MS = 90_000;
/** This TV's clock may be this far from the server's when an answer arrives (§10.8). */
export const EXTEND_SKEW_MS = 60_000;
/** The poll while the last answer carried an offer; 60 s otherwise (§10.8). */
export const EXTEND_FAST_POLL_MS = 15_000;
/** How long one poll of the badminton TV may take before it is abandoned (pollLoop). */
export const EXTEND_POLL_TIMEOUT_MS = 20_000;
/** The only QR geometry anyone measured: 29 modules + 2 × 2 quiet zone (§7.6). */
export const EXTEND_QR_SIZE = 33;
/** Exactly what the platform's path walker writes: M{x} {y}h{run}v1h-{run}z. */
const QR_PATH = /^[Mhvz0-9 -]{1,8000}$/;
/** The server's offer key: 12 characters of lower-case Crockford base32. */
const KEY = /^[0-9a-hjkmnp-tv-z]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** How many offers each layout was measured with (§10.4). */
export const LAYOUT_MAX: Record<ExtendLayout, number> = { one: 1, multi: 1, cards: 2, "cards-one-code": 3 };
/** Three courts, so three offers at most; a sport with more courts must be re-measured. */
const MAX_COURTS = 3;
/** `why` is a short server-formatted line; anything longer is not that. */
const MAX_WHY = 60;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const instant = (v: unknown): number => (typeof v === "string" ? Date.parse(v) : NaN);
const cents = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0 && (v as number) < 1_000_000;

export function parseQr(v: unknown): Qr | null {
  if (!isObj(v) || v.size !== EXTEND_QR_SIZE || typeof v.d !== "string" || !QR_PATH.test(v.d)) return null;
  return { size: v.size, d: v.d };
}

/** One length, or null when it is not a shape the platform writes. `oneCode` is the
 *  'cards-one-code' layout, where the codes are per offer and a length carries none. */
function parseLength(v: unknown, courts: readonly string[], known: ReadonlySet<string>, oneCode: boolean): ExtendLength | null {
  if (!isObj(v)) return null;
  /* A length that is NOT for sale, in exactly the shape lib/court-extend-offers.ts
     lengthFeed writes it — and only that one. It reaches the TV once an offer is COMMITTED
     (a court paid for under it, or held): from then on each length stands on its own
     until end + 5 (the platform's allocation, after the reviews of PR #703), so the
     mixed lengths in two scans (Q15) and a Checkout another phone can join (Q8) survive
     the other length selling out. It is drawn as its reason, with no code and no price. */
  if (v.available === false) {
    const ok = v.maxCourts === 0 && v.perCourt === null && Array.isArray(v.totals) && v.totals.length === 0
      && v.qr === null && Array.isArray(v.moves) && v.moves.length === 0
      && typeof v.why === "string" && v.why.length > 0 && v.why.length <= MAX_WHY;
    return ok ? { available: false, maxCourts: 0, perCourt: null, totals: [], moves: [], why: v.why as string, qr: null } : null;
  }
  if (v.available !== true) return null;
  const max = v.maxCourts;
  if (!Number.isInteger(max) || (max as number) < 1 || (max as number) > courts.length) return null;
  if (!cents(v.perCourt)) return null;
  if (!Array.isArray(v.totals) || v.totals.length !== max || !v.totals.every(cents)) return null;
  if (v.totals[0] !== v.perCourt) return null;
  const qr = oneCode ? null : parseQr(v.qr);
  if (!oneCode && !qr) return null;
  if (!Array.isArray(v.moves)) return null;
  const moves: ExtendLength["moves"] = [];
  for (const m of v.moves) {
    if (!isObj(m) || typeof m.from !== "string" || typeof m.to !== "string") return null;
    if (!courts.includes(m.from) || !known.has(m.to) || m.from === m.to) return null;
    moves.push({ from: m.from, to: m.to });
  }
  const why = v.why === null || v.why === undefined ? null : typeof v.why === "string" && v.why.length <= MAX_WHY ? v.why : undefined;
  if (why === undefined) return null;
  return { available: true, maxCourts: max as number, perCourt: v.perCourt, totals: [...v.totals], moves, why, qr };
}

/** One offer, or null. `known` is every courtId in the payload's own `courts`. */
export function parseOffer(v: unknown, known: ReadonlySet<string>): ExtendOffer | null {
  if (!isObj(v)) return null;
  const layout = v.layout;
  if (layout !== "one" && layout !== "multi" && layout !== "cards" && layout !== "cards-one-code") return null;
  if (typeof v.key !== "string" || !KEY.test(v.key)) return null;
  if (v.state !== "open" && v.state !== "paying") return null;
  if (v.basis !== "published" && v.basis !== "contract") return null;
  if (typeof v.date !== "string" || !DATE.test(v.date)) return null;
  const end = v.end;
  if (!Number.isInteger(end) || (end as number) < 1 || (end as number) > 1440) return null;
  const endsAt = instant(v.endsAt), opensAt = instant(v.opensAt), closesAt = instant(v.closesAt);
  if (![endsAt, opensAt, closesAt].every(Number.isFinite)) return null;
  // The window the platform writes, end − 10 to end + 5: anything else is not one.
  if (endsAt - opensAt !== 10 * MINUTE || closesAt - endsAt !== 5 * MINUTE) return null;
  /* date and end must name the instant endsAt, in the club's time — they are what the
     ON NOW entry is matched on. The minute before the end, so midnight (1440) lands on
     the booking's own date. */
  const last = clubNow(new Date(endsAt - MINUTE));
  if (last.date !== v.date || last.minutes + 1 !== end) return null;
  if (!Array.isArray(v.courts) || !v.courts.length || v.courts.length > MAX_COURTS) return null;
  const courts = v.courts;
  if (!courts.every((c) => typeof c === "string" && known.has(c)) || new Set(courts).size !== courts.length) return null;
  if (layout === "one" && courts.length !== 1) return null;
  const oneCode = layout === "cards-one-code";
  const qr = oneCode ? parseQr(v.qr) : null;
  if (oneCode && !qr) return null;
  if (!isObj(v.lengths)) return null;
  const m30 = parseLength(v.lengths.m30, courts, known, oneCode);
  const m60 = parseLength(v.lengths.m60, courts, known, oneCode);
  /* Both lengths are always sent, and at least one must be for sale. A new offer has both
     (Q2: a court free for the hour, and then 30 min too); a committed one may be left with
     one (see parseLength), drawn beside the other's reason — measured by scripts/tv-fit. */
  if (!m30 || !m60 || (!m30.available && !m60.available)) return null;
  return {
    key: v.key, layout, state: v.state, date: v.date, end: end as number,
    endsAt, opensAt, closesAt, basis: v.basis, courts: [...courts] as string[], qr, lengths: { m30, m60 },
  };
}

function parseMove(v: unknown, known: ReadonlySet<string>): ExtendMove | null {
  if (!isObj(v) || typeof v.date !== "string" || !DATE.test(v.date)) return null;
  if (!Number.isInteger(v.at) || (v.at as number) < 1 || (v.at as number) > 1440) return null;
  if (typeof v.from !== "string" || typeof v.to !== "string" || !known.has(v.from) || !known.has(v.to) || v.from === v.to) return null;
  return { date: v.date, at: v.at as number, from: v.from, to: v.to };
}

/**
 * A response's `extend`, checked — or null when the response has none or it is not the
 * shape at all, which means no offers. `courts` is the same response's court list.
 */
export function parseExtend(raw: unknown, courts: ReadonlyArray<{ id: string }>, receivedAt: number): ExtendView | null {
  if (!isObj(raw) || !Array.isArray(raw.offers) || !Array.isArray(raw.moves)) return null;
  const serverNow = instant(raw.now);
  if (!Number.isFinite(serverNow) || !Number.isFinite(receivedAt)) return null;
  const known = new Set(courts.map((c) => c.id));
  let offers = raw.offers.map((o) => parseOffer(o, known)).filter((o): o is ExtendOffer => o !== null);
  const layouts = new Set(offers.map((o) => o.layout));
  if (layouts.size > 1 || raw.offers.length > MAX_COURTS || (offers.length && offers.length > LAYOUT_MAX[offers[0].layout])) offers = [];
  // One offer per end and court: the same court twice in one panel is not a thing.
  const seen = new Set<string>();
  for (const o of offers) for (const c of o.courts) {
    const k = `${o.endsAt}|${c}`;
    if (seen.has(k)) offers = [];
    seen.add(k);
  }
  const keys = new Set(offers.map((o) => o.key));
  if (keys.size !== offers.length) offers = [];
  offers.sort((a, b) => a.endsAt - b.endsAt);
  const moves = raw.moves.map((m) => parseMove(m, known)).filter((m): m is ExtendMove => m !== null);
  return { offers, moves, serverNow, receivedAt };
}

/**
 * The badminton TV's poll (useCourtPanels with `extend`): each poll starts when the last one
 * is done, `delay()` after it — 15 s while offers are up, 60 s otherwise — so the pace can
 * follow the last answer. Returns the stop function.
 *
 * ⚠️ EVERY POLL IS GIVEN `timeoutMs` (review of PR #171). A chain waits for each poll, so
 * one request that never settles would stop it for good: no later poll, no stale dot, the
 * last answer on the wall indefinitely — where the 60 s interval every other screen keeps
 * simply fires again. `load` passes the signal to its fetch; a stalled request is aborted,
 * lands in load's own catch (which sets stale), and the chain goes on.
 */
export function pollLoop({ load, delay, timeoutMs = EXTEND_POLL_TIMEOUT_MS }: {
  load: (signal: AbortSignal) => Promise<unknown>;
  delay: () => number;
  timeoutMs?: number;
}): () => void {
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    try { await load(AbortSignal.timeout(timeoutMs)); } catch { /* load records its own failures */ }
    if (alive) timer = setTimeout(run, delay());
  };
  run();
  return () => { alive = false; clearTimeout(timer); };
}

/** One sport's share of an answer: offers whose courts are all this sport's, and moves
 *  off its courts. The panel of one sport never draws another's offer. */
export function forSport(v: ExtendView, ids: ReadonlySet<string>): ExtendView {
  return {
    ...v,
    offers: v.offers.filter((o) => o.courts.every((c) => ids.has(c))),
    moves: v.moves.filter((m) => ids.has(m.from) && ids.has(m.to)),
  };
}

/** Does this answer still count (§10.8)? Not stale, at most 90 s old, and this TV's
 *  clock was within 60 s of the server's when it arrived. */
export function extendFresh(v: ExtendView, nowMs: number, stale: boolean): boolean {
  return !stale
    && nowMs - v.receivedAt <= EXTEND_FRESH_MS
    && Math.abs(v.receivedAt - v.serverNow) <= EXTEND_SKEW_MS;
}

/** The offers to draw this second, earliest end first: [] when there are none, the
 *  answer is not fresh, or none is inside its window. */
export function drawnOffers(v: ExtendView | null | undefined, nowMs: number, stale: boolean): ExtendOffer[] {
  if (!v || !extendFresh(v, nowMs, stale)) return [];
  return v.offers.filter((o) => o.opensAt <= nowMs && nowMs < o.closesAt);
}

/** The moves to draw this second: a fresh answer's, from `at` to `at` + 5 min — judged
 *  by the caller, which has the entry's own end. */
export function liveMoves(v: ExtendView | null | undefined, nowMs: number, stale: boolean): ExtendMove[] {
  return v && extendFresh(v, nowMs, stale) ? v.moves : [];
}

/** The offer drawn for an ON NOW entry: the same club-local date, the entry's end equal
 *  to the offer's, and a court in common (§10.2). Never by holder — on a names-off
 *  screen a holder may be ''. `labelOf` maps the offer's courtIds to the entry's labels. */
export function offerForEntry(
  offers: readonly ExtendOffer[],
  e: { date: string; to: number; courts: readonly string[] },
  labelOf: (courtId: string) => string,
): ExtendOffer | null {
  return offers.find((o) => o.date === e.date && o.end === e.to && o.courts.some((c) => e.courts.includes(labelOf(c)))) ?? null;
}

/* ── WHAT THE PANEL SAYS ─────────────────────────────────────────────────────
   Everything below turns the drawn offers into words, so the wording is pinned by
   node:test and the component only lays it out. The words are the approved mock-ups'
   (orangish-app docs/court-extend.md §10.4–§10.5; tvb.mjs, inject-b.js, tv-move.png,
   tv-timeup.png), except where a face was never drawn there — then it says so. */

/** "$22.50", "$45": whole dollars without the cents. */
export function money(c: number): string {
  return c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`;
}

/** "2:00" — always the minutes, unlike board-lib's clock(), because a price is for a
 *  stretch of time and "2 – 2:30" reads like a typo. */
export function hm(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h12 = Math.floor(m / 60) % 12 || 12;
  return `${h12}:${String(m % 60).padStart(2, "0")}`;
}
const ampm = (min: number) => (((min % 1440) + 1440) % 1440 < 720 ? "AM" : "PM");
/** "2:00 PM". */
export const hmA = (min: number) => `${hm(min)} ${ampm(min)}`;
/** "2:00 – 2:30 PM", the meridiem once when both ends share it. */
export function spanA(from: number, to: number): string {
  return ampm(from) === ampm(to) ? `${hm(from)} – ${hmA(to)}` : `${hmA(from)} – ${hmA(to)}`;
}
/** "2:00–2:30", for the table heads and the cards, as on the mock-up. */
export const spanTight = (from: number, to: number) => `${hm(from)}–${hm(to)}`;

const courtsWord = (n: number) => (n === 1 ? "1 court" : `${n} courts`);
const byNumber = (a: string, b: string) => Number(a) - Number(b) || a.localeCompare(b);

export type Tone = "orange" | "red";
export type Line = { text: string; accent?: string; tail?: string };
/* A tile, code tile or card option for a length that is not for sale (a committed offer
   whose other length is still on): `qr` null, no price, and `why` says why. */
export type Tile = { key: string; qr: Qr | null; what: string; when: string; price: string; agreed: boolean; why: string | null };
export type TableCell = { price: string } | { why: string };
export type CodeTile = { key: string; qr: Qr | null; what: string; lines: string[] };
export type CardOpt = { key: string; qr: Qr | null; what: string; price: string; agreed: boolean; when: string; why: string | null };
export type Card = { key: string; name: string; small: string; paying: boolean; opts: CardOpt[] };
export type OneCodeCard = { key: string; qr: Qr; name: string; small: string; prices: Array<{ what: string; price: string }> | null; line: string; paying: boolean };

export type PanelFace =
  | { layout: "one"; tone: Tone; chip: string; h1: string; h2: Line; paying: boolean; tiles: Tile[]; foot: string }
  | { layout: "multi"; tone: Tone; chip: string; h1: string; h2: Line; paying: boolean; heads: string[] | null; rows: Array<{ n: string; cells: TableCell[] }>; agreed: string | null; codes: CodeTile[] }
  | { layout: "cards"; tone: Tone; h1: string; h2: Line; cards: Card[] }
  | { layout: "cards-one-code"; tone: Tone; h1: string; cards: OneCodeCard[] };

/**
 * The panel's face for the offers drawn this second (drawnOffers). `labelOf` names a
 * courtId ("2"); `noun` is COURT (LANE, should cricket ever get offers).
 * Returns null when nothing is drawn.
 */
export function panelFace(
  drawn: readonly ExtendOffer[],
  nowMs: number,
  labelOf: (courtId: string) => string,
  noun = "COURT",
): PanelFace | null {
  if (!drawn.length) return null;
  const Noun = noun[0] + noun.slice(1).toLowerCase();
  const labels = (ids: readonly string[]) => ids.map(labelOf).sort(byNumber);
  const lens = [["m30", 30, "30 MIN"], ["m60", 60, "1 HOUR"]] as const;

  const ended = (o: ExtendOffer) => nowMs >= o.endsAt;
  const allEnded = drawn.every(ended);
  /* Red only for an OPEN offer past its end (§10.4): never before the end, never while
     someone is paying — PAYMENT IN PROGRESS is not an alarm. */
  const tone: Tone = allEnded && drawn.some((o) => o.state === "open") ? "red" : "orange";
  // Minutes to the earliest end still to come: rounded up, never 0 (nudgeFace's rule).
  const coming = drawn.filter((o) => !ended(o));
  const min = coming.length ? Math.max(1, Math.ceil((Math.min(...coming.map((o) => o.endsAt)) - nowMs) / MINUTE)) : 0;
  const timeUp = "YOUR TIME IS UP";
  const closes = (o: ExtendOffer) => hm(clubNow(new Date(o.closesAt)).minutes);
  const scanNow = (o: ExtendOffer): Line => ({ text: `Scan now to keep playing · open until ${closes(o)}` });
  const payingLine: Line = { text: "PAYMENT IN PROGRESS" };
  const agreed = (o: ExtendOffer) => o.basis === "contract";
  /** The lengths still for sale, in order. */
  const forSale = (o: ExtendOffer) => lens.filter(([k]) => o.lengths[k].available);
  /** Where a length continues, as labels: "3", or "" when it stays put (or is not for sale:
   *  an unavailable length carries no moves). */
  const target = (l: ExtendLength) => [...new Set(l.moves.map((m) => labelOf(m.to)))].sort(byNumber).join(", ");
  /** "COURT 2 → 3" for a card or a code tile; "" when nothing moves. */
  const moveNote = (l: ExtendLength) =>
    l.moves.length
      ? `${noun}${l.moves.length > 1 ? "S" : ""} ${l.moves.map((m) => `${labelOf(m.from)} → ${labelOf(m.to)}`).join(" · ")}`
      : "";

  if (drawn[0].layout === "one") {
    const o = drawn[0];
    const own = labelOf(o.courts[0]);
    const t30 = target(o.lengths.m30), t60 = target(o.lengths.m60);
    /* THE MOVE FACE (Q20; tv-move.png): the booker's own court is taken from the end
       and another is free, so both lengths continue elsewhere. The TV never offers to
       stay on a taken court. When only the hour moves, the court is free for 30 min
       and taken after: the ordinary face, with the hour's tile naming its court. */
    const move = !!t30 && !!t60;
    const same = move && t30 === t60;
    const h2: Line = o.state === "paying" ? payingLine
      : ended(o) ? (move ? (same ? { text: "Keep playing on ", accent: `${Noun} ${t30}`, tail: ` · open until ${closes(o)}` } : { text: `Keep playing on another ${noun.toLowerCase()} · open until ${closes(o)}` }) : scanNow(o))
      : move ? (same ? { text: "Keep playing on ", accent: `${Noun} ${t30}`, tail: "?" } : { text: `Keep playing on another ${noun.toLowerCase()}?` })
      : { text: "Do you wish to extend?" };
    const tiles: Tile[] = lens.map(([k, L, w]) => {
      const l = o.lengths[k];
      const to = target(l);
      if (!l.available) return { key: `${o.key}-${L}`, qr: null, what: `EXTEND ${w}`, when: "", price: "", agreed: false, why: l.why };
      return {
        key: `${o.key}-${L}`, qr: l.qr,
        what: to ? `${w} · ${noun} ${to}` : `EXTEND ${w}`,
        when: spanA(o.end, o.end + L),
        price: agreed(o) ? "AGREED RATE" : money(l.totals[0]),
        agreed: agreed(o), why: null,
      };
    });
    /** One length alone moves (the other stays, or is not for sale): its tile names the
     *  court, and the foot says it. */
    const lone = forSale(o).filter(([k]) => target(o.lengths[k]));
    const foot = move
      ? ended(o) && same ? `The extension starts at ${hm(o.end)} on ${Noun} ${t30}, so the next players can start on ${Noun} ${own}`
        : same ? `Move to ${Noun} ${t30} at ${hm(o.end)} so the next players can start on ${Noun} ${own}`
        : `Move at ${hm(o.end)} so the next players can start on ${Noun} ${own}`
      : ended(o) ? `The extension starts at ${hm(o.end)}, when your booking ended`
      : agreed(o) ? `Scan to see your agreed rate · pay by card · stay on ${Noun} ${own}`
      : lone.length === 1 ? `Scan with your phone camera · pay by card · ${lone[0][2].toLowerCase()} is on ${Noun} ${target(o.lengths[lone[0][0]])}`
      : `Scan with your phone camera · pay by card · stay on ${Noun} ${own}`;
    return {
      layout: "one", tone, chip: `${noun} ${own}`,
      h1: ended(o) ? timeUp : move ? `IS BOOKED FROM ${hm(o.end)}` : `BOOKING ENDS IN ${min} MIN`,
      h2, paying: o.state === "paying", tiles, foot,
    };
  }

  if (drawn[0].layout === "multi") {
    const o = drawn[0];
    const n = o.courts.length;
    const h2: Line = o.state === "paying" ? payingLine : ended(o) ? scanNow(o) : { text: "Do you wish to extend?" };
    /* The price table (decision 1): one row per number of courts, a column per length.
       A row past a length's maxCourts shows the server's reason once, then a dash. */
    const rows = Array.from({ length: n }, (_, i) => ({
      n: courtsWord(i + 1),
      cells: lens.map(([k]): TableCell => {
        const l = o.lengths[k];
        if (i < l.maxCourts) return { price: money(l.totals[i]) };
        return { why: i === l.maxCourts && l.why ? l.why : "—" };
      }),
    }));
    return {
      layout: "multi", tone,
      chip: `${noun}${n > 1 ? "S" : ""} ${labels(o.courts).join(" · ")}`,
      h1: ended(o) ? timeUp : `END${n > 1 ? "" : "S"} IN ${min} MIN`,
      h2, paying: o.state === "paying",
      // Contract (Q4): no figures on the wall. One line in place of the table.
      heads: agreed(o) ? null : lens.map(([, L, w]) => `${w} · ${spanTight(o.end, o.end + L)}`),
      rows: agreed(o) ? [] : rows,
      agreed: agreed(o) ? "AGREED RATE · scan to see" : null,
      codes: lens.map(([k, L, w]) => {
        const l = o.lengths[k];
        if (!l.available) return { key: `${o.key}-${L}`, qr: null, what: w, lines: [l.why ?? ""] };
        const note = moveNote(l);
        return {
          key: `${o.key}-${L}`, qr: l.qr, what: w,
          lines: [l.maxCourts === 1 ? "1 court" : `up to ${courtsWord(l.maxCourts)}`, "pick on phone", ...(note ? [note] : [])],
        };
      }),
    };
  }

  const count = drawn.length;
  const h1 = allEnded ? timeUp : `${count === 1 ? "BOOKING ENDS" : `${count} BOOKINGS END`} IN ${min} MIN`;
  /** A card's court label: "COURT 1", "COURTS 2 + 3", or "COURT 2 → 3" when both lengths
   *  continue on the same other courts (§10.5). */
  const cardName = (o: ExtendOffer) => {
    const a = moveNote(o.lengths.m30), b = moveNote(o.lengths.m60);
    if (a && a === b) return a;
    const ls = labels(o.courts);
    return `${noun}${ls.length > 1 ? "S" : ""} ${ls.join(" + ")}`;
  };
  /** The small print after a card's label. On 'cards' it is also where PAYMENT IN
   *  PROGRESS goes; a 'cards-one-code' card has its own line for that. */
  const small = (o: ExtendOffer, extra: string, paying: boolean) =>
    paying ? "PAYMENT IN PROGRESS"
      : ended(o) ? `ended ${hm(o.end)} · open until ${closes(o)}`
      : `ends ${hmA(o.end)}${extra}`;

  if (drawn[0].layout === "cards") {
    const cards: Card[] = drawn.map((o) => {
      const n = o.courts.length;
      const full = o.lengths.m30.maxCourts === n && o.lengths.m60.maxCourts === n;
      const a = moveNote(o.lengths.m30), b = moveNote(o.lengths.m60);
      return {
        key: o.key, name: cardName(o), paying: o.state === "paying",
        small: small(o, n > 1 && full ? ` · price for ${n} courts, pick on phone` : n > 1 ? " · pick courts on phone" : "", o.state === "paying"),
        opts: lens.map(([k, L, w]): CardOpt => {
          const l = o.lengths[k];
          if (!l.available) return { key: `${o.key}-${L}`, qr: null, what: w, price: "", agreed: false, when: "", why: l.why };
          const to = target(l);
          const bits = [spanTight(o.end, o.end + L)];
          if (n > 1 && l.maxCourts < n) bits.push(courtsWord(l.maxCourts));
          if (to && a !== b) bits.push(`${noun} ${to}`);
          return {
            key: `${o.key}-${L}`, qr: l.qr, what: w,
            price: agreed(o) ? "AGREED RATE" : money(l.totals[l.maxCourts - 1]), agreed: agreed(o),
            when: bits.join(" · "), why: null,
          };
        }),
      };
    });
    return {
      layout: "cards", tone, h1,
      h2: allEnded ? scanNow(drawn[0]) : { text: "Do you wish to extend?" },
      cards,
    };
  }

  // 'cards-one-code' (decision 3): one code per booking, the length picked on the phone.
  return {
    layout: "cards-one-code", tone, h1,
    cards: drawn.map((o) => {
      // Only the lengths still for sale: the phone says why the other is not.
      const sale = forSale(o);
      const pick = sale.length === 2 ? "pick 30 min or 1 hour" : `extend ${sale[0][2].toLowerCase()}`;
      return {
        key: o.key, qr: o.qr as Qr, name: cardName(o), paying: o.state === "paying",
        small: small(o, "", false),
        // A contract's card says AGREED RATE where the prices go, as every other layout does.
        prices: agreed(o) ? null : sale.map(([k, , w]) => ({ what: w, price: money(o.lengths[k].totals[o.lengths[k].maxCourts - 1]) })),
        line: o.state === "paying" ? "PAYMENT IN PROGRESS" : agreed(o) ? `scan to see it, then ${pick}` : `scan, then ${pick}`,
      };
    }),
  };
}
