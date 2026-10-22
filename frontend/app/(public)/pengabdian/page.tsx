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
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Globe,
  Handshake,
  Layers,
  Search,
  Tag,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

/* =========================================================
   FONT
   Sama dengan halaman Penelitian, Profil, dan Beranda. Idealnya
   font didefinisikan sekali di src/app/layout.tsx lalu dipakai
   semua halaman. Kalau Beranda memakai font lain, ganti di layout.
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* =========================================================
   PALET WARNA (sama dengan Beranda, Profil, dan Penelitian)
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

   FOTO KEGIATAN
   Admin bisa mengunggah semua jenis gambar dengan resolusi berapa
   pun. Gambar ditampilkan dengan object-cover, jadi tepi gambar
   yang bukan 16:9 bisa terpotong saat tampil.
========================================================= */

/* =========================================================
   DATA
========================================================= */

const SIMP3M_URL = "https://simp3m.polibatam.ac.id/";

/* Panduan 2026: pengusul wajib mendaftarkan usulan di platform PBL. */
const PBL_URL = "https://pbl.polibatam.ac.id/";

/* Rencana Induk Pengabdian kepada Masyarakat Politeknik Negeri Batam
   (RIPPM Polibatam), dokumen di situs P2M. */
const RIP_URL =
  "https://p2m.polibatam.ac.id/wp-content/uploads/2021/08/RIP-Pengabdian-Masyarakat-2021-2025.pdf";

const PANDUAN_URL =
  "https://polbat-my.sharepoint.com/:b:/g/personal/p3m_polibatam_ac_id/IQAI9PcvgLjgQriZuVKH8eW8AX72_cv1jt0xpUUQW5m2tKc?e=pSyo2v";

const ALL_PROGRAMS = "Semua Program";
const ALL_YEARS = "Semua Tahun";
const PAGE_SIZE = 5;

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

/* Program pengabdian: 2 induk (Internal dan Eksternal), masing-masing
   punya anak. Judul anak harus sama persis dengan field `program`
   pada data pengabdian di bawah. */
const programGroups: ProgramGroup[] = [
  {
    id: "Internal",
    title: "Program Internal",
    description:
      "Pengabdian yang bersumber dari Politeknik Negeri Batam, melalui penugasan dan aktivitas PBL. Proposal diusulkan melalui SIMP3M.",
    icon: Building2,
    items: [
      {
        title: "Penugasan Polibatam",
        description:
          "Pengabdian yang ditugaskan oleh Politeknik Negeri Batam. Reviu substantif tidak dilakukan untuk pengabdian penugasan.",
        icon: FileText,
      },
      {
        title: "Hibah PBL",
        description:
          "Pengabdian melalui aktivitas Project, Product, atau Problem Based Learning. Pelaksanaannya diatur terpisah dengan tetap berpedoman pada alur pengajuan umum.",
        icon: Layers,
      },
    ],
  },
  {
    id: "Eksternal",
    title: "Program Eksternal",
    description:
      "Pengabdian dengan pendanaan dari luar Politeknik Negeri Batam: BIMA, CSR, dan sumber lain yang sah dari dalam maupun luar negeri.",
    icon: Globe,
    items: [
      {
        title: "Pengabdian BIMA",
        description:
          "Hibah nasional Kemdiktisaintek melalui aplikasi Basis Informasi Penelitian dan PkM (BIMA).",
        icon: ClipboardList,
      },
      {
        title: "Pengabdian CSR",
        description:
          "Pengabdian dalam bentuk Corporate Social Responsibility (CSR) bersama mitra.",
        icon: Handshake,
      },
      {
        title: "Kerja Sama dan Sumber Lainnya",
        description:
          "Kerja sama dengan lembaga lain di dalam dan luar negeri, dana mandiri, dan dana masyarakat.",
        icon: WalletCards,
      },
    ],
  },
];

/* Tahapan mengacu pada Buku Panduan Penelitian dan PkM 2026
   (Gambar 4 dan bagian 15). */
