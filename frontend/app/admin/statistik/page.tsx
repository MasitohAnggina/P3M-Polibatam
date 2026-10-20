"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";

import {
  BarChart3,
  Beaker,
  BookOpen,
  ChevronDown,
  Copyright,
  Download,
  FileDown,
  FlaskConical,
  HandHeart,
  Info,
  MoreVertical,
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

type YearOption = "Semua Tahun" | "2023" | "2024" | "2025" | "2026";

type DataOption =
  | "Semua Data"
  | "Penelitian"
  | "Pengabdian"
  | "Publikasi"
  | "HKI";

type YearValue = { year: string; value: number };

/* =========================================================
   DATA FRONTEND SEMENTARA
========================================================= */

const researchData: YearValue[] = [
  { year: "2023", value: 18 },
  { year: "2024", value: 25 },
  { year: "2025", value: 32 },
  { year: "2026", value: 40 },
];

const serviceData: YearValue[] = [
  { year: "2023", value: 10 },
  { year: "2024", value: 14 },
  { year: "2025", value: 18 },
  { year: "2026", value: 26 },
];

const publicationData: YearValue[] = [
  { year: "2023", value: 20 },
  { year: "2024", value: 28 },
  { year: "2025", value: 37 },
  { year: "2026", value: 45 },
];

const hkiData: YearValue[] = [
  { year: "2023", value: 5 },
  { year: "2024", value: 8 },
  { year: "2025", value: 12 },
  { year: "2026", value: 15 },
];

const focusData = [
  { label: "Produk Rekayasa", value: 15 },
  { label: "Teknologi Informasi", value: 10 },
  { label: "Sosial Humaniora", value: 7 },
  { label: "Energi", value: 4 },
  { label: "Lainnya", value: 2 },
];

const focusColors = ["#1B5E20", "#2E7D32", "#4BA276", "#66BB6A", "#A5D6A7"];

/* =========================================================
   FILTER OPTIONS
========================================================= */

const years: YearOption[] = ["Semua Tahun", "2026", "2025", "2024", "2023"];

const dataOptions: DataOption[] = [
  "Semua Data",
  "Penelitian",
  "Pengabdian",
  "Publikasi",
  "HKI",
];

/* =========================================================
   MAIN PAGE
========================================================= */

export default function StatistikPage() {
  const [year, setYear] = useState<YearOption>("Semua Tahun");
  const [dataType, setDataType] = useState<DataOption>("Semua Data");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  /* =========================================================
     MENU (tutup saat klik di luar / tekan Escape)
  ========================================================= */

  useEffect(() => {
    if (!openMenu) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-chart-menu]")) setOpenMenu(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  const toggleMenu = (menu: string) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  /* =========================================================
     FILTER (sementara untuk tampilan frontend)
  ========================================================= */

  const filterByYear = (data: YearValue[]) =>
    year === "Semua Tahun" ? data : data.filter((item) => item.year === year);

  const sumOf = (data: YearValue[]) =>
    data.reduce((sum, item) => sum + item.value, 0);

  const filtered = useMemo(
    () => ({
      research: filterByYear(researchData),
      service: filterByYear(serviceData),
      publication: filterByYear(publicationData),
      hki: filterByYear(hkiData),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year]
  );

  const totals = {
    research: sumOf(filtered.research),
    service: sumOf(filtered.service),
    publication: sumOf(filtered.publication),
    hki: sumOf(filtered.hki),
  };

  // Tampilkan bagian sesuai filter "Jenis Data"
  const show = (type: Exclude<DataOption, "Semua Data">) =>
    dataType === "Semua Data" || dataType === type;

  // Kartu di baris bawah (Pengabdian, Publikasi, HKI) yang sedang tampil
  const lowerCharts = (["Pengabdian", "Publikasi", "HKI"] as const).filter(
    show
  );

  const isLastOdd = (type: (typeof lowerCharts)[number]) =>
    lowerCharts.length % 2 === 1 &&
    lowerCharts[lowerCharts.length - 1] === type;

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <div
      className={`${poppins.className} min-h-[calc(100vh-78px)] overflow-x-hidden bg-[linear-gradient(135deg,#F3F7F3_0%,#EDF5EE_50%,#E2F0E4_100%)] px-3 py-4 text-[#26352D] sm:px-5 sm:py-6 md:px-8 md:py-8`}
    >
      <div className="mx-auto w-full max-w-[1320px]">
        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_10px_rgba(38,53,45,0.06)]">
                <BarChart3 size={18} strokeWidth={1.8} className="text-[#2E7D32]" />
              </div>

              <h1 className="text-[26px] font-medium tracking-[-0.02em] sm:text-[32px]">
                Statistik P2M
              </h1>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#7A867F] sm:ml-[52px]">
              Ringkasan data penelitian, pengabdian, publikasi, dan HKI.
            </p>
          </div>

          {/* FILTER */}

          <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:w-[460px]">
            <FilterSelect
              value={year}
              onChange={(value) => setYear(value as YearOption)}
              options={years}
            />
            <FilterSelect
              value={dataType}
              onChange={(value) => setDataType(value as DataOption)}
              options={dataOptions}
            />
          </div>
        </div>

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {show("Penelitian") && (
            <SummaryCard
              title="Penelitian"
              value={totals.research}
              description="Total penelitian"
              icon={<FlaskConical size={18} strokeWidth={1.8} />}
              tone="bg-[#2E7D32] text-white"
            />
          )}

          {show("Pengabdian") && (
            <SummaryCard
              title="Pengabdian"
              value={totals.service}
              description="Total pengabdian"
              icon={<HandHeart size={18} strokeWidth={1.8} />}
              tone="bg-[#A5D6A7] text-[#1B5E20]"
            />
          )}

          {show("Publikasi") && (
            <SummaryCard
              title="Publikasi"
              value={totals.publication}
              description="Total publikasi"
              icon={<BookOpen size={18} strokeWidth={1.8} />}
              tone="bg-[#DDEBDD] text-[#1F5A23]"
            />
          )}

          {show("HKI") && (
            <SummaryCard
              title="HKI"
              value={totals.hki}
              description="Total HKI"
              icon={<Copyright size={18} strokeWidth={1.8} />}
              tone="bg-[#E9F3EA] text-[#2E5B32]"
            />
          )}
        </div>

        {/* =====================================================
            PENELITIAN + BIDANG FOKUS
        ===================================================== */}

        {show("Penelitian") && (
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
            <ChartCard
              title="Penelitian per Tahun"
              icon={<BarChart3 size={16} strokeWidth={1.8} />}
              menuOpen={openMenu === "research"}
              onMenuToggle={() => toggleMenu("research")}
            >
              <BarChart data={filtered.research} barColor="#2E7D32" />
            </ChartCard>

            <ChartCard
              title="Bidang Fokus Penelitian"
              icon={<Beaker size={16} strokeWidth={1.8} />}
              menuOpen={openMenu === "focus"}
              onMenuToggle={() => toggleMenu("focus")}
            >
              <FocusDonut />
            </ChartCard>
          </div>
        )}

        {/* =====================================================
            PENGABDIAN + PUBLIKASI + HKI
        ===================================================== */}

        {lowerCharts.length > 0 && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {show("Pengabdian") && (
              <ChartCard
                title="Pengabdian per Tahun"
                icon={<HandHeart size={16} strokeWidth={1.8} />}
                menuOpen={openMenu === "service"}
                onMenuToggle={() => toggleMenu("service")}
                className={isLastOdd("Pengabdian") ? "xl:col-span-2" : ""}
              >
                <BarChart data={filtered.service} barColor="#388E3C" />
              </ChartCard>
            )}

            {show("Publikasi") && (
              <ChartCard
                title="Publikasi per Tahun"
                icon={<BookOpen size={16} strokeWidth={1.8} />}
                menuOpen={openMenu === "publication"}
                onMenuToggle={() => toggleMenu("publication")}
                className={isLastOdd("Publikasi") ? "xl:col-span-2" : ""}
              >
                <BarChart data={filtered.publication} barColor="#4BA276" />
              </ChartCard>
            )}

            {show("HKI") && (
              <ChartCard
                title="HKI per Tahun"
                icon={<Copyright size={16} strokeWidth={1.8} />}
                menuOpen={openMenu === "hki"}
                onMenuToggle={() => toggleMenu("hki")}
                className={isLastOdd("HKI") ? "xl:col-span-2" : ""}
              >
                <BarChart data={filtered.hki} barColor="#66BB6A" />
              </ChartCard>
            )}
          </div>
        )}

        {/* =====================================================
            INFO
        ===================================================== */}

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-3.5 shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur">
          <Info
            size={16}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0 text-[#2E7D32]"
          />

          <p className="text-[12px] leading-5 text-[#6E7A73]">
            Data yang ditampilkan saat ini merupakan data contoh untuk kebutuhan
            tampilan frontend. Nantinya data statistik dapat dihitung otomatis
            dari data Penelitian, Pengabdian, Publikasi, dan HKI.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FILTER SELECT
========================================================= */

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-full border border-transparent bg-white pl-4 pr-10 text-[12px] font-medium text-[#59655E] shadow-[0_1px_4px_rgba(38,53,45,0.05)] outline-none transition focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        strokeWidth={1.8}
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
  description,
  icon,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-[24px] bg-white/70 p-4 shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#7A867F]">{title}</p>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-[30px] font-medium leading-none tracking-[-0.02em] text-[#26352D]">
        {value}
      </p>

      <p className="mt-2 text-[12px] text-[#8A948E]">{description}</p>
    </div>
  );
}

/* =========================================================
   CHART MENU
========================================================= */

function ChartMenu({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const itemClass =
    "flex h-9 w-full items-center gap-2.5 px-3.5 text-left text-[12px] text-[#4F5C54] transition hover:bg-[#F2F8F2]";

  return (
    <div className="relative" data-chart-menu>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Aksi grafik"
        title="Aksi grafik"
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#6F7B74] transition hover:bg-[#EEF3EF] hover:text-[#26352D]"
      >
        <MoreVertical size={16} strokeWidth={1.8} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-[80] w-[170px] overflow-hidden rounded-2xl border border-[#E4EBE5] bg-white py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          <button type="button" onClick={onToggle} className={itemClass}>
            <Download size={14} strokeWidth={1.8} className="text-[#2E7D32]" />
            Download PNG
          </button>

          <button type="button" onClick={onToggle} className={itemClass}>
            <FileDown size={14} strokeWidth={1.8} className="text-[#2E7D32]" />
            Lihat PDF
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CHART CARD
========================================================= */

function ChartCard({
  title,
  icon,
  children,
  menuOpen,
  onMenuToggle,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  menuOpen: boolean;
  onMenuToggle: () => void;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] bg-white/70 p-4 shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur sm:p-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2E7D32] shadow-[0_2px_10px_rgba(38,53,45,0.06)]">
            {icon}
          </div>

          <h3 className="truncate text-[14px] font-medium text-[#33423A]">
            {title}
          </h3>
        </div>

        <ChartMenu open={menuOpen} onToggle={onMenuToggle} />
      </div>

      <div className="mt-5 rounded-[22px] bg-white p-4">{children}</div>
    </div>
  );
}

/* =========================================================
   BAR CHART
========================================================= */

function BarChart({
  data,
  barColor,
}: {
  data: YearValue[];
  barColor: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="flex h-[225px] items-end gap-4 border-b border-dashed border-[#DCE4DE] px-2 sm:gap-6 sm:px-4">
      {data.map((item) => {
        const height = Math.max((item.value / maxValue) * 160, 8);

        return (
          <div
            key={item.year}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
          >
            <span className="mb-2 text-[12px] font-medium text-[#46544B]">
              {item.value}
            </span>

            <div
              className="w-full max-w-[56px] rounded-t-xl transition-opacity hover:opacity-80"
              style={{ height: `${height}px`, backgroundColor: barColor }}
            />

            <span className="mt-3 text-[11px] text-[#7A867F]">{item.year}</span>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   DONUT BIDANG FOKUS
========================================================= */

function FocusDonut() {
  const total = focusData.reduce((sum, item) => sum + item.value, 0);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="flex min-h-[225px] flex-col items-center justify-center gap-6 sm:flex-row">
      {/* DONUT */}

      <div className="relative h-[165px] w-[165px] shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#EDF2EE"
            strokeWidth="20"
          />

          {focusData.map((item, index) => {
            const dashLength = (item.value / total) * circumference;
            const dashOffset = -currentOffset;

            currentOffset += dashLength;

            return (
              <circle
                key={item.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={focusColors[index]}
                strokeWidth="20"
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-medium leading-none text-[#26352D]">
            {total}
          </span>

          <span className="mt-1 text-[11px] text-[#7A867F]">Penelitian</span>
        </div>
      </div>

      {/* LEGEND */}

      <div className="w-full min-w-0 flex-1 space-y-3">
        {focusData.map((item, index) => {
          const percentage = Math.round((item.value / total) * 100);

          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: focusColors[index] }}
                />

                <span className="truncate text-[12px] text-[#52665A]">
                  {item.label}
                </span>
              </div>

              <span className="shrink-0 text-[12px] font-medium text-[#64748B]">
                {item.value} ({percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}