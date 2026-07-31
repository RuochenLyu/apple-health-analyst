# Contributing

Issues and focused pull requests are welcome.

## Development

Use Node.js 24 for local development; Node.js 22 is also tested in CI.

```bash
npm ci
npm run check
npm run pack:check
```

When changing analysis, narratives, translations, or rendering, also run:

```bash
npm run demo:check
npm run docs:check
```

Commits should follow Conventional Commits 1.0.0. Keep pull requests focused,
describe the user-visible impact and evidence boundary, and add a regression
test for bug fixes.

## Health-data privacy

Never commit an Apple Health export, a real generated report, a personal device
name, or derived measurements that can identify a person. Public examples must
come from `scripts/generate-demo-insights.mjs` and must remain clearly labeled
as synthetic.

Do not weaken the distinction between recorded association and causation, or
present consumer-device estimates as diagnosis, medical clearance, or a
personalized prescription.
