/**
 * issue-url.js
 *
 * Costruisce URL pre-compilati per aprire una nuova issue su GitHub.
 * GitHub supporta nativamente i parametri ?title=&body=&labels=
 * → zero infrastruttura, zero API call, funziona con un semplice link.
 */

export function buildIssueUrl(repo, suggestion) {
  const title = `[${suggestion.area}] ${suggestion.action}`;

  const body = [
    `## 📋 Suggerimento dal Project Monitor`,
    ``,
    `**Priorità:** ${suggestion.priority}`,
    `**Area:** ${suggestion.area}`,
    ``,
    `### Azione`,
    suggestion.action,
    ``,
    `### Perché`,
    suggestion.why,
    ``,
    `---`,
    `*Generato automaticamente da Project Monitor · ${new Date().toLocaleDateString("it-IT")}*`,
  ].join("\n");

  const label = {
    high: "priority:high",
    medium: "priority:medium",
    low: "priority:low",
  }[suggestion.priority] ?? "monitor";

  const params = new URLSearchParams({
    title,
    body,
    labels: label,
  });

  return `https://github.com/${repo}/issues/new?${params.toString()}`;
}