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
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copyright,
  Hash,
  Layers,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";

/* =========================================================
   FONT (sama dengan Beranda)
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
========================================================= */

/* =========================================================
   DATA & API
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const simp3mLogin = "https://simp3m.polibatam.ac.id/index.php?page=login";

const PER_PAGE = 5;

/* jumlah nama inventor yang tampil sebelum tombol "+N lainnya" */
const VISIBLE_INVENTORS = 3;

/* Bentuk data yang dipakai komponen.
   `image` opsional: kalau ada, foto tampil di halaman detail (16:9).
   applicationNumber dipakai sebagai alamat detail:
   /hki/hki#detail-<applicationNumber> */
type HkiItem = {
  type: string;
  category: string;
  title: string;
  inventors: string; // dipisah titik koma
  applicationNumber: string;
  year: string;
  image?: string;
};

/* Bentuk data dari API Laravel (/api/hki) */
type HkiApi = {
  id: number;
  jenis: string;
  kategori: string | null;
  judul: string;
  inventor: string[];
  nomor_permohonan: string;
  tahun: number | string;
  gambar: string | null;
};

const toItem = (row: HkiApi): HkiItem => ({
  type: row.jenis,
  category: row.kategori ?? "",
  title: row.judul,
  inventors: row.inventor.join("; "),
  applicationNumber: row.nomor_permohonan,
  year: String(row.tahun),
  image: row.gambar ?? undefined,
});

const DETAIL_HASH = "#detail-";

const detailHref = (item: HkiItem) =>
  `${DETAIL_HASH}${encodeURIComponent(item.applicationNumber)}`;

