"use client";

import { motion } from "framer-motion";

export default function About() {
  return (
    <section
      id="about"
      className="relative px-4 sm:px-6 md:px-12 py-16 md:py-24"
    >
      <div className="mx-auto max-w-[1280px] grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Copy column */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-cond-md text-[0.74rem] text-[var(--color-ember)] mb-3.5">
            Exton, PA · open 24/7
          </div>
          <h2
            className="text-cond text-white mb-5"
            style={{ fontSize: "clamp(2.4rem, 4vw, 3.4rem)" }}
          >
            More than a gym.
            <br />
            A <span className="text-[var(--color-ember)]">full sports club</span>.
          </h2>
          <p className="text-white/60 text-[0.94rem] leading-[1.7] mb-3 max-w-[48ch]">
            Exton Sports Center is a multi-sport facility in
            Chester County — cricket, squash, badminton and indoor turf under
            one roof, open round the clock.
          </p>

          <dl className="mt-6 pt-5 border-t border-[var(--color-line-2)] grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
            <dt className="text-mono text-[0.7rem] text-white/35">Address</dt>
            <dd className="text-white/80 text-[0.92rem]">
              4 Tabas Lane, Building&nbsp;2 · Exton, PA 19341
              <br /><span className="text-white/50 text-[0.82rem]">Opposite Apna Bazar</span>
            </dd>
            <dt className="text-mono text-[0.7rem] text-white/35">Phone</dt>
            <dd className="text-white/80 text-[0.92rem]">
              <a
                href="tel:6096190999"
                className="hover:text-[var(--color-ember)] transition"
              >
                609-619-0999
              </a>
            </dd>
            <dt className="text-mono text-[0.7rem] text-white/35">Email</dt>
            <dd className="text-white/80 text-[0.92rem]">
              <a
                href="mailto:info@extonsports.com"
                className="hover:text-[var(--color-ember)] transition"
              >
                info@extonsports.com
              </a>
            </dd>
            <dt className="text-mono text-[0.7rem] text-white/35">Hours</dt>
            <dd className="text-white/80 text-[0.92rem]">
              Open 24/7 · members and guests only
            </dd>
          </dl>

          <a
            href="https://maps.app.goo.gl/t35BeZFRtdmZeLuo9"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 mt-7 border-2 border-white/30 hover:border-[var(--color-ember)] text-white text-cond-md text-[0.85rem] no-underline transition"
            style={{ padding: "10px 24px" }}
          >
            Get directions →
          </a>

        </motion.div>

        {/* Visual column — floor plan with animated smileys */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.7 }}
          className="relative border border-[var(--color-line-2)] overflow-hidden"
          style={{
            height: "min(420px, 80vw)",
            background:
              "linear-gradient(135deg, rgba(248,155,114,0.16) 0%, rgba(0,0,0,0) 60%), radial-gradient(120% 80% at 100% 100%, rgba(248,155,114,0.18) 0%, transparent 70%), #0F0F0F",
          }}
        >
          <FloorPlan />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Facility floor plan SVG ─────────────────────────────────────
   Top-left:    4 squash courts (1×4 row)   — 32ft long, 21ft wide
   Top-right:   3 badminton courts (1×3)    — 40ft long, 20ft wide
   Bottom:      2 cricket lanes spanning ~80% of width (the multi-use
                turf surface; running lanes are described in the Sports
                section copy rather than overlaid here)
   Bottom-right corner: locker room
   viewBox 600×420 — fills the dark visual panel.
─────────────────────────────────────────────────────────────────── */
function FloorPlan() {
  const line = "rgba(248,155,114,0.42)";
  const lineSoft = "rgba(248,155,114,0.22)";
  const lineThick = "rgba(248,155,114,0.6)";
  const accent = "rgba(248,155,114,0.85)";
  const lbl = "rgba(248,155,114,0.85)";
  const sw = 1.1;
  const swThin = 0.8;

  return (
    <svg
      aria-hidden
      viewBox="0 0 600 420"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      {/* Outer building outline */}
      <rect
        x="14" y="14" width="572" height="392"
        stroke={lineThick} strokeWidth={1.4} fill="none"
      />
      {/* Internal walls: symmetric horizontal at y=216 splits top/bottom;
          vertical at x=320 splits top half into squash (4, wider) + badminton (3, narrower);
          vertical at x=320 also marks right edge of cricket zone in bottom half;
          vertical at x=470 carves the locker corner out of the bottom.  */}
      <line x1="320" y1="14"  x2="320" y2="406" stroke={lineThick} strokeWidth={1.4} />
      <line x1="14"  y1="216" x2="586" y2="216" stroke={lineThick} strokeWidth={1.4} />
      <line x1="470" y1="216" x2="470" y2="406" stroke={lineThick} strokeWidth={1.4} />

      {/* ──────── ZONE 1 — top-left, 4 SQUASH courts ──────── */}
      {/* 32ft long × 21ft wide. Scale: 74px wide × 120px tall.               */}
      <text x="22" y="34" fill={lbl} fontSize="9" fontFamily="var(--font-body)" letterSpacing="2" fontWeight="700">
        01 · 4 SQUASH COURTS · ALL-GLASS
      </text>
      {[16, 92, 168, 244].map((cx, i) => {
        const cy = 48; const cw = 74; const ch = 120;
        return (
          <g key={i}>
            <rect x={cx} y={cy} width={cw} height={ch} stroke={line} strokeWidth={sw} fill="none" />
            {/* TIN bar — front wall (top) */}
            <rect x={cx} y={cy} width={cw} height={4} stroke="none" fill={accent} />
            {/* Short line — 56% down */}
            <line x1={cx} y1={cy+67} x2={cx+cw} y2={cy+67} stroke={line} strokeWidth={sw} />
            {/* Half-court line — short line to back wall */}
            <line x1={cx+37} y1={cy+67} x2={cx+37} y2={cy+ch} stroke={line} strokeWidth={sw} />
            {/* Service boxes */}
            <rect x={cx}    y={cy+67} width="17" height="17" stroke={line} strokeWidth={swThin} fill="none" />
            <rect x={cx+57} y={cy+67} width="17" height="17" stroke={line} strokeWidth={swThin} fill="none" />
          </g>
        );
      })}

      {/* ──────── ZONE 2 — top-right, 3 BADMINTON courts ──────── */}
      {/* 40ft long × 20ft wide. Scale: 64px wide × 150px tall.               */}
      <text x="328" y="34" fill={lbl} fontSize="9" fontFamily="var(--font-body)" letterSpacing="2" fontWeight="700">
        02 · 3 BADMINTON COURTS
      </text>
      {/* Court: 13.4m long × 6.1m wide. Scale: 64px wide × 150px tall.
          Net at cy+75. Short svc → cy+53 / cy+97. Long svc → cy+8 / cy+142.
          Singles sideline 5px inside → cx+5 / cx+59. Centre svc → cx+32. */}
      {[336, 420, 504].map((cx, i) => {
        const cy = 46; const cw = 64; const ch = 150;
        return (
          <g key={i}>
            <rect x={cx} y={cy} width={cw} height={ch} stroke={line} strokeWidth={sw} fill="none" />
            {/* Singles sidelines */}
            <line x1={cx+5}  y1={cy} x2={cx+5}  y2={cy+ch} stroke={lineSoft} strokeWidth={swThin} />
            <line x1={cx+59} y1={cy} x2={cx+59} y2={cy+ch} stroke={lineSoft} strokeWidth={swThin} />
            {/* Net — thick at exact centre */}
            <line x1={cx} y1={cy+75} x2={cx+cw} y2={cy+75} stroke={lineThick} strokeWidth={sw + 0.8} />
            {/* Short service lines */}
            <line x1={cx} y1={cy+53} x2={cx+cw} y2={cy+53} stroke={line} strokeWidth={sw} />
            <line x1={cx} y1={cy+97} x2={cx+cw} y2={cy+97} stroke={line} strokeWidth={sw} />
            {/* Long service lines (doubles) */}
            <line x1={cx} y1={cy+8}   x2={cx+cw} y2={cy+8}   stroke={lineSoft} strokeWidth={swThin} />
            <line x1={cx} y1={cy+142} x2={cx+cw} y2={cy+142} stroke={lineSoft} strokeWidth={swThin} />
            {/* Centre service lines */}
            <line x1={cx+32} y1={cy}     x2={cx+32} y2={cy+53} stroke={lineSoft} strokeWidth={swThin} />
            <line x1={cx+32} y1={cy+97}  x2={cx+32} y2={cy+ch} stroke={lineSoft} strokeWidth={swThin} />
          </g>
        );
      })}

      {/* ──────── ZONE 3 — bottom-left, 3 CRICKET LANES spanning squash zone width ──────── */}
      {/* 3 lanes × 48px tall, spanning x=22 to x=314 (matches 4 squash courts width). */}
      <text x="22" y="234" fill={lbl} fontSize="9" fontFamily="var(--font-body)" letterSpacing="2" fontWeight="700">
        03 · 3 CRICKET LANES
      </text>
      {[246, 298, 350].map((ly, i) => {
        const lx = 22; const lw = 292; const lh = 46;
        return (
          <g key={i}>
            {/* Lane outer boundary */}
            <rect x={lx} y={ly} width={lw} height={lh} stroke={line} strokeWidth={sw} fill="none" />
            {/* Pitch strip — center 55% of lane length, shaded */}
            <rect x={lx+16} y={ly+14} width={162} height={18}
              stroke={lineSoft} strokeWidth={swThin} fill="rgba(248,155,114,0.06)" />
            {/* Left popping crease */}
            <line x1={lx+32} y1={ly+8} x2={lx+32} y2={ly+38} stroke={line} strokeWidth={sw} />
            {/* Left wickets */}
            <g stroke={line} strokeWidth={sw}>
              <line x1={lx+18} y1={ly+19} x2={lx+30} y2={ly+19} />
              <line x1={lx+18} y1={ly+23} x2={lx+30} y2={ly+23} />
              <line x1={lx+18} y1={ly+27} x2={lx+30} y2={ly+27} />
            </g>
            {/* Right popping crease */}
            <line x1={lx+178} y1={ly+8} x2={lx+178} y2={ly+38} stroke={line} strokeWidth={sw} />
            {/* Right wickets */}
            <g stroke={line} strokeWidth={sw}>
              <line x1={lx+180} y1={ly+19} x2={lx+192} y2={ly+19} />
              <line x1={lx+180} y1={ly+23} x2={lx+192} y2={ly+23} />
              <line x1={lx+180} y1={ly+27} x2={lx+192} y2={ly+27} />
            </g>
            {/* Bowler run-up arrow — right side, pointing left */}
            <g stroke={lineSoft} strokeWidth={swThin}>
              <line x1={lx+280} y1={ly+23} x2={lx+200} y2={ly+23} strokeDasharray="3 3" />
              <line x1={lx+206} y1={ly+19} x2={lx+200} y2={ly+23} />
              <line x1={lx+206} y1={ly+27} x2={lx+200} y2={ly+23} />
            </g>
          </g>
        );
      })}

      {/* ──────── ZONE 4 — bottom-right, LOCKERS + ENTRANCE ALLEY ──────── */}
      <text x="478" y="234" fill={lbl} fontSize="9" fontFamily="var(--font-body)" letterSpacing="2" fontWeight="700">
        04 · LOCKERS
      </text>
      <g>
        {/* outer locker room — narrower, left-aligned; alley on the right */}
        <rect x="478" y="244" width="66" height="156" stroke={line} strokeWidth={sw} fill="none" />
        {/* vertical aisle divider — 2 columns of lockers */}
        <line x1="511" y1="244" x2="511" y2="400" stroke={lineSoft} strokeWidth={swThin} />
        {/* horizontal dividers between locker rows (5 rows) */}
        {[275, 306, 337, 368].map((y) => (
          <line key={y} x1="478" y1={y} x2="544" y2={y} stroke={lineSoft} strokeWidth={swThin} />
        ))}
        {/* small dots marking locker handles */}
        {[259.5, 290.5, 321.5, 352.5, 383.5].flatMap((y) =>
          [494.5, 527.5].map((x) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill={lineSoft} />
          ))
        )}
      </g>

      {/* Entrance alley — entrance is at the BOTTOM RIGHT */}
      <g>
        {/* "ENTRANCE" label rotated vertically along the alley */}
        <text
          x="0"
          y="0"
          fill={lbl}
          fontSize="8"
          fontFamily="var(--font-body)"
          letterSpacing="3"
          fontWeight="700"
          transform="translate(566, 360) rotate(-90)"
        >
          ENTRANCE
        </text>
        {/* Arrow pointing LEFT into the building from the lower-right wall */}
        <g stroke={accent} strokeWidth={sw} fill="none">
          <line x1="582" y1="382" x2="552" y2="382" />
          <line x1="558" y1="378" x2="552" y2="382" />
          <line x1="558" y1="386" x2="552" y2="382" />
        </g>
        {/* Door — small break in the RIGHT wall at the lower portion */}
        <line x1="586" y1="368" x2="586" y2="396" stroke="var(--color-void)" strokeWidth={3} />
      </g>

      {/* ──────── PEOPLE — animated overlay (SMIL, additive="sum") ──────── */}

      {/* SQUASH (left zone) — pink smileys. 4 courts, 74×120px each. */}
      {[16, 92, 168, 244].map((cx, i) => {
        const cy = 48; const ch = 120;
        const tY = cy + ch * 0.55;
        const bY = cy + ch * 0.85;
        const px = cx + 37;
        const d = i * 0.7;
        return (
          <g key={`sq-${i}`}>
            <Smiley x={px - 10} y={tY} color="#FFA8D0"
              values="0,0; 20,-18; -16,-22; 16,12; -8,-6; 0,0"
              dur={4.2} delay={d} phase={i * 3 + 1} />
            <Smiley x={px + 10} y={bY} color="#FFA8D0"
              values="0,0; -16,7; 14,-12; -12,9; 8,-5; 0,0"
              dur={4.2} delay={d + 0.6} phase={i * 3 + 9} />
          </g>
        );
      })}

      {/* BADMINTON (right zone) — yellow smileys. 3 courts, 64×150px, all doubles. */}
      {[336, 420, 504].map((cx, i) => {
        const cy = 46;
        const ch = 150;
        const topY = cy + ch * 0.30;
        const botY = cy + ch * 0.70;
        const px = cx + 32;
        const d = i * 0.55;
        const isDoubles = true;

        return (
          <g key={`bad-${i}`}>
            {isDoubles ? (
              /* Doubles — 2 on each side, offset ±9 horizontally.
                 Wider movement values so players roam the full half-court. */
              <>
                {/* Top-left — moves toward net and back boundary */}
                <Smiley x={px - 9} y={topY} color="#FFE066"
                  values="0,0; 14,-22; -18,-10; 20,18; -10,-28; 0,0"
                  dur={3.6} delay={d} phase={i * 4} />
                {/* Top-right — mirrors across centre */}
                <Smiley x={px + 9} y={topY} color="#FFE066"
                  values="0,0; -16,-18; 18,-24; -14,20; 12,-14; 0,0"
                  dur={3.6} delay={d + 0.35} phase={i * 4 + 3} />
                {/* Bottom-left */}
                <Smiley x={px - 9} y={botY} color="#FFE066"
                  values="0,0; -18,22; 16,18; -20,-18; 10,26; 0,0"
                  dur={3.6} delay={d + 0.7} phase={i * 4 + 6} />
                {/* Bottom-right */}
                <Smiley x={px + 9} y={botY} color="#FFE066"
                  values="0,0; 16,20; -18,24; 14,-20; -12,16; 0,0"
                  dur={3.6} delay={d + 1.05} phase={i * 4 + 9} />
              </>
            ) : (
              /* Singles — 1 per side (court 4), wider range */
              <>
                <Smiley x={px} y={topY} color="#FFE066"
                  values="0,0; 20,-24; -20,-14; 18,20; -16,-18; 0,0"
                  dur={3.8} delay={d} phase={12} />
                <Smiley x={px} y={botY} color="#FFE066"
                  values="0,0; -20,24; 18,14; -16,-22; 14,18; 0,0"
                  dur={3.8} delay={d + 0.5} phase={0} />
              </>
            )}
          </g>
        );
      })}


      {/* CRICKET — orange bowler runs up and back; blue batsman holds position with bat swing */}
      {[
        { x: 22, y: 246 },
        { x: 22, y: 298 },
        { x: 22, y: 350 },
      ].map((c, i) => {
        const midY = c.y + 23;
        const bowlerStartX = c.x + 280;
        const batsmanX = c.x + 40;
        const d = i * 1.4;
        return (
          <g key={`cri-${i}`}>
            {/* Far-left fielder — stands behind the batsman's end wall */}
            <Smiley x={c.x + 10} y={midY} color="#6BCEF5"
              values="0,0; 2,-3; -2,2; 1,-2; 0,0"
              dur={5.8} delay={d + 0.8} phase={i * 4 + 13} />
            <Smiley x={batsmanX} y={midY} color="#6BCEF5"
              values="0,0; 0,0; 0,0; -2,-2; 0,0; 0,0"
              keyTimes="0; 0.5; 0.7; 0.78; 0.84; 1"
              dur={4.6} delay={d} phase={i * 4 + 2} />
            <Smiley x={bowlerStartX} y={midY} color="#FFB259"
              values="0,0; -88,0; -92,-2; -92,2; -68,0; -34,0; 0,0"
              keyTimes="0; 0.45; 0.48; 0.51; 0.65; 0.82; 1"
              dur={4.6} delay={d} phase={i * 4 + 9} />
          </g>
        );
      })}

      {/* ──────── TRAFFIC — 2 entering, 2 leaving via the lower-right door ──────── */}

      {/* ENTERING A — outside → into alley → drifts up */}
      <g transform="translate(606, 382)">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.05;0.10;0.80;0.90;1" dur="11s" begin="0s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="0,0; -46,0; -46,-60; -46,-60" keyTimes="0;0.25;0.75;1" dur="11s" begin="0s" repeatCount="indefinite" />
        <TrafficFace />
      </g>

      {/* ENTERING B — staggered */}
      <g transform="translate(606, 385)">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.05;0.10;0.80;0.90;1" dur="11s" begin="-5.5s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="0,0; -46,0; -46,-58; -46,-58" keyTimes="0;0.25;0.75;1" dur="11s" begin="-5.5s" repeatCount="indefinite" />
        <TrafficFace />
      </g>

      {/* LEAVING A — alley → walks down → exits right */}
      <g transform="translate(560, 292)">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.06;0.12;0.82;0.92;1" dur="10s" begin="-2s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="0,0; 0,90; 48,90; 48,90" keyTimes="0;0.50;0.80;1" dur="10s" begin="-2s" repeatCount="indefinite" />
        <TrafficFace />
      </g>

      {/* LEAVING B — staggered */}
      <g transform="translate(558, 300)">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.06;0.12;0.82;0.92;1" dur="10s" begin="-7s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="0,0; 0,82; 48,82; 48,82" keyTimes="0;0.50;0.80;1" dur="10s" begin="-7s" repeatCount="indefinite" />
        <TrafficFace />
      </g>

    </svg>
  );
}

