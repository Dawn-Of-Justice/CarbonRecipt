import { CTA } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingNav } from "@/components/landing/nav";
import { Sources } from "@/components/landing/sources";

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
