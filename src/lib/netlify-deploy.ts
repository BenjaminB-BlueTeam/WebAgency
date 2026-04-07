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

class NetlifyError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
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
    throw new NetlifyError(`Netlify ${path}: ${res.status} ${body}`, res.status)
  }
  return res.json()
}

export async function deleteNetlifySite(siteId: string): Promise<void> {
  const res = await fetch(`${NETLIFY_API}/sites/${siteId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
    },
  })
  // 204 si supprimé, 404 si déjà absent : on considère les deux comme succès
  if (!res.ok && res.status !== 404) {
    const body = await res.text()
    throw new NetlifyError(`Netlify DELETE /sites/${siteId}: ${res.status} ${body}`, res.status)
  }
}

async function createSite(siteName: string): Promise<{ id: string; url: string }> {
  // Try preferred name; on conflict, let Netlify auto-generate
  try {
    const created = (await netlifyRequest("/sites", {
      method: "POST",
      body: JSON.stringify({ name: siteName }),
    })) as { id: string; ssl_url?: string; url?: string }
    return { id: created.id, url: created.ssl_url ?? created.url ?? `https://${siteName}.netlify.app` }
  } catch (e) {
    if (e instanceof NetlifyError && (e.status === 422 || e.status === 409)) {
      const created = (await netlifyRequest("/sites", {
        method: "POST",
        body: JSON.stringify({}),
      })) as { id: string; ssl_url?: string; url?: string; name?: string }
      return { id: created.id, url: created.ssl_url ?? created.url ?? `https://${created.name}.netlify.app` }
    }
    throw e
  }
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

  // Always create a fresh site — réutiliser un site existant pose problème
  // (sites supprimés/soft-deleted, perms upload qui passent en 401, etc.)
  void existingSiteId
  const { id: siteId, url: siteUrl } = await createSite(siteName)

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

  return { url: siteUrl, siteId }
}
