"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiError,
  createTemplate,
  getMe,
  listAllTemplates,
  reactivateTemplate,
  retireTemplate,
  updateTemplate,
  type Template,
} from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import TemplateForm, { type TemplateFormValues } from "./TemplateForm";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

function toUpdatePayload(values: TemplateFormValues) {
  const trimmedDescription = values.description.trim();
  return {
    name: values.name,
    description: trimmedDescription ? trimmedDescription : undefined,
    latex: values.latex,
  };
}

function StatusBadge({ status }: { status: Template["status"] }) {
  return status === "active" ? (
    <Badge tone="neutral" variant="stamp">
      {status}
    </Badge>
  ) : (
    <Badge tone="neutral" variant="outline">
      {status}
    </Badge>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [retireTargetId, setRetireTargetId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;

    getMe(t)
      .then((me) => {
        if (cancelled) return;
        if (me.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        setToken(t);
        setAuthLoading(false);
        setTemplatesLoading(true);

        return listAllTemplates(t)
          .then((list) => {
            if (cancelled) return;
            setTemplates(list);
          })
          .catch((err) => {
            if (cancelled) return;
            setTemplatesError(err instanceof ApiError ? err.message : "Something went wrong");
          })
          .finally(() => {
            if (!cancelled) setTemplatesLoading(false);
          });
      })
      .catch((err) => {
        if (cancelled) return;
        if (!(err instanceof ApiError) || err.status === 401 || err.status === 403) {
          clearToken();
        }
        router.replace("/dashboard");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCreate(values: TemplateFormValues) {
    if (!token) throw new Error("Not authenticated");
    const created = await createTemplate(token, toUpdatePayload(values));
    setTemplates((prev) => [created, ...prev]);
    setCreating(false);
  }

  async function handleUpdate(templateId: string, values: TemplateFormValues) {
    if (!token) throw new Error("Not authenticated");
    const updated = await updateTemplate(token, templateId, toUpdatePayload(values));
    setTemplates((prev) => prev.map((t) => (t._id === templateId ? updated : t)));
    setEditingId(null);
  }

  async function handleRetire(templateId: string) {
    if (!token) return;
    setPendingId(templateId);
    setActionError(null);
    try {
      const updated = await retireTemplate(token, templateId);
      setTemplates((prev) => prev.map((t) => (t._id === templateId ? updated : t)));
      setRetireTargetId(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  async function handleReactivate(templateId: string) {
    if (!token) return;
    setPendingId(templateId);
    setActionError(null);
    try {
      const updated = await reactivateTemplate(token, templateId);
      setTemplates((prev) => prev.map((t) => (t._id === templateId ? updated : t)));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="label-sm text-text-secondary">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-medium text-text-primary">Templates</h1>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {creating ? (
          <TemplateForm
            submitLabel="Create"
            pendingLabel="Creating…"
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <Button variant="gold-outline" className="self-start" onClick={() => setCreating(true)}>
            + New Template
          </Button>
        )}

        {actionError && (
          <p role="alert" className="text-sm text-danger">
            {actionError}
          </p>
        )}

        {templatesLoading && <p className="label-sm text-text-secondary">Loading templates…</p>}

        {!templatesLoading && templatesError && (
          <p role="alert" className="text-sm text-danger">
            {templatesError}
          </p>
        )}

        {!templatesLoading && !templatesError && templates.length === 0 && (
          <p className="text-sm text-text-secondary">No templates yet.</p>
        )}

        {!templatesLoading && !templatesError && templates.length > 0 && (
          <div className="flex flex-col gap-3">
            {templates.map((template) =>
              editingId === template._id ? (
                <TemplateForm
                  key={template._id}
                  initial={{
                    name: template.name,
                    description: template.description ?? "",
                    latex: template.latex,
                  }}
                  submitLabel="Save"
                  pendingLabel="Saving…"
                  onSubmit={(values) => handleUpdate(template._id, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <Card key={template._id} padding="md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="label-md text-text-primary">{template.name}</p>
                        <StatusBadge status={template.status} />
                      </div>
                      {template.description && (
                        <p className="mt-1 text-sm text-text-secondary">{template.description}</p>
                      )}
                      <p className="label-sm mt-2 text-text-secondary">
                        Updated {new Date(template.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {retireTargetId === template._id ? (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border-subtle pt-3">
                      <p className="text-sm text-text-primary">
                        Retire this template? It disappears from the picker users see when
                        creating a resume from a template — this can be undone later with
                        Reactivate.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRetire(template._id)}
                          disabled={pendingId === template._id}
                        >
                          {pendingId === template._id ? "Retiring…" : "Confirm retire"}
                        </Button>
                        <Button
                          variant="outline-subtle"
                          size="sm"
                          onClick={() => setRetireTargetId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-border-subtle pt-3">
                      <Button variant="link" onClick={() => setEditingId(template._id)}>
                        Edit
                      </Button>
                      {template.status === "active" ? (
                        <Button
                          variant="link"
                          className="text-danger"
                          onClick={() => setRetireTargetId(template._id)}
                        >
                          Retire
                        </Button>
                      ) : (
                        <Button
                          variant="link"
                          onClick={() => handleReactivate(template._id)}
                          disabled={pendingId === template._id}
                        >
                          {pendingId === template._id ? "Reactivating…" : "Reactivate"}
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
