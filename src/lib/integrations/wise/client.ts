import { createSign } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Minimal typed client for the Wise Platform API.
 * Reference: https://docs.wise.com/api-reference
 *
 * Only the endpoints Off Grid needs are modelled: quotes, recipient accounts,
 * transfers, funding, balances and webhook subscriptions.
 */

export class WiseError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "WiseError";
  }
}

export type WiseQuote = {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  paymentOptions?: Array<{
    payIn: string;
    payOut: string;
    fee: { total: number };
    sourceAmount: number;
    targetAmount: number;
  }>;
};

export type WiseRecipient = {
  id: number;
  currency: string;
  accountHolderName: string;
  country?: string;
};

export type WiseTransfer = {
  id: number;
  status: string;
  reference?: string;
  targetAccount: number;
  quoteUuid: string;
  created?: string;
};

export type WiseBalance = {
  id: number;
  currency: string;
  type: string;
  amount: { value: number; currency: string };
};

export type RecipientInput = {
  currency: string;
  /** Wise account type for the corridor, e.g. "iban", "sort_code", "aba". */
  type: string;
  accountHolderName: string;
  legalType?: "PRIVATE" | "BUSINESS";
  details: Record<string, unknown>;
};

export class WiseClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly profileId: string,
    private readonly scaPrivateKey: string = "",
  ) {}

  static fromEnv(): WiseClient {
    const e = env();
    if (!e.WISE_ENABLED) throw new Error("Wise integration is disabled");
    if (!e.WISE_API_TOKEN || !e.WISE_PROFILE_ID) {
      throw new Error("WISE_API_TOKEN and WISE_PROFILE_ID are required");
    }
    return new WiseClient(
      e.WISE_API_URL,
      e.WISE_API_TOKEN,
      e.WISE_PROFILE_ID,
      e.WISE_SCA_PRIVATE_KEY,
    );
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<{ data: T; response: Response }> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const parsed: unknown = text ? safeJson(text) : null;

    if (!response.ok) {
      // A 403 carrying x-2fa-approval is Wise asking for a signed challenge,
      // not a failure — the caller retries with the signature attached.
      if (response.status === 403 && response.headers.get("x-2fa-approval")) {
        return { data: parsed as T, response };
      }
      throw new WiseError(
        response.status,
        parsed,
        `Wise ${method} ${path} failed with ${response.status}`,
      );
    }

    return { data: parsed as T, response };
  }

  async createQuote(input: {
    sourceCurrency: string;
    targetCurrency: string;
    /** Exactly one of sourceAmount / targetAmount. */
    sourceAmount?: number;
    targetAmount?: number;
  }): Promise<WiseQuote> {
    const { data } = await this.request<WiseQuote>(
      "POST",
      `/v3/profiles/${this.profileId}/quotes`,
      { ...input, payOut: "BALANCE", preferredPayIn: "BALANCE" },
    );
    return data;
  }

  async createRecipient(input: RecipientInput): Promise<WiseRecipient> {
    const { data } = await this.request<WiseRecipient>("POST", "/v1/accounts", {
      profile: Number(this.profileId),
      currency: input.currency,
      type: input.type,
      accountHolderName: input.accountHolderName,
      legalType: input.legalType ?? "BUSINESS",
      details: input.details,
    });
    return data;
  }

  /** Field requirements differ per corridor; use this to drive dynamic forms. */
  async accountRequirements(quoteId: string): Promise<unknown> {
    const { data } = await this.request<unknown>(
      "GET",
      `/v1/quotes/${quoteId}/account-requirements`,
    );
    return data;
  }

  async createTransfer(input: {
    targetAccount: number;
    quoteUuid: string;
    /** Idempotency key — reuse it to make retries safe. */
    customerTransactionId: string;
    reference: string;
  }): Promise<WiseTransfer> {
    const { data } = await this.request<WiseTransfer>("POST", "/v1/transfers", {
      targetAccount: input.targetAccount,
      quoteUuid: input.quoteUuid,
      customerTransactionId: input.customerTransactionId,
      details: { reference: input.reference },
    });
    return data;
  }

  /**
   * Fund a transfer from the Wise balance. Wise may answer with a strong
   * customer authentication challenge; we sign the one-time token with the
   * registered private key and replay the request once.
   */
  async fundTransfer(transferId: number): Promise<{ status: string }> {
    const path = `/v3/profiles/${this.profileId}/transfers/${transferId}/payments`;
    const first = await this.request<{ status: string }>("POST", path, {
      type: "BALANCE",
    });

    const challenge = first.response.headers.get("x-2fa-approval");
    if (first.response.status !== 403 || !challenge) return first.data;

    if (!this.scaPrivateKey) {
      throw new Error(
        "Wise requested SCA approval but WISE_SCA_PRIVATE_KEY is not configured",
      );
    }
    const signature = createSign("RSA-SHA256")
      .update(challenge)
      .sign(this.scaPrivateKey, "base64");

    const second = await this.request<{ status: string }>(
      "POST",
      path,
      { type: "BALANCE" },
      { "x-2fa-approval": challenge, "X-Signature": signature },
    );
    return second.data;
  }

  async getTransfer(transferId: number): Promise<WiseTransfer> {
    const { data } = await this.request<WiseTransfer>(
      "GET",
      `/v1/transfers/${transferId}`,
    );
    return data;
  }

  async balances(): Promise<WiseBalance[]> {
    const { data } = await this.request<WiseBalance[]>(
      "GET",
      `/v4/profiles/${this.profileId}/balances?types=STANDARD`,
    );
    return data;
  }

  async subscribeWebhook(input: {
    name: string;
    trigger: "transfers#state-change" | "balances#credit";
    deliveryUrl: string;
  }): Promise<{ id: string }> {
    const { data } = await this.request<{ id: string }>(
      "POST",
      `/v3/profiles/${this.profileId}/subscriptions`,
      {
        name: input.name,
        trigger_on: input.trigger,
        delivery: { version: "2.0.0", url: input.deliveryUrl },
      },
    );
    return data;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