/* Traffic smiley — matches court player size (20% reduced) */
function TrafficFace() {
  return (
    <>
      <circle cx="0" cy="0" r="8.16" fill="#FBB28C" stroke="#0A0A0A" strokeWidth="0.84" />
      <circle cx="-2.64" cy="-1.68" r="1.08" fill="#0A0A0A" />
      <circle cx=" 2.64" cy="-1.68" r="1.08" fill="#0A0A0A" />
      <path d="M -3.6,1.44 Q 0,4.56 3.6,1.44" stroke="#0A0A0A" strokeWidth="0.96" fill="none" strokeLinecap="round" />
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Smiley — moves AND cycles 7 expressions every 14 s.
   additive="sum"  = animation translates relative to outer <g> position.
   phase offset    = stagger so every player shows a different face.
─────────────────────────────────────────────────────────────────── */
/* ── Sub-components defined at module level (not inside render) ── */
function smFa(n: number) {
  const s = (n / 7).toFixed(4);
  const e = ((n + 1) / 7).toFixed(4);
  if (n === 0) return { values: "1;1;0;0",     keyTimes: `0;${e};${e};1` };
  if (n === 6) return { values: "0;0;1;1",     keyTimes: `0;${s};${s};1` };
  return            { values: "0;0;1;1;0;0", keyTimes: `0;${s};${s};${e};${e};1` };
}

function Exp({ n, cyc, begin, children }: { n: number; cyc: string; begin: string; children: React.ReactNode }) {
  const a = smFa(n);
  return (
    <g>
      <animate attributeName="opacity" values={a.values} keyTimes={a.keyTimes}
        dur={cyc} begin={begin} repeatCount="indefinite" />
      {children}
    </g>
  );
}

function NE() { return (<><circle cx="-2.64" cy="-1.68" r="1.08" fill="#0A0A0A"/><circle cx="2.64" cy="-1.68" r="1.08" fill="#0A0A0A"/></>); }
function BE() { return (<><circle cx="-2.64" cy="-2.24" r="1.6" fill="#0A0A0A"/><circle cx="2.64" cy="-2.24" r="1.6" fill="#0A0A0A"/><circle cx="-2.16" cy="-2.56" r="0.56" fill="white"/><circle cx="2.16" cy="-2.56" r="0.56" fill="white"/></>); }
function SE() { return (<><path d="M -4.16,-2.24 Q -2.64,-0.8 -1.12,-2.24" stroke="#0A0A0A" strokeWidth="1.12" fill="none" strokeLinecap="round"/><path d="M 1.12,-2.24 Q 2.64,-0.8 4.16,-2.24" stroke="#0A0A0A" strokeWidth="1.12" fill="none" strokeLinecap="round"/></>); }

function Smiley({
  x, y, color, values, keyTimes, dur = 3.4, delay = 0, phase = 0,
}: {
  x: number; y: number; color: string; values: string;
  keyTimes?: string; dur?: number; delay?: number; phase?: number;
}) {
  const CYC = "14s";
  const BEGIN = `-${phase % 14}s`;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g>
        <animateTransform
          attributeName="transform" type="translate"
          values={values}
          {...(keyTimes ? { keyTimes } : {})}
          additive="sum"
          dur={`${dur}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
        <circle cx="0" cy="0" r="8.16" fill={color} stroke="#0A0A0A" strokeWidth="0.84" />
        <Exp n={0} cyc={CYC} begin={BEGIN}><NE /><path d="M -3.6,1.44 Q 0,4.56 3.6,1.44" stroke="#0A0A0A" strokeWidth="0.96" fill="none" strokeLinecap="round" /></Exp>
        <Exp n={1} cyc={CYC} begin={BEGIN}><NE /><path d="M -4,0.8 Q 0,6 4,0.8" fill="#0A0A0A"/><path d="M -4,0.8 Q 0,3.2 4,0.8" fill="white"/><line x1="-1.6" y1="0.8" x2="-1.6" y2="3.2" stroke="#0A0A0A" strokeWidth="0.72"/><line x1="1.6" y1="0.8" x2="1.6" y2="3.2" stroke="#0A0A0A" strokeWidth="0.72"/></Exp>
        <Exp n={2} cyc={CYC} begin={BEGIN}><circle cx="-2.64" cy="-2.4" r="1.28" fill="#0A0A0A"/><circle cx="2.64" cy="-2.4" r="1.28" fill="#0A0A0A"/><ellipse cx="0" cy="2.8" rx="2.0" ry="2.4" fill="#0A0A0A"/><ellipse cx="0" cy="3.04" rx="1.28" ry="1.68" fill="#AA0000"/></Exp>
        <Exp n={3} cyc={CYC} begin={BEGIN}><BE /><ellipse cx="0" cy="3.2" rx="3.6" ry="3.36" fill="#0A0A0A"/><ellipse cx="0" cy="3.6" rx="2.56" ry="2.48" fill="#AA0000"/></Exp>
        <Exp n={4} cyc={CYC} begin={BEGIN}><circle cx="-2.64" cy="-1.68" r="1.08" fill="#0A0A0A"/><path d="M 1.44,-2.32 Q 2.64,-0.64 4.16,-1.68" stroke="#0A0A0A" strokeWidth="1.12" fill="none" strokeLinecap="round"/><path d="M -3.6,1.44 Q 0,4.56 3.6,1.44" stroke="#0A0A0A" strokeWidth="0.96" fill="none" strokeLinecap="round"/></Exp>
        <Exp n={5} cyc={CYC} begin={BEGIN}><SE /><path d="M -4.4,0.8 Q 0,6.4 4.4,0.8" fill="#0A0A0A"/><path d="M -4.4,0.8 Q 0,3.36 4.4,0.8" fill="white"/><ellipse cx="-4.16" cy="-0.4" rx="0.56" ry="0.96" fill="#99CCFF"/><ellipse cx="4.16" cy="-0.4" rx="0.56" ry="0.96" fill="#99CCFF"/></Exp>
        <Exp n={6} cyc={CYC} begin={BEGIN}><NE /><path d="M -3.2,2.4 Q 0,1.76 3.2,2.4" stroke="#0A0A0A" strokeWidth="0.96" fill="none" strokeLinecap="round"/></Exp>
      </g>
    </g>
  );
}

