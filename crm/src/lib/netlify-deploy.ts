// crm/src/lib/netlify-deploy.ts
import JSZip from "jszip";

export interface NetlifyDeployResult {
  siteId: string;
  url: string;
}

export async function deployToNetlify(
  html: string,
  prospectNom: string,
  prospectVille: string
): Promise<NetlifyDeployResult> {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error("NETLIFY_TOKEN manquant");

  // Build a unique site name: max 60 chars, only a-z0-9-
  const base = `${prospectNom}-${prospectVille}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 6);
  const siteName = `${base}-${suffix}`;

  // 1. Create Netlify site
  const siteRes = await fetch("https://api.netlify.com/api/v1/sites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: siteName }),
  });
  if (!siteRes.ok) {
    const err = await siteRes.text();
    throw new Error(`Netlify create site failed (${siteRes.status}): ${err.slice(0, 200)}`);
  }
  const site = (await siteRes.json()) as { id: string; url: string };

  // 2. Create ZIP with index.html
  const zip = new JSZip();
  zip.file("index.html", html);
  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  // 3. Deploy ZIP
  const deployRes = await fetch(
    `https://api.netlify.com/api/v1/sites/${site.id}/deploys`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: buffer as any,
    }
  );
  if (!deployRes.ok) {
    const err = await deployRes.text();
    throw new Error(`Netlify deploy failed (${deployRes.status}): ${err.slice(0, 200)}`);
  }

  return { siteId: site.id, url: site.url };
}
