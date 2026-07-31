/**
 * Shared CSS tokens and layout primitives for both the health report
 * and the training report. Each renderer inlines BASE_CSS and then adds
 * its own module-specific extension (reportHtml.ts / trainingReportHtml.ts).
 *
 * Keep this file synchronized with the CSS blocks both renderers embed.
 */

/**
 * Root design tokens + page reset + topbar + layout + summary cards +
 * overview + pills + badges + module frame + legend + footer + common
 * responsive / print rules.
 *
 * NOTE: `.module__body` layout is intentionally left to each report's
 * extension CSS so the two reports can choose grid vs. block bodies.
 */
export const BASE_CSS = `:root {
  --bg: #F4F6F8;
  --surface: #FFFFFF;
  --ink: #18212B;
  --ink-secondary: #34404C;
  --muted: #596579;
  --faint: #667281;
  --border: #DCE2E8;
  --border-light: #EEF2F5;
  --sleep: #6366F1;
  --sleep-bg: #EEF2FF;
  --recovery: #18764A;
  --recovery-bg: #EAF7F0;
  --activity: #C35B12;
  --activity-bg: #FFF7ED;
  --body: #596579;
  --body-bg: #F3F4F6;
  --menstrual: #B83280;
  --menstrual-bg: #FDF2F8;
  --risk: #C93636;
  --risk-bg: #FEF2F2;
  --positive: #18764A;
  --positive-bg: #EAF7F0;
  --warning: #A94E06;
  --warning-bg: #FFF7E8;
  --fs-xs: 0.75rem;
  --fs-sm: 0.875rem;
  --fs-base: 1rem;
  --fs-lg: 1.25rem;
  --fs-xl: 1.5rem;
  --fs-2xl: 2rem;
  --radius: 8px;
  --radius-sm: 6px;
  --shadow: none;
  --shadow-md: none;
}
* { box-sizing: border-box; margin: 0; }
html {
  scroll-behavior: smooth;
  background: var(--bg);
  color-scheme: light;
}
body {
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: var(--fs-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-wrap: anywhere;
}
a:focus-visible,
button:focus-visible,
summary:focus-visible,
.term-hint:focus-visible,
.chart-wrap svg:focus-visible,
.heatmap-wrap svg:focus-visible {
  outline: 3px solid rgba(99, 102, 241, 0.35);
  outline-offset: 3px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.skip-link {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 1000;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--ink);
  color: #FFFFFF;
  text-decoration: none;
  transform: translateY(-160%);
}
.skip-link:focus {
  transform: translateY(0);
}
.sample-notice {
  margin: 0 0 20px;
  padding: 12px 16px;
  border: 1px solid #C7D2FE;
  border-left: 3px solid var(--sleep);
  border-radius: var(--radius-sm);
  background: #EEF2FF;
  color: var(--ink-secondary);
  font-size: var(--fs-sm);
  line-height: 1.6;
}

/* ─── Topbar ─── */
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 0 max(20px, env(safe-area-inset-right)) 0 max(20px, env(safe-area-inset-left));
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 56px;
}
.topbar__title {
  font-weight: 600;
  font-size: var(--fs-base);
  white-space: nowrap;
}
.topbar__date {
  color: var(--muted);
  font-size: var(--fs-sm);
  white-space: nowrap;
}
.topbar__nav {
  display: flex;
  gap: 2px;
  margin-left: auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.topbar__nav::-webkit-scrollbar {
  display: none;
}
.topbar__nav a {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--muted);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.topbar__nav a:hover {
  background: var(--border-light);
  color: var(--ink);
}
.topbar__github {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 50%;
  color: var(--muted);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
  margin-left: 6px;
}
.topbar__github:hover {
  background: var(--border-light);
  color: var(--ink);
}
.topbar__github svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
  display: block;
}

/* ─── Layout ─── */
main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px max(20px, env(safe-area-inset-right)) 0 max(20px, env(safe-area-inset-left));
}
section {
  scroll-margin-top: 108px;
}

/* ─── Summary Cards ─── */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.metric-card {
  min-width: 0;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: 18px 20px;
  box-shadow: var(--shadow);
}
.metric-card__label {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.metric-card__label::before {
  content: "";
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--metric-accent, var(--muted));
}
.metric-card__value {
  font-size: var(--fs-2xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.metric-card__sub {
  font-size: var(--fs-sm);
  color: var(--muted);
  margin-top: 4px;
}

/* ─── Overview ─── */
.overview {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: 28px;
  margin-bottom: 28px;
}
.overview__title {
  font-size: var(--fs-lg);
  font-weight: 700;
  margin-bottom: 12px;
}
.overview__text {
  font-size: var(--fs-base);
  line-height: 1.75;
  color: var(--ink-secondary);
  max-width: 72ch;
}
.overview__findings {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.overview__findings h3 {
  font-size: var(--fs-base);
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--ink);
}
.overview__findings ol,
.overview__findings ul,
.plain-list {
  padding-left: 20px;
  display: grid;
  gap: 8px;
}
.overview__findings li,
.plain-list li {
  font-size: var(--fs-base);
  line-height: 1.65;
  color: var(--ink-secondary);
}
.brief-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.brief-columns h3 {
  margin-bottom: 10px;
  font-size: var(--fs-base);
}
.brief-columns ul {
  padding-left: 20px;
  display: grid;
  gap: 8px;
}
.brief-columns li {
  color: var(--ink-secondary);
  line-height: 1.65;
}

/* ─── Pills & Badges ─── */
.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.pill {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: var(--fs-sm);
  font-weight: 500;
}
.pill--risk {
  background: var(--risk-bg);
  color: var(--risk);
}
.pill--info {
  background: var(--border-light);
  color: var(--muted);
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.03em;
}
.badge--ok { background: var(--positive-bg); color: var(--positive); }
.badge--warn { background: var(--warning-bg); color: var(--warning); }
.badge--low { background: var(--risk-bg); color: var(--risk); }
.badge--info { background: var(--border-light); color: var(--muted); }

/* ─── Module frame (body layout is extended per-report) ─── */
.module {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  margin-bottom: 36px;
  overflow: hidden;
}
.module__header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
}
.module__index {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--faint);
  min-width: 28px;
}
.module__title {
  font-size: var(--fs-lg);
  font-weight: 700;
}
.module__callout {
  margin-left: auto;
  font-size: var(--fs-sm);
  color: var(--muted);
  max-width: 40ch;
  text-align: right;
}
.module--sleep .module__index { color: var(--sleep); }
.module--recovery .module__index { color: var(--recovery); }
.module--activity .module__index { color: var(--activity); }
.module--body .module__index { color: var(--body); }
.module--menstrual .module__index { color: var(--menstrual); }
.module--recovery-support .module__index { color: var(--sleep); }

/* ─── Chart wrappers & legend ─── */
.chart-wrap {
  padding: 8px 0 4px;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
}
.chart-wrap svg {
  width: 100%;
  height: auto;
  min-width: 520px;
  display: block;
}
.chart-panel-grid {
  display: grid;
  gap: 20px;
}
.chart-panel {
  min-width: 0;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.chart-panel:first-child {
  padding-top: 0;
  border-top: 0;
}
.chart-panel__title {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--ink-secondary);
  margin-bottom: 2px;
}
.chart-scale-note {
  margin: -2px 0 16px;
  color: var(--faint);
  font-size: var(--fs-xs);
  line-height: 1.55;
}
.chart-scale-note--padded {
  margin: 8px 24px 0;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 8px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-sm);
  color: var(--muted);
}
.legend-item i {
  display: inline-block;
  width: 14px;
  height: 3px;
  border-radius: 999px;
}

/* ─── Inline glossary tooltip (CSS-only) ─── */
.term-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 6px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  cursor: help;
  position: relative;
  user-select: none;
  vertical-align: middle;
  background: var(--surface);
}
.term-hint:hover,
.term-hint:focus {
  color: var(--ink);
  border-color: var(--faint);
}
.term-hint::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 200px;
  max-width: 280px;
  padding: 10px 12px;
  background: var(--ink);
  color: #FFFFFF;
  font-size: var(--fs-xs);
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0;
  border-radius: 8px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
  white-space: normal;
  text-align: left;
  z-index: 200;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
}
.term-hint::before {
  content: "";
  position: absolute;
  bottom: calc(100% + 3px);
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: var(--ink);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
  z-index: 199;
}
.term-hint:hover::after,
.term-hint:focus::after,
.term-hint:hover::before,
.term-hint:focus::before {
  opacity: 1;
}

/* ─── Glossary card (used in Load & Recovery module) ─── */
.glossary-card {
  background: var(--border-light);
  border-radius: 10px;
  padding: 14px 18px;
  margin-top: 16px;
}
.glossary-card > summary {
  cursor: pointer;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--ink-secondary);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.glossary-card > summary::-webkit-details-marker {
  display: none;
}
.glossary-card > summary::before {
  content: "▸";
  transition: transform 0.15s;
  color: var(--faint);
  font-size: 10px;
}
.glossary-card[open] > summary::before {
  transform: rotate(90deg);
}
.glossary-card__body {
  margin-top: 12px;
  display: grid;
  gap: 10px;
  font-size: var(--fs-sm);
  line-height: 1.65;
  color: var(--ink-secondary);
}
.glossary-card__body dt {
  font-weight: 600;
  color: var(--ink);
}
.glossary-card__body dd {
  margin: 2px 0 0 0;
}

/* ─── Priority actions ─── */
.action-brief {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px;
  margin-bottom: 28px;
}
.action-brief__heading {
  margin-bottom: 18px;
}
.action-brief__heading h2 {
  font-size: var(--fs-lg);
  line-height: 1.35;
}
.action-brief__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.actions + .actions {
  margin-top: 16px;
}
.actions__card {
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
}
.actions__card h3 {
  font-size: var(--fs-base);
  margin-bottom: 10px;
}
.actions__card ol,
.actions__card ul {
  padding-left: 18px;
  display: grid;
  gap: 8px;
}
.actions__card li {
  color: var(--ink-secondary);
  line-height: 1.65;
}
.actions__card--warn {
  border-color: #E8B5B5;
  background: var(--risk-bg);
}
.actions__card--quiet {
  background: var(--surface);
}
.actions--single {
  grid-template-columns: 1fr;
}
.print-header {
  display: none;
}

/* ─── Site Footer (shared between health + training reports) ─── */
.site-footer {
  margin-top: 0;
  padding: 24px 20px 32px;
  text-align: center;
  color: var(--muted);
  font-size: var(--fs-sm);
  line-height: 1.6;
}
.site-footer__brand {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--ink-secondary);
  text-decoration: none;
}
.site-footer__brand:hover {
  color: var(--ink);
}
.site-footer__tagline {
  margin-top: 4px;
  color: var(--faint);
  font-size: var(--fs-xs);
}
.site-footer__links {
  display: inline-flex;
  align-items: center;
  gap: 20px;
  margin-top: 14px;
  flex-wrap: wrap;
  justify-content: center;
}
.site-footer__links a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  text-decoration: none;
  font-size: var(--fs-sm);
  transition: color 0.15s;
}
.site-footer__links a:hover {
  color: var(--ink);
}
.site-footer__links svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
  flex-shrink: 0;
}

/* ─── Cross-report jump link (topbar + footer) ─── */
.topbar__cross-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--ink);
  text-decoration: none;
  background: var(--border-light);
  border: 1px solid var(--border);
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
  white-space: nowrap;
  margin-left: 6px;
}
.topbar__cross-link:hover {
  background: var(--surface);
  color: var(--ink);
}
.topbar__cross-link svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
  flex-shrink: 0;
}

/* ─── Responsive (shared) ─── */
@media (max-width: 860px) {
  .summary-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .topbar {
    padding: 8px max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left));
    gap: 8px 12px;
    flex-wrap: wrap;
    align-content: center;
  }
  .topbar__nav {
    display: flex;
    order: 10;
    flex: 1 0 calc(100% + 24px);
    margin: 0 -12px;
    padding: 0 12px 8px;
    overflow-x: auto;
    scrollbar-width: none;
    overscroll-behavior-inline: contain;
  }
  .topbar__nav::-webkit-scrollbar {
    display: none;
  }
  .topbar__nav a {
    flex: 0 0 auto;
    padding: 5px 10px;
  }
  .overview {
    padding-left: 18px;
    padding-right: 18px;
  }
  .brief-columns {
    grid-template-columns: 1fr;
  }
  .topbar__date {
    display: none;
  }
  .topbar__github {
    margin-left: auto;
  }
}
@media (max-width: 600px) {
  main {
    padding: 18px max(12px, env(safe-area-inset-right)) 48px max(12px, env(safe-area-inset-left));
  }
  .metric-card {
    padding: 16px;
  }
  .action-brief {
    padding: 20px 16px;
  }
  .actions {
    grid-template-columns: 1fr;
  }
  .term-hint {
    display: none;
  }
  .chart-wrap {
    margin-right: -16px;
    padding-right: 16px;
  }
  .module__header {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .module__callout {
    flex: 1 0 100%;
    margin-left: 42px;
    text-align: left;
    max-width: none;
  }
}
@media (max-width: 390px) {
  .topbar__title {
    max-width: 48vw;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .topbar__cross-link {
    padding: 6px 9px;
    font-size: var(--fs-xs);
  }
  .topbar__github {
    display: none;
  }
  .summary-cards {
    gap: 10px;
  }
  .metric-card__value {
    font-size: var(--fs-xl);
  }
}
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

/* ─── Print (shared) ─── */
@media print {
  .topbar, .site-footer, .skip-link { display: none; }
  .print-header {
    display: block;
    margin-bottom: 18px;
    padding-bottom: 12px;
    border-bottom: 1px solid #999;
  }
  .print-header h1 {
    font-size: 20pt;
  }
  .print-header p {
    color: #444;
    font-size: 9pt;
  }
  main { padding: 0; max-width: none; }
  .metric-card,
  .actions__card {
    box-shadow: none;
    break-inside: avoid;
  }
  .module {
    break-inside: auto;
  }
  .module__header,
  .chart-panel,
  .note-block,
  .module-card,
  .heatmap-card,
  .body-card,
  .glossary-card {
    break-inside: avoid;
  }
  .module__header {
    break-after: avoid;
  }
  .chart-wrap {
    overflow: visible;
  }
  .chart-wrap svg {
    min-width: 0;
  }
  .heatmap-wrap svg {
    min-width: 0;
  }
  details:not([open]) > :not(summary) {
    display: block;
  }
  details::details-content {
    content-visibility: visible;
  }
  body { font-size: 10pt; }
  html { background: white; }
}`;

