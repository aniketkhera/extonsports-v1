import Nav from "./components/Nav";
import Hero from "./components/Hero";
import CtaBanner from "./components/CtaBanner";
import TrustStrip from "./components/TrustStrip";
import Sports from "./components/Sports";
import About from "./components/About";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="relative pb-[320px] sm:pb-[200px] md:pb-[90px]">
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <Sports />
        <About />
      </main>
      <Footer />
      {/* CtaBanner is position:fixed — rendered outside main so it
          doesn't leave a gap in the document flow */}
      <CtaBanner />
    </div>
  );
}
