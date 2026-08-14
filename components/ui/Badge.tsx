"use client";

import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "gold" | "ai" | "danger";
export type BadgeVariant = "solid" | "outline" | "stamp";
export type BadgeSize = "sm" | "md";

const TONE_TEXT_STRONG: Record<BadgeTone, string> = {
  neutral: "text-text-primary",
  accent: "text-accent",
  gold: "text-accent-gold",
  ai: "text-accent-ai",
  danger: "text-danger",
};

const TONE_TEXT_MUTED: Record<BadgeTone, string> = {
  neutral: "text-text-secondary",
  accent: "text-accent",
  gold: "text-accent-gold",
  ai: "text-accent-ai",
  danger: "text-danger",
};

const TONE_BORDER: Record<BadgeTone, string> = {
  neutral: "border-border-subtle",
  accent: "border-accent",
  gold: "border-accent-gold",
  ai: "border-accent-ai",
  danger: "border-danger",
};

const TONE_SOLID_BG: Record<BadgeTone, string> = {
  neutral: "bg-border-strong",
  accent: "bg-accent",
  gold: "bg-accent-gold",
  ai: "bg-accent-ai",
  danger: "bg-danger",
};

const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: "rounded-radius-sm px-1.5 py-0.5",
  md: "rounded-radius-default px-2 py-0.5",
};

interface BadgeProps {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  strikethrough?: boolean;
  className?: string;
  children: ReactNode;
}

export default function Badge({
  tone = "neutral",
  variant = "stamp",
  size = "sm",
  strikethrough = false,
  className,
  children,
}: BadgeProps) {
  let toneClasses: string;
  if (variant === "solid") {
    toneClasses = `${TONE_SOLID_BG[tone]} text-bg-canvas`;
  } else if (variant === "outline") {
    toneClasses = `border ${TONE_BORDER[tone]} ${TONE_TEXT_MUTED[tone]}`;
  } else {
    toneClasses = `bg-accent-muted ${TONE_TEXT_STRONG[tone]}`;
  }

  return (
    <span
      className={`label-sm inline-flex items-center ${SIZE_CLASS[size]} ${toneClasses} ${
        strikethrough ? "line-through" : ""
      } ${className ?? ""}`.trim()}
    >
      {children}
    </span>
  );
}
