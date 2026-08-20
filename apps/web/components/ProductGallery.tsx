"use client";

import { useState } from "react";
import { MotorcycleVisual } from "./MotorcycleVisual";
import { X } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const activeImage = images[active];

  return (
    <>
      <div className="space-y-3">
        <button onClick={() => setFullscreen(true)} className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-100 text-left">
          <MotorcycleVisual src={activeImage} alt={title} priority />
        </button>
        <div className="grid grid-cols-4 gap-3">
          {(images.length ? images : [""]).slice(0, 8).map((image, index) => (
            <button key={`${image}-${index}`} onClick={() => setActive(index)} className={`relative aspect-[4/3] overflow-hidden rounded-md border ${active === index ? "border-red-700" : "border-zinc-200"}`}>
              <MotorcycleVisual src={image || undefined} alt={`${title} thumbnail ${index + 1}`} />
            </button>
          ))}
        </div>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/90 p-4" role="dialog" aria-modal="true" aria-label={`${title} gallery`}>
          <button onClick={() => setFullscreen(false)} className="absolute right-4 top-4 rounded-full bg-white p-2 text-zinc-950" aria-label="Close gallery">
            <X size={20} />
          </button>
          <div className="mx-auto grid h-full max-w-6xl place-items-center">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-zinc-900">
              <MotorcycleVisual src={activeImage} alt={title} priority />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
