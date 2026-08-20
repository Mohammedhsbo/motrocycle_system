import clsx from "clsx";

interface MotorcycleVisualProps {
  src?: string;
  alt: string;
  priority?: boolean;
  className?: string;
}

export function MotorcycleVisual({ src, alt, priority = false, className }: MotorcycleVisualProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={clsx("absolute inset-0 h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <div className={clsx("moto-fallback", className)} role="img" aria-label={alt}>
      <div className="moto-silhouette">
        <span className="wheel wheel-left" />
        <span className="wheel wheel-right" />
        <span className="bike-line bike-line-main" />
        <span className="bike-line bike-line-seat" />
        <span className="bike-line bike-line-front" />
      </div>
    </div>
  );
}
