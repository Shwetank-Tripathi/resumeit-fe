"use client";

import { useState } from "react";
import type { ResumeTreeNode, TemplateSummary } from "@/lib/api";
import TreeNode, { type Orientation } from "./TreeNode";
import UploadResumeForm from "./UploadResumeForm";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";
import SegmentedToggle from "@/components/ui/SegmentedToggle";

interface ResumeTreeProps {
  collectionId: string;
  collectionName: string;
  nodes: ResumeTreeNode[];
  loading: boolean;
  error: string | null;
  orientation: Orientation;
  onOrientationChange: (orientation: Orientation) => void;
  onAddRootNode: (
    title: string,
    options?: { templateId?: string; latex?: string },
  ) => Promise<void>;
  onAddChild: (parentId: string, title: string) => Promise<void>;
  onRename: (nodeId: string, title: string) => Promise<void>;
  onDelete: (nodeId: string) => Promise<void>;
  onTailor: (node: ResumeTreeNode) => void;
  templates: TemplateSummary[];
  templatesLoading: boolean;
  templatesError: string | null;
  onLoadTemplates: () => void;
}

type RootNodeMode = "blank" | "template" | "upload";

function readLastNodeId(collectionId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(`resumeit:lastNode:${collectionId}`);
  } catch {
    return null;
  }
}

function AddRootNodeForm({
  onAddRootNode,
  templates,
  templatesLoading,
  templatesError,
  onLoadTemplates,
}: {
  onAddRootNode: (
    title: string,
    options?: { templateId?: string; latex?: string },
  ) => Promise<void>;
  templates: TemplateSummary[];
  templatesLoading: boolean;
  templatesError: string | null;
  onLoadTemplates: () => void;
}) {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<RootNodeMode>("blank");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  function reset() {
    setActive(false);
    setMode("blank");
    setTitle("");
    setError(null);
  }

  function handleModeChange(next: RootNodeMode) {
    setMode(next);
    setError(null);
    if (next === "template" || next === "upload") onLoadTemplates();
  }

  async function handleBlankSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAddRootNode(trimmed);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTemplateSelect(templateId: string) {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Enter a title first.");
      return;
    }
    setPendingTemplateId(templateId);
    setError(null);
    try {
      await onAddRootNode(trimmed, { templateId });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingTemplateId(null);
    }
  }

  if (!active) {
    return (
      <Button
        variant="outline"
        size="md"
        onClick={() => setActive(true)}
        className="!px-6 !py-3 self-start"
      >
        + New Root Node
      </Button>
    );
  }

  return (
    <div className="flex w-72 flex-col gap-3">
      <SegmentedToggle
        variant="neutral"
        size="sm"
        className="self-start"
        disabled={uploadBusy}
        value={mode}
        onChange={(value) => handleModeChange(value as RootNodeMode)}
        options={[
          { value: "blank", label: "Blank" },
          { value: "template", label: "From Template" },
          { value: "upload", label: "Upload Resume" },
        ]}
      />

      <TextField
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && mode === "blank") {
            event.preventDefault();
            void handleBlankSubmit();
          }
        }}
        placeholder="e.g. Base Resume"
        maxLength={150}
      />

      {mode === "blank" && (
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={() => void handleBlankSubmit()} disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
            <Button variant="outline-subtle" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "template" && (
        <div className="flex flex-col gap-2">
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
                    disabled={pendingTemplateId !== null}
                    className="w-full rounded-radius-default border border-border-subtle p-3 text-left transition-colors hover:border-accent-gold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <p className="label-sm text-text-primary">
                      {pendingTemplateId === template._id ? "Creating…" : template.name}
                    </p>
                    {template.description && (
                      <p className="mt-1 text-sm text-text-secondary">{template.description}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button variant="outline-subtle" onClick={reset} className="self-start">
            Cancel
          </Button>
        </div>
      )}

      {mode === "upload" && (
        <div className="flex flex-col gap-2">
          <UploadResumeForm
            title={title}
            templates={templates}
            templatesLoading={templatesLoading}
            templatesError={templatesError}
            onAddRootNode={onAddRootNode}
            onCreated={reset}
            onBusyChange={setUploadBusy}
          />

          <Button variant="outline-subtle" onClick={reset} disabled={uploadBusy} className="self-start">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ResumeTree({
  collectionId,
  collectionName,
  nodes,
  loading,
  error,
  orientation,
  onOrientationChange,
  onAddRootNode,
  onAddChild,
  onRename,
  onDelete,
  onTailor,
  templates,
  templatesLoading,
  templatesError,
  onLoadTemplates,
}: ResumeTreeProps) {
  const selectedNodeId = readLastNodeId(collectionId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle px-8 py-5">
        <h1 className="font-serif text-2xl font-medium text-text-primary">{collectionName}</h1>

        <SegmentedToggle
          variant="neutral"
          size="sm"
          value={orientation}
          onChange={(value) => onOrientationChange(value as Orientation)}
          options={[
            { value: "vertical", label: "Top → Bottom" },
            { value: "horizontal", label: "Left → Right" },
          ]}
        />
      </div>

      <div className="flex-1 overflow-auto px-8 py-10">
        {loading && <p className="label-sm text-text-secondary">Loading tree…</p>}

        {!loading && error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {!loading && !error && nodes.length === 0 && (
          <div className="flex flex-col items-start gap-4">
            <p className="max-w-md text-sm text-text-secondary">
              This collection doesn&apos;t have any resume versions yet. Create a root node to
              get started.
            </p>
            <AddRootNodeForm
              onAddRootNode={onAddRootNode}
              templates={templates}
              templatesLoading={templatesLoading}
              templatesError={templatesError}
              onLoadTemplates={onLoadTemplates}
            />
          </div>
        )}

        {!loading && !error && nodes.length > 0 && (
          <div
            className={`flex items-start gap-16 ${orientation === "vertical" ? "flex-row flex-wrap" : "flex-col"}`}
          >
            {nodes.map((node) => (
              <TreeNode
                key={node._id}
                node={node}
                orientation={orientation}
                selectedNodeId={selectedNodeId}
                onAddChild={onAddChild}
                onRename={onRename}
                onDelete={onDelete}
                onTailor={onTailor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
