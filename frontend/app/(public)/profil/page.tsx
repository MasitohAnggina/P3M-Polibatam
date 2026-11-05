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
  ChevronRight,
  Download,
  Eye,
  Leaf,
  Mail,
  MapPin,
  Phone,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

/* =========================================================
   FONT
   Satu font untuk seluruh situs. Idealnya didefinisikan sekali
   di src/app/layout.tsx (variabel CSS) lalu dipakai semua halaman,
   supaya Beranda, Profil, HKI, dan halaman lain tidak berbeda.
   Kalau Beranda memakai font lain, ganti hanya di sini dan di
   layout, jangan per halaman.
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* =========================================================
   PALET WARNA (sama dengan Beranda, hijau utama #31551F)
   teks utama   : #1F2A1A
   hijau utama  : #31551F
   hijau gelap  : #213B14
   hijau medium : #3F6B28
   hijau aksen  : #8DC26F
   hijau muda   : #EEF4EA
   teks muted   : #5E6B58
   garis        : #D9E2D3

   LATAR SEKSI: putih semua (sama dengan Beranda). Pemisah antar
   seksi memakai garis tipis #D9E2D3, bukan warna latar berbeda.

   SKALA FONT
   hero judul   : 36 / 44 / 52
   judul seksi  : 24 / 28 / 32 (huruf kapital)
   sub judul    : 21 / 24 / 28
   judul kartu  : 14.5-18
   isi          : 14 (leading 1.75)
   label/meta   : 10.5-13

   HERO
   Gaya hero (gradasi, bobot huruf, animasi, navbar transparan)
   disamakan dengan hero Beranda. Ukurannya tetap lebih ringkas
   karena ini halaman dalam. Navbar (setinggi 72px) transparan di
   atas hero, jadi <main> diberi -mt-[72px] dan hero diberi
   pt-[72px] supaya gradasi hero tampil di belakang navbar. Isi hero
   tetap di posisi yang sama seperti sebelumnya. Halaman ini harus
   terdaftar di HERO_PATHS pada Navbar.tsx.

   ATURAN FOTO (untuk halaman ini dan form upload nanti)
   format       : PNG atau JPG/JPEG
   foto struktur: rasio 4:3, minimal 1280 x 960 px
   banner/hero  : rasio 16:9, minimal 1920 x 1080 px
   ukuran file  : maksimal 5 MB
   Validasi resolusi dilakukan di backend saat upload.
========================================================= */

/* gradasi hero (sama dengan Beranda): halus dan satu arah, hijau tua
   di kiri atas makin terang ke kanan bawah. Lapisan kedua hanya
   menggelapkan bagian atas sedikit supaya teks putih navbar tetap
   terbaca. */
const HERO_GRADIENT = [
  "linear-gradient(180deg, rgba(10,28,5,0.35) 0%, rgba(10,28,5,0) 45%)",
  "linear-gradient(135deg,#1B4010 0%,#2F5F1F 38%,#4C8E32 72%,#78B35A 100%)",
].join(", ");

/* =========================================================
   API
   Atur NEXT_PUBLIC_API_URL di .env.local, contoh:
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/* =========================================================
   TYPE
========================================================= */

type OrganizationMember = {
  id: number;
  role: string;
  name: string;
  image: string;
};

/* Bentuk data dari API Laravel */
type ApiMember = {
  id: number;
  jabatan: string;
  nama: string;
  foto: string | null;
  urutan: number;
};

/* =========================================================
   DATA
========================================================= */

/* DRAFT visi dan misi, disusun dari tupoksi P3M, Renstra, dan
   Polibatam University Berdampak. Perlu diverifikasi ke pimpinan
   P3M sebelum rilis. */
const visi =
  "Menjadi pusat penelitian dan pengabdian kepada masyarakat vokasi yang unggul, inovatif, dan berdampak nyata bagi masyarakat, industri, dan pembangunan berkelanjutan.";

