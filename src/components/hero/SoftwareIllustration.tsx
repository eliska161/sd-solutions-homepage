"use client";

import { motion, useReducedMotion } from "framer-motion";

export function SoftwareIllustration() {
  const prefersReducedMotion = useReducedMotion();

  const fade = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.8,
            delay: 0.15 + delay,
            ease: [0.22, 1, 0.36, 1] as const,
          },
        };

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[420px] lg:max-w-none"
      aria-hidden="true"
    >
      {/* Soft radial light */}
      <div className="absolute left-1/2 top-1/2 h-[65%] w-[65%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03] blur-3xl" />

      {/* Outer geometric frame */}
      <motion.div
        className="absolute inset-[6%] rounded-[28px] border border-white/[0.08]"
        {...fade(0)}
      />

      {/* Inner frame offset */}
      <motion.div
        className="absolute inset-[14%] rounded-[22px] border border-white/[0.06]"
        {...fade(0.08)}
      />

      {/* Floating outline window — top */}
      <motion.div
        className="absolute left-[18%] top-[18%] h-[32%] w-[48%] rounded-2xl border border-white/[0.12] bg-white/[0.015]"
        {...fade(0.14)}
      >
        <div className="flex h-8 items-center gap-1.5 border-b border-white/[0.06] px-3">
          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/12" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/8" />
        </div>
        <div className="space-y-2.5 p-4">
          <div className="h-px w-2/3 bg-white/10" />
          <div className="h-px w-1/2 bg-white/[0.06]" />
          <div className="h-px w-3/5 bg-white/[0.06]" />
        </div>
      </motion.div>

      {/* Floating outline window — bottom right */}
      <motion.div
        className="absolute bottom-[16%] right-[12%] h-[38%] w-[46%] rounded-2xl border border-white/[0.1] bg-white/[0.02]"
        {...fade(0.22)}
      >
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-6 rounded-lg border border-white/15" />
            <div className="h-px w-10 bg-white/10" />
          </div>
          <div className="space-y-3">
            <div className="h-px w-full bg-white/[0.07]" />
            <div className="h-px w-4/5 bg-white/[0.05]" />
            <div className="h-px w-3/5 bg-white/[0.05]" />
          </div>
        </div>
      </motion.div>

      {/* Small geometric accents */}
      <motion.div
        className="absolute right-[22%] top-[12%] h-10 w-10 rounded-full border border-white/15"
        {...fade(0.3)}
      />
      <motion.div
        className="absolute bottom-[28%] left-[10%] h-3 w-3 rotate-45 border border-white/20"
        {...fade(0.36)}
      />
      <motion.div
        className="absolute right-[8%] top-[42%] h-px w-12 bg-white/15"
        {...fade(0.4)}
      />
    </div>
  );
}
