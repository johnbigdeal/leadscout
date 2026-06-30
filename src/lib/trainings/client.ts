import { getAuthHeaders } from "@/lib/supabase/auth-headers";

export type Lesson = {
  id: string;
  sectionId: string;
  title: string;
  type: "video" | "text" | "pdf";
  content: string | null;
  embedUrl: string | null;
  aspectRatio: string | null;
  fileUrl: string | null;
  order: number;
};

export type Section = {
  id: string;
  title: string;
  description: string | null;
  accessLevel: "free" | "pro";
  order: number;
  locked: boolean;
  lessonCount: number;
  lessons: Lesson[];
};

export type TrainingsResponse = {
  canEdit: boolean;
  plan: "free" | "pro";
  sections: Section[];
};

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export async function fetchTrainings(): Promise<TrainingsResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/trainings", { headers, cache: "no-store" });
  return jsonOrThrow(res);
}

async function send(method: string, url: string, body?: unknown) {
  const headers = await getAuthHeaders();
  headers["Content-Type"] = "application/json";
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return jsonOrThrow(res);
}

export const createSection = (b: { title: string; description?: string; accessLevel?: string }) =>
  send("POST", "/api/trainings/sections", b);
export const updateSection = (id: string, b: Record<string, unknown>) =>
  send("PATCH", `/api/trainings/sections/${id}`, b);
export const deleteSection = (id: string) =>
  send("DELETE", `/api/trainings/sections/${id}`);

export const createLesson = (b: Record<string, unknown>) =>
  send("POST", "/api/trainings/lessons", b);
export const updateLesson = (id: string, b: Record<string, unknown>) =>
  send("PATCH", `/api/trainings/lessons/${id}`, b);
export const deleteLesson = (id: string) =>
  send("DELETE", `/api/trainings/lessons/${id}`);

export async function uploadFile(file: File): Promise<string> {
  const headers = await getAuthHeaders();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", headers, body: fd });
  const data = await jsonOrThrow(res);
  return data.url as string;
}