const misi = [
  "Menyusun peta jalan penelitian dan pengabdian yang selaras dengan Renstra dan RIP Politeknik Negeri Batam.",
  "Menyelenggarakan dan mengoordinasikan penelitian serta pengabdian kepada masyarakat bagi dosen dan mahasiswa.",
  "Mengidentifikasi dan menyosialisasikan sumber pendanaan internal maupun eksternal.",
  "Mengelola publikasi ilmiah, jurnal institusi, dan pelindungan hak kekayaan intelektual.",
  "Memperluas kolaborasi dengan industri, pemerintah, perguruan tinggi, dan masyarakat untuk hilirisasi riset dan dampak nyata.",
];

const LAPORAN_DAMPAK_URL =
  "https://polbat-my.sharepoint.com/:b:/g/personal/p3m_polibatam_ac_id/IQDeI_xg-60RTr-O1opMKgpVAfMa5u5bFb4pnu1imIJG_T8?e=ZJtv19";

const landasan = ["RPJP 2025–2044", "Diktisaintek Berdampak", "SDGs"];

const dampak = [
  {
    icon: Users,
    title: "Dampak Sosial",
    desc: "Memperluas akses pendidikan yang inklusif, meningkatkan kualitas penelitian dan inovasi untuk menjawab masalah masyarakat, serta memperkuat pengabdian melalui kolaborasi dengan mitra.",
  },
  {
    icon: TrendingUp,
    title: "Dampak Ekonomi",
    desc: "Hilirisasi hasil riset, pengembangan kewirausahaan, dan kemitraan dengan dunia usaha dan industri yang memberi nilai tambah bagi perekonomian daerah.",
  },
  {
    icon: Leaf,
    title: "Dampak Lingkungan",
    desc: "Mengintegrasikan prinsip keberlanjutan dalam pengelolaan kampus, pendidikan, penelitian, dan pengabdian untuk mendukung Tujuan Pembangunan Berkelanjutan.",
  },
];

/* Bentuk data kontak dari API (GET /api/kontak) */
type Kontak = {
  alamat: string;
  email: string;
  telepon: string;
};

/* Cadangan kalau API belum terjangkau. Sumber utama: Admin > Pengaturan. */
const DEFAULT_KONTAK: Kontak = {
  alamat:
    "Politeknik Negeri Batam, Jl. Ahmad Yani, Tlk. Tering, Batam Kota, Kepulauan Riau 29461",
  email: "p3m@polibatam.ac.id",
  telepon: "0822-1199-6677",
};

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

/* Animasi hero yang mengikuti scroll (sama dengan Beranda).
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

/* Garis progres scroll di bagian paling atas halaman (sama dengan Beranda) */
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
   KOMPONEN KECIL
========================================================= */

/* Judul bagian: rata kiri, huruf kapital (sesuai mockup). */
function SectionTitle({ title }: { title: string }) {
  return (
    <Reveal className="mb-10 md:mb-14">
      <h2 className="text-[24px] font-bold uppercase leading-[1.2] tracking-[-0.005em] text-[#1F2A1A] sm:text-[28px] md:text-[32px]">
        {title}
      </h2>
    </Reveal>
  );
}

/* =========================================================
   HALAMAN PROFIL
========================================================= */

