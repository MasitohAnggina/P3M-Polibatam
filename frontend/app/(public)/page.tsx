"use client";

import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  CalendarDays,
  ChevronRight,
  FileText,
  FlaskConical,
  HandHeart,
  Library,
  Megaphone,
  Newspaper,
  Users,
  type LucideIcon,
} from "lucide-react";

/* =========================================================
   FONT
   Poppins wajib menyebut weight. Poppins lebih lebar dari
   Plus Jakarta Sans, jadi ukuran font di bawah sudah
   disesuaikan (sedikit lebih kecil) dan tracking dibuat
   lebih longgar supaya tetap enak dibaca.
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* =========================================================
   PALET WARNA (hijau utama #31551F)
   teks utama   : #1F2A1A
   hijau utama  : #31551F
   hijau gelap  : #213B14
   hijau medium : #3F6B28
   hijau aksen  : #8DC26F
   hijau muda   : #EEF4EA
   teks muted   : #5E6B58
   garis        : #D9E2D3
   latar lembut : #F6F9F3

   SKALA FONT (Poppins)
   hero judul   : 30 / 38 / 44 / 50
   judul seksi  : 26 / 30 / 34
   judul kartu  : 17-18
   isi          : 13.5-14 (leading 1.75)
   meta/chip    : 11-12.5
========================================================= */

/* =========================================================
   DATA
========================================================= */

/* Tipe layanan.
   - external : true bila tautan ke situs luar (dibuka di tab baru) */
type Service = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
};

/* href internal disamakan dengan menu di Navbar */
const services: Service[] = [
  {
    title: "Penelitian",
    description:
      "Program penelitian internal dan eksternal, mulai dari fasilitasi pendanaan dan pengelolaan kegiatan hingga dokumentasi hasil penelitian.",
    href: "/penelitian",
    icon: FlaskConical,
  },
  {
    title: "Pengabdian",
    description:
      "Program pengabdian kepada masyarakat internal dan eksternal beserta skema pendanaannya.",
    href: "/pengabdian",
    icon: HandHeart,
  },
  {
    title: "Publikasi",
    description:
      "Menyediakan informasi mengenai publikasi ilmiah, karya akademik, dan hasil penelitian sivitas akademika.",
    href: "/publikasi",
    icon: BookOpen,
  },
  {
    title: "Jurnal",
    description:
      "Portal jurnal ilmiah Politeknik Negeri Batam untuk menelusuri dan membaca artikel dari jurnal-jurnal terbitan Polibatam.",
    href: "https://jurnal.polibatam.ac.id/",
    icon: Library,
    external: true,
  },
  {
    title: "HKI",
    description:
      "Hak Kekayaan Intelektual (HKI) adalah perlindungan atas hasil karya, seperti hak cipta, paten, dan desain industri. Informasi pendaftaran dan data HKI Polibatam.",
    href: "/hki/hki",
    icon: Award,
  },
  {
    title: "Informasi",
    description:
      "Pusat berita, pengumuman, panduan, dan agenda kegiatan terbaru P2M Politeknik Negeri Batam.",
    href: "/informasi",
    icon: Newspaper,
  },
];

/* Statistik diambil dari API (GET /api/statistik): jumlah data
   Penelitian, Pengabdian, Publikasi, HKI, dan Profil Peneliti. */
type StatsData = {
  penelitian: number;
  pengabdian: number;
  publikasi: number;
  hki: number;
  dosen: number;
};

const statCards: { key: keyof StatsData; label: string; icon: LucideIcon }[] = [
  { key: "penelitian", label: "Penelitian", icon: FlaskConical },
  { key: "pengabdian", label: "Pengabdian", icon: HandHeart },
  { key: "publikasi", label: "Publikasi", icon: FileText },
  { key: "hki", label: "HKI", icon: Award },
  { key: "dosen", label: "Dosen Aktif", icon: Users },
];

/* Berita, Pengumuman, dan Agenda diambil dari API Informasi
   (GET /api/informasi), yaitu data yang sama dengan halaman Informasi
   dan diisi lewat admin Informasi. Dibedakan lewat kategori:
   - kategori "Pengumuman" -> panel Pengumuman
   - kategori "Agenda"     -> panel Agenda Kegiatan
   - kategori lainnya      -> Berita Terbaru (tab "Kegiatan" dan "Informasi") */
type NewsItem = {
  id: string;
  title: string;
  category: string;
  date: string; // tampilan: "12 Sep 2026"
  excerpt: string;
  image: string;
};

