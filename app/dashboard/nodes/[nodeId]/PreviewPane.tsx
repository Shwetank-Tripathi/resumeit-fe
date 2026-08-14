"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import type { CompileStatus } from "./TopBar";

interface PreviewPaneProps {
  compileStatus: CompileStatus;
  pdfUrl: string | null;
}

function PaperCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 w-full max-w-3xl flex-1 flex-col rounded-radius-lg bg-[#F5F1E6] p-6 shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
      {children}
    </div>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <p className="max-w-xs text-sm text-[#5a5346]">{children}</p>
    </div>
  );
}

export default function PreviewPane({ compileStatus, pdfUrl }: PreviewPaneProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-sidebar">
      {compileStatus === "error" && pdfUrl && (
        <p className="label-sm flex-shrink-0 border-b border-border-subtle bg-bg-surface px-4 py-2 text-danger">
          Last compile failed — showing the previous successful preview. See details below the editor.
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-auto p-8">
        <PaperCard>
          {pdfUrl ? (
            <object
              data={pdfUrl}
              type="application/pdf"
              className="min-h-0 flex-1 rounded-radius-default bg-white"
              aria-label="Compiled resume preview"
            >
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <p className="text-sm text-[#5a5346]">
                  Your browser can&apos;t preview the PDF inline.{" "}
                  <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    Open it in a new tab
                  </a>
                  .
                </p>
              </div>
            </object>
          ) : compileStatus === "compiling" ? (
            <Placeholder>Compiling…</Placeholder>
          ) : compileStatus === "error" ? (
            <Placeholder>Compile failed — see details below the editor.</Placeholder>
          ) : (
            <Placeholder>Click Compile to see a preview.</Placeholder>
          )}
        </PaperCard>

        {pdfUrl && (
          <Button href={pdfUrl} download variant="outline" size="sm">
            Download PDF
          </Button>
        )}
      </div>
    </div>
  );
}
