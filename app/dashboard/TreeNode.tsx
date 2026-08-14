"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ResumeTreeNode } from "@/lib/api";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import TextField from "@/components/ui/TextField";

export type Orientation = "vertical" | "horizontal";

interface TreeNodeProps {
  node: ResumeTreeNode;
  orientation: Orientation;
  selectedNodeId: string | null;
  initiallyCollapsed?: boolean;
  onAddChild: (parentId: string, title: string) => Promise<void>;
  onRename: (nodeId: string, title: string) => Promise<void>;
  onDelete: (nodeId: string) => Promise<void>;
  onTailor: (node: ResumeTreeNode) => void;
}

type Mode = "view" | "rename" | "add-child" | "confirm-delete";

function countDescendants(node: ResumeTreeNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

const stemClass = (isVertical: boolean) =>
  isVertical ? "h-6 w-px bg-border-subtle" : "h-px w-6 bg-border-subtle";

function rememberLastNode(node: ResumeTreeNode) {
  try {
    window.sessionStorage.setItem(`resumeit:lastNode:${node.collectionId}`, node._id);
  } catch {
    return;
  }
}

export default function TreeNode({
  node,
  orientation,
  selectedNodeId,
  initiallyCollapsed = false,
  onAddChild,
  onRename,
  onDelete,
  onTailor,
}: TreeNodeProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const [mode, setMode] = useState<Mode>("view");
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const hasChildren = node.children.length > 0;
  const isVertical = orientation === "vertical";
  const isSelected = selectedNodeId === node._id;

  function resetMode() {
    setMode("view");
    setInputValue("");
    setActionError(null);
  }

  function handleOpen() {
    rememberLastNode(node);
    router.push(`/dashboard/nodes/${node._id}`);
  }

  async function handleRenameSubmit(event: FormEvent) {
    event.preventDefault();
    const title = inputValue.trim();
    if (!title) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await onRename(node._id, title);
      resetMode();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddChildSubmit(event: FormEvent) {
    event.preventDefault();
    const title = inputValue.trim();
    if (!title) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await onAddChild(node._id, title);
      resetMode();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    setSubmitting(true);
    setActionError(null);
    try {
      await onDelete(node._id);
    } catch (err) {
      setSubmitting(false);
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className={`flex ${isVertical ? "flex-col" : "flex-row"} items-center`}>
      <Card padding="md" selected={isSelected} className="w-72">
        {mode === "rename" ? (
          <form onSubmit={handleRenameSubmit} className="flex flex-col gap-2">
            <TextField
              autoFocus
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              maxLength={150}
            />
            {actionError && (
              <p role="alert" className="text-sm text-danger">
                {actionError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline-subtle" size="sm" onClick={resetMode}>
                Cancel
              </Button>
            </div>
          </form>
        ) : mode === "view" ? (
          <button type="button" onClick={handleOpen} className="block w-full text-left">
            <div className="flex items-start justify-between gap-2">
              <p className="label-md break-words text-text-primary">{node.title}</p>
              {typeof node.atsScore === "number" && (
                <Badge tone="gold" variant="outline">
                  {node.atsScore}
                </Badge>
              )}
            </div>
            <p className="label-sm mt-1 text-text-secondary">
              Updated {new Date(node.updatedAt).toLocaleDateString()}
            </p>
          </button>
        ) : (
          <>
            <p className="label-md break-words text-text-primary">{node.title}</p>
            <p className="label-sm mt-1 text-text-secondary">
              Updated {new Date(node.updatedAt).toLocaleDateString()}
            </p>
          </>
        )}

        {mode === "view" && (
          <div className="mt-3 flex justify-end">
            <Button variant="tailor" size="sm" onClick={() => onTailor(node)}>
              Tailor with JD
            </Button>
          </div>
        )}

        {mode === "view" && (
          <div className="mt-3 flex items-center gap-3 border-t border-border-subtle pt-3">
            <Button
              variant="link"
              size="sm"
              href={`/dashboard/nodes/${node._id}`}
              onClick={() => rememberLastNode(node)}
            >
              Preview
            </Button>
            <Button variant="link" size="sm" disabled title="Diff view is coming soon">
              Diff
            </Button>
          </div>
        )}

        {mode === "view" && (
          <div className="mt-3 flex flex-wrap gap-3 border-t border-border-subtle pt-3">
            <Button variant="link" size="sm" onClick={() => setMode("add-child")}>
              + Add child
            </Button>
            <button
              type="button"
              onClick={() => {
                setInputValue(node.title);
                setMode("rename");
              }}
              className="label-sm text-text-secondary hover:text-text-primary hover:underline"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => setMode("confirm-delete")}
              className="label-sm text-danger hover:underline"
            >
              Delete
            </button>
            {hasChildren && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="label-sm text-text-secondary hover:text-text-primary hover:underline"
              >
                Collapse
              </button>
            )}
          </div>
        )}

        {mode === "add-child" && (
          <form
            onSubmit={handleAddChildSubmit}
            className="mt-3 flex flex-col gap-2 border-t border-border-subtle pt-3"
          >
            <span className="label-sm text-text-secondary">New child title</span>
            <TextField
              autoFocus
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              maxLength={150}
            />
            {actionError && (
              <p role="alert" className="text-sm text-danger">
                {actionError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Adding…" : "Add"}
              </Button>
              <Button type="button" variant="outline-subtle" size="sm" onClick={resetMode}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {mode === "confirm-delete" && (
          <div className="mt-3 flex flex-col gap-2 border-t border-border-subtle pt-3">
            <p className="text-sm text-text-primary">
              {hasChildren
                ? "This node has children — deleting a branch node isn't allowed. Delete its children first."
                : "Delete this node? This can't be undone."}
            </p>
            {actionError && (
              <p role="alert" className="text-sm text-danger">
                {actionError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void handleDeleteConfirm()}
                disabled={submitting || hasChildren}
              >
                {submitting ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button type="button" variant="outline-subtle" size="sm" onClick={resetMode}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {hasChildren && collapsed && (
        <>
          <div className={stemClass(isVertical)} />
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="transition-opacity hover:opacity-90"
          >
            <Badge tone="accent" variant="stamp">
              + {countDescendants(node)} hidden
            </Badge>
          </button>
        </>
      )}

      {hasChildren && !collapsed && (
        <>
          <div className={stemClass(isVertical)} />
          <div
            className={`flex items-start gap-8 ${isVertical ? "flex-row" : "flex-col"}`}
          >
            {node.children.map((child, index) => (
              <div
                key={child._id}
                className={`relative flex ${isVertical ? "flex-col items-center" : "flex-row items-center"}`}
              >
                {index > 0 &&
                  (isVertical ? (
                    <div className="absolute -left-4 top-0 h-px w-[calc(50%+1rem)] bg-border-subtle" />
                  ) : (
                    <div className="absolute -top-4 left-0 h-[calc(50%+1rem)] w-px bg-border-subtle" />
                  ))}
                {index < node.children.length - 1 &&
                  (isVertical ? (
                    <div className="absolute left-1/2 top-0 h-px w-[calc(50%+1rem)] bg-border-subtle" />
                  ) : (
                    <div className="absolute left-0 top-1/2 h-[calc(50%+1rem)] w-px bg-border-subtle" />
                  ))}
                <div className={stemClass(isVertical)} />
                <TreeNode
                  node={child}
                  orientation={orientation}
                  selectedNodeId={selectedNodeId}
                  onAddChild={onAddChild}
                  onRename={onRename}
                  onDelete={onDelete}
                  onTailor={onTailor}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
