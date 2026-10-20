"use client";

import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Library,
  Search,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";

/* =========================================================
   FONT (sama dengan Beranda)
   Poppins lebih lebar dari Plus Jakarta Sans, jadi ukuran
   font dikecilkan sedikit dan tracking dibuat lebih longgar.
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* =========================================================
   PALET WARNA (sama dengan Beranda)
   teks utama   : #1F2A1A
   hijau utama  : #31551F
   hijau gelap  : #213B14
   hijau medium : #3F6B28
   hijau aksen  : #8DC26F
   hijau muda   : #EEF4EA
   teks muted   : #667360
   garis        : #D9E2D3
   latar lembut : #F6F9F3

   SKALA FONT (Poppins, sama dengan halaman lain)
   hero judul   : 36 / 44 / 52
   judul seksi  : 26 / 30 / 34
   judul kartu  : 15 / 17
   isi          : 12.5-14 (leading 1.7-1.75)
   label/meta   : 10.5-12.5
========================================================= */

/* =========================================================
   DATA
========================================================= */

type PublicationItem = {
  title: string;
  year: string;
  /* semua field di bawah ini opsional: baris yang kosong tidak ditampilkan */
  authors?: string;
  source?: { name: string; detail?: string };
  description?: string;
  /* kategori / indeks, contoh: "Q1", "Sinta 2", "Scopus" */
  index?: string;
  /* path gambar sampul, contoh: "/img/publikasi/jurnal-1.jpg".
     Kalau kosong atau gambar gagal dimuat, otomatis dibuat sampul
     hijau bergaya buku. */
  cover?: string;
  /* id halaman detail, contoh: "optimization-of-renewable-energy".
     Alamatnya: /publikasi#detail-<slug>. Kalau kosong, dibuat otomatis
     dari judul. */
  slug?: string;
  /* link khusus (menggantikan halaman detail), mis. link eksternal;
     dibuka di tab baru */
  href?: string;
};

type PublicationGroup = {
  category: string;
  items: PublicationItem[];
};

const publicationTypes = [
  "Semua Publikasi",
  "Jurnal Internasional bereputasi",
  "Jurnal Nasional",
  "E-Book",
  "Prosiding",
];

/* Detail dibuka di halaman yang sama: /publikasi#detail-<slug> */
const DETAIL_HASH = "#detail-";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function getId(item: PublicationItem) {
  return item.slug ?? slugify(item.title);
}

function getDetailHash(item: PublicationItem) {
  return `${DETAIL_HASH}${encodeURIComponent(getId(item))}`;
}

/* satu publikasi lengkap dengan kategorinya */
type PublicationEntry = PublicationItem & { category: string };