/* Bentuk data dari API Laravel (hanya field yang dipakai di beranda) */
type ApiInformation = {
  id: number;
  judul: string;
  kategori: string;
  tanggal: string;
  isi: { type: string; text?: string }[] | null;
  gambar: string | null;
};

/* Nama kategori harus sama dengan pilihan di admin Informasi
   dan KATEGORI di InformasiController. */
const ANNOUNCEMENT_CATEGORY = "Pengumuman";
const AGENDA_CATEGORY = "Agenda";

/* jumlah item yang tampil di panel Pengumuman dan Agenda */
const ANNOUNCEMENT_LIMIT = 4;
const AGENDA_LIMIT = 3;

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

/* "2026-09-12" -> "12 Sep 2026" */
function formatShortDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${day.padStart(2, "0")} ${SHORT_MONTHS[Number(month) - 1] ?? ""} ${year}`;
}

/* ringkasan = paragraf pertama dari isi informasi, dipotong */
function makeExcerpt(blocks: ApiInformation["isi"]) {
  const first = (blocks ?? []).find(
    (block) => block.type === "p" && block.text?.trim()
  );
  const text = first?.text?.trim().replace(/\s+/g, " ") ?? "";

  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
}

function newsFromApi(item: ApiInformation): NewsItem {
  return {
    id: String(item.id),
    title: item.judul,
    category: item.kategori,
    date: formatShortDate(item.tanggal),
    excerpt: makeExcerpt(item.isi),
    image: imageUrl(item.gambar),
  };
}

/* alamat detail di halaman Informasi */
const detailHref = (id: string) =>
  `/informasi#detail-${encodeURIComponent(id)}`;

const newsTabs = ["Semua", "Kegiatan", "Informasi"] as const;
type NewsTab = (typeof newsTabs)[number];

/* jumlah berita terbaru yang ditampilkan di beranda */
const NEWS_LIMIT = 6;

/* jumlah berita yang tampil di daftar samping */
const NEWS_PER_PAGE = 4;

const quickLinks = [
  {
    name: "SINTA",
    desc: "Science & Technology Index",
    href: "https://sinta.kemdiktisaintek.go.id/",
  },
  {
    name: "BIMA",
    desc: "Penelitian & Pengabdian",
    href: "https://bima.kemdiktisaintek.go.id/",
  },
  {
    name: "Google Scholar",
    desc: "Pencarian karya ilmiah",
    href: "https://scholar.google.com/",
  },
  {
    name: "Garuda",
    desc: "Portal jurnal Indonesia",
    href: "https://garuda.kemdiktisaintek.go.id/",
  },
  {
    name: "Scopus",
    desc: "Abstract & Citation",
    href: "https://www.scopus.com/",
  },
  {
    name: "SISTER",
    desc: "Sistem Informasi SDM",
    href: "https://sister.kemdiktisaintek.go.id/",
  },
];

/* =========================================================
   HERO SLIDES
========================================================= */

const heroSlides = [
  {
    image: "/img/poltek.jpeg",
    eyebrow: "Politeknik Negeri Batam",
    title: "Mendorong Riset, Inovasi, dan Dampak Nyata.",
    description:
      "Pusat Penelitian dan Pengabdian kepada Masyarakat Politeknik Negeri Batam mendukung pengembangan penelitian, inovasi, dan pengabdian kepada masyarakat.",
  },
  {
    image: "/img/poltek2.jpeg",
    eyebrow: "Penelitian & Inovasi",
    title: "Mengembangkan Riset untuk Masa Depan.",
    description:
      "Mendorong sivitas akademika untuk menghasilkan penelitian yang inovatif, relevan, dan memberikan kontribusi bagi perkembangan ilmu pengetahuan.",
  },
  {
    image: "/img/Hero3.jpg",
    eyebrow: "Pengabdian kepada Masyarakat",
    title: "Menghubungkan Inovasi dengan Masyarakat.",
    description:
      "Mengembangkan berbagai program pengabdian yang menghubungkan hasil penelitian dan inovasi dengan kebutuhan masyarakat.",
  },
];

const HERO_INTERVAL = 6000;
const NEWS_INTERVAL = 6000;

/* =========================================================
   HELPER
========================================================= */

/* set CSS variable --d (delay animasi) tanpa error TypeScript */
const delayStyle = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

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

/* Pengguna yang mematikan animasi di perangkatnya:
   slide otomatis ikut dimatikan (slide tetap bisa diganti manual). */
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

