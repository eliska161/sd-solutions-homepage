"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

export function KioskSignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<Point | null>(null);
  const ink = useRef(false);

  function sizeCanvas(canvas: HTMLCanvasElement) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 240;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f2430";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    sizeCanvas(canvas);
    const onResize = () => {
      ink.current = false;
      onChange(null);
      sizeCanvas(canvas);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [onChange]);

  function point(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function emit() {
    const canvas = canvasRef.current;
    if (!canvas || !ink.current) {
      onChange(null);
      return;
    }
    onChange(canvas.toDataURL("image/png"));
  }

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="h-[240px] w-full touch-none border-[3px] border-[#1f2430] bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          last.current = point(e);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const ctx = e.currentTarget.getContext("2d");
          if (!ctx) return;
          const next = point(e);
          ctx.beginPath();
          ctx.moveTo(last.current.x, last.current.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
          last.current = next;
          ink.current = true;
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
          emit();
        }}
        onPointerCancel={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
      <button
        type="button"
        className="mt-2 text-[18px] font-bold underline"
        onClick={() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          ink.current = false;
          onChange(null);
          sizeCanvas(canvas);
        }}
      >
        Tøm signatur
      </button>
    </div>
  );
}
