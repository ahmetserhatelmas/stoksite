"use client";

import { useState } from "react";

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  emptyLabel?: string;
};

export function ProductPhoto({
  src,
  alt,
  className = "absolute inset-0 h-full w-full object-contain p-2",
  emptyLabel = "Görsel yok",
}: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
