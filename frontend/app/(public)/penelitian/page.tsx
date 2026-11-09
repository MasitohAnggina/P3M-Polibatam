"use client";

import Image from "next/image";
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
  Anchor,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Cpu,
  Factory,
  FileText,
  Globe,
  Handshake,
  HeartPulse,
  Layers,
  ShieldCheck,
  Tag,
  Users,
  WalletCards,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* =========================================================
   FONT
   Sama dengan halaman Profil dan Beranda. Idealnya font
   didefinisikan sekali di src/app/layout.tsx lalu dipakai semua
   halaman. Kalau Beranda memakai font lain, ganti di layout saja.
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const HERO_GRADIENT = [
  "linear-gradient(180deg, rgba(10,28,5,0.35) 0%, rgba(10,28,5,0) 45%)",
  "linear-gradient(135deg,#1B4010 0%,#2F5F1F 38%,#4C8E32 72%,#78B35A 100%)",
].join(", ");

const delayStyle = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/* =========================================================
   PALET WARNA (sama dengan Beranda dan Profil)
   teks utama   : #1F2A1A
   hijau utama  : #31551F
   hijau gelap  : #213B14
   hijau medium : #3F6B28
   hijau aksen  : #8DC26F
   hijau muda   : #EEF4EA
   teks muted   : #5E6B58
   garis        : #D9E2D3

   LATAR SEKSI: putih semua. Pemisah antar seksi memakai garis
   tipis #D9E2D3. Warna lembut (#F6F9F3) hanya untuk kolom isian
   dan hover, bukan untuk latar seksi.

   SKALA FONT
   hero judul   : 36 / 44 / 52
   judul seksi  : 26 / 30 / 34
   sub judul    : 21 / 24 / 28
   judul kartu  : 14.5-18
   isi          : 14 (leading 1.75)
   label/meta   : 11-13

   PRINSIP ISI TEKS
   Teks dibuat singkat supaya nyaman dibaca: satu gagasan per
   kalimat, paragraf pendek, lebar baris dibatasi (sekitar 640px).
   Rincian lengkap ada di dokumen Renstra dan Panduan yang bisa
   dibuka dari halaman ini.

   ATURAN FOTO (untuk halaman ini dan form upload nanti)
   Foto bersifat opsional. Kalau admin tidak mengunggah gambar,
   area foto (thumbnail di daftar dan foto besar di detail) tidak
   ditampilkan, sehingga yang tersisa hanya teksnya.
   format       : PNG atau JPG/JPEG
   foto penelitian: rasio 16:9, minimal 1920 x 1080 px
   ukuran file  : maksimal 5 MB
   Validasi resolusi dilakukan di backend saat upload.
========================================================= */

/* =========================================================
   DATA
========================================================= */

const SIMP3M_URL = "https://simp3m.polibatam.ac.id/";

/* Panduan 2026: judul penelitian wajib terdaftar di SIAP PBL. */
const PBL_URL = "https://pbl.polibatam.ac.id/";

const RENSTRA_URL =
  "http://p2m.polibatam.ac.id/wp-content/uploads/2021/08/Renstra-Penelitian-2021-2025.pdf";

const PANDUAN_URL =
  "https://polbat-my.sharepoint.com/:b:/g/personal/p3m_polibatam_ac_id/IQAI9PcvgLjgQriZuVKH8eW8AX72_cv1jt0xpUUQW5m2tKc?e=pSyo2v";

/* jumlah penelitian maksimal yang tampil di tiap box bidang fokus.
   Kalau penelitiannya lebih banyak, muncul tombol "Lihat lebih banyak"
   yang membuka halaman daftar lengkap bidang itu. */
const FOCUS_PREVIEW = 2;

/* =========================================================
   BIDANG FOKUS RISET (8 prioritas)
   `title` harus sama persis dengan isi kolom `bidang` pada data
   penelitian (huruf besar/kecil dan spasi berlebih diabaikan).
   `slug` dipakai untuk alamat halaman daftar: /penelitian#daftar-<slug>.
   Di form admin, kolom Bidang sebaiknya berupa dropdown dengan
   8 pilihan ini, bukan teks bebas, supaya pengelompokan akurat.
========================================================= */

type FocusArea = {
  title: string;
  slug: string;
  icon: LucideIcon;
};

const focusAreas: FocusArea[] = [
  {
    title: "Ketahanan Pangan dan Pertanian",
    slug: "pangan",
    icon: Wheat,
  },
  {
    title: "Transisi Energi, Material, dan Manufaktur",
    slug: "energi",
    icon: Zap,
  },
  {
    title: "Kesehatan dan Kemandirian Obat Nasional",
    slug: "kesehatan",
    icon: HeartPulse,
  },
  {
    title: "Rekayasa dan Teknologi Digital (AI, IoT, Semikonduktor)",
    slug: "digital",
    icon: Cpu,
  },
  { title: "Pertahanan dan Keamanan", slug: "pertahanan", icon: ShieldCheck },
  { title: "Kemaritiman", slug: "kemaritiman", icon: Anchor },
  { title: "Industri dan Hilirisasi", slug: "industri", icon: Factory },
  {
    title: "Kemandirian Sosial dan Budaya",
    slug: "sosial",
    icon: Users,
  },
];

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

type ProgramItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type ProgramGroup = {
  id: "Internal" | "Eksternal";
  title: string;
  description: string;
  icon: LucideIcon;
  items: ProgramItem[];
};

