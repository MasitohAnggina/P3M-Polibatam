"use client";

import Link from "next/link";
import { Poppins } from "next/font/google";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Info,
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
   TANGGAL PEMBARUAN DATA
   Format: "YYYY-MM-DD" (contoh: "2026-10-14").

   TODO: ganti dengan tanggal asli dari backend (mis. kolom
   updated_at). Tanggal ini tampil di baris catatan di bawah
   filter dan di bagian bawah tiap panel. Kalau satu panel punya
   tanggal sendiri, kirim lewat prop `updatedAt` pada
   ChartPanel / PanelShell.
========================================================= */

const DATA_UPDATED_AT = "2026-10-14";

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

/* "2026-10-14" -> "14 Oktober 2026".
   Dibuat manual (tanpa Intl) supaya hasil di server dan di browser
   selalu sama, tidak memicu hydration error. */
function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return iso;

  return `${String(day).padStart(2, "0")} ${MONTH_NAMES[month - 1]} ${year}`;
}

/* =========================================================
   DATA DUMMY
   Struktur mengikuti halaman statistik LPPM PCR:
   data per (tahun, program studi, kategori dosen).

   TODO: ganti buildData() dengan data asli dari API/backend.
   Selama bentuk Row-nya sama, semua grafik dan tabel
   otomatis mengikuti.
========================================================= */

const YEARS = [2022, 2023, 2024, 2025, 2026];

/* TODO: sesuaikan daftar program studi dengan data Polibatam */
const PRODI = [
  { name: "Teknik Informatika", short: "TI", jurusan: "Teknik Informatika" },
  {
    name: "Teknologi Rekayasa Perangkat Lunak",
    short: "TRPL",
    jurusan: "Teknik Informatika",
  },
  { name: "Animasi", short: "ANI", jurusan: "Teknik Informatika" },
  {
    name: "Teknik Elektronika Manufaktur",
    short: "TEM",
    jurusan: "Teknik Elektro",
  },
  { name: "Teknik Mesin", short: "TM", jurusan: "Teknik Mesin" },
  { name: "Akuntansi", short: "AKT", jurusan: "Manajemen Bisnis" },
];

const JURUSAN = Array.from(new Set(PRODI.map((p) => p.jurusan)));

const CATEGORIES = [
  { code: "DTPS", label: "Dosen Tetap Program Studi (DTPS)" },
  { code: "DTPR", label: "Dosen Tetap Penghitung Rasio (DTPR)" },
];

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
  "author1",
  "author2",
  "author3",
  "author4",
  "authorCorr",
  "authorLain",
] as const;

type NumKey = (typeof NUM_KEYS)[number];
type Totals = Record<NumKey, number>;
type Row = {
  year: number;
  prodi: string;
  jurusan: string;
  category: string;
} & Totals;

function buildData(): Row[] {
  const rows: Row[] = [];

  YEARS.forEach((year, yi) => {
    PRODI.forEach((p, pi) => {
      CATEGORIES.forEach((cat, ci) => {
        const base = 2 + ((pi * 3 + ci * 2 + yi) % 4);
        const dosen = 6 + ((pi + ci * 3) % 5);

        const publikasi = base + yi + 2;

        /* level publikasi */
        const pubInternasional = Math.floor(publikasi * 0.2);
        const pubInternal = Math.floor(publikasi * 0.25);
        const pubNasional = publikasi - pubInternasional - pubInternal;

        /* jenis publikasi */
        const prosiding = Math.floor(publikasi * 0.25);
        const buku = publikasi >= 8 && (pi + yi) % 3 === 0 ? 1 : 0;
        const lainnya = Math.floor(publikasi * 0.1);
        const jurnal = publikasi - prosiding - buku - lainnya;

        /* status author */
        const author1 = Math.ceil(publikasi * 0.3);
        const author2 = Math.floor(publikasi * 0.25);
        const author3 = Math.floor(publikasi * 0.15);
        const author4 = Math.floor(publikasi * 0.1);
        const authorCorr = Math.floor(publikasi * 0.1);
        const authorLain =
          publikasi - author1 - author2 - author3 - author4 - authorCorr;

        rows.push({
          year,
          prodi: p.name,
          jurusan: p.jurusan,
          category: cat.code,
          dosen,
          partPenelitian: Math.min(dosen, 3 + ((pi + yi) % 4)),
          partPengabdian: Math.min(dosen, 2 + ((pi + ci + yi) % 4)),
          partPublikasi: Math.min(dosen, 3 + ((pi + yi + ci) % 5)),
          penelitian: base + yi,
          pengabdian: Math.max(1, base - 1 + Math.floor(yi * 0.8)),
          publikasi,
          hki: (pi + yi + ci) % 3 === 0 ? 1 + (yi > 2 ? 1 : 0) : 0,
          pubInternal,
          pubNasional,
          pubInternasional,
          jurnal,
          prosiding,
          buku,
          lainnya,
          author1,
          author2,
          author3,
          author4,
          authorCorr,
          authorLain,
        });
      });
    });
  });

  return rows;
}

