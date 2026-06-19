/**
 * issue-url.js
 *
 * Costruisce URL pre-compilati per:
 * - Aprire una nuova issue su GitHub (zero infrastruttura)
 * - Scartare un suggerimento via monitor-api su Vercel
 */

const DISMISS_API_URL = process.env.DISMISS_API_URL ?? "https://monitor-api.vercel.app";
const DISMISS_TOKEN   = process.env.DISMISS_TOKEN ?? "";

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

  const params = new URLSearchParams({ title, body, labels: label });
  return `https://github.com/${repo}/issues/new?${params.toString()}`;
}

export function buildDismissUrl(repo, suggestion) {
  if (!suggestion.id || !DISMISS_TOKEN) return null;

  const params = new URLSearchParams({
    id: suggestion.id,
    repo,
    action: suggestion.action,
    token: DISMISS_TOKEN,
  });

  return `${DISMISS_API_URL}/api/dismiss?${params.toString()}`;
}