/* Program penelitian: 2 induk (Internal dan Eksternal), masing-masing
   punya anak. Judul anak harus sama persis dengan field `program`
   pada data penelitian di bawah.

   Sumber: Buku Panduan Penelitian dan PkM 2026, bagian 6.3 (Skema
   Penelitian). Panduan mendaftar sumber hibah tanpa membaginya jadi
   internal dan eksternal; pembagian di bawah adalah tafsiran dan perlu
   dikonfirmasi ke P3M. */
const programGroups: ProgramGroup[] = [
  {
    id: "Internal",
    title: "Program Internal",
    description:
      "Penelitian dari Politeknik Negeri Batam. Proposal diajukan lewat SIMP3M.",
    icon: Building2,
    items: [
      {
        title: "Penelitian Penugasan Polibatam",
        description: "Hibah penelitian penugasan Politeknik Negeri Batam.",
        icon: FileText,
      },
      {
        title: "Penelitian PBL",
        description:
          "Penelitian melalui kegiatan Project, Product, atau Problem Based Learning.",
        icon: Layers,
      },
    ],
  },
  {
    id: "Eksternal",
    title: "Program Eksternal",
    description:
      "Hibah dari kementerian, lembaga, pemerintah daerah, dan mitra.",
    icon: Globe,
    items: [
      {
        title: "Penelitian BIMA",
        description: "Hibah nasional Kemdiktisaintek lewat aplikasi BIMA.",
        icon: ClipboardList,
      },
      {
        title: "Penelitian BRIN",
        description: "Program riset dan inovasi BRIN.",
        icon: Layers,
      },
      {
        title: "Penelitian KONEKSI",
        description: "Program hibah Kemdiktisaintek-KONEKSI.",
        icon: Handshake,
      },
      {
        title: "Penelitian BPDPKS",
        description: "Hibah riset sawit dari BPDPKS.",
        icon: WalletCards,
      },
      {
        title: "Penelitian Bestari-Saintek",
        description: "Program hibah Bestari-Saintek (SEMESTA).",
        icon: Users,
      },
      {
        title: "Penelitian Pemerintah Daerah",
        description: "Program hibah dari pemerintah daerah.",
        icon: Building2,
      },
      {
        title: "Penelitian CSR",
        description: "Penelitian CSR bersama mitra.",
        icon: Handshake,
      },
      {
        title: "Penelitian Hibah Lainnya",
        description: "Hibah dari sumber lain yang sah.",
        icon: Globe,
      },
    ],
  },
];

/* Tahapan mengacu pada Buku Panduan Penelitian dan PkM 2026
   (Gambar 1 dan bagian 7). Deskripsi dibuat singkat; rincian
   lengkap ada di buku panduan. */
const researchStages = [
  {
    title: "Pengumuman",
    desc: "Jadwal diumumkan lewat email atau website P3M.",
  },
  {
    title: "Pengusulan",
    desc: "Unggah proposal di SIMP3M dan daftarkan judul di platform PBL.",
  },
  {
    title: "Seleksi",
    desc: "Proposal direviu dan diseleksi oleh reviewer.",
  },
  {
    title: "Penetapan",
    desc: "Judul yang didanai ditetapkan dan SP3 ditandatangani.",
  },
  {
    title: "Pelaksanaan",
    desc: "Kontrak ditandatangani, dana tahap I (70%) dicairkan.",
  },
  {
    title: "Pemantauan dan evaluasi",
    desc: "Reviewer memantau dan seminar reviu hasil digelar.",
  },
  {
    title: "Pelaporan",
    desc: "Kirim laporan kemajuan dan laporan akhir. Dana tahap II (30%) dicairkan.",
  },
  {
    title: "Penilaian luaran",
    desc: "Luaran dinilai dan dampak penelitian dianalisis.",
  },
];

/* Data penelitian diambil dari API Laravel (diisi lewat halaman admin).
   id dipakai sebagai alamat detail: /penelitian#detail-<id> */
type Research = {
  id: string;
  title: string;
  leader: string;
  field: string;
  group: ProgramGroup["id"] | "";
  program: string;
  year: string;
  image: string;
  abstract: string;
  members: string[];
  keywords: string[];
};

/* Bentuk data dari API Laravel */
type ApiResearch = {
  id: number;
  judul: string;
  ketua: string;
  bidang: string | null;
  kelompok: string | null;
  program: string;
  tahun: string | number;
  abstrak: string | null;
  anggota: string[] | null;
  kata_kunci: string[] | null;
  gambar: string | null;
};

/* Atur NEXT_PUBLIC_API_URL di .env.local, contoh:
   NEXT_PUBLIC_API_URL=http://localhost:8000/api */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const BASE_URL = API_URL.replace(/\/api\/?$/, "");

/* Jaga-jaga kalau API mengirim path relatif, bukan URL lengkap.
   Mengembalikan string kosong kalau penelitian tidak punya gambar. */
function imageUrl(path: string | null): string {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return `${BASE_URL}/storage/${path.replace(/^\/?(storage\/)?/, "")}`;
}

function groupOfProgram(program: string): Research["group"] {
  return (
    programGroups.find((group) =>
      group.items.some((item) => item.title === program)
    )?.id ?? ""
  );
}

