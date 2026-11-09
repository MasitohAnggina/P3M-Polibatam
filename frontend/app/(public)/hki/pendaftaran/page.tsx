"use client";

import { Poppins } from "next/font/google";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Copyright,
  Cpu,
  ExternalLink,
  FileText,
  Lightbulb,
  PenTool,
  Tag,
  type LucideIcon,
} from "lucide-react";

/* =========================================================
   FONT
   Sama dengan halaman Beranda, Profil, Penelitian, dan Pengabdian.
   Idealnya font didefinisikan sekali di src/app/layout.tsx lalu
   dipakai semua halaman.
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* gradasi hero (sama dengan Beranda dan Profil).
   HERO: gaya sama dengan halaman Profil. Navbar (setinggi 72px)
   transparan di atas hero, jadi <main> diberi -mt-[72px] dan hero diberi
   pt-[72px]. Halaman ini harus terdaftar di HERO_PATHS pada Navbar.tsx
   ("/hki/pendaftaran"). */
const HERO_GRADIENT = [
  "linear-gradient(180deg, rgba(10,28,5,0.35) 0%, rgba(10,28,5,0) 45%)",
  "linear-gradient(135deg,#1B4010 0%,#2F5F1F 38%,#4C8E32 72%,#78B35A 100%)",
].join(", ");

/* set CSS variable --d (delay animasi) tanpa error TypeScript */
const delayStyle = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/* =========================================================
   PALET WARNA (sama dengan Beranda, Penelitian, dan Pengabdian)
   teks utama   : #1F2A1A
   hijau utama  : #31551F
   hijau gelap  : #213B14
   hijau medium : #3F6B28
   hijau aksen  : #8DC26F
   hijau muda   : #EEF4EA
   teks muted   : #5E6B58
   garis        : #D9E2D3

   PRINSIP TAMPILAN (supaya ringan dibaca)
   - Teks pendek: satu atau dua kalimat per card, dibuat sama
     panjang kira-kira (maksimal 2 baris).
   - Card satu baris SELALU sama tinggi (rata atas dan bawah).
   - Jarak antar bagian dirapatkan supaya halaman tidak panjang.

   BAGIAN HALAMAN
   1. Apa itu HKI           (pengantar 1 kalimat + 2 card)
   2. Jenis HKI             (5 card)
   3. Ajukan via SIMP3M     (tombol dan jadwal pengajuan)
   4. Tim Pengelola         (TABEL: no, jabatan, nama, jurusan)
   5. Informasi Terkait HKI (2 card tautan: materi dan panduan)

   TIM PENGELOLA
   Datanya ditulis langsung di kode (konstanta TEAM di bawah), TIDAK
   diambil dari API dan TIDAK dikelola lewat halaman admin. Kalau
   susunan tim berubah (SK baru), cukup ubah TEAM dan NOMOR_SK.
   Jurusan adalah jurusan yang DILAYANI tiap PIC (bisa lebih dari
   satu), sesuai SK. Untuk Ketua, jurusan dikosongkan.

   GRID KARTU (class .kartu-grid, di <style> bawah)
   Jumlah kolom ditentukan oleh LEBAR WADAH (container query),
   bukan lebar jendela. Hasilnya sama di Chrome dan Edge.
     wadah >= 880px : 3 kolom
     wadah >= 580px : 2 kolom
     di bawahnya    : 1 kolom
   Baris terakhir yang tidak penuh melebar sama besar sampai tepi kiri
   dan kanan sejajar dengan baris di atasnya (5 card = 3 + 2).
   Varian: .kartu-grid--dua (maksimal 2 kolom).
========================================================= */

/* =========================================================
   DATA
========================================================= */

const simp3mLogin = "https://simp3m.polibatam.ac.id/index.php?page=login";

/* Nomor SK pengelolaan Sentra HKI. Samakan dengan dokumen SK asli
   dan dengan website P3M. */
const NOMOR_SK = "171/K/PL29/I/2026";