/* =========================================================
   ANIMASI MUNCUL (satu gaya untuk semua elemen)
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

/* Angka berjalan naik saat terlihat */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4, "0px");
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(to);
      return;
    }

    const duration = 1800;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(to * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
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
        className="h-full origin-left scale-x-0 bg-[#31551F]"
      />
    </div>
  );
}

/* =========================================================
   KOMPONEN KECIL
========================================================= */

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Reveal className="mb-10 text-center md:mb-14">
      <h2 className="text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-[#1F2A1A] sm:text-[30px] md:text-[34px]">
        {title}
      </h2>

      {description && (
        <p className="mx-auto mt-3 max-w-[580px] text-[14px] leading-[1.75] text-[#5E6B58]">
          {description}
        </p>
      )}
    </Reveal>
  );
}

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

/* pesan di dalam panel (memuat / gagal / kosong) */
function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <p className="py-8 text-center text-[13px] leading-[1.8] text-[#5E6B58]">
      {children}
    </p>
  );
}

/* Foto berita: gambar dari Laravel, atau latar hijau kalau belum ada.
   Induknya harus relative dan punya ukuran. */
function NewsPhoto({
  src,
  alt,
  sizes,
  className = "",
  hidden = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  hidden?: boolean;
}) {
  if (!src) {
    return (
      <div
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-br from-[#3F6B28] via-[#31551F] to-[#213B14] ${className}`}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      aria-hidden={hidden}
      fill
      unoptimized
      sizes={sizes}
      className={className}
    />
  );
}

/* Kartu layanan.
   Tautan internal memakai <Link>; tautan luar (mis. Jurnal) memakai
   <a> yang dibuka di tab baru dan diberi ikon panah miring. */
const serviceCardClass =
  "group flex w-full flex-col rounded-2xl border border-[#D9E2D3] bg-white p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]";

function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon;

  const content = (
    <>
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F] transition-all duration-500 group-hover:bg-[#31551F] group-hover:text-white">
        <Icon size={26} strokeWidth={1.6} />
      </span>

      <h3 className="mt-5 text-[18px] font-semibold leading-snug tracking-[-0.01em] text-[#1F2A1A]">
        {service.title}
      </h3>

      <p className="mt-2 text-[13.5px] leading-[1.75] text-[#5E6B58]">
        {service.description}
      </p>

      <span className="mt-auto inline-flex items-center gap-0.5 pt-5 text-[13px] font-semibold text-[#31551F]">
        {service.external ? "Kunjungi Situs" : "Selengkapnya"}
        {service.external ? (
          <>
            <ArrowUpRight
              size={15}
              strokeWidth={2.2}
              aria-hidden
              className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
            <span className="sr-only"> (membuka tab baru)</span>
          </>
        ) : (
          <ChevronRight
            size={15}
            strokeWidth={2.2}
            aria-hidden
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        )}
      </span>
    </>
  );

  if (service.external) {
    return (
      <a
        href={service.href}
        target="_blank"
        rel="noopener noreferrer"
        className={serviceCardClass}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={service.href} className={serviceCardClass}>
      {content}
    </Link>
  );
}

/* =========================================================
   BERANDA
========================================================= */

export default function HomePage() {
  const reduceMotion = usePrefersReducedMotion();

  /* HERO */
  const [activeHero, setActiveHero] = useState(0);
  const [paused, setPaused] = useState(false);

  /* DATA INFORMASI (dari API): berita, pengumuman, dan agenda */
  const [entries, setEntries] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState("");

  /* STATISTIK (dari API) */
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [statsError, setStatsError] = useState(false);

  /* BERITA */
  const [newsTab, setNewsTab] = useState<NewsTab>("Semua");
  const [activeNews, setActiveNews] = useState(0);
  const [newsPaused, setNewsPaused] = useState(false);
  /* berita samping yang diklik user (null = belum ada yang diklik) */
  const [clickedNews, setClickedNews] = useState<number | null>(null);

  /* data sudah terurut terbaru di atas dari API */
  const announcements = entries.filter(
    (item) => item.category === ANNOUNCEMENT_CATEGORY
  );
  const agendas = entries.filter((item) => item.category === AGENDA_CATEGORY);

  /* berita = semua kategori selain Pengumuman dan Agenda */
  const news = entries.filter(
    (item) =>
      item.category !== ANNOUNCEMENT_CATEGORY &&
      item.category !== AGENDA_CATEGORY
  );

  const filteredNews = news
    .filter((item) => newsTab === "Semua" || item.category === newsTab)
    .slice(0, NEWS_LIMIT);

  const newsCount = filteredNews.length;
  const safeActiveNews = newsCount > 0 ? activeNews % newsCount : 0;

  /* daftar samping dibagi per halaman supaya semua berita bisa dijangkau */
  const sidePageStart =
    Math.floor(safeActiveNews / NEWS_PER_PAGE) * NEWS_PER_PAGE;
  const sideNews = filteredNews.slice(
    sidePageStart,
    sidePageStart + NEWS_PER_PAGE
  );

  /* teks di panel saat belum ada data */
  const panelEmptyText = (name: string) =>
    newsLoading
      ? "Memuat..."
      : newsError
        ? "Data gagal dimuat."
        : `Belum ada ${name}.`;

  /* AMBIL DATA INFORMASI DARI API */
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
          setEntries(((json.data ?? []) as ApiInformation[]).map(newsFromApi));
          setNewsError("");
        }
      } catch {
        if (!cancelled) setNewsError("Berita gagal dimuat.");
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* AMBIL STATISTIK DARI API */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/statistik`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`Kode ${res.status}`);

        const json = await res.json();

        if (!cancelled) {
          setStatsData(json.data as StatsData);
          setStatsError(false);
        }
      } catch {
        if (!cancelled) setStatsError(true);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* AUTO SLIDE HERO (berhenti saat kursor di atas hero
     atau saat pengguna memilih animasi dikurangi) */
  useEffect(() => {
    if (paused || reduceMotion) return;

    const timer = setTimeout(() => {
      setActiveHero((current) => (current + 1) % heroSlides.length);
    }, HERO_INTERVAL);

    return () => clearTimeout(timer);
  }, [paused, reduceMotion, activeHero]);

  /* AUTO SLIDE BERITA (berhenti saat kursor di area berita
     atau saat pengguna memilih animasi dikurangi) */
  useEffect(() => {
    if (newsPaused || reduceMotion || newsCount < 2) return;

    const timer = setTimeout(() => {
      setActiveNews((current) => (current + 1) % newsCount);
      setClickedNews(null);
    }, NEWS_INTERVAL);

    return () => clearTimeout(timer);
  }, [newsPaused, reduceMotion, activeNews, newsCount]);

  const previousHero = () => {
    setActiveHero(
      (current) => (current - 1 + heroSlides.length) % heroSlides.length
    );
  };

  const nextHero = () => {
    setActiveHero((current) => (current + 1) % heroSlides.length);
  };

  const changeNewsTab = (tab: NewsTab) => {
    setNewsTab(tab);
    setActiveNews(0);
    setClickedNews(null);
  };

  const previousNews = () => {
    if (newsCount === 0) return;
    setActiveNews((current) => (current - 1 + newsCount) % newsCount);
    setClickedNews(null);
  };

  const nextNews = () => {
    if (newsCount === 0) return;
    setActiveNews((current) => (current + 1) % newsCount);
    setClickedNews(null);
  };

  /* klik berita samping -> tampil di berita utama + diberi highlight hijau */
  const selectNews = (globalIndex: number) => {
    setActiveNews(globalIndex);
    setClickedNews(globalIndex);
  };

  const currentHero = heroSlides[activeHero];
  const featuredNews = filteredNews[safeActiveNews];

  return (
    <main
      className={`${poppins.className} overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className="relative min-h-[540px] overflow-hidden bg-[#31551F] text-white md:min-h-[600px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* GAMBAR */}
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
            <Image
              key={slide.image}
              src={slide.image}
              alt={slide.eyebrow}
              aria-hidden={activeHero !== index}
              fill
              priority={index === 0}
              quality={90}
              sizes="100vw"
              className={`object-cover object-center transition-opacity duration-[1400ms] ease-out motion-reduce:transition-none ${
                activeHero === index ? "hero-zoom opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {/* Overlay hijau supaya teks jelas dan gambar tetap terlihat */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#213B14]/85 via-[#31551F]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#213B14]/50 via-transparent to-transparent" />
        </div>

        {/* TOMBOL KIRI */}
        <button
          type="button"
          onClick={previousHero}
          aria-label="Slide sebelumnya"
          className="group absolute left-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6"
        >
          <ArrowLeft
            size={18}
            strokeWidth={1.8}
            className="transition-transform duration-300 group-hover:-translate-x-0.5"
          />
        </button>

        {/* TOMBOL KANAN */}
        <button
          type="button"
          onClick={nextHero}
          aria-label="Slide berikutnya"
          className="group absolute right-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6"
        >
          <ArrowRight
            size={18}
            strokeWidth={1.8}
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </button>

        {/* KONTEN HERO */}
        <div className="relative z-10 mx-auto flex min-h-[540px] max-w-[1120px] items-center px-16 pb-24 pt-16 sm:px-20 md:min-h-[600px] md:px-24 lg:px-20">
          <div key={activeHero} className="max-w-[680px]">
            <p
              className="timbul mb-4 text-[13px] font-semibold tracking-[0.01em] text-[#DDEFD2]"
              style={delayStyle(0)}
            >
              {currentHero.eyebrow}
            </p>

            <h1
              className="timbul max-w-[660px] text-[30px] font-bold leading-[1.18] tracking-[-0.02em] [text-shadow:0_2px_18px_rgba(20,36,12,0.35)] sm:text-[38px] md:text-[44px] lg:text-[50px]"
              style={delayStyle(120)}
            >
              {currentHero.title}
            </h1>

            <p
              className="timbul mt-5 max-w-[560px] text-[14px] font-normal leading-[1.8] text-white/90 [text-shadow:0_1px_10px_rgba(20,36,12,0.35)] sm:text-[15px]"
              style={delayStyle(240)}
            >
              {currentHero.description}
            </p>

            <div
              className="timbul mt-8 flex flex-wrap items-center gap-3"
              style={delayStyle(360)}
            >
              <Link
                href="/profil"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[13px] font-semibold text-[#31551F] shadow-lg shadow-black/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Profil Selengkapnya
                <ArrowRight
                  size={15}
                  strokeWidth={2}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              <a
                href="#layanan"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3.5 text-[13px] font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Lihat Layanan
              </a>
            </div>
          </div>
        </div>

        {/* INDIKATOR SLIDE (aktif = progress bar) */}
        <div className="absolute bottom-9 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
          {heroSlides.map((slide, index) => {
            const isActive = activeHero === index;

            return (
              <button
                key={slide.image}
                type="button"
                onClick={() => setActiveHero(index)}
                aria-label={`Slide ${index + 1}`}
                aria-current={isActive}
                className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-500 ${
                  isActive
                    ? "w-10 bg-white/35"
                    : "w-1.5 bg-white/55 hover:bg-white/90"
                }`}
              >
                {isActive &&
                  (paused || reduceMotion ? (
                    <span className="absolute inset-0 bg-white" />
                  ) : (
                    <span
                      key={`${activeHero}-progress`}
                      className="hero-progress absolute inset-y-0 left-0 w-full bg-white"
                    />
                  ))}
              </button>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          LAYANAN UTAMA
      ===================================================== */}

      <section id="layanan" className="scroll-mt-20 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            title="Layanan Utama"
            description="Layanan P2M Polibatam untuk mendukung penelitian, pengabdian, publikasi, jurnal ilmiah, pengelolaan kekayaan intelektual, dan informasi kegiatan."
          />

          <div className="flex flex-wrap justify-center gap-5">
            {services.map((service, index) => (
              <Reveal
                key={service.href}
                delay={index * 100}
                className="flex w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
              >
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          STATISTIK
      ===================================================== */}

      <section
        className="relative overflow-hidden bg-[#31551F] py-14 text-white md:py-16"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8DC26F]/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#8DC26F]/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-[1120px] px-5 md:px-7">
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;

              return (
                <Reveal
                  key={stat.label}
                  delay={index * 90}
                  className="text-center"
                >
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[#CFE8BF]">
                    <Icon size={22} strokeWidth={1.6} />
                  </span>
                  <p className="mt-4 text-[30px] font-bold leading-none tracking-[-0.02em] tabular-nums md:text-[36px]">
                    {statsError ? "-" : <Counter to={statsData?.[stat.key] ?? 0} />}
                  </p>
                  <p className="mt-2 text-[12.5px] font-medium text-white/75">
                    {stat.label}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          BERITA TERBARU
          kartu, chip, dan tombol disamakan dengan halaman Informasi
          (tidak termasuk kategori Pengumuman dan Agenda)
      ===================================================== */}

      <section className="bg-[#F6F9F3] py-20 md:py-24">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          {/* HEADER: judul kiri, tombol kanan */}
          <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-[#1F2A1A] sm:text-[30px] md:text-[34px]">
                Berita Terbaru
              </h2>
              <p className="mt-2 max-w-[520px] text-[14px] leading-[1.75] text-[#5E6B58]">
                Informasi terbaru mengenai kegiatan, program, dan perkembangan
                P2M Politeknik Negeri Batam.
              </p>
            </div>

            <Link
              href="/informasi"
              className="group inline-flex items-center gap-2 rounded-xl border border-[#D9E2D3] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#31551F] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
            >
              Semua Berita
              <ArrowRight
                size={15}
                strokeWidth={2}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </Reveal>

          {/* TAB KATEGORI */}
          <Reveal delay={60} className="mb-6 flex flex-wrap gap-2">
            {newsTabs.map((tab) => {
              const isActive = newsTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => changeNewsTab(tab)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12px] font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] ${
                    isActive
                      ? "border-[#31551F] bg-[#31551F] text-white"
                      : "border-[#D9E2D3] bg-white text-[#4A5646] hover:border-[#31551F] hover:text-[#31551F]"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </Reveal>

          {featuredNews ? (
            <Reveal delay={100}>
              <div
                className="grid gap-5 lg:grid-cols-[1.75fr_1fr] lg:items-stretch"
                onMouseEnter={() => setNewsPaused(true)}
                onMouseLeave={() => setNewsPaused(false)}
              >
                {/* ---------- BERITA UTAMA ---------- */}
                <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-[#D9E2D3] bg-[#213B14] shadow-[0_8px_30px_rgba(31,42,26,0.08)] lg:min-h-[420px]">
                  {filteredNews.map((item, index) => (
                    <NewsPhoto
                      key={item.id}
                      src={item.image}
                      alt={item.title}
                      hidden={index !== safeActiveNews}
                      sizes="(max-width: 1024px) 100vw, 62vw"
                      className={`object-cover transition-opacity duration-700 motion-reduce:transition-none ${
                        index === safeActiveNews ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  ))}

                  {/* gradasi hijau gelap supaya teks selalu terbaca */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E08]/90 via-[#0F1E08]/40 to-[#0F1E08]/5" />

                  {/* BADGE TERBARU (gaya chip Informasi) */}
                  {safeActiveNews === 0 && (
                    <span className="absolute left-4 top-4 z-10 inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#31551F] shadow-sm backdrop-blur-sm">
                      Terbaru
                    </span>
                  )}

                  {/* PANAH */}
                  {newsCount > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={previousNews}
                        aria-label="Berita sebelumnya"
                        className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white backdrop-blur-md transition-colors duration-300 hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <ArrowLeft size={16} strokeWidth={2} />
                      </button>

                      <button
                        type="button"
                        onClick={nextNews}
                        aria-label="Berita berikutnya"
                        className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white backdrop-blur-md transition-colors duration-300 hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <ArrowRight size={16} strokeWidth={2} />
                      </button>
                    </>
                  )}

                  {/* TEKS */}
                  <div
                    key={`${newsTab}-${safeActiveNews}`}
                    className="absolute inset-x-0 bottom-0 z-10 p-5 pb-6 text-white md:px-14 md:pb-7"
                  >
                    <div
                      className="timbul flex items-center gap-3"
                      style={delayStyle(0)}
                    >
                      {/* chip kategori: sama dengan halaman Informasi */}
                      <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#31551F] shadow-sm backdrop-blur-sm">
                        {featuredNews.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/90">
                        <CalendarDays size={14} strokeWidth={1.8} />
                        {featuredNews.date}
                      </span>
                    </div>

                    <h3
                      className="timbul mt-3 line-clamp-2 max-w-[600px] text-[19px] font-semibold leading-[1.35] tracking-[-0.015em] text-white md:text-[24px]"
                      style={delayStyle(90)}
                    >
                      {featuredNews.title}
                    </h3>

                    {featuredNews.excerpt && (
                      <p
                        className="timbul mt-2 line-clamp-2 max-w-[560px] text-[13px] leading-[1.7] text-white/80"
                        style={delayStyle(170)}
                      >
                        {featuredNews.excerpt}
                      </p>
                    )}

                    <div className="timbul mt-4" style={delayStyle(250)}>
                      {/* tombol baca: teks + lingkaran panah, sama dengan footer kartu Informasi */}
                      <Link
                        href={detailHref(featuredNews.id)}
                        className="group inline-flex items-center gap-3 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[12.5px] font-semibold text-[#31551F] shadow-lg shadow-black/15 transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        Baca Selengkapnya
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF4EA] text-[#31551F] transition-all duration-300 group-hover:bg-[#31551F] group-hover:text-white">
                          <ArrowRight
                            size={15}
                            strokeWidth={2}
                            className="transition-transform duration-300 group-hover:translate-x-0.5"
                          />
                        </span>
                      </Link>
                    </div>
                  </div>

                  {/* TITIK INDIKATOR */}
                  {newsCount > 1 && (
                    <div className="absolute bottom-6 right-14 z-10 hidden items-center gap-1.5 md:flex">
                      {filteredNews.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveNews(index);
                            setClickedNews(null);
                          }}
                          aria-label={`Berita ${index + 1}`}
                          aria-current={index === safeActiveNews}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            index === safeActiveNews
                              ? "w-5 bg-white"
                              : "w-1.5 bg-white/50 hover:bg-white/80"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* ---------- DAFTAR BERITA SAMPING ---------- */}
                <div
                  key={`${newsTab}-${sidePageStart}`}
                  className="flex flex-col gap-3"
                >
                  {sideNews.map((item, i) => {
                    const globalIndex = sidePageStart + i;
                    /* highlight hijau hanya muncul setelah item ini diklik */
                    const isSelected = clickedNews === globalIndex;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectNews(globalIndex)}
                        aria-pressed={isSelected}
                        className={`timbul group relative flex min-h-[88px] w-full flex-1 items-center gap-3.5 overflow-hidden rounded-2xl border p-3 text-left shadow-[0_4px_18px_rgba(31,42,26,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-[#8DC26F] hover:shadow-[0_16px_36px_rgba(49,85,31,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] ${
                          isSelected
                            ? "border-[#31551F] bg-[#EEF4EA]"
                            : "border-[#D9E2D3] bg-white"
                        }`}
                        style={delayStyle(i * 70)}
                      >
                        <div className="relative h-[68px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-[#EEF4EA]">
                          <NewsPhoto
                            src={item.image}
                            alt={item.title}
                            sizes="90px"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-[11px] font-medium text-[#5E6B58]">
                            <span className="font-semibold text-[#3F6B28]">
                              {item.category}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays
                                size={12}
                                strokeWidth={1.8}
                                className="text-[#3F6B28]"
                              />
                              {item.date}
                            </span>
                          </p>
                          <h4
                            className={`mt-1 line-clamp-2 text-[13px] font-semibold leading-[1.45] transition-colors duration-300 group-hover:text-[#31551F] ${
                              isSelected ? "text-[#31551F]" : "text-[#1F2A1A]"
                            }`}
                          >
                            {item.title}
                          </h4>
                        </div>

                        {/* lingkaran panah: sama dengan kartu Informasi */}
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:bg-[#31551F] group-hover:text-white ${
                            isSelected
                              ? "bg-[#31551F] text-white"
                              : "bg-[#EEF4EA] text-[#31551F]"
                          }`}
                        >
                          <ArrowRight
                            size={15}
                            strokeWidth={2}
                            className="transition-transform duration-300 group-hover:translate-x-0.5"
                          />
                        </span>

                        {/* sapuan warna saat hover */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100"
                        />
                      </button>
                    );
                  })}

                  <Link
                    href="/informasi"
                    className="group inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#B9CBB0] px-4 py-3 text-[13px] font-semibold text-[#31551F] transition-all duration-300 hover:border-solid hover:border-[#31551F] hover:bg-[#31551F] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                  >
                    Lihat Semua Berita
                    <ArrowRight
                      size={15}
                      strokeWidth={2}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              </div>
            </Reveal>
          ) : (
            <p className="text-[14px] text-[#5E6B58]">
              {newsLoading
                ? "Memuat berita..."
                : newsError
                  ? newsError
                  : news.length === 0
                    ? "Belum ada berita."
                    : "Belum ada berita pada kategori ini."}
            </p>
          )}
        </div>
      </section>

      {/* =====================================================
          PENGUMUMAN & AGENDA KEGIATAN
          data dari Informasi (kategori "Pengumuman" dan "Agenda")
          disusun atas-bawah: Pengumuman, lalu Agenda
      ===================================================== */}

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            title="Pengumuman & Agenda"
            description="Pengumuman resmi dan agenda kegiatan terbaru dari P2M Politeknik Negeri Batam."
          />

          <div className="flex flex-col gap-6 lg:gap-8">
            {/* PENGUMUMAN */}
            <Reveal>
              <div className="rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-8">
                <PanelHeader icon={Megaphone} title="Pengumuman" />

                {announcements.length > 0 ? (
                  <div>
                    {announcements
                      .slice(0, ANNOUNCEMENT_LIMIT)
                      .map((item, index) => (
                        <Reveal key={item.id} delay={index * 80}>
                          <Link
                            href={detailHref(item.id)}
                            className="group flex items-center gap-4 border-b border-[#E7EDE3] py-4 last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#31551F] text-[12.5px] font-semibold text-white transition-transform duration-300 group-hover:scale-105">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 block text-[13.5px] font-medium leading-snug text-[#2F3B2A] transition-colors duration-300 group-hover:text-[#31551F]">
                                {item.title}
                              </span>
                              <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[#5E6B58]">
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
                              className="shrink-0 text-[#A3AE9E] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#31551F]"
                            />
                          </Link>
                        </Reveal>
                      ))}
                  </div>
                ) : (
                  <PanelMessage>{panelEmptyText("pengumuman")}</PanelMessage>
                )}

                {announcements.length > ANNOUNCEMENT_LIMIT && (
                  <Link
                    href="/informasi#pengumuman-agenda"
                    className="group mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#31551F]"
                  >
                    Lihat semua pengumuman
                    <ArrowRight
                      size={15}
                      strokeWidth={2}
                      aria-hidden
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                )}
              </div>
            </Reveal>

            {/* AGENDA KEGIATAN */}
            <Reveal delay={80}>
              <div className="rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-8">
                <PanelHeader icon={CalendarDays} title="Agenda Kegiatan" />

                {agendas.length > 0 ? (
                  <div>
                    {agendas.slice(0, AGENDA_LIMIT).map((item, index) => (
                      <Reveal key={item.id} delay={index * 80}>
                        <Link
                          href={detailHref(item.id)}
                          className="group flex items-center gap-4 border-b border-[#E7EDE3] py-4 last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F] transition-colors duration-300 group-hover:bg-[#31551F] group-hover:text-white">
                            <CalendarDays size={18} strokeWidth={1.8} />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 block text-[13.5px] font-medium leading-snug text-[#2F3B2A] transition-colors duration-300 group-hover:text-[#31551F]">
                              {item.title}
                            </span>
                            <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] leading-5 text-[#5E6B58]">
                              <span className="rounded-md bg-[#EEF4EA] px-2 py-0.5 font-medium text-[#3F6B28]">
                                {item.date}
                              </span>
                              {item.excerpt && (
                                <span className="line-clamp-1">
                                  {item.excerpt}
                                </span>
                              )}
                            </span>
                          </span>

                          <ChevronRight
                            size={18}
                            strokeWidth={2}
                            aria-hidden
                            className="shrink-0 text-[#A3AE9E] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#31551F]"
                          />
                        </Link>
                      </Reveal>
                    ))}
                  </div>
                ) : (
                  <PanelMessage>{panelEmptyText("agenda")}</PanelMessage>
                )}

                {agendas.length > AGENDA_LIMIT && (
                  <Link
                    href="/informasi#pengumuman-agenda"
                    className="group mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#31551F] transition-colors duration-300 hover:text-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#31551F]"
                  >
                    Lihat semua agenda
                    <ArrowRight
                      size={15}
                      strokeWidth={2}
                      aria-hidden
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =====================================================
          AKSES CEPAT
      ===================================================== */}

      <section className="bg-[#F6F9F3] py-20 md:py-28">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            title="Akses Cepat"
            description="Tautan ke platform penelitian dan publikasi yang sering digunakan sivitas akademika."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link, index) => (
              <Reveal key={link.name} delay={(index % 3) * 90}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-4 rounded-xl border border-[#D9E2D3] bg-white px-5 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#31551F] hover:bg-[#31551F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                >
                  <span>
                    <span className="block text-[14px] font-semibold text-[#1F2A1A] transition-colors duration-300 group-hover:text-white">
                      {link.name}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-[#5E6B58] transition-colors duration-300 group-hover:text-white/75">
                      {link.desc}
                    </span>
                  </span>

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF4EA] text-[#31551F] transition-all duration-300 group-hover:bg-white/15 group-hover:text-white">
                    <ArrowUpRight
                      size={17}
                      strokeWidth={2}
                      className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          ANIMASI
      ===================================================== */}

      <style>{`
        html {
          scroll-behavior: smooth;
        }

        /* animasi "timbul": muncul dari bawah saat konten slide berganti */
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

        /* gambar hero zoom pelan */
        .hero-zoom {
          animation: heroZoom 9s ease-out both;
        }

        @keyframes heroZoom {
          from { transform: scale(1.1); }
          to   { transform: scale(1); }
        }

        /* progress indikator slide hero */
        .hero-progress {
          transform-origin: left;
          animation: heroProgress ${HERO_INTERVAL}ms linear forwards;
        }

        @keyframes heroProgress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          .timbul,
          .hero-zoom,
          .hero-progress {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}