/* bentuk data dari API Laravel (GET /api/publikasi) */
type ApiPublication = {
  id: number;
  slug: string;
  title: string;
  category: string;
  year: number;
  authors: string;
  source_name: string;
  source_detail: string | null;
  indeks: string | null;
  description: string | null;
  href: string | null;
  cover_url: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

function toEntry(item: ApiPublication): PublicationEntry {
  return {
    title: item.title,
    year: String(item.year),
    category: item.category,
    slug: item.slug,
    authors: item.authors || undefined,
    source: item.source_name
      ? { name: item.source_name, detail: item.source_detail ?? undefined }
      : undefined,
    description: item.description ?? undefined,
    index: item.indeks ?? undefined,
    cover: item.cover_url ?? undefined,
    href: item.href ?? undefined,
  };
}

/* kelompokkan per kategori, urutan mengikuti publicationTypes */
function groupByCategory(entries: PublicationEntry[]): PublicationGroup[] {
  const order = publicationTypes.slice(1);

  return order
    .map((category) => ({
      category,
      items: entries.filter((entry) => entry.category === category),
    }))
    .filter((group) => group.items.length > 0);
}

/* "A, B, C, ..." -> nama-nama, dan penanda masih ada penulis lain */
function parseAuthors(value?: string) {
  if (!value) return { names: [] as string[], hasMore: false };

  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const isEllipsis = (part: string) => part === "..." || part === "…";

  return {
    names: parts.filter((part) => !isEllipsis(part)),
    hasMore: parts.some(isEllipsis),
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/* Lompat langsung tanpa animasi. Karena html memakai
   scroll-behavior: smooth, tanpa ini halaman "meluncur" panjang
   setiap kali pindah daftar <-> detail. */
function jumpTo(target: HTMLElement | null) {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
  root.style.scrollBehavior = previous;
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
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const progress = max > 0 ? el.scrollTop / max : 0;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[60] h-[3px] w-full">
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
  htmlFor?: string;
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
        className="h-10 w-full appearance-none rounded-xl border border-[#D9E2D3] bg-white px-4 pr-10 text-[13.5px] text-[#1F2A1A] outline-none transition-all duration-300 hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA]"
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
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#667360]"
      />
    </div>
  );
}

/* Sampul publikasi: gambar jika ada dan berhasil dimuat,
   kalau tidak dibuat sampul hijau bergaya buku */
function Cover({
  cover,
  title,
  label,
  year,
  sizes = "120px",
}: {
  cover?: string;
  title: string;
  label: string;
  year: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(cover) && !failed;

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#213B14] shadow-[0_10px_24px_rgba(31,42,26,0.18)] ring-1 ring-black/5 transition-transform duration-500 group-hover:-translate-y-0.5">
      {showImage ? (
        <Image
          src={cover as string}
          alt={`Sampul ${title}`}
          fill
          sizes={sizes}
          className="object-cover"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-br from-[#213B14] via-[#31551F] to-[#3F6B28] p-3 text-white">
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[#8DC26F]/25 blur-2xl" />
          <BookOpen
            size={16}
            strokeWidth={1.6}
            aria-hidden
            className="text-[#CFE8BF]"
          />
          <p className="mt-2 line-clamp-4 text-[10.5px] font-semibold leading-snug">
            {label}
          </p>
          <p className="mt-auto text-[10px] text-white/70">{year}</p>
        </div>
      )}

      {/* efek punggung buku */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[6px] bg-gradient-to-r from-black/25 to-transparent" />
    </div>
  );
}

/* =========================================================
   KARTU PUBLIKASI
   Seluruh kartu adalah link ke halaman detail
   (/publikasi#detail-<slug>) atau ke `href` bila diisi.
   Susunan: sampul di kiri; di kanan baris kategori/indeks + tahun,
   judul, penulis & jurnal (satu baris), ringkasan, lalu garis
   tipis berisi Vol/ISSN dan "Lihat Detail".
========================================================= */

function PublicationCard({
  item,
  category,
}: {
  item: PublicationItem;
  category: string;
}) {
  return (
    <a
      href={item.href ?? getDetailHash(item)}
      {...(item.href
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className="group relative block overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white p-4 transition-all duration-500 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] md:p-5"
    >
      {/* sapuan warna saat hover */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />

      <div className="flex gap-4 md:gap-5">
        {/* SAMPUL */}
        <div className="w-[76px] shrink-0 sm:w-[92px] md:w-[104px]">
          <Cover
            cover={item.cover}
            title={item.title}
            label={item.source?.name ?? category}
            year={item.year}
            sizes="104px"
          />
        </div>

        {/* ISI */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* KATEGORI + INDEKS, TAHUN */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[#EEF4EA] px-2.5 py-1 text-[10.5px] font-semibold leading-none text-[#31551F]">
                {category}
              </span>

              {item.index && (
                <span className="rounded-full bg-[#31551F] px-2.5 py-1 text-[10.5px] font-semibold leading-none text-white">
                  {item.index}
                </span>
              )}
            </div>

            <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#667360]">
              <CalendarDays size={13} strokeWidth={1.8} aria-hidden />
              {item.year}
            </span>
          </div>

          {/* JUDUL */}
          <h4 className="mt-3 line-clamp-2 text-[14.5px] font-semibold leading-[1.5] tracking-[-0.005em] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F] md:text-[16px]">
            {item.title}
          </h4>

          {/* PENULIS & JURNAL (satu baris, satu garis pemisah) */}
          {(item.authors || item.source) && (
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] leading-[1.6] text-[#4A5646]">
              {item.authors && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Users
                    size={14}
                    strokeWidth={1.7}
                    aria-hidden
                    className="shrink-0 text-[#3F6B28]"
                  />
                  <span className="line-clamp-1">{item.authors}</span>
                </span>
              )}

              {item.source && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Library
                    size={14}
                    strokeWidth={1.7}
                    aria-hidden
                    className="shrink-0 text-[#3F6B28]"
                  />
                  <span className="line-clamp-1 font-medium text-[#2F3B2A]">
                    {item.source.name}
                  </span>
                </span>
              )}
            </p>
          )}

          {/* RINGKASAN */}
          {item.description && (
            <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-[1.7] text-[#667360]">
              {item.description}
            </p>
          )}

          {/* BARIS BAWAH: rincian jurnal + ajakan */}
          <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-[#E7EDE3] pt-3">
            <span className="line-clamp-1 text-[11.5px] text-[#667360]">
              {item.source?.detail}
            </span>

            <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[#31551F]">
              Lihat Detail
              <ArrowRight
                size={14}
                strokeWidth={2}
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

/* =========================================================
   TAMPILAN DETAIL PUBLIKASI
   Dibuka dari kartu di daftar: /publikasi#detail-<slug>
========================================================= */

function PanelHeader({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-[#D9E2D3] pb-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
        <Icon size={19} strokeWidth={1.8} aria-hidden />
      </span>
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1F2A1A]">
        {title}
      </h2>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3.5 border-b border-[#E7EDE3] py-4 first:pt-0 last:border-b-0 last:pb-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF4EA] text-[#31551F]">
        <Icon size={16} strokeWidth={1.8} aria-hidden />
      </span>

      <div className="min-w-0">
        <p className="text-[11.5px] font-medium text-[#667360]">{label}</p>
        <p className="mt-0.5 break-words text-[13.5px] font-semibold leading-snug text-[#1F2A1A]">
          {value}
        </p>
      </div>
    </div>
  );
}

function PublicationDetail({
  item,
  all,
  onBack,
}: {
  item: PublicationEntry;
  all: PublicationEntry[];
  onBack: () => void;
}) {
  const { names, hasMore } = parseAuthors(item.authors);

  /* publikasi lain: kategori yang sama dulu */
  const others = all
    .filter((other) => getId(other) !== getId(item))
    .sort(
      (a, b) =>
        Number(b.category === item.category) -
        Number(a.category === item.category)
    )
    .slice(0, 3);

  return (
    <>
      {/* TOMBOL KEMBALI, SAMPUL, JUDUL */}
      <section className="bg-white pt-8 md:pt-10">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-2 rounded-lg text-[13px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#31551F]"
          >
            <ArrowLeft
              size={15}
              strokeWidth={2}
              aria-hidden
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
            Kembali ke Daftar Publikasi
          </button>

          <Reveal className="mt-6">
            <div className="grid gap-6 md:grid-cols-[200px_1fr] md:gap-10">
              {/* SAMPUL (portrait 3:4) */}
              <div className="mx-auto w-[160px] md:mx-0 md:w-[200px]">
                <Cover
                  cover={item.cover}
                  title={item.title}
                  label={item.source?.name ?? item.category}
                  year={item.year}
                  sizes="200px"
                />
              </div>

              {/* JUDUL + RINGKAS */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg bg-[#EEF4EA] px-3 py-1 text-[11.5px] font-semibold text-[#31551F]">
                    {item.category}
                  </span>

                  {item.index && (
                    <span className="rounded-lg bg-[#31551F] px-3 py-1 text-[11.5px] font-semibold text-white">
                      {item.index}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#667360]">
                    <CalendarDays size={14} strokeWidth={2} aria-hidden />
                    {item.year}
                  </span>
                </div>

                <h1 className="mt-4 max-w-[900px] text-[19px] font-semibold leading-[1.4] tracking-[-0.015em] text-[#1F2A1A] sm:text-[21px] md:text-[24px]">
                  {item.title}
                </h1>

                {item.authors && (
                  <p className="mt-4 text-[13.5px] leading-[1.7] text-[#667360]">
                    Penulis:{" "}
                    <span className="font-semibold text-[#1F2A1A]">
                      {names.join(", ")}
                      {hasMore ? ", dan lainnya" : ""}
                    </span>
                  </p>
                )}

                {item.source && (
                  <p className="mt-1.5 text-[13.5px] leading-[1.7] text-[#667360]">
                    Sumber:{" "}
                    <span className="font-semibold text-[#1F2A1A]">
                      {item.source.name}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ISI */}
      <section className="bg-white pb-14 pt-10 md:pb-20 md:pt-12">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <div className="grid gap-6 border-t border-[#D9E2D3] pt-10 md:pt-12 lg:grid-cols-[1.7fr_1fr] lg:gap-8">
            {/* KOLOM KIRI */}
            <div className="space-y-6">
              {item.description && (
                <Reveal>
                  <div className="rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-8">
                    <PanelHeader icon={FileText} title="Ringkasan" />

                    <p className="text-[14px] leading-[1.9] text-[#667360]">
                      {item.description}
                    </p>
                  </div>
                </Reveal>
              )}

              {names.length > 0 && (
                <Reveal delay={80}>
                  <div className="rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-8">
                    <PanelHeader
                      icon={Users}
                      title={`Penulis (${names.length}${hasMore ? "+" : ""})`}
                    />

                    <ul>
                      {names.map((name, index) => (
                        <li
                          key={`${name}-${index}`}
                          className="flex items-center gap-4 border-b border-[#E7EDE3] py-3.5 first:pt-0 last:border-b-0 last:pb-0"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#31551F] text-[12.5px] font-semibold text-white">
                            {getInitials(name)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium leading-snug text-[#2F3B2A]">
                              {name}
                            </span>
                            <span className="mt-0.5 block text-[11.5px] text-[#667360]">
                              {index === 0 ? "Penulis utama" : "Anggota"}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>

                    {hasMore && (
                      <p className="mt-4 border-t border-[#E7EDE3] pt-4 text-[12.5px] text-[#667360]">
                        Masih ada penulis lain yang belum ditampilkan.
                      </p>
                    )}
                  </div>
                </Reveal>
              )}
            </div>

            {/* KOLOM KANAN */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Reveal delay={120}>
                <div className="rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-7">
                  <PanelHeader icon={Layers} title="Informasi Publikasi" />

                  <div>
                    <InfoRow
                      icon={Layers}
                      label="Jenis Publikasi"
                      value={item.category}
                    />
                    {item.index && (
                      <InfoRow icon={Tag} label="Indeks" value={item.index} />
                    )}
                    <InfoRow
                      icon={CalendarDays}
                      label="Tahun"
                      value={item.year}
                    />
                    {item.source && (
                      <InfoRow
                        icon={Library}
                        label="Sumber"
                        value={item.source.name}
                      />
                    )}
                    {item.source?.detail && (
                      <InfoRow
                        icon={BookOpen}
                        label="Rincian"
                        value={item.source.detail}
                      />
                    )}
                  </div>
                </div>
              </Reveal>
            </aside>
          </div>

          {/* PUBLIKASI LAINNYA */}
          {others.length > 0 && (
            <div className="mt-14 border-t border-[#D9E2D3] pt-10 md:mt-16 md:pt-12">
              <Reveal>
                <h2 className="text-[21px] font-bold leading-[1.3] tracking-[-0.02em] text-[#31551F] sm:text-[24px]">
                  Publikasi Lainnya
                </h2>
              </Reveal>

              <ul className="mt-6 grid gap-4 md:grid-cols-3">
                {others.map((other, index) => (
                  <li key={getId(other)}>
                    <Reveal delay={index * 90} className="h-full">
                      <a
                        href={other.href ?? getDetailHash(other)}
                        {...(other.href
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="group flex h-full flex-col rounded-2xl border border-[#D9E2D3] bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[#EEF4EA] px-2 py-0.5 text-[11px] font-semibold text-[#3F6B28]">
                            {other.category}
                          </span>
                          <span className="text-[11.5px] font-medium text-[#667360]">
                            {other.year}
                          </span>
                        </span>

                        <span className="mt-3 line-clamp-3 block text-[14px] font-semibold leading-[1.55] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
                          {other.title}
                        </span>

                        <span className="mt-auto flex justify-end pt-4">
                          <ChevronRight
                            size={16}
                            strokeWidth={2.2}
                            aria-hidden
                            className="text-[#31551F] transition-transform duration-300 group-hover:translate-x-1"
                          />
                        </span>
                      </a>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* =========================================================
   HALAMAN PUBLIKASI
   - tampilan daftar  : /publikasi
   - tampilan detail  : /publikasi#detail-<slug>
     (dalam satu file, tombol Kembali / tombol back browser
      mengembalikan ke daftar, filter tetap tersimpan)
========================================================= */

export default function PublikasiPage() {
  const [search, setSearch] = useState("");
  const [publicationType, setPublicationType] = useState("Semua Publikasi");
  const [year, setYear] = useState("Semua Tahun");

  const [entries, setEntries] = useState<PublicationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prevSelected = useRef<string | null>(null);

  /* ambil data publikasi dari API */
  const loadPublications = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch(`${API_URL}/publikasi`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error("Gagal memuat data publikasi.");

      const result: { data: ApiPublication[] } = await response.json();
      setEntries(result.data.map(toEntry));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Gagal memuat data publikasi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublications();
  }, [loadPublications]);

  const publications = useMemo(() => groupByCategory(entries), [entries]);

  /* baca id detail dari hash URL (juga untuk tombol back/forward browser) */
  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash;
      setSelectedId(
        hash.startsWith(DETAIL_HASH)
          ? decodeURIComponent(hash.slice(DETAIL_HASH.length))
          : null
      );
    };

    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  /* atur posisi scroll saat pindah daftar <-> detail */
  useEffect(() => {
    if (selectedId) {
      jumpTo(null);
    } else if (prevSelected.current) {
      jumpTo(document.getElementById("publikasi"));
    }
    prevSelected.current = selectedId;
  }, [selectedId]);

  const closeDetail = () => {
    window.location.hash = "publikasi";
  };

  const selected = entries.find((item) => getId(item) === selectedId);

  /*
   * Mengambil semua tahun yang tersedia dari data publikasi.
   * Jadi ketika data asli ditambahkan, pilihan tahun akan
   * otomatis ikut bertambah.
   */
  const publicationYears = useMemo(() => {
    const years = publications.flatMap((publication) =>
      publication.items.map((item) => item.year)
    );

    return [
      "Semua Tahun",
      ...Array.from(new Set(years)).sort((a, b) => b.localeCompare(a)),
    ];
  }, [publications]);

  /*
   * Filter publikasi berdasarkan:
   * 1. Jenis publikasi
   * 2. Tahun
   * 3. Kata kunci pencarian
   */
  const filteredPublications = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return publications
      .map((publication) => {
        const categoryMatches =
          publicationType === "Semua Publikasi" ||
          publication.category === publicationType;

        if (!categoryMatches) {
          return { ...publication, items: [] };
        }

        const filteredItems = publication.items.filter((item) => {
          const matchSearch =
            keyword === "" ||
            item.title.toLowerCase().includes(keyword) ||
            (item.authors ?? "").toLowerCase().includes(keyword) ||
            (item.source?.name ?? "").toLowerCase().includes(keyword) ||
            (item.description ?? "").toLowerCase().includes(keyword);

          const matchYear = year === "Semua Tahun" || item.year === year;

          return matchSearch && matchYear;
        });

        return { ...publication, items: filteredItems };
      })
      .filter((publication) => publication.items.length > 0);
  }, [publications, search, publicationType, year]);

  const totalResults = filteredPublications.reduce(
    (total, publication) => total + publication.items.length,
    0
  );

  const hasActiveFilter =
    search !== "" ||
    publicationType !== "Semua Publikasi" ||
    year !== "Semua Tahun";

  const resetFilters = () => {
    setSearch("");
    setPublicationType("Semua Publikasi");
    setYear("Semua Tahun");
  };

  return (
    <main
      className={`${poppins.className} overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {selected ? (
        <PublicationDetail
          key={getId(selected)}
          item={selected}
          all={entries}
          onBack={closeDetail}
        />
      ) : (
        <>
      {/* =====================================================
          HERO (sama dengan hero halaman HKI)
      ====================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#3F6B28] via-[#31551F] to-[#213B14] text-white">
        {/* cahaya hijau lembut */}
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#8DC26F]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#8DC26F]/15 blur-3xl" />

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
                Publikasi
              </span>
            </nav>

            <h1 className="text-[36px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[44px] md:text-[52px]">
              Publikasi
            </h1>

            <p className="mx-auto mt-5 max-w-[580px] text-[14px] font-normal leading-[1.8] text-white/85 sm:text-[15px]">
              Informasi publikasi hasil penelitian, pengabdian, dan karya
              ilmiah sivitas akademika Politeknik Negeri Batam.
            </p>

            {/* pintasan */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              <a
                href="#publikasi"
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Daftar Publikasi
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#31551F] via-[#8DC26F] to-[#31551F]" />
      </section>

      {/* =====================================================
          DAFTAR PUBLIKASI
      ====================================================== */}
      <section id="publikasi" className="scroll-mt-20 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Publikasi P2M"
            title="Publikasi"
            description="Daftar publikasi dan karya ilmiah yang berkaitan dengan penelitian dan pengabdian kepada masyarakat."
          />

          {/* ---------- FILTER ---------- */}
          <Reveal>
            <div className="rounded-2xl border border-[#D9E2D3] bg-white p-4 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-5">
              {/* pencarian + tahun */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px]">
                <div>
                  <FieldLabel htmlFor="filter-cari">Pencarian</FieldLabel>

                  <div className="relative">
                    <Search
                      size={16}
                      strokeWidth={1.8}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#667360]"
                    />

                    <input
                      id="filter-cari"
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari judul, penulis, atau nama jurnal..."
                      className="h-10 w-full rounded-xl border border-[#D9E2D3] bg-white pl-11 pr-4 text-[13.5px] text-[#1F2A1A] outline-none transition-all duration-300 placeholder:text-[#A3AE9E] hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA]"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="filter-tahun">Tahun</FieldLabel>

                  <SelectField
                    id="filter-tahun"
                    value={year}
                    options={publicationYears}
                    onChange={setYear}
                  />
                </div>
              </div>

              {/* jenis publikasi sebagai tombol pilihan */}
              <div className="mt-4 border-t border-[#E7EDE3] pt-4">
                <FieldLabel>Jenis Publikasi</FieldLabel>

                <div
                  role="group"
                  aria-label="Jenis publikasi"
                  className="flex flex-wrap gap-2"
                >
                  {publicationTypes.map((type) => {
                    const isActive = type === publicationType;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPublicationType(type)}
                        aria-pressed={isActive}
                        className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] ${
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
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-[13px] text-[#667360]">
              Menampilkan{" "}
              <span className="font-semibold text-[#1F2A1A]">
                {totalResults}
              </span>{" "}
              publikasi
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

          {/* ---------- KELOMPOK PUBLIKASI ---------- */}
          {loading ? (
            <p className="mt-10 text-center text-[13.5px] text-[#667360]">
              Memuat data publikasi...
            </p>
          ) : loadError ? (
            <div className="mt-8 rounded-2xl border border-[#D9E2D3] bg-white px-6 py-14 text-center">
              <p className="text-[15px] font-semibold text-[#1F2A1A]">
                {loadError}
              </p>

              <button
                type="button"
                onClick={loadPublications}
                className="mt-5 rounded-md bg-[#31551F] px-5 py-3 text-[13px] font-semibold text-white transition-colors duration-300 hover:bg-[#3F6B28]"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredPublications.length > 0 ? (
            <div className="mt-6 space-y-12">
              {filteredPublications.map((publication) => (
                <section key={publication.category}>
                  {/* HEADER KATEGORI */}
                  <Reveal>
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
                        <BookOpen size={19} strokeWidth={1.8} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1F2A1A]">
                          {publication.category}
                        </h3>
                        <p className="mt-0.5 text-[11.5px] text-[#667360]">
                          {publication.items.length} publikasi
                        </p>
                      </div>

                      {/* hanya muncul saat belum difilter per jenis */}
                      {publicationType === "Semua Publikasi" && (
                        <button
                          type="button"
                          onClick={() =>
                            setPublicationType(publication.category)
                          }
                          className="group inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28]"
                        >
                          Lihat Semua
                          <ChevronRight
                            size={15}
                            strokeWidth={2.2}
                            aria-hidden
                            className="transition-transform duration-300 group-hover:translate-x-1"
                          />
                        </button>
                      )}
                    </div>
                  </Reveal>

                  {/* DAFTAR KARTU */}
                  <div className="grid gap-4">
                    {publication.items.map((item, index) => (
                      <Reveal
                        key={`${publication.category}-${item.title}`}
                        delay={index * 80}
                      >
                        <PublicationCard
                          item={item}
                          category={publication.category}
                        />
                      </Reveal>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            /* DATA KOSONG */
            <Reveal>
              <div className="mt-8 rounded-2xl border border-[#D9E2D3] bg-white px-6 py-14 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
                  <Search size={26} strokeWidth={1.6} />
                </span>

                <p className="mt-5 text-[16px] font-semibold text-[#1F2A1A]">
                  Publikasi tidak ditemukan
                </p>

                <p className="mx-auto mt-2 max-w-[420px] text-[13.5px] leading-[1.75] text-[#667360]">
                  {entries.length === 0
                    ? "Belum ada publikasi yang dipublikasikan."
                    : "Tidak ada publikasi yang sesuai dengan jenis, tahun, atau kata kunci yang dipilih."}
                </p>

                {entries.length > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="group mt-6 inline-flex items-center gap-2 rounded-md bg-[#31551F] px-5 py-3 text-[13px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                >
                  Reset Filter
                  <ArrowRight
                    size={15}
                    strokeWidth={1.8}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </button>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* =====================================================
          AJAKAN (kartu hijau bertitik yang ringkas, di dalam
          section putih supaya ada jarak sebelum footer hijau)
      ====================================================== */}
      <section className="bg-white pb-16 pt-2 md:pb-20 md:pt-4">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <Reveal>
            <div
              className="relative overflow-hidden rounded-2xl bg-[#31551F] px-6 py-8 text-white md:px-8 md:py-9"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#8DC26F]/15 blur-3xl" />

              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
                <div className="max-w-[560px]">
                  <h2 className="text-[20px] font-bold leading-[1.25] tracking-[-0.02em] md:text-[22px]">
                    Temukan Publikasi Polibatam
                  </h2>

                  <p className="mt-2 text-[13px] leading-[1.7] text-white/80">
                    Akses berbagai publikasi hasil penelitian, pengabdian, dan
                    karya ilmiah sivitas akademika Politeknik Negeri Batam.
                  </p>
                </div>

                <a
                  href="#publikasi"
                  className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-md bg-white px-4 py-2.5 text-[12.5px] font-semibold text-[#31551F] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Lihat Publikasi
                  <ArrowRight
                    size={14}
                    strokeWidth={1.8}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

        </>
      )}

      {/* =====================================================
          ANIMASI (sama dengan Beranda)
      ====================================================== */}

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