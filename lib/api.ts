const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Please try again.");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body.message === "string"
        ? body.message
        : "Something went wrong";
    throw new ApiError(response.status, message);
  }

  return body as T;
}

export type UserRole = "customer" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export async function registerUser(
  email: string,
  password: string,
): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const result = await request<{ message: string; data: { token: string } }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  return result.data;
}

export async function getMe(token: string): Promise<AuthUser> {
  const result = await request<{ data: AuthUser }>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return result.data;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export interface ResumeCollection {
  _id: string;
  owner: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeNodeRecord {
  _id: string;
  collectionId: string;
  parent: string | null;
  title: string;
  latex: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeTreeNode extends ResumeNodeRecord {
  children: ResumeTreeNode[];
  atsScore?: number;
}

export interface CollectionTree {
  collection: ResumeCollection;
  nodes: ResumeTreeNode[];
}

export async function createCollection(
  token: string,
  name: string,
): Promise<ResumeCollection> {
  const result = await request<{ data: ResumeCollection }>("/resume/collections", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  return result.data;
}

export async function listCollections(token: string): Promise<ResumeCollection[]> {
  const result = await request<{ data: ResumeCollection[] }>("/resume/collections", {
    method: "GET",
    headers: authHeaders(token),
  });
  return result.data;
}

export async function getCollectionTree(
  token: string,
  collectionId: string,
): Promise<CollectionTree> {
  const result = await request<{ data: CollectionTree }>(
    `/resume/collections/${collectionId}/tree`,
    {
      method: "GET",
      headers: authHeaders(token),
    },
  );
  return result.data;
}

export async function createNode(
  token: string,
  collectionId: string,
  body: { title: string; latex?: string; parentId?: string | null; templateId?: string },
): Promise<ResumeNodeRecord> {
  const result = await request<{ data: ResumeNodeRecord }>(
    `/resume/collections/${collectionId}/nodes`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  );
  return result.data;
}

export async function getNode(token: string, nodeId: string): Promise<ResumeNodeRecord> {
  const result = await request<{ data: ResumeNodeRecord }>(`/resume/nodes/${nodeId}`, {
    method: "GET",
    headers: authHeaders(token),
  });
  return result.data;
}

export async function updateNode(
  token: string,
  nodeId: string,
  body: { title?: string; latex?: string },
): Promise<ResumeNodeRecord> {
  const result = await request<{ data: ResumeNodeRecord }>(`/resume/nodes/${nodeId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return result.data;
}

export async function deleteNode(token: string, nodeId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/resume/nodes/${nodeId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export type CompileFailure =
  | { kind: "compile-error"; log: string }
  | { kind: "rejected"; reason: string }
  | { kind: "timeout" }
  | { kind: "unexpected"; status: number };

export class CompileError extends Error {
  failure: CompileFailure;

  constructor(message: string, failure: CompileFailure) {
    super(message);
    this.name = "CompileError";
    this.failure = failure;
  }
}

export async function compileNode(token: string, nodeId: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/resume/nodes/${nodeId}/compile`, {
      method: "POST",
      headers: authHeaders(token),
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Please try again.");
  }

  if (response.ok) {
    return response.blob();
  }

  const body = await response.json().catch(() => null);
  const message =
    body && typeof body.message === "string" ? body.message : "Something went wrong";

  if (response.status === 422) {
    throw new CompileError(message, {
      kind: "compile-error",
      log: body && typeof body.log === "string" ? body.log : "",
    });
  }

  if (response.status === 400) {
    throw new CompileError(message, {
      kind: "rejected",
      reason: body && typeof body.reason === "string" ? body.reason : message,
    });
  }

  if (response.status === 504) {
    throw new CompileError(message, { kind: "timeout" });
  }

  throw new CompileError(message, { kind: "unexpected", status: response.status });
}

export interface TailoredItemChange {
  text: string;
  matchCount: number;
  fromIndex: number;
  toIndex: number;
}

export interface TailoredBlockChange {
  blockIndex: number;
  skipped: boolean;
  skipReason?: string;
  itemCount: number;
  moved: boolean;
  items: TailoredItemChange[];
}

export interface TailorResult {
  tailoredLatex: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  changes: TailoredBlockChange[];
}

export async function tailorNode(
  token: string,
  nodeId: string,
  jobDescription: string,
): Promise<TailorResult> {
  const result = await request<{ data: TailorResult }>(`/resume/nodes/${nodeId}/tailor`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ jobDescription }),
  });
  return result.data;
}

export interface AiUsage {
  used: number;
  quota: number;
  resetsAt: string;
}

export interface AiStatus {
  platformAvailable: boolean;
  ownKeyConfigured: boolean;
  keyLastFour: string | null;
  usage: AiUsage;
}

export async function getAiStatus(token: string): Promise<AiStatus> {
  const result = await request<{ data: AiStatus }>("/ai/status", {
    method: "GET",
    headers: authHeaders(token),
  });
  return result.data;
}

export async function saveApiKey(
  token: string,
  apiKey: string,
): Promise<{ keyLastFour: string }> {
  const result = await request<{ data: { keyLastFour: string } }>("/ai/api-key", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ apiKey }),
  });
  return result.data;
}

