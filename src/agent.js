import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { checkGitHub } from "./analyzers/github.js";
import { checkSite } from "./analyzers/site.js";
import { buildEmailHtml } from "./email.js";
import { filterNew, markAsSeen } from "./memory.js";
import { getTodayRotation } from "./rotation.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

const PROJECTS = [
  {
    name: "UFNC",
    repo: "tigro7/Unofficial-Football-National-Championships",
    url: "https://www.ufnc.xyz",
  },
  {
    name: "Thatswhoi.am",
    repo: "tigro7/thatswhoi-am",
    url: "https://onepagecv-theta.vercel.app",
  },
  {
    name: "Le Nuove Espressioni",
    repo: "albertotiribelli/lenuoveespressioni",
    url: "https://www.lenuoveespressioni.it",
  },
  {
    name: "Project Monitor",
    repo: process.env.REPO_MONITOR,
    url: null,
  },
];

const MAX_SUGGESTIONS = 2;

// Fetch MONITOR.md from a repo if it exists — optional product context file
async function fetchMonitorContext(repo) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/MONITOR.md`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

async function analyzeProject(project, rotation) {
  console.log(`\n🔍 Analyzing ${project.name} [${rotation.area}]...`);

  const [githubData, siteData, monitorContext] = await Promise.all([
    project.repo ? checkGitHub(project.repo) : Promise.resolve(null),
    project.url ? checkSite(project.url) : Promise.resolve(null),
    project.repo ? fetchMonitorContext(project.repo) : Promise.resolve(null),
  ]);

  const contextParts = [];

  if (monitorContext) {
    contextParts.push(`## Product Context (from MONITOR.md)\n${monitorContext}`);
  }

  if (githubData) {
    contextParts.push(`
## GitHub Analysis
- Open issues: ${githubData.openIssues}${githubData.openIssueTitles.length > 0 ? ":\n" + githubData.openIssueTitles.map(t => "  - " + t).join("\n") : ""}
- Open PRs: ${githubData.openPRs}
- Days since last commit: ${githubData.daysSinceLastCommit}
- Outdated dependencies: ${githubData.outdatedDeps.length > 0 ? githubData.outdatedDeps.join(", ") : "none"}
- Recent commits (last 7 days): ${githubData.recentCommits.map((c) => `"${c.message}" (${c.date})`).join("; ") || "none"}
- Missing files: ${githubData.missingFiles.join(", ") || "none"}
    `);
  }

  if (siteData) {
    contextParts.push(`
## Live Site Analysis (${project.url})
- Status: ${siteData.status} (HTTP ${siteData.statusCode})
- Response time: ${siteData.responseTimeMs}ms
- Performance score: ${siteData.lighthouseScore ?? "n/a"}/100
- Broken links: ${siteData.brokenLinks.length}
- Missing meta tags: ${siteData.missingMeta.join(", ") || "none"}
- SSL valid: ${siteData.sslValid ? "yes" : "NO ⚠️"}
    `);
  }

  const context = contextParts.join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `You are a senior software consultant doing a focused nightly review of "${project.name}".

Today's focus: ${rotation.label}

${rotation.instructions}

Return EXACTLY ${MAX_SUGGESTIONS} suggestions — no more, no less.
Only include a suggestion if it is genuinely actionable and specific to this project.
Do NOT suggest anything already tracked as an open issue.
Do NOT pad with generic best-practice advice if there is nothing concrete to say — if you can only find 1 real suggestion, return 1 item and set the other's priority to "skip".

Return a JSON array of objects:
{ "priority": "high|medium|low|skip", "area": "${rotation.area}", "action": "...", "why": "..." }

Return ONLY the JSON array, no markdown, no explanation.

${context}`,
      },
    ],
  });

  let allSuggestions = [];
  try {
    const raw = message.content[0].text.trim();
    allSuggestions = JSON.parse(raw)
      .filter((s) => s.priority !== "skip") // remove padding items
      .slice(0, MAX_SUGGESTIONS);
  } catch {
    console.error(`Failed to parse suggestions for ${project.name}`);
    allSuggestions = [
      {
        priority: "low",
        area: rotation.area,
        action: "Could not parse suggestions — check agent logs",
        why: message.content[0].text,
      },
    ];
  }

  // Deduplication: keep only suggestions not seen in the last 30 days
  const newSuggestions = project.repo
    ? filterNew(project.repo, allSuggestions)
    : allSuggestions;

  const skipped = allSuggestions.length - newSuggestions.length;
  if (skipped > 0) {
    console.log(`  ⏭️  Skipped ${skipped} already-seen suggestion(s)`);
  }

  return { project, githubData, siteData, suggestions: newSuggestions };
}

async function run() {
  const rotation = getTodayRotation();
  console.log(`🌙 Project Monitor starting — focus: ${rotation.label}`);

  const date = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const results = [];
  for (const project of PROJECTS) {
    try {
      const result = await analyzeProject(project, rotation);
      results.push(result);
    } catch (err) {
      console.error(`Error analyzing ${project.name}:`, err.message);
      results.push({
        project,
        githubData: null,
        siteData: null,
        suggestions: [
          {
            priority: "high",
            area: "Monitor",
            action: "Analysis failed — check agent logs",
            why: err.message,
          },
        ],
      });
    }
  }

  const totalNew = results.reduce((acc, r) => acc + r.suggestions.length, 0);

  const html = buildEmailHtml(results, date, rotation, totalNew === 0);

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: totalNew === 0
      ? `✅ Tutto ok – ${date}`
      : `${rotation.label} – ${date} (${totalNew} suggerimenti)`,
    html,
  });

  if (error) {
    console.error("Email send failed:", error);
    process.exit(1);
  }

  for (const { project, suggestions } of results) {
    if (project.repo && suggestions.length > 0) {
      markAsSeen(project.repo, suggestions);
    }
  }

  console.log("✅ Report sent and memory updated!");
}

run();