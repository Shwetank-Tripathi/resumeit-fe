"use client";

import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export type CompileStatus = "idle" | "compiling" | "success" | "error";

interface TopBarProps {
  nodeTitle: string;
  collectionName: string | null;
  hasUnsavedChanges: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  compileStatus: CompileStatus;
  lastCompiledAt: Date | null;
  onCompile: () => void;
  onOpenAiEdit: () => void;
}

const STATUS_DOT_CLASS: Record<CompileStatus, string> = {
  idle: "bg-border-strong",
  compiling: "animate-pulse bg-accent-gold",
  success: "bg-accent",
  error: "bg-danger",
};

function statusLabel(status: CompileStatus, lastCompiledAt: Date | null): string {
  if (status === "compiling") return "Compiling…";
  if (!lastCompiledAt) return "Not compiled yet";
  const time = lastCompiledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return status === "error" ? `Failed at ${time}` : `Compiled at ${time}`;
}

export default function TopBar({
  nodeTitle,
  collectionName,
  hasUnsavedChanges,
  saving,
  saveError,
  onSave,
  compileStatus,
  lastCompiledAt,
  onCompile,
  onOpenAiEdit,
}: TopBarProps) {
  return (
    <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-bg-canvas px-6 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src="/logo-transparent.png"
          alt="ResumeIt"
          width={85}
          height={28}
          unoptimized
          className="h-7 w-auto flex-shrink-0"
        />
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="label-md flex-shrink-0 text-text-secondary transition-colors hover:text-text-primary"
        >
          ←
        </Link>
        <p className="min-w-0 truncate font-serif text-lg text-text-primary">
          <Link href="/dashboard" className="text-text-secondary hover:text-text-primary hover:underline">
            {collectionName ?? "Dashboard"}
          </Link>
          <span className="text-text-secondary"> / </span>
          {nodeTitle}
        </p>
        {hasUnsavedChanges && (
          <Badge tone="accent" variant="stamp" className="flex-shrink-0">
            Unsaved changes
          </Badge>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        {saveError && <span className="text-sm text-danger">{saveError}</span>}

        <Button variant="outline" onClick={onSave} disabled={saving || !hasUnsavedChanges}>
          {saving ? "Saving…" : "Save"}
        </Button>

        <Button variant="outline" onClick={onCompile} disabled={compileStatus === "compiling" || saving}>
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[compileStatus]}`} aria-hidden />
          Compile
        </Button>

        <span className="label-sm hidden text-text-secondary sm:inline">
          {statusLabel(compileStatus, lastCompiledAt)}
        </span>

        <Button variant="ai" onClick={onOpenAiEdit}>
          ✦ AI Edit
        </Button>
      </div>
    </header>
  );
}
