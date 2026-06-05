// Prismora logo glyph — a minimal two-facet prism (the "prism" in Prismora).
// Pure SVG, uses `currentColor` so it inherits color from the parent (white on
// the blue chip, blue on light surfaces). No gradients — depth comes from a
// single translucent facet. Scales crisply at any size.
export function PrismoraMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
      style={{ display: "block" }}
    >
      {/* left facet (full) */}
      <path
        d="M16 5.5 L4.8 25.5 L16 25.5 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {/* right facet (depth) */}
      <path
        d="M16 5.5 L27.2 25.5 L16 25.5 Z"
        fill="currentColor"
        fillOpacity="0.45"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
