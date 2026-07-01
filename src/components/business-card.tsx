"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Globe, MapPin, Star, MessageCircle, ExternalLink, Award, Map, Mail, Crosshair, TrendingUp } from "lucide-react";
import { reviewsInsight } from "@/lib/reviews-insight";
import { isLatinoOwned } from "@/lib/business-attributes";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-10.425c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

type SocialProfile = {
  platform: string;
  url: string | null;
  followers: number | null;
};

export type Business = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email?: string | null;
  isWhatsapp: boolean | null;
  website: string | null;
  hasWebsite: boolean | null;
  category: string | null;
  rating: string | null;
  reviewsCount: number | null;
  placeId?: string | null;
  rawJson?: unknown;
  socialProfiles?: SocialProfile[];
  seo?: { pagespeedPerf: number | null; pagespeedSeo: number | null; pagespeedA11y: number | null } | null;
  opportunityScore?: { score: number; reasons: string[] } | null;
  isLead?: boolean;
};

export function BusinessCard({ business, onAddToCrm }: { business: Business; onAddToCrm?: (id: string) => void }) {
  const t = useTranslations("search");
  const ratingNum = business.rating ? Number(business.rating) : null;
  const googleMapsUrl = business.placeId ? `https://www.google.com/maps/place/?q=place_id:${business.placeId}` : null;
  const reviewUrl = business.placeId ? `https://search.google.com/local/writereview?placeid=${business.placeId}` : null;
  const socials = business.socialProfiles ?? [];
  const instagram = socials.find(s => s.platform === "instagram")?.url ?? null;
  const linkedin = socials.find(s => s.platform === "linkedin")?.url ?? null;
  const score = business.opportunityScore?.score ?? 0;

  function getScoreColor(s: number) {
    if (s >= 50) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (s >= 30) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-zinc-600 bg-zinc-50 border-zinc-200";
  }

  return (
    <div className="divide-y divide-zinc-100">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Crosshair className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold text-foreground">{business.name}</h3>
                  {isLatinoOwned(business.rawJson) && (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] font-medium text-amber-700">
                      Negocio latino
                    </Badge>
                  )}
                </div>
                {business.category && (
                  <p className="text-xs text-muted-foreground">{business.category}</p>
                )}
              </div>
            </div>
          </div>
          {score > 0 && (
            <div className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-1.5 ${getScoreColor(score)}`}>
              <span className="text-lg font-bold leading-none">{score}</span>
              <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider">{t("score")}</span>
            </div>
          )}
        </div>

        {ratingNum !== null && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-zinc-800">{ratingNum.toFixed(1)}</span>
            </div>
            {business.reviewsCount != null && (
              <span className="text-sm text-muted-foreground">({business.reviewsCount} {t("reviews")})</span>
            )}
          </div>
        )}

        {(() => {
          const insight = reviewsInsight(business.rating, business.reviewsCount);
          return insight ? (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                {insight.label}
              </span>
            </div>
          ) : null;
        })()}

        <div className="mt-3 space-y-1.5">
          {business.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-foreground/80">{business.address}</span>
            </div>
          )}
          {business.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a href={`tel:${business.phone}`} className="text-accent hover:text-accent/80 font-medium">
                {business.phone}
              </a>
            </div>
          )}
          {business.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a href={`mailto:${business.email}`} className="text-accent hover:text-accent/80">{business.email}</a>
            </div>
          )}
          {business.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a href={business.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-accent hover:text-accent/80">
                <span className="truncate">{business.website.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}
          {!business.hasWebsite && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="italic text-muted-foreground">{t("noWebsite")}</span>
            </div>
          )}
          {googleMapsUrl && (
            <div className="flex items-center gap-2 text-sm">
              <Map className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-accent hover:text-accent/80">
                <span>{t("viewOnMaps")}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}
          {reviewUrl && (
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <a href={reviewUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-accent hover:text-accent/80">
                <span>Dejar reseña en Google</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}
          {(instagram || linkedin) && (
            <div className="flex items-center gap-3 pt-1">
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-pink-500 hover:text-pink-600">
                  <InstagramIcon className="h-3.5 w-3.5" />
                  <span>Instagram</span>
                </a>
              )}
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800">
                  <LinkedInIcon className="h-3.5 w-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {business.phone && (
            <a href={`tel:${business.phone}`}>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <Phone className="mr-1 h-3.5 w-3.5" />
                {t("callPhone")}
              </Button>
            </a>
          )}
          {business.isWhatsapp && business.phone && (
            <a href={`https://wa.me/${business.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-8 text-xs text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-300">
                <MessageCircle className="mr-1 h-3.5 w-3.5" />
                {t("openWhatsapp")}
              </Button>
            </a>
          )}
          {business.website && (
            <a href={business.website} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <Globe className="mr-1 h-3.5 w-3.5" />
                {t("openWebsite")}
              </Button>
            </a>
          )}
          {googleMapsUrl && (
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <Map className="mr-1 h-3.5 w-3.5" />
                {t("googleMaps")}
              </Button>
            </a>
          )}
          {!business.isLead && onAddToCrm && (
            <Button size="sm" className="h-8 text-xs shadow-sm" onClick={() => onAddToCrm(business.id)}>
              <Crosshair className="mr-1 h-3.5 w-3.5" />
              {t("addToCrm")}
            </Button>
          )}
          {business.isLead && (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
              {t("addedToCrm")}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {business.seo && (business.seo.pagespeedSeo != null || business.seo.pagespeedPerf != null) && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("pagespeed")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {business.seo.pagespeedPerf != null && (
                <div className={`rounded-lg border p-2 text-center ${
                  business.seo.pagespeedPerf >= 80 ? "border-emerald-200 bg-emerald-50" :
                  business.seo.pagespeedPerf >= 50 ? "border-amber-200 bg-amber-50" :
                  "border-red-200 bg-red-50"
                }`}>
                  <p className={`text-lg font-bold ${
                    business.seo.pagespeedPerf >= 80 ? "text-emerald-700" :
                    business.seo.pagespeedPerf >= 50 ? "text-amber-700" :
                    "text-red-700"
                  }`}>{business.seo.pagespeedPerf}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("performance")}</p>
                </div>
              )}
              {business.seo.pagespeedSeo != null && (
                <div className={`rounded-lg border p-2 text-center ${
                  business.seo.pagespeedSeo >= 80 ? "border-emerald-200 bg-emerald-50" :
                  business.seo.pagespeedSeo >= 50 ? "border-amber-200 bg-amber-50" :
                  "border-red-200 bg-red-50"
                }`}>
                  <p className={`text-lg font-bold ${
                    business.seo.pagespeedSeo >= 80 ? "text-emerald-700" :
                    business.seo.pagespeedSeo >= 50 ? "text-amber-700" :
                    "text-red-700"
                  }`}>{business.seo.pagespeedSeo}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("seoScore")}</p>
                </div>
              )}
              {business.seo.pagespeedA11y != null && (
                <div className={`rounded-lg border p-2 text-center ${
                  business.seo.pagespeedA11y >= 80 ? "border-emerald-200 bg-emerald-50" :
                  business.seo.pagespeedA11y >= 50 ? "border-amber-200 bg-amber-50" :
                  "border-red-200 bg-red-50"
                }`}>
                  <p className={`text-lg font-bold ${
                    business.seo.pagespeedA11y >= 80 ? "text-emerald-700" :
                    business.seo.pagespeedA11y >= 50 ? "text-amber-700" :
                    "text-red-700"
                  }`}>{business.seo.pagespeedA11y}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("accessibility")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {business.opportunityScore?.reasons && business.opportunityScore.reasons.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Award className="h-3 w-3" />
              {t("opportunityReasons")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {business.opportunityScore.reasons.map((r, i) => (
                <Badge key={i} variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
