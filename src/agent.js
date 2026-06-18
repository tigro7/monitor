import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { checkGitHub } from "./analyzers/github.js";
import { checkSite } from "./analyzers/site.js";
import { buildEmailHtml } from "./email.js";

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
- Open issues: ${githubData.openIssues}
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

Return ONLY the JSON array, no markdown, no explanation.

${context}`,
      },
    ],
  });

  let suggestions = [];
  try {
    const raw = message.content[0].text.trim();
    suggestions = JSON.parse(raw);
  } catch {
    console.error(`Failed to parse suggestions for ${project.name}`);
    suggestions = [
      {
        priority: "low",
        area: "Analysis",
        action: "Could not parse suggestions",
        why: message.content[0].text,
      },
    ];
  }

  return { project, githubData, siteData, suggestions };
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

  const html = buildEmailHtml(results, date);

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM, // es. "monitor@tuodominio.com"
    to: process.env.EMAIL_TO,
    subject: `🌙 Project Report – ${date}`,
    html,
  });

  if (error) {
    console.error("Email send failed:", error);
    process.exit(1);
  }

  console.log("✅ Report sent successfully!");
}

run();
