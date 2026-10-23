"use client";

import { Poppins } from "next/font/google";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Download,
  FileText,
  Search,
} from "lucide-react";

/* =========================================================
   HALAMAN DOKUMEN & PANDUAN
   Alamat  : /dokumen-panduan  (submenu Informasi di navbar)
   Isi     : buku panduan, template, formulir, SK / surat edaran
             yang bisa diunduh. Tidak ada halaman detail; setiap
             kartu langsung membuka / mengunduh file.
   Data    : diambil dari API Laravel (/api/dokumen), diisi lewat
             halaman admin Dokumen & Panduan.

   Font, warna, dan animasi sama dengan halaman lain.
   teks utama #1F2A1A | hijau #31551F | hijau gelap #213B14
   hijau medium #3F6B28 | aksen #8DC26F | hijau muda #EEF4EA
   muted #667360 | garis #D9E2D3 | latar lembut #F6F9F3
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* =========================================================
   KONSTANTA & TIPE
========================================================= */

const ALL_CATEGORIES = "Semua Dokumen";
const ALL_YEARS = "Semua Tahun";

const documentCategories = [
  ALL_CATEGORIES,
  "Panduan",
  "Template",
  "Formulir",
  "SK & Surat Edaran",
] as const;

type DocumentCategory = Exclude<
  (typeof documentCategories)[number],
  typeof ALL_CATEGORIES
>;

type DocumentItem = {
  /* id unik, dipakai sebagai key React */
  id: string;
  title: string;
  category: DocumentCategory;
  year: string;
  /* tanggal tampil di kartu, contoh: "1 April 2026".
     Kalau kosong, yang tampil hanya tahun. */
  date?: string;
  /* keterangan singkat; ikut dicari di kolom pencarian
     (belum tampil di kartu) */
  description?: string;
  /* format file, contoh: "PDF", "DOCX", "XLSX" */
  format?: string;
  /* ukuran file, contoh: "2,4 MB" */
  size?: string;
  /* link file (SharePoint, Google Drive, atau "/dokumen/nama.pdf"
     bila ditaruh di folder public). Dibuka di tab baru.
     "#" berarti file belum tersedia. */
  href: string;
};

/* Bentuk data dari API Laravel */
type ApiDokumen = {
  id: number;
  judul: string;
  kategori: string;
  tahun: string;
  tanggal: string | null;
  keterangan: string | null;
  format: string | null;
  ukuran: string | null;
  link_file: string;
};

/* Atur NEXT_PUBLIC_API_URL di .env.local, contoh:
   NEXT_PUBLIC_API_URL=http://localhost:8000/api */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

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

