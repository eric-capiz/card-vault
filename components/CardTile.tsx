"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { formatMoney } from "@/lib/ygoprodeck";

interface CardTileProps {
  imageSmall: string;
  name: string;
  type: string;
  price?: number;
  qty?: number;
  badge?: string;
  onClick?: () => void;
  action?: React.ReactNode;
  /** stagger order in a grid; entrance delay derives from it */
  index?: number;
}

/** Foil-toned badge colors per rarity family. */
function rarityStyle(rarity?: string): React.CSSProperties {
  const r = (rarity ?? "").toLowerCase();
  if (r.includes("starlight") || r.includes("quarter century"))
    return {
      background: "linear-gradient(115deg,#c4b5fd,#67e8f9,#f9a8d4,#fcd34d)",
      color: "#0a0a0f",
    };
  if (r.includes("secret"))
    return { background: "rgba(167,139,250,0.9)", color: "#0a0a0f" };
  if (r.includes("ultra"))
    return { background: "rgba(252,211,77,0.92)", color: "#0a0a0f" };
  if (r.includes("super"))
    return { background: "rgba(103,232,249,0.9)", color: "#0a0a0f" };
  if (r.includes("ghost"))
    return { background: "rgba(244,244,246,0.9)", color: "#0a0a0f" };
  if (r.includes("gold"))
    return { background: "rgba(251,191,36,0.9)", color: "#0a0a0f" };
  if (r.includes("rare"))
    return { background: "rgba(255,255,255,0.14)", color: "#f4f4f6" };
  return { background: "rgba(255,255,255,0.08)", color: "#a7a7bb" };
}

/**
 * Visual card tile: cursor-tracked 3D tilt with spring physics, a moving
 * glare highlight, and a holo shimmer sweep on hover. Card art is the hero.
 * Degrades gracefully on touch (no hover → no tilt).
 */
export default function CardTile({
  imageSmall,
  name,
  type,
  price,
  qty,
  badge,
  onClick,
  action,
  index = 0,
}: CardTileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shining, setShining] = useState(false);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), {
    stiffness: 320,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), {
    stiffness: 320,
    damping: 24,
  });
  const gx = useTransform(px, [0, 1], [15, 85]);
  const gy = useTransform(py, [0, 1], [10, 90]);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.22), transparent 62%)`;
  const glareOpacity = useMotionValue(0);
  const glareSpring = useSpring(glareOpacity, { stiffness: 260, damping: 26 });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    py.set(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };

  const handleEnter = () => {
    glareOpacity.set(1);
    setShining(false);
    // retrigger the holo sweep each hover
    requestAnimationFrame(() => setShining(true));
  };

  const handleLeave = () => {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{
        duration: 0.55,
        delay: Math.min(index, 11) * 0.045,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ perspective: 950 }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-panel transition-[border-color,box-shadow] duration-300 hover:border-foil-violet/40 hover:shadow-[0_20px_55px_rgba(0,0,0,0.6),0_0_36px_rgba(167,139,250,0.14)] ${
          onClick ? "cursor-pointer" : ""
        }`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? `View ${name}` : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        <div className={`holo relative aspect-[3/4.4] w-full ${shining ? "holo-shine" : ""}`}>
          {imageSmall ? (
            <Image
              src={imageSmall}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-panel2 font-display text-4xl text-dim">
              ?
            </div>
          )}
          {/* cursor-tracked glare */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-[3]"
            style={{ background: glare, opacity: glareSpring }}
          />
          {badge && (
            <span
              className="absolute left-2 top-2 z-[4] rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
              style={rarityStyle(badge)}
            >
              {badge}
            </span>
          )}
          {typeof qty === "number" && qty > 1 && (
            <span className="absolute right-2 top-2 z-[4] rounded-md bg-black/80 px-2 py-0.5 text-xs font-extrabold text-value ring-1 ring-value/40 backdrop-blur-sm">
              ×{qty}
            </span>
          )}
        </div>
        <div className="space-y-1 p-2.5 sm:p-3">
          <p className="truncate font-display text-[13px] font-bold leading-tight text-paper" title={name}>
            {name}
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] text-fog">{type}</p>
            {typeof price === "number" && price > 0 && (
              <p className="shrink-0 text-[12px] font-extrabold text-value">{formatMoney(price)}</p>
            )}
          </div>
          {action && (
            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              {action}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
