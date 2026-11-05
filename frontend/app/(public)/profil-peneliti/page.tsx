"use client";

import { Poppins } from "next/font/google";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Hash,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";

/* =========================================================
   FONT + PALET (sama dengan Beranda dan Profil)
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

   HERO
   Gaya hero disamakan dengan halaman Profil (dan Beranda): gradasi
   hijau, judul muncul kata demi kata, lalu isi bergeser dan memudar
   pelan saat di-scroll. Navbar (setinggi 72px) transparan di atas
   hero, jadi <main> diberi -mt-[72px] dan hero diberi pt-[72px].
   Halaman ini harus terdaftar di HERO_PATHS pada Navbar.tsx
   ("/profil-peneliti").

   Halaman ini adalah PROFIL PENELITI (direktori dosen):
   - pencarian (nama atau program studi),
   - kartu peneliti (foto, nama, program studi), 10 kartu per halaman,
   - paginasi bergaya jendela: Sebelumnya, 5 nomor di sekitar halaman
     aktif, Berikutnya (bukan menampilkan semua nomor sekaligus).
   - klik kartu -> membuka profil peneliti di tautan yang
     diisi admin (mis. profil SINTA), di tab baru.

   DATA: diambil dari API Laravel (tanpa login)
   GET /api/peneliti -> { data: ApiResearcher[] }
   Data dikelola di halaman admin /admin/profil-peneliti.
   Tautan profil memakai field `tautan` (lihat pickProfileUrl).
========================================================= */

/* Poppins bukan variable font, jadi weight harus ditulis */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* gradasi hero (sama dengan Beranda dan Profil): halus dan satu arah,
   hijau tua di kiri atas makin terang ke kanan bawah. Lapisan kedua
   hanya menggelapkan bagian atas sedikit supaya teks putih navbar tetap
   terbaca. */
const HERO_GRADIENT = [
  "linear-gradient(180deg, rgba(10,28,5,0.35) 0%, rgba(10,28,5,0) 45%)",
  "linear-gradient(135deg,#1B4010 0%,#2F5F1F 38%,#4C8E32 72%,#78B35A 100%)",
].join(", ");

/* set CSS variable --d (delay animasi) tanpa error TypeScript */
const delayStyle = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

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
========================================================= */

type Researcher = {
  id: number;
  name: string;
  prodi: string;
  /** alamat foto lengkap; string kosong = tidak ada foto (tampil siluet) */
  photo: string;
  /** tautan profil (mis. SINTA); string kosong = kartu tidak bisa diklik */
  profileUrl: string;
  /** ID SINTA, diambil dari tautan profil; string kosong = tidak ada */
  sintaId: string;
};

/* Bentuk data dari API Laravel (field lain diabaikan) */
type ApiResearcher = {
  id: number;
  nama: string;
  prodi: string;
  foto: string | null;
  tautan: { label: string; url: string }[] | null;
};

/* Pilih tautan profil: utamakan yang mengandung "sinta",
   kalau tidak ada pakai tautan pertama. Hanya http(s) yang dipakai. */
function pickProfileUrl(links: ApiResearcher["tautan"]): string {
  const valid = (links ?? [])
    .map((row) => (row.url ?? "").trim())
    .filter((url) => /^https?:\/\//i.test(url));

  return valid.find((url) => /sinta/i.test(url)) ?? valid[0] ?? "";
}

/* ID SINTA ada di URL profil: .../authors/profile/6808685 */
function extractSintaId(url: string): string {
  return url.match(/\/authors\/profile\/(\d+)/i)?.[1] ?? "";
}

function fromApi(item: ApiResearcher): Researcher {
  const profileUrl = pickProfileUrl(item.tautan);

  return {
    id: item.id,
    name: item.nama,
    prodi: item.prodi,
    photo: photoUrl(item.foto),
    profileUrl,
    sintaId: extractSintaId(profileUrl),
  };
}

/* nama tanpa gelar, mis. "Dr. Rina Marlina, S.Kom." -> "Rina Marlina" */
function coreName(name: string) {
  return name.replace(/^(Dr\.|Prof\.|Ir\.)\s*/i, "").split(",")[0].trim();
}

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

/* Pengguna yang mematikan animasi di perangkatnya: animasi hero
   yang mengikuti scroll ikut dimatikan. */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduce;
}

