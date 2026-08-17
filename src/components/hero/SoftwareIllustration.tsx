"use client";

import {
  Container,
  Database,
  Map,
  MonitorSmartphone,
  Server,
  Shield,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const icons = [
  { icon: Map, label: "Kart" },
  { icon: Server, label: "Server" },
  { icon: Container, label: "Docker" },
  { icon: Database, label: "Data" },
  { icon: Shield, label: "Drift" },
  { icon: MonitorSmartphone, label: "Kiosk" },
];

export function SoftwareIllustration() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="relative mx-auto w-full max-w-[420px] lg:max-w-none"
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03] blur-3xl" />

      <div className="relative grid grid-cols-3 gap-3 sm:gap-4">
        {icons.map(({ icon: Icon, label }, index) => (
          <motion.div
            key={label}
            className="flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.1] bg-[#111111]/80"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              delay: prefersReducedMotion ? 0 : 0.12 + index * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Icon className="h-6 w-6 text-foreground/80 sm:h-7 sm:w-7" strokeWidth={1.4} />
            <span className="text-[11px] tracking-wide text-muted">{label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
