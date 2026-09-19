// QR code for https://extonsports.com, as static SVG.
//
// Generated once rather than at build time so the site takes no QR dependency for one
// fixed URL: qrcode@1.5.4 (borrowed from orangish-app's node_modules on 2026-09-19), error
// correction M, version 2 (25x25 modules). If the URL ever changes, regenerate QR_PATH by
// walking QRCode.create(url, { errorCorrectionLevel: 'M' }).modules row by row and emitting
// one "M{x} {y}h{run}v1h-{run}z" per run of dark modules — and scan the result with a phone.
//
// The URL is deliberately bare — no UTM tag. Every extra character pushes the code to a
// denser version, and this one has to scan from across a reception area off a TV. A 25x25
// grid is about as coarse as a URL can get.
//
// shape-rendering crispEdges keeps module edges sharp when a TV scales the page; the
// 4-module white margin is the quiet zone the QR spec requires for a reliable read.

const QR_SIZE = 25;
const QR_PATH =
  "M0 0h7v1h-7zM9 0h1v1h-1zM12 0h1v1h-1zM14 0h1v1h-1zM16 0h1v1h-1zM18 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM10 1h1v1h-1zM12 1h1v1h-1zM14 1h2v1h-2zM18 1h1v1h-1zM24 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h2v1h-2zM18 2h1v1h-1zM20 2h3v1h-3zM24 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h1v1h-1zM10 3h2v1h-2zM13 3h4v1h-4zM18 3h1v1h-1zM20 3h3v1h-3zM24 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM8 4h1v1h-1zM10 4h2v1h-2zM14 4h1v1h-1zM16 4h1v1h-1zM18 4h1v1h-1zM20 4h3v1h-3zM24 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM11 5h1v1h-1zM13 5h1v1h-1zM15 5h2v1h-2zM18 5h1v1h-1zM24 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h7v1h-7zM8 7h4v1h-4zM14 7h1v1h-1zM16 7h1v1h-1zM0 8h1v1h-1zM2 8h5v1h-5zM9 8h1v1h-1zM13 8h1v1h-1zM18 8h5v1h-5zM0 9h2v1h-2zM4 9h1v1h-1zM7 9h3v1h-3zM13 9h1v1h-1zM16 9h2v1h-2zM19 9h1v1h-1zM23 9h1v1h-1zM2 10h1v1h-1zM6 10h1v1h-1zM8 10h1v1h-1zM10 10h6v1h-6zM19 10h1v1h-1zM21 10h1v1h-1zM23 10h2v1h-2zM3 11h1v1h-1zM7 11h1v1h-1zM9 11h1v1h-1zM15 11h1v1h-1zM18 11h2v1h-2zM24 11h1v1h-1zM0 12h1v1h-1zM3 12h1v1h-1zM5 12h2v1h-2zM9 12h10v1h-10zM20 12h1v1h-1zM22 12h3v1h-3zM0 13h5v1h-5zM9 13h1v1h-1zM16 13h2v1h-2zM19 13h1v1h-1zM21 13h1v1h-1zM23 13h1v1h-1zM0 14h1v1h-1zM2 14h2v1h-2zM6 14h1v1h-1zM8 14h6v1h-6zM15 14h7v1h-7zM23 14h2v1h-2zM0 15h1v1h-1zM2 15h1v1h-1zM5 15h1v1h-1zM7 15h3v1h-3zM11 15h1v1h-1zM14 15h1v1h-1zM18 15h3v1h-3zM24 15h1v1h-1zM0 16h1v1h-1zM3 16h2v1h-2zM6 16h2v1h-2zM11 16h1v1h-1zM13 16h8v1h-8zM22 16h1v1h-1zM8 17h1v1h-1zM10 17h1v1h-1zM12 17h2v1h-2zM16 17h1v1h-1zM20 17h2v1h-2zM0 18h7v1h-7zM9 18h2v1h-2zM13 18h2v1h-2zM16 18h1v1h-1zM18 18h1v1h-1zM20 18h1v1h-1zM22 18h3v1h-3zM0 19h1v1h-1zM6 19h1v1h-1zM8 19h1v1h-1zM12 19h1v1h-1zM14 19h1v1h-1zM16 19h1v1h-1zM20 19h2v1h-2zM23 19h1v1h-1zM0 20h1v1h-1zM2 20h3v1h-3zM6 20h1v1h-1zM8 20h1v1h-1zM12 20h9v1h-9zM22 20h3v1h-3zM0 21h1v1h-1zM2 21h3v1h-3zM6 21h1v1h-1zM8 21h2v1h-2zM13 21h1v1h-1zM15 21h4v1h-4zM20 21h5v1h-5zM0 22h1v1h-1zM2 22h3v1h-3zM6 22h1v1h-1zM8 22h2v1h-2zM11 22h2v1h-2zM14 22h1v1h-1zM16 22h1v1h-1zM21 22h2v1h-2zM24 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM9 23h3v1h-3zM14 23h4v1h-4zM19 23h3v1h-3zM24 23h1v1h-1zM0 24h7v1h-7zM8 24h2v1h-2zM11 24h2v1h-2zM17 24h1v1h-1zM19 24h6v1h-6z";

export default function QrCode({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`-4 -4 ${QR_SIZE + 8} ${QR_SIZE + 8}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code linking to extonsports.com"
    >
      <rect x={-4} y={-4} width={QR_SIZE + 8} height={QR_SIZE + 8} fill="#ffffff" />
      <path d={QR_PATH} fill="#0A1019" />
    </svg>
  );
}