const serviceStages = [
  {
    title: "Pengumuman",
    desc: "Jadwal setiap tahapan disampaikan melalui email atau website P2M.",
  },
  {
    title: "Pengusulan",
    desc: "Proposal diunggah melalui SIMP3M, usulan didaftarkan di platform PBL, dan disetujui ketua jurusan.",
  },
  {
    title: "Penyeleksian atau penunjukan",
    desc: "Reviu administratif, reviu substantif, dan seleksi oleh reviewer. Sebelumnya, usulan ditinjau oleh Shilau.",
  },
  {
    title: "Penetapan",
    desc: "Judul yang didanai ditetapkan berdasarkan hasil seleksi dan ketersediaan dana, lalu proposal diperbaiki dan SP3 ditandatangani.",
  },
  {
    title: "Pelaksanaan",
    desc: "Diawali kontrak perjanjian. Dana tahap I sebesar 70% dicairkan sesuai SP3.",
  },
  {
    title: "Pemantauan dan evaluasi",
    desc: "Monitoring dilakukan setiap dua bulan, dan seminar reviu hasil diadakan saat kegiatan mencapai 70% waktu pelaksanaan.",
  },
  {
    title: "Pelaporan",
    desc: "Laporan kemajuan dan laporan akhir, paling lambat dua pekan setelah monitoring. Dana tahap II sebesar 30% dicairkan sesuai SP3.",
  },
  {
    title: "Penilaian luaran",
    desc: "Penilaian dan validasi luaran kegiatan pengabdian.",
  },
];

/* Data pengabdian diambil dari API Laravel (diisi lewat halaman admin).
   id dipakai sebagai alamat detail: /pengabdian#detail-<id> */
type CommunityService = {
  id: string;
  title: string;
  leader: string;
  partner: string;
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
type ApiCommunityService = {
  id: number;
  judul: string;
  ketua: string;
  mitra: string | null;
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

/* gambar transparan 1x1, dipakai kalau kegiatan belum punya gambar */
const EMPTY_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/* Jaga-jaga kalau API mengirim path relatif, bukan URL lengkap */
function imageUrl(path: string | null): string {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return `${BASE_URL}/storage/${path.replace(/^\/?(storage\/)?/, "")}`;
}

function groupOfProgram(program: string): CommunityService["group"] {
  return (
    programGroups.find((group) =>
      group.items.some((item) => item.title === program)
    )?.id ?? ""
  );
}

function fromApi(item: ApiCommunityService): CommunityService {
  const group =
    item.kelompok === "Internal" || item.kelompok === "Eksternal"
      ? item.kelompok
      : groupOfProgram(item.program);

  return {
    id: String(item.id),
    title: item.judul,
    leader: item.ketua,
    partner: item.mitra ?? "",
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

/* Pilihan filter: semua, induk program, lalu tiap anak */
const programOptions = [
  ALL_PROGRAMS,
  ...programGroups.map((group) => group.title),
  ...programGroups.flatMap((group) => group.items.map((item) => item.title)),
];

function matchesProgram(service: CommunityService, selected: string) {
  if (selected === ALL_PROGRAMS) return true;

  const group = programGroups.find((item) => item.title === selected);
  if (group) return service.group === group.id;

  return service.program === selected;
}

function getPageItems(total: number, current: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = Array.from(
    new Set([1, total, current - 1, current, current + 1])
  )
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);

  const items: (number | "gap")[] = [];

  pages.forEach((n, index) => {
    if (index > 0 && n - pages[index - 1] > 1) items.push("gap");
    items.push(n);
  });

  return items;
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
        <p className="mt-3 max-w-[620px] text-[14px] leading-[1.75] text-[#5E6B58]">
          {description}
        </p>
      )}
    </Reveal>
  );
}

const shortcutClass =
  "rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/* =========================================================
   HALAMAN PENGABDIAN
   - tampilan daftar  : /pengabdian
   - tampilan detail  : /pengabdian#detail-<id>
     (dalam satu file, tombol Kembali / tombol back browser
      mengembalikan ke daftar)
========================================================= */

const DETAIL_HASH = "#detail-";

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

