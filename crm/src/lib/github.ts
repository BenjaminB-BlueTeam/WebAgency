// crm/src/lib/github.ts

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG ?? process.env.GITHUB_USERNAME;

const BASE = "https://api.github.com";

function headers() {
  return {
    "Authorization": `Bearer ${GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export interface CreatedRepo {
  htmlUrl: string;
  repoName: string;
}

/**
 * Crée un repo GitHub privé et push le HTML généré sur main.
 * Repo name : maquette-{prospect-slug}-{ville-slug}-v{version}
 */
export async function createMaquetteRepo(
  prospectNom: string,
  prospectVille: string,
  html: string,
  version: number
): Promise<CreatedRepo> {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN manquant");
  if (!GITHUB_ORG) throw new Error("GITHUB_ORG ou GITHUB_USERNAME manquant");

  const repoName = `maquette-${slugify(prospectNom)}-${slugify(prospectVille)}-v${version}`;

  // 1. Créer le repo privé
  const createRes = await fetch(`${BASE}/user/repos`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: repoName,
      private: true,
      auto_init: false,
      description: `Maquette v${version} — ${prospectNom} (${prospectVille})`,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`GitHub create repo failed: ${createRes.status} — ${err}`);
  }

  const repo = await createRes.json() as { html_url: string; full_name: string };

  // 2. Push index.html sur main
  const content = Buffer.from(html).toString("base64");
  const pushRes = await fetch(
    `${BASE}/repos/${repo.full_name}/contents/index.html`,
    {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({
        message: `feat: maquette v${version} — ${prospectNom}`,
        content,
        branch: "main",
      }),
    }
  );

  if (!pushRes.ok) {
    const err = await pushRes.text();
    throw new Error(`GitHub push failed: ${pushRes.status} — ${err}`);
  }

  return { htmlUrl: repo.html_url, repoName };
}
