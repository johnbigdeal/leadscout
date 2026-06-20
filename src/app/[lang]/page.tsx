import Link from "next/link";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("common");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900">
          {t("appName")}
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Encuentra y gestiona prospectos locales en LATAM
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/auth/sign-in"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {t("signIn")}
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            {t("signUp")}
          </Link>
        </div>
      </div>
    </div>
  );
}
