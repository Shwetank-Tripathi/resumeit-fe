"use client";

import { useRef, useState, type UIEvent } from "react";
import type { CompileError } from "@/lib/api";

interface SourcePaneProps {
  value: string;
  onChange: (value: string) => void;
  compileFailure: CompileError | null;
}

const TOKEN_REGEX = /\\[a-zA-Z]+|(?<!\\)%.*$/g;

type TokenType = "cmd" | "comment" | "text";

interface Token {
  type: TokenType;
  text: string;
}

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(TOKEN_REGEX)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ type: "text", text: line.slice(lastIndex, index) });
    }
    const matched = match[0];
    tokens.push({ type: matched.startsWith("%") ? "comment" : "cmd", text: matched });
    lastIndex = index + matched.length;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: "text", text: line.slice(lastIndex) });
  }
  if (tokens.length === 0) {
    tokens.push({ type: "text", text: line });
  }
  return tokens;
}

const TOKEN_CLASS: Record<TokenType, string> = {
  cmd: "text-accent",
  comment: "italic text-text-secondary",
  text: "",
};

const EDITOR_FONT_CLASS = "font-mono text-sm leading-relaxed";

export default function SourcePane({ value, onChange, compileFailure }: SourcePaneProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const overlayRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const [lastSeenFailure, setLastSeenFailure] = useState(compileFailure);
  if (compileFailure !== lastSeenFailure) {
    setLastSeenFailure(compileFailure);
    if (compileFailure) setPanelOpen(true);
  }

  const lines = value.split("\n");

  function syncScroll(event: UIEvent<HTMLTextAreaElement>) {
    const el = event.currentTarget;
    if (overlayRef.current) {
      overlayRef.current.scrollTop = el.scrollTop;
      overlayRef.current.scrollLeft = el.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = el.scrollTop;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-r border-border-subtle">
      <div className="m-4 flex min-h-0 flex-1 overflow-hidden rounded-radius-lg border border-border-subtle bg-bg-sidebar focus-within:border-accent-gold">
        <div
          ref={gutterRef}
          aria-hidden
          className={`select-none overflow-hidden py-4 pl-3 pr-2 text-right text-text-secondary ${EDITOR_FONT_CLASS}`}
        >
          {lines.map((_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <pre
            ref={overlayRef}
            aria-hidden
            className={`pointer-events-none absolute inset-0 overflow-auto whitespace-pre p-4 ${EDITOR_FONT_CLASS}`}
          >
            {lines.map((line, index) => (
              <div key={index}>
                {tokenizeLine(line).map((token, tokenIndex) => (
                  <span key={tokenIndex} className={TOKEN_CLASS[token.type]}>
                    {token.text.length > 0 ? token.text : " "}
                  </span>
                ))}
              </div>
            ))}
          </pre>

          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            wrap="off"
            aria-label="LaTeX source"
            placeholder={"\\documentclass{article}\n\\begin{document}\n\n\\end{document}"}
            className={`absolute inset-0 resize-none overflow-auto whitespace-pre bg-transparent p-4 text-transparent caret-text-primary placeholder:text-text-secondary focus:outline-none ${EDITOR_FONT_CLASS}`}
          />
        </div>
      </div>

      {compileFailure && (
        <div className="mx-4 mb-4 flex-shrink-0 rounded-radius-lg border border-border-subtle bg-bg-surface">
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            className="label-sm flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className={compileFailure.failure.kind === "rejected" ? "text-accent-gold" : "text-danger"}>
              {failureHeading(compileFailure)}
            </span>
            <span className="text-text-secondary">{panelOpen ? "Hide ▾" : "Show ▸"}</span>
          </button>

          {panelOpen && (
            <div className="border-t border-border-subtle px-4 py-3">
              <FailureBody failure={compileFailure} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function failureHeading(error: CompileError): string {
  switch (error.failure.kind) {
    case "compile-error":
      return "Compile error";
    case "rejected":
      return "Rejected — disallowed construct";
    case "timeout":
      return "Compile timed out";
    case "unexpected":
      return `Unexpected error (${error.failure.status})`;
  }
}

function FailureBody({ failure }: { failure: CompileError }) {
  switch (failure.failure.kind) {
    case "compile-error":
      return (
        <>
          <p className="mb-2 text-sm text-text-secondary">
            Tectonic couldn&apos;t compile this source. Log output:
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-text-primary">
            {failure.failure.log || "(no log output)"}
          </pre>
        </>
      );
    case "rejected":
      return (
        <>
          <p className="text-sm text-text-primary">{failure.failure.reason}</p>
          <p className="mt-2 text-sm text-text-secondary">
            This isn&apos;t a syntax problem — the source was refused before compilation because it
            contains a construct (like <code className="font-mono">\input</code> or{" "}
            <code className="font-mono">\write18</code>) that could read or write files outside the
            resume itself. Remove it and try again.
          </p>
        </>
      );
    case "timeout":
      return (
        <p className="text-sm text-text-secondary">
          The compile server didn&apos;t finish within its time budget (~15s). This usually means the
          document is unusually large or has a runaway construct (e.g. an infinite loop in a macro) —
          try simplifying it and compiling again.
        </p>
      );
    case "unexpected":
      return (
        <p className="text-sm text-text-secondary">
          Something went wrong on the server (HTTP {failure.failure.status}). This isn&apos;t about
          your LaTeX — try compiling again in a moment.
        </p>
      );
  }
}
