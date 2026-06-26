import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UNSPLASH_API = "https://api.unsplash.com/search/photos";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "12";

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "Unsplash not configured" }, { status: 500 });
  }

  try {
    const url = new URL(UNSPLASH_API);
    url.searchParams.set("query", query);
    url.searchParams.set("page", page);
    url.searchParams.set("per_page", perPage);
    url.searchParams.set("orientation", "landscape");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Unsplash API error:", res.status, err);
      return NextResponse.json({ error: "Unsplash API error", detail: err }, { status: res.status });
    }

    const data = await res.json();

    const UTM = "utm_source=leadscout&utm_medium=referral";

    const images = data.results.map((img: any) => {
      const username = img.user?.username || "";
      return {
        id: img.id,
        url: img.urls.regular,
        thumb: img.urls.small,
        alt: img.alt_description || img.description || query,
        author: img.user?.name || "Unsplash",
        username,
        link: img.links?.html || "",
        downloadLocation: img.links?.download_location || "",
        authorUrl: username
          ? `https://unsplash.com/@${username}?${UTM}`
          : `https://unsplash.com/?${UTM}`,
        unsplashUrl: `https://unsplash.com/?${UTM}`,
      };
    });

    return NextResponse.json({
      images,
      total: data.total,
      totalPages: data.total_pages,
    });
  } catch (e: any) {
    console.error("Image search error:", e);
    return NextResponse.json({ error: e.message || "Failed to search images" }, { status: 500 });
  }
}
