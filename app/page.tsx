import Nav from "./components/Nav";
import Hero from "./components/Hero";
import CtaBanner from "./components/CtaBanner";
import TrustStrip from "./components/TrustStrip";
import Sports from "./components/Sports";
import About from "./components/About";
import WaitlistSection from "./components/WaitlistSection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="relative">
      <Nav />
      <main>
        <Hero />
        <CtaBanner />
        <TrustStrip />
        <Sports />
        <About />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
}
