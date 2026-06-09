import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import {
  CTA,
  Features,
  Footer,
  HowItWorks,
  Sources,
} from "@/components/landing/sections";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main id="main">
        <Hero />
        <HowItWorks />
        <Features />
        <Sources />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
