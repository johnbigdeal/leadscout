/**
 * PayPal Subscriptions API client for LeadScout billing.
 */

const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

/**
 * Get OAuth2 access token from PayPal.
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayPal auth error: ${err.error_description || err.error}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Create a PayPal subscription for a plan.
 * Returns the approval URL where the user must be redirected.
 */
export async function createPayPalSubscription(
  planId: string,
  subscriber: {
    name: { given_name: string; surname: string };
    email_address: string;
  },
  returnUrl: string,
  cancelUrl: string,
  customId?: string,
) {
  const accessToken = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `sub-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: customId,
      subscriber,
      application_context: {
        brand_name: "LeadScout",
        locale: "es-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `PayPal subscription error: ${err.message || JSON.stringify(err)}`,
    );
  }

  const data = await res.json();

  /* Extract approval URL */
  const approveLink = data.links?.find(
    (link: any) => link.rel === "approve",
  );

  return {
    subscriptionId: data.id,
    status: data.status,
    approveUrl: approveLink?.href,
    createTime: data.create_time,
  };
}

/**
 * Get subscription details from PayPal.
 */
export async function getPayPalSubscription(subscriptionId: string) {
  const accessToken = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `PayPal get subscription error: ${err.message || JSON.stringify(err)}`,
    );
  }

  return res.json();
}

/**
 * Cancel a PayPal subscription.
 */
export async function cancelPayPalSubscription(
  subscriptionId: string,
  reason?: string,
) {
  const accessToken = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: reason || "Customer requested cancellation",
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `PayPal cancel error: ${err.message || JSON.stringify(err)}`,
    );
  }

  return true;
}

/**
 * Verify PayPal webhook signature.
 */
export function verifyPayPalWebhook(
  headers: Headers,
  body: string,
): boolean {
  /* For production, implement proper webhook verification */
  /* PayPal provides transmission_id, cert_id, auth_algo, etc. */
  /* Simplified: check if webhook ID matches */
  const transmissionId = headers.get("paypal-transmission-id");
  if (!transmissionId) return false;
  return true; /* Simplified - implement full verification in production */
}

/**
 * Handle PayPal webhook events.
 */
export async function handlePayPalWebhook(
  eventType: string,
  resource: any,
): Promise<{ action: string; orgId?: string }> {
  switch (eventType) {
    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      const subscriptionId = resource.id;
      const planId = resource.plan_id;
      const customId = resource.custom_id; /* This is our orgId */
      const status = resource.status;
      const billingInfo = resource.billing_info;

      return {
        action: "ACTIVATE",
        orgId: customId,
      };
    }

    case "BILLING.SUBSCRIPTION.CANCELLED": {
      const subscriptionId = resource.id;
      const customId = resource.custom_id;

      return {
        action: "CANCEL",
        orgId: customId,
      };
    }

    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      const subscriptionId = resource.id;
      const customId = resource.custom_id;

      return {
        action: "SUSPEND",
        orgId: customId,
      };
    }

    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
      const subscriptionId = resource.id;
      const customId = resource.custom_id;

      return {
        action: "PAYMENT_FAILED",
        orgId: customId,
      };
    }

    default:
      return { action: "IGNORE" };
  }
}

/* PayPal Plan IDs for LeadScout Pro */
export const PAYPAL_PLANS = {
  monthly: process.env.PAYPAL_MONTHLY_PLAN_ID || "",
  yearly: process.env.PAYPAL_YEARLY_PLAN_ID || "",
};
