interface IconProps {
  className?: string;
}

export function TreeOrientationIcon({
  orientation,
  className,
}: IconProps & { orientation: "vertical" | "horizontal" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <g transform={orientation === "horizontal" ? "rotate(90 12 12)" : undefined}>
        <rect x="9" y="2" width="6" height="5" rx="1.2" />
        <rect x="3" y="14" width="6" height="5" rx="1.2" />
        <rect x="15" y="14" width="6" height="5" rx="1.2" />
        <path d="M12 7v3M6 10v4M18 10v4M6 10h12" />
      </g>
    </svg>
  );
}

export function CollapseAllIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7 4l5 5 5-5" />
      <path d="M7 20l5-5 5 5" />
    </svg>
  );
}
