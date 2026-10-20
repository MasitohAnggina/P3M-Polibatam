"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Poppins } from "next/font/google";

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Eye,
  FlaskConical,
  HandHeart,
  Info,
  LayoutDashboard,
  PieChart,
  Table,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

/* =========================================================
   FONT
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

/* =========================================================
   TYPE
========================================================= */

type CategoryName =
  | "Penelitian"
  | "Pengabdian"
  | "Publikasi"
  | "HKI"
  | "Informasi";

type LatestData = {
  id: number;
  title: string;
  category: CategoryName;
  date: string;
};

type TrendPoint = {
  year: string;
  penelitian: number;
  pengabdian: number;
  publikasi: number;
  hki: number;
};

/* =========================================================
   API
   Backend: GET /api/admin/dashboard (Laravel, Sanctum)
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const TOKEN_KEYS = ["p3m_token", "token", "auth_token", "access_token"];

function getToken(): string | null {
  if (typeof window === "undefined") return null;

  for (const store of [localStorage, sessionStorage]) {
    for (const key of TOKEN_KEYS) {
      const raw = store.getItem(key);
      if (!raw) continue;

      const value = raw.replace(/^"+|"+$/g, "").trim();
      if (value && value !== "undefined" && value !== "null") return value;
    }
  }

  return null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readError(res: Response): Promise<string> {
  if (res.status === 401) {
    return getToken()
      ? "Sesi login habis atau token tidak valid. Silakan login ulang."
      : "Token login tidak ditemukan di browser. Silakan login ulang.";
  }

  try {
    const json = await res.json();
    if (json?.message) return json.message;
  } catch {
    /* response bukan JSON */
  }

  return `Terjadi kesalahan (kode ${res.status}).`;
}

/* Bentuk respons dari backend */
type DashboardData = {
  kategori: { name: CategoryName; value: number }[];
  tren: TrendPoint[];
  pertumbuhan_total: string | null; /* contoh "+11%", null = belum bisa dihitung */
  terbaru: LatestData[]; /* date: "YYYY-MM-DD" */
  diperbarui: string | null; /* "YYYY-MM-DD" */
};

/* =========================================================
   TAMPILAN
========================================================= */

/* Warna per kategori, dipakai di grafik, diagram, dan label */
const CATEGORY_COLORS: Record<CategoryName, string> = {
  Penelitian: "#1B5E20",
  Pengabdian: "#388E3C",
  Publikasi: "#66BB6A",
  HKI: "#A5D6A7",
  Informasi: "#D3EBD5",
};

/* Halaman admin tiap kategori (tombol "Lihat" di Data Terbaru) */
const CATEGORY_LINKS: Record<CategoryName, string> = {
  Penelitian: "/admin/penelitian",
  Pengabdian: "/admin/pengabdian",
  Publikasi: "/admin/publikasi",
  HKI: "/admin/hki",
  Informasi: "/admin/informasi",
};

const trendSeries = [
  { key: "penelitian", label: "Penelitian", color: CATEGORY_COLORS.Penelitian },
  { key: "pengabdian", label: "Pengabdian", color: CATEGORY_COLORS.Pengabdian },
  { key: "publikasi", label: "Publikasi", color: CATEGORY_COLORS.Publikasi },
  { key: "hki", label: "HKI", color: CATEGORY_COLORS.HKI },
] as const;

const TREND_RANGES = [
  { value: "5", label: "5 Tahun Terakhir" },
  { value: "3", label: "3 Tahun Terakhir" },
];

/* pertumbuhan terhadap tahun sebelumnya, contoh "+9%" */
function growth(current: number, previous: number) {
  if (previous <= 0) return null;
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

/* =========================================================
   TANGGAL
   Dibuat manual (tanpa Intl) supaya hasil di server dan di
   browser selalu sama dan tidak memicu hydration error.
========================================================= */

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/* "2026-09-20" -> "20 September 2026" */
function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return iso;

  return `${String(day).padStart(2, "0")} ${MONTH_NAMES[month - 1]} ${year}`;
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/* "2026-09-20" -> "20 Sep 2026" */
function formatShortDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return iso;

  return `${String(day).padStart(2, "0")} ${SHORT_MONTHS[month - 1]} ${year}`;
}