function fromApi(item: ApiResearch): Research {
  const group =
    item.kelompok === "Internal" || item.kelompok === "Eksternal"
      ? item.kelompok
      : groupOfProgram(item.program);

  return {
    id: String(item.id),
    title: item.judul,
    leader: item.ketua,
    field: item.bidang ?? "",
    group,
    program: item.program,
    year: String(item.tahun),
    image: imageUrl(item.gambar),
    abstract: item.abstrak ?? "",
    members: item.anggota ?? [],
    keywords: item.kata_kunci ?? [],
  };
}

function matchesFocus(research: Research, selected: string) {
  return normalize(research.field) === normalize(selected);
}

/* terbaru dulu: tahun besar ke kecil, lalu id besar ke kecil */
function byNewest(a: Research, b: Research) {
  return Number(b.year) - Number(a.year) || Number(b.id) - Number(a.id);
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

/* =========================================================
   ANIMASI MUNCUL (sama persis dengan Beranda)
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
        className="h-full origin-left scale-x-0 bg-[#31551F]"
      />
    </div>
  );
}

/* =========================================================
   JUDUL BAGIAN (rata kiri)
========================================================= */

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
    <Reveal className="mb-8 md:mb-10">
      {eyebrow && (
        <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#3F6B28]">
          {eyebrow}
        </p>
      )}

      <h2 className="max-w-[640px] text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-[#1F2A1A] sm:text-[30px] md:text-[34px]">
        {title}
      </h2>

      {description && (
        <p className="mt-3 max-w-[560px] text-[14px] leading-[1.75] text-[#5E6B58]">
          {description}
        </p>
      )}
    </Reveal>
  );
}

/* =========================================================
   HALAMAN PENELITIAN
   - tampilan daftar  : /penelitian
   - tampilan detail  : /penelitian#detail-<id>
     (dalam satu file, tombol Kembali / tombol back browser
      mengembalikan ke daftar)
========================================================= */

const DETAIL_HASH = "#detail-";
const FOCUS_HASH = "#daftar-";

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