const DATA = buildData();

/* TODO: ganti dengan data kinerja dosen asli (nama, NIP, prodi) */
const DOSEN = PRODI.flatMap((p, pi) =>
  [0, 1].map((k) => ({
    name: `Dosen ${pi * 2 + k + 1}`,
    nip: "-",
    prodi: p.short,
    jurusan: p.jurusan,
    penelitian: 1 + ((pi + k) % 4),
    pengabdian: 1 + ((pi + k * 2) % 3),
    publikasi: 2 + ((pi * 2 + k) % 5),
  }))
);

/* Pembagian jenis program (dummy): total dibagi menurut bobot */
const PROGRAM_PENELITIAN = [
  { label: "Hibah Internal", weight: 0.4 },
  { label: "Hibah Kemdiktisaintek", weight: 0.3 },
  { label: "Kerjasama Industri", weight: 0.2 },
  { label: "Pembiayaan Mandiri", weight: 0.1 },
];

const JENIS_PENGABDIAN = [
  { label: "Hibah Internal", weight: 0.35 },
  { label: "Hibah Kemdiktisaintek", weight: 0.25 },
  { label: "Kerjasama Industri", weight: 0.25 },
  { label: "Pembiayaan Mandiri", weight: 0.15 },
];

function distribute(total: number, items: { label: string; weight: number }[]) {
  const values = items.map((item) => Math.floor(total * item.weight));
  values[0] += total - values.reduce((sum, value) => sum + value, 0);
  return items.map((item, index) => ({
    label: item.label,
    value: values[index],
  }));
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

function filterRows(f: Filters, ignore: Dim[] = []) {
  return DATA.filter(
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

/* Tanggal pembaruan data: "Diperbarui: 14 Oktober 2026" */
function UpdatedAt({
  date,
  className = "text-[12.5px]",
}: {
  date: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium text-[#667360] ${className}`}
    >
      <CalendarDays
        size={13}
        strokeWidth={1.8}
        aria-hidden
        className="shrink-0 text-[#3F6B28]"
      />
      Diperbarui:
      <time dateTime={date} className="font-semibold text-[#31551F]">
        {formatDate(date)}
      </time>
    </span>
  );
}

/* Kartu dengan header hijau di tengah (mengikuti gaya kartu statistik PCR).
   Bagian bawah kartu berisi catatan (opsional) dan tanggal pembaruan data. */
function PanelShell({
  title,
  children,
  note,
  updatedAt = DATA_UPDATED_AT,
}: {
  title: string;
  children: ReactNode;
  note?: string;
  updatedAt?: string;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white shadow-[0_8px_30px_rgba(31,42,26,0.05)]">
      <h3 className="bg-[#31551F] px-5 py-3.5 text-center text-[13.5px] font-semibold leading-snug text-white sm:text-[14px]">
        {title}
      </h3>

      <div className="flex flex-1 flex-col p-4 md:p-5">
        <div className="flex-1">{children}</div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-[#E7EDE3] pt-3">
          {note ? (
            <p className="text-[11px] leading-5 text-[#667360]">{note}</p>
          ) : (
            <span />
          )}
          <UpdatedAt date={updatedAt} className="text-[11px]" />
        </div>
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
   Tombol: ganti tampilan, kembalikan ke awal, unduh CSV.
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
  updatedAt = DATA_UPDATED_AT,
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
  /** tanggal pembaruan data panel ini ("YYYY-MM-DD"); default tanggal umum */
  updatedAt?: string;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);

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

  return (
    <PanelShell title={title} note={note} updatedAt={updatedAt}>
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
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#31551F] transition-colors duration-300 hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
        >
          <RotateCcw size={16} strokeWidth={1.9} aria-hidden />
        </button>

        <button
          type="button"
          title="Unduh data (CSV)"
          aria-label="Unduh data (CSV)"
          onClick={() =>
            downloadCsv(
              `${fileName}-${updatedAt}`,
              [labelHeader, ...all.map((s) => s.name)],
              tableRows.map((r) => [r.label, ...r.values])
            )
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#31551F] transition-colors duration-300 hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
        >
          <Download size={16} strokeWidth={1.9} aria-hidden />
        </button>
      </div>

      {/* ISI */}
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

      {mode === "pie" && (
        <PieView
          ariaLabel={title}
          items={labels.map((_, i) => ({
            label: names[i],
            value: series[0].data[i],
          }))}
        />
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

type DosenRow = (typeof DOSEN)[number];

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
   HALAMAN INFOGRAFIS
========================================================= */

const STATUS_NOTE =
  "Data yang ditampilkan pada grafik hanya data yang berstatus Diterima dan Direview.";

export default function InfografisPage() {
  const [filters, setFilters] = useState<Filters>({ ...ALL });

  const setFilter = (key: Dim, value: string) =>
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "jurusan" ? { prodi: ALL.prodi } : {}),
    }));

  const hasActiveFilter = (Object.keys(ALL) as Dim[]).some(
    (key) => filters[key] !== ALL[key]
  );

  const visibleProdi = useMemo(
    () =>
      PRODI.filter(
        (p) => filters.jurusan === ALL.jurusan || p.jurusan === filters.jurusan
      ),
    [filters.jurusan]
  );

  /* ---------- DATA TURUNAN ---------- */

  /* total: mengikuti semua filter */
  const totals = useMemo(() => aggregate(filterRows(filters)), [filters]);

  /* per tahun: menampilkan semua tahun, mengikuti filter lain */
  const yearStats = useMemo<YearRow[]>(() => {
    const rows = filterRows(filters, ["year"]);
    return YEARS.map((year) => ({
      year,
      ...aggregate(rows.filter((r) => r.year === year)),
    }));
  }, [filters]);

  /* per jurusan: mengikuti filter tahun dan kategori dosen */
  const jurusanStats = useMemo(() => {
    const rows = filterRows(filters, ["jurusan", "prodi"]);
    return JURUSAN.map((name) => ({
      name,
      ...aggregate(rows.filter((r) => r.jurusan === name)),
    }));
  }, [filters]);

  /* per prodi: mengikuti filter tahun, jurusan, dan kategori dosen */
  const prodiStats = useMemo(() => {
    const rows = filterRows(filters, ["prodi"]);
    return visibleProdi.map((p) => ({
      name: p.name,
      short: p.short,
      ...aggregate(rows.filter((r) => r.prodi === p.name)),
    }));
  }, [filters, visibleProdi]);

  const dosenRows = useMemo(
    () =>
      DOSEN.filter(
        (d) =>
          (filters.jurusan === ALL.jurusan || d.jurusan === filters.jurusan) &&
          (filters.prodi === ALL.prodi ||
            PRODI.find((p) => p.name === filters.prodi)?.short === d.prodi)
      ),
    [filters.jurusan, filters.prodi]
  );

  const mk = (name: string, color: string, data: number[]): Series => ({
    name,
    color,
    data,
  });

  const yearLabels = yearStats.map((y) => String(y.year));
  const prodiShort = prodiStats.map((p) => p.short);
  const prodiNames = prodiStats.map((p) => p.name);

  const programPenelitian = distribute(totals.penelitian, PROGRAM_PENELITIAN);
  const jenisPengabdian = distribute(totals.pengabdian, JENIS_PENGABDIAN);

  return (
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
            description="Total penelitian, pengabdian, publikasi, dan HKI. Setiap grafik dapat diganti tampilannya (garis, batang, atau data) dan diunduh sebagai CSV."
          />

          {/* ---------- FILTER ---------- */}
          <Reveal>
            <div className="rounded-2xl border border-[#D9E2D3] bg-white p-4 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <FieldLabel htmlFor="f-tahun">Tahun</FieldLabel>
                  <SelectField
                    id="f-tahun"
                    value={filters.year}
                    options={[
                      { value: ALL.year, label: ALL.year },
                      ...YEARS.map((y) => ({
                        value: String(y),
                        label: String(y),
                      })),
                    ]}
                    onChange={(v) => setFilter("year", v)}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="f-jurusan">Jurusan</FieldLabel>
                  <SelectField
                    id="f-jurusan"
                    value={filters.jurusan}
                    options={[
                      { value: ALL.jurusan, label: ALL.jurusan },
                      ...JURUSAN.map((j) => ({ value: j, label: j })),
                    ]}
                    onChange={(v) => setFilter("jurusan", v)}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="f-prodi">Program Studi</FieldLabel>
                  <SelectField
                    id="f-prodi"
                    value={filters.prodi}
                    options={[
                      { value: ALL.prodi, label: ALL.prodi },
                      ...visibleProdi.map((p) => ({
                        value: p.name,
                        label: p.name,
                      })),
                    ]}
                    onChange={(v) => setFilter("prodi", v)}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="f-kategori">Kategori Dosen</FieldLabel>
                  <SelectField
                    id="f-kategori"
                    value={filters.category}
                    options={[
                      { value: ALL.category, label: ALL.category },
                      ...CATEGORIES.map((c) => ({
                        value: c.code,
                        label: c.label,
                      })),
                    ]}
                    onChange={(v) => setFilter("category", v)}
                  />
                </div>
              </div>
            </div>
          </Reveal>

          {/* catatan status data, tanggal pembaruan, dan reset filter
              (baris sederhana, tanpa kotak) */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="inline-flex items-center gap-2 text-[12.5px] leading-5 text-[#667360]">
              <Info
                size={15}
                strokeWidth={1.8}
                aria-hidden
                className="shrink-0 text-[#3F6B28]"
              />
              {STATUS_NOTE}
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <UpdatedAt date={DATA_UPDATED_AT} />

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => setFilters({ ...ALL })}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28]"
                >
                  <RotateCcw size={14} strokeWidth={2} aria-hidden />
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {/* ---------- TOTAL + JURUSAN ---------- */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal className="h-full">
                <ChartPanel
                  title="Total Penelitian, Pengabdian, Publikasi dan HKI"
                  fileName="total-p2m"
                  labelHeader="Kegiatan"
                  labels={["Penelitian", "Pengabdian", "Publikasi", "HKI"]}
                  series={[
                    mk("Total", SERIES[0], [
                      totals.penelitian,
                      totals.pengabdian,
                      totals.publikasi,
                      totals.hki,
                    ]),
                  ]}
                  vary
                  modes={["bar", "line", "pie", "table"]}
                  defaultMode="bar"
                  note={STATUS_NOTE}
                />
              </Reveal>

              <Reveal delay={110} className="h-full">
                <ChartPanel
                  title="Penelitian, Pengabdian, Publikasi dan HKI Jurusan"
                  fileName="p2m-per-jurusan"
                  labelHeader="Jurusan"
                  labels={jurusanStats.map((j) => j.name)}
                  series={[
                    mk("Penelitian", SERIES[0], jurusanStats.map((j) => j.penelitian)),
                    mk("Pengabdian", SERIES[1], jurusanStats.map((j) => j.pengabdian)),
                    mk("Publikasi", SERIES[2], jurusanStats.map((j) => j.publikasi)),
                    mk("HKI", SERIES[3], jurusanStats.map((j) => j.hki)),
                  ]}
                  modes={["bar", "line", "table"]}
                  defaultMode="bar"
                  note={STATUS_NOTE}
                />
              </Reveal>
            </div>

            {/* ---------- PARTISIPASI DOSEN ---------- */}
            <Reveal>
              <ChartPanel
                title="Grafik Persentase Partisipasi Dosen"
                fileName="partisipasi-dosen"
                labelHeader="Tahun"
                labels={yearLabels}
                series={[
                  mk("Penelitian", SERIES[0], yearStats.map((y) => pct2(y.partPenelitian, y.dosen))),
                  mk("Pengabdian", SERIES[1], yearStats.map((y) => pct2(y.partPengabdian, y.dosen))),
                  mk("Publikasi", SERIES[2], yearStats.map((y) => pct2(y.partPublikasi, y.dosen))),
                ]}
                percent
                yTitle="Persen (%)"
                modes={["line", "bar", "table"]}
                defaultMode="line"
                note="Dosen Lanjut Study dan LWP tidak dihitung."
              />
            </Reveal>

            {/* ---------- TOTAL PER TAHUN ---------- */}
            <Reveal>
              <ChartPanel
                title="Total Penelitian, Pengabdian, Publikasi Per Tahun"
                fileName="total-per-tahun"
                labelHeader="Tahun"
                labels={yearLabels}
                series={[
                  mk("Penelitian", SERIES[0], yearStats.map((y) => y.penelitian)),
                  mk("Pengabdian", SERIES[1], yearStats.map((y) => y.pengabdian)),
                  mk("Publikasi", SERIES[2], yearStats.map((y) => y.publikasi)),
                ]}
                yTitle="Total Data"
                modes={["line", "bar", "table"]}
                defaultMode="line"
              />
            </Reveal>

            {/* ---------- PERBANDINGAN PER TAHUN ---------- */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal className="h-full">
                <ChartPanel
                  title="Perbandingan Penelitian Per Tahun"
                  fileName="penelitian-per-tahun"
                  labelHeader="Tahun"
                  labels={yearLabels}
                  series={[mk("Penelitian", SERIES[0], yearStats.map((y) => y.penelitian))]}
                  vary
                  modes={["pie", "bar", "line", "table"]}
                  defaultMode="pie"
                />
              </Reveal>

              <Reveal delay={110} className="h-full">
                <ChartPanel
                  title="Perbandingan Publikasi Ilmiah Per Tahun"
                  fileName="publikasi-per-tahun"
                  labelHeader="Tahun"
                  labels={yearLabels}
                  series={[mk("Publikasi", SERIES[1], yearStats.map((y) => y.publikasi))]}
                  vary
                  modes={["pie", "bar", "line", "table"]}
                  defaultMode="pie"
                />
              </Reveal>
            </div>

            {/* ---------- PERBANDINGAN PER PRODI ---------- */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal className="h-full">
                <ChartPanel
                  title="Perbandingan Penelitian Per Prodi"
                  fileName="penelitian-per-prodi"
                  labelHeader="Program Studi"
                  labels={prodiShort}
                  fullLabels={prodiNames}
                  series={[mk("Penelitian", SERIES[0], prodiStats.map((p) => p.penelitian))]}
                  vary
                  modes={["pie", "bar", "line", "table"]}
                  defaultMode="pie"
                />
              </Reveal>

              <Reveal delay={110} className="h-full">
                <ChartPanel
                  title="Perbandingan Publikasi Ilmiah Per Prodi"
                  fileName="publikasi-per-prodi"
                  labelHeader="Program Studi"
                  labels={prodiShort}
                  fullLabels={prodiNames}
                  series={[mk("Publikasi", SERIES[1], prodiStats.map((p) => p.publikasi))]}
                  vary
                  modes={["pie", "bar", "line", "table"]}
                  defaultMode="pie"
                />
              </Reveal>
            </div>

            {/* ---------- JENIS PROGRAM ---------- */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal className="h-full">
                <PanelShell title="Penelitian Berdasarkan Jenis Program">
                  <DataTable
                    rows={programPenelitian}
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
                          {totals.penelitian}
                        </td>
                      </tr>
                    }
                  />
                </PanelShell>
              </Reveal>

              <Reveal delay={110} className="h-full">
                <ChartPanel
                  title="Perbandingan Pengabdian Per Jenis"
                  fileName="pengabdian-per-jenis"
                  labelHeader="Jenis"
                  labels={jenisPengabdian.map((j) => j.label)}
                  series={[
                    mk("Pengabdian", SERIES[1], jenisPengabdian.map((j) => j.value)),
                  ]}
                  vary
                  modes={["pie", "bar", "line", "table"]}
                  defaultMode="pie"
                />
              </Reveal>
            </div>

            {/* ---------- TABEL PER TAHUN ---------- */}
            <Reveal>
              <PanelShell title="Data Statistik Keseluruhan Penelitian, Pengabdian, dan Publikasi Per Tahun">
                <DataTable
                  rows={yearStats}
                  columns={yearCols}
                  minWidth={1200}
                  defaultSort={{ key: "year", dir: "desc" }}
                />
              </PanelShell>
            </Reveal>

            {/* ---------- TABEL DOSEN ---------- */}
            <Reveal>
              <PanelShell title="Data Kinerja Penelitian, Pengabdian, dan Publikasi Seluruh Dosen">
                <p className="mb-3 text-[12px] text-[#667360]">
                  Total data: {dosenRows.length}
                </p>
                <DataTable
                  rows={dosenRows}
                  columns={dosenCols}
                  minWidth={720}
                />
              </PanelShell>
            </Reveal>
          </div>
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
  );
}