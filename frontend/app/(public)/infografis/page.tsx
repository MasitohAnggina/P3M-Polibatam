"use client";

import Link from "next/link";
import { Poppins } from "next/font/google";
import {
  createContext,
  useContext,
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ElementType,
  type ReactNode,
} from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Image as ImageIcon,
  LineChart,
  PieChart,
  RotateCcw,
  Table,
} from "lucide-react";

/* =========================================================
   FONT (Poppins)
   Poppins bukan variable font, jadi weight harus ditulis.
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* =========================================================
   PALET WARNA (sama dengan Beranda, HKI, dan Publikasi)
   teks utama   : #1F2A1A
   hijau utama  : #31551F
   hijau gelap  : #213B14
   hijau medium : #3F6B28
   hijau aksen  : #8DC26F
   hijau muda   : #EEF4EA
   teks muted   : #667360
   garis        : #D9E2D3
   latar lembut : #F6F9F3

   LATAR SEKSI: putih. Warna lembut (#F6F9F3) hanya untuk hover
   dan elemen kecil, bukan untuk latar seksi.

   SKALA FONT (sama dengan halaman lain)
   hero judul   : 36 / 44 / 52
   judul seksi  : 26 / 30 / 34
   judul kartu  : 13.5-14 (header panel)
   isi          : 12.5-14 (leading 1.7-1.75)
   label/meta   : 10.5-12.5
========================================================= */

/* Warna seri grafik (keluarga hijau) */
const SERIES = ["#213B14", "#4C8A2E", "#8DC26F", "#C9E4B4"];
const PIE_COLORS = [
  "#173010",
  "#31551F",
  "#4C8A2E",
  "#6FA84F",
  "#8DC26F",
  "#B5D99C",
  "#D5EBC4",
];

/* =========================================================
   API
   GET /api/infografis (publik). Tanggal pembaruan data diambil
   dari backend (updated_at) dan dibagikan lewat context. Dipakai
   untuk nama file unduhan (PNG dan CSV).
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const UpdatedAtContext = createContext("");

/* =========================================================
   BENTUK DATA DARI BACKEND
   Data per (tahun, program studi). Kategori dosen (DTPS/DTPR)
   belum tersedia di backend, jadi filternya tidak ditampilkan.
========================================================= */

const NUM_KEYS = [
  "dosen",
  "partPenelitian",
  "partPengabdian",
  "partPublikasi",
  "penelitian",
  "pengabdian",
  "publikasi",
  "hki",
  "pubInternal",
  "pubNasional",
  "pubInternasional",
  "jurnal",
  "prosiding",
  "buku",
  "lainnya",
] as const;

type NumKey = (typeof NUM_KEYS)[number];
type Totals = Record<NumKey, number>;
type Row = {
  year: number;
  prodi: string;
  jurusan: string;
  category: string;
  programPenelitian: Record<string, number>;
  jenisPengabdian: Record<string, number>;
} & Totals;

type ProdiInfo = { name: string; short: string; jurusan: string };

type DosenItem = {
  name: string;
  nip: string;
  prodi: string;
  jurusan: string;
  penelitian: number;
  pengabdian: number;
  publikasi: number;
};

type InfografisData = {
  updated_at: string;
  years: number[];
  jurusan: string[];
  prodi: ProdiInfo[];
  rows: Row[];
  dosen: DosenItem[];
};

const EMPTY_DATA: InfografisData = {
  updated_at: "",
  years: [],
  jurusan: [],
  prodi: [],
  rows: [],
  dosen: [],
};

/* Jumlahkan peta {label: jumlah} dari banyak baris, urut terbanyak */
function sumMap(rows: Row[], key: "programPenelitian" | "jenisPengabdian") {
  const total: Record<string, number> = {};

  rows.forEach((row) => {
    Object.entries(row[key] ?? {}).forEach(([label, value]) => {
      total[label] = (total[label] ?? 0) + value;
    });
  });

  return Object.entries(total)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}


/* =========================================================
   FILTER
========================================================= */

type Filters = {
  year: string;
  jurusan: string;
  prodi: string;
  category: string;
};
type Dim = keyof Filters;

const ALL: Filters = {
  year: "Semua Tahun",
  jurusan: "Semua Jurusan",
  prodi: "Semua Program Studi",
  category: "Semua Kategori",
};

function filterRows(rows: Row[], f: Filters, ignore: Dim[] = []) {
  return rows.filter(
    (r) =>
      (ignore.includes("year") ||
        f.year === ALL.year ||
        String(r.year) === f.year) &&
      (ignore.includes("jurusan") ||
        f.jurusan === ALL.jurusan ||
        r.jurusan === f.jurusan) &&
      (ignore.includes("prodi") ||
        f.prodi === ALL.prodi ||
        r.prodi === f.prodi) &&
      (ignore.includes("category") ||
        f.category === ALL.category ||
        r.category === f.category)
  );
}

function aggregate(rows: Row[]): Totals {
  const totals = Object.fromEntries(
    NUM_KEYS.map((key) => [key, 0])
  ) as Totals;

  rows.forEach((row) => {
    NUM_KEYS.forEach((key) => {
      totals[key] += row[key];
    });
  });

  return totals;
}

/* persentase dengan 2 desimal, contoh 87.13 */
function pct2(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 10000) / 100 : 0;
}

/* =========================================================
   HOOKS
========================================================= */

function useInView<T extends HTMLElement>(
  threshold = 0.15,
  rootMargin = "0px 0px -50px 0px"
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView };
}

/* lebar elemen, dipakai agar grafik SVG selalu pas dengan kartunya */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    setWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

