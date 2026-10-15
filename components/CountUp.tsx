"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

/** Animated number that counts up with spring physics when scrolled into view. */
export default function CountUp({
  value,
  format = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 }),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 55, damping: 18 });

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, mv, value]);

  useEffect(
    () =>
      spring.on("change", (v) => {
        if (ref.current) ref.current.textContent = format(v);
      }),
    [spring, format]
  );

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}
