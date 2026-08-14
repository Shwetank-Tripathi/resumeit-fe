"use client";

import type { ElementType, ReactNode } from "react";

export type CardPadding = "sm" | "md" | "lg";

const PADDING_CLASS: Record<CardPadding, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-8",
};

interface CardProps {
  padding?: CardPadding;
  selected?: boolean;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export default function Card({
  padding = "md",
  selected = false,
  as: Component = "div",
  className,
  children,
}: CardProps) {
  const borderClass = selected
    ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]"
    : "border-border-subtle";

  return (
    <Component
      className={`rounded-radius-lg border ${borderClass} bg-bg-surface ${PADDING_CLASS[padding]} ${className ?? ""}`.trim()}
    >
      {children}
    </Component>
  );
}