/* =========================================================
   ANIMASI MUNCUL (disamakan persis dengan Beranda)
========================================================= */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: inView ? `${delay}ms` : "0ms",
        transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
      }}
      className={`transition-[opacity,transform] duration-700 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* Garis progres scroll di bagian paling atas halaman */
function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const progress = max > 0 ? el.scrollTop / max : 0;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[3px] w-full"
    >
      <div
        ref={barRef}
        className="h-full origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F]"
      />
    </div>
  );
}

/* =========================================================
   KOMPONEN KECIL
========================================================= */

/* Judul bagian (rata kiri, tanpa garis dekoratif) */
function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <Reveal className="mb-9 md:mb-12">
      {eyebrow && (
        <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#3F6B28]">
          {eyebrow}
        </p>
      )}

      <h2 className="max-w-[720px] text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-[#1F2A1A] sm:text-[30px] md:text-[34px]">
        {title}
      </h2>

      {description && (
        <p className="mt-3 max-w-[620px] text-[14px] leading-[1.75] text-[#667360]">
          {description}
        </p>
      )}
    </Reveal>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#31551F]"
    >
      {children}
    </label>
  );
}

function SelectField({
  id,
  value,
  options,
  onChange,
  ariaLabel,
}: {
  id?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-[#D9E2D3] bg-white px-4 pr-10 text-[13.5px] text-[#1F2A1A] outline-none transition-all duration-300 hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={16}
        strokeWidth={1.8}
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#667360]"
      />
    </div>
  );
}

/* Kartu dengan header hijau di tengah (mengikuti gaya kartu statistik PCR).
   Bagian bawah kartu hanya tampil kalau ada catatan. */
function PanelShell({
  title,
  children,
  note,
  filters,
}: {
  title: string;
  children: ReactNode;
  note?: string;
  /** filter milik panel ini (tampil di bawah judul) */
  filters?: ReactNode;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white shadow-[0_8px_30px_rgba(31,42,26,0.05)]">
      <h3 className="bg-[#31551F] px-5 py-3.5 text-center text-[13.5px] font-semibold leading-snug text-white sm:text-[14px]">
        {title}
      </h3>

      <div className="flex flex-1 flex-col p-4 md:p-5">
        {filters && <div className="mb-4">{filters}</div>}

        <div className="flex-1">{children}</div>

        {note && (
          <div className="mt-4 border-t border-[#E7EDE3] pt-3">
            <p className="text-[11px] leading-5 text-[#667360]">{note}</p>
          </div>
        )}
      </div>
    </article>
  );
}

type LegendItem = { label: string; color: string; line?: boolean };

/* Legenda grafik: kotak kecil untuk batang, garis putus-putus untuk garis tambahan */
function Legend({ items }: { items: LegendItem[] }) {
  return (
    <div className="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-2 text-[11.5px] font-medium text-[#4A5646]"
        >
          {item.line ? (
            <span
              aria-hidden
              className="h-0 w-4 border-t-[2.5px] border-dashed"
              style={{ borderColor: item.color }}
            />
          ) : (
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* =========================================================
   GRAFIK (SVG, tanpa library tambahan)
========================================================= */

type Series = { name: string; color: string; data: number[] };

function niceMax(value: number) {
  if (value <= 5) return 5;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * exp;
}

/* Memecah label panjang jadi maksimal 2 baris; sisanya dipotong dengan "…" */
function wrapLabel(label: string, maxChars: number) {
  const max = Math.max(maxChars, 5);
  if (label.length <= max) return [label];

  const lines: string[] = [];
  let current = "";

  label.split(" ").forEach((word) => {
    const next = `${current} ${word}`.trim();
    if (next.length <= max) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);

  if (lines.length > 2) {
    const second = lines[1];
    return [
      lines[0],
      second.length >= max ? `${second.slice(0, max - 1)}…` : `${second}…`,
    ];
  }

  return lines.map((line) =>
    line.length > max ? `${line.slice(0, max - 1)}…` : line
  );
}

/* Path batang dengan sudut atas membulat */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`;
}

