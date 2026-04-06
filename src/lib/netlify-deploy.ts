import { createHash } from "crypto"

const NETLIFY_API = "https://api.netlify.com/api/v1"

export type DeployResult = { url: string; siteId: string }

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
}

export function injectNav(html: string, currentPage: string): string {
  const pages = [
    { name: "accueil", file: "index.html", label: "Accueil" },
    { name: "services", file: "services.html", label: "Services" },
    { name: "contact", file: "contact.html", label: "Contact" },
    { name: "a-propos", file: "a-propos.html", label: "À propos" },
  ]
  const links = pages
    .map(
      (p) =>
        `<a href="${p.file}" style="color:${p.name === currentPage ? "#ffffff" : "#737373"};text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;">${p.label}</a>`
    )
    .join("")
  const nav =
    `<nav style="position:fixed;top:0;left:0;right:0;background:#000;padding:12px 16px;display:flex;gap:16px;z-index:9999;border-bottom:1px solid #1a1a1a;">${links}</nav>` +
    `<div style="height:48px;"></div>`

  if (html.includes("</body>")) {
    return html.replace("</body>", `${nav}\n</body>`)
  }
  return html + nav
}

async function netlifyRequest(path: string, options: RequestInit): Promise<unknown> {
  const res = await fetch(`${NETLIFY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Netlify ${path}: ${res.status} ${body}`)
  }
  return res.json()
}

export async function deployToNetlify(
  files: { path: string; content: string }[],
  prospectName: string,
  ville: string,
  existingSiteId?: string | null
): Promise<DeployResult> {
  const siteName = `fwa-${slugify(`${prospectName}-${ville}`)}`

  // Build file map: /index.html → content, /css/style.css → content, etc.
  const fileMap: Record<string, string> = {}
  for (const file of files) {
    fileMap[`/${file.path}`] = file.content
  }

  // Get or create site
  const siteId =
    existingSiteId ??
    ((await netlifyRequest("/sites", {
      method: "POST",
      body: JSON.stringify({ name: siteName }),
    })) as { id: string }).id

  // Compute SHA1 digests
  const digests: Record<string, string> = {}
  for (const [path, content] of Object.entries(fileMap)) {
    digests[path] = createHash("sha1").update(content).digest("hex")
  }

  // Create deploy
  const deploy = (await netlifyRequest(`/sites/${siteId}/deploys`, {
    method: "POST",
    body: JSON.stringify({ files: digests }),
  })) as { id: string }

  // Upload files
  for (const [path, content] of Object.entries(fileMap)) {
    const uploadRes = await fetch(`${NETLIFY_API}/deploys/${deploy.id}/files${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
        "Content-Type": "application/octet-stream",
      },
      body: content,
    })
    if (!uploadRes.ok) {
      throw new Error(`Failed to upload ${path}: ${uploadRes.status}`)
    }
  }

  return { url: `https://${siteName}.netlify.app`, siteId }
}
