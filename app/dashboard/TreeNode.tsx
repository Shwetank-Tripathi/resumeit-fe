"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ResumeTreeNode } from "@/lib/api";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import TextField from "@/components/ui/TextField";
import { ChevronIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";

export type Orientation = "vertical" | "horizontal";

interface TreeNodeProps {
  node: ResumeTreeNode;
  orientation: Orientation;
  selectedNodeId: string | null;
  initiallyCollapsed?: boolean;
  onAddChild: (parentId: string, title: string) => Promise<void>;
  onRename: (nodeId: string, title: string) => Promise<void>;
  onDelete: (nodeId: string) => Promise<void>;
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
      <div className="group relative">
        <Card padding="md" selected={isSelected} className="w-60">
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
          <div
            role="button"
            tabIndex={0}
            onClick={handleOpen}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleOpen();
              }
            }}
            className="block w-full cursor-pointer text-left"
          >
            <div className="relative flex justify-center gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="label-md min-w-0 truncate break-words text-text-primary">{node.title}</p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setInputValue(node.title);
                    setMode("rename");
                  }}
                  aria-label="Rename"
                  title="Rename"
                  className="flex-shrink-0 text-text-secondary transition-colors hover:text-text-primary"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <span className="flex-shrink-0 text-[9px] text-text-secondary">
                  {new Date(node.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {typeof node.atsScore === "number" && (
                <div className="absolute right-0 top-0 flex flex-shrink-0 items-center">
                  <Badge tone="gold" variant="outline">
                    {node.atsScore}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="label-md break-words text-text-primary">{node.title}</p>
            <p className="label-sm mt-1 text-text-secondary">
              Updated {new Date(node.updatedAt).toLocaleDateString()}
            </p>
          </>
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
        {mode === "view" && (
          <div className="absolute left-1/2 top-full z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            {hasChildren && (
              <button
                type="button"
                onClick={() => setCollapsed((current) => !current)}
                aria-label={collapsed ? "Expand" : "Collapse"}
                title={collapsed ? "Expand" : "Collapse"}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-border-subtle bg-bg-canvas text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
              >
                <ChevronIcon direction={collapsed ? "down" : "up"} className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode("add-child")}
              aria-label="Add child"
              title="Add child"
              className="flex h-5 w-5 items-center justify-center rounded-full border border-border-subtle bg-bg-canvas text-xs text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setMode("confirm-delete")}
              aria-label="Delete"
              title="Delete"
              className="flex h-5 w-5 items-center justify-center rounded-full border border-border-subtle bg-bg-canvas text-danger transition-colors hover:border-danger hover:opacity-75"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {hasChildren && (
        <>
          <div className={stemClass(isVertical)} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              tabIndex={collapsed ? 0 : -1}
              aria-hidden={!collapsed}
              className={`absolute transition-opacity duration-300 ease-in-out hover:opacity-90 ${
                isVertical ? "left-1/2 top-0 -translate-x-1/2" : "left-0 top-1/2 -translate-y-1/2"
              } ${collapsed ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <Badge tone="accent" variant="stamp">
                + {countDescendants(node)} hidden
              </Badge>
            </button>
            <div
              className="grid transition-[grid-template-rows,grid-template-columns] duration-300 ease-in-out"
              style={
                isVertical
                  ? {
                      gridTemplateRows: collapsed ? "0fr" : "1fr",
                      gridTemplateColumns: "max-content",
                    }
                  : {
                      gridTemplateColumns: collapsed ? "0fr" : "1fr",
                      gridTemplateRows: "max-content",
                    }
              }
            >
              <div
                className={`overflow-hidden ${isVertical ? "min-h-0 pb-4" : "min-w-0 pr-4"}`}
              >
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
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
