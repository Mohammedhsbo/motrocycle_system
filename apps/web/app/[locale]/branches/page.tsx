import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listBranches, displayName, type Branch } from "@/lib/catalog-api";
import { Building2, MapPin, Phone, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

function mapLink(branch: Branch) {
  if (!branch.address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`;
}

export default async function BranchesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("branches");
  const branches = await listBranches().catch(() => []);

  return (
    <div className="min-h-[60vh] bg-zinc-50" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="bg-red-700 text-white">
        <div className="section-shell py-16 sm:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-100">{t("eyebrow")}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">{t("title")}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-red-50">{t("description")}</p>
        </div>
      </section>

      <section className="section-shell py-12 sm:py-16">
        {branches.length === 0 ? (
          <div className="border border-dashed border-zinc-300 bg-white p-10 text-center">
            <Building2 className="mx-auto text-red-700" size={30} />
            <h2 className="mt-4 text-xl font-black text-zinc-950">{t("emptyTitle")}</h2>
            <p className="mt-2 text-zinc-600">{t("emptyDescription")}</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => {
              const location = mapLink(branch);
              return (
                <article key={branch.id} className="flex min-h-64 flex-col border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">{t("branchLabel")}</p>
                      <h2 className="mt-2 text-2xl font-black text-zinc-950">{displayName(branch, locale)}</h2>
                      <p className="mt-1 text-sm text-zinc-500">{locale === "ar" ? branch.nameEn : branch.nameAr}</p>
                    </div>
                    <span className="grid h-11 w-11 shrink-0 place-items-center bg-red-50 text-red-700"><Building2 size={21} /></span>
                  </div>
                  <div className="mt-7 grid gap-4 text-sm text-zinc-600">
                    {branch.address && <div className="flex items-start gap-3"><MapPin className="mt-0.5 shrink-0 text-red-700" size={17} /><span>{branch.address}</span></div>}
                    {branch.phone && <a href={`tel:${branch.phone}`} className="flex items-center gap-3 hover:text-red-700"><Phone className="shrink-0 text-red-700" size={17} /><span dir="ltr">{branch.phone}</span></a>}
                  </div>
                  {location && <Link href={location} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-bold text-red-700 hover:text-red-900">{t("openMap")} <ArrowUpRight size={16} /></Link>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}