"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  CompileError,
  compileNode,
  getNode,
  listCollections,
  updateNode,
  type ResumeNodeRecord,
} from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import TopBar, { type CompileStatus } from "./TopBar";
import SourcePane from "./SourcePane";
import PreviewPane from "./PreviewPane";
import AiEditDrawer from "./AiEditDrawer";

export default function NodeEditorPage() {
  const router = useRouter();
  const params = useParams<{ nodeId: string }>();
  const nodeId = params.nodeId;

  const [node, setNode] = useState<ResumeNodeRecord | null>(null);
  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [nodeLoading, setNodeLoading] = useState(true);
  const [nodeError, setNodeError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [latex, setLatex] = useState("");
  const [savedLatex, setSavedLatex] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [compileStatus, setCompileStatus] = useState<CompileStatus>("idle");
  const [lastCompiledAt, setLastCompiledAt] = useState<Date | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compileFailure, setCompileFailure] = useState<CompileError | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [branchNotice, setBranchNotice] = useState<ResumeNodeRecord | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    if (!nodeId) return;

    let cancelled = false;

    getNode(t, nodeId)
      .then((record) => {
        if (cancelled) return;
        setNode(record);
        setLatex(record.latex);
        setSavedLatex(record.latex);

        listCollections(t)
          .then((collections) => {
            if (cancelled) return;
            const owning = collections.find((c) => c._id === record.collectionId);
            if (owning) setCollectionName(owning.name);
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearToken();
          router.replace("/login");
          return;
        }
        setNodeError(err instanceof ApiError ? err.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setNodeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nodeId, retryCount, router]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  const hasUnsavedChanges = latex !== savedLatex;

  async function handleSave(): Promise<boolean> {
    const t = getToken();
    if (!t || !nodeId) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateNode(t, nodeId, { latex });
      setNode(updated);
      setSavedLatex(updated.latex);
      return true;
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleCompile() {
    const t = getToken();
    if (!t || !nodeId) return;

    if (hasUnsavedChanges) {
      const saved = await handleSave();
      if (!saved) return;
    }

    setCompileStatus("compiling");
    setCompileFailure(null);
    try {
      const blob = await compileNode(t, nodeId);
      if (!mountedRef.current) return;
      const url = URL.createObjectURL(blob);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = url;
      setPdfUrl(url);
      setCompileStatus("success");
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof CompileError) {
        setCompileFailure(err);
      } else {
        setCompileFailure(
          new CompileError(err instanceof ApiError ? err.message : "Something went wrong", {
            kind: "unexpected",
            status: err instanceof ApiError ? err.status : 0,
          }),
        );
      }
      setCompileStatus("error");
    } finally {
      if (mountedRef.current) setLastCompiledAt(new Date());
    }
  }

  function handleTailorOverwritten(updated: ResumeNodeRecord) {
    setNode(updated);
    setLatex(updated.latex);
    setSavedLatex(updated.latex);
  }

  function handleTailorBranched(created: ResumeNodeRecord) {
    setBranchNotice(created);
  }

  if (nodeLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-canvas">
        <p className="label-sm text-text-secondary">Loading…</p>
      </div>
    );
  }

  if (nodeError || !node) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg-canvas px-6 text-center">
        <p className="text-sm text-text-secondary">{nodeError ?? "Resume node not found."}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setNodeLoading(true);
              setNodeError(null);
              setRetryCount((count) => count + 1);
            }}
            className="label-md rounded-radius-default border border-border-strong px-6 py-3 text-text-primary transition-colors hover:border-accent hover:text-accent"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="label-md rounded-radius-default border border-border-subtle px-6 py-3 text-text-secondary transition-colors hover:text-text-primary"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-bg-canvas">
      <TopBar
        nodeTitle={node.title}
        collectionName={collectionName}
        hasUnsavedChanges={hasUnsavedChanges}
        saving={saving}
        saveError={saveError}
        onSave={() => void handleSave()}
        compileStatus={compileStatus}
        lastCompiledAt={lastCompiledAt}
        onCompile={() => void handleCompile()}
        onOpenAiEdit={() => setAiDrawerOpen(true)}
      />

      {branchNotice && (
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-accent-muted px-6 py-3">
          <p className="text-sm text-accent">
            Saved as a new version — &quot;{branchNotice.title}&quot;. This node is unchanged.
          </p>
          <div className="flex flex-shrink-0 items-center gap-4">
            <Link
              href={`/dashboard/nodes/${branchNotice._id}`}
              className="label-sm text-accent underline hover:text-text-primary"
            >
              Open it
            </Link>
            <Link href="/dashboard" className="label-sm text-accent underline hover:text-text-primary">
              View in dashboard tree
            </Link>
            <button
              type="button"
              onClick={() => setBranchNotice(null)}
              aria-label="Dismiss"
              className="label-sm text-accent hover:text-text-primary"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <SourcePane value={latex} onChange={setLatex} compileFailure={compileFailure} />
        <PreviewPane compileStatus={compileStatus} pdfUrl={pdfUrl} />
      </div>

      <AiEditDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        nodeId={nodeId}
        collectionId={node.collectionId}
        nodeTitle={node.title}
        currentLatex={savedLatex}
        onOverwritten={handleTailorOverwritten}
        onBranched={handleTailorBranched}
      />
    </div>
  );
}