export default function ProfilPage() {
  const reduceMotion = usePrefersReducedMotion();
  const heroRef = useHeroScroll<HTMLElement>(reduceMotion);

  /* Struktur organisasi diambil dari backend/database.
     Urutan tampil mengikuti kolom urutan dari API. */
  const [organization, setOrganization] = useState<OrganizationMember[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/struktur-organisasi`, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) throw new Error(`Kode ${res.status}`);

        const json = await res.json();

        if (!cancelled) {
          setOrganization(
            (json.data as ApiMember[]).map((item) => ({
              id: item.id,
              role: item.jabatan,
              name: item.nama,
              image: item.foto ?? "",
            }))
          );
          setOrgError("");
        }
      } catch {
        if (!cancelled) setOrgError("Data struktur organisasi gagal dimuat.");
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Kontak P3M diambil dari backend (diatur di Admin > Pengaturan). */
  const [kontakData, setKontakData] = useState<Kontak>(DEFAULT_KONTAK);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/kontak`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) return;

        const json = await res.json();
        const data = json?.data ?? json;

        if (!cancelled) {
          setKontakData({
            alamat: String(data?.alamat ?? "") || DEFAULT_KONTAK.alamat,
            email: String(data?.email ?? "") || DEFAULT_KONTAK.email,
            telepon: String(data?.telepon ?? "") || DEFAULT_KONTAK.telepon,
          });
        }
      } catch {
        /* tetap pakai data cadangan */
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const kontak = [
    { icon: MapPin, label: "Alamat", value: kontakData.alamat },
    { icon: Mail, label: "Email", value: kontakData.email },
    { icon: Phone, label: "Telepon", value: kontakData.telepon },
  ];

  const heroTitle = "Profil";

  return (
    <main
      className={`${poppins.className} -mt-[72px] overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {/* =====================================================
          HERO
          gaya sama dengan hero Beranda: gradasi hijau, judul
          muncul kata demi kata saat dibuka, lalu isi bergeser dan
          memudar pelan saat di-scroll. Ukuran tetap ringkas.
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
              Pusat Penelitian dan Pengabdian kepada Masyarakat Politeknik
              Negeri Batam yang berperan dalam mendukung kegiatan penelitian,
              pengabdian kepada masyarakat, publikasi, dan pengembangan
              inovasi.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          TENTANG P3M
      ===================================================== */}
      <section id="tentang" className="scroll-mt-20 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <Reveal>
            <p className="text-[13px] font-semibold text-[#3F6B28]">
              Tentang Kami
            </p>

            <h2 className="mt-2 max-w-[760px] text-[21px] font-bold leading-[1.3] tracking-[-0.02em] text-[#31551F] sm:text-[24px] md:text-[28px]">
              Pusat Penelitian dan Pengabdian kepada Masyarakat
            </h2>
          </Reveal>

          <Reveal delay={100} className="mt-5">
            <p className="max-w-[860px] text-[14px] leading-[1.75] text-[#5E6B58]">
              Pusat Penelitian dan Pengabdian kepada Masyarakat (P3M) merupakan
              unsur pembantu pimpinan di Politeknik Negeri Batam yang
              bertanggung jawab langsung kepada Direktur. P3M berperan
              mengoordinasikan pelaksanaan penelitian, pengabdian kepada
              masyarakat, publikasi ilmiah, serta pengembangan inovasi di
              lingkungan Politeknik Negeri Batam.
            </p>
          </Reveal>

          <Reveal delay={200} className="mt-4">
            <p className="max-w-[860px] text-[14px] leading-[1.75] text-[#5E6B58]">
              P3M mendorong terciptanya kegiatan penelitian dan pengabdian yang
              berkualitas serta memberikan manfaat dan dampak nyata bagi
              masyarakat, industri, dan pembangunan.
            </p>
          </Reveal>

          <Reveal delay={300} className="mt-6">
            <Link
              href="/penelitian"
              className="group inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
            >
              Lihat kegiatan penelitian
              <ChevronRight
                size={15}
                strokeWidth={2.2}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          VISI & MISI
      ===================================================== */}
      <section
        id="visi-misi"
        className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-20 md:py-28"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle title="Visi dan Misi" />

          <div className="grid gap-5 md:grid-cols-2 md:gap-6">
            {/* VISI (hijau pekat) */}
            <Reveal className="h-full">
              <article className="group h-full min-h-[240px] rounded-2xl bg-[#31551F] p-7 text-white transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_44px_rgba(49,85,31,0.28)] md:p-10">
                <Eye size={30} strokeWidth={1.6} className="text-[#CFE8BF]" />

                <h3 className="mt-4 text-[18px] font-semibold uppercase tracking-[0.04em]">
                  Visi
                </h3>

                <p className="mt-3 text-[14px] leading-[1.75] text-white/90">
                  {visi}
                </p>
              </article>
            </Reveal>

            {/* MISI (putih) */}
            <Reveal delay={110} className="h-full">
              <article className="group h-full min-h-[240px] rounded-2xl border border-[#D9E2D3] bg-white p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)] md:p-10">
                <Target size={30} strokeWidth={1.6} className="text-[#31551F]" />

                <h3 className="mt-4 text-[18px] font-semibold uppercase tracking-[0.04em] text-[#31551F]">
                  Misi
                </h3>

                <ol className="mt-3 space-y-2">
                  {misi.map((item, index) => (
                    <li key={item}>
                      <div className="flex gap-2 text-[14px] leading-[1.75] text-[#5E6B58]">
                        <span className="shrink-0 font-semibold text-[#31551F]">
                          {index + 1}.
                        </span>
                        <span>{item}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =====================================================
          POLIBATAM UNIVERSITY BERDAMPAK
      ===================================================== */}
      <section
        id="berdampak"
        className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-20 md:py-28"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle title="Polibatam University Berdampak" />

          <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            {/* LOGO
                Letakkan file resmi di public/img/logo-polibatam-university.png
                (PNG transparan, minimal 640 x 320 px). */}
            <Reveal>
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-[#D9E2D3] bg-white p-8">
                <Image
                  src="/img/polibatam.jpg"
                  alt="Logo Polibatam University Berdampak"
                  width={640}
                  height={320}
                  quality={90}
                  sizes="(max-width: 1024px) 80vw, 360px"
                  className="h-auto w-full max-w-[300px] object-contain"
                />
              </div>
            </Reveal>

            <div>
              <Reveal delay={100}>
                <p className="text-[13px] font-semibold text-[#3F6B28]">
                  Laporan Dampak Sosial, Ekonomi, dan Lingkungan 2025
                </p>

                <h3 className="mt-2 text-[21px] font-bold leading-[1.3] tracking-[-0.02em] text-[#31551F] sm:text-[24px] md:text-[28px]">
                  Pendidikan vokasi yang memberi manfaat nyata
                </h3>
              </Reveal>

              <Reveal delay={180} className="mt-5">
                <p className="text-[14px] leading-[1.75] text-[#5E6B58]">
                  Polibatam University Berdampak adalah komitmen Politeknik
                  Negeri Batam untuk menghadirkan pendidikan vokasi yang
                  bermanfaat bagi masyarakat. Komitmen ini didokumentasikan
                  dalam laporan dampak tahunan yang mencakup pelaksanaan Tri
                  Dharma Perguruan Tinggi dan tata kelola kelembagaan.
                </p>
              </Reveal>

              <Reveal delay={260} className="mt-4">
                <p className="text-[14px] leading-[1.75] text-[#5E6B58]">
                  Laporan menjadi bentuk akuntabilitas kepada pemangku
                  kepentingan sekaligus dasar pengambilan keputusan berbasis
                  bukti.
                </p>
              </Reveal>

              <Reveal delay={340} className="mt-5">
                <ul className="flex flex-wrap gap-2" aria-label="Landasan">
                  {landasan.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-[#D9E2D3] bg-[#EEF4EA] px-3 py-1 text-[12px] font-medium text-[#31551F]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={420} className="mt-6">
                <a
                  href={LAPORAN_DAMPAK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-md bg-[#31551F] px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-300 hover:bg-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                >
                  <Download size={16} strokeWidth={2} aria-hidden />
                  Unduh Laporan 2025
                </a>
              </Reveal>
            </div>
          </div>

          {/* TIGA DIMENSI DAMPAK */}
          <div className="mt-12 grid gap-5 md:mt-16 md:grid-cols-3 md:gap-6">
            {dampak.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.title} delay={index * 110} className="h-full">
                  <article className="group h-full rounded-2xl border border-[#D9E2D3] bg-white p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)]">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF4EA] text-[#31551F] transition-colors duration-300 group-hover:bg-[#31551F] group-hover:text-white">
                      <Icon size={22} strokeWidth={1.8} aria-hidden />
                    </span>

                    <h3 className="mt-4 text-[16px] font-semibold text-[#31551F]">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-[14px] leading-[1.75] text-[#5E6B58]">
                      {item.desc}
                    </p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          STRUKTUR ORGANISASI
      ===================================================== */}
      <section className="border-t border-[#D9E2D3] bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle title="Struktur Organisasi" />

          {organization.length === 0 ? (
            <Reveal>
              <div className="rounded-2xl border border-dashed border-[#D9E2D3] bg-[#EEF4EA]/50 px-6 py-14 text-center">
                <p className="text-[14px] font-medium text-[#1F2A1A]">
                  {orgLoading
                    ? "Memuat data..."
                    : orgError || "Data struktur organisasi belum tersedia"}
                </p>
              </div>
            </Reveal>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {organization.map((person, index) => (
                <Reveal key={person.id} delay={(index % 3) * 110}>
                  <article className="group relative overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white transition-all duration-500 hover:-translate-y-1.5 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)]">
                    {/* FOTO (landscape 4:3). Backend sudah mengubah ukuran
                        ke 1280 x 960 px, jadi tidak perlu dioptimasi lagi
                        oleh next/image (unoptimized). */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#EEF4EA]">
                      {person.image && (
                        <Image
                          src={person.image}
                          alt={person.name}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>

                    {/* JABATAN & NAMA */}
                    <div className="px-4 pb-5 pt-3.5 text-center">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#3F6B28]">
                        {person.role}
                      </p>

                      <h3 className="mt-1.5 text-[14.5px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
                        {person.name}
                      </h3>
                    </div>

                    {/* sapuan warna saat hover */}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          KONTAK
      ===================================================== */}
      <section
        id="kontak"
        className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-20 md:py-28"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle title="Kontak P3M" />

          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            {/* KARTU KONTAK */}
            <div className="flex flex-col gap-4">
              {kontak.map((item, index) => {
                const Icon = item.icon;

                return (
                  <Reveal
                    key={item.label}
                    delay={index * 100}
                    className="flex-1"
                  >
                    <article className="group flex h-full min-h-[88px] items-center gap-4 rounded-2xl bg-[#31551F] px-6 py-5 text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#3F6B28] hover:shadow-[0_14px_32px_rgba(49,85,31,0.28)]">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                        <Icon size={20} strokeWidth={1.8} aria-hidden />
                      </span>

                      <div className="min-w-0">
                        <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-white">
                          {item.label}
                        </p>

                        <p className="mt-0.5 text-[13.5px] font-normal leading-[1.6] text-white/90">
                          {item.value}
                        </p>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>

            {/* PETA */}
            <Reveal delay={200} className="h-full">
              <div className="relative h-full min-h-[320px] overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white">
                <iframe
                  src="https://www.google.com/maps?q=Politeknik+Negeri+Batam,+Jl.+Ahmad+Yani,+Batam&output=embed"
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Lokasi Politeknik Negeri Batam"
                />

                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[#D9E2D3] bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#1F2A1A]">
                        Politeknik Negeri Batam
                      </p>

                      <p className="mt-0.5 text-[11.5px] text-[#5E6B58]">
                        Jl. Ahmad Yani, Tlk. Tering, Batam Kota
                      </p>
                    </div>

                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Politeknik+Negeri+Batam"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[#31551F] px-4 py-2 text-[12.5px] font-semibold text-white transition-all duration-300 hover:bg-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                    >
                      Buka Maps
                      <ChevronRight
                        size={15}
                        strokeWidth={2.2}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <style>{`
        html {
          scroll-behavior: smooth;
        }

        /* ANIMASI HERO (sama dengan Beranda) */

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