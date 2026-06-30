import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateCopy } from "@/lib/paralux/generate-copy";

export const dynamic = "force-dynamic";

/* POST /api/generate-copy */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;

  const { name, what, tone, language } = await request.json();
  if (!name || !what) {
    return NextResponse.json({ error: "name and what are required" }, { status: 400 });
  }

  try {
    const parsed = await generateCopy({ name, what, tone, language });
    return NextResponse.json(parsed);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json(
      { error: e?.message || "AI generation failed" },
      { status },
    );
  }
}
