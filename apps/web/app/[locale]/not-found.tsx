import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function NotFoundPage() {
  const t = useTranslations("common");

  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-zinc-50 px-6 py-24 sm:py-32 lg:px-8 text-center">
      <div className="max-w-md">
        <p className="text-base font-semibold text-blue-600">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">Page not found</h1>
        <p className="mt-6 text-base leading-7 text-zinc-600">Sorry, we couldn't find the page you're looking for.</p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/"
            className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {t("home")}
          </Link>
          <a href="https://instagram.com/awlad_ghanem" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-zinc-900 hover:text-blue-600 transition">
            Contact Support <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </main>
  );
}