export default function PenelitianPage() {
  /* halaman daftar lengkap satu bidang fokus (slug), dari hash URL */
  const [selectedFocusSlug, setSelectedFocusSlug] = useState<string | null>(
    null
  );
  const [activeGroupId, setActiveGroupId] = useState<ProgramGroup["id"] | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prevSelected = useRef<string | null>(null);

  const reduceMotion = usePrefersReducedMotion();
  const heroRef = useHeroScroll<HTMLElement>(
    reduceMotion || selectedId !== null || selectedFocusSlug !== null
  );

  /* data penelitian dari API */
  const [researches, setResearches] = useState<Research[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/penelitian`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`Kode ${res.status}`);

        const json = await res.json();

        if (!cancelled) {
          setResearches(((json.data ?? []) as ApiResearch[]).map(fromApi));
          setLoadError("");
        }
      } catch {
        if (!cancelled) setLoadError("Data penelitian gagal dimuat.");
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
      setSelectedFocusSlug(
        hash.startsWith(FOCUS_HASH)
          ? decodeURIComponent(hash.slice(FOCUS_HASH.length))
          : null
      );
    };

    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  /* atur posisi scroll saat pindah daftar <-> detail <-> daftar bidang */
  const viewKey = selectedId
    ? `detail:${selectedId}`
    : selectedFocusSlug
      ? `daftar:${selectedFocusSlug}`
      : null;

  useEffect(() => {
    if (viewKey) {
      jumpTo(null);
    } else if (prevSelected.current) {
      jumpTo(document.getElementById("bidang-fokus"));
    }
    prevSelected.current = viewKey;
  }, [viewKey]);

  const closeDetail = () => {
    window.location.hash = "bidang-fokus";
  };

  /* buka sub program dari kartu induk, dan kembali ke kartu induk */
  const activeGroup =
    programGroups.find((group) => group.id === activeGroupId) ?? null;

  const openGroup = (id: ProgramGroup["id"]) => {
    setActiveGroupId(id);
    document.getElementById("program")?.scrollIntoView({ behavior: "smooth" });
  };

  const closeGroup = () => {
    setActiveGroupId(null);
    document.getElementById("program")?.scrollIntoView({ behavior: "smooth" });
  };

  const selectedResearch = researches.find(
    (research) => research.id === selectedId
  );

  /* penelitian per bidang fokus, terbaru dulu */
  const focusGroups = useMemo(
    () =>
      focusAreas.map((area) => {
        const items = researches
          .filter((research) => matchesFocus(research, area.title))
          .sort(byNewest);

        return { ...area, items };
      }),
    [researches]
  );

  const selectedFocus =
    focusGroups.find((area) => area.slug === selectedFocusSlug) ?? null;

  return (
    <main
      className={`${poppins.className} ${
        selectedResearch || selectedFocus ? "" : "-mt-[72px]"
      } overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {selectedResearch ? (
        <ResearchDetail
          key={selectedResearch.id}
          research={selectedResearch}
          researches={researches}
          onBack={closeDetail}
        />
      ) : selectedFocus ? (
        <FocusListing
          key={selectedFocus.slug}
          area={selectedFocus}
          loading={loading}
          loadError={loadError}
          onBack={closeDetail}
        />
      ) : (
        <>
          {/* =====================================================
              HERO
          ===================================================== */}

          <section
            ref={heroRef}
            className="hero-bg relative overflow-hidden pt-[72px] text-white"
            style={{ backgroundImage: HERO_GRADIENT }}
          >
            <div className="hero-content relative z-10 mx-auto max-w-[1120px] px-5 pb-16 pt-14 text-center md:px-7 md:pb-24 md:pt-20">
              <div className="mx-auto max-w-[720px]">
                <h1 className="text-[36px] font-medium leading-[1.15] tracking-[-0.02em] [text-wrap:balance] sm:text-[44px] md:text-[52px]">
                  {"Penelitian".split(" ").map((word, index) => (
                    <span key={`${word}-${index}`}>
                      <span className="kata" style={delayStyle(120 + index * 80)}>
                        {word}
                      </span>{" "}
                    </span>
                  ))}
                </h1>

                <p
                  className="timbul mx-auto mt-5 max-w-[560px] text-[14px] font-normal leading-[1.8] text-white/90 [text-shadow:0_1px_12px_rgba(12,32,6,0.35)] sm:text-[15px]"
                  style={delayStyle(320)}
                >
                  Program, tahapan, dan kegiatan penelitian Politeknik Negeri
                  Batam.
                </p>
              </div>
            </div>
          </section>

          {/* =====================================================
              RENSTRA (gaya sama dengan "Tentang Kami" di Profil)
          ===================================================== */}

          <section
            id="renstra"
            className="scroll-mt-20 bg-white py-16 md:py-20"
          >
            <div className="mx-auto max-w-[1120px] px-5 md:px-7">
              <Reveal>
                <p className="text-[13px] font-semibold text-[#3F6B28]">
                  Arah Penelitian
                </p>

                <h2 className="mt-2 max-w-[640px] text-[21px] font-bold leading-[1.3] tracking-[-0.02em] text-[#31551F] sm:text-[24px] md:text-[28px]">
                  Penelitian yang terarah dan berkelanjutan
                </h2>
              </Reveal>

              <Reveal delay={100} className="mt-5">
                <p className="max-w-[640px] text-[14px] leading-[1.75] text-[#5E6B58]">
                  Rencana Strategis Penelitian menjadi acuan pengembangan
                  penelitian di Politeknik Negeri Batam, berdasarkan kepakaran
                  periset dan kekhasan pendidikan vokasi.
                </p>
              </Reveal>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <Reveal delay={100} className="flex">
                  <DocumentCard
                    title="Rencana Strategis Penelitian"
                    subtitle="Lihat dokumen periode 2021–2025"
                    href={RENSTRA_URL}
                    primary
                  />
                </Reveal>

                <Reveal delay={200} className="flex">
                  <DocumentCard
                    title="Panduan Penelitian dan Pengabdian 2026"
                    subtitle="Lihat panduan"
                    href={PANDUAN_URL}
                  />
                </Reveal>
              </div>
            </div>
          </section>

          {/* =====================================================
              PROGRAM PENELITIAN
              Tahap 1: dua kartu induk (Internal dan Eksternal)
              Tahap 2: setelah kartu diklik, tampil sub program
          ===================================================== */}

          <section
            id="program"
            className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-16 md:py-20"
          >
            <div className="mx-auto max-w-[1120px] px-5 md:px-7">
              <div key={activeGroup?.id ?? "induk"}>
                {activeGroup ? (
                  <>
                    {/* TAHAP 2: SUB PROGRAM */}
                    <Reveal className="mb-8">
                      <button
                        type="button"
                        onClick={closeGroup}
                        className="group inline-flex items-center gap-2 rounded-lg text-[13px] font-semibold text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#31551F]"
                      >
                        <ArrowLeft
                          size={15}
                          strokeWidth={2}
                          aria-hidden
                          className="transition-transform duration-300 group-hover:-translate-x-1"
                        />
                        Kembali ke Program Penelitian
                      </button>
                    </Reveal>

                    <SectionTitle
                      eyebrow="Program Penelitian"
                      title={activeGroup.title}
                      description={activeGroup.description}
                    />

                    <div className="grid gap-5 sm:grid-cols-2 md:gap-6">
                      {activeGroup.items.map((item, index) => {
                        const ItemIcon = item.icon;
                        const total = researches.filter(
                          (research) => research.program === item.title
                        ).length;

                        return (
                          <Reveal
                            key={item.title}
                            delay={index * 90}
                            className="flex"
                          >
                            <article className="flex w-full flex-col rounded-2xl border border-[#D9E2D3] bg-white p-6 md:p-7">
                              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
                                <ItemIcon size={22} strokeWidth={1.7} aria-hidden />
                              </span>

                              <h3 className="mt-5 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-[#1F2A1A]">
                                {item.title}
                              </h3>

                              <p className="mt-2 text-[13.5px] leading-[1.75] text-[#5E6B58]">
                                {item.description}
                              </p>

                              <p className="mt-auto pt-5 text-[12px] font-medium text-[#5E6B58]">
                                {total} penelitian
                              </p>
                            </article>
                          </Reveal>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    {/* TAHAP 1: KARTU INDUK */}
                    <SectionTitle
                      eyebrow="Program Penelitian"
                      title="Temukan skema penelitian yang sesuai"
                      description="Pilih kelompok program untuk melihat sub programnya."
                    />

                    <div className="grid gap-6 md:grid-cols-2">
                      {programGroups.map((group, groupIndex) => {
                        const GroupIcon = group.icon;

                        return (
                          <Reveal
                            key={group.id}
                            delay={groupIndex * 110}
                            className="flex"
                          >
                            <button
                              type="button"
                              onClick={() => openGroup(group.id)}
                              className="group relative flex min-h-[240px] w-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white p-8 text-left transition-all duration-500 hover:-translate-y-1.5 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] md:p-10"
                            >
                              {/* sapuan warna saat hover */}
                              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />

                              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#31551F] text-white">
                                <GroupIcon size={26} strokeWidth={1.6} aria-hidden />
                              </span>

                              <span className="mt-6 block text-[20px] font-semibold leading-snug tracking-[-0.01em] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
                                {group.title}
                              </span>

                              <span className="mt-2.5 block max-w-[380px] text-[14px] leading-[1.75] text-[#5E6B58]">
                                {group.description}
                              </span>

                              <span className="mt-auto flex items-center justify-between gap-3 pt-7">
                                <span className="rounded-md bg-[#EEF4EA] px-2.5 py-1 text-[11.5px] font-semibold text-[#3F6B28]">
                                  {group.items.length} sub program
                                </span>

                                <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#31551F]">
                                  Lihat sub program
                                  <ChevronRight
                                    size={15}
                                    strokeWidth={2.2}
                                    aria-hidden
                                    className="transition-transform duration-300 group-hover:translate-x-1"
                                  />
                                </span>
                              </span>
                            </button>
                          </Reveal>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* =====================================================
              TAHAPAN PENELITIAN (vertikal ke bawah)
          ===================================================== */}

          <section
            id="tahapan"
            className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-16 md:py-20"
          >
            <div className="mx-auto max-w-[1120px] px-5 md:px-7">
              <SectionTitle
                eyebrow="Alur Penelitian"
                title="Bagaimana proses penelitian?"
                description="Delapan tahap, dari pengumuman sampai penilaian luaran."
              />

              <div className="relative">
                <div className="absolute bottom-6 left-[18px] top-6 w-px bg-[#D9E2D3]" />

                <div className="space-y-3">
                  {researchStages.map((stage, index) => (
                    <Reveal key={stage.title} delay={index * 70}>
                      <div className="group relative flex items-center gap-5">
                        <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#31551F] shadow-[0_0_0_1px_#D9E2D3] transition-transform duration-300 group-hover:scale-110">
                          <Check
                            size={14}
                            strokeWidth={2.5}
                            aria-hidden
                            className="text-white"
                          />
                        </span>

                        <div className="flex flex-1 items-center justify-between rounded-xl border border-transparent px-4 py-3 transition-all duration-300 group-hover:border-[#D9E2D3] group-hover:bg-[#F6F9F3]">
                          <div>
                            <p className="text-[11.5px] font-medium text-[#3F6B28]">
                              Tahap {String(index + 1).padStart(2, "0")}
                            </p>

                            <p className="mt-0.5 text-[14.5px] font-semibold text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
                              {stage.title}
                            </p>

                            <p className="mt-0.5 max-w-[560px] text-[12.5px] leading-[1.6] text-[#5E6B58]">
                              {stage.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>

              <Reveal delay={200} className="mt-8 flex flex-wrap gap-3">
                <a
                  href={SIMP3M_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 rounded-lg bg-[#31551F] px-5 py-3 text-[13px] font-semibold leading-none text-white shadow-[0_4px_14px_rgba(49,85,31,0.18)] transition-all duration-300 hover:bg-[#3F6B28] hover:shadow-[0_8px_22px_rgba(49,85,31,0.26)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                >
                  Ajukan proposal melalui SIMP3M
                  <ArrowRight
                    size={15}
                    strokeWidth={2.2}
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </a>

                <a
                  href={PBL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 rounded-lg border border-[#31551F] bg-white px-5 py-3 text-[13px] font-semibold leading-none text-[#31551F] transition-all duration-300 hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                >
                  Daftarkan judul di SIAP PBL
                  <ArrowRight
                    size={15}
                    strokeWidth={2.2}
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </a>
              </Reveal>
            </div>
          </section>

          {/* =====================================================
              BIDANG FOKUS RISET (paling bawah)
              8 box dalam 2 kolom (4 baris), semuanya selalu tampil.
              Tiap box menampilkan 2 penelitian dulu sebagai baris
              polos (tanpa card), lalu tombol "Lihat lebih banyak"
              membuka halaman daftar lengkap bidang itu.
          ===================================================== */}

          <section
            id="bidang-fokus"
            className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-16 md:py-20"
          >
            <div className="mx-auto max-w-[1120px] px-5 md:px-7">
              <SectionTitle
                eyebrow="Prioritas Riset"
                title="Bidang fokus riset"
                description="Temukan penelitian berdasarkan delapan bidang prioritas."
              />

              {/* 8 BOX, 2 KOLOM. Box sebaris otomatis sama tinggi. Tiap box
                  maksimal 2 penelitian; kalau lebih, tombol membuka
                  halaman daftar lengkap bidang itu. */}
              <div className="grid gap-6 md:grid-cols-2">
                {focusGroups.map((area) => {
                  const AreaIcon = area.icon;
                  const total = area.items.length;
                  const visible = area.items.slice(0, FOCUS_PREVIEW);
                  const remaining = total - visible.length;

                  return (
                    <Reveal key={area.title} className="h-full">
                      <article className="flex h-full flex-col rounded-2xl border border-[#D9E2D3] bg-white p-7 md:p-9">
                        {/* KEPALA BOX */}
                        <header className="flex items-center gap-5">
                          <AreaIcon
                            size={32}
                            strokeWidth={1.5}
                            aria-hidden
                            className="shrink-0 text-[#31551F]"
                          />

                          <div className="min-w-0 flex-1">
                            <h3 className="text-[17px] font-semibold leading-[1.35] tracking-[-0.01em] text-[#1F2A1A] md:text-[18px]">
                              {area.title}
                            </h3>

                            <p className="mt-1.5 text-[12.5px] font-medium text-[#3F6B28]">
                              {total} penelitian
                            </p>
                          </div>
                        </header>

                        {/* DAFTAR PENELITIAN (baris polos, tanpa card) */}
                        <div className="mt-6 border-t border-[#D9E2D3]">
                          {visible.length > 0 ? (
                            <ul className="divide-y divide-[#D9E2D3]">
                              {visible.map((research) => (
                                <li key={research.id}>
                                  <ResearchRow research={research} />
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="pt-6 text-[13px] leading-[1.6] text-[#5E6B58]">
                              {loading
                                ? "Memuat data penelitian..."
                                : loadError ||
                                  "Belum ada penelitian pada bidang ini."}
                            </p>
                          )}
                        </div>

                        {/* TOMBOL (hanya kalau penelitiannya lebih dari 2),
                            selalu menempel di bagian bawah box */}
                        {remaining > 0 && (
                          <div className="mt-auto pt-6">
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-[#D9E2D3] pt-5">
                              <p className="text-[12.5px] leading-none text-[#5E6B58]">
                                Menampilkan{" "}
                                <span className="font-semibold text-[#2F3B2A]">
                                  {visible.length}
                                </span>{" "}
                                dari{" "}
                                <span className="font-semibold text-[#2F3B2A]">
                                  {total}
                                </span>{" "}
                                penelitian
                              </p>

                              <a
                                href={`${FOCUS_HASH}${area.slug}`}
                                className="group inline-flex items-center gap-2 rounded-lg bg-[#31551F] py-2.5 pl-4 pr-3.5 text-[13px] font-semibold leading-none text-white shadow-[0_4px_14px_rgba(49,85,31,0.18)] transition-all duration-300 hover:bg-[#3F6B28] hover:shadow-[0_8px_22px_rgba(49,85,31,0.26)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                              >
                                Lihat lebih banyak
                                <ArrowRight
                                  size={15}
                                  strokeWidth={2.2}
                                  aria-hidden
                                  className="transition-transform duration-300 group-hover:translate-x-1"
                                />
                                <span className="sr-only"> {area.title}</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* =====================================================
          ANIMASI (sama dengan Beranda)
      ===================================================== */}

      <style>{`
  html {
    scroll-behavior: smooth;
  }

  .timbul {
    animation: timbul 650ms cubic-bezier(.22,1,.36,1) both;
    animation-delay: var(--d, 0ms);
  }

  @keyframes timbul {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .kata {
    display: inline-block;
    animation: kata 750ms cubic-bezier(.22,1,.36,1) both;
    animation-delay: var(--d, 0ms);
  }

  @keyframes kata {
    from { opacity: 0; transform: translateY(0.45em); filter: blur(6px); }
    to { opacity: 1; transform: translateY(0); filter: blur(0); }
  }

  .hero-content {
    transform: translate3d(0, calc(var(--p, 0) * 70px), 0);
    opacity: max(0, calc(1 - var(--p, 0) * 1.25));
    will-change: transform, opacity;
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .timbul, .kata { animation: none; }
    .hero-content { transform: none; opacity: 1; }
  }
`}</style>
    </main>
  );
}

/* =========================================================
   BARIS PENELITIAN (dipakai di box bidang fokus dan halaman daftar)
   Baris polos tanpa card. Thumbnail hanya tampil kalau ada gambar.
========================================================= */

function ResearchRow({
  research,
  large = false,
}: {
  research: Research;
  large?: boolean;
}) {
  return (
    <a
      href={`${DETAIL_HASH}${encodeURIComponent(research.id)}`}
      aria-label={`Lihat detail: ${research.title}`}
      className="group -mx-3 block rounded-xl px-3 py-5 transition-colors duration-300 hover:bg-[#F6F9F3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
    >
      <span className="flex items-center gap-4 md:gap-5">
        {/* THUMBNAIL 16:9 (hanya tampil kalau ada gambar) */}
        {research.image && (
          <span
            className={`relative shrink-0 overflow-hidden rounded-lg bg-[#EEF4EA] ${
              large
                ? "h-[72px] w-[128px] sm:h-[90px] sm:w-[160px]"
                : "h-[50px] w-[88px] sm:h-[58px] sm:w-[104px]"
            }`}
          >
            <Image
              src={research.image}
              unoptimized
              alt=""
              fill
              sizes={large ? "160px" : "104px"}
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </span>
        )}

        <span className="block min-w-0 flex-1">
          <span className="mb-2 flex flex-wrap items-center gap-1.5">
            {research.group && (
              <span className="rounded-md bg-[#31551F] px-2 py-0.5 text-[10.5px] font-semibold text-white">
                {research.group}
              </span>
            )}

            <span className="rounded-md bg-[#E3EEDC] px-2 py-0.5 text-[10.5px] font-semibold text-[#3F6B28]">
              {research.program}
            </span>

            <span className="text-[11px] font-medium text-[#5E6B58]">
              {research.year}
            </span>
          </span>

          <span className="line-clamp-2 block text-[14.5px] font-semibold leading-[1.5] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F] md:text-[15px]">
            {research.title}
          </span>

          <span className="mt-1.5 block truncate text-[12.5px] text-[#5E6B58]">
            <span className="font-medium text-[#2F3B2A]">Ketua Pengusul:</span>{" "}
            {research.leader}
          </span>
        </span>

        <ChevronRight
          size={18}
          strokeWidth={2.2}
          aria-hidden
          className="shrink-0 text-[#31551F] transition-transform duration-300 group-hover:translate-x-1"
        />
      </span>
    </a>
  );
}

/* =========================================================
   HALAMAN DAFTAR LENGKAP SATU BIDANG FOKUS
   /penelitian#daftar-<slug>  (contoh: #daftar-pangan)
========================================================= */

function FocusListing({
  area,
  loading,
  loadError,
  onBack,
}: {
  area: FocusArea & { items: Research[] };
  loading: boolean;
  loadError: string;
  onBack: () => void;
}) {
  const AreaIcon = area.icon;

  return (
    <section className="bg-white pb-16 pt-8 md:pb-24 md:pt-10">
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
          Kembali ke Bidang Fokus Riset
        </button>

        <Reveal className="mt-6">
          <div className="flex items-center gap-4 md:gap-5">
            <AreaIcon
              size={40}
              strokeWidth={1.5}
              aria-hidden
              className="shrink-0 text-[#31551F]"
            />

            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#3F6B28]">
                Bidang Fokus Riset
              </p>

              <h1 className="mt-1.5 text-[22px] font-bold leading-[1.25] tracking-[-0.02em] text-[#1F2A1A] sm:text-[26px] md:text-[30px]">
                {area.title}
              </h1>

              <p className="mt-1.5 text-[13px] font-medium text-[#5E6B58]">
                {area.items.length} penelitian
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100} className="mt-8 md:mt-10">
          <div className="rounded-2xl border border-[#D9E2D3] bg-white px-6 py-2 md:px-10">
            {area.items.length > 0 ? (
              <ul className="divide-y divide-[#D9E2D3]">
                {area.items.map((research) => (
                  <li key={research.id}>
                    <ResearchRow research={research} large />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-[13px] leading-[1.6] text-[#5E6B58]">
                {loading
                  ? "Memuat data penelitian..."
                  : loadError || "Belum ada penelitian pada bidang ini."}
              </p>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =========================================================
   TAMPILAN DETAIL PENELITIAN
========================================================= */

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

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
        <p className="text-[11.5px] font-medium text-[#5E6B58]">{label}</p>
        <p className="mt-0.5 text-[13.5px] font-semibold leading-snug text-[#1F2A1A]">
          {value}
        </p>
      </div>
    </div>
  );
}

function ResearchDetail({
  research,
  researches,
  onBack,
}: {
  research: Research;
  researches: Research[];
  onBack: () => void;
}) {
  /* penelitian lain: satu program dulu, lalu kelompok yang sama */
  const others = researches
    .filter((item) => item.id !== research.id)
    .sort(
      (a, b) =>
        Number(b.program === research.program) -
          Number(a.program === research.program) ||
        Number(b.group === research.group) - Number(a.group === research.group)
    )
    .slice(0, 3);

  const team = [
    { name: research.leader, role: "Ketua Pengusul" },
    ...research.members.map((name) => ({ name, role: "Anggota" })),
  ];

  return (
    <>
      {/* FOTO BESAR (selebar konten, sama dengan lebar bagian isi di bawahnya)
          Rasio 16:9, minimal 1920 x 1080 px, PNG atau JPG.
          Hanya tampil kalau penelitian punya gambar. */}
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
            Kembali ke Daftar Penelitian
          </button>

          {research.image && (
            <Reveal className="mt-5">
              <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden rounded-2xl border border-[#D9E2D3] bg-[#EEF4EA] shadow-[0_8px_30px_rgba(31,42,26,0.05)]">
                <Image
                  src={research.image}
                  unoptimized
                  alt={research.title}
                  fill
                  priority
                  quality={90}
                  sizes="(max-width: 1120px) 100vw, 1120px"
                  className="object-cover"
                />
              </div>
            </Reveal>
          )}

          {/* JUDUL DAN INFORMASI RINGKAS (di bawah foto) */}
          <Reveal delay={80} className={research.image ? "mt-8" : "mt-6"}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-[#31551F] px-3 py-1 text-[11.5px] font-semibold text-white">
                {research.group}
              </span>

              <span className="rounded-lg bg-[#EEF4EA] px-3 py-1 text-[11.5px] font-semibold text-[#3F6B28]">
                {research.program}
              </span>

              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#5E6B58]">
                <CalendarDays size={14} strokeWidth={2} aria-hidden />
                {research.year}
              </span>
            </div>

            <h1 className="mt-4 max-w-[900px] text-[19px] font-semibold leading-[1.4] tracking-[-0.015em] text-[#1F2A1A] sm:text-[21px] md:text-[24px]">
              {research.title}
            </h1>

            <p className="mt-4 text-[13.5px] text-[#5E6B58]">
              Ketua Pengusul:{" "}
              <span className="font-semibold text-[#1F2A1A]">
                {research.leader}
              </span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ISI */}
      <section className="bg-white pb-14 pt-10 md:pb-20 md:pt-12">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:gap-8">
            {/* KOLOM KIRI */}
            <div className="space-y-6">
              <Reveal delay={80}>
                <div className="rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-8">
                  <PanelHeader icon={FileText} title="Ringkasan Penelitian" />

                  <p className="text-[14px] leading-[1.9] text-[#5E6B58]">
                    {research.abstract || "Ringkasan penelitian belum tersedia."}
                  </p>

                  {research.keywords.length > 0 && (
                    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#E7EDE3] pt-5">
                      <span className="mr-1 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2F3B2A]">
                        <Tag size={14} strokeWidth={2} aria-hidden />
                        Kata kunci:
                      </span>

                      {research.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-md bg-[#EEF4EA] px-2.5 py-1 text-[11.5px] font-medium text-[#3F6B28]"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>

              <Reveal delay={160}>
                <div className="rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-8">
                  <PanelHeader icon={Users} title="Tim Peneliti" />

                  <ul>
                    {team.map((member) => (
                      <li
                        key={`${member.role}-${member.name}`}
                        className="flex items-center gap-4 border-b border-[#E7EDE3] py-3.5 first:pt-0 last:border-b-0 last:pb-0"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#31551F] text-[12.5px] font-semibold text-white">
                          {getInitials(member.name)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium leading-snug text-[#2F3B2A]">
                            {member.name}
                          </span>
                          <span className="mt-0.5 block text-[11.5px] text-[#5E6B58]">
                            {member.role}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            {/* KOLOM KANAN */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Reveal delay={120}>
                <div className="rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-7">
                  <PanelHeader icon={Layers} title="Informasi Penelitian" />

                  <div>
                    <InfoRow
                      icon={Building2}
                      label="Kelompok Program"
                      value={`Program ${research.group}`}
                    />
                    <InfoRow
                      icon={WalletCards}
                      label="Skema"
                      value={research.program}
                    />
                    <InfoRow
                      icon={CalendarDays}
                      label="Tahun"
                      value={research.year}
                    />
                    {research.field && (
                      <InfoRow
                        icon={Layers}
                        label="Bidang"
                        value={research.field}
                      />
                    )}
                  </div>
                </div>
              </Reveal>
            </aside>
          </div>

          {/* PENELITIAN LAINNYA */}
          {others.length > 0 && (
            <div className="mt-14 border-t border-[#D9E2D3] pt-10 md:mt-16 md:pt-12">
              <Reveal>
                <h2 className="text-[21px] font-bold leading-[1.3] tracking-[-0.02em] text-[#31551F] sm:text-[24px]">
                  Penelitian Lainnya
                </h2>
              </Reveal>

              <ul className="mt-6 grid gap-4 md:grid-cols-3">
                {others.map((item, index) => (
                  <li key={item.id}>
                    <Reveal delay={index * 90} className="h-full">
                      <a
                        href={`${DETAIL_HASH}${encodeURIComponent(item.id)}`}
                        className="group flex h-full flex-col rounded-2xl border border-[#D9E2D3] bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[#EEF4EA] px-2 py-0.5 text-[11px] font-semibold text-[#3F6B28]">
                            {item.program}
                          </span>
                          <span className="text-[11.5px] font-medium text-[#5E6B58]">
                            {item.year}
                          </span>
                        </span>

                        <span className="mt-3 line-clamp-3 block text-[14px] font-semibold leading-[1.55] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
                          {item.title}
                        </span>

                        <span className="mt-auto flex items-center justify-between gap-3 pt-4">
                          <span className="truncate text-[12.5px] text-[#5E6B58]">
                            {item.leader}
                          </span>
                          <ChevronRight
                            size={16}
                            strokeWidth={2.2}
                            aria-hidden
                            className="shrink-0 text-[#31551F] transition-transform duration-300 group-hover:translate-x-1"
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
   KARTU DOKUMEN (tautan ke dokumen, dibuka di tab baru)
========================================================= */

function DocumentCard({
  title,
  subtitle,
  href,
  primary = false,
}: {
  title: string;
  subtitle: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex h-full w-full items-center gap-4 overflow-hidden rounded-2xl border p-5 text-left transition-all duration-500 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] ${
        primary
          ? "border-[#31551F] bg-[#31551F] hover:bg-[#3F6B28] hover:shadow-[0_20px_44px_rgba(49,85,31,0.28)]"
          : "border-[#D9E2D3] bg-white hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)]"
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-500 group-hover:scale-105 ${
          primary
            ? "border border-white/25 bg-white/10 text-[#CFE8BF]"
            : "bg-[#EEF4EA] text-[#31551F]"
        }`}
      >
        <FileText size={22} strokeWidth={1.6} aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-[14.5px] font-semibold ${
            primary ? "text-white" : "text-[#1F2A1A]"
          }`}
        >
          {title}
        </span>

        <span
          className={`mt-0.5 block text-[12.5px] ${
            primary ? "text-white/75" : "text-[#5E6B58]"
          }`}
        >
          {subtitle}
        </span>
      </span>

      <ArrowRight
        size={17}
        strokeWidth={2}
        aria-hidden
        className={`shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${
          primary ? "text-white/80" : "text-[#31551F]"
        }`}
      />
    </a>
  );
}