/* "2026-04-29" -> "29 April 2026" */
function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return "";

  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1] ?? ""} ${year}`;
}

function fromApi(item: ApiDokumen): DocumentItem {
  return {
    id: String(item.id),
    title: item.judul,
    category: item.kategori as DocumentCategory,
    year: item.tahun,
    date: item.tanggal ? formatDate(item.tanggal) : undefined,
    description: item.keterangan ?? undefined,
    format: item.format ?? undefined,
    size: item.ukuran ?? undefined,
    href: item.link_file,
  };
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
    <Reveal className="mb-12 md:mb-16">
      {eyebrow && (
        <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#3F6B28]">
          {eyebrow}
        </p>
      )}

      <h2 className="max-w-[720px] text-[26px] font-bold leading-[1.25] tracking-[-0.02em] text-[#1F2A1A] sm:text-[30px] md:text-[34px]">
        {title}
      </h2>

      {description && (
        <p className="mt-4 max-w-[620px] text-[14px] leading-[1.85] text-[#667360]">
          {description}
        </p>
      )}
    </Reveal>
  );
}

/* Label kolom. Pakai <label> hanya bila terhubung ke input (htmlFor),
   kalau tidak cukup <span> supaya HTML tetap valid. */
function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  const className =
    "mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#31551F]";

  return htmlFor ? (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ) : (
    <span className={className}>{children}</span>
  );
}

function SelectField({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-[#D9E2D3] bg-white px-4 pr-10 text-[13.5px] text-[#1F2A1A] outline-none transition-all duration-300 hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
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

/* Tampilan saat daftar kosong (memuat, gagal, belum ada data,
   atau hasil filter kosong). Tombol reset hanya bila ada filter aktif. */
function EmptyState({
  title,
  description,
  onReset,
}: {
  title: string;
  description?: string;
  onReset?: () => void;
}) {
  return (
    <Reveal>
      <div className="mt-10 rounded-2xl border border-[#D9E2D3] bg-white px-6 py-16 text-center md:py-20">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
          <Search size={26} strokeWidth={1.6} aria-hidden />
        </span>

        <p className="mt-6 text-[16px] font-semibold text-[#1F2A1A]">
          {title}
        </p>

        {description && (
          <p className="mx-auto mt-3 max-w-[420px] text-[13.5px] leading-[1.85] text-[#667360]">
            {description}
          </p>
        )}

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="group mt-8 inline-flex items-center gap-2 rounded-md bg-[#31551F] px-6 py-3.5 text-[13px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
          >
            Reset Filter
            <ArrowRight
              size={15}
              strokeWidth={1.8}
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        )}
      </div>
    </Reveal>
  );
}

/* =========================================================
   KARTU DOKUMEN
   Seluruh kartu adalah link ke file (tab baru).
   Susunan: tanggal + format + ikon unduh, judul, lalu
   jenis dokumen dan ajakan "Unduh".
   (Di layar sentuh ajakan "Unduh" selalu tampil; di desktop
   muncul saat hover / fokus keyboard.)
========================================================= */

function DocumentCard({ item }: { item: DocumentItem }) {
  /* selama link masih "#", jangan buka tab baru / lompat ke atas */
  const isPlaceholder = item.href === "#";

  const label = `Unduh ${item.title}${item.format ? ` (${item.format})` : ""}`;

  return (
    <a
      href={item.href}
      aria-label={label}
      {...(isPlaceholder
        ? { onClick: (e) => e.preventDefault() }
        : { target: "_blank", rel: "noopener noreferrer" })}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#D9E2D3] bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_12px_28px_rgba(49,85,31,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
    >
      {/* garis aksen kiri saat hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-[#31551F] transition-transform duration-300 group-hover:scale-y-100"
      />

      {/* BARIS ATAS: tanggal, format, unduh */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] font-medium text-[#667360]">
          <span className="inline-flex items-center gap-2">
            <CalendarDays
              size={13}
              strokeWidth={1.8}
              aria-hidden
              className="text-[#3F6B28]"
            />
            {item.date ?? item.year}
          </span>

          {item.format && (
            <span className="inline-flex items-center gap-2">
              <FileText
                size={13}
                strokeWidth={1.8}
                aria-hidden
                className="text-[#3F6B28]"
              />
              {item.format}
              {item.size ? ` · ${item.size}` : ""}
            </span>
          )}
        </div>

        <Download
          size={17}
          strokeWidth={1.9}
          aria-hidden
          className="shrink-0 text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]"
        />
      </div>

      {/* JUDUL */}
      <h3 className="mt-6 line-clamp-3 text-[15px] font-semibold leading-[1.6] tracking-[-0.005em] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F] md:text-[16px]">
        {item.title}
      </h3>

      {/* BARIS BAWAH */}
      <div className="mt-auto flex items-center justify-between gap-4 pt-8">
        <span className="rounded-full bg-[#EEF4EA] px-3 py-1.5 text-[10.5px] font-semibold leading-none text-[#31551F]">
          {item.category}
        </span>

        <span
          aria-hidden
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#31551F] transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100"
        >
          Unduh
          <ArrowRight size={13} strokeWidth={2} />
        </span>
      </div>
    </a>
  );
}

/* =========================================================
   HALAMAN
========================================================= */

export default function DokumenPanduanPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [year, setYear] = useState<string>(ALL_YEARS);

  /* data dokumen dari API */
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/dokumen`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`Kode ${res.status}`);

        const json = await res.json();

        if (!cancelled) {
          setDocuments(((json.data ?? []) as ApiDokumen[]).map(fromApi));
          setLoadError("");
        }
      } catch {
        if (!cancelled) setLoadError("Data dokumen gagal dimuat.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* tahun diambil otomatis dari data, terbaru di atas */
  const years = useMemo(
    () => [
      ALL_YEARS,
      ...Array.from(new Set(documents.map((d) => d.year))).sort((a, b) =>
        b.localeCompare(a)
      ),
    ],
    [documents]
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return documents
      .filter((d) => {
        const matchCategory =
          category === ALL_CATEGORIES || d.category === category;
        const matchYear = year === ALL_YEARS || d.year === year;
        const matchSearch =
          keyword === "" ||
          d.title.toLowerCase().includes(keyword) ||
          (d.description ?? "").toLowerCase().includes(keyword);

        return matchCategory && matchYear && matchSearch;
      })
      .sort((a, b) => b.year.localeCompare(a.year));
  }, [documents, search, category, year]);

  const hasActiveFilter =
    search !== "" || category !== ALL_CATEGORIES || year !== ALL_YEARS;

  const resetFilters = () => {
    setSearch("");
    setCategory(ALL_CATEGORIES);
    setYear(ALL_YEARS);
  };

  /* teks keadaan kosong */
  const emptyTitle = loading
    ? "Memuat dokumen..."
    : loadError
      ? loadError
      : documents.length === 0
        ? "Belum ada dokumen"
        : "Dokumen tidak ditemukan";

  const emptyDescription =
    loading || loadError
      ? undefined
      : documents.length === 0
        ? "Dokumen akan tampil di sini setelah ditambahkan oleh admin."
        : "Tidak ada dokumen yang sesuai dengan jenis, tahun, atau kata kunci yang dipilih.";

  return (
    <main
      className={`${poppins.className} overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {/* =====================================================
          HERO (sama dengan hero halaman Informasi)
      ====================================================== */}
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
            <h1 className="text-[36px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[44px] md:text-[52px]">
              Dokumen &amp; Panduan
            </h1>

            <p className="mx-auto mt-5 max-w-[580px] text-[14px] font-normal leading-[1.8] text-white/85 sm:text-[15px]">
              Buku panduan, template, formulir, dan dokumen resmi P2M yang
              dapat diunduh untuk mendukung kegiatan penelitian dan pengabdian.
            </p>
          </div>
        </div>

        <div
          aria-hidden
          className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#31551F] via-[#8DC26F] to-[#31551F]"
        />
      </section>

      {/* =====================================================
          DAFTAR DOKUMEN
      ====================================================== */}
      <section id="dokumen" className="scroll-mt-20 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Unduhan P2M"
            title="Daftar Dokumen"
            description="Unduh buku panduan, template, formulir, dan dokumen resmi untuk pengusulan serta pelaksanaan penelitian dan pengabdian."
          />

          {/* ---------- FILTER ---------- */}
          <Reveal>
            <div className="rounded-2xl border border-[#D9E2D3] bg-white p-5 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-8">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px] md:gap-6">
                <div>
                  <FieldLabel htmlFor="filter-cari">Pencarian</FieldLabel>

                  <div className="relative">
                    <Search
                      size={16}
                      strokeWidth={1.8}
                      aria-hidden
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#667360]"
                    />

                    <input
                      id="filter-cari"
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari nama dokumen..."
                      autoComplete="off"
                      className="h-11 w-full rounded-xl border border-[#D9E2D3] bg-white pl-11 pr-4 text-[13.5px] text-[#1F2A1A] outline-none transition-all duration-300 placeholder:text-[#A3AE9E] hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA]"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="filter-tahun">Tahun</FieldLabel>

                  <SelectField
                    id="filter-tahun"
                    value={year}
                    options={years}
                    onChange={setYear}
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-[#E7EDE3] pt-6 md:mt-7 md:pt-7">
                <FieldLabel>Jenis Dokumen</FieldLabel>

                <div
                  role="group"
                  aria-label="Jenis dokumen"
                  className="flex flex-wrap gap-2.5"
                >
                  {documentCategories.map((type) => {
                    const isActive = type === category;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCategory(type)}
                        aria-pressed={isActive}
                        className={`rounded-full border px-4 py-2 text-[12.5px] font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] ${
                          isActive
                            ? "border-[#31551F] bg-[#31551F] text-white"
                            : "border-[#D9E2D3] bg-white text-[#4A5646] hover:border-[#8DC26F] hover:bg-[#F6F9F3] hover:text-[#31551F]"
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Reveal>

          {/* ---------- INFO HASIL ---------- */}
          <div className="mt-10 flex items-center justify-between gap-4">
            <p aria-live="polite" className="text-[13px] text-[#667360]">
              Menampilkan{" "}
              <span className="font-semibold text-[#1F2A1A]">
                {filtered.length}
              </span>{" "}
              dokumen
            </p>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[12.5px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28]"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* ---------- DAFTAR ---------- */}
          {filtered.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {filtered.map((item, index) => (
                <Reveal
                  key={item.id}
                  delay={(index % 3) * 80}
                  className="h-full"
                >
                  <DocumentCard item={item} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              onReset={
                hasActiveFilter && !loading && !loadError
                  ? resetFilters
                  : undefined
              }
            />
          )}
        </div>
      </section>

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