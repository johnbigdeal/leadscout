import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

const preference = new Preference(client);

interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

export async function createSubscriptionPreference(
  items: PreferenceItem[],
  payerEmail: string,
  backUrls: { success: string; failure: string; pending: string },
) {
  return preference.create({
    body: {
      items: items as any,
      payer: { email: payerEmail },
      back_urls: backUrls,
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
    },
  });
}
