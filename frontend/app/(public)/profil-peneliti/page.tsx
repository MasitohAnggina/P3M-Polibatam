"use client";

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
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  Hash,
  Mail,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";

/* =========================================================
   FONT + PALET (sama dengan Beranda, HKI, dan Publikasi)
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
   dan elemen kecil.

   Halaman ini adalah PROFIL PENELITI (direktori dosen):
   - Daftar : pencarian, filter jurusan dan bidang keahlian,
              kartu peneliti (foto, nama, jabatan, prodi, keahlian).
   - Detail : foto, identitas, kontak, tautan profil, tentang,
              pendidikan, bidang keahlian, dan daftar luaran
              penelitian.

   DATA: diambil dari API Laravel (tanpa login)
   GET /api/peneliti -> { data: ApiResearcher[] }
   Data dikelola di halaman admin /admin/profil-peneliti.
========================================================= */

/* Poppins bukan variable font, jadi weight harus ditulis */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* =========================================================
   API
   Atur NEXT_PUBLIC_API_URL di .env.local, contoh:
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const BASE_URL = API_URL.replace(/\/api\/?$/, "");
const ENDPOINT = `${API_URL}/peneliti`;

/* Jaga-jaga kalau API mengirim path relatif, bukan URL lengkap */
function photoUrl(path: string | null): string {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return `${BASE_URL}/storage/${path.replace(/^\/?(storage\/)?/, "")}`;
}

/* =========================================================
   TIPE DATA
   Bentuk di frontend sama dengan halaman admin.
========================================================= */

type Education = {
  degree: string;
  field: string;
  school: string;
  year: string;
};

type Publication = {
  title: string;
  authors: string;
  venue: string;
  year: string;
  type: string;
};

type ProfileLink = { label: string; href: string };

type Researcher = {
  id: number;
  name: string;
  position: string;
  jurusan: string;
  prodi: string;
  lab: string;
  email: string;
  nidn: string;
  /** alamat foto lengkap; string kosong = tidak ada foto (tampil siluet) */
  photo: string;
  about: string;
  expertise: string[];
  education: Education[];
  publications: Publication[];
  links: ProfileLink[];
};

/* Bentuk data dari API Laravel */
type ApiResearcher = {
  id: number;
  nama: string;
  jabatan: string;
  nidn: string | null;
  email: string | null;
  jurusan: string;
  prodi: string;
  laboratorium: string | null;
  foto: string | null;
  tentang: string | null;
  keahlian: string[] | null;
  pendidikan:
    | {
        jenjang: string;
        bidang: string | null;
        institusi: string;
        tahun: string | number | null;
      }[]
    | null;
  luaran:
    | {
        judul: string;
        penulis: string | null;
        penerbit: string | null;
        tahun: string | number | null;
        jenis: string | null;
      }[]
    | null;
  tautan: { label: string; url: string }[] | null;
};

function fromApi(item: ApiResearcher): Researcher {
  return {
    id: item.id,
    name: item.nama,
    position: item.jabatan,
    jurusan: item.jurusan,
    prodi: item.prodi,
    lab: item.laboratorium ?? "",
    email: item.email ?? "",
    nidn: item.nidn ?? "",
    photo: photoUrl(item.foto),
    about: item.tentang ?? "",
    expertise: item.keahlian ?? [],
    education: (item.pendidikan ?? []).map((row) => ({
      degree: row.jenjang,
      field: row.bidang ?? "",
      school: row.institusi,
      year: row.tahun == null ? "" : String(row.tahun),
    })),
    publications: (item.luaran ?? [])
      .map((row) => ({
        title: row.judul,
        authors: row.penulis ?? "",
        venue: row.penerbit ?? "",
        year: row.tahun == null ? "" : String(row.tahun),
        type: row.jenis ?? "",
      }))
      // terbaru di atas; yang tanpa tahun di paling bawah
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0)),
    links: (item.tautan ?? []).map((row) => ({
      label: row.label,
      href: row.url,
    })),
  };
}

