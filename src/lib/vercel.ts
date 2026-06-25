/**
 * Vercel API helpers for domain management.
 */

export async function removeDomainFromVercel(domain: string): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.warn("VERCEL_TOKEN not configured, skipping Vercel cleanup");
    return;
  }

  // Find project
  const projectsRes = await fetch("https://api.vercel.com/v9/projects", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!projectsRes.ok) {
    console.error("Failed to list Vercel projects");
    return;
  }

  const { projects } = await projectsRes.json();
  const project = projects.find(
    (p: any) =>
      p.name === "leadscout" ||
      p.alias?.some((a: any) => a.domain === "leadscout.lat")
  );

  if (!project) {
    console.error("Vercel project 'leadscout' not found");
    return;
  }

  // Remove domain
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${project.id}/domains/${domain}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    console.error(`Failed to remove domain ${domain} from Vercel:`, err);
  } else {
    console.log(`Removed domain ${domain} from Vercel`);
  }
}
