import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* POST /api/images/download — trigger Unsplash download tracking */
export async function POST(request: Request) {
  const { downloadLocation } = await request.json();

  if (!downloadLocation || typeof downloadLocation !== "string") {
    return NextResponse.json(
      { error: "downloadLocation is required" },
      { status: 400 },
    );
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      { error: "Unsplash not configured" },
      { status: 500 },
    );
  }

  try {
    // Trigger Unsplash download event asynchronously (fire-and-forget)
    fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    }).catch((err) => {
      console.error("Unsplash download tracking error:", err);
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Download tracking error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to track download" },
      { status: 500 },
    );
  }
}
