import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { RecurringSection } from "@/components/landing/recurring-section";
import { PricingPreview } from "@/components/landing/pricing-preview";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <RecurringSection />
      <PricingPreview />
      <Footer />
    </main>
  );
}
