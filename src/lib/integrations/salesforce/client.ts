import { env } from "@/lib/env";

/**
 * Salesforce Sales Cloud REST client using the OAuth 2.0 client-credentials
 * flow (Connected App with a designated run-as integration user).
 *
 * Records are written with external-id upserts against `OffGrid_Id__c`, which
 * makes every sync idempotent and removes the need to store Salesforce ids
 * before the first write. See docs/salesforce.md for the required org setup.
 */

export const EXTERNAL_ID_FIELD = "OffGrid_Id__c";

export type SObjectName = "Account" | "Contact" | "Lead" | "Opportunity" | "Campaign";

export class SalesforceError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "SalesforceError";
  }
}

type Token = { accessToken: string; instanceUrl: string; expiresAt: number };

export type UpsertResult = { id: string; created: boolean };

export class SalesforceClient {
  private token: Token | null = null;

  constructor(
    private readonly loginUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly apiVersion: string,
  ) {}

  static fromEnv(): SalesforceClient {
    const e = env();
    if (!e.SALESFORCE_ENABLED) throw new Error("Salesforce integration is disabled");
    if (!e.SALESFORCE_CLIENT_ID || !e.SALESFORCE_CLIENT_SECRET) {
      throw new Error("SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET are required");
    }
    return new SalesforceClient(
      e.SALESFORCE_LOGIN_URL,
      e.SALESFORCE_CLIENT_ID,
      e.SALESFORCE_CLIENT_SECRET,
      e.SALESFORCE_API_VERSION,
    );
  }

  private async authenticate(): Promise<Token> {
    // Salesforce access tokens are session-scoped; refresh a minute early.
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token;

    const response = await fetch(`${this.loginUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const body = (await response.json()) as {
      access_token?: string;
      instance_url?: string;
      error_description?: string;
    };
    if (!response.ok || !body.access_token || !body.instance_url) {
      throw new SalesforceError(
        response.status,
        body,
        `Salesforce authentication failed: ${body.error_description ?? response.status}`,
      );
    }

    this.token = {
      accessToken: body.access_token,
      instanceUrl: body.instance_url,
      expiresAt: Date.now() + 30 * 60_000,
    };
    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T | null> {
    const token = await this.authenticate();
    const response = await fetch(`${token.instanceUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 204) return null;

    const text = await response.text();
    const parsed: unknown = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new SalesforceError(
        response.status,
        parsed,
        `Salesforce ${method} ${path} failed with ${response.status}`,
      );
    }
    return parsed as T;
  }

  /** Upsert by external id. Returns the Salesforce record id either way. */
  async upsert(
    sobject: SObjectName,
    externalId: string,
    fields: Record<string, unknown>,
  ): Promise<UpsertResult> {
    const result = await this.request<{ id: string; created: boolean }>(
      "PATCH",
      `/services/data/${this.apiVersion}/sobjects/${sobject}/${EXTERNAL_ID_FIELD}/${encodeURIComponent(externalId)}`,
      fields,
    );
    // A 204 means "updated, nothing changed"; resolve the id with a lookup.
    if (!result) {
      const found = await this.findByExternalId(sobject, externalId);
      return { id: found ?? "", created: false };
    }
    return result;
  }

  async findByExternalId(
    sobject: SObjectName,
    externalId: string,
  ): Promise<string | null> {
    const result = await this.request<{ Id: string }>(
      "GET",
      `/services/data/${this.apiVersion}/sobjects/${sobject}/${EXTERNAL_ID_FIELD}/${encodeURIComponent(externalId)}`,
    );
    return result?.Id ?? null;
  }

  async query<T>(soql: string): Promise<T[]> {
    const result = await this.request<{ records: T[] }>(
      "GET",
      `/services/data/${this.apiVersion}/query?q=${encodeURIComponent(soql)}`,
    );
    return result?.records ?? [];
  }

  /** Convert a Lead into Account/Contact/Opportunity using the standard action. */
  async convertLead(input: {
    leadId: string;
    convertedStatus: string;
    accountId?: string;
    contactId?: string;
    doNotCreateOpportunity?: boolean;
  }): Promise<{ accountId?: string; contactId?: string; opportunityId?: string }> {
    const result = await this.request<{
      accountId?: string;
      contactId?: string;
      opportunityId?: string;
    }>("POST", `/services/data/${this.apiVersion}/actions/standard/convertLead`, {
      inputs: [
        {
          leadId: input.leadId,
          convertedStatus: input.convertedStatus,
          accountId: input.accountId,
          contactId: input.contactId,
          doNotCreateOpportunity: input.doNotCreateOpportunity ?? true,
        },
      ],
    });
    return result ?? {};
  }
}
