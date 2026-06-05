import type { Metadata } from "next";
import { Barlow, Oswald, Comfortaa, Caveat, Exo_2 } from "next/font/google";
import "./globals.css";

const cond = Oswald({
  subsets: ["latin"],
  variable: "--font-cond",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const body = Barlow({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Academy partner logo fonts
const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-comfortaa",
  weight: ["700"],
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["700"],
  display: "swap",
});
const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo2",
  weight: ["800"],
  style: ["italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.extonsports.com"),
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231A1208'/%3E%3Ctext x='16' y='24' font-family='Georgia%2C serif' font-size='24' font-weight='700' fill='%23F89B72' text-anchor='middle'%3Ee%3C/text%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
  },
  title: "Exton Sports Center — Members-only multi-sport club · open 24/7",
  description:
    "Cricket, squash, badminton and indoor turf — under one roof in Exton, PA. Members-only, open 24/7, unlimited court access. Coaching delivered through Orangish.",
  openGraph: {
    title: "Exton Sports Center — Members-only multi-sport club · open 24/7",
    description:
      "Cricket, squash, badminton and indoor turf in Exton, PA. Members-only. Open 24/7.",
    url: "https://www.extonsports.com",
    siteName: "Exton Sports Center",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cond.variable} ${body.variable} ${comfortaa.variable} ${caveat.variable} ${exo2.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* overflow-x wrapper: keeps horizontal scroll locked without
            touching body overflow, which would break position:fixed */}
        <div style={{ overflowX: "hidden" }}>{children}</div>
      </body>
    </html>
  );
}
