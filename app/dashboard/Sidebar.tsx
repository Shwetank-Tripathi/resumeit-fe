"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import type { ResumeCollection, UserRole } from "@/lib/api";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";

interface SidebarProps {
  collections: ResumeCollection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  userEmail?: string | null;
  userRole?: UserRole | null;
  onLogout: () => void;
}

export default function Sidebar({
  collections,
  selectedId,
  onSelect,
  onCreate,
  loading,
  error,
  userEmail,
  userRole,
  onLogout,
}: SidebarProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await onCreate(trimmed);
      setName("");
      setCreating(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col border-r border-border-subtle bg-bg-sidebar">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mb-4 flex justify-center">
          <Image
            src="/logo-transparent.png"
            alt="ResumeIt"
            width={171}
            height={56}
            unoptimized
            className="h-14 w-auto"
          />
        </div>

        <h2 className="label-sm px-2 text-text-secondary">Collections</h2>

        {loading && <p className="label-sm mt-4 px-2 text-text-secondary">Loading…</p>}

        {!loading && error && (
          <p role="alert" className="mt-4 px-2 text-sm text-danger">
            {error}
          </p>
        )}

        {!loading && !error && collections.length === 0 && (
          <p className="mt-4 px-2 text-sm text-text-secondary">
            No collections yet. Create one to start building a resume tree.
          </p>
        )}

        {!loading && !error && collections.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {collections.map((collection) => (
              <li key={collection._id}>
                <button
                  type="button"
                  onClick={() => onSelect(collection._id)}
                  aria-current={collection._id === selectedId}
                  className={`label-md w-full rounded-radius-default px-3 py-2.5 text-left transition-colors ${
                    collection._id === selectedId
                      ? "bg-accent-muted text-text-primary"
                      : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
                  }`}
                >
                  {collection.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          {creating ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-2">
              <TextField
                variant="ledger"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Collection name"
                maxLength={100}
              />
              {formError && (
                <p role="alert" className="text-sm text-danger">
                  {formError}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  {submitting ? "Creating…" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline-subtle"
                  size="sm"
                  onClick={() => {
                    setCreating(false);
                    setFormError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="gold-outline"
              size="md"
              className="w-full"
              onClick={() => setCreating(true)}
            >
              + New Collection
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-4">
        {userEmail && <p className="truncate text-sm text-text-secondary">{userEmail}</p>}
        {userRole === "admin" && (
          <Button href="/admin" variant="outline" size="md">
            Admin
          </Button>
        )}
        <Button variant="outline" size="md" onClick={onLogout}>
          Log out
        </Button>
      </div>
    </aside>
  );
}
