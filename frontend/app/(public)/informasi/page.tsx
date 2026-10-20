"use client";

import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Megaphone,
  Search,
  User,
  type LucideIcon,
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
========================================================= */

/* =========================================================
   DATA
========================================================= */

const PER_PAGE = 6;

/* Data informasi diambil dari API Laravel (diisi lewat halaman admin).
   - id      : dipakai sebagai alamat detail (/informasi#detail-<id>)
   - image   : gambar dari admin (opsional); kalau kosong tampil latar hijau
   - author  : opsional, penulis (default "P3M")
   - content : isi informasi berupa blok:
               { type: "p", text }              paragraf
               { type: "list", items: [...] }   daftar poin
               { type: "table", head, rows }    tabel (mis. jadwal)
               Kalau kosong, detail menampilkan "sedang disiapkan".
   - files   : opsional, lampiran / tautan (buku panduan, pdf, dll) */
type ContentBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; head: [string, string]; rows: [string, string][] };

type InfoFile = { label: string; href: string };

type Information = {
  id: string;
  title: string;
  category: string;
  date: string; // tampilan: "12 September 2026"
  dateValue: string; // untuk mengurutkan: "2026-09-12"
  image: string;
  author?: string;
  content?: ContentBlock[];
  files?: InfoFile[];
};

/* Bentuk data dari API Laravel */
type ApiInformation = {
  id: number;
  judul: string;
  kategori: string;
  tanggal: string;
  penulis: string | null;
  isi: ContentBlock[] | null;
  lampiran: { label: string; href: string }[] | null;
  gambar: string | null;
};

/* Atur NEXT_PUBLIC_API_URL di .env.local, contoh:
   NEXT_PUBLIC_API_URL=http://localhost:8000/api */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const BASE_URL = API_URL.replace(/\/api\/?$/, "");

/* Jaga-jaga kalau API mengirim path relatif, bukan URL lengkap */
function imageUrl(path: string | null): string {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return `${BASE_URL}/storage/${path.replace(/^\/?(storage\/)?/, "")}`;
}

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

