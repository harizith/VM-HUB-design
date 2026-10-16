---
name: VM-HUB Replit setup quirks
description: Package-manager and preview-origin issues encountered while running the imported VM-HUB repository in Replit.
---

- The checked-in Bun lockfile uses a format rejected by the bundled Bun version. The repo README recommends pnpm, but the pinned Next.js release was blocked by Replit's package firewall; using the compatible latest Next.js and eslint-config-next release allowed installation. Do not bypass the firewall.
- Next.js development mode blocks Replit preview origins for HMR unless they are listed in `allowedDevOrigins`. Include `127.0.0.1` and the current `REPLIT_DEV_DOMAIN`.

**Why:** The imported app needs to remain installable behind Replit's package firewall and keep live reload working in the proxied preview.

**How to apply:** When dependency installation or preview HMR fails, verify the repo's documented package manager and the current framework-version docs before changing dependencies or origin settings.
