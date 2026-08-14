"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export type TextFieldVariant = "ledger" | "boxed" | "code";
export type TextFieldSurface = "surface" | "sidebar";
export type TextFieldFocusAccent = "gold" | "ai";

const FOCUS_CLASS: Record<TextFieldFocusAccent, string> = {
  gold: "focus:border-accent-gold",
  ai: "focus:border-accent-ai",
};

const SURFACE_CLASS: Record<TextFieldSurface, string> = {
  surface: "bg-bg-surface",
  sidebar: "bg-bg-sidebar",
};

function fieldClasses(
  variant: TextFieldVariant,
  surface: TextFieldSurface,
  focusAccent: TextFieldFocusAccent,
) {
  const focus = FOCUS_CLASS[focusAccent];
  if (variant === "ledger") {
    return `border-0 border-b-2 border-accent-muted bg-transparent px-1 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none ${focus} disabled:cursor-not-allowed disabled:opacity-60`;
  }
  if (variant === "code") {
    return `rounded-radius-lg border border-border-subtle ${SURFACE_CLASS.sidebar} p-3 font-mono text-sm leading-relaxed text-text-primary placeholder:text-text-secondary focus:outline-none ${focus} disabled:cursor-not-allowed disabled:opacity-60`;
  }
  return `rounded-radius-default border border-border-subtle ${SURFACE_CLASS[surface]} px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none ${focus} disabled:cursor-not-allowed disabled:opacity-60`;
}

interface CommonProps {
  variant?: TextFieldVariant;
  surface?: TextFieldSurface;
  focusAccent?: TextFieldFocusAccent;
  label?: string;
  error?: string;
  helper?: string;
  className?: string;
}

type InputProps = CommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & { multiline?: false };

type TextareaProps = CommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { multiline: true };

export type TextFieldProps = InputProps | TextareaProps;

export default function TextField({
  variant = "ledger",
  surface = "surface",
  focusAccent = "gold",
  label,
  error,
  helper,
  className,
  multiline,
  ...rest
}: TextFieldProps) {
  const classes = `${fieldClasses(variant, surface, focusAccent)} ${className ?? ""}`.trim();

  const field = multiline ? (
    <textarea className={classes} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
  ) : (
    <input className={classes} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
  );

  if (!label && !error && !helper) return field;

  return (
    <label className="flex flex-col gap-2">
      {label && <span className="label-sm text-text-secondary">{label}</span>}
      {field}
      {helper && !error && <span className="text-xs text-text-secondary">{helper}</span>}
      {error && (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