/**
 * CSS extension used only by the training report. Assumes BASE_CSS has
 * already been injected, so it only defines training-specific pieces
 * (sport module header, card grid, assessment hero, etc.).
 */
export const TRAINING_CSS = `.module__body {
  padding: 0 28px 28px;
}
.summary-cards--sport {
  margin-bottom: 20px;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}
.summary-cards--sport .metric-card {
  min-width: 0;
}

/* ─── Sport module header (emoji + title + pills) ─── */
.module__header--sport {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 28px 18px;
  border-bottom: none;
}
.module__header--sport h2 {
  font-size: var(--fs-lg);
  font-weight: 700;
  margin-bottom: 6px;
}
.module__header--sport p {
  max-width: 72ch;
  color: var(--ink-secondary);
}
.module__title-wrap {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-width: 0;
}
.module__icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--activity-bg);
  flex-shrink: 0;
}
.module__icon--emoji {
  font-size: 22px;
  line-height: 1;
}

/* ─── Nested card grid inside a training module body ─── */
.module-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.module-card {
  background: transparent;
  border: 0;
  border-top: 1px solid var(--border);
  border-radius: 0;
  padding: 16px 0 0;
  margin-top: 16px;
}
.module-card__header h3,
.module-card h3 {
  font-size: var(--fs-base);
  margin-bottom: 8px;
}
.module-card p {
  color: var(--ink-secondary);
}

/* ─── Training overview / assessment hero ─── */
.assessment-hero {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  margin-bottom: 28px;
  display: block;
}
.assessment-hero__main {
  padding: 28px 32px;
}
.assessment-hero__main h1 {
  font-size: var(--fs-xl);
  font-weight: 700;
  margin-bottom: 14px;
}
.assessment-hero__text {
  font-size: var(--fs-base);
  line-height: 1.8;
  color: var(--ink-secondary);
  max-width: 72ch;
}
.assessment-hero__text + .assessment-hero__text {
  margin-top: 12px;
}
.assessment-hero__aside {
  padding: 20px 32px 28px;
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 20px;
}
.assessment-hero__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 16px;
  border-left: 1px solid var(--border);
  min-width: 0;
}
.assessment-hero__stat:first-child {
  border-left: none;
  padding-left: 0;
}
.assessment-hero__stat-label {
  font-size: var(--fs-sm);
  color: var(--muted);
}
.assessment-hero__stat-value {
  font-size: var(--fs-xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.assessment-hero__readiness-good { color: var(--positive); }
.assessment-hero__readiness-moderate { color: var(--warning); }
.assessment-hero__readiness-low { color: var(--risk); }

/* ─── Dormant sport disclosure ─── */
.sport-disclosure > summary {
  cursor: pointer;
  list-style: none;
}
.sport-disclosure > summary::-webkit-details-marker {
  display: none;
}
.sport-disclosure__summary::after {
  content: "▸";
  align-self: center;
  color: var(--faint);
  transition: transform 0.15s;
}
.sport-disclosure[open] > .sport-disclosure__summary::after {
  transform: rotate(90deg);
}
.sport-disclosure__assessment {
  color: var(--ink-secondary);
  line-height: 1.7;
  margin-bottom: 16px;
}

/* ─── PMC chart two-panel legend ─── */
.pmc-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 24px;
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--border-light);
  border-radius: 8px;
}
.pmc-legend__panel {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: center;
  font-size: var(--fs-sm);
}
.pmc-legend__panel-title {
  font-weight: 600;
  color: var(--ink-secondary);
  font-size: var(--fs-xs);
  width: 100%;
}
.legend-item__swatch {
  width: 14px;
  height: 12px !important;
  border-radius: 3px !important;
}
@media (max-width: 700px) {
  .pmc-legend {
    grid-template-columns: 1fr;
  }
}

/* ─── Training calendar heatmap ─── */
.heatmap-card {
  margin-top: 16px;
}
.heatmap-card__header h3 {
  font-size: var(--fs-base);
  margin-bottom: 8px;
}
.heatmap-card__header p {
  color: var(--ink-secondary);
  font-size: var(--fs-sm);
  line-height: 1.65;
}
.heatmap-wrap {
  margin-top: 16px;
  width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
}
.heatmap-wrap svg {
  display: block;
  width: 100%;
  height: auto;
  min-width: 760px;
}
.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: var(--fs-xs);
  color: var(--muted);
}
.heatmap-legend__swatches {
  display: inline-flex;
  gap: 3px;
}
.heatmap-legend__swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid var(--border);
}

/* ─── Training-specific responsive ─── */
@media (max-width: 860px) {
  .module-card-grid {
    display: grid;
    grid-template-columns: 1fr;
  }
  .module__header--sport,
  .module__body {
    padding-left: 18px;
    padding-right: 18px;
  }
  .assessment-hero__aside {
    padding: 20px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .assessment-hero__stat {
    border-left: none;
    padding: 12px 0 0;
    border-top: 1px solid var(--border);
  }
  .assessment-hero__stat:nth-child(-n+2) {
    border-top: none;
    padding-top: 0;
  }
}
@media (max-width: 600px) {
  .assessment-hero__main {
    padding: 20px 16px;
  }
  .assessment-hero__aside {
    padding: 16px;
  }
  .module__header--sport {
    flex-direction: column;
    gap: 14px;
  }
  .module__header--sport .pills {
    margin-top: 0;
  }
  .heatmap-wrap {
    margin-right: -18px;
    padding-right: 18px;
  }
}
@media (max-width: 390px) {
  .assessment-hero__aside {
    grid-template-columns: 1fr;
  }
  .assessment-hero__stat,
  .assessment-hero__stat:nth-child(-n+2) {
    border-top: 1px solid var(--border);
    padding-top: 12px;
  }
  .assessment-hero__stat:first-child {
    border-top: 0;
    padding-top: 0;
  }
}`;

