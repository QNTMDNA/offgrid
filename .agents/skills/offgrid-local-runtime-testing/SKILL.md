---
name: offgrid-local-runtime-testing
description: Run browser-based commerce and admin tests against Off Grid's local seeded Postgres environment.
---

# Local runtime testing

- Activate Node with `source ~/.nvm/nvm.sh` before npm commands on this environment.
- Check existing services before starting duplicates: local Next.js uses port 3000; the `ogr-pg` Postgres container exposes port 5433.
- Follow the repository blueprint for installation, migrations, seed, and startup. Avoid reseeding an in-progress test database.
- Use the configured seed admin credentials at `/admin/login`; consult `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and the seed script for local defaults.
- With integrations disabled, verify admin integration status and outbox records rather than expecting external delivery.
- When email delivery is disabled, subscribe through the UI first, then read only the test subscriber's confirmation token from Postgres and open the confirmation link in the browser. If subscription fails, report the prerequisite failure rather than inserting a subscriber and claiming an end-to-end pass.
- Check prices at public catalog, cart, checkout, and admin order detail: stored values are integer minor units. Include cross-edition currency boundaries.
- Inventory holds last 30 minutes. Verify expiry timestamps without waiting, and distinguish expiry inspection from actually exercising expiration.
- Restore catalog status changes after testing; retain test orders as evidence and report their identifiers.

## Devin Secrets Needed

None for local seeded testing with external integrations disabled. External delivery tests require separately configured integration credentials and `RESEND_API_KEY` for email.
