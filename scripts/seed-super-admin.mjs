import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const sql = postgres(process.env.DATABASE_URL);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function seedSuperAdmin() {
  console.log("Buscando usuario johnbigdeal@gmail.com...");

  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listando usuarios:", error);
    process.exit(1);
  }

  const user = users.find((u) => u.email === "johnbigdeal@gmail.com");
  if (!user) {
    console.error("Usuario johnbigdeal@gmail.com no encontrado en Supabase Auth.");
    process.exit(1);
  }

  console.log("Usuario encontrado:", user.id);

  // Insert or update profile
  await sql`
    INSERT INTO profiles (id, email, role, created_at)
    VALUES (${user.id}, ${user.email}, 'super_admin', NOW())
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin'
  `;

  // Ensure membership is approved
  await sql`
    UPDATE memberships
    SET approved = true, role = 'superadmin'
    WHERE user_id = ${user.id}
  `;

  console.log("✅ johnbigdeal@gmail.com configurado como super_admin exitosamente.");
  await sql.end();
  process.exit(0);
}

seedSuperAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