/**
 * CSS extension used only by the health report. Everything shared with the
 * training report (topbar, summary cards, overview, pills, badges, module
 * frame, legend, footer, cross-link, responsive/print basics) lives in
 * BASE_CSS. This block only carries the health-specific layouts.
 */
export const HEALTH_CSS = `
/* ─── Health module body: chart on the left, aside on the right ─── */
.module__body {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
  gap: 0;
}
.module__chart {
  padding: 20px 24px;
  overflow: hidden;
  min-width: 0;
}
.module__aside {
  padding: 20px 24px;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ─── Metric Rail (right-side key numbers in each module) ─── */
.metric-rail {
  display: grid;
  gap: 14px;
}
.metric-rail__item {
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.metric-rail__label {
  font-size: var(--fs-sm);
  color: var(--muted);
  margin-bottom: 4px;
}
.metric-rail__value {
  font-size: var(--fs-xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.metric-rail__note {
  font-size: var(--fs-xs);
  color: var(--faint);
  margin-top: 2px;
}
.metric-rail__item:first-child {
  border-top: none;
  padding-top: 0;
}

/* ─── Note Block (inline callouts under charts) ─── */
.note-block {
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.note-block h4 {
  font-size: var(--fs-sm);
  font-weight: 600;
  margin-bottom: 6px;
}
.note-block p,
.note-block li {
  font-size: var(--fs-sm);
  line-height: 1.65;
  color: var(--ink-secondary);
}
.note-block ul {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 6px;
}
.note-block li::before {
  content: "\\2022\\00a0";
  color: var(--faint);
}
.module__aside > :first-child {
  border-top: none;
  padding-top: 0;
}

/* ─── Ledger (recovery-metrics table) ─── */
.ledger {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: var(--fs-sm);
}
.ledger th {
  text-align: left;
  font-size: var(--fs-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--faint);
  padding: 0 8px 10px;
  white-space: nowrap;
}
.ledger__row td {
  padding: 12px 8px;
  border-top: 1px solid var(--border);
  vertical-align: middle;
}
.ledger__row--empty td {
  color: var(--faint);
}
.ledger__name {
  white-space: nowrap;
}
.ledger__name strong {
  display: block;
  font-size: var(--fs-base);
}
.ledger__name small {
  display: block;
  margin-top: 2px;
  color: var(--faint);
  font-size: var(--fs-xs);
}
.ledger__val {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ledger__empty {
  color: var(--faint);
  font-style: italic;
}
.delta--up,
.delta--down {
  color: var(--ink-secondary);
}
/* ─── Activity Summary (3 stat tiles) ─── */
.activity-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 14px;
}
.activity-stats__item {
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.activity-stats__item span {
  font-size: var(--fs-sm);
  color: var(--muted);
}
.activity-stats__item strong {
  display: block;
  margin-top: 4px;
  font-size: var(--fs-xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* ─── Body Composition (two cards with sparklines) ─── */
.body-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding: 20px 24px;
}
.body-card {
  border-top: 1px solid var(--border);
  padding-top: 14px;
}
.body-card__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}
.body-card__label {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--muted);
}
.body-card__value {
  font-size: var(--fs-xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.body-card__chart {
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 8px;
}
.body-card__chart svg {
  width: 100%;
  height: auto;
}

/* ─── Appendix (data boundaries + source confidence) ─── */
.appendix {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  padding: 28px;
  margin-bottom: 24px;
}
.appendix__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-top: 20px;
}
.appendix h3 {
  font-size: var(--fs-base);
  font-weight: 700;
  margin-bottom: 12px;
}
.appendix__title {
  font-size: var(--fs-lg);
  font-weight: 700;
}
.appendix__list {
  padding-left: 18px;
  display: grid;
  gap: 6px;
}
.appendix__list li {
  font-size: var(--fs-sm);
  line-height: 1.65;
  color: var(--ink-secondary);
}
.confidence-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 10px;
}
.confidence-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid var(--border);
}
.confidence-list li div {
  display: grid;
  gap: 2px;
}
.confidence-list li strong {
  font-size: var(--fs-base);
}
.confidence-list li small {
  font-size: var(--fs-sm);
  color: var(--muted);
}
.disclaimer {
  margin-top: 24px;
  font-size: var(--fs-sm);
  line-height: 1.65;
  color: var(--faint);
}

/* ─── Assessment hero (visually matches .assessment-hero in BASE/TRAINING) ─── */
.assessment {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  margin-bottom: 28px;
}
.assessment__main {
  padding: 28px 32px;
}
.assessment__main h1 {
  font-size: var(--fs-xl);
  font-weight: 700;
  margin-bottom: 14px;
}
.assessment__text {
  font-size: var(--fs-base);
  line-height: 1.8;
  color: var(--ink-secondary);
  max-width: 72ch;
}
.assessment__text + .assessment__text {
  margin-top: 12px;
}
/* ─── Insights section (cross-metric + behavioral cards) ─── */
.insights-section {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: 28px;
  margin-bottom: 28px;
}
.insights-section h2 {
  font-size: var(--fs-lg);
  font-weight: 700;
  margin-bottom: 16px;
}
.evidence-details > summary {
  cursor: pointer;
  list-style: none;
  font-size: var(--fs-base);
  font-weight: 650;
  color: var(--ink-secondary);
}
.evidence-details > summary::-webkit-details-marker {
  display: none;
}
.evidence-details > summary::before {
  content: "▸";
  display: inline-block;
  margin-right: 8px;
  color: var(--faint);
  transition: transform 0.15s;
}
.evidence-details[open] > summary::before {
  transform: rotate(90deg);
}
.evidence-details__body {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.insight-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.insight-grid__title {
  font-size: var(--fs-base);
  font-weight: 600;
  margin-bottom: 12px;
}
.insight-card {
  padding: 14px 16px;
  background: var(--border-light);
  border-radius: var(--radius-sm);
  margin-bottom: 10px;
}
.insight-card:last-child {
  margin-bottom: 0;
}
.insight-card p {
  font-size: var(--fs-base);
  line-height: 1.7;
  color: var(--ink-secondary);
}

/* ─── Utility ─── */
.section-intro {
  font-size: var(--fs-sm);
  line-height: 1.65;
  color: var(--ink-secondary);
  margin-bottom: 14px;
}

/* ─── Health-specific responsive rules ─── */
@media (max-width: 900px) {
  .module__body {
    grid-template-columns: 1fr;
  }
  .module__aside {
    border-left: 0;
    border-top: 1px solid var(--border);
  }
  .actions,
  .appendix__grid,
  .body-grid,
  .insight-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  :root {
    --fs-2xl: 24px;
    --fs-xl: 18px;
  }
  main {
    padding: 16px 12px 48px;
  }
  .assessment__main {
    padding: 20px 16px;
  }
  .module__header {
    padding: 14px 16px;
  }
  .module__chart,
  .module__aside {
    padding: 16px;
  }
  .insights-section,
  .appendix {
    padding: 20px 16px;
  }
  .actions__card {
    padding: 20px 16px;
  }
  .body-grid {
    padding: 16px;
  }
  /* Ledger on small screens: keep only metric name, latest value, and delta. */
  .ledger th:nth-child(3),
  .ledger th:nth-child(4),
  .ledger__row td:nth-child(3),
  .ledger__row td:nth-child(4) {
    display: none;
  }
  .activity-stats {
    grid-template-columns: 1fr;
  }
}

/* ─── Health print overrides (BASE_CSS already hides topbar/footer) ─── */
@media print {
  .actions__card,
  .appendix {
    box-shadow: none;
    break-inside: avoid;
  }
}
`;
