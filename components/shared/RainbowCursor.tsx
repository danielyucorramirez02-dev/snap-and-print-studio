"use client";

import { useEffect } from "react";

export default function RainbowCursor() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches || window.matchMedia("(pointer: coarse)").matches) return;

    let last = 0;
    let hue = 175;

    function handlePointerMove(event: PointerEvent) {
      const now = performance.now();
      if (now - last < 28) return;
      last = now;
      hue = (hue + 24) % 360;

      const dot = document.createElement("span");
      dot.className = "rainbow-cursor-dot";
      dot.style.left = `${event.clientX}px`;
      dot.style.top = `${event.clientY}px`;
      dot.style.setProperty("--cursor-hue", String(hue));
      document.body.appendChild(dot);

      window.setTimeout(() => dot.remove(), 650);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return null;
}
