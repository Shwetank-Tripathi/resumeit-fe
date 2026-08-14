"use client";

export type SegmentedToggleVariant = "neutral" | "mode";
export type SegmentedToggleAccent = "ai" | "tailor" | "gold";
export type SegmentedToggleLayout = "attached" | "separated";

interface SegmentedToggleOption {
  value: string;
  label: string;
  ariaLabel?: string;
  disabled?: boolean;
}

interface SegmentedToggleProps {
  variant?: SegmentedToggleVariant;
  accent?: SegmentedToggleAccent;
  layout?: SegmentedToggleLayout;
  options: SegmentedToggleOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const ACCENT_ACTIVE_CLASS: Record<SegmentedToggleAccent, string> = {
  ai: "bg-accent-ai text-bg-canvas",
  tailor: "bg-accent-tailor text-bg-canvas",
  gold: "bg-accent-gold text-bg-canvas",
};

const NEUTRAL_ACTIVE_CLASS = "bg-bg-toggle-selected text-text-primary";
const INACTIVE_CLASS = "text-text-secondary hover:text-text-primary";

export default function SegmentedToggle({
  variant = "neutral",
  accent = "ai",
  layout = "attached",
  options,
  value,
  onChange,
  disabled = false,
  size = "md",
  className,
}: SegmentedToggleProps) {
  const textClass = size === "sm" ? "label-sm" : "label-md";
  const paddingClass = size === "sm" ? "px-3 py-2" : "px-3 py-2.5";
  const activeClass = variant === "mode" ? ACCENT_ACTIVE_CLASS[accent] : NEUTRAL_ACTIVE_CLASS;

  if (layout === "separated") {
    return (
      <div className={`flex gap-2 ${className ?? ""}`.trim()}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              aria-label={option.ariaLabel ?? option.label}
              title={option.ariaLabel ?? option.label}
              disabled={disabled || option.disabled}
              className={`flex-1 rounded-radius-default border border-border-subtle transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${textClass} ${paddingClass} ${
                active ? activeClass : INACTIVE_CLASS
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`flex overflow-hidden rounded-radius-default border border-border-subtle ${textClass} ${className ?? ""}`.trim()}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            aria-label={option.ariaLabel ?? option.label}
            title={option.ariaLabel ?? option.label}
            disabled={disabled || option.disabled}
            className={`flex-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${paddingClass} ${
              index > 0 ? "border-l border-border-subtle" : ""
            } ${active ? activeClass : INACTIVE_CLASS}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
