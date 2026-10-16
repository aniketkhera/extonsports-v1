/* A mobile phone, outline, in the brand orange: says "phone" without a word — beside
   the club's number on both in-club televisions (2026-10-16, Aniket: "write our phone
   number with a cellphone icon to signify thats a phone"). Drawn here rather than
   pulled from an icon set: eight lines, and nothing to install in a node_modules that
   is shared between checkouts. Sized in em, so it follows whatever text it sits in.
   The colour is a literal, like everything on those screens — see board.css. */
export default function PhoneIcon({ color = "#F89B72" }: { color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" width="1.3em" height="1.3em" aria-hidden
      fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <rect x="6" y="2" width="12" height="20" rx="2.6" />
      <path d="M10.4 5.2h3.2" />
      <circle cx="12" cy="18.4" r="0.9" fill={color} stroke="none" />
    </svg>
  );
}