/* "A; B; C" -> ["A", "B", "C"] */
function splitInventors(value: string) {
  return value
    .split(";")
    .map((name) => name.trim())
    .filter(Boolean);
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

const hkiTypes = [
  "Semua Jenis",
  "Hak Cipta",
  "Paten",
  "Paten Sederhana",
  "Desain Industri",
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
   ANIMASI MUNCUL (disamakan dengan Beranda)
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

/* =========================================================
   KARTU HKI
========================================================= */

function HKICard({ item }: { item: HkiItem }) {
  const [expanded, setExpanded] = useState(false);

  const inventors = splitInventors(item.inventors);

  const hiddenCount = Math.max(0, inventors.length - VISIBLE_INVENTORS);
  const shownInventors = expanded
    ? inventors
    : inventors.slice(0, VISIBLE_INVENTORS);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white transition-all duration-500 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.12)]">
      {/* garis aksen di sisi kiri, muncul penuh saat hover */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1 origin-top scale-y-50 bg-gradient-to-b from-[#31551F] to-[#8DC26F] opacity-70 transition-all duration-500 group-hover:scale-y-100 group-hover:opacity-100" />

      <div className="p-5 pl-6 md:p-6 md:pl-7">
        {/* BARIS ATAS: jenis + kategori, tahun */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="rounded-full bg-[#EEF4EA] px-3 py-1 text-[11px] font-semibold text-[#31551F]">
              {item.type}
            </span>

            {item.category && (
              <span className="text-[12px] text-[#667360]">{item.category}</span>
            )}
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#667360]">
            <CalendarDays size={14} strokeWidth={1.8} aria-hidden />
            {item.year}
          </span>
        </div>

        {/* JUDUL */}
        <h3 className="mt-3.5 text-[15px] font-semibold leading-[1.5] tracking-[-0.005em] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F] md:text-[17px]">
          {/* tautan "meregang": seluruh kartu bisa diklik menuju detail */}
          <a
            href={detailHref(item)}
            className="rounded after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
          >
            {item.title}
          </a>
        </h3>

        {/* INVENTOR */}
        <div className="mt-3 flex items-start gap-2.5">
          <Users
            size={15}
            strokeWidth={1.8}
            aria-hidden
            className="mt-[3px] shrink-0 text-[#3F6B28]"
          />

          <p className="text-[13px] leading-[1.75] text-[#4A5646]">
            {shownInventors.join(", ")}

            {hiddenCount > 0 && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  aria-expanded={expanded}
                  className="relative z-10 rounded font-semibold text-[#31551F] underline-offset-2 transition-colors duration-300 hover:text-[#3F6B28] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                >
                  {expanded ? "Tampilkan lebih sedikit" : `+${hiddenCount} lainnya`}
                </button>
              </>
            )}
          </p>
        </div>

        {/* NOMOR PERMOHONAN */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[#E7EDE3] pt-3.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3F6B28]">
              No. Permohonan
            </span>

            <span className="text-[13px] font-semibold tracking-[0.02em] text-[#1F2A1A]">
              {item.applicationNumber}
            </span>
          </div>

          <span
            aria-hidden
            className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-[#31551F]"
          >
            Lihat Detail
            <ChevronRight
              size={15}
              strokeWidth={2.2}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </span>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   TAMPILAN DETAIL HKI
   Dibuka dari kartu di daftar: /hki/hki#detail-<nomor permohonan>
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

function HKIDetail({
  item,
  all,
  onBack,
}: {
  item: HkiItem;
  all: HkiItem[];
  onBack: () => void;
}) {
  const inventors = splitInventors(item.inventors);

  /* HKI lain: jenis yang sama dulu */
  const others = all
    .filter((other) => other.applicationNumber !== item.applicationNumber)
    .sort((a, b) => Number(b.type === item.type) - Number(a.type === item.type))
    .slice(0, 3);

  return (
    <>
      {/* TOMBOL KEMBALI, FOTO (jika ada), JUDUL */}
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
            Kembali ke Daftar HKI
          </button>

          {item.image && (
            <Reveal className="mt-5">
              {/* FOTO (16:9) */}
              <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden rounded-2xl border border-[#D9E2D3] bg-[#EEF4EA] shadow-[0_8px_30px_rgba(31,42,26,0.05)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </Reveal>
          )}

          <Reveal delay={80} className={item.image ? "mt-8" : "mt-6"}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-[#31551F] px-3 py-1 text-[11.5px] font-semibold text-white">
                {item.type}
              </span>

              {item.category && (
                <span className="rounded-lg bg-[#EEF4EA] px-3 py-1 text-[11.5px] font-semibold text-[#3F6B28]">
                  {item.category}
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

            <p className="mt-4 text-[13.5px] text-[#667360]">
              No. Permohonan:{" "}
              <span className="font-semibold text-[#1F2A1A]">
                {item.applicationNumber}
              </span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ISI */}
      <section className="bg-white pb-14 pt-10 md:pb-20 md:pt-12">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          <div className="grid gap-6 border-t border-[#D9E2D3] pt-10 lg:grid-cols-[1.7fr_1fr] lg:gap-8 md:pt-12">
            {/* KOLOM KIRI: INVENTOR */}
            <Reveal>
              <div className="rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-8">
                <PanelHeader
                  icon={Users}
                  title={`Inventor / Pencipta (${inventors.length})`}
                />

                <ul>
                  {inventors.map((name, index) => (
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
                          {index === 0 ? "Inventor utama" : "Anggota"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* KOLOM KANAN: INFORMASI */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Reveal delay={120}>
                <div className="rounded-2xl border border-[#D9E2D3] bg-white p-6 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-7">
                  <PanelHeader icon={Layers} title="Informasi HKI" />

                  <div>
                    <InfoRow icon={Copyright} label="Jenis HKI" value={item.type} />
                    {item.category && (
                      <InfoRow icon={Layers} label="Kategori" value={item.category} />
                    )}
                    <InfoRow icon={CalendarDays} label="Tahun" value={item.year} />
                    <InfoRow
                      icon={Hash}
                      label="No. Permohonan"
                      value={item.applicationNumber}
                    />
                  </div>
                </div>
              </Reveal>
            </aside>
          </div>

          {/* HKI LAINNYA */}
          {others.length > 0 && (
            <div className="mt-14 border-t border-[#D9E2D3] pt-10 md:mt-16 md:pt-12">
              <Reveal>
                <h2 className="text-[21px] font-bold leading-[1.3] tracking-[-0.02em] text-[#31551F] sm:text-[24px]">
                  HKI Lainnya
                </h2>
              </Reveal>

              <ul className="mt-6 grid gap-4 md:grid-cols-3">
                {others.map((other, index) => (
                  <li key={other.applicationNumber}>
                    <Reveal delay={index * 90} className="h-full">
                      <a
                        href={detailHref(other)}
                        className="group flex h-full flex-col rounded-2xl border border-[#D9E2D3] bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[#EEF4EA] px-2 py-0.5 text-[11px] font-semibold text-[#3F6B28]">
                            {other.type}
                          </span>
                          <span className="text-[11.5px] font-medium text-[#667360]">
                            {other.year}
                          </span>
                        </span>

                        <span className="mt-3 line-clamp-3 block text-[14px] font-semibold leading-[1.55] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
                          {other.title}
                        </span>

                        <span className="mt-auto flex items-center justify-between gap-3 pt-4">
                          <span className="truncate text-[12.5px] text-[#667360]">
                            {other.applicationNumber}
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
   HALAMAN HKI
   - tampilan daftar  : /hki/hki
   - tampilan detail  : /hki/hki#detail-<nomor permohonan>
========================================================= */

export default function HKIPage() {
  const [hkiData, setHkiData] = useState<HkiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("Semua Jenis");
  const [year, setYear] = useState("Semua Tahun");
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prevSelected = useRef<string | null>(null);

  /* ambil data dari API */
  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_URL}/hki`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data HKI");
        return res.json();
      })
      .then((json) => setHkiData((json.data as HkiApi[]).map(toItem)))
      .catch((err) => {
        if (err.name !== "AbortError") setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  /* pilihan tahun dibuat otomatis dari data (terbaru di atas) */
  const hkiYears = useMemo(
    () => [
      "Semua Tahun",
      ...Array.from(new Set(hkiData.map((item) => item.year))).sort(
        (a, b) => Number(b) - Number(a)
      ),
    ],
    [hkiData]
  );

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
      jumpTo(document.getElementById("data-hki"));
    }
    prevSelected.current = selectedId;
  }, [selectedId]);

  const closeDetail = () => {
    window.location.hash = "data-hki";
  };

  const selected = hkiData.find(
    (item) => item.applicationNumber === selectedId
  );

  const filteredHKI = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return hkiData.filter((item) => {
      const fullType = item.category
        ? `${item.type} - ${item.category}`
        : item.type;

      const matchSearch =
        keyword === "" ||
        item.title.toLowerCase().includes(keyword) ||
        item.inventors.toLowerCase().includes(keyword) ||
        item.applicationNumber.toLowerCase().includes(keyword) ||
        fullType.toLowerCase().includes(keyword);

      const matchType = type === "Semua Jenis" || item.type === type;
      const matchYear = year === "Semua Tahun" || item.year === year;

      return matchSearch && matchType && matchYear;
    });
  }, [hkiData, search, type, year]);

  const totalPages = Math.max(1, Math.ceil(filteredHKI.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredHKI.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changeType = (value: string) => {
    setType(value);
    setPage(1);
  };

  const changeYear = (value: string) => {
    setYear(value);
    setPage(1);
  };

  return (
    <main
      className={`${poppins.className} overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      <ScrollProgress />

      {selectedId && loading ? (
        <p className="py-32 text-center text-[13.5px] text-[#667360]">
          Memuat data HKI...
        </p>
      ) : selected ? (
        <HKIDetail
          key={selected.applicationNumber}
          item={selected}
          all={hkiData}
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
                    HKI
                  </span>
                </nav>

                <h1 className="text-[36px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[44px] md:text-[52px]">
                  HKI
                </h1>

                <p className="mx-auto mt-5 max-w-[580px] text-[14px] font-normal leading-[1.8] text-white/85 sm:text-[15px]">
                  Informasi dan data Hak Kekayaan Intelektual yang dikelola oleh
                  P2M Politeknik Negeri Batam.
                </p>

                {/* pintasan */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                  <a
                    href="#data-hki"
                    className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Data HKI
                  </a>

                  <Link
                    href="/hki/pendaftaran"
                    className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#31551F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Info Pendaftaran
                  </Link>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#31551F] via-[#8DC26F] to-[#31551F]" />
          </section>

          {/* =====================================================
              DATA HKI
          ===================================================== */}
          <section id="data-hki" className="scroll-mt-20 bg-white py-16 md:py-20">
            <div className="mx-auto max-w-[1120px] px-5 md:px-7">
              <SectionTitle
                eyebrow="Data HKI"
                title="Hak Kekayaan Intelektual"
                description="Daftar Hak Kekayaan Intelektual Politeknik Negeri Batam."
              />

              {/* ---------- FILTER ---------- */}
              <Reveal>
                <div className="rounded-2xl border border-[#D9E2D3] bg-white p-4 shadow-[0_8px_30px_rgba(31,42,26,0.05)] md:p-5">
                  <div className="grid gap-4 md:grid-cols-[200px_160px_1fr]">
                    <div>
                      <FieldLabel htmlFor="filter-jenis">Jenis HKI</FieldLabel>

                      <SelectField
                        id="filter-jenis"
                        value={type}
                        options={hkiTypes}
                        onChange={changeType}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="filter-tahun">Tahun</FieldLabel>

                      <SelectField
                        id="filter-tahun"
                        value={year}
                        options={hkiYears}
                        onChange={changeYear}
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
                          placeholder="Cari judul, inventor, atau nomor permohonan..."
                          className="h-10 w-full rounded-xl border border-[#D9E2D3] bg-white pl-11 pr-4 text-[13.5px] text-[#1F2A1A] outline-none transition-all duration-300 placeholder:text-[#A3AE9E] hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-2 focus:ring-[#EEF4EA]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* ---------- JUMLAH DATA ---------- */}
              <Reveal delay={80}>
                <div className="mb-4 mt-6 flex items-center justify-between gap-4">
                  <p className="text-[13px] text-[#667360]">
                    Menampilkan{" "}
                    <span className="font-semibold text-[#1F2A1A]">
                      {filteredHKI.length}
                    </span>{" "}
                    data HKI
                  </p>
                </div>
              </Reveal>

              {/* ---------- DAFTAR KARTU ---------- */}
              <div className="grid gap-4">
                {pageItems.map((item, index) => (
                  <Reveal key={item.applicationNumber} delay={index * 80}>
                    <HKICard item={item} />
                  </Reveal>
                ))}

                {/* MEMUAT */}
                {loading && (
                  <p className="py-10 text-center text-[13.5px] text-[#667360]">
                    Memuat data HKI...
                  </p>
                )}

                {/* GAGAL MEMUAT */}
                {loadError && (
                  <p className="py-10 text-center text-[13.5px] text-[#B42323]">
                    Data HKI gagal dimuat. Coba muat ulang halaman.
                  </p>
                )}

                {/* DATA KOSONG */}
                {!loading && !loadError && filteredHKI.length === 0 && (
                  <Reveal>
                    <div className="rounded-2xl border border-[#D9E2D3] bg-white px-6 py-14 text-center">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
                        <Copyright size={26} strokeWidth={1.6} />
                      </span>

                      <p className="mt-5 text-[16px] font-semibold text-[#1F2A1A]">
                        {hkiData.length === 0
                          ? "Belum ada data HKI"
                          : "Data HKI tidak ditemukan"}
                      </p>

                      <p className="mt-2 text-[13.5px] leading-[1.75] text-[#667360]">
                        {hkiData.length === 0
                          ? "Data HKI akan tampil di sini setelah ditambahkan."
                          : "Coba ubah kata kunci, jenis HKI, atau tahun."}
                      </p>
                    </div>
                  </Reveal>
                )}
              </div>

              {/* ---------- PAGINASI (hanya jika lebih dari satu halaman) ---------- */}
              {totalPages > 1 && (
                <nav
                  aria-label="Halaman data HKI"
                  className="mt-8 flex items-center justify-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                    aria-label="Halaman sebelumnya"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9E2D3] bg-white text-[#31551F] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft size={16} strokeWidth={2} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (number) => {
                      const isActive = number === safePage;

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
                    }
                  )}

                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage === totalPages}
                    aria-label="Halaman berikutnya"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9E2D3] bg-white text-[#31551F] transition-all duration-300 hover:border-[#31551F] hover:bg-[#31551F] hover:text-white disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                </nav>
              )}
            </div>
          </section>

          {/* =====================================================
              AJAKAN PENDAFTARAN
          ===================================================== */}
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
                        Ingin mendaftarkan HKI?
                      </h2>

                      <p className="mt-2 text-[13px] leading-[1.7] text-white/80">
                        Akses sistem informasi P2M untuk memperoleh informasi dan
                        melakukan proses pendaftaran Hak Kekayaan Intelektual.
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                      <a
                        href={simp3mLogin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-[12.5px] font-semibold text-[#31551F] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#EEF4EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        Buka SIMP3M
                        <ArrowRight
                          size={14}
                          strokeWidth={1.8}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </a>

                      <Link
                        href="/hki/pendaftaran"
                        className="group inline-flex items-center gap-2 rounded-md border border-white/40 px-4 py-2.5 text-[12.5px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        Info Pendaftaran
                        <ArrowRight
                          size={14}
                          strokeWidth={1.8}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
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