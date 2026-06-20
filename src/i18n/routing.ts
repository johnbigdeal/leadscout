import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "pt-BR"],
  defaultLocale: "es",
  localePrefix: "as-needed",
});
