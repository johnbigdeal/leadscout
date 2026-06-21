import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* GET /api/vercel/project */
export async function GET() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "VERCEL_TOKEN not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.vercel.com/v9/projects", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    
    if (!data.projects || data.projects.length === 0) {
      return NextResponse.json({ error: "No projects found" }, { status: 404 });
    }

    // Find project by name or domain
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "");
    const project = data.projects.find((p: any) => 
      p.name === "leadscout" || 
      p.alias?.some((a: any) => a.domain === appUrl)
    ) || data.projects[0];

    return NextResponse.json({
      id: project.id,
      name: project.name,
      accountId: project.accountId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