/* nama tanpa gelar, mis. "Dr. Rina Marlina, S.Kom." -> "Rina Marlina" */
function coreName(name: string) {
  return name.replace(/^(Dr\.|Prof\.|Ir\.)\s*/i, "").split(",")[0].trim();
}

const ALL_JURUSAN = "Semua Jurusan";
const ALL_EXPERTISE = "Semua Keahlian";

/* =========================================================
   HOOKS + ANIMASI
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

/* Muncul dari bawah saat terlihat (disamakan dengan Beranda) */
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
   FOTO PROFIL
   Foto dimuat dari API. Kalau peneliti belum punya foto atau
   file gagal dimuat, tampil siluet polos supaya kartu tidak kosong.
========================================================= */

function Avatar({
  name,
  photo,
  className = "",
  iconSize = 40,
}: {
  name: string;
  photo: string;
  className?: string;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`overflow-hidden bg-[#EEF4EA] ${className}`}>
      {photo && !failed ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt={`Foto ${name}`}
            onError={() => setFailed(true)}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top"
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <UserRound
            size={iconSize}
            strokeWidth={1.5}
            aria-hidden
            className="text-[#31551F]/70"
          />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   KOMPONEN KECIL
========================================================= */

/* Judul bagian: rata kiri, tanpa garis (sama dengan halaman lain) */
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

function ExpertiseChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#EEF4EA] px-2.5 py-1 text-[11px] font-semibold leading-tight text-[#31551F]">
      {label}
    </span>
  );
}

