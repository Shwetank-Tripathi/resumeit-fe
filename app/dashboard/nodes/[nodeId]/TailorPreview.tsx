"use client";

import type { TailoredBlockChange, TailorResult } from "@/lib/api";
import { DIFF_ADDED_CLASS } from "@/lib/diff";

interface TailorPreviewProps {
  result: TailorResult;
  saveMode: "branch" | "overwrite" | null;
  saveError: string | null;
  onBranch: () => void;
  onOverwrite: () => void;
}

export default function TailorPreview({
  result,
  saveMode,
  saveError,
  onBranch,
  onOverwrite,
}: TailorPreviewProps) {
  const anyMoved = result.changes.some((c) => c.moved);
  const saving = saveMode !== null;

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
      <div className="flex flex-col gap-3">
        <span className="label-sm text-text-secondary">Reorder Preview</span>

        {result.changes.length === 0 ? (
          <p className="rounded-radius-default border border-border-subtle bg-bg-surface px-3 py-2.5 text-sm text-text-secondary">
            No bullet lists (<code className="font-mono">\itemize</code> blocks) were found in this
            resume, so there was nothing to reorder.
          </p>
        ) : !anyMoved ? (
          <p className="rounded-radius-default border border-border-subtle bg-bg-surface px-3 py-2.5 text-sm text-text-secondary">
            Every bullet list is already in the best order for this job description — nothing to
            reorder.
          </p>
        ) : (
          result.changes.map((block) => <BlockDiff key={block.blockIndex} block={block} />)
        )}
      </div>

      <div className="flex flex-col gap-3">
        <span className="label-sm text-text-secondary">Keywords</span>
        <p className="text-xs text-text-secondary">
          Whether each keyword from the job description appears anywhere in this resume —
          presence/absence only, not a match score.
        </p>

        <div className="flex flex-col gap-2">
          <KeywordList label="Matched" tone="matched" keywords={result.matchedKeywords} />
          <KeywordList label="Missing" tone="missing" keywords={result.missingKeywords} />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-border-subtle pt-4">
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        <button
          type="button"
          onClick={onBranch}
          disabled={saving}
          className="label-md rounded-radius-default bg-accent-ai px-4 py-3 text-bg-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMode === "branch" ? "Saving…" : "Save as New Version"}
        </button>
        <button
          type="button"
          onClick={onOverwrite}
          disabled={saving}
          className="label-md rounded-radius-default border border-border-strong px-4 py-3 text-text-primary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMode === "overwrite" ? "Saving…" : "Overwrite This Version"}
        </button>
        <p className="text-center text-xs text-text-secondary">
          New Version branches this resume — the current one is kept. Overwrite replaces this
          version&apos;s content in place.
        </p>
      </div>
    </div>
  );
}

function BlockDiff({ block }: { block: TailoredBlockChange }) {
  if (block.skipped) {
    return (
      <div className="rounded-radius-default border border-border-subtle bg-bg-surface px-3 py-2.5">
        <p className="label-sm text-text-secondary">Block {block.blockIndex + 1} — skipped</p>
        <p className="mt-1 text-sm text-text-secondary">{block.skipReason}</p>
      </div>
    );
  }

  if (block.itemCount === 0) {
    return (
      <div className="rounded-radius-default border border-border-subtle bg-bg-surface px-3 py-2.5">
        <p className="label-sm text-text-secondary">Block {block.blockIndex + 1} — empty, nothing to reorder</p>
      </div>
    );
  }

  const movedCount = block.items.filter((item) => item.fromIndex !== item.toIndex).length;

  return (
    <div className="rounded-radius-default border border-border-subtle bg-bg-surface p-3">
      <p className="label-sm mb-2 text-text-secondary">
        Block {block.blockIndex + 1} —{" "}
        {block.moved ? `${movedCount} of ${block.itemCount} moved` : "already in order"}
      </p>
      <ol className="flex flex-col gap-1.5">
        {block.items.map((item) => {
          const moved = item.fromIndex !== item.toIndex;
          return (
            <li
              key={`${item.fromIndex}-${item.toIndex}`}
              className={`rounded-radius-default px-2.5 py-2 text-sm ${
                moved ? DIFF_ADDED_CLASS : "text-text-secondary"
              }`}
            >
              <span className="mr-2 text-xs text-text-secondary">
                {moved ? `#${item.fromIndex + 1} → #${item.toIndex + 1}` : `#${item.toIndex + 1}`}
              </span>
              {item.text}
              <span className="ml-2 label-sm text-text-secondary">
                {item.matchCount} keyword{item.matchCount === 1 ? "" : "s"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function KeywordList({
  label,
  tone,
  keywords,
}: {
  label: string;
  tone: "matched" | "missing";
  keywords: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-text-secondary">
        {label} ({keywords.length})
      </span>
      {keywords.length === 0 ? (
        <p className="text-xs text-text-secondary">None.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((keyword) => (
            <span
              key={keyword}
              className={`label-sm rounded-radius-sm px-1.5 py-0.5 ${
                tone === "matched"
                  ? "bg-accent-muted text-accent"
                  : "border border-border-subtle text-text-secondary line-through"
              }`}
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
