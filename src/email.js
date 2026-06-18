import { buildIssueUrl } from "./issue-url.js";

const PRIORITY_COLOR = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

const PRIORITY_LABEL = {
  high: "🔴 Alta",
  medium: "🟡 Media",
  low: "🟢 Bassa",
};

function renderSuggestion(s, i, repo) {
  const color = PRIORITY_COLOR[s.priority] ?? "#6b7280";
  const label = PRIORITY_LABEL[s.priority] ?? s.priority;
  const issueUrl = repo ? buildIssueUrl(repo, s) : null;

  return `
    <tr>
      <td style="padding: 14px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top;">
        <span style="
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          color: ${color};
          background: ${color}15;
          padding: 2px 8px;
          border-radius: 4px;
          margin-bottom: 6px;
        ">${label} · ${s.area}</span>

        <div style="font-size: 14px; font-weight: 600; color: #111; margin-bottom: 4px;">
          ${i + 1}. ${s.action}
        </div>
        <div style="font-size: 13px; color: #555; line-height: 1.5; margin-bottom: 10px;">
          ${s.why}
        </div>

        ${issueUrl ? `
        <a href="${issueUrl}" target="_blank" style="
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          background: #1f2937;
          padding: 5px 14px;
          border-radius: 6px;
          text-decoration: none;
          letter-spacing: 0.01em;
        ">＋ Crea Issue su GitHub →</a>
        ` : ""}
      </td>
    </tr>
  `;
}

function renderProjectSection({ project, githubData, siteData, suggestions }) {
  const statsHtml = [];

  if (githubData) {
    statsHtml.push(`
      <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
        ${statPill("Issues", githubData.openIssues, githubData.openIssues > 5 ? "#ef4444" : "#6b7280")}
        ${statPill("PR aperte", githubData.openPRs, githubData.openPRs > 0 ? "#f59e0b" : "#6b7280")}
        ${statPill("Giorni senza commit", githubData.daysSinceLastCommit, githubData.daysSinceLastCommit > 30 ? "#ef4444" : "#6b7280")}
      </div>
    `);
  }

  if (siteData) {
    statsHtml.push(`
      <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
        ${statPill("Status", siteData.status.toUpperCase(), siteData.status === "up" ? "#22c55e" : "#ef4444")}
        ${statPill("Risposta", `${siteData.responseTimeMs}ms`, siteData.responseTimeMs > 2000 ? "#ef4444" : "#6b7280")}
        ${statPill("Score", `${siteData.lighthouseScore ?? "n/a"}/100`, (siteData.lighthouseScore ?? 100) < 60 ? "#ef4444" : "#22c55e")}
        ${statPill("Link rotti", siteData.brokenLinks.length, siteData.brokenLinks.length > 0 ? "#ef4444" : "#6b7280")}
      </div>
    `);
  }

  const noNew = suggestions.length === 0;

  return `
    <div style="
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    ">
      <h2 style="
        font-size: 18px;
        font-weight: 700;
        color: #111;
        margin: 0 0 16px 0;
        padding-bottom: 12px;
        border-bottom: 2px solid #f3f4f6;
      ">
        📁 ${project.name}
        ${project.url ? `<span style="font-size: 12px; font-weight: 400; color: #888; margin-left: 8px;">${project.url}</span>` : ""}
      </h2>

      ${statsHtml.join("")}

      ${noNew
        ? `<div style="font-size: 13px; color: #6b7280; font-style: italic; padding: 8px 0;">
            ✅ Nessun suggerimento nuovo — tutto già noto o risolto.
           </div>`
        : `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            ${suggestions.map((s, i) => renderSuggestion(s, i, project.repo)).join("")}
           </table>`
      }
    </div>
  `;
}

function statPill(label, value, color = "#6b7280") {
  return `
    <div style="
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 8px 14px;
      min-width: 80px;
    ">
      <div style="font-size: 11px; color: #888; margin-bottom: 2px;">${label}</div>
      <div style="font-size: 16px; font-weight: 700; color: ${color};">${value}</div>
    </div>
  `;
}

export function buildEmailHtml(results, date, allClear = false) {
  const totalSuggestions = results.reduce(
    (acc, r) => acc + r.suggestions.length,
    0
  );
  const highPriority = results.reduce(
    (acc, r) => acc + r.suggestions.filter((s) => s.priority === "high").length,
    0
  );

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="
  margin: 0;
  padding: 0;
  background: #f3f4f6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header -->
    <div style="
      background: ${allClear ? "#14532d" : "#111"};
      border-radius: 12px;
      padding: 28px 32px;
      margin-bottom: 20px;
      color: white;
    ">
      <div style="font-size: 12px; color: #888; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
        Project Monitor · ${date}
      </div>
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: white;">
        ${allClear ? "✅ Tutto ok" : "🌙 Report notturno"}
      </h1>
      ${allClear
        ? `<p style="margin: 0; color: #86efac; font-size: 14px;">Nessun suggerimento nuovo oggi. I tuoi progetti stanno girando bene.</p>`
        : `<div style="display: flex; gap: 24px;">
            <div>
              <span style="font-size: 28px; font-weight: 800; color: white;">${totalSuggestions}</span>
              <span style="font-size: 13px; color: #aaa; margin-left: 6px;">nuovi suggerimenti</span>
            </div>
            ${highPriority > 0
              ? `<div>
                  <span style="font-size: 28px; font-weight: 800; color: #ef4444;">${highPriority}</span>
                  <span style="font-size: 13px; color: #aaa; margin-left: 6px;">alta priorità</span>
                 </div>`
              : ""
            }
           </div>`
      }
    </div>

    <!-- Projects -->
    ${results.map(renderProjectSection).join("")}

    <!-- Footer -->
    <div style="text-align: center; padding: 16px; font-size: 12px; color: #9ca3af;">
      Generato da Project Monitor · Alimentato da Claude Sonnet
      <br>
      <span style="font-size: 11px;">I suggerimenti già visti non vengono riproposti per 30 giorni</span>
    </div>

  </div>
</body>
</html>
  `;
}