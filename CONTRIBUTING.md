# Contributing to ClawBoard

Thanks for considering contributing to ClawBoard.

## Development Setup

```bash
npm install
cp .env.example .env
npm run bff
npm run dev
```

## Contribution Guidelines

- keep pull requests focused and small when possible
- avoid mixing unrelated refactors with feature work
- update docs when behavior or setup changes
- prefer environment-driven configuration over local hardcoding
- preserve existing functionality unless the change explicitly targets behavior

## Before Opening a PR

- run `npm run build`
- make sure the app still starts locally
- verify major flows affected by your change
- update README or setup docs if needed

## Reporting Bugs

Please include:

- what you expected
- what actually happened
- screenshots or logs if useful
- your environment and config context when relevant

## Design Notes

ClawBoard aims to stay:

- practical
- local-first
- lightweight
- OpenClaw-oriented but configurable enough for reuse