/* Animasi hero yang mengikuti scroll (sama dengan Beranda dan Profil).
   Mengisi variabel CSS --p (0 = hero di posisi awal, 1 = hero sudah
   terscroll habis) pada elemen hero. Nilainya langsung ditulis ke DOM
   (bukan state), jadi halaman tidak dirender ulang tiap scroll. */
function useHeroScroll<T extends HTMLElement>(disabled: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (disabled) {
      el.style.removeProperty("--p");
      return;
    }

    let raf = 0;

    const update = () => {
      raf = 0;
      /* hero belum tentu di paling atas halaman (ada navbar di atasnya),
         jadi tinggi yang dipakai = posisi atas + tinggi hero */
      const progress = Math.min(
        Math.max(window.scrollY / Math.max(el.offsetTop + el.offsetHeight, 1), 0),
        1
      );
      el.style.setProperty("--p", progress.toFixed(3));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [disabled]);

  return ref;
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

/* Garis progres scroll di bagian paling atas halaman (sama dengan Profil) */
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
        className="h-full origin-left scale-x-0 bg-[#31551F]"
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
   PAGINASI (bergaya jendela)
   Bentuk: [ Sebelumnya | 15 | 16 | 17 | 18 | 19 | Berikutnya ]
   Hanya menampilkan PAGE_WINDOW nomor di sekitar halaman aktif,
   jadi tetap ringkas walau ada banyak halaman.
   - halaman aktif diusahakan di tengah jendela
   - di awal / akhir, jendela bergeser supaya tetap berisi
     PAGE_WINDOW nomor (mis. 1 2 3 4 5 saat di halaman 1)
   - di HP, "Sebelumnya" dan "Berikutnya" menjadi panah saja
========================================================= */

const PAGE_SIZE = 10;
const PAGE_WINDOW = 5;

function getPageWindow(current: number, total: number, size = PAGE_WINDOW) {
  const count = Math.min(size, total);

  let start = current - Math.floor(count / 2);
  start = Math.max(1, Math.min(start, total - count + 1));

  return Array.from({ length: count }, (_, i) => start + i);
}

function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const numbers = getPageWindow(current, total);

  const edgeClass =
    "flex h-11 items-center justify-center gap-1 px-3 text-[13px] font-medium text-[#31551F] transition-colors duration-300 hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#31551F] disabled:pointer-events-none disabled:text-[#A3AE9E] sm:px-5";

  return (
    <nav
      aria-label="Halaman daftar peneliti"
      className="mt-8 flex justify-center md:mt-10"
    >
      <div className="inline-flex items-stretch overflow-hidden rounded-xl border border-[#D9E2D3] bg-white">
        <button
          type="button"
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          aria-label="Halaman sebelumnya"
          className={edgeClass}
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden className="sm:hidden" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        {numbers.map((number) => {
          const isActive = number === current;

          return (
            <button
              key={number}
              type="button"
              onClick={() => onChange(number)}
              aria-label={`Halaman ${number}`}
              aria-current={isActive ? "page" : undefined}
              className="flex h-11 min-w-[44px] items-center justify-center border-l border-[#D9E2D3] p-1 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#31551F]"
            >
              <span
                className={`flex h-full w-full items-center justify-center rounded-lg px-2 text-[13px] font-semibold transition-colors duration-300 ${
                  isActive
                    ? "bg-[#31551F] text-white"
                    : "text-[#4A5646] hover:bg-[#EEF4EA] hover:text-[#31551F]"
                }`}
              >
                {number}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onChange(current + 1)}
          disabled={current === total}
          aria-label="Halaman berikutnya"
          className={`${edgeClass} border-l border-[#D9E2D3]`}
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <ChevronRight size={16} strokeWidth={2} aria-hidden className="sm:hidden" />
        </button>
      </div>
    </nav>
  );
}

/* =========================================================
   KARTU PENELITI
   Foto di kiri; nama dan program studi di kanan.
   Ada tautan profil -> seluruh kartu menjadi tautan ke profil
   (tab baru). Tanpa tautan -> kartu biasa (tidak bisa diklik).
========================================================= */

function ResearcherCard({ researcher }: { researcher: Researcher }) {
  const hasLink = researcher.profileUrl !== "";

  const baseClass =
    "group relative flex h-full gap-4 overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white p-4 transition-all duration-500 md:gap-5 md:p-5";

  const content = (
    <>
      {/* sapuan warna saat hover */}
      {hasLink && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />
      )}

      <Avatar
        name={researcher.name}
        photo={researcher.photo}
        className="h-[112px] w-[90px] shrink-0 rounded-xl ring-1 ring-[#D9E2D3] md:h-[128px] md:w-[102px]"
      />

      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`line-clamp-2 block text-[15px] font-semibold leading-[1.4] tracking-[-0.005em] text-[#1F2A1A] transition-colors duration-300 ${
            hasLink ? "group-hover:text-[#31551F]" : ""
          }`}
        >
          {researcher.name}
        </span>

        <span className="mt-1.5 line-clamp-2 block text-[12.5px] leading-[1.6] text-[#667360]">
          {researcher.prodi}
        </span>

        {researcher.sintaId && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8A948E]">
            <Hash size={13} strokeWidth={1.8} aria-hidden />
            ID : {researcher.sintaId}
          </span>
        )}

        {hasLink && (
          <span className="mt-auto inline-flex items-center gap-1 self-end pt-3 text-[12.5px] font-semibold text-[#31551F]">
            Lihat Profil
            <ArrowRight
              size={14}
              strokeWidth={2}
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </span>
        )}
      </span>
    </>
  );

  if (!hasLink) {
    return <div className={baseClass}>{content}</div>;
  }

  return (
    <a
      href={researcher.profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseClass} hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]`}
    >
      {content}
      <span className="sr-only"> (buka profil di tab baru)</span>
    </a>
  );
}

/* =========================================================
   HALAMAN PROFIL PENELITI  (/profil-peneliti)
========================================================= */

export default function ProfilPenelitiPage() {
  const reduceMotion = usePrefersReducedMotion();
  const heroRef = useHeroScroll<HTMLElement>(reduceMotion);

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

  /* ---------- pencarian + halaman ---------- */
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const hasActiveFilter = search.trim() !== "";

  const resetFilters = () => {
    setSearch("");
    setPage(1);
  };

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return researchers;

    return researchers.filter((r) =>
      [r.name, r.prodi].join(" ").toLowerCase().includes(q)
    );
  }, [researchers, search]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageResults = results.slice(firstIndex, firstIndex + PAGE_SIZE);

  /* ganti halaman, lalu gulir ke awal daftar supaya
     kartu halaman baru langsung terlihat dari atas */
  const goToPage = (number: number) => {
    setPage(Math.min(Math.max(1, number), totalPages));

    document
      .getElementById("daftar-peneliti")
      ?.scrollIntoView({ block: "start" });
  };

  const heroTitle = "Profil Peneliti";

  return (
    <main
      className={`${poppins.className} -mt-[72px] overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {/* =====================================================
          HERO (sama dengan hero halaman Profil dan Beranda)
          gradasi hijau, judul muncul kata demi kata saat dibuka,
          lalu isi bergeser dan memudar pelan saat di-scroll.
          pt-[72px] = tinggi navbar (main digeser naik 72px supaya
          hero ada di belakang navbar yang transparan).
      ===================================================== */}
      <section
        ref={heroRef}
        className="hero-bg relative overflow-hidden pt-[72px] text-white"
        style={{ backgroundImage: HERO_GRADIENT }}
      >
        <div className="hero-content relative z-10 mx-auto max-w-[1120px] px-5 pb-16 pt-14 text-center md:px-7 md:pb-24 md:pt-20">
          <div className="mx-auto max-w-[720px]">
            {/* judul muncul kata demi kata */}
            <h1 className="text-[36px] font-medium leading-[1.15] tracking-[-0.02em] [text-wrap:balance] sm:text-[44px] md:text-[52px]">
              {heroTitle.split(" ").map((word, index) => (
                <span key={`${word}-${index}`}>
                  <span className="kata" style={delayStyle(120 + index * 80)}>
                    {word}
                  </span>{" "}
                </span>
              ))}
            </h1>

            <p
              className="timbul mx-auto mt-5 max-w-[850px] text-[14px] font-normal leading-[1.8] text-white/90 [text-shadow:0_1px_12px_rgba(12,32,6,0.35)] sm:text-[15px]"
              style={delayStyle(320)}
            >
              Daftar dosen peneliti Politeknik Negeri Batam beserta tautan
              profil SINTA masing-masing.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          DAFTAR PENELITI
      ===================================================== */}
      <section
        id="daftar-peneliti"
        className="scroll-mt-24 bg-white py-16 md:py-20"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Peneliti"
            title="Dosen Peneliti Polibatam"
            description="Cari peneliti berdasarkan nama atau program studi. Pilih peneliti untuk membuka profil lengkapnya."
          />

          {/* ---------- PENCARIAN ---------- */}
          <Reveal>
            <div className="rounded-2xl border border-[#D9E2D3] bg-white p-4 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-5">
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
                  placeholder="Cari nama atau program studi..."
                  className="h-10 w-full rounded-xl border border-[#D9E2D3] bg-white pl-11 pr-4 text-[13.5px] text-[#1F2A1A] outline-none transition-all duration-300 placeholder:text-[#A3AE9E] hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA]"
                />
              </div>
            </div>
          </Reveal>

          {/* ---------- INFO HASIL ---------- */}
          {!loading && !loadError && (
            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-[13px] text-[#667360]" aria-live="polite">
                {results.length > 0 ? (
                  <>
                    Menampilkan{" "}
                    <span className="font-semibold text-[#1F2A1A]">
                      {firstIndex + 1}-{firstIndex + pageResults.length}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-[#1F2A1A]">
                      {results.length}
                    </span>{" "}
                    peneliti
                  </>
                ) : (
                  <>
                    Menampilkan{" "}
                    <span className="font-semibold text-[#1F2A1A]">0</span>{" "}
                    peneliti
                  </>
                )}
              </p>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28]"
                >
                  <RotateCcw size={14} strokeWidth={2} aria-hidden />
                  Reset Pencarian
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
                text="Coba ubah kata kunci pencarian."
                actionLabel="Reset Pencarian"
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
                  <Pagination
                    current={currentPage}
                    total={totalPages}
                    onChange={goToPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <style>{`
        html {
          scroll-behavior: smooth;
        }

        /* ANIMASI HERO (sama dengan Beranda dan Profil) */

        /* isi hero muncul dari bawah saat halaman dibuka */
        .timbul {
          animation: timbul 650ms cubic-bezier(.22,1,.36,1) both;
          animation-delay: var(--d, 0ms);
        }

        @keyframes timbul {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* judul hero: tiap kata naik sambil menajam */
        .kata {
          display: inline-block;
          animation: kata 750ms cubic-bezier(.22,1,.36,1) both;
          animation-delay: var(--d, 0ms);
        }

        @keyframes kata {
          from {
            opacity: 0;
            transform: translateY(0.45em);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        /* ANIMASI HERO SAAT SCROLL
           --p = 0 (awal) sampai 1 (hero terscroll habis), diisi oleh
           useHeroScroll. Tanpa animasi berulang: kalau scroll berhenti,
           semuanya diam. */
        .hero-content {
          transform: translate3d(0, calc(var(--p, 0) * 70px), 0);
          opacity: max(0, calc(1 - var(--p, 0) * 1.25));
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          .timbul,
          .kata {
            animation: none;
          }

          .hero-content {
            transform: none;
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}