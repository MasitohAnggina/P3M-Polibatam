"use client";

import Image from "next/image";
import { Poppins } from "next/font/google";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Copyright,
  Cpu,
  ExternalLink,
  FileText,
  Lightbulb,
  PenTool,
  Tag,
  User,
  type LucideIcon,
} from "lucide-react";

/* =========================================================
   FONT
   Sama dengan halaman Beranda, Profil, Penelitian, dan Pengabdian.
   Idealnya font didefinisikan sekali di src/app/layout.tsx lalu
   dipakai semua halaman. Kalau Beranda memakai font lain, ganti
   di layout saja.
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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

   LATAR SEKSI: putih semua. Pemisah antar seksi memakai garis
   tipis #D9E2D3. Warna lembut (#F6F9F3) hanya untuk hover dan
   kolom isian, bukan untuk latar seksi.

   SKALA FONT
   hero judul   : 36 / 44 / 52
   judul seksi  : 26 / 30 / 34
   judul kartu  : 15 (huruf kapital)
   isi          : 13.5-14 (leading 1.75)
   label/meta   : 11.5-13

   FOTO TIM PENGELOLA
   format PNG atau JPG, rasio 4:3, minimal 1280 x 960 px,
   maksimal 5 MB (diatur lewat halaman admin Tim Pengelola HKI).
========================================================= */

/* =========================================================
   API
   Atur NEXT_PUBLIC_API_URL di .env.local, contoh:
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/* =========================================================
   TYPE
========================================================= */

type TeamMember = {
  id: number;
  role: string;
  name: string;
  image: string;
};

/* Bentuk data dari API Laravel */
type ApiTeamMember = {
  id: number;
  jabatan: string;
  nama: string;
  urutan: number;
  foto: string | null;
};

/* =========================================================
   DATA
========================================================= */

const simp3mLogin =
  "https://simp3m.polibatam.ac.id/index.php?page=login";

/* Penjelasan dasar HKI. Hak Cipta timbul otomatis dan pencatatan
   hanya memperkuat bukti; hak kekayaan industri berlaku melalui
   pendaftaran. */
const hkiCategories = [
  {
    title: "Hak Cipta",
    description:
      "Timbul otomatis ketika karya diwujudkan. Pencatatan ke DJKI tidak wajib, tetapi memperkuat bukti bila terjadi sengketa.",
    icon: Copyright,
  },
  {
    title: "Hak Kekayaan Industri",
    description:
      "Meliputi paten, merek, desain industri, rahasia dagang, desain tata letak sirkuit terpadu, dan indikasi geografis. Perlindungannya berlaku melalui pendaftaran.",
    icon: Lightbulb,
  },
];

type HkiType = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const hkiTypes: HkiType[] = [
  {
    title: "Hak Cipta",
    description:
      "Hak eksklusif bagi pencipta atau penerima hak untuk mengumumkan atau memperbanyak ciptaannya.",
    icon: Copyright,
  },
  {
    title: "Paten",
    description:
      "Hak eksklusif yang diberikan negara kepada inventor atas hasil invensinya di bidang teknologi.",
    icon: Lightbulb,
  },
  {
    title: "Desain Industri",
    description:
      "Kreasi bentuk, konfigurasi, atau komposisi garis dan warna yang menghasilkan kesan estetis serta dapat dipakai untuk produk, barang, atau kerajinan tangan.",
    icon: PenTool,
  },
  {
    title: "Merek",
    description:
      "Tanda berupa gambar, nama, kata, huruf, angka, susunan warna, atau kombinasinya yang memiliki daya pembeda dan digunakan dalam kegiatan perdagangan barang atau jasa.",
    icon: Tag,
  },
  {
    title: "Desain Tata Letak Sirkuit Terpadu",
    description:
      "Rancangan peletakan tiga dimensi elemen sirkuit yang saling berkaitan dan dibentuk secara terpadu dalam bahan semikonduktor, sebagai persiapan pembuatan sirkuit terpadu.",
    icon: Cpu,
  },
];

/* Materi HKI (folder OneDrive P3M) dan tautan layanan Sentra HKI
   (Linktree). Keduanya situs luar, dibuka di tab baru. */
const MATERI_HKI_URL =
  "https://polbat-my.sharepoint.com/personal/p3m_polibatam_ac_id/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fp3m%5Fpolibatam%5Fac%5Fid%2FDocuments%2FSentra%20HKI%2FMateri%2D%20Materi%20HKI&ga=1";

const PENDAFTARAN_HKI_URL = "https://linktr.ee/IPLink_SentralAkses";

