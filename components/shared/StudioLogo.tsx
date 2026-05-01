"use client";

import Image from "next/image";

interface StudioLogoProps {
  size?: number;
  className?: string;
}

export default function StudioLogo({ size = 80, className = "" }: StudioLogoProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src="/logo.jpg"
        alt="Snap & Print Studio"
        fill
        className="object-contain"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        priority
      />
    </div>
  );
}