/* "2026-09-12" -> "12 September 2026" */
function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1] ?? ""} ${year}`;
}

function fromApi(item: ApiInformation): Information {
  return {
    id: String(item.id),
    title: item.judul,
    category: item.kategori,
    date: formatDate(item.tanggal),
    dateValue: item.tanggal,
    image: imageUrl(item.gambar),
    author: item.penulis || undefined,
    content: item.isi ?? [],
    files: (item.lampiran ?? [])
      .filter((file) => file.href)
      .map((file) => ({ label: file.label, href: file.href })),
  };
}

/* Pengumuman dan Agenda adalah kategori di Informasi (diisi lewat admin
   Informasi). Nama kategori harus sama dengan pilihan di admin dan
   dengan KATEGORI di InformasiController. */
const ANNOUNCEMENT_CATEGORY = "Pengumuman";
const AGENDA_CATEGORY = "Agenda";

/* jumlah item yang tampil di panel */
const ANNOUNCEMENT_LIMIT = 4;
const AGENDA_LIMIT = 3;

/* Daftar kategori untuk filter "Semua Informasi".
   "Pengumuman" dan "Agenda" sengaja tidak ada di sini: keduanya hanya
   tampil di panel Pengumuman & Agenda, tidak di daftar Semua Informasi.
   Pilihan kategori di halaman admin tetap menyertakan keduanya. */
const categories = [
  "Semua",
  "Informasi",
  "Kegiatan",
  "Penelitian",
  "Pengabdian",
  "Panduan",
];

/* kategori yang hanya tampil di panel Pengumuman & Agenda */
const PANEL_CATEGORIES = [ANNOUNCEMENT_CATEGORY, AGENDA_CATEGORY];

/* angka waktu dari "2026-09-12" supaya bisa diurutkan */
function parseDate(value: string) {
  return new Date(value).getTime();
}

/* ringkasan = paragraf pertama isi informasi, dipotong */
function makeExcerpt(blocks: ContentBlock[] | undefined, max = 90) {
  const first = (blocks ?? []).find(
    (block) => block.type === "p" && block.text.trim()
  );

  if (!first || first.type !== "p") return "";

  const text = first.text.trim().replace(/\s+/g, " ");

  return text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text;
}

const DETAIL_HASH = "#detail-";

function getId(item: Information) {
  return item.id;
}

function getDetailHash(item: Information) {
  return `${DETAIL_HASH}${encodeURIComponent(getId(item))}`;
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

/* Daftar nomor halaman, dengan "..." jika halaman banyak */
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");

  pages.push(total);
  return pages;
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
   ANIMASI "TIMBUL" (sama persis dengan Beranda)
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
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3F6B28] sm:text-[12px]">
          {eyebrow}
        </p>
      )}

      <h2 className="max-w-[720px] text-[24px] font-bold leading-[1.25] tracking-[-0.02em] text-[#1F2A1A] sm:text-[28px] md:text-[32px]">
        {title}
      </h2>

      {description && (
        <p className="mt-3 max-w-[620px] text-[13px] leading-[1.8] text-[#667360] sm:text-[14px]">
          {description}
        </p>
      )}
    </Reveal>
  );
}

/* Kepala panel (ikon + judul), sama dengan Beranda */
function PanelHeader({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="mb-1 flex items-center gap-3 border-b border-[#D9E2D3] pb-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
        <Icon size={19} strokeWidth={1.8} />
      </span>
      <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1F2A1A]">
        {title}
      </h3>
    </div>
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
        className="h-11 w-full appearance-none rounded-xl border border-[#D9E2D3] bg-white px-4 pr-10 text-[13px] text-[#1F2A1A] outline-none transition-all duration-300 hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA]"
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

/* Foto informasi: gambar dari Laravel, atau latar hijau kalau belum ada.
   Induknya harus relative dan punya ukuran (aspect ratio). */
function Photo({
  src,
  alt,
  sizes,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#3F6B28] via-[#31551F] to-[#213B14] text-white/60">
        <FileText size={34} strokeWidth={1.4} aria-hidden />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}

/* =========================================================
   PENGUMUMAN & AGENDA
   Datanya dari Informasi dengan kategori "Pengumuman" dan "Agenda"
   (diisi lewat admin Informasi). Dua panel berdampingan, di layar
   kecil jadi atas-bawah. Klik item -> buka detailnya.
========================================================= */

const panelClass =
  "flex h-full flex-col rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-7";

const rowClass =
  "group flex w-full items-center gap-4 border-b border-[#E7EDE3] py-4 text-left last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]";

const rowTitleClass =
  "block line-clamp-2 text-[13.5px] font-medium leading-snug text-[#2F3B2A] transition-colors duration-300 group-hover:text-[#31551F]";

const rowChevronClass =
  "shrink-0 text-[#A3AE9E] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#31551F]";

const panelLinkClass =
  "group mt-auto inline-flex items-center gap-1.5 pt-5 text-[13px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#31551F]";

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <p className="py-8 text-center text-[13px] leading-[1.8] text-[#667360]">
      {children}
    </p>
  );
}

function AnnouncementAgendaSection({
  entries,
  loading,
  loadError,
}: {
  entries: Information[];
  loading: boolean;
  loadError: string;
}) {
  /* tombol "Lihat semua" membuka sisa item langsung di panel */
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [showAllAgendas, setShowAllAgendas] = useState(false);

  /* terbaru di atas */
  const newestFirst = (a: Information, b: Information) =>
    parseDate(b.dateValue) - parseDate(a.dateValue);

  const announcements = entries
    .filter((item) => item.category === ANNOUNCEMENT_CATEGORY)
    .sort(newestFirst);

  const agendas = entries
    .filter((item) => item.category === AGENDA_CATEGORY)
    .sort(newestFirst);

  const visibleAnnouncements = showAllAnnouncements
    ? announcements
    : announcements.slice(0, ANNOUNCEMENT_LIMIT);

  const visibleAgendas = showAllAgendas
    ? agendas
    : agendas.slice(0, AGENDA_LIMIT);

  const emptyText = (name: string) =>
    loading
      ? "Memuat..."
      : loadError
        ? loadError
        : `Belum ada ${name}.`;

  return (
    <section
      id="pengumuman-agenda"
      className="scroll-mt-20 bg-[#F6F9F3] py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1120px] px-5 md:px-7">
        <SectionTitle
          eyebrow="Pengumuman & Agenda"
          title="Pengumuman dan Agenda Kegiatan"
          description="Pengumuman resmi dan agenda kegiatan terbaru dari P2M Politeknik Negeri Batam."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* PENGUMUMAN */}
          <Reveal className="h-full">
            <div className={panelClass}>
              <PanelHeader icon={Megaphone} title="Pengumuman" />

              {announcements.length > 0 ? (
                <div>
                  {visibleAnnouncements.map((item, index) => (
                    <a
                      key={getId(item)}
                      href={getDetailHash(item)}
                      className={rowClass}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#31551F] text-[12.5px] font-semibold text-white transition-transform duration-300 group-hover:scale-105">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className={rowTitleClass}>{item.title}</span>
                        <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[#667360]">
                          <CalendarDays
                            size={12}
                            strokeWidth={1.8}
                            aria-hidden
                            className="text-[#3F6B28]"
                          />
                          {item.date}
                        </span>
                      </span>

                      <ChevronRight
                        size={18}
                        strokeWidth={2}
                        aria-hidden
                        className={rowChevronClass}
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <PanelMessage>{emptyText("pengumuman")}</PanelMessage>
              )}

              {announcements.length > ANNOUNCEMENT_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllAnnouncements((current) => !current)}
                  aria-expanded={showAllAnnouncements}
                  className={panelLinkClass}
                >
                  {showAllAnnouncements
                    ? "Tampilkan lebih sedikit"
                    : "Lihat semua pengumuman"}
                  <ChevronDown
                    size={15}
                    strokeWidth={2}
                    aria-hidden
                    className={`transition-transform duration-300 ${
                      showAllAnnouncements ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>
          </Reveal>

          {/* AGENDA KEGIATAN */}
          <Reveal delay={80} className="h-full">
            <div className={panelClass}>
              <PanelHeader icon={CalendarDays} title="Agenda Kegiatan" />

              {agendas.length > 0 ? (
                <div>
                  {visibleAgendas.map((item) => {
                    const excerpt = makeExcerpt(item.content);

                    return (
                      <a
                        key={getId(item)}
                        href={getDetailHash(item)}
                        className={rowClass}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F] transition-colors duration-300 group-hover:bg-[#31551F] group-hover:text-white">
                          <CalendarDays size={18} strokeWidth={1.8} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className={rowTitleClass}>{item.title}</span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] leading-5 text-[#667360]">
                            <span className="rounded-md bg-[#EEF4EA] px-2 py-0.5 font-medium text-[#3F6B28]">
                              {item.date}
                            </span>
                            {excerpt && (
                              <span className="line-clamp-1">{excerpt}</span>
                            )}
                          </span>
                        </span>

                        <ChevronRight
                          size={18}
                          strokeWidth={2}
                          aria-hidden
                          className={rowChevronClass}
                        />
                      </a>
                    );
                  })}
                </div>
              ) : (
                <PanelMessage>{emptyText("agenda")}</PanelMessage>
              )}

              {agendas.length > AGENDA_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllAgendas((current) => !current)}
                  aria-expanded={showAllAgendas}
                  className={panelLinkClass}
                >
                  {showAllAgendas
                    ? "Tampilkan lebih sedikit"
                    : "Lihat semua agenda"}
                  <ChevronDown
                    size={15}
                    strokeWidth={2}
                    aria-hidden
                    className={`transition-transform duration-300 ${
                      showAllAgendas ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   TAMPILAN DETAIL INFORMASI
   Dibuka dari kartu di daftar: /informasi#detail-<slug>
========================================================= */

function InformationDetail({
  item,
  entries,
  onBack,
}: {
  item: Information;
  entries: Information[];
  onBack: () => void;
}) {
  /* informasi lain: kategori yang sama dulu, lalu yang terbaru */
  const others = entries
    .filter((other) => getId(other) !== getId(item))
    .sort(
      (a, b) =>
        Number(b.category === item.category) -
          Number(a.category === item.category) ||
        parseDate(b.dateValue) - parseDate(a.dateValue)
    )
    .slice(0, 3);

  return (
    <>
      {/* TOMBOL KEMBALI, FOTO, JUDUL */}
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
            Kembali ke Daftar Informasi
          </button>

          <Reveal className="mt-5">
            {/* FOTO (tampil 16:9; gambar dari admin bebas format dan resolusi) */}
            <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden rounded-2xl border border-[#D9E2D3] bg-[#EEF4EA] shadow-[0_8px_30px_rgba(31,42,26,0.05)]">
              <Photo
                src={item.image}
                alt={item.title}
                priority
                sizes="(max-width: 1120px) 100vw, 1120px"
                className="object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={80} className="mt-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-[#31551F] px-3 py-1 text-[11.5px] font-semibold text-white">
                {item.category}
              </span>

              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#667360]">
                <CalendarDays size={14} strokeWidth={2} aria-hidden />
                {item.date}
              </span>

              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#667360]">
                <User size={14} strokeWidth={2} aria-hidden />
                {item.author ?? "P3M"}
              </span>
            </div>

            <h1 className="mt-4 max-w-[900px] text-[19px] font-semibold leading-[1.4] tracking-[-0.015em] text-[#1F2A1A] sm:text-[21px] md:text-[24px]">
              {item.title}
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ISI */}
      <section className="bg-white pb-14 pt-10 md:pb-20 md:pt-12">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          {/* DESKRIPSI: tulisan biasa tanpa kartu */}
          <div className="border-t border-[#D9E2D3] pt-10 md:pt-12">
            <Reveal>
              <div className="max-w-[860px]">
                {item.content && item.content.length > 0 ? (
                  <div className="space-y-4">
                    {item.content.map((block, index) => {
                      if (block.type === "list") {
                        return (
                          <ul key={index} className="space-y-2">
                            {block.items.map((li, liIndex) => (
                              <li
                                key={liIndex}
                                className="flex gap-3 text-[14px] leading-[1.8] text-[#667360]"
                              >
                                <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#31551F]" />
                                {li}
                              </li>
                            ))}
                          </ul>
                        );
                      }

                      if (block.type === "table") {
                        return (
                          <div
                            key={index}
                            className="overflow-x-auto rounded-xl border border-[#D9E2D3]"
                          >
                            <table className="w-full min-w-[420px] text-left text-[13px]">
                              <thead className="bg-[#EEF4EA] text-[#31551F]">
                                <tr>
                                  {block.head.map((h, hIndex) => (
                                    <th
                                      key={hIndex}
                                      className="px-4 py-3 font-semibold"
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {block.rows.map((row, rowIndex) => (
                                  <tr
                                    key={rowIndex}
                                    className="border-t border-[#E7EDE3]"
                                  >
                                    <td className="px-4 py-3 font-medium text-[#1F2A1A]">
                                      {row[0]}
                                    </td>
                                    <td className="px-4 py-3 text-[#667360]">
                                      {row[1]}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }

                      return (
                        <p
                          key={index}
                          className="text-[14px] leading-[1.9] text-[#667360]"
                        >
                          {block.text}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[14px] leading-[1.9] text-[#667360]">
                    Isi lengkap informasi ini sedang disiapkan.
                  </p>
                )}
              </div>
            </Reveal>

            {/* LAMPIRAN */}
            {item.files && item.files.length > 0 && (
              <Reveal delay={100} className="mt-10">
                <div className="max-w-[860px]">
                  <h2 className="text-[16px] font-semibold text-[#1F2A1A]">
                    Lampiran
                  </h2>

                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {item.files.map((file, fileIndex) => (
                      <li key={fileIndex}>
                        <a
                          href={file.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex h-full items-start gap-3 rounded-xl border border-[#D9E2D3] p-4 text-[13px] font-medium leading-snug text-[#1F2A1A] transition-colors duration-300 hover:border-[#8DC26F] hover:bg-[#F6F9F3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                        >
                          <Download
                            size={16}
                            strokeWidth={2}
                            aria-hidden
                            className="mt-0.5 shrink-0 text-[#31551F]"
                          />
                          {file.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}
          </div>

          {/* INFORMASI LAINNYA */}
          {others.length > 0 && (
            <div className="mt-14 border-t border-[#D9E2D3] pt-10 md:mt-16 md:pt-12">
              <Reveal>
                <h2 className="text-[21px] font-bold leading-[1.3] tracking-[-0.02em] text-[#31551F] sm:text-[24px]">
                  Informasi Lainnya
                </h2>
              </Reveal>

              <ul className="mt-6 grid gap-5 md:grid-cols-3">
                {others.map((other, index) => (
                  <li key={getId(other)}>
                    <Reveal delay={index * 90} className="h-full">
                      <a
                        href={getDetailHash(other)}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                      >
                        <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[#EEF4EA]">
                          <Photo
                            src={other.image}
                            alt={other.title}
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </span>

                        <span className="flex flex-1 flex-col p-5">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-[#EEF4EA] px-2 py-0.5 text-[11px] font-semibold text-[#3F6B28]">
                              {other.category}
                            </span>
                            <span className="text-[11.5px] font-medium text-[#667360]">
                              {other.date}
                            </span>
                          </span>

                          <span className="mt-3 line-clamp-2 block text-[14px] font-semibold leading-[1.55] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
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
   HALAMAN INFORMASI
   - tampilan daftar  : /informasi
   - tampilan detail  : /informasi#detail-<slug>
     (dalam satu file, tombol Kembali / tombol back browser
      mengembalikan ke daftar, filter tetap tersimpan)
========================================================= */

export default function InformasiPage() {
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prevSelected = useRef<string | null>(null);

  /* data informasi dari API */
  const [entries, setEntries] = useState<Information[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/informasi`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`Kode ${res.status}`);

        const json = await res.json();

        if (!cancelled) {
          setEntries(((json.data ?? []) as ApiInformation[]).map(fromApi));
          setLoadError("");
        }
      } catch {
        if (!cancelled) setLoadError("Data informasi gagal dimuat.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

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
      jumpTo(document.getElementById("daftar-informasi"));
    }
    prevSelected.current = selectedId;
  }, [selectedId]);

  const closeDetail = () => {
    window.location.hash = "daftar-informasi";
  };

  const selected = entries.find((item) => getId(item) === selectedId);

  /* daftar "Semua Informasi" tidak memuat Pengumuman dan Agenda
     (keduanya hanya tampil di panel Pengumuman & Agenda) */
  const listEntries = useMemo(
    () => entries.filter((item) => !PANEL_CATEGORIES.includes(item.category)),
    [entries]
  );

  const filteredInformations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return listEntries
      .filter((item) => {
        const matchCategory = category === "Semua" || item.category === category;
        const matchSearch =
          keyword === "" ||
          item.title.toLowerCase().includes(keyword) ||
          item.category.toLowerCase().includes(keyword);

        return matchCategory && matchSearch;
      })
      .sort((a, b) =>
        newestFirst
          ? parseDate(b.dateValue) - parseDate(a.dateValue)
          : parseDate(a.dateValue) - parseDate(b.dateValue)
      );
  }, [listEntries, category, search, newestFirst]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInformations.length / PER_PAGE)
  );
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredInformations.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );

  const hasActiveFilter = category !== "Semua" || search !== "";

  const scrollToList = () => {
    document
      .getElementById("daftar-informasi")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const changeCategory = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const resetFilters = () => {
    setCategory("Semua");
    setSearch("");
    setPage(1);
  };

  const changePage = (value: number) => {
    setPage(value);
    scrollToList();
  };

  /* teks keadaan kosong */
  const emptyTitle = loading
    ? "Memuat informasi..."
    : loadError
      ? loadError
      : listEntries.length === 0
        ? "Belum ada informasi"
        : "Informasi tidak ditemukan";

  const emptyDescription =
    listEntries.length === 0 && !loading && !loadError
      ? "Informasi akan tampil di sini setelah ditambahkan oleh admin."
      : hasActiveFilter
        ? "Tidak ada informasi yang sesuai dengan kategori atau kata kunci yang dipilih."
        : "";

  return (
    <main
      className={`${poppins.className} overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {selected ? (
        <InformationDetail
          key={getId(selected)}
          item={selected}
          entries={entries}
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
                  <span
                    aria-current="page"
                    className="font-semibold text-white"
                  >
                    Informasi
                  </span>
                </nav>

                <h1 className="text-[36px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[44px] md:text-[52px]">
                  Informasi
                </h1>

                <p className="mx-auto mt-5 max-w-[580px] text-[14px] font-normal leading-[1.8] text-white/85 sm:text-[15px]">
                  Informasi terbaru mengenai kegiatan, program, panduan,
                  pengumuman, dan agenda P2M Politeknik Negeri Batam.
                </p>

                {/* pintasan */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                  <a
                    href="#daftar-informasi"
                    className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Daftar Informasi
                  </a>

                  <a
                    href="#pengumuman-agenda"
                    className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Pengumuman & Agenda
                  </a>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#31551F] via-[#8DC26F] to-[#31551F]" />
          </section>

          {/* =====================================================
              DAFTAR INFORMASI
          ====================================================== */}
          <section
            id="daftar-informasi"
            className="scroll-mt-20 bg-white pb-20 pt-16 md:pb-28 md:pt-20"
          >
            <div className="mx-auto max-w-[1120px] px-5 md:px-7">
              <SectionTitle
                eyebrow="Informasi P2M"
                title="Semua Informasi"
                description="Temukan berita, kegiatan, panduan, dan informasi terbaru seputar P2M Politeknik Negeri Batam."
              />

              {/* ---------- FILTER ---------- */}
              <Reveal>
                <div className="rounded-2xl border border-[#D9E2D3] bg-white p-4 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[0.8fr_1.6fr]">
                    <div>
                      <FieldLabel htmlFor="filter-kategori">
                        Kategori
                      </FieldLabel>

                      <SelectField
                        id="filter-kategori"
                        value={category}
                        options={categories}
                        onChange={changeCategory}
                      />
                    </div>

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
                          onChange={(e) => changeSearch(e.target.value)}
                          placeholder="Cari informasi..."
                          className="h-11 w-full rounded-xl border border-[#D9E2D3] bg-white pl-11 pr-4 text-[13px] text-[#1F2A1A] outline-none transition-all duration-300 placeholder:text-[#A3AE9E] hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* ---------- INFO HASIL + URUTAN ---------- */}
              <Reveal delay={80}>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D9E2D3] bg-[#F6F9F3] px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-[12px] text-[#667360] sm:text-[13px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8DC26F]" />
                    Menampilkan{" "}
                    <span className="font-semibold text-[#31551F]">
                      {filteredInformations.length}
                    </span>{" "}
                    informasi
                  </p>

                  <div className="flex items-center gap-4">
                    {hasActiveFilter && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="text-[12px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28] sm:text-[13px]"
                      >
                        Reset Filter
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setNewestFirst((current) => !current);
                        setPage(1);
                      }}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28] sm:text-[13px]"
                    >
                      <ArrowDownUp size={14} strokeWidth={2} />
                      {newestFirst ? "Terbaru" : "Terlama"}
                    </button>
                  </div>
                </div>
              </Reveal>

              {/* ---------- KARTU INFORMASI ---------- */}
              {pageItems.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {pageItems.map((item, index) => (
                    <Reveal
                      key={getId(item)}
                      delay={(index % 3) * 100}
                      className="flex"
                    >
                      <a
                        href={getDetailHash(item)}
                        className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white shadow-[0_4px_18px_rgba(31,42,26,0.04)] transition-all duration-500 hover:-translate-y-1.5 hover:border-[#8DC26F] hover:shadow-[0_22px_48px_rgba(49,85,31,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                      >
                        {/* GAMBAR */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EEF4EA]">
                          <Photo
                            src={item.image}
                            alt={item.title}
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E08]/55 via-[#0F1E08]/5 to-transparent" />

                          {/* kategori */}
                          <span className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-3 py-1 text-[10.5px] font-semibold text-[#31551F] shadow-sm backdrop-blur-sm">
                            {item.category}
                          </span>
                        </div>

                        {/* ISI */}
                        <div className="flex flex-1 flex-col p-5 md:p-6">
                          <p className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#667360]">
                            <CalendarDays
                              size={14}
                              strokeWidth={1.8}
                              className="text-[#3F6B28]"
                            />
                            {item.date}
                          </p>

                          <h3 className="mt-2.5 line-clamp-2 text-[15.5px] font-semibold leading-[1.5] tracking-[-0.01em] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F] sm:text-[16px]">
                            {item.title}
                          </h3>

                          {/* FOOTER KARTU */}
                          <div className="mt-auto pt-5">
                            <div className="flex items-center justify-between border-t border-[#E7EDE3] pt-4">
                              <span className="text-[12px] font-semibold text-[#31551F] sm:text-[13px]">
                                Baca Selengkapnya
                              </span>

                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF4EA] text-[#31551F] transition-all duration-300 group-hover:bg-[#31551F] group-hover:text-white">
                                <ArrowRight
                                  size={15}
                                  strokeWidth={2}
                                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                                />
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* sapuan warna saat hover */}
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />
                      </a>
                    </Reveal>
                  ))}
                </div>
              ) : (
                /* DATA KOSONG */
                <Reveal>
                  <div className="mt-6 rounded-2xl border border-[#D9E2D3] bg-white px-6 py-14 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
                      <Search size={26} strokeWidth={1.6} />
                    </span>

                    <p className="mt-5 text-[16px] font-semibold text-[#1F2A1A]">
                      {emptyTitle}
                    </p>

                    {emptyDescription && (
                      <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-[1.8] text-[#667360] sm:text-[14px]">
                        {emptyDescription}
                      </p>
                    )}

                    {hasActiveFilter && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#31551F] px-5 py-3 text-[12px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3F6B28] sm:text-[13px]"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </Reveal>
              )}

              {/* ---------- PAGINASI (disembunyikan kalau cuma 1 halaman) ---------- */}
              {pageItems.length > 0 && totalPages > 1 && (
                <div className="mt-10 flex flex-col items-center">
                  <nav
                    aria-label="Halaman informasi"
                    className="flex items-center justify-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => changePage(Math.max(1, safePage - 1))}
                      disabled={safePage === 1}
                      aria-label="Halaman sebelumnya"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9E2D3] bg-white text-[#31551F] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ChevronLeft size={16} strokeWidth={2} />
                    </button>

                    {getPageNumbers(safePage, totalPages).map((number, i) => {
                      if (number === "...") {
                        return (
                          <span
                            key={`dots-${i}`}
                            className="flex h-10 w-6 items-center justify-center text-[12px] text-[#A3AE9E]"
                          >
                            ...
                          </span>
                        );
                      }

                      const isActive = number === safePage;

                      return (
                        <button
                          key={number}
                          type="button"
                          onClick={() => changePage(number)}
                          aria-label={`Halaman ${number}`}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[12px] font-semibold transition-all duration-300 sm:text-[13px] ${
                            isActive
                              ? "border-[#31551F] bg-[#31551F] text-white"
                              : "border-[#D9E2D3] bg-white text-[#4A5646] hover:border-[#31551F] hover:text-[#31551F]"
                          }`}
                        >
                          {number}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() =>
                        changePage(Math.min(totalPages, safePage + 1))
                      }
                      disabled={safePage === totalPages}
                      aria-label="Halaman berikutnya"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9E2D3] bg-white text-[#31551F] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ChevronRight size={16} strokeWidth={2} />
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </section>

          {/* =====================================================
              PENGUMUMAN & AGENDA (dari kategori di Informasi)
          ====================================================== */}
          <AnnouncementAgendaSection
            entries={entries}
            loading={loading}
            loadError={loadError}
          />
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