"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  createCollection,
  createNode,
  deleteNode,
  getCollectionTree,
  getMe,
  listCollections,
  listTemplates,
  updateNode,
  type AuthUser,
  type ResumeCollection,
  type ResumeNodeRecord,
  type ResumeTreeNode,
  type TemplateSummary,
} from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import Sidebar from "./Sidebar";
import ResumeTree from "./ResumeTree";
import type { Orientation } from "./TreeNode";
import AiEditDrawer from "./nodes/[nodeId]/AiEditDrawer";
import { ChevronIcon } from "@/components/ui/icons";

function rememberLastNode(collectionId: string, nodeId: string) {
  try {
    window.sessionStorage.setItem(`resumeit:lastNode:${collectionId}`, nodeId);
  } catch {
    return;
  }
}

function readLastCollection(): string | null {
  try {
    return window.sessionStorage.getItem("resumeit:lastCollection");
  } catch {
    return null;
  }
}

function rememberLastCollection(collectionId: string) {
  try {
    window.sessionStorage.setItem("resumeit:lastCollection", collectionId);
  } catch {
    return;
  }
}

export default function DashboardPage() {
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [token, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [collections, setCollections] = useState<ResumeCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const [tree, setTree] = useState<ResumeTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("vertical");

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [tailorTarget, setTailorTarget] = useState<ResumeTreeNode | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    getMe(t)
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setAuthToken(t);
        setAuthLoading(false);

        setCollectionsLoading(true);
        return listCollections(t)
          .then((list) => {
            if (cancelled) return;
            setCollections(list);
            setSelectedId((current) => {
              if (current) return current;
              const remembered = readLastCollection();
              if (remembered && list.some((c) => c._id === remembered)) {
                return remembered;
              }
              return list[0]?._id ?? null;
            });
          })
          .catch((err) => {
            if (cancelled) return;
            setCollectionsError(
              err instanceof ApiError ? err.message : "Something went wrong",
            );
          })
          .finally(() => {
            if (!cancelled) setCollectionsLoading(false);
          });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status !== 401 && err.status !== 403) {
          setAuthError(err.message);
          setAuthLoading(false);
          return;
        }
        clearToken();
        setAuthError(err instanceof ApiError ? err.message : "Session expired");
        setAuthLoading(false);
        router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [router, retryCount]);

  const refreshTree = useCallback(async (collectionId: string, authToken: string) => {
    setTreeLoading(true);
    setTreeError(null);
    try {
      const data = await getCollectionTree(authToken, collectionId);
      if (selectedIdRef.current !== collectionId) return;
      setTree(data.nodes);
    } catch (err) {
      if (selectedIdRef.current !== collectionId) return;
      setTreeError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      if (selectedIdRef.current === collectionId) setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token || !selectedId) return;
    setTree([]);
    setTreeLoading(true);
    void refreshTree(selectedId, token);
  }, [token, selectedId, refreshTree]);

  useEffect(() => {
    if (selectedId) rememberLastCollection(selectedId);
  }, [selectedId]);

  function handleLogout() {
    clearToken();
    router.push("/");
  }

  async function handleCreateCollection(name: string) {
    if (!token) throw new Error("Not authenticated");
    const created = await createCollection(token, name);
    setCollections((prev) => [created, ...prev]);
    setSelectedId(created._id);
  }

  async function handleAddRootNode(
    title: string,
    options?: { templateId?: string; latex?: string },
  ) {
    if (!token || !selectedId) throw new Error("Not authenticated");
    if (options?.latex !== undefined) {
      await createNode(token, selectedId, { title, latex: options.latex });
    } else if (options?.templateId) {
      await createNode(token, selectedId, { title, templateId: options.templateId });
    } else {
      await createNode(token, selectedId, { title });
    }
    await refreshTree(selectedId, token);
  }

  function handleLoadTemplates() {
    if (!token || templatesLoading) return;
    setTemplatesLoading(true);
    setTemplatesError(null);
    listTemplates(token)
      .then((list) => {
        setTemplates(list);
      })
      .catch((err) => {
        setTemplatesError(err instanceof ApiError ? err.message : "Something went wrong");
      })
      .finally(() => {
        setTemplatesLoading(false);
      });
  }

  async function handleAddChild(parentId: string, title: string) {
    if (!token || !selectedId) throw new Error("Not authenticated");
    await createNode(token, selectedId, { title, parentId });
    await refreshTree(selectedId, token);
  }

  async function handleRename(nodeId: string, title: string) {
    if (!token || !selectedId) throw new Error("Not authenticated");
    await updateNode(token, nodeId, { title });
    await refreshTree(selectedId, token);
  }

  async function handleDelete(nodeId: string) {
    if (!token || !selectedId) throw new Error("Not authenticated");
    await deleteNode(token, nodeId);
    await refreshTree(selectedId, token);
  }

  function handleTailorOverwritten(updated: ResumeNodeRecord) {
    if (token && selectedId) void refreshTree(selectedId, token);
    if (selectedId) rememberLastNode(selectedId, updated._id);
    setTailorTarget(null);
  }

  function handleTailorBranched(created: ResumeNodeRecord) {
    if (token && selectedId) void refreshTree(selectedId, token);
    if (selectedId) rememberLastNode(selectedId, created._id);
    setTailorTarget(null);
  }

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="label-sm text-text-secondary">Loading…</p>
      </div>
    );
  }

  if (authError) {
    if (!getToken()) {
      return null;
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-text-secondary">{authError}</p>
        <button
          type="button"
          onClick={() => {
            setAuthError(null);
            setAuthLoading(true);
            setRetryCount((count) => count + 1);
          }}
          className="label-md rounded-radius-default border border-border-strong px-6 py-3 text-text-primary transition-colors hover:border-accent hover:text-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  const selectedCollection = collections.find((c) => c._id === selectedId) ?? null;

  return (
    <div className="relative flex h-screen min-h-0">
      <div
        className={`flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${
          sidebarCollapsed ? "w-0" : "w-72"
        }`}
      >
        <Sidebar
          collections={collections}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={handleCreateCollection}
          loading={collectionsLoading}
          error={collectionsError}
          userEmail={user?.email}
          userRole={user?.role}
          onLogout={handleLogout}
        />
      </div>

      <button
        type="button"
        onClick={() => setSidebarCollapsed((current) => !current)}
        aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        style={{ left: sidebarCollapsed ? 0 : 288 }}
        className="absolute top-4 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-border-subtle bg-bg-canvas text-text-secondary transition-[left] duration-300 ease-in-out hover:border-accent hover:text-text-primary"
      >
        <ChevronIcon direction={sidebarCollapsed ? "right" : "left"} className="h-4 w-4" />
      </button>

      {collectionsLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="label-sm text-text-secondary">Loading…</p>
        </div>
      ) : selectedCollection ? (
        <ResumeTree
          collectionId={selectedCollection._id}
          nodes={tree}
          loading={treeLoading}
          error={treeError}
          orientation={orientation}
          onOrientationChange={setOrientation}
          onAddRootNode={handleAddRootNode}
          onAddChild={handleAddChild}
          onRename={handleRename}
          onDelete={handleDelete}
          onTailor={setTailorTarget}
          templates={templates}
          templatesLoading={templatesLoading}
          templatesError={templatesError}
          onLoadTemplates={handleLoadTemplates}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-md text-sm text-text-secondary">
            Create a collection to start building a resume version tree.
          </p>
        </div>
      )}

      <AiEditDrawer
        open={tailorTarget !== null}
        onClose={() => setTailorTarget(null)}
        nodeId={tailorTarget?._id ?? ""}
        collectionId={tailorTarget?.collectionId ?? ""}
        nodeTitle={tailorTarget?.title ?? ""}
        currentLatex={tailorTarget?.latex ?? ""}
        onOverwritten={handleTailorOverwritten}
        onBranched={handleTailorBranched}
      />
    </div>
  );
}
