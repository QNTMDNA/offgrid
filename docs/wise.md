# Wise Business API

Two uses:

1. **Payouts** — paying venues, suppliers and brand partners in their own currency.
2. **Inbound reconciliation** — matching customer bank transfers against invoices via
   `balances#credit` webhooks and the payment reference printed on the invoice.

## Setup

1. Business account → Settings → API tokens. Create a token with **full access** (payouts need
   write). Put it in `WISE_API_TOKEN`.
2. `WISE_PROFILE_ID` is the *business* profile id (`GET /v2/profiles`), not the personal one.
3. `WISE_API_URL` — `https://api.sandbox.transferwise.tech` for sandbox,
   `https://api.transferwise.com` for production.
4. **SCA**: production transfer funding is challenged. Upload a public key to Settings → API tokens →
   Manage public keys, and put the matching PEM private key in `WISE_SCA_PRIVATE_KEY`. The client
   signs the `x-2fa-approval` token with SHA-256/RSA and replays the request.
5. **Webhooks**: subscribe the business profile to `transfers#state-change` and `balances#credit`
   pointing at `POST /api/webhooks/wise`. Put Wise's webhook public key in
   `WISE_WEBHOOK_PUBLIC_KEY` — deliveries with a bad `X-Signature-SHA256` are rejected with 401.

## Payout flow

`draftPayout()` → outbox → worker:

1. `POST /v3/profiles/{id}/quotes` — source/target currency, target amount.
2. `POST /v1/accounts` — recipient account (reused via `IntegrationLink` if the partner already has one).
3. `POST /v1/transfers` — with a UUID `customerTransactionId` derived from the payout id, so a retry
   never creates a second transfer.
4. `POST /v3/profiles/{id}/transfers/{transferId}/payments` with `type: BALANCE` — funding, SCA-signed.
5. `transfers#state-change` webhooks move the payout through `PROCESSING → PAID` or `FAILED`.

Partner receiving-account details are stored on `Partner` and are **placeholders (`REPLACE_ME`) in
seed/dev data** — real IBAN/account details must be entered before enabling payouts.

## Inbound payments

Bank-transfer invoices print a reference (`OGR26XXXXXX`). A `balances#credit` webhook carrying that
reference is matched to the invoice and recorded via `recordPayment()`, which is idempotent on
`(method, externalId)`. Unmatched credits are stored as unprocessed deliveries and listed on
`/admin/integrations` for manual matching.

Enable with `WISE_ENABLED=true`.
