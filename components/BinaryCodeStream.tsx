"use client";

import { useEffect, useRef } from "react";

const COLUMN_GAP = 20;
const FONT_SIZE = 13;
const GLYPHS = ["0", "1", "0", "1", "0", "1", "0x", "FF", "A4", "1", "0"] as const;

type Column = {
  x: number;
  y: number;
  speed: number;
  chars: string[];
};

function randGlyph() {
  return GLYPHS[(Math.random() * GLYPHS.length) | 0];
}

function buildColumns(width: number, height: number): Column[] {
  const cols: Column[] = [];
  const count = Math.max(8, Math.floor(width / COLUMN_GAP));
  for (let i = 0; i < count; i++) {
    const len = 8 + ((Math.random() * 14) | 0);
    cols.push({
      x: i * COLUMN_GAP + COLUMN_GAP * 0.5,
      y: Math.random() * height,
      speed: 18 + Math.random() * 28,
      chars: Array.from({ length: len }, () => randGlyph()),
    });
  }
  return cols;
}

export function BinaryCodeStream() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let columns: Column[] = [];
    let raf = 0;
    let last = performance.now();
    let inView = true;
    let pageVisible = true;
    let running = true;
    let resizeTimer: number | undefined;

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      const scale = dpr();
      canvas.width = Math.floor(w * scale);
      canvas.height = Math.floor(h * scale);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      columns = buildColumns(w, h);
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 120);
    };

    const tick = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (!inView || !pageVisible) {
        last = now;
        return;
      }

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${FONT_SIZE}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      for (const col of columns) {
        col.y += col.speed * dt;
        const trail = col.chars.length * FONT_SIZE * 1.15;
        if (col.y - trail > h) {
          col.y = -Math.random() * h * 0.3;
          col.speed = 18 + Math.random() * 28;
          if (Math.random() > 0.7) {
            col.chars = col.chars.map(() => randGlyph());
          }
        }

        for (let i = 0; i < col.chars.length; i++) {
          const gy = col.y - i * FONT_SIZE * 1.15;
          if (gy < -FONT_SIZE || gy > h) continue;

          if (i === 0) {
            ctx.fillStyle = "rgba(110, 231, 183, 0.85)";
          } else if (i < 3) {
            ctx.fillStyle = "rgba(16, 185, 129, 0.45)";
          } else {
            ctx.fillStyle = "rgba(6, 78, 59, 0.15)";
          }

          // Occasionally mutate mid-stream glyph for life
          if (i === 0 && Math.random() > 0.97) {
            col.chars[i] = randGlyph();
          }

          ctx.fillText(col.chars[i], col.x, gy);
        }
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
      },
      { threshold: 0.05 },
    );
    io.observe(wrap);

    pageVisible = document.visibilityState === "visible";
    const onVisibility = () => {
      pageVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(6,8,13,0.3) 0%, #06080D 85%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, transparent 60%, #06080D 100%)",
        }}
      />
    </div>
  );
}
