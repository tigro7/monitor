const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function githubFetch(path) {
  const res = await fetch(`https://api.github.com/repos/${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${path}`);
  return res.json();
}

export async function checkGitHub(repo) {
  const [repoData, issues, prs, commits, branches] = await Promise.all([
    githubFetch(repo),
    githubFetch(`${repo}/issues?state=open&per_page=100`),
    githubFetch(`${repo}/pulls?state=open&per_page=100`),
    githubFetch(`${repo}/commits?per_page=20`),
    githubFetch(`${repo}/branches?per_page=100`),
  ]);

  const now = new Date();
  const lastCommitDate = new Date(commits[0]?.commit?.committer?.date ?? now);
  const daysSinceLastCommit = Math.floor(
    (now - lastCommitDate) / (1000 * 60 * 60 * 24)
  );

  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const recentCommits = commits
    .filter((c) => new Date(c.commit.committer.date) > sevenDaysAgo)
    .map((c) => ({
      message: c.commit.message.split("\n")[0].slice(0, 80),
      date: new Date(c.commit.committer.date).toLocaleDateString("it-IT"),
    }));

  const staleBranches = branches
    .filter((b) => b.name !== repoData.default_branch)
    .filter((b) => {
      // We only have the branch tip SHA here; skip date check for non-default branches
      // A more precise check would need /branches/{name} per branch (expensive)
      return false; // Placeholder — extend if needed
    })
    .map((b) => b.name);

  // Check for common missing files via contents API
  const commonFiles = ["README.md", ".env.example", "CHANGELOG.md"];
  const missingFiles = [];
  for (const file of commonFiles) {
    try {
      await githubFetch(`${repo}/contents/${file}`);
    } catch {
      missingFiles.push(file);
    }
  }

  // Check for outdated deps via package.json if present
  let outdatedDeps = [];
  try {
    const pkgRes = await githubFetch(`${repo}/contents/package.json`);
    const pkg = JSON.parse(atob(pkgRes.content));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    // Flag deps with old-style ranges pinned to exact versions or wildcards
    outdatedDeps = Object.entries(allDeps)
      .filter(([, v]) => v.startsWith("*") || v === "latest")
      .map(([name]) => name);
  } catch {
    // No package.json or not parseable — skip
  }

  return {
    openIssues: issues.filter((i) => !i.pull_request).length,
    openPRs: prs.length,
    daysSinceLastCommit,
    recentCommits,
    staleBranches,
    missingFiles,
    outdatedDeps,
    defaultBranch: repoData.default_branch,
    stars: repoData.stargazers_count,
    language: repoData.language,
  };
}