const relatedInfo = [
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

/* =========================================================
   HALAMAN PENDAFTARAN HKI
========================================================= */

export default function PendaftaranHKIPage() {
  /* Tim pengelola diambil dari backend/database.
     Urutan tampil mengikuti kolom urutan dari API. */
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/tim-hki`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`Kode ${res.status}`);

        const json = await res.json();

        if (!cancelled) {
          setTeam(
            ((json.data ?? []) as ApiTeamMember[]).map((item) => ({
              id: item.id,
              role: item.jabatan,
              name: item.nama,
              image: item.foto ?? "",
            }))
          );
          setTeamError("");
        }
      } catch {
        if (!cancelled) setTeamError("Data tim pengelola gagal dimuat.");
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      className={`${poppins.className} overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {/* =====================================================
          HERO
      ===================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#3F6B28] via-[#31551F] to-[#213B14] text-white">
        {/* cahaya hijau lembut */}
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#8DC26F]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#8DC26F]/15 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-[1120px] px-5 pb-16 pt-14 text-center md:px-7 md:pb-24 md:pt-20">
          <div className="mx-auto max-w-[720px]">
            <h1 className="text-[36px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[44px] md:text-[52px]">
              Pendaftaran HKI
            </h1>

            <p className="mx-auto mt-5 max-w-[580px] text-[14px] font-normal leading-[1.8] text-white/85 sm:text-[15px]">
              Informasi mengenai proses pendaftaran dan pengelolaan Hak
              Kekayaan Intelektual di Politeknik Negeri Batam.
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#31551F] via-[#8DC26F] to-[#31551F]" />
      </section>

      {/* =====================================================
          APA ITU HKI
          Penjelasan singkat dan dua kelompok HKI
      ===================================================== */}
      <section
        id="apa-itu-hki"
        className="scroll-mt-20 bg-white py-20 md:py-28"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Tentang HKI"
            title="Apa itu Hak Kekayaan Intelektual?"
            description="Hak Kekayaan Intelektual (HKI) adalah hak hukum bagi pencipta atau penemu atas karya hasil pemikirannya, sehingga mereka dapat menikmati manfaat ekonominya. Di Indonesia, HKI terbagi menjadi dua kelompok."
          />

          {/* DUA KELOMPOK HKI */}
          <div className="grid gap-5 md:grid-cols-2">
            {hkiCategories.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.title} delay={index * 110} className="flex">
                  <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white p-7 transition-all duration-500 hover:-translate-y-2 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)]">
                    {/* sapuan warna saat hover */}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />

                    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F] transition-all duration-500 group-hover:scale-105 group-hover:bg-[#31551F] group-hover:text-white">
                      <Icon size={26} strokeWidth={1.6} aria-hidden />
                    </span>

                    <h3 className="mt-5 text-[15px] font-semibold uppercase leading-[1.45] tracking-[0.03em] text-[#31551F]">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-[13.5px] leading-[1.75] text-[#5E6B58]">
                      {item.description}
                    </p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          JENIS HKI
          (kartu grid seperti "Layanan Utama" di Beranda)
      ===================================================== */}
      <section
        id="jenis-hki"
        className="scroll-mt-20 border-t border-[#D9E2D3] bg-white py-20 md:py-28"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Informasi HKI"
            title="Jenis Hak Kekayaan Intelektual"
            description="Pendaftaran HKI merupakan proses pengajuan perlindungan atas hasil karya, inovasi, dan ciptaan sivitas akademika Politeknik Negeri Batam."
          />

          <div className="flex flex-wrap justify-center gap-5">
            {hkiTypes.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal
                  key={item.title}
                  delay={index * 110}
                  className="flex w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
                >
                  <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white p-7 transition-all duration-500 hover:-translate-y-2 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)]">
                    {/* sapuan warna saat hover */}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />

                    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F] transition-all duration-500 group-hover:scale-105 group-hover:bg-[#31551F] group-hover:text-white">
                      <Icon size={26} strokeWidth={1.6} aria-hidden />
                    </span>

                    <h3 className="mt-5 text-[15px] font-semibold uppercase leading-[1.45] tracking-[0.03em] text-[#31551F]">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-[13.5px] leading-[1.75] text-[#5E6B58]">
                      {item.description}
                    </p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          AJAKAN PENGAJUAN SIMP3M
          (pita hijau bertitik seperti bagian Statistik di Beranda)
      ===================================================== */}
      <section
        className="relative overflow-hidden bg-[#31551F] py-14 text-white md:py-16"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8DC26F]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#8DC26F]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1120px] px-5 md:px-7">
          <Reveal className="mx-auto max-w-[620px] text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[#CFE8BF]">
              <ExternalLink size={22} strokeWidth={1.6} aria-hidden />
            </span>

            <h2 className="mt-5 text-[24px] font-bold leading-[1.25] tracking-[-0.02em] md:text-[30px]">
              Ajukan HKI melalui SIMP3M
            </h2>

            <p className="mt-3 text-[14px] leading-[1.75] text-white/80">
              Seluruh pengajuan HKI Polibatam dilakukan lewat sistem SIMP3M.
              Masuk dengan akun Anda untuk memulai pengajuan.
            </p>

            {/* link eksternal: pakai <a> biasa, bukan next/link */}
            <a
              href={simp3mLogin}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-7 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-[13px] font-semibold text-[#31551F] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
          TIM PENGELOLA SENTRA HKI
          (kartu foto seperti Struktur Organisasi di halaman Profil)
      ===================================================== */}
      <section
        id="tim-pengelola"
        className="scroll-mt-20 bg-white py-20 md:py-28"
      >
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Tim Pengelola HKI"
            title="Tim Pengelola Sentra HKI Polibatam"
            description="Tim yang bertanggung jawab dalam pengelolaan Hak Kekayaan Intelektual di lingkungan Politeknik Negeri Batam."
          />

          {team.length === 0 ? (
            <Reveal>
              <div className="rounded-2xl border border-dashed border-[#D9E2D3] bg-[#EEF4EA]/50 px-6 py-14 text-center">
                <p className="text-[14px] font-medium text-[#1F2A1A]">
                  {teamLoading
                    ? "Memuat data..."
                    : teamError || "Data tim pengelola belum tersedia"}
                </p>
              </div>
            </Reveal>
          ) : (
            <div className="flex flex-wrap justify-center gap-6">
              {team.map((member, index) => (
                <Reveal
                  key={member.id}
                  delay={(index % 3) * 110}
                  className="flex w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                >
                  <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white transition-all duration-500 hover:-translate-y-1.5 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)]">
                    {/* FOTO (landscape 4:3). Unggahan dari admin minimal
                        1280 x 960 px, jadi tidak perlu dioptimasi lagi
                        oleh next/image (unoptimized). */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#EEF4EA]">
                      {member.image ? (
                        <Image
                          src={member.image}
                          alt={member.name}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#3F6B28] via-[#31551F] to-[#213B14] text-white/60">
                          <User size={44} strokeWidth={1.3} aria-hidden />
                        </div>
                      )}
                    </div>

                    {/* JABATAN & NAMA */}
                    <div className="flex flex-1 flex-col px-4 pb-5 pt-3.5 text-center">
                      <p className="text-[10.5px] font-semibold uppercase leading-[1.6] tracking-[0.08em] text-[#3F6B28]">
                        {member.role}
                      </p>

                      <h3 className="mt-1.5 text-[14.5px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
                        {member.name}
                      </h3>
                    </div>

                    {/* sapuan warna saat hover */}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />
                  </article>
                </Reveal>
              ))}
            </div>
          )}

          {/* CATATAN */}
          <Reveal delay={100}>
            <div className="mt-8 flex items-center gap-4 rounded-2xl border border-[#D9E2D3] bg-white px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF4EA] text-[#31551F]">
                <CheckCircle2 size={19} strokeWidth={1.8} aria-hidden />
              </span>

              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#3F6B28]">
                  Dasar Pengelolaan
                </p>

                <p className="mt-0.5 text-[13.5px] leading-[1.7] text-[#5E6B58]">
                  Berdasarkan Surat Keputusan No. 171/KP/PL29/I/2026
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          INFORMASI TERKAIT HKI
      ===================================================== */}
      <section className="border-t border-[#D9E2D3] bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <SectionTitle
            eyebrow="Unduhan & Panduan"
            title="Informasi Terkait HKI"
            description="Akses materi dan panduan yang berkaitan dengan pengelolaan Hak Kekayaan Intelektual Polibatam."
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {relatedInfo.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.title} delay={index * 110} className="flex">
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white p-7 transition-all duration-500 hover:-translate-y-2 hover:border-[#8DC26F] hover:shadow-[0_20px_44px_rgba(49,85,31,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                  >
                    {/* sapuan warna saat hover */}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#31551F] to-[#8DC26F] transition-transform duration-500 group-hover:scale-x-100" />

                    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F] transition-all duration-500 group-hover:scale-105 group-hover:bg-[#31551F] group-hover:text-white">
                      <Icon size={26} strokeWidth={1.6} aria-hidden />
                    </span>

                    <h3 className="mt-5 text-[15px] font-semibold uppercase leading-[1.45] tracking-[0.03em] text-[#31551F]">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-[13.5px] leading-[1.75] text-[#5E6B58]">
                      {item.description}
                    </p>

                    <span className="mt-auto inline-flex items-center gap-0.5 pt-5 text-[13px] font-semibold text-[#31551F]">
                      Buka Tautan
                      <ArrowUpRight
                        size={15}
                        strokeWidth={2.2}
                        aria-hidden
                        className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                      <span className="sr-only"> (membuka tab baru)</span>
                    </span>
                  </a>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

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