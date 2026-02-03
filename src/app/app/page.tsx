"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto px-4 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Application Dashboard</h1>
        <p className="mt-4 text-muted-foreground">
          This is a placeholder for the authenticated application. 
          In the full implementation, this would require authentication and show the admin dashboard.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
