# Speakeasy

Speakeasy (speakeasygo.com) provides the box office, guest lists, reservations, door check-in and
festival POS. Off Grid owns the sale; Speakeasy owns what happens at the venue.

## What Off Grid sends and reads

| Direction | Data |
| --- | --- |
| → Speakeasy | Event (per race edition), guest list entries for each paid order, ticket issuance |
| ← Speakeasy | Ticket references, check-in timestamps, on-site spend attached to a guest |

`Guest.ticketRef` and `Guest.checkedInAt` are the join. Issuance skips any guest that already has a
`ticketRef`, so re-running the outbox never double-issues.

## Provider abstraction

`src/lib/integrations/speakeasy/` exposes a `SpeakeasyProvider` interface with two implementations:

- `mock` — used whenever `SPEAKEASY_ENABLED=false`. Issues deterministic ticket refs and lets the
  full order → ticket → check-in flow be exercised locally and in tests.
- `http` — the real client.

> **The HTTP client is provisional.** The public partner page documents the product surface
> (digital box office, enterprise ticketing, guest lists/RSVPs, reservations, 3D maps, festival POS,
> SMS/email marketing, CRM segmentation, door management, affiliate and e-commerce tools, event APIs
> and POS integrations) but not the API contract. Endpoint paths, payload shapes and the auth header
> in `http.ts` are assumptions to confirm during partner onboarding. Confirm before flipping
> `SPEAKEASY_ENABLED=true`; only that one file should need to change.

## Configuration

| Variable | Meaning |
| --- | --- |
| `SPEAKEASY_ENABLED` | `false` uses the mock provider |
| `SPEAKEASY_API_URL` | Base URL supplied at onboarding |
| `SPEAKEASY_API_KEY` | Partner API key |
| `SPEAKEASY_VENUE_ID` | Venue/organisation the events belong to |
| `SPEAKEASY_WEBHOOK_SECRET` | Shared secret for inbound check-in/spend webhooks |

## Questions for onboarding

1. Auth: static API key header, or OAuth client credentials?
2. Are events created via API, or provisioned in their dashboard and referenced by id?
3. Guest list: bulk upsert endpoint, and is the idempotency key ours or theirs?
4. Check-in and POS spend: webhooks (preferred) or polling only? Signature scheme?
5. Do reservations and tables map to our `Package.kind = TABLE`, or need a separate object?
