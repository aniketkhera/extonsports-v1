import s from "./PhoneIcon.module.css";

/* A mobile phone, outline, in the brand orange: says "phone" without a word — beside
   the club's number on both in-club televisions (2026-10-16, Aniket: "write our phone
   number with a cellphone icon to signify thats a phone"), and it buzzes now and then
   ("let's vibrate the cellphone") — see the stylesheet for how and why so briefly.
   Drawn here rather than pulled from an icon set: a few lines, and nothing to install
   in a node_modules that is shared between checkouts. Sized in em, so it follows
   whatever text it sits in. The colour is a literal, like everything on those
   screens — see board.css. */
export default function PhoneIcon({ color = "#F89B72", style }: { color?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24" width="1.3em" height="1.3em" aria-hidden
      /* inline-block: the CSS reset makes every svg a block, which on /board's
         footer stacked the icon over the number. */
      style={{ display: "inline-block", ...style }}
      fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <g className={s.body}>
        <rect x="6" y="2" width="12" height="20" rx="2.6" />
        <path d="M10.4 5.2h3.2" />
        <circle cx="12" cy="18.4" r="0.9" fill={color} stroke="none" />
      </g>
      <path className={s.wave} d="M3 8.6Q1.4 12 3 15.4M21 8.6Q22.6 12 21 15.4" strokeWidth={1.6} />
    </svg>
  );
}

/* The club's number with the phone in front of it, the two lined up (2026-10-16,
   Aniket: "make the phone icon and phone number align pls.."). The icon is taken out
   of the line — absolute, in room made by the span's left padding — so it can be
   centred on the DIGITS rather than on whatever the line box happens to be, and so
   it can never make a footer or strip taller. `top: 50%` is the middle of the text's
   content area; PHONE_NUDGE moves the phone body's centre from there onto the middle
   of the figures' ink, measured in Chromium on both screens in the body face. */
const PHONE_NUDGE = "0.02em";
export function PhoneNumber({ number, color }: { number: string; color?: string }) {
  return (
    <span style={{ position: "relative", paddingLeft: "1.7em", whiteSpace: "nowrap" }}>
      <PhoneIcon
        color={color}
        style={{ position: "absolute", left: 0, top: "50%", transform: `translateY(calc(-50% + ${PHONE_NUDGE}))` }}
      />
      {number}
    </span>
  );
}
