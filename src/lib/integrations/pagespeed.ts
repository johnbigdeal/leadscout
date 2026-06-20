type PageSpeedResult = {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
};

export async function getPageSpeedInsights(
  url: string,
): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  const endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

  const params = new URLSearchParams({
    url,
    key: apiKey ?? "",
    strategy: "MOBILE",
    category: ["PERFORMANCE", "SEO", "ACCESSIBILITY"].join(","),
  });

  try {
    const res = await fetch(`${endpoint}?${params}`);
    if (!res.ok) {
      return { performance: null, seo: null, accessibility: null };
    }
    const data = await res.json();
    const categories = data.lighthouseResult?.categories ?? {};

    return {
      performance: categories.performance?.score
        ? Math.round(categories.performance.score * 100)
        : null,
      seo: categories.seo?.score
        ? Math.round(categories.seo.score * 100)
        : null,
      accessibility: categories.accessibility?.score
        ? Math.round(categories.accessibility.score * 100)
        : null,
    };
  } catch {
    return { performance: null, seo: null, accessibility: null };
  }
}
