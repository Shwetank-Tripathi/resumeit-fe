"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";

export interface TemplateFormValues {
  name: string;
  description: string;
  latex: string;
}

interface TemplateFormProps {
  initial?: TemplateFormValues;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (values: TemplateFormValues) => Promise<void>;
  onCancel: () => void;
}

const emptyValues: TemplateFormValues = { name: "", description: "", latex: "" };

export default function TemplateForm({
  initial,
  submitLabel,
  pendingLabel,
  onSubmit,
  onCancel,
}: TemplateFormProps) {
  const [name, setName] = useState(initial?.name ?? emptyValues.name);
  const [description, setDescription] = useState(initial?.description ?? emptyValues.description);
  const [latex, setLatex] = useState(initial?.latex ?? emptyValues.latex);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: trimmedName, description, latex });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-radius-lg border border-border-subtle bg-bg-surface p-4"
    >
      <TextField
        variant="ledger"
        label="Name"
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={150}
      />

      <TextField
        variant="ledger"
        label="Description (optional)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        maxLength={300}
      />

      <TextField
        multiline
        variant="code"
        label="LaTeX"
        value={latex}
        onChange={(event) => setLatex(event.target.value)}
        spellCheck={false}
        rows={12}
        placeholder={"\\documentclass{article}\n\\begin{document}\n\n\\end{document}"}
        className="resize-none"
      />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={submitting}>
          {submitting ? pendingLabel : submitLabel}
        </Button>
        <Button type="button" variant="outline-subtle" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