export async function deleteApiKey(token: string): Promise<void> {
  await request<{ data: Record<string, never> }>("/ai/api-key", {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export type AiEditMode = "job-description" | "free-edit";
export type AiModelAccess = "platform" | "own-key";

export interface AiEditParams {
  mode: AiEditMode;
  modelAccess: AiModelAccess;
  jobDescription?: string;
  instruction?: string;
}

export interface AiEditResult {
  latex: string;
  summary: string;
}

export async function aiEditNode(
  token: string,
  nodeId: string,
  params: AiEditParams,
): Promise<AiEditResult> {
  const result = await request<{ data: AiEditResult }>(`/resume/nodes/${nodeId}/ai-edit`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(params),
  });
  return result.data;
}

export type TemplateStatus = "active" | "retired";

export interface Template {
  _id: string;
  name: string;
  description: string | null;
  latex: string;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSummary {
  _id: string;
  name: string;
  description: string | null;
}

export async function createTemplate(
  token: string,
  body: { name: string; description?: string; latex: string },
): Promise<Template> {
  const result = await request<{ data: Template }>("/admin/templates", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return result.data;
}

export async function listAllTemplates(token: string): Promise<Template[]> {
  const result = await request<{ data: Template[] }>("/admin/templates", {
    method: "GET",
    headers: authHeaders(token),
  });
  return result.data;
}

export async function getTemplate(token: string, templateId: string): Promise<Template> {
  const result = await request<{ data: Template }>(`/admin/templates/${templateId}`, {
    method: "GET",
    headers: authHeaders(token),
  });
  return result.data;
}

export async function updateTemplate(
  token: string,
  templateId: string,
  body: { name?: string; description?: string; latex?: string },
): Promise<Template> {
  const result = await request<{ data: Template }>(`/admin/templates/${templateId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return result.data;
}

export async function retireTemplate(token: string, templateId: string): Promise<Template> {
  const result = await request<{ data: Template }>(`/admin/templates/${templateId}/retire`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return result.data;
}

export async function reactivateTemplate(token: string, templateId: string): Promise<Template> {
  const result = await request<{ data: Template }>(
    `/admin/templates/${templateId}/reactivate`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
  return result.data;
}

export async function listTemplates(token: string): Promise<TemplateSummary[]> {
  const result = await request<{ data: TemplateSummary[] }>("/templates", {
    method: "GET",
    headers: authHeaders(token),
  });
  return result.data;
}

export interface ExtractedResumeSection {
  heading: string;
  items: string[];
}

export interface ExtractedResumeData {
  name: string | null;
  contact: string | null;
  summary: string | null;
  sections: ExtractedResumeSection[];
}

export async function parseIntakeFile(
  token: string,
  file: File,
): Promise<ExtractedResumeData> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/intake/parse`, {
      method: "POST",
      headers: authHeaders(token),
      body: formData,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Please try again.");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body.message === "string" ? body.message : "Something went wrong";
    throw new ApiError(response.status, message);
  }

  return (body as { data: { extracted: ExtractedResumeData } }).data.extracted;
}

export async function parseIntakeText(
  token: string,
  text: string,
): Promise<ExtractedResumeData> {
  const result = await request<{ data: { extracted: ExtractedResumeData } }>(
    "/intake/parse",
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ text }),
    },
  );
  return result.data.extracted;
}

export async function mergeIntake(
  token: string,
  templateId: string,
  extracted: ExtractedResumeData,
): Promise<{ latex: string; summary: string }> {
  const result = await request<{ data: { latex: string; summary: string } }>(
    "/intake/merge",
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ templateId, extracted }),
    },
  );
  return result.data;
}