/* Tanggal hari ini ("Rabu, 14 Oktober 2026"). Diisi setelah halaman
   tampil di browser, supaya tidak berbeda dengan hasil dari server. */
function useToday() {
  const [today, setToday] = useState("");

  useEffect(() => {
    const now = new Date();
    setToday(
      `${DAY_NAMES[now.getDay()]}, ${String(now.getDate()).padStart(2, "0")} ${
        MONTH_NAMES[now.getMonth()]
      } ${now.getFullYear()}`
    );
  }, []);

  return today;
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function DashboardPage() {
  const today = useToday();
  const [range, setRange] = useState("5");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_URL}/admin/dashboard`, {
          headers: authHeaders(),
          cache: "no-store",
        });

        if (!res.ok) throw new Error(await readError(res));

        const json = await res.json();

        if (!cancelled) setData((json?.data ?? json) as DashboardData);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat data dashboard."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reload]);

  const categories = data?.kategori ?? [];
  const trendData = data?.tren ?? [];
  const visibleTrend = trendData.slice(-Number(range));
  const latestTrend = trendData[trendData.length - 1];
  const previousTrend = trendData[trendData.length - 2];

  const countOf = (name: CategoryName) =>
    categories.find((c) => c.name === name)?.value ?? 0;

  const totalData = categories.reduce((sum, c) => sum + c.value, 0);

  const growthOf = (key: "penelitian" | "pengabdian" | "publikasi") =>
    latestTrend && previousTrend
      ? growth(latestTrend[key], previousTrend[key])
      : null;

  return (
    <main
      className={`${poppins.className} min-h-[calc(100vh-78px)] overflow-x-hidden bg-[linear-gradient(135deg,#F3F7F3_0%,#EDF5EE_50%,#E2F0E4_100%)] px-3 py-4 text-[#26352D] sm:px-5 sm:py-6 md:px-8 md:py-8`}
    >
      <div className="mx-auto w-full max-w-[1320px]">
        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_10px_rgba(38,53,45,0.06)]">
                <LayoutDashboard
                  size={18}
                  strokeWidth={1.8}
                  className="text-[#2E7D32]"
                />
              </div>

              <h1 className="text-[26px] font-medium tracking-[-0.02em] sm:text-[32px]">
                Dashboard
              </h1>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#7A867F] sm:ml-[52px]">
              Ringkasan data pengelolaan P2M Politeknik Negeri Batam.
            </p>
          </div>

          <p className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full bg-white px-4 text-[12px] font-medium text-[#59655E] shadow-[0_1px_4px_rgba(38,53,45,0.05)] sm:self-auto">
            <CalendarDays
              size={14}
              strokeWidth={1.8}
              aria-hidden
              className="text-[#2E7D32]"
            />
            <span>{today || "\u00A0"}</span>
          </p>
        </div>

        {!data ? (
          <StatusPanel
            loading={loading}
            error={error}
            onRetry={() => setReload((n) => n + 1)}
          />
        ) : (
          <>
        {/* =====================================================
            SUMMARY CARDS
        ===================================================== */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Penelitian"
            value={countOf("Penelitian")}
            growth={growthOf("penelitian")}
            description="dibandingkan tahun sebelumnya"
            icon={<FlaskConical size={18} strokeWidth={1.8} />}
            tone="bg-[#2E7D32] text-white"
          />

          <SummaryCard
            title="Pengabdian"
            value={countOf("Pengabdian")}
            growth={growthOf("pengabdian")}
            description="dibandingkan tahun sebelumnya"
            icon={<HandHeart size={18} strokeWidth={1.8} />}
            tone="bg-[#A5D6A7] text-[#1B5E20]"
          />

          <SummaryCard
            title="Publikasi"
            value={countOf("Publikasi")}
            growth={growthOf("publikasi")}
            description="dibandingkan tahun sebelumnya"
            icon={<BookOpen size={18} strokeWidth={1.8} />}
            tone="bg-[#DDEBDD] text-[#1F5A23]"
          />

          <SummaryCard
            title="Total Data"
            value={totalData}
            growth={data?.pertumbuhan_total ?? null}
            description="seluruh data dalam sistem"
            icon={<BarChart3 size={18} strokeWidth={1.8} />}
            tone="bg-[#E9F3EA] text-[#2E5B32]"
          />
        </div>

        {/* =====================================================
            TREND + DISTRIBUTION
        ===================================================== */}

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
          <Panel
            icon={<TrendingUp size={16} strokeWidth={1.8} />}
            title={`Tren Data ${visibleTrend.length} Tahun Terakhir`}
            description="Perkembangan jumlah penelitian, pengabdian, publikasi, dan HKI."
            action={
              <div className="w-full sm:w-[190px]">
                <FilterSelect
                  ariaLabel="Rentang tahun grafik"
                  value={range}
                  options={TREND_RANGES}
                  onChange={setRange}
                />
              </div>
            }
          >
            <TrendChart data={visibleTrend} />
          </Panel>

          <Panel
            icon={<PieChart size={16} strokeWidth={1.8} />}
            title="Distribusi Data"
            description="Persentase data berdasarkan kategori."
          >
            <DistributionChart categories={data.kategori} total={totalData} />
          </Panel>
        </div>

        {/* =====================================================
            LATEST DATA
        ===================================================== */}

        <div className="mt-4">
          <LatestDataCard items={data.terbaru} />
        </div>

        {/* =====================================================
            SYSTEM INFORMATION
        ===================================================== */}

        <div className="mt-4">
          <SystemInformation updatedAt={data.diperbarui} />
        </div>
          </>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   STATUS (memuat / gagal)
========================================================= */

function StatusPanel({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[28px] bg-white/70 px-6 py-16 text-center shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur">
      <p
        role={loading ? "status" : "alert"}
        className={`text-[13px] font-medium ${
          loading ? "text-[#7A867F]" : "text-[#B91C1C]"
        }`}
      >
        {loading ? "Memuat data dashboard..." : error}
      </p>

      {!loading && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-9 items-center rounded-full border border-[#DCE4DE] bg-white px-4 text-[12px] font-medium text-[#2E7D32] transition hover:bg-[#F1F8F2]"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}

/* =========================================================
   PANEL
   flush = isi tanpa padding (untuk tabel yang melebar penuh)
========================================================= */

function Panel({
  icon,
  title,
  description,
  action,
  flush = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-[28px] bg-white/70 p-3 shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur sm:p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2E7D32] shadow-[0_2px_10px_rgba(38,53,45,0.06)]">
            {icon}
          </div>

          <div className="min-w-0">
            <h2 className="text-[14px] font-medium text-[#33423A]">{title}</h2>

            {description && (
              <p className="mt-0.5 text-[12px] leading-5 text-[#8A948E]">
                {description}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div
        className={`mt-4 min-w-0 flex-1 rounded-[22px] bg-white ${
          flush ? "overflow-hidden" : "p-4 sm:p-5"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   FILTER SELECT
========================================================= */

function FilterSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="relative w-full">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-full border border-transparent bg-white pl-4 pr-10 text-[12px] font-medium text-[#59655E] shadow-[0_1px_4px_rgba(38,53,45,0.05)] outline-none transition focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        strokeWidth={1.8}
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8A948E]"
      />
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  growth: growthLabel,
  description,
  icon,
  tone,
}: {
  title: string;
  value: number;
  growth: string | null;
  description: string;
  icon: ReactNode;
  tone: string;
}) {
  const isNegative = growthLabel?.startsWith("-") ?? false;
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;

  return (
    <div className="flex h-full flex-col rounded-[24px] bg-white/70 p-4 shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#7A867F]">{title}</p>

        <div
          aria-hidden
          className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-[30px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[#26352D]">
        {value}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {growthLabel && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${
              isNegative
                ? "bg-[#FFF1F1] text-[#D34B4B]"
                : "bg-[#E3F1E4] text-[#2E7D32]"
            }`}
          >
            <TrendIcon size={12} strokeWidth={2} aria-hidden />
            {growthLabel}
          </span>
        )}

        <span className="text-[12px] text-[#8A948E]">{description}</span>
      </div>
    </div>
  );
}

/* =========================================================
   TREND CHART
   Garis bantu dan batang memakai persen terhadap area grafik,
   jadi selalu sejajar di semua ukuran layar.
========================================================= */

const MIN_AXIS = 3;

function TrendChart({ data }: { data: TrendPoint[] }) {
  const highest = Math.max(
    0,
    ...data.flatMap((d) => trendSeries.map((s) => d[s.key]))
  );

  /* langkah sumbu menyesuaikan besar data (maksimal sekitar 4 garis) */
  const step =
    [1, 2, 5, 10, 20, 50, 100, 200, 500].find((n) => highest / n <= 4) ?? 1000;
  /* sumbu minimal sampai 5, supaya data kecil (misal 1) tidak memenuhi
     tinggi grafik */
  const max = Math.max(MIN_AXIS, step, Math.ceil(highest / step) * step);
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);

  const summary = `Grafik batang tren data. ${data
    .map(
      (d) =>
        `${d.year}: ${trendSeries.map((s) => `${s.label} ${d[s.key]}`).join(", ")}`
    )
    .join("; ")}.`;

  return (
    <div>
      {/* LEGEND */}

      <ul className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        {trendSeries.map((s) => (
          <li
            key={s.key}
            className="inline-flex items-center gap-2 text-[12px] text-[#59655E]"
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto pb-1">
        <div
          role="img"
          aria-label={summary}
          className="relative h-[270px]"
          style={{ minWidth: `${56 + data.length * 120}px` }}
        >
          {/* AREA GRAFIK */}

          <div className="absolute bottom-9 left-10 right-2 top-14">
            {/* garis bantu + angka sumbu Y */}
            {ticks.map((tick) => (
              <div
                key={tick}
                aria-hidden
                className="absolute inset-x-0"
                style={{ bottom: `${(tick / max) * 100}%` }}
              >
                <div
                  className={
                    tick === 0
                      ? "border-t border-[#C9D7CB]"
                      : "border-t border-dashed border-[#DCE4DE]"
                  }
                />
                <span className="absolute right-full top-0 -translate-y-1/2 pr-2.5 text-[11px] tabular-nums text-[#8A948E]">
                  {tick}
                </span>
              </div>
            ))}

            {/* batang */}
            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
            >
              {data.map((item, yearIndex) => (
                <div
                  key={item.year}
                  className={`flex h-full min-w-0 items-end justify-center gap-1 px-2 sm:gap-1.5 ${
                    /* garis pembatas antar tahun */
                    yearIndex > 0 ? "border-l border-[#D5DFD7]" : ""
                  }`}
                >
                  {trendSeries.map((s) => {
                    const value = item[s.key];

                    return (
                      <div
                        key={s.key}
                        className="group relative flex h-full min-w-0 max-w-7 flex-1 items-end hover:z-20"
                      >
                        <div
                          className="relative w-full rounded-t-[5px] transition-opacity duration-300 group-hover:opacity-80"
                          style={{
                            /* batang kecil tetap terlihat (minimal 4px) */
                            height:
                              value > 0
                                ? `max(${(value / max) * 100}%, 4px)`
                                : "0px",
                            backgroundColor: s.color,
                          }}
                        >
                          {/* data kosong: tanpa angka dan tanpa label */}
                          {value > 0 && (
                            <>
                              {/* angka selalu tampil di atas batang */}
                              <span
                                aria-hidden
                                className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[10.5px] font-medium tabular-nums text-[#52665A]"
                              >
                                {value}
                              </span>

                              {/* nama kategori saat disorot */}
                              <span className="pointer-events-none absolute bottom-full left-1/2 mb-6 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#26352D] px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100">
                                {s.label}: {value}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* label tahun (kolomnya sejajar dengan batang) */}
          <div
            aria-hidden
            className="absolute bottom-1 left-10 right-2 grid"
            style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
          >
            {data.map((item) => (
              <span
                key={item.year}
                className="text-center text-[11px] font-medium text-[#7A867F]"
              >
                {item.year}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DISTRIBUTION CHART (donat SVG + daftar nilai)
========================================================= */

function DistributionChart({
  categories,
  total,
}: {
  categories: { name: CategoryName; value: number }[];
  total: number;
}) {
  const R = 88;
  const r = 58;
  const c = 100;

  let angle = -Math.PI / 2;
  const slices = categories.map((category) => {
    const frac = total > 0 ? category.value / total : 0;
    const start = angle;
    /* satu irisan penuh tidak bisa digambar sebagai busur, jadi dibatasi sedikit di bawah 100% */
    const end = angle + Math.min(frac, 0.9999) * 2 * Math.PI;
    angle = end;

    /* dibulatkan: Math.cos/sin bisa beda di digit terakhir antara server dan browser */
    const p = (radius: number, a: number) =>
      `${(c + radius * Math.cos(a)).toFixed(3)} ${(c + radius * Math.sin(a)).toFixed(3)}`;
    const large = frac > 0.5 ? 1 : 0;
    const d = `M ${p(R, start)} A ${R} ${R} 0 ${large} 1 ${p(R, end)} L ${p(r, end)} A ${r} ${r} 0 ${large} 0 ${p(r, start)} Z`;

    return { ...category, frac, d, color: CATEGORY_COLORS[category.name] };
  });

  const summary = `Diagram donat distribusi data. ${slices
    .map((s) => `${s.name} ${s.value} (${(s.frac * 100).toFixed(1)}%)`)
    .join(", ")}.`;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8 xl:flex-col xl:gap-6 2xl:flex-row 2xl:gap-8">
      <svg
        viewBox="0 0 200 200"
        className="h-[190px] w-[190px] shrink-0"
        role="img"
        aria-label={summary}
      >
        {slices.map((s) => (
          <path
            key={s.name}
            d={s.d}
            fill={s.color}
            stroke="#fff"
            strokeWidth={2}
            className="transition-opacity duration-300 hover:opacity-75"
          >
            <title>{`${s.name}: ${s.value} (${(s.frac * 100).toFixed(1)}%)`}</title>
          </path>
        ))}

        {/* total di tengah donat */}
        <text
          x={c}
          y={c + 2}
          textAnchor="middle"
          fontSize="24"
          fontWeight="500"
          fill="#26352D"
        >
          {total}
        </text>
        <text
          x={c}
          y={c + 20}
          textAnchor="middle"
          fontSize="10.5"
          fill="#7A867F"
        >
          Total Data
        </text>
      </svg>

      <ul className="w-full">
        {slices.map((s) => (
          <li
            key={s.name}
            className="flex items-center justify-between gap-4 border-b border-dashed border-[#DCE4DE] py-2.5 last:border-b-0"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-[#26352D]/10"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate text-[12px] text-[#52665A]">
                {s.name}
              </span>
            </span>

            <span className="shrink-0 text-[12px] font-medium tabular-nums text-[#34423A]">
              {s.value}
              <span className="ml-1.5 text-[11px] font-normal text-[#8A948E]">
                ({(s.frac * 100).toFixed(1)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================================================
   LATEST DATA
========================================================= */

const thClass =
  "whitespace-nowrap border-b border-dashed border-[#DCE4DE] px-3 py-4 text-[12px] font-medium text-[#7A867F]";

function LatestDataCard({ items }: { items: LatestData[] }) {
  return (
    <Panel
      icon={<Table size={16} strokeWidth={1.8} />}
      title="Data Terbaru"
      description="Data terakhir yang ditambahkan atau diperbarui."
      flush
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-y-1 px-2 text-left">
          <thead>
            <tr>
              <th scope="col" className={`${thClass} w-[60px] pl-5`}>
                No
              </th>
              <th scope="col" className={thClass}>
                Judul
              </th>
              <th scope="col" className={`${thClass} w-[150px]`}>
                Kategori
              </th>
              <th scope="col" className={`${thClass} w-[110px]`}>
                Tanggal
              </th>
              <th scope="col" className={`${thClass} w-[70px] pr-5 text-right`}>
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-[13px] text-[#8A948E]"
                >
                  Belum ada data.
                </td>
              </tr>
            )}

            {items.map((item, index) => {
              const cell = "bg-white group-hover:bg-[#F2F8F2]";

              return (
                <tr key={`${item.category}-${item.id}`} className="group">
                  <td
                    className={`rounded-l-2xl py-3.5 pl-5 pr-3 align-middle text-[12px] tabular-nums text-[#8A948E] transition-colors ${cell}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </td>

                  <td className={`px-3 py-3.5 align-middle transition-colors ${cell}`}>
                    <p className="line-clamp-2 max-w-[340px] text-[13px] font-medium leading-[20px] text-[#26352C]">
                      {item.title}
                    </p>
                  </td>

                  <td className={`px-3 py-3.5 align-middle transition-colors ${cell}`}>
                    <CategoryChip name={item.category} />
                  </td>

                  <td
                    className={`whitespace-nowrap px-3 py-3.5 align-middle text-[12px] text-[#5D6861] transition-colors ${cell}`}
                  >
                    {formatShortDate(item.date)}
                  </td>

                  <td
                    className={`rounded-r-2xl py-3.5 pl-3 pr-5 align-middle transition-colors ${cell}`}
                  >
                    <div className="flex items-center justify-end">
                      <Link
                        href={CATEGORY_LINKS[item.category] ?? "/admin/dashboard"}
                        aria-label={`Lihat data ${item.category}`}
                        title="Lihat"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[#6F7B74] transition hover:bg-[#EEF3EF] hover:text-[#26352D]"
                      >
                        <Eye size={16} strokeWidth={1.8} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* Label kategori: titik warna (sama dengan warna di grafik) + nama */
function CategoryChip({ name }: { name: CategoryName }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#E3F1E4] px-3 py-1.5 text-[11px] font-medium leading-[15px] text-[#2E7D32]">
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-inset ring-[#26352D]/10"
        style={{ backgroundColor: CATEGORY_COLORS[name] }}
      />
      {name}
    </span>
  );
}

/* =========================================================
   SYSTEM INFORMATION
========================================================= */

function SystemInformation({ updatedAt }: { updatedAt: string | null }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white/70 px-4 py-4 shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur sm:flex-row sm:items-center sm:px-5">
      <div
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2E7D32] shadow-[0_2px_10px_rgba(38,53,45,0.06)]"
      >
        <Info size={18} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[#33423A]">Informasi Sistem</p>

        <p className="mt-1 text-[12px] leading-5 text-[#6E7A73]">
          Dashboard menampilkan ringkasan data yang dikelola pada sistem P2M
          Polibatam. Gunakan menu di sidebar untuk menambah, mengubah, melihat,
          atau menghapus data.
        </p>
      </div>

      <div className="shrink-0">
        {updatedAt && <UpdatedAt date={updatedAt} />}
      </div>
    </div>
  );
}

/* Tanggal pembaruan data: "Diperbarui: 20 September 2026" */
function UpdatedAt({ date }: { date: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#7A867F]">
      <CalendarDays
        size={13}
        strokeWidth={1.8}
        aria-hidden
        className="shrink-0 text-[#2E7D32]"
      />
      Diperbarui:
      <time dateTime={date} className="font-medium text-[#2E7D32]">
        {formatDate(date)}
      </time>
    </span>
  );
}