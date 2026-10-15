"use client";

import Image from "next/image";
import { formatMoney } from "@/lib/ygoprodeck";

interface CardTileProps {
  imageSmall: string;
  name: string;
  type: string;
  price?: number;
  qty?: number;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
  action?: React.ReactNode;
}

/** Visual card tile with hover tilt + holo shimmer. Card art is the hero. */
export default function CardTile({
  imageSmall,
  name,
  type,
  price,
  qty,
  badge,
  badgeColor,
  onClick,
  action,
}: CardTileProps) {
  return (
    <div className="tilt-stage rise-in">
      <div
        className={`tilt-card holo group relative cursor-pointer overflow-hidden rounded-xl border border-[rgba(255,215,0,0.14)] bg-[#121b36] ${
          onClick ? "" : "cursor-default"
        }`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter") onClick();
              }
            : undefined
        }
      >
        <div className="relative aspect-[3/4.4] w-full">
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
            <div className="grid h-full w-full place-items-center bg-[#182244] text-4xl text-slate-600">?</div>
          )}
          {badge && (
            <span
              className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black"
              style={{ backgroundColor: badgeColor ?? "#ffd700" }}
            >
              {badge}
            </span>
          )}
          {typeof qty === "number" && qty > 1 && (
            <span className="absolute right-2 top-2 rounded-md bg-black/75 px-2 py-0.5 text-xs font-extrabold text-[#ffd700] ring-1 ring-[rgba(255,215,0,0.4)]">
              ×{qty}
            </span>
          )}
        </div>
        <div className="space-y-1 p-2.5">
          <p className="truncate text-[13px] font-bold leading-tight text-white" title={name}>
            {name}
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] text-slate-400">{type}</p>
            {typeof price === "number" && price > 0 && (
              <p className="shrink-0 text-[12px] font-bold text-[#ffd700]">{formatMoney(price)}</p>
            )}
          </div>
          {action && <div className="pt-1" onClick={(e) => e.stopPropagation()}>{action}</div>}
        </div>
      </div>
    </div>
  );
}
