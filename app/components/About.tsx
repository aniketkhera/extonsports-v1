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
            Exton Sports Center is a members-only multi-sport facility in
            Chester County — cricket, squash, badminton and indoor turf under
            one roof, open round the clock.
          </p>
          <p className="text-white/60 text-[0.94rem] leading-[1.7] mb-3 max-w-[48ch]">
            Lessons and membership options will be delivered through{" "}
            <a
              href="https://orangish.io"
              target="_blank"
              rel="noreferrer"
              className="text-white font-semibold underline decoration-white/30 underline-offset-3 hover:decoration-[var(--color-ember)] transition"
            >
              Orangish
            </a>
            , our partner platform.
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
                href="tel:6099064271"
                className="hover:text-[var(--color-ember)] transition"
              >
                609-906-4271
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

          <div className="mt-7 flex gap-3 flex-wrap">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2.5 bg-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] text-white text-cond-md text-[0.85rem] no-underline transition"
              style={{ padding: "12px 24px" }}
            >
              Be first to know →
            </a>
            <a
              href="https://maps.app.goo.gl/?q=4+Tabas+Lane+Exton+PA+19341"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5 border-2 border-white/30 hover:border-[var(--color-ember)] text-white text-cond-md text-[0.85rem] no-underline transition"
              style={{ padding: "10px 24px" }}
            >
              Get directions
              <span aria-hidden>→</span>
            </a>
          </div>
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
   Top-left:    4 badminton courts (1×4 tall row)
   Top-right:   3 squash courts (1×3 row)
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
          vertical at x=310 splits top half into badminton + squash;
          vertical at x=470 carves the locker corner out of the bottom.  */}
      <line x1="310" y1="14"  x2="310" y2="216" stroke={lineThick} strokeWidth={1.4} />
      <line x1="14"  y1="216" x2="586" y2="216" stroke={lineThick} strokeWidth={1.4} />
      <line x1="470" y1="216" x2="470" y2="406" stroke={lineThick} strokeWidth={1.4} />

      {/* ──────── ZONE 1 — top-left, 4 BADMINTON courts (1×4 tall row) ──────── */}
      <text x="22" y="34" fill={lbl} fontSize="9" fontFamily="var(--font-body)" letterSpacing="2" fontWeight="700">
        01 · 4 BADMINTON COURTS
      </text>
      {/* 4 vertical courts in a row, each 62 wide × 164 tall (fits top half) */}
      {[22, 90, 158, 226].map((cx, i) => {
        const cy = 46;
        const ch = 164;
        return (
          <g key={i}>
            {/* doubles outer */}
            <rect x={cx} y={cy} width="62" height={ch} stroke={line} strokeWidth={sw} fill="none" />
            {/* inner singles sidelines */}
            <line x1={cx + 5}  y1={cy}            x2={cx + 5}  y2={cy + ch} stroke={lineSoft} strokeWidth={swThin} />
            <line x1={cx + 57} y1={cy}            x2={cx + 57} y2={cy + ch} stroke={lineSoft} strokeWidth={swThin} />
            {/* net — thicker, across the middle */}
            <line x1={cx}      y1={cy + ch / 2}   x2={cx + 62} y2={cy + ch / 2} stroke={lineThick} strokeWidth={sw + 0.6} />
            {/* short service lines either side of net */}
            <line x1={cx}      y1={cy + 54}       x2={cx + 62} y2={cy + 54}       stroke={lineSoft} strokeWidth={swThin} />
            <line x1={cx}      y1={cy + 110}      x2={cx + 62} y2={cy + 110}      stroke={lineSoft} strokeWidth={swThin} />
            {/* long service line for doubles (just short of baselines) */}
            <line x1={cx}      y1={cy + 18}       x2={cx + 62} y2={cy + 18}       stroke={lineSoft} strokeWidth={swThin} />
            <line x1={cx}      y1={cy + 146}      x2={cx + 62} y2={cy + 146}      stroke={lineSoft} strokeWidth={swThin} />
            {/* centre service line (top + bottom halves only, broken by net) */}
            <line x1={cx + 31} y1={cy + 18}       x2={cx + 31} y2={cy + 54}       stroke={lineSoft} strokeWidth={swThin} />
            <line x1={cx + 31} y1={cy + 110}      x2={cx + 31} y2={cy + 146}      stroke={lineSoft} strokeWidth={swThin} />
          </g>
        );
      })}

      {/* ──────── ZONE 2 — top-right, 3 SQUASH courts (1×3) ──────── */}
      <text x="318" y="34" fill={lbl} fontSize="9" fontFamily="var(--font-body)" letterSpacing="2" fontWeight="700">
        02 · 3 SQUASH COURTS · ALL-GLASS
      </text>
      {[
        { x: 322, y: 48 },
        { x: 412, y: 48 },
        { x: 502, y: 48 },
      ].map((c, i) => (
        <g key={i}>
          {/* outer court (front wall = top) */}
          <rect x={c.x} y={c.y} width="72" height="154" stroke={line} strokeWidth={sw} fill="none" />
          {/* TIN bar across the front wall (top) */}
          <rect x={c.x} y={c.y} width="72" height="4" stroke="none" fill={accent} />
          {/* short line across — ~56% down */}
          <line x1={c.x} y1={c.y + 86} x2={c.x + 72} y2={c.y + 86} stroke={line} strokeWidth={sw} />
          {/* half-court line — from short line to back wall */}
          <line x1={c.x + 36} y1={c.y + 86} x2={c.x + 36} y2={c.y + 154} stroke={line} strokeWidth={sw} />
          {/* two service boxes */}
          <rect x={c.x} y={c.y + 86} width="18" height="18" stroke={line} strokeWidth={swThin} fill="none" />
          <rect x={c.x + 54} y={c.y + 86} width="18" height="18" stroke={line} strokeWidth={swThin} fill="none" />
        </g>
      ))}

      {/* ──────── ZONE 3 — bottom strip, 2 CRICKET LANES (full width except locker corner) ──────── */}
      <text x="22" y="234" fill={lbl} fontSize="9" fontFamily="var(--font-body)" letterSpacing="2" fontWeight="700">
        03 · TURF · 2 CRICKET LANES
      </text>
      {/* 2 horizontal lanes stacked, spanning x=22 to x=462 (the full zone width
          minus the locker corner). Each lane is 440 wide × 72 tall. */}
      {[
        { x: 22, y: 246 },  // top lane
        { x: 22, y: 326 },  // bottom lane
      ].map((c, i) => (
        <g key={i}>
          {/* lane outer — wide horizontal strip (full 440 wide for bowler run-up) */}
          <rect x={c.x} y={c.y} width="440" height="72" stroke={line} strokeWidth={sw} fill="none" />
          {/* pitch tramlines — only the LEFT ~60% of the lane; the right 40%
              stays clear for the bowler's run-up */}
          <rect x={c.x + 24} y={c.y + 24} width="240" height="26" stroke={lineSoft} strokeWidth={swThin} fill="rgba(248,155,114,0.06)" />
          {/* LEFT popping crease — batsman's end, near the left wall */}
          <line x1={c.x + 48} y1={c.y + 12} x2={c.x + 48} y2={c.y + 62} stroke={line} strokeWidth={sw} />
          {/* LEFT wickets — 3 short horizontal stump marks */}
          <g stroke={line} strokeWidth={sw}>
            <line x1={c.x + 28} y1={c.y + 32} x2={c.x + 46} y2={c.y + 32} />
            <line x1={c.x + 28} y1={c.y + 37} x2={c.x + 46} y2={c.y + 37} />
            <line x1={c.x + 28} y1={c.y + 42} x2={c.x + 46} y2={c.y + 42} />
          </g>
          {/* RIGHT popping crease — at 60% of lane length, leaving 40% for run-up */}
          <line x1={c.x + 264} y1={c.y + 12} x2={c.x + 264} y2={c.y + 62} stroke={line} strokeWidth={sw} />
          {/* RIGHT wickets — bowler's end, at the 60% mark */}
          <g stroke={line} strokeWidth={sw}>
            <line x1={c.x + 266} y1={c.y + 32} x2={c.x + 284} y2={c.y + 32} />
            <line x1={c.x + 266} y1={c.y + 37} x2={c.x + 284} y2={c.y + 37} />
            <line x1={c.x + 266} y1={c.y + 42} x2={c.x + 284} y2={c.y + 42} />
          </g>
          {/* Run-up arrow — subtle marker showing the bowler approaches
              from the right, runs left, releases at the right popping crease */}
          <g stroke={lineSoft} strokeWidth={swThin}>
            <line x1={c.x + 420} y1={c.y + 37} x2={c.x + 290} y2={c.y + 37} strokeDasharray="3 4" />
            <line x1={c.x + 296} y1={c.y + 33} x2={c.x + 290} y2={c.y + 37} />
            <line x1={c.x + 296} y1={c.y + 41} x2={c.x + 290} y2={c.y + 37} />
          </g>
        </g>
      ))}

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

      {/* BADMINTON — courts 1-3 are DOUBLES (2 per side), court 4 is singles.
          y offsets capped so players never cross the net at cy+ch/2=128.           */}
      {[22, 90, 158, 226].map((cx, i) => {
        const cy = 46;
        const ch = 164;
        const topY = cy + ch * 0.28;
        const botY = cy + ch * 0.78;
        const px = cx + 31;
        const d = i * 0.55;
        const isDoubles = i < 3;   // left 3 courts = doubles

        return (
          <g key={`bad-${i}`}>
            {isDoubles ? (
              /* Doubles — 2 on each side, offset ±9 horizontally */
              <>
                {/* Top side */}
                <Smiley x={px - 9} y={topY} color="#FFE066"
                  values="0,0; 8,-10; -10,-5; 6,16; -4,-8; 0,0"
                  dur={3.2} delay={d} phase={i * 4} />
                <Smiley x={px + 9} y={topY} color="#FFE066"
                  values="0,0; -8,-12; 9,-6; -7,14; 5,-10; 0,0"
                  dur={3.2} delay={d + 0.3} phase={i * 4 + 3} />
                {/* Bottom side */}
                <Smiley x={px - 9} y={botY} color="#FFE066"
                  values="0,0; -10,12; 9,8; -7,-12; 5,10; 0,0"
                  dur={3.2} delay={d + 0.6} phase={i * 4 + 6} />
                <Smiley x={px + 9} y={botY} color="#FFE066"
                  values="0,0; 10,10; -9,12; 8,-10; -5,8; 0,0"
                  dur={3.2} delay={d + 0.9} phase={i * 4 + 9} />
              </>
            ) : (
              /* Singles — 1 per side (court 4) */
              <>
                <Smiley x={px} y={topY} color="#FFE066"
                  values="0,0; 16,-12; -14,-6; 10,18; -5,-10; 0,0"
                  dur={3.4} delay={d} phase={12} />
                <Smiley x={px} y={botY} color="#FFE066"
                  values="0,0; -15,14; 13,10; -9,-14; 6,12; 0,0"
                  dur={3.4} delay={d + 0.5} phase={0} />
              </>
            )}
          </g>
        );
      })}

      {/* SQUASH — pink smileys. Player A starts at T, drifts to walls and back.
          Player B starts in back court and moves around without colliding with A.
          Returning to 0,0 means returning to starting position = the T.            */}
      {[322, 412, 502].map((cx, i) => {
        const cy = 48;
        const ch = 154;
        const tY = cy + ch * 0.55;
        const bY = cy + ch * 0.85;
        const px = cx + 36;
        const d = i * 0.7;
        return (
          <g key={`sq-${i}`}>
            <Smiley x={px - 11} y={tY} color="#FFA8D0"
              values="0,0; 22,-20; -18,-24; 18,14; -10,-8; 0,0"
              dur={4.2} delay={d} phase={i * 3 + 1} />
            <Smiley x={px + 11} y={bY} color="#FFA8D0"
              values="0,0; -18,8; 16,-14; -14,10; 10,-6; 0,0"
              dur={4.2} delay={d + 0.6} phase={i * 3 + 9} />
          </g>
        );
      })}

      {/* CRICKET — orange bowler runs up and back; blue batsman holds position with bat swing */}
      {[
        { x: 22, y: 246 },
        { x: 22, y: 326 },
      ].map((c, i) => {
        const midY = c.y + 36;
        const bowlerStartX = c.x + 400;
        const batsmanX = c.x + 60;
        const d = i * 1.4;
        return (
          <g key={`cri-${i}`}>
            {/* Far-left fielder — stands behind the batsman's end wall */}
            <Smiley x={c.x + 10} y={midY} color="#6BCEF5"
              values="0,0; 2,-4; -2,3; 1,-2; 0,0"
              dur={5.8} delay={d + 0.8} phase={i * 4 + 13} />
            <Smiley x={batsmanX} y={midY} color="#6BCEF5"
              values="0,0; 0,0; 0,0; -3,-3; 0,0; 0,0"
              keyTimes="0; 0.5; 0.7; 0.78; 0.84; 1"
              dur={4.6} delay={d} phase={i * 4 + 2} />
            <Smiley x={bowlerStartX} y={midY} color="#FFB259"
              values="0,0; -130,0; -135,-2; -135,2; -100,0; -50,0; 0,0"
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
function Smiley({
  x, y, color, values, keyTimes, dur = 3.4, delay = 0, phase = 0,
}: {
  x: number; y: number; color: string; values: string;
  keyTimes?: string; dur?: number; delay?: number; phase?: number;
}) {
  const CYC = "14s";
  const BEGIN = `-${phase % 14}s`;

  // Opacity keyframes for expression at slot n in a 7-slot, 14-second cycle
  const fa = (n: number) => {
    const s = (n / 7).toFixed(4);
    const e = ((n + 1) / 7).toFixed(4);
    if (n === 0) return { values: "1;1;0;0",     keyTimes: `0;${e};${e};1` };
    if (n === 6) return { values: "0;0;1;1",     keyTimes: `0;${s};${s};1` };
    return            { values: "0;0;1;1;0;0", keyTimes: `0;${s};${s};${e};${e};1` };
  };

  const Exp = ({ n, children }: { n: number; children: React.ReactNode }) => {
    const a = fa(n);
    return (
      <g>
        <animate attributeName="opacity" values={a.values} keyTimes={a.keyTimes}
          dur={CYC} begin={BEGIN} repeatCount="indefinite" />
        {children}
      </g>
    );
  };

  const NE = () => (<><circle cx="-2.64" cy="-1.68" r="1.08" fill="#0A0A0A"/><circle cx="2.64" cy="-1.68" r="1.08" fill="#0A0A0A"/></>);
  const BE = () => (<><circle cx="-2.64" cy="-2.24" r="1.6" fill="#0A0A0A"/><circle cx="2.64" cy="-2.24" r="1.6" fill="#0A0A0A"/><circle cx="-2.16" cy="-2.56" r="0.56" fill="white"/><circle cx="2.16" cy="-2.56" r="0.56" fill="white"/></>);
  const SE = () => (<><path d="M -4.16,-2.24 Q -2.64,-0.8 -1.12,-2.24" stroke="#0A0A0A" strokeWidth="1.12" fill="none" strokeLinecap="round"/><path d="M 1.12,-2.24 Q 2.64,-0.8 4.16,-2.24" stroke="#0A0A0A" strokeWidth="1.12" fill="none" strokeLinecap="round"/></>);

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
        {/* face base — 20% smaller: r 10.2→8.16 */}
        <circle cx="0" cy="0" r="8.16" fill={color} stroke="#0A0A0A" strokeWidth="0.84" />

        {/* 0 Smile 😊 */}
        <Exp n={0}><NE /><path d="M -3.6,1.44 Q 0,4.56 3.6,1.44" stroke="#0A0A0A" strokeWidth="0.96" fill="none" strokeLinecap="round" /></Exp>

        {/* 1 Big grin 😁 */}
        <Exp n={1}><NE /><path d="M -4,0.8 Q 0,6 4,0.8" fill="#0A0A0A"/><path d="M -4,0.8 Q 0,3.2 4,0.8" fill="white"/><line x1="-1.6" y1="0.8" x2="-1.6" y2="3.2" stroke="#0A0A0A" strokeWidth="0.72"/><line x1="1.6" y1="0.8" x2="1.6" y2="3.2" stroke="#0A0A0A" strokeWidth="0.72"/></Exp>

        {/* 2 Awe 😮 */}
        <Exp n={2}><circle cx="-2.64" cy="-2.4" r="1.28" fill="#0A0A0A"/><circle cx="2.64" cy="-2.4" r="1.28" fill="#0A0A0A"/><ellipse cx="0" cy="2.8" rx="2.0" ry="2.4" fill="#0A0A0A"/><ellipse cx="0" cy="3.04" rx="1.28" ry="1.68" fill="#AA0000"/></Exp>

        {/* 3 Shock 😱 */}
        <Exp n={3}><BE /><ellipse cx="0" cy="3.2" rx="3.6" ry="3.36" fill="#0A0A0A"/><ellipse cx="0" cy="3.6" rx="2.56" ry="2.48" fill="#AA0000"/></Exp>

        {/* 4 Wink 😉 */}
        <Exp n={4}><circle cx="-2.64" cy="-1.68" r="1.08" fill="#0A0A0A"/><path d="M 1.44,-2.32 Q 2.64,-0.64 4.16,-1.68" stroke="#0A0A0A" strokeWidth="1.12" fill="none" strokeLinecap="round"/><path d="M -3.6,1.44 Q 0,4.56 3.6,1.44" stroke="#0A0A0A" strokeWidth="0.96" fill="none" strokeLinecap="round"/></Exp>

        {/* 5 Laughing 😂 */}
        <Exp n={5}><SE /><path d="M -4.4,0.8 Q 0,6.4 4.4,0.8" fill="#0A0A0A"/><path d="M -4.4,0.8 Q 0,3.36 4.4,0.8" fill="white"/><ellipse cx="-4.16" cy="-0.4" rx="0.56" ry="0.96" fill="#99CCFF"/><ellipse cx="4.16" cy="-0.4" rx="0.56" ry="0.96" fill="#99CCFF"/></Exp>

        {/* 6 Neutral 😐 */}
        <Exp n={6}><NE /><path d="M -3.2,2.4 Q 0,1.76 3.2,2.4" stroke="#0A0A0A" strokeWidth="0.96" fill="none" strokeLinecap="round"/></Exp>
      </g>
    </g>
  );
}