/* Grafik batang / garis. `overlay` = garis tambahan (mis. Total Publikasi). */
function XYChart({
  labels,
  series,
  kind,
  overlay,
  percent = false,
  vary = false,
  yTitle,
  ariaLabel,
}: {
  labels: string[];
  series: Series[];
  kind: "bar" | "line";
  overlay?: Series;
  percent?: boolean;
  vary?: boolean;
  yTitle?: string;
  ariaLabel?: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();

  const H = 310;
  const m = { t: 20, r: 18, b: 56, l: yTitle ? 62 : 44 };
  const n = Math.max(labels.length, 1);

  const perGroup =
    kind === "bar" ? Math.max(series.length * 22 + 30, 72) : 84;
  const needed = m.l + m.r + n * perGroup;
  const W = Math.max(width, needed, 300);

  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const groupW = plotW / n;

  const allValues = [
    ...series.flatMap((s) => s.data),
    ...(overlay ? overlay.data : []),
  ];
  const max = percent ? 100 : niceMax(Math.max(5, ...allValues));
  const ticks = Array.from({ length: 6 }, (_, i) => (max / 5) * i);

  const yPos = (value: number) => m.t + plotH * (1 - value / max);
  const cx = (i: number) => m.l + groupW * (i + 0.5);

  /* angka di sumbu: bulat; angka di grafik: persen 1 desimal */
  const fmtTick = (value: number) => String(Math.round(value));
  const fmt = (value: number) =>
    percent
      ? value.toFixed(1)
      : Number.isInteger(value)
        ? String(value)
        : value.toFixed(1);

  const showBarValues = n * series.length <= 24;
  const showLineValues = n <= 8 && series.length <= 3;

  const renderLine = (s: Series, showValues: boolean, dashed = false) => (
    <g key={s.name}>
      <path
        d={s.data
          .map((v, i) => `${i === 0 ? "M" : "L"}${cx(i)} ${yPos(v)}`)
          .join(" ")}
        fill="none"
        stroke={s.color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 5" : undefined}
      />

      {s.data.map((v, i) => (
        <g key={i}>
          <circle
            cx={cx(i)}
            cy={yPos(v)}
            r={4}
            fill="#fff"
            stroke={s.color}
            strokeWidth={2.5}
          >
            <title>{`${labels[i]} - ${s.name}: ${fmt(v)}${percent ? "%" : ""}`}</title>
          </circle>

          {showValues && (
            <text
              x={cx(i)}
              y={yPos(v) - 10}
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="600"
              fill={dashed ? "#9A7410" : "#31551F"}
            >
              {fmt(v)}
            </text>
          )}
        </g>
      ))}
    </g>
  );

  return (
    <div ref={ref} className="overflow-x-auto">
      <svg
        width={W}
        height={H}
        role="img"
        aria-label={ariaLabel ?? "Grafik"}
        className="block"
      >
        {/* garis bantu putus-putus + angka sumbu Y */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={m.l}
              x2={W - m.r}
              y1={yPos(tick)}
              y2={yPos(tick)}
              stroke={tick === 0 ? "#BFCDB6" : "#E3EADF"}
              strokeDasharray={tick === 0 ? undefined : "3 4"}
            />
            <text
              x={m.l - 10}
              y={yPos(tick) + 3.5}
              textAnchor="end"
              fontSize="10.5"
              fill="#7B8776"
            >
              {fmtTick(tick)}
            </text>
          </g>
        ))}

        {yTitle && (
          <text
            transform={`translate(13 ${m.t + plotH / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="600"
            fill="#667360"
          >
            {yTitle}
          </text>
        )}

        {/* batang */}
        {kind === "bar" &&
          labels.map((_, i) => {
            const bw = Math.min(36, (groupW * 0.7) / series.length);
            const start = m.l + groupW * i + (groupW - bw * series.length) / 2;

            return series.map((s, si) => {
              const value = s.data[i];
              const x = start + bw * si;
              const h = plotH * (value / max);
              const fill = vary ? PIE_COLORS[i % PIE_COLORS.length] : s.color;

              return (
                <g key={`${i}-${s.name}`}>
                  {value > 0 && (
                    <path
                      d={barPath(
                        x + 1,
                        yPos(value),
                        Math.max(bw - 2, 2),
                        Math.max(h, 2)
                      )}
                      fill={fill}
                      className="transition-opacity duration-300 hover:opacity-75"
                    >
                      <title>{`${labels[i]} - ${s.name}: ${fmt(value)}${percent ? "%" : ""}`}</title>
                    </path>
                  )}

                  {showBarValues && value > 0 && bw >= 14 && (
                    <text
                      x={x + bw / 2}
                      y={yPos(value) - 6}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight="600"
                      fill="#31551F"
                    >
                      {fmt(value)}
                    </text>
                  )}
                </g>
              );
            });
          })}

        {/* garis */}
        {kind === "line" && series.map((s) => renderLine(s, showLineValues))}
        {overlay && renderLine(overlay, showLineValues || n <= 8, true)}

        {/* label sumbu X */}
        {labels.map((label, i) => {
          const lines = wrapLabel(label, Math.floor((groupW - 8) / 6.6));

          return (
            <text
              key={`${label}-${i}`}
              textAnchor="middle"
              fontSize="11"
              fontWeight="500"
              fill="#667360"
            >
              <title>{label}</title>
              {lines.map((line, k) => (
                <tspan key={k} x={cx(i)} y={H - m.b + 22} dy={k * 14}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* Diagram donat + daftar nilai */
function PieView({
  items,
  ariaLabel,
}: {
  items: { label: string; value: number }[];
  ariaLabel?: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const R = 88;
  const r = 56;
  const c = 100;

  let angle = -Math.PI / 2;
  const slices = items.map((item, i) => {
    const frac = total > 0 ? item.value / total : 0;
    const start = angle;
    const end = angle + frac * 2 * Math.PI;
    angle = end;

    /* dibulatkan: Math.cos/sin bisa beda di digit terakhir antara server dan browser */
    const p = (radius: number, a: number) =>
      `${(c + radius * Math.cos(a)).toFixed(3)} ${(c + radius * Math.sin(a)).toFixed(3)}`;
    const large = frac > 0.5 ? 1 : 0;
    const d = `M ${p(R, start)} A ${R} ${R} 0 ${large} 1 ${p(R, end)} L ${p(r, end)} A ${r} ${r} 0 ${large} 0 ${p(r, start)} Z`;

    return { ...item, frac, d, color: PIE_COLORS[i % PIE_COLORS.length] };
  });

  return (
    <div className="flex flex-col items-center gap-6 py-2 sm:flex-row sm:gap-8">
      <svg
        viewBox="0 0 200 200"
        className="h-[190px] w-[190px] shrink-0"
        role="img"
        aria-label={ariaLabel ?? "Diagram lingkaran"}
      >
        {total === 0 && (
          <circle
            cx={c}
            cy={c}
            r={(R + r) / 2}
            fill="none"
            stroke="#EEF4EA"
            strokeWidth={R - r}
          />
        )}

        {slices
          .filter((s) => s.frac > 0)
          .map((s) =>
            s.frac >= 0.9999 ? (
              <circle
                key={s.label}
                cx={c}
                cy={c}
                r={(R + r) / 2}
                fill="none"
                stroke={s.color}
                strokeWidth={R - r}
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            ) : (
              <path
                key={s.label}
                d={s.d}
                fill={s.color}
                stroke="#fff"
                strokeWidth={2}
                className="transition-opacity duration-300 hover:opacity-75"
              >
                <title>{`${s.label}: ${s.value} (${(s.frac * 100).toFixed(2)}%)`}</title>
              </path>
            )
          )}

        {/* total di tengah donat */}
        <text
          x={c}
          y={c + 2}
          textAnchor="middle"
          fontSize="24"
          fontWeight="700"
          fill="#1F2A1A"
        >
          {total}
        </text>
        <text
          x={c}
          y={c + 20}
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="500"
          fill="#667360"
        >
          Total
        </text>
      </svg>

      <div className="w-full">
        {slices.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between gap-4 border-b border-[#E7EDE3] py-2.5 last:border-b-0"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: s.color }}
              />
              <span
                className="truncate text-[12px] font-medium text-[#2F3B2A]"
                title={s.label}
              >
                {s.label}
              </span>
            </span>

            <span className="shrink-0 text-[12px] font-semibold text-[#1F2A1A]">
              {s.value}
              <span className="ml-1.5 text-[11px] font-medium text-[#667360]">
                ({(s.frac * 100).toFixed(2)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   TABEL DATA (cari, urutkan, halaman)
========================================================= */

type Col<T> = {
  key: string;
  header: string;
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
  bold?: boolean;
};

function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const nums = Array.from(
    new Set([1, total, current - 1, current, current + 1])
  )
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);

  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

const th =
  "whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#31551F]";
const td = "whitespace-nowrap px-4 py-3 text-[12.5px] text-[#2F3B2A]";

function DataTable<T>({
  rows,
  columns,
  minWidth = 560,
  controls = true,
  defaultSort,
  footer,
}: {
  rows: T[];
  columns: Col<T>[];
  minWidth?: number;
  controls?: boolean;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  footer?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    defaultSort ?? null
  );

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();

    const out = q
      ? rows.filter((row) =>
          columns.some((col) =>
            String(col.value(row)).toLowerCase().includes(q)
          )
        )
      : rows.slice();

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        out.sort((a, b) => {
          const va = col.value(a);
          const vb = col.value(b);
          const cmp =
            typeof va === "number" && typeof vb === "number"
              ? va - vb
              : String(va).localeCompare(String(vb), "id");
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }

    return out;
  }, [rows, columns, query, sort]);

  const total = processed.length;
  const pages = controls ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const safePage = Math.min(page, pages);
  const start = controls ? (safePage - 1) * pageSize : 0;
  const visible = controls
    ? processed.slice(start, start + pageSize)
    : processed;

  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );

  return (
    <div>
      {controls && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[12px] text-[#667360]">
            Tampilkan
            <span className="w-[88px]">
              <SelectField
                ariaLabel="Jumlah data per halaman"
                value={String(pageSize)}
                options={[10, 25, 50].map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
                onChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              />
            </span>
          </label>

          <label className="flex items-center gap-2 text-[12px] text-[#667360]">
            Cari:
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="h-10 w-[180px] rounded-xl border border-[#D9E2D3] bg-white px-3 text-[13.5px] text-[#1F2A1A] outline-none transition-all duration-300 hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA] sm:w-[220px]"
            />
          </label>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#D9E2D3]">
        <table className="w-full" style={{ minWidth }}>
          <thead className="bg-[#EEF4EA]">
            <tr>
              <th className={`${th} w-14 text-left`}>No</th>

              {columns.map((col) => {
                const active = sort?.key === col.key;
                const SortIcon = !active
                  ? ChevronsUpDown
                  : sort?.dir === "asc"
                    ? ChevronUp
                    : ChevronDown;

                return (
                  <th
                    key={col.key}
                    aria-sort={
                      active
                        ? sort?.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`${th} ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1.5 uppercase tracking-[0.06em] transition-colors duration-300 hover:text-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] ${
                        col.align === "right" ? "flex-row-reverse" : ""
                      }`}
                    >
                      {col.header}
                      <SortIcon
                        size={13}
                        strokeWidth={2}
                        aria-hidden
                        className={active ? "text-[#31551F]" : "text-[#A3AE9E]"}
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visible.map((row, index) => (
              <tr
                key={start + index}
                className="border-t border-[#E7EDE3] transition-colors duration-300 hover:bg-[#F6F9F3]"
              >
                <td className={td}>{start + index + 1}</td>

                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${td} ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${col.bold ? "font-semibold" : ""}`}
                  >
                    {col.render ? col.render(row) : col.value(row)}
                  </td>
                ))}
              </tr>
            ))}

            {visible.length === 0 && (
              <tr className="border-t border-[#E7EDE3]">
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-10 text-center text-[12.5px] text-[#667360]"
                >
                  Data tidak ditemukan.
                </td>
              </tr>
            )}
          </tbody>

          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>

      {controls && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#667360]">
          <p>
            Menampilkan {total === 0 ? 0 : start + 1} sampai{" "}
            {Math.min(start + pageSize, total)} dari {total} data
          </p>

          {pages > 1 && (
            <nav aria-label="Halaman tabel" className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Halaman sebelumnya"
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9E2D3] bg-white text-[#31551F] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft size={16} aria-hidden />
              </button>

              {pageList(safePage, pages).map((item, i) =>
                item === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-[#A3AE9E]">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    aria-current={item === safePage ? "page" : undefined}
                    onClick={() => setPage(item)}
                    className={`h-10 w-10 rounded-xl text-[12.5px] font-semibold transition-all duration-300 ${
                      item === safePage
                        ? "border border-[#31551F] bg-[#31551F] text-white"
                        : "border border-[#D9E2D3] bg-white text-[#4A5646] hover:border-[#31551F] hover:text-[#31551F]"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                aria-label="Halaman berikutnya"
                disabled={safePage === pages}
                onClick={() => setPage(safePage + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9E2D3] bg-white text-[#31551F] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PANEL GRAFIK
   Satu data, beberapa tampilan: garis, batang, lingkaran, tabel.
   Tombol: ganti tampilan, kembalikan ke awal, unduh gambar (PNG),
   unduh data (CSV).
========================================================= */

type Mode = "line" | "bar" | "pie" | "table";

const MODE_META: Record<Mode, { label: string; icon: ElementType }> = {
  line: { label: "Grafik garis", icon: LineChart },
  bar: { label: "Grafik batang", icon: BarChart3 },
  pie: { label: "Diagram lingkaran", icon: PieChart },
  table: { label: "Lihat data", icon: Table },
};

const MODE_ORDER: Mode[] = ["line", "bar", "pie", "table"];

function downloadCsv(
  fileName: string,
  header: string[],
  rows: (string | number)[][]
) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  /* link dipasang ke halaman dulu supaya unduhan jalan di Firefox,
     dan URL baru dilepas setelah jeda supaya unduhan tidak terbatalkan */
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================================================
   UNDUH GAMBAR (PNG)
   Grafik di halaman berupa SVG. Untuk PNG, SVG disalin lalu
   digambar ke canvas bersama judul panel, legenda, dan (untuk
   diagram lingkaran) daftar nilainya, supaya gambar yang diunduh
   lengkap seperti yang terlihat di halaman.
========================================================= */

/* Font cadangan untuk teks di dalam SVG. SVG yang dijadikan gambar tidak
   bisa memakai font web, jadi Poppins hanya terpakai kalau terpasang di
   perangkat; kalau tidak, otomatis memakai font sans-serif lain. */
const EXPORT_FONT_STACK = "Poppins, 'Segoe UI', Arial, sans-serif";

/* Bungkus teks jadi beberapa baris sesuai lebar (font sudah diatur di ctx) */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const lines: string[] = [];
  let current = "";

  text.split(" ").forEach((word) => {
    const next = current ? `${current} ${word}` : word;

    if (!current || ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);

  return lines;
}

/* Potong teks dengan "…" kalau melebihi lebar */
function fitCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }

  return `${out.trimEnd()}…`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gambar grafik tidak dapat dibuat."));
    img.src = src;
  });
}

async function downloadChartPng({
  fileName,
  title,
  svg,
  legend = [],
  pieItems,
}: {
  fileName: string;
  title: string;
  svg: SVGSVGElement;
  /** legenda grafik batang/garis */
  legend?: LegendItem[];
  /** diisi untuk diagram lingkaran: daftar nilai di sisi kanan */
  pieItems?: { label: string; value: number }[];
}) {
  const font = poppins.style.fontFamily;

  /* pastikan Poppins sudah termuat sebelum menggambar teks di canvas */
  try {
    await Promise.all([
      document.fonts.load(`600 17px ${font}`),
      document.fonts.load(`500 12px ${font}`),
    ]);
  } catch {
    /* kalau gagal, canvas memakai font cadangan */
  }

  /* ukuran grafik */
  const rect = svg.getBoundingClientRect();
  const svgW = Math.round(Number(svg.getAttribute("width")) || rect.width);
  const svgH = Math.round(Number(svg.getAttribute("height")) || rect.height);

  /* salin SVG, beri ukuran dan font supaya bisa digambar sebagai gambar */
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(svgW));
  clone.setAttribute("height", String(svgH));
  clone.setAttribute("font-family", EXPORT_FONT_STACK);

  const xml = new XMLSerializer().serializeToString(clone);
  const img = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
  );

  /* ---------- ukuran dan tata letak ---------- */

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Canvas tidak tersedia.");

  const SCALE = 2;
  const PAD = 24;
  const GAP = 32;
  const LIST_W = 340;
  const ROW_H = 30;
  const LEGEND_ROW_H = 24;
  const LEGEND_GAP = 20;

  const contentW = pieItems ? svgW + GAP + LIST_W : svgW;
  const width = Math.max(contentW + PAD * 2, 560);
  const innerW = width - PAD * 2;

  /* judul */
  measure.font = `600 17px ${font}`;
  const titleLines = wrapCanvasText(measure, title, width - 48);
  const titleH = titleLines.length * 24 + 28;

  /* legenda (grafik batang dan garis) */
  measure.font = `500 12px ${font}`;
  const itemWidth = (item: LegendItem) =>
    18 + measure.measureText(item.label).width;

  const legendRows: LegendItem[][] = [];
  let currentRow: LegendItem[] = [];
  let currentW = 0;

  legend.forEach((item) => {
    const w = itemWidth(item);

    if (currentRow.length && currentW + LEGEND_GAP + w > innerW) {
      legendRows.push(currentRow);
      currentRow = [];
      currentW = 0;
    }

    currentW += (currentRow.length ? LEGEND_GAP : 0) + w;
    currentRow.push(item);
  });

  if (currentRow.length) legendRows.push(currentRow);

  const legendH = legendRows.length ? legendRows.length * LEGEND_ROW_H + 12 : 0;

  /* area grafik */
  const listH = pieItems ? pieItems.length * ROW_H : 0;
  const areaH = Math.max(svgH, listH);

  const legendTop = titleH + PAD;
  const chartTop = legendTop + legendH;
  const height = chartTop + areaH + PAD;

  /* ---------- gambar ke canvas ---------- */

  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia.");

  ctx.scale(SCALE, SCALE);

  /* latar putih */
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  /* judul (bar hijau) */
  ctx.fillStyle = "#31551F";
  ctx.fillRect(0, 0, width, titleH);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 17px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  titleLines.forEach((line, i) => {
    ctx.fillText(line, width / 2, 26 + i * 24);
  });

  /* legenda */
  ctx.font = `500 12px ${font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  legendRows.forEach((legendRow, rowIndex) => {
    const rowW = legendRow.reduce(
      (sum, item, i) => sum + itemWidth(item) + (i ? LEGEND_GAP : 0),
      0
    );
    const cy = legendTop + rowIndex * LEGEND_ROW_H + LEGEND_ROW_H / 2;
    let x = (width - rowW) / 2;

    legendRow.forEach((item) => {
      if (item.line) {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.lineTo(x + 14, cy);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = item.color;
        ctx.fillRect(x, cy - 5, 10, 10);
      }

      ctx.fillStyle = "#4A5646";
      ctx.fillText(item.label, x + 18, cy + 0.5);

      x += itemWidth(item) + LEGEND_GAP;
    });
  });

  /* grafik */
  const chartX = pieItems ? PAD : (width - svgW) / 2;
  ctx.drawImage(img, chartX, chartTop + (areaH - svgH) / 2, svgW, svgH);

  /* daftar nilai diagram lingkaran */
  if (pieItems) {
    const total = pieItems.reduce((sum, item) => sum + item.value, 0);
    const listX = PAD + svgW + GAP;
    const listW = width - PAD - listX;
    const listTop = chartTop + (areaH - listH) / 2;

    pieItems.forEach((item, i) => {
      const cy = listTop + i * ROW_H + ROW_H / 2;
      const frac = total > 0 ? item.value / total : 0;
      const value = `${item.value} (${(frac * 100).toFixed(2)}%)`;

      /* nilai (rata kanan) */
      ctx.font = `600 12px ${font}`;
      ctx.textAlign = "right";
      ctx.fillStyle = "#1F2A1A";
      ctx.fillText(value, listX + listW, cy);
      const valueW = ctx.measureText(value).width;

      /* kotak warna + nama */
      ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
      ctx.fillRect(listX, cy - 5, 10, 10);

      ctx.font = `500 12px ${font}`;
      ctx.textAlign = "left";
      ctx.fillStyle = "#2F3B2A";
      ctx.fillText(
        fitCanvasText(ctx, item.label, listW - valueW - 34),
        listX + 20,
        cy + 0.5
      );

      /* garis pemisah */
      if (i < pieItems.length - 1) {
        const lineY = listTop + (i + 1) * ROW_H + 0.5;
        ctx.strokeStyle = "#E7EDE3";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(listX, lineY);
        ctx.lineTo(listX + listW, lineY);
        ctx.stroke();
      }
    });
  }

  /* ---------- simpan sebagai file ---------- */

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );

  if (!blob) throw new Error("File PNG gagal dibuat.");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const toolbarButton =
  "flex h-8 w-8 items-center justify-center rounded-lg text-[#31551F] transition-colors duration-300 enabled:hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] disabled:cursor-not-allowed disabled:opacity-40";

function ChartPanel({
  title,
  labels,
  fullLabels,
  labelHeader = "Kategori",
  series,
  overlay,
  modes,
  defaultMode,
  percent = false,
  vary = false,
  yTitle,
  note,
  fileName,
  fileTag = "",
  updatedAt: updatedAtProp,
  filters,
}: {
  title: string;
  labels: string[];
  /** nama lengkap untuk tabel dan diagram lingkaran (label grafik bisa singkatan) */
  fullLabels?: string[];
  labelHeader?: string;
  series: Series[];
  overlay?: Series;
  modes: Mode[];
  defaultMode: Mode;
  percent?: boolean;
  /** satu seri, tiap batang beda warna */
  vary?: boolean;
  yTitle?: string;
  note?: string;
  fileName: string;
  /** tambahan nama file unduhan, mis. "-2026-teknik-informatika" */
  fileTag?: string;
  /** filter milik panel ini */
  filters?: ReactNode;
  /** tanggal pembaruan data panel ini ("YYYY-MM-DD"); dipakai untuk nama file */
  updatedAt?: string;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [pngState, setPngState] = useState<"idle" | "busy" | "error">("idle");
  const chartRef = useRef<HTMLDivElement>(null);
  const updatedFromContext = useContext(UpdatedAtContext);
  const updatedAt = updatedAtProp ?? updatedFromContext;

  const all = overlay ? [...series, overlay] : series;
  const names = fullLabels ?? labels;

  const tableRows = labels.map((_, i) => ({
    label: names[i],
    values: all.map((s) => s.data[i]),
  }));

  const tableCols: Col<(typeof tableRows)[number]>[] = [
    { key: "label", header: labelHeader, value: (r) => r.label, bold: true },
    ...all.map((s, si) => ({
      key: `s${si}`,
      header: s.name,
      align: "right" as const,
      value: (r: (typeof tableRows)[number]) => r.values[si],
      render: (r: (typeof tableRows)[number]) =>
        percent ? `${r.values[si].toFixed(2)}%` : r.values[si],
    })),
  ];

  const legendItems: LegendItem[] = all.map((s) => ({
    label: s.name,
    color: s.color,
    line: overlay ? s === overlay : false,
  }));
  const showLegend = !(vary && series.length === 1 && !overlay);

  const baseName = `${fileName}${fileTag}-${updatedAt}`;

  const pieItems = labels.map((_, i) => ({
    label: names[i],
    value: series[0].data[i],
  }));

  const handlePng = async () => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg || pngState === "busy") return;

    setPngState("busy");

    try {
      await downloadChartPng({
        fileName: baseName,
        title,
        svg,
        legend: mode === "pie" || !showLegend ? [] : legendItems,
        pieItems: mode === "pie" ? pieItems : undefined,
      });
      setPngState("idle");
    } catch {
      setPngState("error");
      window.setTimeout(() => setPngState("idle"), 3500);
    }
  };

  return (
    <PanelShell title={title} note={note} filters={filters}>
      {/* TOOLBAR */}
      <div className="mb-3 flex items-center justify-end gap-1">
        {MODE_ORDER.filter((m) => modes.includes(m)).map((m) => {
          const Icon = MODE_META[m].icon;
          const active = mode === m;

          return (
            <button
              key={m}
              type="button"
              title={MODE_META[m].label}
              aria-label={MODE_META[m].label}
              aria-pressed={active}
              onClick={() => setMode(m)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] ${
                active
                  ? "bg-[#31551F] text-white"
                  : "text-[#31551F] hover:bg-[#EEF4EA]"
              }`}
            >
              <Icon size={16} strokeWidth={1.9} aria-hidden />
            </button>
          );
        })}

        <span aria-hidden className="mx-1 h-4 w-px bg-[#D9E2D3]" />

        <button
          type="button"
          title="Kembalikan tampilan awal"
          aria-label="Kembalikan tampilan awal"
          onClick={() => setMode(defaultMode)}
          className={toolbarButton}
        >
          <RotateCcw size={16} strokeWidth={1.9} aria-hidden />
        </button>

        <button
          type="button"
          title={
            mode === "table"
              ? "Pilih tampilan grafik untuk mengunduh gambar"
              : pngState === "busy"
                ? "Membuat gambar..."
                : "Unduh grafik (PNG)"
          }
          aria-label="Unduh grafik (PNG)"
          disabled={mode === "table" || pngState === "busy"}
          onClick={handlePng}
          className={toolbarButton}
        >
          <ImageIcon size={16} strokeWidth={1.9} aria-hidden />
        </button>

        <button
          type="button"
          title="Unduh data (CSV)"
          aria-label="Unduh data (CSV)"
          onClick={() =>
            downloadCsv(
              baseName,
              [labelHeader, ...all.map((s) => s.name)],
              tableRows.map((r) => [r.label, ...r.values])
            )
          }
          className={toolbarButton}
        >
          <Download size={16} strokeWidth={1.9} aria-hidden />
        </button>
      </div>

      {pngState === "error" && (
        <p
          role="alert"
          className="mb-3 text-right text-[11.5px] font-medium text-[#B91C1C]"
        >
          Gagal membuat gambar. Coba lagi.
        </p>
      )}

      {/* ISI */}
      {mode !== "table" && (
        <div ref={chartRef}>
          {(mode === "bar" || mode === "line") && (
            <>
              {showLegend && <Legend items={legendItems} />}
              <XYChart
                labels={labels}
                series={series}
                overlay={overlay}
                kind={mode}
                percent={percent}
                vary={vary && mode === "bar"}
                yTitle={yTitle}
                ariaLabel={title}
              />
            </>
          )}

          {mode === "pie" && <PieView ariaLabel={title} items={pieItems} />}
        </div>
      )}

      {mode === "table" && (
        <DataTable
          rows={tableRows}
          columns={tableCols}
          controls={false}
          minWidth={420}
        />
      )}
    </PanelShell>
  );
}

/* =========================================================
   KOLOM TABEL
   Dibuat di luar komponen halaman supaya tidak dibuat ulang
   setiap render (tabel jadi tidak menghitung ulang sia-sia).
========================================================= */

const pctCell = (value: number) => `${value.toFixed(2)}%`;

type YearRow = { year: number } & Totals;

const yearCols: Col<YearRow>[] = [
  { key: "year", header: "Tahun", value: (r) => r.year, bold: true },
  {
    key: "pPen",
    header: "Partisipasi Penelitian",
    value: (r) => pct2(r.partPenelitian, r.dosen),
    render: (r) => pctCell(pct2(r.partPenelitian, r.dosen)),
  },
  {
    key: "pPeng",
    header: "Partisipasi Pengabdian",
    value: (r) => pct2(r.partPengabdian, r.dosen),
    render: (r) => pctCell(pct2(r.partPengabdian, r.dosen)),
  },
  {
    key: "pPub",
    header: "Partisipasi Publikasi",
    value: (r) => pct2(r.partPublikasi, r.dosen),
    render: (r) => pctCell(pct2(r.partPublikasi, r.dosen)),
  },
  { key: "tPen", header: "Total Penelitian", value: (r) => r.penelitian },
  { key: "tPeng", header: "Total Pengabdian", value: (r) => r.pengabdian },
  { key: "tPub", header: "Total Publikasi", value: (r) => r.publikasi },
  { key: "lInt", header: "Publikasi Internal", value: (r) => r.pubInternal },
  { key: "lNas", header: "Publikasi Nasional", value: (r) => r.pubNasional },
  {
    key: "lIntl",
    header: "Publikasi Internasional",
    value: (r) => r.pubInternasional,
  },
  { key: "jur", header: "Jurnal", value: (r) => r.jurnal },
  { key: "pros", header: "Prosiding", value: (r) => r.prosiding },
  { key: "buku", header: "Buku", value: (r) => r.buku },
];

type DosenRow = DosenItem;

const dosenCols: Col<DosenRow>[] = [
  { key: "name", header: "Nama", value: (r) => r.name, bold: true },
  { key: "nip", header: "NIP", value: (r) => r.nip },
  { key: "prodi", header: "Prodi", value: (r) => r.prodi },
  {
    key: "all",
    header: "Semua",
    value: (r) => r.penelitian + r.pengabdian + r.publikasi,
  },
  { key: "pen", header: "Penelitian", value: (r) => r.penelitian },
  { key: "peng", header: "Pengabdian", value: (r) => r.pengabdian },
  { key: "pub", header: "Publikasi", value: (r) => r.publikasi },
];

type ProgramRow = { label: string; value: number };

const programCols: Col<ProgramRow>[] = [
  { key: "label", header: "Jenis Program", value: (r) => r.label },
  {
    key: "value",
    header: "Total",
    align: "right",
    value: (r) => r.value,
    bold: true,
  },
];

/* =========================================================
   FILTER PER PANEL
   Setiap grafik/tabel punya filter sendiri. Tiap panel hanya
   menampilkan filter yang masuk akal untuknya (mis. grafik per
   tahun tidak punya filter tahun). Unduhan PNG dan CSV mengikuti
   filter panel itu.
========================================================= */

type FilterDim = "year" | "jurusan" | "prodi";

type PanelFilterState = Pick<Filters, FilterDim>;

const PANEL_ALL: PanelFilterState = {
  year: ALL.year,
  jurusan: ALL.jurusan,
  prodi: ALL.prodi,
};

type PanelContext = {
  /** baris data setelah difilter (dimensi yang tidak dipakai panel diabaikan) */
  rows: Row[];
  filters: PanelFilterState;
  /** prodi yang tampil menurut filter jurusan panel */
  visibleProdi: ProdiInfo[];
  data: InfografisData;
};

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function usePanelFilters(data: InfografisData, dims: FilterDim[]) {
  const [filters, setFilters] = useState<PanelFilterState>({ ...PANEL_ALL });

  const setFilter = (key: FilterDim, value: string) =>
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "jurusan" ? { prodi: PANEL_ALL.prodi } : {}),
    }));

  const reset = () => setFilters({ ...PANEL_ALL });

  const active = dims.some((dim) => filters[dim] !== PANEL_ALL[dim]);

  const visibleProdi = useMemo(
    () =>
      data.prodi.filter(
        (p) =>
          !dims.includes("jurusan") ||
          filters.jurusan === ALL.jurusan ||
          p.jurusan === filters.jurusan
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.prodi, filters.jurusan]
  );

  const rows = useMemo(() => {
    const ignore = (
      ["year", "jurusan", "prodi", "category"] as Dim[]
    ).filter((dim) => dim === "category" || !dims.includes(dim as FilterDim));

    return filterRows(data.rows, { ...ALL, ...filters }, ignore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.rows, filters]);

  /* untuk nama file unduhan, hanya filter yang sedang dipakai */
  const fileTag = dims
    .filter((dim) => filters[dim] !== PANEL_ALL[dim])
    .map((dim) => `-${slug(filters[dim])}`)
    .join("");

  const bar = (
    <PanelFilterBar
      data={data}
      dims={dims}
      filters={filters}
      visibleProdi={visibleProdi}
      onChange={setFilter}
      onReset={reset}
      active={active}
    />
  );

  const ctx: PanelContext = { rows, filters, visibleProdi, data };

  return { ctx, bar, fileTag };
}

function PanelFilterBar({
  data,
  dims,
  filters,
  visibleProdi,
  onChange,
  onReset,
  active,
}: {
  data: InfografisData;
  dims: FilterDim[];
  filters: PanelFilterState;
  visibleProdi: ProdiInfo[];
  onChange: (key: FilterDim, value: string) => void;
  onReset: () => void;
  active: boolean;
}) {
  const uid = useId();

  if (dims.length === 0) return null;

  const columns =
    dims.length === 3
      ? "sm:grid-cols-3"
      : dims.length === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-1";

  return (
    <div className="rounded-xl border border-[#E7EDE3] bg-[#F6F9F3] p-3">
      <div className={`grid grid-cols-1 gap-3 ${columns}`}>
        {dims.includes("year") && (
          <div>
            <FieldLabel htmlFor={`${uid}-tahun`}>Tahun</FieldLabel>
            <SelectField
              id={`${uid}-tahun`}
              value={filters.year}
              options={[
                { value: ALL.year, label: ALL.year },
                ...data.years.map((y) => ({ value: String(y), label: String(y) })),
              ]}
              onChange={(v) => onChange("year", v)}
            />
          </div>
        )}

        {dims.includes("jurusan") && (
          <div>
            <FieldLabel htmlFor={`${uid}-jurusan`}>Jurusan</FieldLabel>
            <SelectField
              id={`${uid}-jurusan`}
              value={filters.jurusan}
              options={[
                { value: ALL.jurusan, label: ALL.jurusan },
                ...data.jurusan.map((j) => ({ value: j, label: j })),
              ]}
              onChange={(v) => onChange("jurusan", v)}
            />
          </div>
        )}

        {dims.includes("prodi") && (
          <div>
            <FieldLabel htmlFor={`${uid}-prodi`}>Program Studi</FieldLabel>
            <SelectField
              id={`${uid}-prodi`}
              value={filters.prodi}
              options={[
                { value: ALL.prodi, label: ALL.prodi },
                ...visibleProdi.map((p) => ({ value: p.name, label: p.name })),
              ]}
              onChange={(v) => onChange("prodi", v)}
            />
          </div>
        )}
      </div>

      {active && (
        <div className="mt-2.5 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28]"
          >
            <RotateCcw size={13} strokeWidth={2} aria-hidden />
            Reset Filter
          </button>
        </div>
      )}
    </div>
  );
}

/* Grafik dengan filter sendiri. `build` menerima data yang sudah
   difilter dan mengembalikan props ChartPanel. */
function FilteredChart({
  data,
  dims,
  build,
}: {
  data: InfografisData;
  dims: FilterDim[];
  build: (
    ctx: PanelContext
  ) => Omit<ComponentProps<typeof ChartPanel>, "filters" | "fileTag">;
}) {
  const { ctx, bar, fileTag } = usePanelFilters(data, dims);

  return <ChartPanel {...build(ctx)} filters={bar} fileTag={fileTag} />;
}

/* Kartu (tabel) dengan filter sendiri */
function FilteredShell({
  data,
  dims,
  title,
  note,
  children,
}: {
  data: InfografisData;
  dims: FilterDim[];
  title: string;
  note?: string;
  children: (ctx: PanelContext) => ReactNode;
}) {
  const { ctx, bar } = usePanelFilters(data, dims);

  return (
    <PanelShell title={title} note={note} filters={bar}>
      {children(ctx)}
    </PanelShell>
  );
}

const mk = (name: string, color: string, data: number[]): Series => ({
  name,
  color,
  data,
});

/* total per tahun, dari baris yang sudah difilter */
function perYear(rows: Row[], years: number[]): YearRow[] {
  return years.map((year) => ({
    year,
    ...aggregate(rows.filter((r) => r.year === year)),
  }));
}

/* =========================================================
   HALAMAN INFOGRAFIS
========================================================= */

export default function InfografisPage() {
  const [data, setData] = useState<InfografisData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/infografis`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`Terjadi kesalahan (kode ${res.status}).`);

        const json = await res.json();

        if (!cancelled) {
          setData({ ...EMPTY_DATA, ...(json.data ?? {}) });
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat data infografis."
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
  }, []);

  return (
    <UpdatedAtContext.Provider value={data.updated_at}>
    <main
      className={`${poppins.className} overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {/* =====================================================
          HERO (sama dengan hero halaman HKI dan Publikasi)
      ===================================================== */}

      <section className="relative overflow-hidden bg-gradient-to-br from-[#3F6B28] via-[#31551F] to-[#213B14] text-white">
        {/* cahaya hijau lembut */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#8DC26F]/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#8DC26F]/15 blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-[1120px] px-5 pb-16 pt-14 text-center md:px-7 md:pb-24 md:pt-20">
          <div className="mx-auto max-w-[720px]">
            {/* jejak halaman */}
            <nav
              aria-label="Jejak halaman"
              className="mb-6 flex items-center justify-center gap-2 text-[12.5px] text-white/70"
            >
              <Link
                href="/"
                className="transition-colors duration-300 hover:text-white"
              >
                Beranda
              </Link>
              <ChevronRight size={13} strokeWidth={2} aria-hidden />
              <span aria-current="page" className="font-semibold text-white">
                Infografis
              </span>
            </nav>

            <h1 className="text-[36px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[44px] md:text-[52px]">
              Infografis
            </h1>

            <p className="mx-auto mt-5 max-w-[580px] text-[14px] font-normal leading-[1.8] text-white/85 sm:text-[15px]">
              Informasi visual mengenai perkembangan penelitian, pengabdian,
              publikasi, HKI, dan bidang fokus penelitian Politeknik Negeri
              Batam.
            </p>

            {/* pintasan */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              <a
                href="#statistik"
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Statistik P2M
              </a>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#31551F] via-[#8DC26F] to-[#31551F]"
        />
      </section>

      {/* =====================================================
          STATISTIK
      ===================================================== */}

      <section id="statistik" className="scroll-mt-20 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Statistik P2M"
            title="Statistik Keseluruhan P2M Polibatam"
            description="Total penelitian, pengabdian, publikasi, dan HKI. Setiap grafik punya filter sendiri, bisa diganti tampilannya (garis, batang, atau data), dan diunduh sebagai gambar (PNG) atau data (CSV) sesuai filternya."
          />

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-[#FFF1F1] px-4 py-3 text-[13px] text-[#B91C1C]"
            >
              {error}
            </p>
          )}

          {loading ? (
            <p className="mt-10 text-center text-[13px] text-[#667360]">
              Memuat data infografis...
            </p>
          ) : (
          <div className="mt-6 space-y-5">
            {/* ---------- TOTAL + JURUSAN ---------- */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal className="h-full">
                <FilteredChart
                  data={data}
                  dims={["year", "jurusan", "prodi"]}
                  build={({ rows }) => {
                    const t = aggregate(rows);

                    return {
                      title: "Total Penelitian, Pengabdian, Publikasi dan HKI",
                      fileName: "total-p2m",
                      labelHeader: "Kegiatan",
                      labels: ["Penelitian", "Pengabdian", "Publikasi", "HKI"],
                      series: [
                        mk("Total", SERIES[0], [
                          t.penelitian,
                          t.pengabdian,
                          t.publikasi,
                          t.hki,
                        ]),
                      ],
                      vary: true,
                      modes: ["bar", "line", "pie", "table"],
                      defaultMode: "bar",
                    };
                  }}
                />
              </Reveal>

              <Reveal delay={110} className="h-full">
                <FilteredChart
                  data={data}
                  dims={["year"]}
                  build={({ rows }) => {
                    const stats = data.jurusan.map((name) => ({
                      name,
                      ...aggregate(rows.filter((r) => r.jurusan === name)),
                    }));

                    return {
                      title: "Penelitian, Pengabdian, Publikasi dan HKI Jurusan",
                      fileName: "p2m-per-jurusan",
                      labelHeader: "Jurusan",
                      labels: stats.map((j) => j.name),
                      series: [
                        mk("Penelitian", SERIES[0], stats.map((j) => j.penelitian)),
                        mk("Pengabdian", SERIES[1], stats.map((j) => j.pengabdian)),
                        mk("Publikasi", SERIES[2], stats.map((j) => j.publikasi)),
                        mk("HKI", SERIES[3], stats.map((j) => j.hki)),
                      ],
                      modes: ["bar", "line", "table"],
                      defaultMode: "bar",
                    };
                  }}
                />
              </Reveal>
            </div>

            {/* ---------- PARTISIPASI DOSEN ---------- */}
            <Reveal>
              <FilteredChart
                data={data}
                dims={["jurusan", "prodi"]}
                build={({ rows }) => {
                  const stats = perYear(rows, data.years);

                  return {
                    title: "Grafik Persentase Partisipasi Dosen",
                    fileName: "partisipasi-dosen",
                    labelHeader: "Tahun",
                    labels: stats.map((y) => String(y.year)),
                    series: [
                      mk("Penelitian", SERIES[0], stats.map((y) => pct2(y.partPenelitian, y.dosen))),
                      mk("Pengabdian", SERIES[1], stats.map((y) => pct2(y.partPengabdian, y.dosen))),
                      mk("Publikasi", SERIES[2], stats.map((y) => pct2(y.partPublikasi, y.dosen))),
                    ],
                    percent: true,
                    yTitle: "Persen (%)",
                    modes: ["line", "bar", "table"],
                    defaultMode: "line",
                    note: "Dihitung dari dosen yang terdaftar di Profil Peneliti.",
                  };
                }}
              />
            </Reveal>

            {/* ---------- TOTAL PER TAHUN ---------- */}
            <Reveal>
              <FilteredChart
                data={data}
                dims={["jurusan", "prodi"]}
                build={({ rows }) => {
                  const stats = perYear(rows, data.years);

                  return {
                    title: "Total Penelitian, Pengabdian, Publikasi Per Tahun",
                    fileName: "total-per-tahun",
                    labelHeader: "Tahun",
                    labels: stats.map((y) => String(y.year)),
                    series: [
                      mk("Penelitian", SERIES[0], stats.map((y) => y.penelitian)),
                      mk("Pengabdian", SERIES[1], stats.map((y) => y.pengabdian)),
                      mk("Publikasi", SERIES[2], stats.map((y) => y.publikasi)),
                    ],
                    yTitle: "Total Data",
                    modes: ["line", "bar", "table"],
                    defaultMode: "line",
                  };
                }}
              />
            </Reveal>

            {/* ---------- PERBANDINGAN PER TAHUN ---------- */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal className="h-full">
                <FilteredChart
                  data={data}
                  dims={["jurusan", "prodi"]}
                  build={({ rows }) => {
                    const stats = perYear(rows, data.years);

                    return {
                      title: "Perbandingan Penelitian Per Tahun",
                      fileName: "penelitian-per-tahun",
                      labelHeader: "Tahun",
                      labels: stats.map((y) => String(y.year)),
                      series: [mk("Penelitian", SERIES[0], stats.map((y) => y.penelitian))],
                      vary: true,
                      modes: ["pie", "bar", "line", "table"],
                      defaultMode: "pie",
                    };
                  }}
                />
              </Reveal>

              <Reveal delay={110} className="h-full">
                <FilteredChart
                  data={data}
                  dims={["jurusan", "prodi"]}
                  build={({ rows }) => {
                    const stats = perYear(rows, data.years);

                    return {
                      title: "Perbandingan Publikasi Ilmiah Per Tahun",
                      fileName: "publikasi-per-tahun",
                      labelHeader: "Tahun",
                      labels: stats.map((y) => String(y.year)),
                      series: [mk("Publikasi", SERIES[1], stats.map((y) => y.publikasi))],
                      vary: true,
                      modes: ["pie", "bar", "line", "table"],
                      defaultMode: "pie",
                    };
                  }}
                />
              </Reveal>
            </div>

            {/* ---------- PERBANDINGAN PER PRODI ---------- */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal className="h-full">
                <FilteredChart
                  data={data}
                  dims={["year", "jurusan"]}
                  build={({ rows, visibleProdi }) => {
                    const stats = visibleProdi.map((p) => ({
                      ...p,
                      ...aggregate(rows.filter((r) => r.prodi === p.name)),
                    }));

                    return {
                      title: "Perbandingan Penelitian Per Prodi",
                      fileName: "penelitian-per-prodi",
                      labelHeader: "Program Studi",
                      labels: stats.map((p) => p.short),
                      fullLabels: stats.map((p) => p.name),
                      series: [mk("Penelitian", SERIES[0], stats.map((p) => p.penelitian))],
                      vary: true,
                      modes: ["pie", "bar", "line", "table"],
                      defaultMode: "pie",
                    };
                  }}
                />
              </Reveal>

              <Reveal delay={110} className="h-full">
                <FilteredChart
                  data={data}
                  dims={["year", "jurusan"]}
                  build={({ rows, visibleProdi }) => {
                    const stats = visibleProdi.map((p) => ({
                      ...p,
                      ...aggregate(rows.filter((r) => r.prodi === p.name)),
                    }));

                    return {
                      title: "Perbandingan Publikasi Ilmiah Per Prodi",
                      fileName: "publikasi-per-prodi",
                      labelHeader: "Program Studi",
                      labels: stats.map((p) => p.short),
                      fullLabels: stats.map((p) => p.name),
                      series: [mk("Publikasi", SERIES[1], stats.map((p) => p.publikasi))],
                      vary: true,
                      modes: ["pie", "bar", "line", "table"],
                      defaultMode: "pie",
                    };
                  }}
                />
              </Reveal>
            </div>

            {/* ---------- JENIS PROGRAM ---------- */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal className="h-full">
                <FilteredShell
                  data={data}
                  dims={["year", "jurusan", "prodi"]}
                  title="Penelitian Berdasarkan Jenis Program"
                >
                  {({ rows }) => (
                    <DataTable
                      rows={sumMap(rows, "programPenelitian")}
                      columns={programCols}
                      controls={false}
                      minWidth={320}
                      footer={
                        <tr className="border-t border-[#D9E2D3] bg-[#F6F9F3]">
                          <td className={td} />
                          <td className={`${td} font-semibold`}>Total</td>
                          <td
                            className={`${td} text-right font-semibold text-[#31551F]`}
                          >
                            {aggregate(rows).penelitian}
                          </td>
                        </tr>
                      }
                    />
                  )}
                </FilteredShell>
              </Reveal>

              <Reveal delay={110} className="h-full">
                <FilteredChart
                  data={data}
                  dims={["year", "jurusan", "prodi"]}
                  build={({ rows }) => {
                    const jenis = sumMap(rows, "jenisPengabdian");

                    return {
                      title: "Perbandingan Pengabdian Per Jenis",
                      fileName: "pengabdian-per-jenis",
                      labelHeader: "Jenis",
                      labels: jenis.map((j) => j.label),
                      series: [mk("Pengabdian", SERIES[1], jenis.map((j) => j.value))],
                      vary: true,
                      modes: ["pie", "bar", "line", "table"],
                      defaultMode: "pie",
                    };
                  }}
                />
              </Reveal>
            </div>

            {/* ---------- TABEL PER TAHUN ---------- */}
            <Reveal>
              <FilteredShell
                data={data}
                dims={["jurusan", "prodi"]}
                title="Data Statistik Keseluruhan Penelitian, Pengabdian, dan Publikasi Per Tahun"
              >
                {({ rows }) => (
                  <DataTable
                    rows={perYear(rows, data.years)}
                    columns={yearCols}
                    minWidth={1200}
                    defaultSort={{ key: "year", dir: "desc" }}
                  />
                )}
              </FilteredShell>
            </Reveal>

            {/* ---------- TABEL DOSEN ---------- */}
            <Reveal>
              <FilteredShell
                data={data}
                dims={["jurusan", "prodi"]}
                title="Data Kinerja Penelitian, Pengabdian, dan Publikasi Seluruh Dosen"
              >
                {({ filters }) => {
                  const short = data.prodi.find((p) => p.name === filters.prodi)?.short;

                  const dosenRows = data.dosen.filter(
                    (d) =>
                      (filters.jurusan === ALL.jurusan || d.jurusan === filters.jurusan) &&
                      (filters.prodi === ALL.prodi || short === d.prodi)
                  );

                  return (
                    <>
                      <p className="mb-3 text-[12px] text-[#667360]">
                        Total data: {dosenRows.length}
                      </p>
                      <DataTable rows={dosenRows} columns={dosenCols} minWidth={720} />
                    </>
                  );
                }}
              </FilteredShell>
            </Reveal>
          </div>
          )}
        </div>
      </section>

      {/* =====================================================
          ANIMASI (sama dengan Beranda)
      ===================================================== */}

      <style>{`
        html {
          scroll-behavior: smooth;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }
      `}</style>
    </main>
    </UpdatedAtContext.Provider>
  );
}