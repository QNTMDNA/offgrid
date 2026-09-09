# Salesforce Sales Cloud

Off Grid is the system of record for hospitality inventory, orders and guests. Salesforce is the
system of record for the sales pipeline. Sync is one-way (Off Grid → Salesforce) for Accounts,
Contacts, Leads and Opportunities, plus a pull for opportunity stage changes made by sales.

## Connected App

1. Setup → App Manager → New Connected App → enable OAuth.
2. Scopes: `api`, `refresh_token`.
3. Enable **Client Credentials Flow** and set the *Run As* user to a dedicated integration user
   (a licensed user with an "Off Grid Integration" permission set — do not use a personal login).
4. Copy the consumer key/secret into `SALESFORCE_CLIENT_ID` / `SALESFORCE_CLIENT_SECRET`.
5. `SALESFORCE_LOGIN_URL` is `https://login.salesforce.com` for production,
   `https://test.salesforce.com` for a sandbox.

The app authenticates with `grant_type=client_credentials`, caches the token in memory, and refreshes
on 401.

## Required custom fields

Every synced object needs an external id so writes are upserts and re-running the outbox is safe.

| Object | Field | Type |
| --- | --- | --- |
| Account, Contact, Lead, Opportunity, Campaign | `OffGrid_Id__c` | Text(32), External Id, Unique |
| Account | `OffGrid_Tier__c` | Picklist: PROSPECT, MEMBER, PARTNER, SPONSOR, VENUE |
| Lead | `OffGrid_Interests__c` | Multi-select or Text(255), semicolon-delimited |
| Lead | `OffGrid_Party_Size__c` | Number(3,0) |
| Lead | `OffGrid_Budget__c` | Currency |
| Lead | `OffGrid_UTM_Source__c` / `_Medium__c` / `_Campaign__c` | Text(255) |
| Opportunity | `OffGrid_Race_Edition__c` | Text(80), e.g. `Monaco Grand Prix '26` |
| Opportunity | `OffGrid_Primary_Contact__c` | Lookup(Contact) |

Standard picklist values assumed by `src/lib/integrations/salesforce/mappers.ts`:

- LeadSource: `Web — Request Access`, `Web — Sponsor Inquiry`, `Web — Newsletter`, `Referral`, `Import`
- StageName: `Qualification`, `Proposal/Price Quote`, `Negotiation/Review`, `Closed Won`, `Closed Lost`

**These names are assumptions until the org is inspected.** If the org uses different picklist
labels or field API names, change the two maps and the field builders in `mappers.ts` — nothing else
depends on them.

## Sync behaviour

- Lead capture (`Request Access`, `Sponsor Inquiry`) enqueues `salesforce.lead.upsert`.
- Qualifying a lead in the admin console creates the Opportunity locally and enqueues
  `salesforce.opportunity.upsert`; the Account and Contact are upserted first so lookups resolve.
- Paid orders enqueue an Opportunity in `Closed Won` for reporting parity.
- `pullOpportunityUpdates()` (run by `/api/jobs/run`) reads stage/amount/close-date changes back into
  `Opportunity` so the admin console reflects what sales did in Salesforce.
- Failures are retried by the outbox worker with backoff and surface on `/admin/integrations`.

Enable with `SALESFORCE_ENABLED=true`. While disabled, events are enqueued and skipped, so turning it
on does not replay months of backlog — clear or requeue deliberately.
