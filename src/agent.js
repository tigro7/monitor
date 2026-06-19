import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { checkGitHub } from "./analyzers/github.js";
import { checkSite } from "./analyzers/site.js";
import { buildEmailHtml } from "./email.js";
import { filterNew, markAsSeen } from "./memory.js";

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

async function analyzeProject(project) {
  console.log(`\n🔍 Analyzing ${project.name}...`);

  const [githubData, siteData] = await Promise.all([
    project.repo ? checkGitHub(project.repo) : Promise.resolve(null),
    project.url ? checkSite(project.url) : Promise.resolve(null),
  ]);

  const contextParts = [];

  if (githubData) {
    contextParts.push(`
## GitHub Analysis for ${project.name}
- Open issues: ${githubData.openIssues}${githubData.openIssueTitles.length > 0 ? ":\n" + githubData.openIssueTitles.map(t => "  - " + t).join("\n") : ""}
- Open PRs: ${githubData.openPRs}
- Days since last commit: ${githubData.daysSinceLastCommit}
- Outdated dependencies: ${githubData.outdatedDeps.length > 0 ? githubData.outdatedDeps.join(", ") : "none detected"}
- Recent commits (last 7 days): ${githubData.recentCommits.map((c) => `"${c.message}" (${c.date})`).join("; ") || "none"}
- Stale branches (>30 days inactive): ${githubData.staleBranches.join(", ") || "none"}
- Missing files: ${githubData.missingFiles.join(", ") || "none"}
    `);
  }

  if (siteData) {
    contextParts.push(`
## Live Site Analysis for ${project.name} (${project.url})
- Status: ${siteData.status} (HTTP ${siteData.statusCode})
- Response time: ${siteData.responseTimeMs}ms
- Performance score: ${siteData.lighthouseScore ?? "n/a"}/100
- Broken links found: ${siteData.brokenLinks.length}
- Missing meta tags: ${siteData.missingMeta.join(", ") || "none"}
- SSL valid: ${siteData.sslValid ? "yes" : "NO ⚠️"}
    `);
  }

  const context = contextParts.join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are a senior software consultant reviewing a developer's personal projects overnight.
        
Analyze the following data for the project "${project.name}" and provide 3–5 concrete, prioritized action items.
Focus on: critical issues first, then quick wins, then longer-term improvements.
Be specific and actionable. Use plain language. Return a JSON array of objects with this shape:
{ "priority": "high|medium|low", "area": "e.g. Security / DX / Performance / SEO / Maintenance", "action": "...", "why": "..." }

Do NOT suggest anything that is already tracked as an open issue listed above — those are already known and being worked on.
Return ONLY the JSON array, no markdown, no explanation.

${context}`,
      },
    ],
  });

  let allSuggestions = [];
  try {
    const raw = message.content[0].text.trim();
    allSuggestions = JSON.parse(raw);
  } catch {
    console.error(`Failed to parse suggestions for ${project.name}`);
    allSuggestions = [
      {
        priority: "low",
        area: "Analysis",
        action: "Could not parse suggestions",
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
  console.log("🌙 Project Monitor starting...");
  const date = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const results = [];
  for (const project of PROJECTS) {
    try {
      const result = await analyzeProject(project);
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

  // If nothing new across all projects, send a minimal "all clear" email
  const totalNew = results.reduce((acc, r) => acc + r.suggestions.length, 0);
  if (totalNew === 0) {
    console.log("✅ No new suggestions — sending all-clear email");
  }

  const html = buildEmailHtml(results, date, totalNew === 0);

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: totalNew === 0
      ? `✅ Tutto ok – ${date}`
      : `🌙 Project Report – ${date} (${totalNew} nuovi)`,
    html,
  });

  if (error) {
    console.error("Email send failed:", error);
    process.exit(1);
  }

  // Persist seen suggestions ONLY after successful email delivery
  for (const { project, suggestions } of results) {
    if (project.repo && suggestions.length > 0) {
      markAsSeen(project.repo, suggestions);
    }
  }

  console.log("✅ Report sent and memory updated!");
}

run();