/* File SK (PDF) di website P3M, dibuka di tab baru. */
const SK_URL =
  "https://p2m.polibatam.ac.id/wp-content/uploads/2026/03/171-Penetapan-Tim-Pengelola-Sentra-KI-Tahun-2026_compressed.pdf";

/* Materi HKI (folder OneDrive P3M) dan tautan layanan Sentra HKI
   (Linktree). Keduanya situs luar, dibuka di tab baru. */
const MATERI_HKI_URL =
  "https://polbat-my.sharepoint.com/personal/p3m_polibatam_ac_id/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fp3m%5Fpolibatam%5Fac%5Fid%2FDocuments%2FSentra%20HKI%2FMateri%2D%20Materi%20HKI&ga=1";

const PENDAFTARAN_HKI_URL = "https://linktr.ee/IPLink_SentralAkses";

/* ---------------------------------------------------------
   TIM PENGELOLA SENTRA HKI (sesuai SK No. 171/K/PL29/I/2026)
   Urutan tampil = urutan di array ini.
--------------------------------------------------------- */

type TeamMember = {
  role: string;
  name: string;
  /* jurusan yang dilayani; kosong untuk Ketua */
  departments: string[];
};

/* Paten dan Desain Industri melayani keempat jurusan */
const ALL_DEPARTMENTS = [
  "Teknik Elektro",
  "Teknik Mesin",
  "Teknik Informatika",
  "Manajemen Bisnis",
];

const TEAM: TeamMember[] = [
  {
    role: "Ketua Sentra HKI",
    name: "Fitriyanti Nakul",
    departments: [],
  },
  {
    role: "PIC Hak Cipta",
    name: "Muhammad Ali Faisal",
    departments: ["Manajemen Bisnis", "Teknik Mesin"],
  },
  {
    role: "PIC Hak Cipta",
    name: "Widya Putri Ramadhani",
    departments: ["Teknik Informatika", "Teknik Elektro"],
  },
  {
    role: "PIC Paten / Paten Sederhana, dan DTLST",
    name: "Mishthafiyatillah",
    departments: ALL_DEPARTMENTS,
  },
  {
    role: "PIC Desain Industri",
    name: "Adi Syahputra Purba",
    departments: ALL_DEPARTMENTS,
  },
];

type InfoItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type LinkItem = InfoItem & {
  href: string;
};

/* Dua kelompok HKI. Hak Cipta timbul otomatis (pencatatan hanya
   memperkuat bukti); hak kekayaan industri berlaku lewat pendaftaran. */
const hkiCategories: InfoItem[] = [
  {
    title: "Hak Cipta",
    description:
      "Timbul otomatis saat karya diwujudkan. Pencatatan ke DJKI tidak wajib, tetapi memperkuat bukti.",
    icon: Copyright,
  },
  {
    title: "Hak Kekayaan Industri",
    description:
      "Meliputi paten, merek, desain industri, dan sejenisnya. Berlaku setelah didaftarkan.",
    icon: Lightbulb,
  },
];

/* Deskripsi sengaja singkat (maksimal 2 baris) supaya semua card
   punya tinggi yang sama dan rapi. */
const hkiTypes: InfoItem[] = [
  {
    title: "Hak Cipta",
    description: "Hak eksklusif pencipta atas karya yang dihasilkannya.",
    icon: Copyright,
  },
  {
    title: "Paten",
    description: "Hak eksklusif inventor atas invensi di bidang teknologi.",
    icon: Lightbulb,
  },
  {
    title: "Desain Industri",
    description: "Perlindungan bentuk, garis, atau warna pada suatu produk.",
    icon: PenTool,
  },
  {
    title: "Merek",
    description: "Tanda pembeda barang atau jasa, seperti nama atau logo.",
    icon: Tag,
  },
  {
    title: "Desain Tata Letak Sirkuit Terpadu",
    description: "Rancangan tata letak tiga dimensi sirkuit pada semikonduktor.",
    icon: Cpu,
  },
];

