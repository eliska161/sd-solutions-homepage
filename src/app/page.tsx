import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Topography } from "@/components/hero/Topography";
import { Hero } from "@/components/sections/Hero";
import { Products } from "@/components/sections/Products";
import { WhyUs } from "@/components/sections/WhyUs";
import { Technology } from "@/components/sections/Technology";
import { About } from "@/components/sections/About";
import { CTA } from "@/components/sections/CTA";

export default function Home() {
  return (
    <div className="bg-atmosphere relative min-h-screen">
      <Topography />
      <Navbar />
      <main className="relative">
        <Hero />
        <Products />
        <WhyUs />
        <Technology />
        <About />
        <CTA />
      </main>
      <div className="relative">
        <Footer />
      </div>
    </div>
  );
}