/* Kotak pesan: memuat, gagal memuat, data kosong, tidak ditemukan */
function Notice({
  title,
  text,
  actionLabel,
  onAction,
  loading = false,
}: {
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  return (
    <div
      role={loading ? "status" : undefined}
      className="rounded-2xl border border-[#D9E2D3] bg-white px-6 py-14 text-center"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
        {loading ? (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#31551F]/25 border-t-[#31551F] motion-reduce:animate-none" />
        ) : (
          <Search size={26} strokeWidth={1.6} />
        )}
      </span>

      <p className="mt-5 text-[16px] font-semibold text-[#1F2A1A]">{title}</p>

      {text && (
        <p className="mx-auto mt-2 max-w-[420px] text-[13.5px] leading-[1.75] text-[#667360]">
          {text}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="group mt-6 inline-flex items-center gap-2 rounded-md bg-[#31551F] px-5 py-3 text-[13px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
        >
          {actionLabel}
          <ArrowRight
            size={15}
            strokeWidth={1.8}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </button>
      )}
    </div>
  );
}

/* =========================================================
   KARTU PENELITI (tampilan daftar)
   Foto di kiri; nama, jabatan, prodi, dan keahlian di kanan.
========================================================= */

function ResearcherCard({ researcher }: { researcher: Researcher }) {
  const shown = researcher.expertise.slice(0, 3);
  const rest = researcher.expertise.length - shown.length;

  return (
    <a
      href={`#profil-${researcher.id}`}
      className="group relative flex h-full gap-4 overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white p-4 transition-all duration-500 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] md:gap-5 md:p-5"
    >
      {/* sapuan warna saat hover */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />

      <Avatar
        name={researcher.name}
        photo={researcher.photo}
        className="h-[112px] w-[90px] shrink-0 rounded-xl ring-1 ring-[#D9E2D3] md:h-[128px] md:w-[102px]"
      />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11.5px] font-semibold text-[#3F6B28]">
          {researcher.position}
        </span>

        <span className="mt-1 line-clamp-2 block text-[15px] font-semibold leading-[1.4] tracking-[-0.005em] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
          {researcher.name}
        </span>

        <span className="mt-1.5 line-clamp-2 block text-[12.5px] leading-[1.6] text-[#667360]">
          {researcher.prodi}
          <span className="text-[#A3AE9E]"> | </span>
          {researcher.jurusan}
        </span>

        {shown.length > 0 && (
          <span className="mt-3 flex flex-wrap gap-1.5">
            {shown.map((item) => (
              <ExpertiseChip key={item} label={item} />
            ))}
            {rest > 0 && (
              <span className="rounded-full border border-[#D9E2D3] px-2.5 py-1 text-[11px] font-semibold leading-tight text-[#667360]">
                +{rest}
              </span>
            )}
          </span>
        )}

        <span className="mt-auto inline-flex items-center gap-1 self-end pt-3 text-[12.5px] font-semibold text-[#31551F]">
          Lihat Profil
          <ArrowRight
            size={14}
            strokeWidth={2}
            aria-hidden
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </span>
    </a>
  );
}

/* =========================================================
   TAMPILAN DETAIL PROFIL
========================================================= */

/* kartu bagian pada halaman detail */
function Panel({
  title,
  delay = 0,
  children,
}: {
  title: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <Reveal delay={delay}>
      <section className="rounded-2xl border border-[#D9E2D3] bg-white p-5 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-6">
        <h2 className="mb-4 border-b border-[#E7EDE3] pb-3.5 text-[15px] font-semibold tracking-[-0.005em] text-[#1F2A1A]">
          {title}
        </h2>
        {children}
      </section>
    </Reveal>
  );
}

function PublicationItem({ item }: { item: Publication }) {
  const byline = [item.authors, item.venue].filter(Boolean).join(", ");

  return (
    <li className="border-b border-[#E7EDE3] py-4 first:pt-0 last:border-b-0 last:pb-0">
      <h3 className="text-[14px] font-semibold leading-[1.5] tracking-[-0.005em] text-[#31551F]">
        {item.title}
      </h3>

      {byline && (
        <p className="mt-1.5 text-[12.5px] leading-[1.7] text-[#667360]">
          {byline}
        </p>
      )}

      {(item.type || item.year) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.type && (
            <span className="rounded-full bg-[#EEF4EA] px-2.5 py-1 text-[11px] font-semibold leading-tight text-[#31551F]">
              {item.type}
            </span>
          )}
          {item.year && (
            <span className="text-[12px] font-medium text-[#667360]">
              {item.year}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

function ResearcherDetail({
  researcher,
  all,
  onBack,
}: {
  researcher: Researcher;
  all: Researcher[];
  onBack: () => void;
}) {
  const others = all
    .filter((r) => r.id !== researcher.id && r.jurusan === researcher.jurusan)
    .slice(0, 4);

  /* baris identitas yang kosong tidak ditampilkan */
  const identity = [
    { icon: Hash, label: "NIDN", value: researcher.nidn },
    { icon: BookOpen, label: "Program Studi", value: researcher.prodi },
    { icon: Building2, label: "Jurusan", value: researcher.jurusan },
    { icon: FlaskConical, label: "Laboratorium", value: researcher.lab },
  ].filter((item) => item.value);

  return (
    <>
      {/* =====================================================
          IDENTITAS
      ===================================================== */}
      <section className="relative bg-white">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#31551F] via-[#8DC26F] to-[#31551F]" />

        <div className="mx-auto max-w-[1120px] px-5 pb-12 pt-10 md:px-7 md:pb-14 md:pt-12">
          <button
            type="button"
            onClick={onBack}
            className="group mb-8 inline-flex items-center gap-2 rounded-lg text-[12.5px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#31551F]"
          >
            <ArrowLeft
              size={15}
              strokeWidth={2}
              aria-hidden
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
            Kembali ke Daftar Peneliti
          </button>

          <Reveal>
            <div className="grid gap-8 md:grid-cols-[200px_1fr] md:gap-10">
              {/* FOTO */}
              <Avatar
                name={researcher.name}
                photo={researcher.photo}
                iconSize={64}
                className="mx-auto aspect-[4/5] w-[170px] rounded-3xl shadow-[0_18px_40px_rgba(49,85,31,0.14)] ring-1 ring-[#D9E2D3] md:mx-0 md:w-[200px]"
              />

              {/* NAMA + KONTAK */}
              <div className="min-w-0 text-center md:text-left">
                <span className="inline-flex rounded-full bg-[#EEF4EA] px-3 py-1.5 text-[11.5px] font-semibold text-[#31551F]">
                  {researcher.position}
                </span>

                <h1 className="mt-4 text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-[#1F2A1A] sm:text-[30px] md:text-[34px]">
                  {researcher.name}
                </h1>

                <p className="mt-2 text-[14px] leading-[1.7] text-[#667360]">
                  {researcher.prodi}, Jurusan {researcher.jurusan}
                </p>

                {researcher.email && (
                  <p className="mt-4 inline-flex items-center gap-2.5 text-[13px] text-[#4A5646]">
                    <Mail
                      size={16}
                      strokeWidth={1.8}
                      aria-hidden
                      className="shrink-0 text-[#31551F]"
                    />
                    <a
                      href={`mailto:${researcher.email}`}
                      className="break-all transition-colors duration-300 hover:text-[#31551F] hover:underline"
                    >
                      {researcher.email}
                    </a>
                  </p>
                )}

                {/* tautan profil */}
                {researcher.links.length > 0 && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2.5 md:justify-start">
                    {researcher.links.map((link, i) => (
                      <a
                        key={`${link.label}-${i}`}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 rounded-full border border-[#D9E2D3] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#31551F] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                      >
                        {link.label}
                        <ExternalLink size={13} strokeWidth={2} aria-hidden />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          ISI PROFIL
      ===================================================== */}
      <section className="border-t border-[#D9E2D3] bg-white py-14 md:py-16">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_330px] lg:gap-8">
            {/* KOLOM KIRI */}
            <div className="min-w-0 space-y-6">
              {researcher.about && (
                <Panel title="Tentang">
                  <p className="whitespace-pre-line text-[13.5px] leading-[1.85] text-[#667360]">
                    {researcher.about}
                  </p>
                </Panel>
              )}

              {researcher.education.length > 0 && (
                <Panel title="Pendidikan" delay={60}>
                  <ul>
                    {researcher.education.map((item, i) => (
                      <li
                        key={`${item.degree}-${i}`}
                        className="flex items-start gap-4 border-b border-[#E7EDE3] py-4 first:pt-0 last:border-b-0 last:pb-0"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
                          <GraduationCap
                            size={19}
                            strokeWidth={1.8}
                            aria-hidden
                          />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-semibold text-[#1F2A1A]">
                            {item.degree}
                            {item.field && ` - ${item.field}`}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] text-[#667360]">
                            {item.school}
                          </span>
                        </span>

                        {item.year && (
                          <span className="shrink-0 text-[12.5px] font-semibold text-[#31551F]">
                            {item.year}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              {researcher.publications.length > 0 && (
                <Panel
                  title={`Luaran Penelitian (${researcher.publications.length})`}
                  delay={60}
                >
                  <ul>
                    {researcher.publications.map((item, i) => (
                      <PublicationItem key={`${item.title}-${i}`} item={item} />
                    ))}
                  </ul>
                </Panel>
              )}

              {!researcher.about &&
                researcher.education.length === 0 &&
                researcher.publications.length === 0 && (
                  <Panel title="Profil">
                    <p className="text-[13.5px] leading-[1.85] text-[#667360]">
                      Informasi lengkap peneliti ini belum ditambahkan.
                    </p>
                  </Panel>
                )}
            </div>

            {/* KOLOM KANAN */}
            <aside className="min-w-0 space-y-6">
              {researcher.expertise.length > 0 && (
                <Panel title="Bidang Keahlian" delay={100}>
                  <div className="flex flex-wrap gap-2">
                    {researcher.expertise.map((item) => (
                      <ExpertiseChip key={item} label={item} />
                    ))}
                  </div>
                </Panel>
              )}

              <Panel title="Identitas" delay={100}>
                <dl>
                  {identity.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex items-start gap-3 border-b border-[#E7EDE3] py-3.5 first:pt-0 last:border-b-0 last:pb-0"
                      >
                        <Icon
                          size={16}
                          strokeWidth={1.8}
                          aria-hidden
                          className="mt-[3px] shrink-0 text-[#3F6B28]"
                        />
                        <div className="min-w-0">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3F6B28]">
                            {item.label}
                          </dt>
                          <dd className="mt-0.5 break-words text-[13px] leading-[1.6] text-[#2F3B2A]">
                            {item.value}
                          </dd>
                        </div>
                      </div>
                    );
                  })}
                </dl>
              </Panel>

              {others.length > 0 && (
                <Panel title="Peneliti Lain di Jurusan Ini" delay={100}>
                  <ul>
                    {others.map((item) => (
                      <li
                        key={item.id}
                        className="border-b border-[#E7EDE3] py-3 first:pt-0 last:border-b-0 last:pb-0"
                      >
                        <a
                          href={`#profil-${item.id}`}
                          className="group flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                        >
                          <Avatar
                            name={item.name}
                            photo={item.photo}
                            iconSize={22}
                            className="h-12 w-12 shrink-0 rounded-xl ring-1 ring-[#D9E2D3]"
                          />

                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold leading-snug text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
                              {item.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[11.5px] text-[#667360]">
                              {item.prodi}
                            </span>
                          </span>

                          <ArrowRight
                            size={15}
                            strokeWidth={2}
                            aria-hidden
                            className="shrink-0 text-[#A3AE9E] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#31551F]"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

/* =========================================================
   HALAMAN PROFIL PENELITI
   - tampilan daftar  : /profil-peneliti
   - tampilan detail  : /profil-peneliti#profil-<id>
     (dalam satu file; tombol Kembali / tombol back browser
      mengembalikan ke daftar, filter tetap tersimpan)
========================================================= */

const DETAIL_HASH = "#profil-";
const PAGE_SIZE = 8;

export default function ProfilPenelitiPage() {
  /* ---------- data dari API ---------- */
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const res = await fetch(ENDPOINT, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Kode ${res.status}`);

        const json = await res.json();

        setResearchers(
          ((json.data ?? []) as ApiResearcher[])
            .map(fromApi)
            .sort((a, b) =>
              coreName(a.name).localeCompare(coreName(b.name), "id")
            )
        );
      } catch {
        if (controller.signal.aborted) return;

        setLoadError(
          "Data peneliti belum dapat dimuat. Periksa koneksi Anda lalu coba lagi."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [reloadKey]);

  /* ---------- opsi filter (dari data yang ada) ---------- */
  const jurusanOptions = useMemo(
    () => [
      ALL_JURUSAN,
      ...Array.from(new Set(researchers.map((r) => r.jurusan))).filter(Boolean),
    ],
    [researchers]
  );

  const expertiseOptions = useMemo(
    () => [
      ALL_EXPERTISE,
      ...Array.from(new Set(researchers.flatMap((r) => r.expertise))).sort(
        (a, b) => a.localeCompare(b, "id")
      ),
    ],
    [researchers]
  );

  /* ---------- filter + halaman ---------- */
  const [search, setSearch] = useState("");
  const [jurusan, setJurusan] = useState(ALL_JURUSAN);
  const [expertise, setExpertise] = useState(ALL_EXPERTISE);
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prevSelected = useRef<string | null>(null);

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
      window.scrollTo(0, 0);
    } else if (prevSelected.current) {
      document.getElementById("daftar-peneliti")?.scrollIntoView();
    }
    prevSelected.current = selectedId;
  }, [selectedId]);

  const closeDetail = () => {
    window.location.hash = "daftar-peneliti";
  };

  const selected = selectedId
    ? researchers.find((r) => String(r.id) === selectedId)
    : undefined;

  const hasActiveFilter =
    search.trim() !== "" ||
    jurusan !== ALL_JURUSAN ||
    expertise !== ALL_EXPERTISE;

  const resetFilters = () => {
    setSearch("");
    setJurusan(ALL_JURUSAN);
    setExpertise(ALL_EXPERTISE);
    setPage(1);
  };

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();

    return researchers.filter((r) => {
      if (jurusan !== ALL_JURUSAN && r.jurusan !== jurusan) return false;
      if (expertise !== ALL_EXPERTISE && !r.expertise.includes(expertise)) {
        return false;
      }
      if (!q) return true;

      return [r.name, r.position, r.prodi, r.jurusan, r.lab, ...r.expertise]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [researchers, search, jurusan, expertise]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageResults = results.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <main
      className={`${poppins.className} overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {selectedId ? (
        selected ? (
          <ResearcherDetail
            key={selected.id}
            researcher={selected}
            all={researchers}
            onBack={closeDetail}
          />
        ) : (
          /* detail dibuka langsung lewat tautan: tunggu data, atau id tidak ada */
          <section className="bg-white py-16 md:py-20">
            <div className="mx-auto max-w-[720px] px-5 md:px-7">
              {loading ? (
                <Notice loading title="Memuat profil peneliti..." />
              ) : (
                <Notice
                  title={
                    loadError ? "Data gagal dimuat" : "Profil tidak ditemukan"
                  }
                  text={
                    loadError ||
                    "Peneliti yang Anda cari tidak tersedia atau sudah dihapus."
                  }
                  actionLabel="Kembali ke Daftar Peneliti"
                  onAction={closeDetail}
                />
              )}
            </div>
          </section>
        )
      ) : (
        <>
          {/* =====================================================
              HERO (sama dengan hero halaman HKI dan Publikasi)
          ===================================================== */}
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
                    Profil Peneliti
                  </span>
                </nav>

                <h1 className="text-[36px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[44px] md:text-[52px]">
                  Profil Peneliti
                </h1>

                <p className="mx-auto mt-5 max-w-[580px] text-[14px] font-normal leading-[1.8] text-white/85 sm:text-[15px]">
                  Daftar dosen peneliti Politeknik Negeri Batam beserta bidang
                  keahlian dan luaran penelitiannya.
                </p>

                {/* pintasan */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                  <a
                    href="#daftar-peneliti"
                    className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Daftar Peneliti
                  </a>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#31551F] via-[#8DC26F] to-[#31551F]" />
          </section>

          {/* =====================================================
              DAFTAR PENELITI
          ===================================================== */}
          <section
            id="daftar-peneliti"
            className="scroll-mt-20 bg-white py-16 md:py-20"
          >
            <div className="mx-auto max-w-[1120px] px-5 md:px-7">
              <SectionTitle
                eyebrow="Peneliti"
                title="Dosen Peneliti Polibatam"
                description="Cari peneliti berdasarkan nama, jurusan, atau bidang keahlian. Pilih peneliti untuk melihat profil lengkapnya."
              />

              {/* ---------- FILTER ---------- */}
              <Reveal>
                <div className="rounded-2xl border border-[#D9E2D3] bg-white p-4 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_260px]">
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
                          onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                          }}
                          placeholder="Cari nama, program studi, atau keahlian..."
                          className="h-10 w-full rounded-xl border border-[#D9E2D3] bg-white pl-11 pr-4 text-[13.5px] text-[#1F2A1A] outline-none transition-all duration-300 placeholder:text-[#A3AE9E] hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA]"
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="filter-keahlian">
                        Bidang Keahlian
                      </FieldLabel>

                      <SelectField
                        id="filter-keahlian"
                        value={expertise}
                        options={expertiseOptions}
                        onChange={(v) => {
                          setExpertise(v);
                          setPage(1);
                        }}
                      />
                    </div>
                  </div>

                  {/* jurusan sebagai tombol pilihan */}
                  <div className="mt-4 border-t border-[#E7EDE3] pt-4">
                    <FieldLabel>Jurusan</FieldLabel>

                    <div
                      role="group"
                      aria-label="Jurusan"
                      className="flex flex-wrap gap-2"
                    >
                      {jurusanOptions.map((option) => {
                        const isActive = option === jurusan;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setJurusan(option);
                              setPage(1);
                            }}
                            aria-pressed={isActive}
                            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] ${
                              isActive
                                ? "border-[#31551F] bg-[#31551F] text-white"
                                : "border-[#D9E2D3] bg-white text-[#4A5646] hover:border-[#8DC26F] hover:bg-[#F6F9F3] hover:text-[#31551F]"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* ---------- INFO HASIL ---------- */}
              {!loading && !loadError && (
                <div className="mt-6 flex items-center justify-between gap-4">
                  <p className="text-[13px] text-[#667360]" aria-live="polite">
                    Menampilkan{" "}
                    <span className="font-semibold text-[#1F2A1A]">
                      {results.length}
                    </span>{" "}
                    peneliti
                  </p>

                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28]"
                    >
                      <RotateCcw size={14} strokeWidth={2} aria-hidden />
                      Reset Filter
                    </button>
                  )}
                </div>
              )}

              {/* ---------- DAFTAR KARTU / STATUS ---------- */}
              <div className="mt-5">
                {loading ? (
                  <Notice loading title="Memuat data peneliti..." />
                ) : loadError ? (
                  <Notice
                    title="Data gagal dimuat"
                    text={loadError}
                    actionLabel="Coba Lagi"
                    onAction={() => setReloadKey((key) => key + 1)}
                  />
                ) : researchers.length === 0 ? (
                  <Notice
                    title="Belum ada data peneliti"
                    text="Data peneliti akan tampil di sini setelah ditambahkan oleh admin."
                  />
                ) : results.length === 0 ? (
                  <Notice
                    title="Peneliti tidak ditemukan"
                    text="Coba ubah kata kunci, jurusan, atau bidang keahlian."
                    actionLabel="Reset Filter"
                    onAction={resetFilters}
                  />
                ) : (
                  <>
                    <ul className="grid gap-4 md:grid-cols-2">
                      {pageResults.map((researcher, index) => (
                        <li key={researcher.id}>
                          <Reveal delay={(index % 2) * 80} className="h-full">
                            <ResearcherCard researcher={researcher} />
                          </Reveal>
                        </li>
                      ))}
                    </ul>

                    {/* ---------- PAGINASI ---------- */}
                    {totalPages > 1 && (
                      <nav
                        aria-label="Halaman daftar peneliti"
                        className="mt-8 flex items-center justify-center gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => setPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          aria-label="Halaman sebelumnya"
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9E2D3] bg-white text-[#31551F] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white disabled:pointer-events-none disabled:opacity-40"
                        >
                          <ChevronLeft size={16} strokeWidth={2} />
                        </button>

                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((number) => {
                          const isActive = number === currentPage;

                          return (
                            <button
                              key={number}
                              type="button"
                              onClick={() => setPage(number)}
                              aria-label={`Halaman ${number}`}
                              aria-current={isActive ? "page" : undefined}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[12.5px] font-semibold transition-all duration-300 ${
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
                            setPage(Math.min(totalPages, currentPage + 1))
                          }
                          disabled={currentPage === totalPages}
                          aria-label="Halaman berikutnya"
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9E2D3] bg-white text-[#31551F] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white disabled:pointer-events-none disabled:opacity-40"
                        >
                          <ChevronRight size={16} strokeWidth={2} />
                        </button>
                      </nav>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </>
      )}

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