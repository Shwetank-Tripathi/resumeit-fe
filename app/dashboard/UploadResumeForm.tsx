"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  mergeIntake,
  parseIntakeFile,
  parseIntakeText,
  type ExtractedResumeData,
  type TemplateSummary,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import TextField from "@/components/ui/TextField";

type UploadSubMode = "file" | "text";

interface UploadResumeFormProps {
  title: string;
  templates: TemplateSummary[];
  templatesLoading: boolean;
  templatesError: string | null;
  onAddRootNode: (
    title: string,
    options?: { templateId?: string; latex?: string },
  ) => Promise<void>;
  onCreated: () => void;
  onBusyChange: (busy: boolean) => void;
}

const ACCEPTED_FILE_TYPES = "application/pdf,image/jpeg,image/png,image/webp";

export default function UploadResumeForm({
  title,
  templates,
  templatesLoading,
  templatesError,
  onAddRootNode,
  onCreated,
  onBusyChange,
}: UploadResumeFormProps) {
  const [subMode, setSubMode] = useState<UploadSubMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedResumeData | null>(null);

  const [mergingTemplateId, setMergingTemplateId] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergedResult, setMergedResult] = useState<{ latex: string; summary: string } | null>(
    null,
  );

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const busy = extracting || mergingTemplateId !== null || creating;

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  function handleSubModeChange(next: UploadSubMode) {
    setSubMode(next);
    setExtractError(null);
  }

  async function handleExtractFile() {
    if (!file) return;
    const token = getToken();
    if (!token) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const result = await parseIntakeFile(token, file);
      setExtracted(result);
      setMergedResult(null);
      setMergeError(null);
    } catch (err) {
      setExtractError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setExtracting(false);
    }
  }

  async function handleExtractText() {
    const trimmed = pastedText.trim();
    if (!trimmed) return;
    const token = getToken();
    if (!token) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const result = await parseIntakeText(token, trimmed);
      setExtracted(result);
      setMergedResult(null);
      setMergeError(null);
    } catch (err) {
      setExtractError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setExtracting(false);
    }
  }

  async function handleTemplateSelect(templateId: string) {
    if (!extracted) return;
    const token = getToken();
    if (!token) return;
    setMergingTemplateId(templateId);
    setMergeError(null);
    try {
      const result = await mergeIntake(token, templateId, extracted);
      setMergedResult(result);
    } catch (err) {
      setMergeError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setMergingTemplateId(null);
    }
  }

  async function handleCreate() {
    if (!mergedResult) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setCreateError("Enter a title first.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await onAddRootNode(trimmed, { latex: mergedResult.latex });
      onCreated();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedToggle
        variant="neutral"
        size="sm"
        className="self-start"
        disabled={extracting}
        value={subMode}
        onChange={(value) => handleSubModeChange(value as UploadSubMode)}
        options={[
          { value: "file", label: "File" },
          { value: "text", label: "Paste Text" },
        ]}
      />

      {subMode === "file" ? (
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            disabled={extracting}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm text-text-secondary disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Button
            variant="primary"
            className="self-start"
            onClick={() => void handleExtractFile()}
            disabled={extracting || !file}
          >
            {extracting ? "Extracting…" : "Extract"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <TextField
            multiline
            variant="code"
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            disabled={extracting}
            spellCheck={false}
            rows={8}
            maxLength={20000}
            placeholder="Paste your resume text here…"
            className="resize-none"
          />
          <Button
            variant="primary"
            className="self-start"
            onClick={() => void handleExtractText()}
            disabled={extracting || !pastedText.trim()}
          >
            {extracting ? "Extracting…" : "Extract"}
          </Button>
        </div>
      )}

      {extractError && (
        <p role="alert" className="text-sm text-danger">
          {extractError}
        </p>
      )}

      {extracted && (
        <Card padding="sm" className="flex flex-col gap-3">
          <span className="label-sm text-text-secondary">Extracted</span>

          {!extracted.name &&
            !extracted.contact &&
            !extracted.summary &&
            extracted.sections.length === 0 && (
              <p className="text-sm text-text-secondary">
                No content could be extracted from this file — try a clearer file or paste the
                text directly.
              </p>
            )}

          {extracted.name && <p className="text-sm text-text-primary">{extracted.name}</p>}
          {extracted.contact && (
            <p className="text-sm text-text-secondary">{extracted.contact}</p>
          )}
          {extracted.summary && <p className="text-sm text-text-primary">{extracted.summary}</p>}

          {extracted.sections.map((section, sectionIndex) => (
            <div key={`${section.heading}-${sectionIndex}`} className="flex flex-col gap-1">
              <span className="label-sm text-text-secondary">{section.heading}</span>
              <ul className="list-disc pl-5 text-sm text-text-primary">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            </div>
          ))}

          <span className="label-sm mt-2 text-text-secondary">Choose a Template</span>

          {templatesLoading && <p className="label-sm text-text-secondary">Loading templates…</p>}

          {!templatesLoading && templatesError && (
            <p role="alert" className="text-sm text-danger">
              {templatesError}
            </p>
          )}

          {!templatesLoading && !templatesError && templates.length === 0 && (
            <p className="text-sm text-text-secondary">No templates available yet.</p>
          )}

          {!templatesLoading && !templatesError && templates.length > 0 && (
            <ul className="flex flex-col gap-2">
              {templates.map((template) => (
                <li key={template._id}>
                  <button
                    type="button"
                    onClick={() => void handleTemplateSelect(template._id)}
                    disabled={mergingTemplateId !== null}
                    className="w-full rounded-radius-default border border-border-subtle p-3 text-left transition-colors hover:border-accent-gold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <p className="label-sm text-text-primary">
                      {mergingTemplateId === template._id ? "Merging…" : template.name}
                    </p>
                    {template.description && (
                      <p className="mt-1 text-sm text-text-secondary">{template.description}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {mergeError && (
            <p role="alert" className="text-sm text-danger">
              {mergeError}
            </p>
          )}
        </Card>
      )}

      {mergedResult && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="label-sm text-text-secondary">Summary</span>
            <p className="rounded-radius-default border border-border-subtle bg-bg-surface px-3 py-2.5 text-sm text-text-primary">
              {mergedResult.summary}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="label-sm text-text-secondary">LaTeX</span>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-radius-default border border-border-subtle bg-bg-sidebar p-3 font-mono text-xs text-text-primary">
              {mergedResult.latex}
            </pre>
          </div>

          {createError && (
            <p role="alert" className="text-sm text-danger">
              {createError}
            </p>
          )}

          <Button
            variant="primary"
            className="self-start"
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? "Creating…" : "Create Resume"}
          </Button>
        </div>
      )}
    </div>
  );
}
