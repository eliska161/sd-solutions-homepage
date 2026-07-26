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
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.65,
        delay: prefersReducedMotion ? 0 : 0.15 + delay,
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
      className="relative mx-auto aspect-[5/4] w-full max-w-[460px] lg:max-w-none"
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.035] blur-3xl" />

      {/* Main window */}
      <Layer className="absolute inset-x-[8%] inset-y-[10%] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#111111] shadow-[0_24px_64px_-28px_rgba(0,0,0,0.85)]">
        <div className="flex h-9 items-center gap-1.5 border-b border-white/[0.08] px-3.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/12" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/8" />
          <span className="ml-2.5 h-1 w-20 rounded-full bg-white/[0.08]" />
        </div>

        <div className="grid h-[calc(100%-2.25rem)] grid-cols-[72px_1fr] gap-3 p-3 sm:grid-cols-[88px_1fr] sm:gap-3.5 sm:p-3.5">
          {/* Sidebar */}
          <div className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
            <div className="h-1 w-8 rounded-full bg-white/20" />
            <div className="mt-1 h-1 w-full rounded-full bg-white/[0.07]" />
            <div className="h-1 w-[75%] rounded-full bg-white/[0.05]" />
            <div className="mt-auto space-y-2 pb-1">
              <div className="h-1 w-full rounded-full bg-white/[0.04]" />
              <div className="h-1 w-[60%] rounded-full bg-white/[0.04]" />
            </div>
          </div>

          {/* Content */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="h-1.5 w-24 rounded-full bg-white/15" />
                <div className="h-5 w-12 shrink-0 rounded-md border border-white/10 bg-white/[0.06]" />
              </div>
              <div className="mt-3 h-1 w-full rounded-full bg-white/[0.05]" />
              <div className="mt-2 h-1 w-2/3 rounded-full bg-white/[0.04]" />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="h-5 w-5 rounded-md border border-white/15 bg-white/[0.06]" />
                <div className="mt-3 h-1 w-14 rounded-full bg-white/12" />
                <div className="mt-2 h-1 w-10 rounded-full bg-white/[0.05]" />
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="h-5 w-5 rounded-md border border-white/10 bg-white/[0.04]" />
                <div className="mt-3 h-1 w-12 rounded-full bg-white/12" />
                <div className="mt-2 h-1 w-8 rounded-full bg-white/[0.05]" />
              </div>
            </div>
          </div>
        </div>
      </Layer>

      {/* Floating status chip — top right, contained */}
      <Layer
        delay={0.18}
        className="absolute right-[4%] top-[6%] z-10 rounded-xl border border-white/[0.1] bg-[#141414]/95 p-3 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.9)] backdrop-blur-sm"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04]">
            <div className="h-2.5 w-2.5 rounded-[2px] border border-white/45" />
          </div>
          <div className="space-y-1.5">
            <div className="h-1 w-14 rounded-full bg-white/20" />
            <div className="h-1 w-9 rounded-full bg-white/[0.08]" />
          </div>
        </div>
      </Layer>

      {/* Floating list chip — bottom left, contained */}
      <Layer
        delay={0.28}
        className="absolute bottom-[5%] left-[3%] z-10 w-[46%] rounded-xl border border-white/[0.1] bg-[#141414]/95 p-3 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.9)] backdrop-blur-sm"
      >
        <div className="mb-2.5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <div className="h-1 w-16 rounded-full bg-white/15" />
        </div>
        <div className="space-y-2">
          <div className="h-1 w-full rounded-full bg-white/[0.08]" />
          <div className="h-1 w-[78%] rounded-full bg-white/[0.06]" />
          <div className="h-1 w-[90%] rounded-full bg-white/[0.06]" />
        </div>
      </Layer>
    </div>
  );
}
