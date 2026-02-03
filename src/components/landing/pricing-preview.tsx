"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For small teams getting started",
    features: [
      "Up to 3 locations",
      "QR check-in",
      "Basic reports",
      "Email support",
    ],
    highlighted: false,
    gradient: "from-gray-500/10 to-gray-600/5",
  },
  {
    name: "Growth",
    price: "$79",
    period: "/month",
    description: "For growing organizations",
    features: [
      "Up to 10 locations",
      "All check-in methods",
      "Recurring events",
      "Advanced reports",
      "Priority support",
      "API access",
    ],
    highlighted: true,
    gradient: "from-primary/20 to-violet-600/10",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large-scale deployments",
    features: [
      "Unlimited locations",
      "All features",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "On-premise option",
    ],
    highlighted: false,
    gradient: "from-violet-500/10 to-purple-600/5",
  },
];

export function PricingPreview() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 border border-primary/20">
            <Zap className="w-4 h-4" />
            <span>Pricing</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Simple, transparent{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">
              pricing
            </span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required. Scale as you grow.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "relative rounded-2xl border p-8 transition-all duration-300",
                plan.highlighted
                  ? "border-primary/50 shadow-2xl shadow-primary/10 lg:scale-105 z-10"
                  : "bg-card hover:shadow-lg hover:-translate-y-1"
              )}
            >
              {/* Gradient background */}
              <div className={cn(
                "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-50",
                plan.gradient
              )} />
              
              <div className="relative">
                {plan.highlighted && (
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-violet-600 px-3 py-1 text-xs font-medium text-white">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className={cn(
                    "text-5xl font-bold tracking-tight",
                    plan.highlighted && "bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent"
                  )}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="ml-1 text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="mt-3 text-muted-foreground">{plan.description}</p>
                
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full",
                        plan.highlighted 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary/10 text-primary"
                      )}>
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className={cn(
                    "mt-8 w-full h-12",
                    plan.highlighted && "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                  )}
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.name === "Enterprise" ? "/demo" : "/signup"}>
                    {plan.name === "Enterprise" ? "Contact sales" : "Start free trial"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground mb-4">
            Need a custom solution? We&apos;re here to help.
          </p>
          <Button variant="outline" size="lg" asChild>
            <Link href="/pricing">
              Compare all plans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
