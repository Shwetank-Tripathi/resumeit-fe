"use client";

import type { AiEditResult } from "@/lib/api";
import { DIFF_ADDED_CLASS, DIFF_REMOVED_CLASS, DIFF_UNCHANGED_CLASS, diffLines } from "@/lib/diff";

interface AiEditPreviewProps {
  result: AiEditResult;
  beforeLatex: string;
  saveMode: "branch" | "overwrite" | null;
  saveError: string | null;
  onBranch: () => void;
  onOverwrite: () => void;
}

export default function AiEditPreview({
  result,
  beforeLatex,
  saveMode,
  saveError,
  onBranch,
  onOverwrite,
}: AiEditPreviewProps) {
  const saving = saveMode !== null;

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
      <div className="flex flex-col gap-3">
        <span className="label-sm text-text-secondary">Summary</span>
        <p className="rounded-radius-default border border-border-subtle bg-bg-surface px-3 py-2.5 text-sm text-text-primary">
          {result.summary}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="label-sm text-text-secondary">Before / After</span>
        <LatexDiffPane beforeLatex={beforeLatex} afterLatex={result.latex} />
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

function LatexDiffPane({ beforeLatex, afterLatex }: { beforeLatex: string; afterLatex: string }) {
  const lines = diffLines(beforeLatex, afterLatex);

  return (
    <div className="max-h-96 overflow-auto rounded-radius-default border border-border-subtle bg-bg-sidebar p-3 font-mono text-xs">
      {lines.length === 0 ? (
        <span className="text-text-secondary">(empty)</span>
      ) : (
        lines.map((line, index) => (
          <div
            key={index}
            className={`whitespace-pre-wrap ${
              line.type === "added"
                ? DIFF_ADDED_CLASS
                : line.type === "removed"
                  ? DIFF_REMOVED_CLASS
                  : DIFF_UNCHANGED_CLASS
            }`}
          >
            {line.text.length > 0 ? line.text : " "}
          </div>
        ))
      )}
    </div>
  );
}
