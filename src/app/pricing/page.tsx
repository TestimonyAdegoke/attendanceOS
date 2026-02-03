"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For small teams getting started with attendance tracking",
    features: [
      "Up to 3 locations",
      "Up to 100 people",
      "QR check-in only",
      "Basic reports",
      "7-day audit log",
      "Email support",
    ],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$79",
    period: "/month",
    description: "For growing organizations needing full flexibility",
    features: [
      "Up to 10 locations",
      "Up to 500 people",
      "All check-in methods",
      "Recurring events",
      "Advanced reports",
      "30-day audit log",
      "Priority support",
      "API access",
      "CSV exports",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large-scale deployments with custom requirements",
    features: [
      "Unlimited locations",
      "Unlimited people",
      "All features",
      "Custom integrations",
      "Unlimited audit log",
      "Dedicated support",
      "SLA guarantee",
      "On-premise option",
      "SSO/SAML",
      "Custom branding",
    ],
    highlighted: false,
  },
];

const faqs = [
  {
    question: "Can I try Attend before committing?",
    answer: "Yes. All plans include a 14-day free trial with full access to features. No credit card required to start.",
  },
  {
    question: "How does billing work?",
    answer: "We bill monthly or annually (with 2 months free). You can upgrade, downgrade, or cancel anytime.",
  },
  {
    question: "What counts as a 'location'?",
    answer: "A location is a physical venue where check-ins occur. Each location can have its own geofence and kiosk devices.",
  },
  {
    question: "Can I add more people than my plan allows?",
    answer: "Yes. Additional people are billed at a per-person rate. Contact us for volume pricing.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use industry-standard encryption, row-level security, and maintain detailed audit logs. See our Security page for details.",
  },
  {
    question: "Do you offer discounts for nonprofits?",
    answer: "Yes. Registered nonprofits and educational institutions receive 30% off all plans. Contact us to apply.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      <Header />
      
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "rounded-xl border p-8 transition-all",
                  plan.highlighted
                    ? "border-primary bg-primary/5 shadow-lg lg:scale-105"
                    : "bg-card hover:shadow-md"
                )}
              >
                {plan.highlighted && (
                  <div className="mb-4 inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="ml-1 text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.name === "Enterprise" ? "/demo" : "/app"}>
                    {plan.name === "Enterprise" ? "Contact sales" : "Start free trial"}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight">
              Frequently asked questions
            </h2>
          </motion.div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />
    </main>
  );
}
