import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function NotFoundPage() {
  const t = useTranslations("common");

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_45%),linear-gradient(to_bottom,_#eff6ff,_#dbeafe_35%,_#f8fbff)] px-6 py-24 text-center sm:py-32 lg:px-8">
      <div className="w-full max-w-xl rounded-3xl border border-blue-200 bg-white/80 p-8 shadow-[0_25px_80px_rgba(30,64,175,0.12)] backdrop-blur-sm sm:p-12">
        <div className="mb-6 inline-flex rounded-full border border-blue-200 bg-blue-100 px-4 py-2 text-sm font-bold tracking-[0.24em] text-blue-700">
          404
        </div>

        <h1 className="text-4xl font-black tracking-tight text-blue-950 sm:text-5xl">
          الصفحة غير موجودة
        </h1>

        <p className="mt-6 text-base leading-7 text-blue-900/70 sm:text-lg">
          عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-800 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
          >
            {t("home")}
          </Link>

          <a
            href="https://instagram.com/awlad_ghanem"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center text-sm font-semibold text-blue-800 transition-colors duration-200 hover:text-blue-600"
          >
            تواصل مع الدعم <span aria-hidden="true" className="ml-1">&rarr;</span>
          </a>
        </div>
      </div>
    </main>
  );
}
