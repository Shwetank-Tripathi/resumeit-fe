"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  aiEditNode,
  createNode,
  deleteApiKey,
  getAiStatus,
  saveApiKey,
  tailorNode,
  updateNode,
  type AiEditResult,
  type AiStatus,
  type ResumeNodeRecord,
  type TailorResult,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import TailorPreview from "./TailorPreview";
import AiEditPreview from "./AiEditPreview";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import TextField from "@/components/ui/TextField";

type Mode = "job-description" | "free-edit";
type ModelAccess = "free" | "platform" | "own-key";
type TailorPhase = "idle" | "loading" | "error" | "preview";
type SaveMode = "branch" | "overwrite" | null;

interface AiEditDrawerProps {
  open: boolean;
  onClose: () => void;
  nodeId: string;
  collectionId: string;
  nodeTitle: string;
  currentLatex: string;
  onOverwritten: (updated: ResumeNodeRecord) => void;
  onBranched: (created: ResumeNodeRecord) => void;
}

function formatResetDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AiEditDrawer({
  open,
  onClose,
  nodeId,
  collectionId,
  nodeTitle,
  currentLatex,
  onOverwritten,
  onBranched,
}: AiEditDrawerProps) {
  const [mode, setMode] = useState<Mode>("job-description");
  const [text, setText] = useState("");
  const [modelAccess, setModelAccess] = useState<ModelAccess>("free");

  const [tailorPhase, setTailorPhase] = useState<TailorPhase>("idle");
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [aiResult, setAiResult] = useState<AiEditResult | null>(null);

  const [saveMode, setSaveMode] = useState<SaveMode>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [aiStatusLoading, setAiStatusLoading] = useState(false);
  const [aiStatusError, setAiStatusError] = useState<string | null>(null);

  const [ownKeyOverride, setOwnKeyOverride] = useState<{
    configured: boolean;
    lastFour: string | null;
  } | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeySaveError, setApiKeySaveError] = useState<string | null>(null);
  const [apiKeyRemoving, setApiKeyRemoving] = useState(false);

  const [lastOpenForStatus, setLastOpenForStatus] = useState(open);
  if (open !== lastOpenForStatus) {
    setLastOpenForStatus(open);
    if (open) {
      setAiStatusLoading(true);
      setAiStatusError(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;

    getAiStatus(token)
      .then((status) => {
        if (cancelled) return;
        setAiStatus(status);
      })
      .catch((err) => {
        if (cancelled) return;
        setAiStatusError(err instanceof ApiError ? err.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setAiStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const ownKeyConfigured = ownKeyOverride?.configured ?? aiStatus?.ownKeyConfigured ?? false;
  const ownKeyLastFour = ownKeyOverride?.lastFour ?? aiStatus?.keyLastFour ?? null;
  const platformSelectable = aiStatus?.platformAvailable === true;

  const platformTitle = aiStatusLoading
    ? "Checking availability…"
    : aiStatusError
      ? "Couldn't check platform availability — try reopening this drawer."
      : !platformSelectable
        ? "Not configured by the platform yet."
        : undefined;

  function handleTextChange(value: string) {
    setText(value);
    if (result || aiResult) {
      setResult(null);
      setAiResult(null);
      setTailorPhase("idle");
      setTailorError(null);
    }
  }

  function handleModeChange(next: Mode) {
    setMode(next);
    if (result || aiResult) {
      setResult(null);
      setAiResult(null);
      setTailorPhase("idle");
      setTailorError(null);
    }
  }

  function handleModelAccessChange(next: ModelAccess) {
    setModelAccess(next);
    if (result || aiResult) {
      setResult(null);
      setAiResult(null);
      setTailorPhase("idle");
      setTailorError(null);
    }
  }

  function resetAndClose() {
    setTailorPhase("idle");
    setTailorError(null);
    setResult(null);
    setAiResult(null);
    setSaveMode(null);
    setSaveError(null);
    setApiKeyInput("");
    setApiKeySaveError(null);
    onClose();
  }

  async function handleTailor() {
    const token = getToken();
    if (!token || !text.trim()) return;
    if (modelAccess === "own-key" && !ownKeyConfigured) {
      setTailorError("Save your API key first.");
      setTailorPhase("error");
      return;
    }
    setTailorPhase("loading");
    setTailorError(null);
    setResult(null);
    setAiResult(null);
    try {
      if (modelAccess === "free") {
        const res = await tailorNode(token, nodeId, text);
        setResult(res);
      } else {
        const res = await aiEditNode(token, nodeId, {
          mode: "job-description",
          modelAccess,
          jobDescription: text,
        });
        setAiResult(res);
      }
      setTailorPhase("preview");
    } catch (err) {
      setTailorError(err instanceof ApiError ? err.message : "Something went wrong");
      setTailorPhase("error");
    }
  }

  async function handleFreeEdit() {
    const token = getToken();
    if (!token || !text.trim()) return;
    if (modelAccess === "free") return;
    if (modelAccess === "own-key" && !ownKeyConfigured) {
      setTailorError("Save your API key first.");
      setTailorPhase("error");
      return;
    }
    setTailorPhase("loading");
    setTailorError(null);
    setResult(null);
    setAiResult(null);
    try {
      const res = await aiEditNode(token, nodeId, {
        mode: "free-edit",
        modelAccess,
        instruction: text,
      });
      setAiResult(res);
      setTailorPhase("preview");
    } catch (err) {
      setTailorError(err instanceof ApiError ? err.message : "Something went wrong");
      setTailorPhase("error");
    }
  }

  async function handleSaveApiKey() {
    const token = getToken();
    if (!token || !apiKeyInput.trim()) return;
    setApiKeySaving(true);
    setApiKeySaveError(null);
    try {
      const res = await saveApiKey(token, apiKeyInput.trim());
      setOwnKeyOverride({ configured: true, lastFour: res.keyLastFour });
      setApiKeyInput("");
    } catch (err) {
      setApiKeySaveError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setApiKeySaving(false);
    }
  }

  async function handleRemoveApiKey() {
    const token = getToken();
    if (!token) return;
    setApiKeyRemoving(true);
    setApiKeySaveError(null);
    try {
      await deleteApiKey(token);
      setOwnKeyOverride({ configured: false, lastFour: null });
    } catch (err) {
      setApiKeySaveError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setApiKeyRemoving(false);
    }
  }

  async function handleBranch() {
    const latex = result?.tailoredLatex ?? aiResult?.latex;
    if (latex === undefined) return;
    const token = getToken();
    if (!token) return;
    setSaveMode("branch");
    setSaveError(null);
    try {
      const created = await createNode(token, collectionId, {
        title: `${nodeTitle} (tailored)`,
        latex,
        parentId: nodeId,
      });
      onBranched(created);
      resetAndClose();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong");
      setSaveMode(null);
    }
  }

  async function handleOverwrite() {
    const latex = result?.tailoredLatex ?? aiResult?.latex;
    if (latex === undefined) return;
    const token = getToken();
    if (!token) return;
    setSaveMode("overwrite");
    setSaveError(null);
    try {
      const updated = await updateNode(token, nodeId, { latex });
      onOverwritten(updated);
      resetAndClose();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong");
      setSaveMode(null);
    }
  }

  const canTailor = mode === "job-description" && text.trim().length > 0 && tailorPhase !== "loading";
  const canApply =
    mode === "free-edit" &&
    (modelAccess === "platform" || modelAccess === "own-key") &&
    text.trim().length > 0 &&
    tailorPhase !== "loading";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={resetAndClose}
        aria-hidden
      />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-6 overflow-y-auto border-l border-border-subtle bg-bg-canvas p-6">
        <div className="flex flex-shrink-0 items-center justify-between">
          <h2 className="flex items-center gap-2 font-serif text-xl text-text-primary">
            <span className="text-accent-ai">✦</span> AI Edit
          </h2>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close AI Edit"
            className="label-md text-text-secondary transition-colors hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        <SegmentedToggle
          variant="mode"
          accent="ai"
          layout="attached"
          options={[
            { value: "job-description", label: "Job Description" },
            { value: "free-edit", label: "Free Edit" },
          ]}
          value={mode}
          onChange={(next) => handleModeChange(next as Mode)}
          disabled={tailorPhase === "loading"}
          className="flex-shrink-0"
        />

        {tailorPhase !== "preview" && (
          <div className="flex flex-1 flex-col">
            <TextField
              multiline
              variant="boxed"
              focusAccent="ai"
              label={mode === "job-description" ? "Target Description" : "Describe your edit"}
              value={text}
              onChange={(event) => handleTextChange(event.target.value)}
              disabled={tailorPhase === "loading"}
              placeholder={
                mode === "job-description"
                  ? "Paste the job description here — I'll tailor this resume's content and keywords to match it."
                  : "Describe the change you want made to this resume, in plain English."
              }
              rows={10}
              className="min-h-40 flex-1 resize-none"
            />
          </div>
        )}

        <div className="flex flex-shrink-0 flex-col gap-2">
          <span className="label-sm text-text-secondary">Model Access</span>
          <div className="relative">
            <SegmentedToggle
              variant="neutral"
              layout="separated"
              options={[
                { value: "free", label: "Free (rule-based)", disabled: mode !== "job-description" },
                { value: "platform", label: "Platform Key", disabled: !platformSelectable },
                { value: "own-key", label: "Your API Key" },
              ]}
              value={modelAccess}
              onChange={(next) => handleModelAccessChange(next as ModelAccess)}
              disabled={tailorPhase === "loading"}
            />
            <Badge
              tone="gold"
              variant="solid"
              size="sm"
              className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2"
            >
              PRO
            </Badge>
          </div>

          {!platformSelectable && platformTitle && (
            <p className="text-xs text-text-secondary">{platformTitle}</p>
          )}

          {modelAccess === "free" && mode === "job-description" && (
            <p className="text-xs text-text-secondary">
              Free (rule-based) reorders bullet points by keyword match; it doesn&apos;t rewrite
              anything.
            </p>
          )}

          {modelAccess === "platform" &&
            (aiStatus?.platformAvailable ? (
              <p className="text-xs text-text-secondary">
                {aiStatus.usage.used} / {aiStatus.usage.quota} used this month — resets{" "}
                {formatResetDate(aiStatus.usage.resetsAt)}.
              </p>
            ) : (
              <p className="text-xs text-text-secondary">{platformTitle}</p>
            ))}

          {modelAccess === "own-key" &&
            (ownKeyConfigured ? (
              <div className="flex items-center justify-between gap-3 rounded-radius-default border border-border-subtle bg-bg-surface px-3 py-2.5">
                <span className="text-xs text-text-secondary">
                  Key saved: ••••••{ownKeyLastFour ?? ""}
                </span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => void handleRemoveApiKey()}
                  disabled={apiKeyRemoving || tailorPhase === "loading"}
                >
                  {apiKeyRemoving ? "Removing…" : "Remove"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-radius-default border border-border-subtle bg-bg-surface p-3">
                <TextField
                  type="password"
                  variant="boxed"
                  focusAccent="ai"
                  surface="sidebar"
                  helper="Your key is used only for your own edits and never shared."
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  disabled={apiKeySaving || tailorPhase === "loading"}
                  placeholder="Paste your API key"
                />
                {apiKeySaveError && <p className="text-xs text-danger">{apiKeySaveError}</p>}
                <Button
                  variant="ai"
                  size="sm"
                  onClick={() => void handleSaveApiKey()}
                  disabled={apiKeySaving || !apiKeyInput.trim() || tailorPhase === "loading"}
                >
                  {apiKeySaving ? "Saving…" : "Save Key"}
                </Button>
              </div>
            ))}
        </div>

        {tailorPhase === "preview" && result ? (
          <TailorPreview
            result={result}
            saveMode={saveMode}
            saveError={saveError}
            onBranch={() => void handleBranch()}
            onOverwrite={() => void handleOverwrite()}
          />
        ) : tailorPhase === "preview" && aiResult ? (
          <AiEditPreview
            result={aiResult}
            beforeLatex={currentLatex}
            saveMode={saveMode}
            saveError={saveError}
            onBranch={() => void handleBranch()}
            onOverwrite={() => void handleOverwrite()}
          />
        ) : mode === "free-edit" ? (
          <div className="mt-auto flex flex-shrink-0 flex-col gap-2">
            {tailorPhase === "error" && tailorError && (
              <p className="text-sm text-danger">{tailorError}</p>
            )}
            <Button
              variant="ai"
              onClick={() => void handleFreeEdit()}
              disabled={!canApply}
              className="w-full"
            >
              {tailorPhase === "loading" ? "Applying…" : "✦ Apply Edit"}
            </Button>
            <p className="text-center text-xs text-text-secondary">
              {modelAccess === "platform" || modelAccess === "own-key"
                ? "The model rewrites this resume's LaTeX directly, following your instruction. Preview only — nothing is saved until you choose below."
                : "Free Edit has no rule-based option — select Platform Key or Your API Key above."}
            </p>
          </div>
        ) : (
          <div className="mt-auto flex flex-shrink-0 flex-col gap-2">
            {tailorPhase === "error" && tailorError && (
              <p className="text-sm text-danger">{tailorError}</p>
            )}
            <Button
              variant="ai"
              onClick={() => void handleTailor()}
              disabled={!canTailor}
              className="w-full"
            >
              {tailorPhase === "loading" ? "Tailoring…" : "✦ Tailor Resume"}
            </Button>
            <p className="text-center text-xs text-text-secondary">
              {modelAccess === "free"
                ? "Reorders bullet points by how many job-description keywords they match, and reports which keywords are present or missing. Doesn't rewrite any wording."
                : "The model rewrites this resume's content to match the job description. Preview only — nothing is saved until you choose below."}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
