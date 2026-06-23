/**
 * rotation.js
 *
 * Returns the focus area and prompt instructions for today's run
 * based on a weekly rotation (Mon–Fri). Weekend = no report (handled in workflow).
 *
 * Mon → Features & Product
 * Tue → UX & Content
 * Wed → Performance & SEO
 * Thu → Security & Reliability
 * Fri → Maintenance & Tech Debt
 */

export const ROTATION = [
  null, // 0 = Sunday (no report)
  {
    day: "Lunedì",
    label: "🚀 Features & Product",
    area: "Features",
    instructions: `Focus EXCLUSIVELY on product and feature opportunities:
- Missing features that would meaningfully improve the project for its users
- User flows that feel incomplete or could be simplified
- Content gaps or missing pages
- Ideas directly inspired by recent commits (what was just built? what's the logical next step?)
Do NOT suggest infrastructure, performance, or security improvements today.`,
  },
  {
    day: "Martedì",
    label: "🎨 UX & Content",
    area: "UX",
    instructions: `Focus EXCLUSIVELY on user experience and content quality:
- Confusing or missing UI feedback (loading states, empty states, errors)
- Accessibility issues (missing alt text, poor contrast, keyboard navigation)
- Copy that could be clearer or more engaging
- Missing onboarding or help for new users
Do NOT suggest infrastructure, performance, or security improvements today.`,
  },
  {
    day: "Mercoledì",
    label: "⚡ Performance & SEO",
    area: "Performance",
    instructions: `Focus EXCLUSIVELY on performance and discoverability:
- Page load time and Core Web Vitals improvements
- Missing or weak SEO signals (meta, og tags, structured data, sitemap)
- Image optimization opportunities
- Caching or CDN improvements
Do NOT suggest features, UX, or security improvements today.`,
  },
  {
    day: "Giovedì",
    label: "🔒 Security & Reliability",
    area: "Security",
    instructions: `Focus EXCLUSIVELY on security and reliability:
- Auth or authorization gaps
- Missing input validation or rate limiting
- Error handling gaps that could cause silent failures
- Missing monitoring, logging, or alerting
- Dependencies with known vulnerabilities
Do NOT suggest features, UX, or performance improvements today.`,
  },
  {
    day: "Venerdì",
    label: "🧹 Maintenance & Tech Debt",
    area: "Maintenance",
    instructions: `Focus EXCLUSIVELY on code health and maintainability:
- Outdated dependencies worth upgrading
- Missing tests for critical paths
- Documentation gaps (README, inline comments, API docs)
- Dead code, unused files, or config that could be cleaned up
- CI/CD improvements
Do NOT suggest features, UX, or security improvements today.`,
  },
  null, // 6 = Saturday (no report)
];

export function getTodayRotation() {
  const day = new Date().getDay(); // 0=Sun … 6=Sat
  return ROTATION[day] ?? ROTATION[1]; // fallback a lunedì se weekend (non dovrebbe succedere)
}