"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "outline"
  | "outline-subtle"
  | "gold-outline"
  | "ai"
  | "tailor"
  | "danger"
  | "link";

export type ButtonSize = "sm" | "md";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-accent-strong text-text-on-accent-strong hover:opacity-90",
  outline: "border border-border-strong text-text-primary hover:border-accent hover:text-accent",
  "outline-subtle": "border border-border-subtle text-text-secondary hover:text-text-primary",
  "gold-outline": "border border-accent-gold text-text-primary hover:bg-bg-surface",
  ai: "bg-accent-ai text-bg-canvas hover:opacity-90",
  tailor:
    "border border-accent-tailor/30 bg-accent-tailor/10 text-accent-tailor hover:bg-accent-tailor/20",
  danger: "bg-danger text-bg-canvas hover:opacity-90",
  link: "text-accent hover:underline",
};

const SIZE_TEXT: Record<ButtonSize, string> = {
  sm: "label-sm",
  md: "label-md",
};

const SIZE_PADDING: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2.5",
};

function classesFor(variant: ButtonVariant, size: ButtonSize) {
  const base = "inline-flex items-center justify-center gap-2 rounded-radius-default transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const text = SIZE_TEXT[size];
  const padding = variant === "link" ? "" : SIZE_PADDING[size];
  return `${base} ${text} ${padding} ${VARIANT_CLASS[variant]}`.trim();
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

type ButtonAsButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & { href?: undefined };

type ButtonAsLinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href"> & { href: string };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...rest
}: ButtonProps) {
  const classes = `${classesFor(variant, size)} ${className ?? ""}`.trim();

  if (href !== undefined) {
    return (
      <Link href={href} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button type={type} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
