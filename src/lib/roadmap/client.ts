import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import type { RoadmapStatus } from "@/lib/roadmap/constants";

export type Idea = {
  id: string;
  title: string;
  description: string | null;
  status: RoadmapStatus;
  voteCount: number;
  createdAt: string;
  authorName: string;
  hasVoted: boolean;
};

type VoteResult = { voteCount: number; status: RoadmapStatus; hasVoted: boolean };

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || "Error de red");
  }
  return res.json();
}

/** Lista pública de ideas. Incluye headers de auth si hay sesión (para hasVoted). */
export async function fetchIdeas(): Promise<Idea[]> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/roadmap/ideas", { headers, cache: "no-store" });
  return jsonOrThrow(res);
}

export async function createIdea(input: { title: string; description: string }): Promise<Idea> {
  const headers = await getAuthHeaders();
  headers["Content-Type"] = "application/json";
  const res = await fetch("/api/roadmap/ideas", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return jsonOrThrow(res);
}

export async function voteIdea(id: string): Promise<VoteResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/roadmap/ideas/${id}/vote`, { method: "POST", headers });
  return jsonOrThrow(res);
}

export async function unvoteIdea(id: string): Promise<VoteResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/roadmap/ideas/${id}/vote`, { method: "DELETE", headers });
  return jsonOrThrow(res);
}

export async function updateIdeaStatus(id: string, status: RoadmapStatus): Promise<Idea> {
  const headers = await getAuthHeaders();
  headers["Content-Type"] = "application/json";
  const res = await fetch(`/api/roadmap/ideas/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status }),
  });
  return jsonOrThrow(res);
}

export async function deleteIdea(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/roadmap/ideas/${id}`, { method: "DELETE", headers });
  await jsonOrThrow(res);
}