const relatedInfo: LinkItem[] = [
  {
    title: "Materi terkait HKI",
    description: "Dokumen Materi HKI Polibatam.",
    href: MATERI_HKI_URL,
    icon: FileText,
  },
  {
    title: "Panduan Pendaftaran",
    description: "Panduan terkait proses pendaftaran HKI.",
    href: PENDAFTARAN_HKI_URL,
    icon: BookOpen,
  },
];

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

/* Animasi hero yang mengikuti scroll (sama dengan Beranda dan Profil).
   Mengisi variabel CSS --p (0 = hero di posisi awal, 1 = hero sudah
   terscroll habis) langsung ke DOM, bukan state. */
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
        className="h-full origin-left scale-x-0 bg-[#31551F]"
      />
    </div>
  );
}

/* =========================================================
   JUDUL BAGIAN (rata kiri, jarak dirapatkan)
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
    <Reveal className="mb-7 md:mb-9">
      {eyebrow && (
        <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#3F6B28]">
          {eyebrow}
        </p>
      )}

      <h2 className="max-w-[720px] text-[24px] font-bold leading-[1.25] tracking-[-0.02em] text-[#1F2A1A] sm:text-[27px] md:text-[30px]">
        {title}
      </h2>

      {description && (
        <p className="mt-2.5 max-w-[620px] text-[14px] leading-[1.7] text-[#5E6B58]">
          {description}
        </p>
      )}
    </Reveal>
  );
}

/* =========================================================
   CARD RINGKAS
   Ikon kecil di kiri, judul dan teks di kanan.
   Tinggi card mengikuti card terpanjang di barisnya, jadi atas
   dan bawah tiap baris selalu sejajar (h-full + min-height).
   LinkCard = card yang menjadi tautan ke situs luar
   (dibuka di tab baru).
========================================================= */

const cardClass =
  "group relative flex h-full min-h-[104px] w-full items-start gap-4 overflow-hidden rounded-xl border border-[#D9E2D3] bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_10px_24px_rgba(49,85,31,0.10)] sm:p-5";

const iconBoxClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF4EA] text-[#31551F] transition-colors duration-300 group-hover:bg-[#31551F] group-hover:text-white";

function InfoCard({ item }: { item: InfoItem }) {
  const Icon = item.icon;

  return (
    <article className={cardClass}>
      <span className={iconBoxClass}>
        <Icon size={20} strokeWidth={1.7} aria-hidden />
      </span>

      <div className="min-w-0">
        <h3 className="text-[14.5px] font-semibold leading-[1.4] text-[#1F2A1A]">
          {item.title}
        </h3>

        <p className="mt-1 text-[13px] leading-[1.65] text-[#5E6B58]">
          {item.description}
        </p>
      </div>
    </article>
  );
}

function LinkCard({ item }: { item: LinkItem }) {
  const Icon = item.icon;

  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cardClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]`}
    >
      <span className={iconBoxClass}>
        <Icon size={20} strokeWidth={1.7} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="text-[14.5px] font-semibold leading-[1.4] text-[#1F2A1A]">
          {item.title}
        </h3>

        <p className="mt-1 text-[13px] leading-[1.65] text-[#5E6B58]">
          {item.description}
        </p>

        <span className="mt-2.5 inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#31551F]">
          Buka Tautan
          <ArrowUpRight
            size={15}
            strokeWidth={2.2}
            aria-hidden
            className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
          <span className="sr-only"> (membuka tab baru)</span>
        </span>
      </div>
    </a>
  );
}

/* =========================================================
   HALAMAN PENDAFTARAN HKI
========================================================= */

const thClass =
  "px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-[#3F6B28] sm:px-5";

const tdClass = "px-4 py-3.5 align-top text-[13.5px] leading-[1.6] sm:px-5";

export default function PendaftaranHKIPage() {
  const reduceMotion = usePrefersReducedMotion();
  const heroRef = useHeroScroll<HTMLElement>(reduceMotion);

  return (
    <main
      className={`${poppins.className} -mt-[72px] overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {/* =====================================================
          HERO
      ===================================================== */}
      <section
        ref={heroRef}
        className="hero-bg relative overflow-hidden pt-[72px] text-white"
        style={{ backgroundImage: HERO_GRADIENT }}
      >
        <div className="hero-content relative z-10 mx-auto max-w-[1120px] px-5 pb-14 pt-12 text-center md:px-7 md:pb-20 md:pt-16">
          <div className="mx-auto max-w-[720px]">
            {/* judul muncul kata demi kata */}
            <h1 className="text-[36px] font-medium leading-[1.15] tracking-[-0.02em] [text-wrap:balance] sm:text-[44px] md:text-[52px]">
              {"Pendaftaran HKI".split(" ").map((word, index) => (
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
              Informasi mengenai proses pendaftaran dan pengelolaan Hak
              Kekayaan Intelektual di Politeknik Negeri Batam.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          APA ITU HKI
          Pengantar satu kalimat + dua card
      ===================================================== */}
      <section
        id="apa-itu-hki"
        className="scroll-mt-20 bg-white py-14 md:py-20"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Tentang HKI"
            title="Apa itu Hak Kekayaan Intelektual?"
            description="Hak hukum atas karya hasil pemikiran, agar pencipta atau penemunya dapat menikmati manfaatnya. Di Indonesia, HKI terbagi dua kelompok."
          />

          <div className="kartu-grid kartu-grid--dua">
            {hkiCategories.map((item, index) => (
              <Reveal key={item.title} delay={index * 100} className="flex">
                <InfoCard item={item} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          JENIS HKI
          3 kolom; baris terakhir (2 card) rata tengah
      ===================================================== */}
      <section
        id="jenis-hki"
        className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-14 md:py-20"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Informasi HKI"
            title="Jenis HKI yang dapat didaftarkan"
          />

          <div className="kartu-grid">
            {hkiTypes.map((item, index) => (
              <Reveal key={item.title} delay={index * 80} className="flex">
                <InfoCard item={item} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          AJAKAN PENGAJUAN SIMP3M
          Pita hijau: tombol utama dan jadwal singkat.
      ===================================================== */}
      <section
        className="relative overflow-hidden bg-[#31551F] py-12 text-white md:py-14"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8DC26F]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#8DC26F]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1120px] px-5 md:px-7">
          <Reveal className="mx-auto max-w-[560px] text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[#CFE8BF]">
              <ExternalLink size={20} strokeWidth={1.6} aria-hidden />
            </span>

            <h2 className="mt-4 text-[22px] font-bold leading-[1.25] tracking-[-0.02em] md:text-[27px]">
              Ajukan HKI melalui SIMP3M
            </h2>

            <p className="mt-2.5 text-[14px] leading-[1.7] text-white/80">
              Pengajuan dibuka hingga tanggal 15 setiap bulan. Pengajuan
              setelah tanggal 15 diproses pada bulan berikutnya.
            </p>

            {/* link eksternal: pakai <a> biasa, bukan next/link */}
            <a
              href={simp3mLogin}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-[13px] font-semibold text-[#31551F] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Buka SIMP3M
              <ArrowRight
                size={15}
                strokeWidth={1.8}
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </a>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          TIM PENGELOLA SENTRA HKI (TABEL)
          Data dari konstanta TEAM (tidak dari API / admin).
          Kolom: No, Jabatan, Nama, Jurusan yang dilayani.
          Di layar kecil tabel bisa digeser ke samping.
      ===================================================== */}
      <section
        id="tim-pengelola"
        className="scroll-mt-20 bg-white py-14 md:py-20"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Tim Pengelola HKI"
            title="Tim Pengelola Sentra HKI Polibatam"
          />

          {/* dasar pengelolaan, satu kalimat sebelum tabel */}
          <Reveal>
            <p className="-mt-3 mb-5 text-[13.5px] leading-[1.7] text-[#5E6B58] md:-mt-5">
              Berikut tim pengelola berdasarkan Surat Keputusan No.{" "}
              <a
                href={SK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#31551F] underline decoration-[#8DC26F] underline-offset-4 transition-colors hover:text-[#213B14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
              >
                {NOMOR_SK}
                <span className="sr-only"> (membuka PDF di tab baru)</span>
              </a>
              .
            </p>
          </Reveal>

          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <caption className="sr-only">
                    Tim Pengelola Sentra HKI Polibatam
                  </caption>

                  <thead>
                    <tr className="border-b border-[#D9E2D3] bg-[#EEF4EA]">
                      <th scope="col" className={`${thClass} w-[64px]`}>
                        No
                      </th>
                      <th scope="col" className={`${thClass} w-[30%]`}>
                        Jabatan
                      </th>
                      <th scope="col" className={`${thClass} w-[24%]`}>
                        Nama
                      </th>
                      <th scope="col" className={thClass}>
                        Jurusan
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {TEAM.map((member, index) => (
                      <tr
                        key={`${member.role}-${member.name}`}
                        className="border-t border-[#D9E2D3] transition-colors duration-300 first:border-t-0 hover:bg-[#F6F9F3]"
                      >
                        <td className={`${tdClass} font-semibold text-[#31551F]`}>
                          {index + 1}
                        </td>

                        <td className={`${tdClass} text-[#31551F]`}>
                          {member.role}
                        </td>

                        <td
                          className={`${tdClass} font-semibold text-[#1F2A1A]`}
                        >
                          {member.name}
                        </td>

                        <td className={`${tdClass} text-[#5E6B58]`}>
                          {member.departments.length > 0 ? (
                            member.departments.join(", ")
                          ) : (
                            <span aria-label="Tidak ada" className="text-[#A3AE9E]">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          INFORMASI TERKAIT HKI
          Dua card tautan: materi dan panduan pendaftaran
      ===================================================== */}
      <section
        id="informasi-terkait"
        className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-14 md:py-20"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Unduhan & Panduan"
            title="Informasi Terkait HKI"
          />

          <div className="kartu-grid kartu-grid--dua">
            {relatedInfo.map((item, index) => (
              <Reveal key={item.title} delay={index * 100} className="flex">
                <LinkCard item={item} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          GAYA HALAMAN
      ===================================================== */}

      <style>{`
        html {
          scroll-behavior: smooth;

          /* kunci ukuran dasar rem = 16px supaya padding, ikon, dan jarak
             (yang memakai rem) tidak membesar di browser dengan pengaturan
             font besar. Idealnya dipindah ke globals.css agar berlaku di
             semua halaman. */
          font-size: 16px;
        }

        /* GRID KARTU berbasis lebar wadah (container query).
           Tidak bergantung pada breakpoint Tailwind atau lebar jendela.
           Tanpa align-items khusus: card dalam satu baris otomatis
           ditarik sama tinggi (rata atas dan bawah). */
        .kartu-grid {
          --gap: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: var(--gap);
          container-type: inline-size;
        }

        /* flex-grow: 1 membuat card di baris terakhir yang tidak penuh
           melebar sama besar mengisi seluruh lebar, jadi tepi kiri dan
           kanannya sejajar dengan baris di atasnya. Contoh: 5 card =
           3 card di baris pertama, 2 card selebar setengah di baris kedua. */
        .kartu-grid > * {
          flex: 1 1 100%;
          min-width: 0;
        }

        /* 2 kolom */
        @container (min-width: 580px) {
          .kartu-grid > * {
            flex-basis: calc((100% - var(--gap)) / 2 - 0.5px);
          }
        }

        /* 3 kolom (kecuali varian "dua") */
        @container (min-width: 880px) {
          .kartu-grid:not(.kartu-grid--dua) > * {
            flex-basis: calc((100% - var(--gap) * 2) / 3 - 0.5px);
          }
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
           useHeroScroll. */
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