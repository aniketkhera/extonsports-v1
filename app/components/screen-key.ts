/* THE SCREEN KEY — how a wall screen learns the board_screens token it was paired with.
   ──────────────────────────────────────────────────────────────────────────────────────
   Moved here from app/board/board-lib.ts on 2026-10-20, when the heartbeat
   (useScreenHeartbeat) became a second reader of the key on the same page and
   /comingsoon became a keyed screen with no court feed at all. board-lib re-exports
   PLATFORM and readKey, so nothing that imported them from there had to change.

   Without a key a screen shows a court, a time and one of two words off the public
   /api/court-slots proxy. WITH one it reads app.orangish.io/api/public/court-board,
   which also says WHO holds each court and answers 401 to anybody who does not have
   the key — and it sends a heartbeat to app.orangish.io, so the platform can tell a
   frozen screen from a live one (the reception TV showed one picture from Sat
   2026-10-17 22:06 EDT for three days and nothing noticed).

   The key arrives in the URL FRAGMENT, which browsers never send to a server and
   which therefore never lands in a Vercel access log or a Referer header. It is
   stashed in localStorage and wiped from the address bar immediately, so it
   survives the self-reload on deploy. A screen that loses it (a cleared profile)
   gets it back from the next launch of the full URL, whose #k= carries it
   (2026-10-20). On a keyed TV that tv-keeper's watchdog has armed, that launch
   comes within about 5 min: the watchdog sees the heartbeat stop (SILENT_MS) and
   relaunches the page. Without the watchdog it is the hourly relaunch (down from
   every ten minutes, because a relaunch is what wedged the reception TV), and the
   worst case is an hour of a screen with no names and no heartbeat. Where
   localStorage throws, the key lives only in readKey's memo and every deploy
   reload drops it, so each deploy costs that TV one such relaunch.

   ⚠️ ?k= AND #k= SHARE A LETTER ON PURPOSE AND CANNOT BE CONFUSED (2026-10-20).
   `?k=<13 digits>` in the SEARCH part is tv-keeper's launch tag — not a secret, read
   by screen-runtime.ts from location.search only. `#k=<43 chars>` in the FRAGMENT is
   this key, read here from location.hash only. A 13-digit tag can never match the
   43-character pattern, and replaceState below keeps the search part, so the tag
   survives the key being wiped. */
export const PLATFORM = "https://app.orangish.io";

const KEY_RE = /^[A-Za-z0-9_-]{43}$/;
const KEY_STORE = "exton-board-key";

/* MEMOISED, 2026-10-20. The first call strips the key out of the address bar. If
   localStorage then throws (a private profile, a full quota), the key exists only in
   that first call's return value — and a page now has two readers (its own feed effect
   and the heartbeat hook), so the second would get null and the screen would quietly
   stop reporting that it is alive. One answer per document load, whoever asks first.
   Only cached in a browser: on the server there is no window, and a null cached in
   a server module would outlive the request that computed it. */
let memo: string | null | undefined;

export function readKey(): string | null {
  if (memo !== undefined) return memo;
  const k = findKey();
  if (typeof window !== "undefined") memo = k;
  return k;
}

function findKey(): string | null {
  try {
    const m = /(?:^#|&)k=([A-Za-z0-9_-]{43})(?:&|$)/.exec(window.location.hash);
    if (m) {
      try { window.localStorage.setItem(KEY_STORE, m[1]); } catch { /* private mode: memory only (the memo) */ }
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return m[1];
    }
  } catch { /* fall through to storage */ }
  try {
    const k = window.localStorage.getItem(KEY_STORE);
    return k && KEY_RE.test(k) ? k : null;
  } catch {
    return null;
  }
}
