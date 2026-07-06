import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

const PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Perfecto para empezar",
    price: 0,
    currency: "USD",
    interval: null,
    popular: false,
    features: [
      "1 búsqueda por día",
      "1 pipeline (tablero Kanban)",
      "3 servicios",
      "3 categorías",
      "3 etiquetas por lead",
      "Publicar en subdominios del sistema",
      "Websites ilimitados",
      "WhatsApp CTA",
    ],
    limitations: [
      "Sin dominios personalizados",
      "Sin conexión Cloudflare propia",
    ],
    stripe_price_id: null,
    paypal_plan_id: null,
    is_active: true,
  },
  {
    id: "pro_monthly",
    name: "Pro Mensual",
    description: "Para profesionales del marketing",
    price: 2000,
    currency: "USD",
    interval: "month",
    popular: false,
    features: [
      "Búsquedas ilimitadas",
      "Pipelines ilimitados",
      "Servicios ilimitados",
      "Categorías ilimitadas",
      "Etiquetas ilimitadas",
      "Publicar en cualquier dominio",
      "Conectar Cloudflare propio",
      "Dominios personalizados",
      "Websites ilimitados",
      "WhatsApp CTA",
      "Soporte prioritario",
    ],
    limitations: [],
    stripe_price_id: "",
    paypal_plan_id: "",
    is_active: true,
  },
  {
    id: "pro_yearly",
    name: "Pro Anual",
    description: "Ahorra $140 al año",
    price: 10000,
    currency: "USD",
    interval: "year",
    popular: true,
    features: [
      "Todo lo del Pro Mensual",
      "2 meses gratis (ahorro $140)",
      "Soporte prioritario",
    ],
    limitations: [],
    stripe_price_id: "",
    paypal_plan_id: "",
    is_active: true,
  },
];

async function seedPlans() {
  console.log("Sembrando plan_configs...");

  for (const plan of PLANS) {
    await sql`
      INSERT INTO plan_configs ${sql(plan)}
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        interval = EXCLUDED.interval,
        popular = EXCLUDED.popular,
        features = EXCLUDED.features,
        limitations = EXCLUDED.limitations,
        stripe_price_id = EXCLUDED.stripe_price_id,
        paypal_plan_id = EXCLUDED.paypal_plan_id,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `;
    console.log(`  ✅ ${plan.id}`);
  }

  console.log("✅ Planes sembrados exitosamente.");
  await sql.end();
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error(err);
  process.exit(1);
});
