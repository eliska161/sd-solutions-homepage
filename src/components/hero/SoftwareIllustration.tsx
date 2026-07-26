"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

function Layer({
  className,
  children,
  delay = 0,
}: {
  className?: string;
  children?: ReactNode;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.7,
        delay: prefersReducedMotion ? 0 : 0.2 + delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

export function SoftwareIllustration() {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[480px] lg:max-w-none"
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03] blur-3xl" />

      <Layer className="absolute inset-[8%] rounded-2xl border border-border bg-surface/80 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.7)] backdrop-blur-sm">
        <div className="flex h-10 items-center gap-1.5 border-b border-border px-4">
          <span className="h-2 w-2 rounded-full bg-white/15" />
          <span className="h-2 w-2 rounded-full bg-white/10" />
          <span className="h-2 w-2 rounded-full bg-white/8" />
          <span className="ml-3 h-1.5 w-24 rounded-full bg-white/[0.06]" />
        </div>
        <div className="grid h-[calc(100%-2.5rem)] grid-cols-12 gap-3 p-4">
          <div className="col-span-3 space-y-2 rounded-lg border border-border bg-background/40 p-3">
            <div className="h-1.5 w-10 rounded-full bg-white/20" />
            <div className="h-1.5 w-full rounded-full bg-white/[0.06]" />
            <div className="h-1.5 w-[80%] rounded-full bg-white/[0.06]" />
            <div className="mt-4 h-1.5 w-full rounded-full bg-white/[0.04]" />
            <div className="h-1.5 w-[70%] rounded-full bg-white/[0.04]" />
            <div className="h-1.5 w-[90%] rounded-full bg-white/[0.04]" />
          </div>
          <div className="col-span-9 space-y-3">
            <div className="h-16 rounded-lg border border-border bg-background/30 p-3">
              <div className="flex items-center justify-between">
                <div className="h-2 w-20 rounded-full bg-white/10" />
                <div className="h-5 w-14 rounded-md bg-white/10" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-white/[0.05]" />
                <div className="h-1.5 w-1/3 rounded-full bg-white/[0.05]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 rounded-lg border border-border bg-background/30 p-3">
                <div className="h-6 w-6 rounded-md bg-white/15" />
                <div className="mt-4 h-1.5 w-16 rounded-full bg-white/10" />
                <div className="mt-2 h-1.5 w-12 rounded-full bg-white/[0.05]" />
              </div>
              <div className="h-24 rounded-lg border border-border bg-background/30 p-3">
                <div className="h-6 w-6 rounded-md bg-white/[0.08]" />
                <div className="mt-4 h-1.5 w-14 rounded-full bg-white/10" />
                <div className="mt-2 h-1.5 w-10 rounded-full bg-white/[0.05]" />
              </div>
            </div>
          </div>
        </div>
      </Layer>

      <Layer
        delay={0.15}
        className="absolute right-[2%] top-[12%] w-[42%] rounded-xl border border-border bg-surface p-4 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
            <div className="h-3.5 w-3.5 rounded-[3px] border-2 border-white/40" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-1.5 w-16 rounded-full bg-white/15" />
            <div className="h-1.5 w-10 rounded-full bg-white/[0.06]" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full w-[72%] rounded-full bg-white/25" />
          </div>
          <div className="flex justify-between">
            <div className="h-1 w-8 rounded-full bg-white/[0.06]" />
            <div className="h-1 w-6 rounded-full bg-white/15" />
          </div>
        </div>
      </Layer>

      <Layer
        delay={0.28}
        className="absolute bottom-[8%] left-[0%] w-[48%] rounded-xl border border-border bg-surface p-4 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-between">
          <div className="h-1.5 w-20 rounded-full bg-white/12" />
          <div className="h-5 rounded-md border border-border px-2">
            <div className="mt-[7px] h-1 w-6 rounded-full bg-white/25" />
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {[0.9, 0.65, 0.8].map((w, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-5 w-5 rounded-md bg-white/[0.05]" />
              <div
                className="h-1.5 rounded-full bg-white/[0.07]"
                style={{ width: `${w * 100}%` }}
              />
            </div>
          ))}
        </div>
      </Layer>

      <Layer
        delay={0.4}
        className="absolute bottom-[28%] right-[6%] rounded-lg border border-border bg-background/90 px-3 py-2 shadow-lg backdrop-blur-sm"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-white/50" />
          <div className="h-1.5 w-14 rounded-full bg-white/12" />
        </div>
      </Layer>
    </div>
  );
}
