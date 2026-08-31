import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_45%),linear-gradient(to_bottom,_#eff6ff,_#dbeafe_35%,_#f8fbff)] px-6 py-24 text-center">
      <div className="w-full max-w-xl rounded-3xl border border-blue-200 bg-white/80 p-8 shadow-[0_25px_80px_rgba(30,64,175,0.12)] backdrop-blur-sm sm:p-12">
        <div className="mb-6 inline-flex rounded-full border border-blue-200 bg-blue-100 px-4 py-2 text-sm font-bold tracking-[0.24em] text-blue-700">
          404
        </div>
        <h1 className="text-4xl font-black tracking-tight text-blue-950 sm:text-5xl">الصفحة غير موجودة</h1>
        <p className="mt-6 text-base leading-7 text-blue-900/70 sm:text-lg">
          هذه الصفحة غير موجودة أو غير متاحة.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/en"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-800 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
          >
            العودة إلى الرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