export default function PengabdianPage() {
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState(ALL_PROGRAMS);
  const [year, setYear] = useState(ALL_YEARS);
  const [page, setPage] = useState(1);
  const [activeGroupId, setActiveGroupId] = useState<ProgramGroup["id"] | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prevSelected = useRef<string | null>(null);

  /* data pengabdian dari API */
  const [communityServices, setCommunityServices] = useState<
    CommunityService[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/pengabdian`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`Kode ${res.status}`);

        const json = await res.json();

        if (!cancelled) {
          setCommunityServices(
            ((json.data ?? []) as ApiCommunityService[]).map(fromApi)
          );
          setLoadError("");
        }
      } catch {
        if (!cancelled) setLoadError("Data pengabdian gagal dimuat.");
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
      jumpTo(document.getElementById("daftar-pengabdian"));
    }
    prevSelected.current = selectedId;
  }, [selectedId]);

  /* kembali ke halaman 1 saat filter berubah */
  useEffect(() => {
    setPage(1);
  }, [search, program, year]);

  const closeDetail = () => {
    window.location.hash = "daftar-pengabdian";
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

  /* pilih program dari kartu program, lalu geser ke daftar */
  const showProgram = (title: string) => {
    setProgram(title);
    setYear(ALL_YEARS);
    setSearch("");
    document
      .getElementById("daftar-pengabdian")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const goToPage = (next: number) => {
    setPage(next);
    document
      .getElementById("daftar-pengabdian")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const selectedService = communityServices.find(
    (service) => service.id === selectedId
  );

  const filteredServices = useMemo(() => {
    const keyword = search.toLowerCase();

    return communityServices.filter((service) => {
      const matchSearch =
        service.title.toLowerCase().includes(keyword) ||
        service.leader.toLowerCase().includes(keyword) ||
        service.field.toLowerCase().includes(keyword);

      const matchYear = year === ALL_YEARS || service.year === year;

      return matchSearch && matchesProgram(service, program) && matchYear;
    });
  }, [communityServices, search, program, year]);

  /* pilihan tahun diambil dari data yang ada */
  const yearOptions = useMemo(
    () => [
      ALL_YEARS,
      ...Array.from(new Set(communityServices.map((service) => service.year))).sort(
        (a, b) => Number(b) - Number(a)
      ),
    ],
    [communityServices]
  );

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleServices = filteredServices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <main
      className={`${poppins.className} overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {selectedService ? (
        <ServiceDetail
          key={selectedService.id}
          service={selectedService}
          communityServices={communityServices}
          onBack={closeDetail}
        />
      ) : (
        <>
          {/* =====================================================
              HERO
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
                  <span aria-current="page" className="font-semibold text-white">
                    Pengabdian
                  </span>
                </nav>

                <h1 className="text-[36px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[44px] md:text-[52px]">
                  Pengabdian
                </h1>

                <p className="mx-auto mt-5 max-w-[580px] text-[14px] font-normal leading-[1.8] text-white/85 sm:text-[15px]">
                  Informasi program, pendanaan, tahapan, dan kegiatan
                  pengabdian kepada masyarakat Politeknik Negeri Batam.
                </p>

                {/* pintasan ke bagian halaman */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                  {[
                    { label: "Arah Pengabdian", href: "#rip-pengabdian" },
                    { label: "Program", href: "#program" },
                    { label: "Tahapan", href: "#tahapan" },
                    { label: "Data Pengabdian", href: "#daftar-pengabdian" },
                  ].map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={shortcutClass}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#31551F] via-[#8DC26F] to-[#31551F]" />
          </section>

          {/* =====================================================
              RIP PENGABDIAN (gaya sama dengan Renstra Penelitian)
          ===================================================== */}

          <section
            id="rip-pengabdian"
            className="scroll-mt-20 bg-white py-20 md:py-28"
          >
            <div className="mx-auto max-w-[1120px] px-5 md:px-7">
              <Reveal>
                <p className="text-[13px] font-semibold text-[#3F6B28]">
                  Arah Pengabdian
                </p>

                <h2 className="mt-2 max-w-[760px] text-[21px] font-bold leading-[1.3] tracking-[-0.02em] text-[#31551F] sm:text-[24px] md:text-[28px]">
                  Pengabdian yang terarah dan berdampak
                </h2>
              </Reveal>

              <Reveal delay={100} className="mt-5">
                <p className="max-w-[860px] text-[14px] leading-[1.75] text-[#5E6B58]">
                  Rencana Induk Pengabdian merupakan dokumen yang menjadi
                  acuan dalam pengembangan kegiatan pengabdian kepada
                  masyarakat di lingkungan Politeknik Negeri Batam.
                </p>
              </Reveal>

              <Reveal delay={200} className="mt-4">
                <p className="max-w-[860px] text-[14px] leading-[1.75] text-[#5E6B58]">
                  Melalui RIP Pengabdian, kegiatan diarahkan untuk mendukung
                  pemberdayaan masyarakat, penerapan ilmu pengetahuan dan
                  teknologi, serta menghasilkan kegiatan yang memberikan
                  manfaat nyata bagi masyarakat.
                </p>
              </Reveal>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <Reveal delay={100} className="flex">
                  <DocumentCard
                    title="Rencana Induk Pengabdian"
                    subtitle="Lihat dokumen"
                    href={RIP_URL}
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
              PROGRAM PENGABDIAN
              Tahap 1: dua kartu induk (Internal dan Eksternal)
              Tahap 2: setelah kartu diklik, tampil sub program
          ===================================================== */}

          <section
            id="program"
            className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-20 md:py-28"
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
                        Kembali ke Program Pengabdian
                      </button>
                    </Reveal>

                    <SectionTitle
                      eyebrow="Program Pengabdian"
                      title={activeGroup.title}
                      description={activeGroup.description}
                    />

                    <div className="grid gap-5 sm:grid-cols-2 md:gap-6">
                      {activeGroup.items.map((item, index) => {
                        const ItemIcon = item.icon;
                        const total = communityServices.filter(
                          (service) => service.program === item.title
                        ).length;

                        return (
                          <Reveal
                            key={item.title}
                            delay={index * 90}
                            className="flex"
                          >
                            <button
                              type="button"
                              onClick={() => showProgram(item.title)}
                              className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white p-7 text-left transition-all duration-500 hover:-translate-y-1.5 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] md:p-8"
                            >
                              {/* sapuan warna saat hover */}
                              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />

                              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F] transition-all duration-500 group-hover:bg-[#31551F] group-hover:text-white">
                                <ItemIcon size={22} strokeWidth={1.7} aria-hidden />
                              </span>

                              <span className="mt-5 block text-[16px] font-semibold leading-snug tracking-[-0.01em] text-[#1F2A1A]">
                                {item.title}
                              </span>

                              <span className="mt-2 block text-[13.5px] leading-[1.75] text-[#5E6B58]">
                                {item.description}
                              </span>

                              <span className="mt-auto flex items-center justify-between gap-3 pt-6">
                                <span className="text-[12px] font-medium text-[#5E6B58]">
                                  {total} pengabdian
                                </span>

                                <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#31551F]">
                                  Lihat pengabdian
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

                    <Reveal delay={200} className="mt-6">
                      <button
                        type="button"
                        onClick={() => showProgram(activeGroup.title)}
                        className="group inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                      >
                        Lihat semua pengabdian {activeGroup.title.toLowerCase()}
                        <ChevronRight
                          size={15}
                          strokeWidth={2.2}
                          aria-hidden
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </button>
                    </Reveal>
                  </>
                ) : (
                  <>
                    {/* TAHAP 1: KARTU INDUK */}
                    <SectionTitle
                      eyebrow="Program Pengabdian"
                      title="Temukan skema pengabdian yang sesuai"
                      description="Pilih kelompok program, lalu pilih sub program untuk melihat daftar pengabdiannya."
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
                              className="group relative flex min-h-[260px] w-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white p-8 text-left transition-all duration-500 hover:-translate-y-1.5 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] md:p-10"
                            >
                              {/* sapuan warna saat hover */}
                              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />

                              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#31551F] text-white">
                                <GroupIcon size={26} strokeWidth={1.6} aria-hidden />
                              </span>

                              <span className="mt-6 block text-[20px] font-semibold leading-snug tracking-[-0.01em] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
                                {group.title}
                              </span>

                              <span className="mt-2.5 block max-w-[440px] text-[14px] leading-[1.75] text-[#5E6B58]">
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
              TAHAPAN PENGABDIAN (vertikal ke bawah)
          ===================================================== */}

          <section
            id="tahapan"
            className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-20 md:py-28"
          >
            <div className="mx-auto max-w-[1120px] px-5 md:px-7">
              <SectionTitle
                eyebrow="Alur Pengabdian"
                title="Bagaimana proses pengabdian?"
                description="Tahapan pengelolaan pengabdian melalui SIMP3M, mulai dari pengumuman hingga penilaian luaran. Persyaratan pengusul program eksternal mengikuti panduan pemberi dana."
              />

              <div className="relative">
                <div className="absolute bottom-6 left-[18px] top-6 w-px bg-[#D9E2D3]" />

                <div className="space-y-3">
                  {serviceStages.map((stage, index) => (
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

                            <p className="mt-0.5 text-[12.5px] leading-[1.6] text-[#5E6B58]">
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
                  className="group inline-flex items-center gap-2 rounded-md bg-[#31551F] px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-300 hover:bg-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
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
                  className="group inline-flex items-center gap-2 rounded-md border border-[#31551F] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#31551F] transition-all duration-300 hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                >
                  Daftarkan usulan di platform PBL
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
              DAFTAR PENGABDIAN
          ===================================================== */}

          <section
            id="daftar-pengabdian"
            className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-20 md:py-28"
          >
            <div className="mx-auto max-w-[1120px] px-5 md:px-7">
              <SectionTitle
                eyebrow="Data Pengabdian"
                title="Eksplorasi kegiatan pengabdian"
                description="Temukan kegiatan pengabdian kepada masyarakat yang dilaksanakan di lingkungan Politeknik Negeri Batam."
              />

              {/* FILTER */}
              <Reveal>
                <div className="rounded-2xl border border-[#D9E2D3] bg-white p-3 shadow-[0_8px_30px_rgba(31,42,26,0.05)]">
                  <div className="grid gap-2 md:grid-cols-[1fr_260px_160px]">
                    {/* SEARCH */}
                    <div className="relative">
                      <Search
                        size={16}
                        aria-hidden
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5E6B58]"
                      />

                      <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari pengabdian atau nama ketua..."
                        aria-label="Cari pengabdian atau nama ketua"
                        className="h-11 w-full rounded-xl border border-transparent bg-[#F6F9F3] pl-10 pr-3 text-[13.5px] text-[#1F2A1A] outline-none transition-all placeholder:text-[#8A9684] focus:border-[#31551F] focus:bg-white"
                      />
                    </div>

                    {/* PROGRAM */}
                    <SelectField
                      label="Program"
                      value={program}
                      onChange={setProgram}
                      options={programOptions}
                    />

                    {/* TAHUN */}
                    <SelectField
                      label="Tahun"
                      value={year}
                      onChange={setYear}
                      options={yearOptions}
                    />
                  </div>
                </div>
              </Reveal>

              {/* HASIL (model list, klik kartu membuka detail) */}
              <div className="mt-6 space-y-3">
                {visibleServices.map((service, index) => (
                  <Reveal key={service.id} delay={index * 90}>
                    <a
                      href={`${DETAIL_HASH}${encodeURIComponent(service.id)}`}
                      aria-label={`Lihat detail: ${service.title}`}
                      className="group block w-full rounded-2xl border border-[#D9E2D3] bg-white p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] md:p-5"
                    >
                      <span className="flex items-center gap-4 md:gap-5">
                        {/* THUMBNAIL */}
                        <span className="relative h-[64px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-[#EEF4EA] sm:h-[76px] sm:w-[108px]">
                          <Image
                            src={service.image || EMPTY_IMAGE}
                            unoptimized
                            alt={service.title}
                            fill
                            quality={90}
                            sizes="(max-width: 640px) 88px, 108px"
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </span>

                        {/* ISI */}
                        <span className="block min-w-0 flex-1">
                          <span className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-[#31551F] px-2 py-0.5 text-[11px] font-semibold text-white">
                              {service.group}
                            </span>

                            <span className="rounded-md bg-[#EEF4EA] px-2 py-0.5 text-[11px] font-semibold text-[#3F6B28]">
                              {service.program}
                            </span>

                            <span className="text-[11.5px] font-medium text-[#5E6B58]">
                              {service.year}
                            </span>
                          </span>

                          <span className="line-clamp-2 block text-[14px] font-semibold leading-[1.55] tracking-[-0.005em] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F] md:text-[15px]">
                            {service.title}
                          </span>

                          <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                            <span className="text-[12.5px] text-[#5E6B58]">
                              <span className="font-medium text-[#2F3B2A]">
                                Ketua Pengusul:
                              </span>{" "}
                              {service.leader}
                            </span>

                            {service.field && (<span className="text-[12.5px] text-[#5E6B58]">
                              <span className="font-medium text-[#2F3B2A]">
                                Bidang:
                              </span>{" "}
                              {service.field}
                            </span>)}

                            {service.partner && (
                              <span className="text-[12.5px] text-[#5E6B58]">
                                <span className="font-medium text-[#2F3B2A]">
                                  Mitra:
                                </span>{" "}
                                {service.partner}
                              </span>
                            )}
                          </span>
                        </span>

                        {/* DETAIL (di HP hanya panah) */}
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-[#31551F] sm:px-2">
                          <span className="hidden sm:inline">Lihat Detail</span>
                          <ChevronRight
                            size={17}
                            strokeWidth={2.2}
                            aria-hidden
                            className="transition-transform duration-300 group-hover:translate-x-1"
                          />
                        </span>
                      </span>
                    </a>
                  </Reveal>
                ))}
              </div>

              {/* KOSONG */}
              {filteredServices.length === 0 && (
                <div className="mt-6 rounded-2xl border border-dashed border-[#B9CBB0] bg-white px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF4EA] text-[#31551F]">
                    <Search size={20} aria-hidden />
                  </div>

                  <p className="mt-4 text-[14.5px] font-semibold text-[#1F2A1A]">
                    {loading
                      ? "Memuat data pengabdian..."
                      : loadError
                        ? loadError
                        : communityServices.length === 0
                          ? "Belum ada data pengabdian."
                          : "Pengabdian tidak ditemukan."}
                  </p>

                  <p className="mt-1 text-[13.5px] text-[#5E6B58]">
                    {communityServices.length > 0 &&
                      "Coba gunakan kata kunci atau filter yang berbeda."}
                  </p>
                </div>
              )}

              {/* PAGINATION (tampil kalau lebih dari satu halaman) */}
              {totalPages > 1 && (
                <nav
                  aria-label="Halaman daftar pengabdian"
                  className="mt-8 flex items-center justify-center gap-1.5"
                >
                  <button
                    type="button"
                    aria-label="Halaman sebelumnya"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D9E2D3] bg-white text-[#5E6B58] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft size={16} aria-hidden />
                  </button>

                  {getPageItems(totalPages, currentPage).map((item, index) =>
                    item === "gap" ? (
                      <span
                        key={`gap-${index}`}
                        className="px-1 text-[13px] text-[#A3AE9E]"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        aria-label={`Halaman ${item}`}
                        aria-current={item === currentPage ? "page" : undefined}
                        onClick={() => goToPage(item)}
                        className={`h-9 w-9 rounded-lg text-[12.5px] font-semibold transition-all duration-300 ${
                          item === currentPage
                            ? "bg-[#31551F] text-white"
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
                    disabled={currentPage === totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D9E2D3] bg-white text-[#5E6B58] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight size={16} aria-hidden />
                  </button>
                </nav>
              )}
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

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   TAMPILAN DETAIL PENGABDIAN
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

function ServiceDetail({
  service,
  communityServices,
  onBack,
}: {
  service: CommunityService;
  communityServices: CommunityService[];
  onBack: () => void;
}) {
  /* kegiatan lain: satu program dulu, lalu kelompok yang sama */
  const others = communityServices
    .filter((item) => item.id !== service.id)
    .sort(
      (a, b) =>
        Number(b.program === service.program) -
          Number(a.program === service.program) ||
        Number(b.group === service.group) - Number(a.group === service.group)
    )
    .slice(0, 3);

  const team = [
    { name: service.leader, role: "Ketua Pengusul" },
    ...service.members.map((name) => ({ name, role: "Anggota" })),
  ];

  return (
    <>
      {/* FOTO BESAR (selebar konten, sama dengan lebar bagian isi di bawahnya)
          Rasio 16:9, minimal 1920 x 1080 px, PNG atau JPG */}
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
            Kembali ke Daftar Pengabdian
          </button>

          <Reveal className="mt-5">
            <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden rounded-2xl border border-[#D9E2D3] bg-[#EEF4EA] shadow-[0_8px_30px_rgba(31,42,26,0.05)]">
              <Image
                src={service.image || EMPTY_IMAGE}
                            unoptimized
                alt={service.title}
                fill
                priority
                quality={90}
                sizes="(max-width: 1120px) 100vw, 1120px"
                className="object-cover"
              />
            </div>
          </Reveal>

          {/* JUDUL DAN INFORMASI RINGKAS (di bawah foto) */}
          <Reveal delay={80} className="mt-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-[#31551F] px-3 py-1 text-[11.5px] font-semibold text-white">
                {service.group}
              </span>

              <span className="rounded-lg bg-[#EEF4EA] px-3 py-1 text-[11.5px] font-semibold text-[#3F6B28]">
                {service.program}
              </span>

              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#5E6B58]">
                <CalendarDays size={14} strokeWidth={2} aria-hidden />
                {service.year}
              </span>
            </div>

            <h1 className="mt-4 max-w-[900px] text-[19px] font-semibold leading-[1.4] tracking-[-0.015em] text-[#1F2A1A] sm:text-[21px] md:text-[24px]">
              {service.title}
            </h1>

            <p className="mt-4 text-[13.5px] text-[#5E6B58]">
              Ketua Pengusul:{" "}
              <span className="font-semibold text-[#1F2A1A]">
                {service.leader}
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
                  <PanelHeader icon={FileText} title="Ringkasan Kegiatan" />

                  <p className="text-[14px] leading-[1.9] text-[#5E6B58]">
                    {service.abstract || "Ringkasan kegiatan belum tersedia."}
                  </p>

                  {service.keywords.length > 0 && (
                    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#E7EDE3] pt-5">
                      <span className="mr-1 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2F3B2A]">
                        <Tag size={14} strokeWidth={2} aria-hidden />
                        Kata kunci:
                      </span>

                      {service.keywords.map((keyword) => (
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
                  <PanelHeader icon={Users} title="Tim Pengabdian" />

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
                  <PanelHeader icon={Layers} title="Informasi Pengabdian" />

                  <div>
                    <InfoRow
                      icon={Building2}
                      label="Kelompok Program"
                      value={`Program ${service.group}`}
                    />
                    <InfoRow
                      icon={WalletCards}
                      label="Skema"
                      value={service.program}
                    />
                    <InfoRow
                      icon={CalendarDays}
                      label="Tahun"
                      value={service.year}
                    />
                    {service.partner && (
                      <InfoRow
                        icon={Handshake}
                        label="Mitra"
                        value={service.partner}
                      />
                    )}
                    {service.field && (<InfoRow
                      icon={Layers}
                      label="Bidang"
                      value={service.field}
                    />)}
                  </div>
                </div>
              </Reveal>
            </aside>
          </div>

          {/* PENGABDIAN LAINNYA */}
          {others.length > 0 && (
            <div className="mt-14 border-t border-[#D9E2D3] pt-10 md:mt-16 md:pt-12">
              <Reveal>
                <h2 className="text-[21px] font-bold leading-[1.3] tracking-[-0.02em] text-[#31551F] sm:text-[24px]">
                  Pengabdian Lainnya
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

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-transparent bg-[#F6F9F3] px-3 pr-9 text-[13.5px] text-[#1F2A1A] outline-none transition-all focus:border-[#31551F] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6B58]"
      />
    </div>
  );
}