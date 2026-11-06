"use client";

// src/app/pencarian/page.tsx

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Poppins } from "next/font/google";

import {
  Award,
  BookOpen,
  ChevronRight,
  FlaskConical,
  HandHeart,
  Newspaper,
  Search,
  type LucideIcon,
} from "lucide-react";

/* =========================================================
   FONT + PALET (sama dengan Beranda, Penelitian, Pengabdian)
   hijau utama #31551F, gelap #213B14, medium #3F6B28,
   aksen #8DC26F, muda #EEF4EA, muted #5E6B58, garis #D9E2D3
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* Gradien hero (sama dengan hero halaman Penelitian) */
const HERO_GRADIENT = [
  "linear-gradient(180deg, rgba(10,28,5,0.35) 0%, rgba(10,28,5,0) 45%)",
  "linear-gradient(135deg,#1B4010 0%,#2F5F1F 38%,#4C8E32 72%,#78B35A 100%)",
].join(", ");

const delayStyle = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/* =========================================================
   API
   GET /api/pencarian?q=kata  ->  { data: { query, total, kelompok[] } }
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/* sama dengan MIN_HURUF di PencarianController */
const MIN_CHARS = 2;

type Jenis = "Penelitian" | "Pengabdian" | "Publikasi" | "HKI" | "Informasi";

type ApiItem = {
  id: number;
  judul: string;
  subjudul: string | null;
  tahun: string | null;
};

type ApiGroup = {
  jenis: Jenis;
  total: number;
  hasil: ApiItem[];
};

type SearchData = {
  query: string;
  total: number;
  kelompok: ApiGroup[];
};

/* Tujuan tautan tiap kategori. Halaman Penelitian, Pengabdian, Publikasi,
   dan Informasi membuka detail lewat #detail-<id>. HKI dibuka ke
   halaman daftarnya. Sesuaikan kalau alamat halamanmu berbeda. */
const JENIS_CONFIG: Record<
  Jenis,
  { label: string; icon: LucideIcon; listHref: string; hrefOf: (id: number) => string }
> = {
  Penelitian: {
    label: "Penelitian",
    icon: FlaskConical,
    listHref: "/penelitian",
    hrefOf: (id) => `/penelitian#detail-${id}`,
  },
  Pengabdian: {
    label: "Pengabdian",
    icon: HandHeart,
    listHref: "/pengabdian",
    hrefOf: (id) => `/pengabdian#detail-${id}`,
  },
  Publikasi: {
    label: "Publikasi",
    icon: BookOpen,
    listHref: "/publikasi",
    hrefOf: (id) => `/publikasi#detail-${id}`,
  },
  HKI: {
    label: "HKI",
    icon: Award,
    listHref: "/hki/hki",
    hrefOf: () => "/hki/hki",
  },
  Informasi: {
    label: "Informasi",
    icon: Newspaper,
    listHref: "/informasi",
    hrefOf: (id) => `/informasi#detail-${id}`,
  },
};

const ALL_TAB = "Semua";
type Tab = typeof ALL_TAB | Jenis;

/* =========================================================
   HOOKS (paralaks hero, sama dengan halaman Penelitian)
========================================================= */

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
   SOROT KATA KUNCI
========================================================= */

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark
            key={index}
            className="rounded-sm bg-[#DDEFD2] px-0.5 text-[#213B14]"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

/* =========================================================
   ISI HALAMAN
========================================================= */

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();

  const keyword = (params.get("q") ?? "").trim();
  const validKeyword = keyword.length >= MIN_CHARS;

  const [input, setInput] = useState(keyword);
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>(ALL_TAB);

  const reduceMotion = usePrefersReducedMotion();
  const heroRef = useHeroScroll<HTMLElement>(reduceMotion);

  /* kolom cari ikut berubah kalau kata kunci di alamat berubah */
  useEffect(() => {
    setInput(keyword);
  }, [keyword]);

  /* ambil hasil dari API setiap kata kunci berubah */
  useEffect(() => {
    if (!validKeyword) {
      setData(null);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError("");
      setTab(ALL_TAB);

      try {
        const res = await fetch(
          `${API_URL}/pencarian?q=${encodeURIComponent(keyword)}`,
          {
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) throw new Error(`Kode ${res.status}`);

        const json = await res.json();
        setData(json.data as SearchData);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setData(null);
        setError("Pencarian gagal dimuat. Coba lagi beberapa saat lagi.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [keyword, validKeyword]);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const next = input.trim();
    if (next.length < MIN_CHARS) return;

    router.push(`/pencarian?q=${encodeURIComponent(next)}`);
  };

  const groups = data?.kelompok ?? [];
  const visibleGroups =
    tab === ALL_TAB ? groups : groups.filter((group) => group.jenis === tab);

  return (
    <main
      className={`${poppins.className} -mt-[72px] min-h-[70vh] overflow-x-hidden bg-white text-[#1F2A1A] antialiased`}
    >
      {/* =====================================================
          HERO + KOLOM CARI (sama dengan hero halaman Penelitian)
      ===================================================== */}
      <section
        ref={heroRef}
        className="hero-bg relative overflow-hidden pt-[72px] text-white"
        style={{ backgroundImage: HERO_GRADIENT }}
      >
        <div className="hero-content relative z-10 mx-auto max-w-[1120px] px-5 pb-14 pt-14 text-center md:px-7 md:pb-20 md:pt-20">
          <h1 className="text-[36px] font-medium leading-[1.15] tracking-[-0.02em] [text-wrap:balance] sm:text-[44px] md:text-[52px]">
            {"Hasil Pencarian".split(" ").map((word, index) => (
              <span key={`${word}-${index}`}>
                <span className="kata" style={delayStyle(120 + index * 80)}>
                  {word}
                </span>{" "}
              </span>
            ))}
          </h1>

          <form
            onSubmit={submit}
            role="search"
            className="timbul mx-auto mt-8 flex max-w-[560px] items-center gap-2 rounded-full bg-white p-1.5 shadow-lg shadow-black/10"
            style={delayStyle(320)}
          >
            <Search
              size={17}
              aria-hidden
              className="ml-3 shrink-0 text-[#5E6B58]"
            />

            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Cari penelitian, pengabdian, publikasi..."
              aria-label="Kata kunci pencarian"
              autoComplete="off"
              enterKeyHint="search"
              className="h-10 min-w-0 flex-1 bg-transparent text-[14px] text-[#1F2A1A] outline-none placeholder:text-[#8A9684]"
            />

            <button
              type="submit"
              disabled={input.trim().length < MIN_CHARS}
              className="h-10 shrink-0 rounded-full bg-[#31551F] px-5 text-[13px] font-semibold text-white transition-colors duration-300 hover:bg-[#3F6B28] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cari
            </button>
          </form>
        </div>
      </section>

      {/* =====================================================
          HASIL
      ===================================================== */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-[1120px] px-5 md:px-7">
          {!validKeyword ? (
            <Notice
              title="Masukkan kata kunci"
              text={`Ketik minimal ${MIN_CHARS} huruf untuk mulai mencari.`}
            />
          ) : loading ? (
            <p role="status" className="py-10 text-center text-[14px] text-[#5E6B58]">
              Mencari &ldquo;{keyword}&rdquo;...
            </p>
          ) : error ? (
            <Notice title="Terjadi kendala" text={error} />
          ) : !data || data.total === 0 ? (
            <Notice
              title="Tidak ada hasil"
              text={`Tidak ditemukan hasil untuk “${keyword}”. Coba gunakan kata kunci lain.`}
            />
          ) : (
            <>
              <p className="text-[14px] text-[#5E6B58]">
                Ditemukan{" "}
                <span className="font-semibold text-[#1F2A1A]">{data.total}</span>{" "}
                hasil untuk &ldquo;
                <span className="font-semibold text-[#1F2A1A]">{data.query}</span>
                &rdquo;
              </p>

              {/* TAB KATEGORI */}
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { key: ALL_TAB as Tab, label: ALL_TAB, count: data.total },
                  ...groups.map((group) => ({
                    key: group.jenis as Tab,
                    label: JENIS_CONFIG[group.jenis].label,
                    count: group.total,
                  })),
                ].map((item) => {
                  const active = tab === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] ${
                        active
                          ? "border-[#31551F] bg-[#31551F] text-white"
                          : "border-[#D9E2D3] bg-white text-[#4A5646] hover:border-[#31551F] hover:text-[#31551F]"
                      }`}
                    >
                      {item.label}
                      <span
                        className={`rounded-full px-1.5 text-[11px] ${
                          active ? "bg-white/20" : "bg-[#EEF4EA] text-[#3F6B28]"
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* DAFTAR PER KATEGORI */}
              <div className="mt-8 space-y-10">
                {visibleGroups.map((group) => {
                  const config = JENIS_CONFIG[group.jenis];
                  const Icon = config.icon;

                  return (
                    <div key={group.jenis}>
                      <div className="mb-4 flex items-center gap-3 border-b border-[#D9E2D3] pb-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4EA] text-[#31551F]">
                          <Icon size={17} strokeWidth={1.8} aria-hidden />
                        </span>

                        <h2 className="text-[16px] font-semibold text-[#1F2A1A]">
                          {config.label}
                        </h2>

                        <span className="text-[12.5px] text-[#5E6B58]">
                          {group.total} hasil
                        </span>
                      </div>

                      <ul className="space-y-2.5">
                        {group.hasil.map((item) => (
                          <li key={`${group.jenis}-${item.id}`}>
                            <Link
                              href={config.hrefOf(item.id)}
                              className="group flex items-center gap-4 rounded-2xl border border-[#D9E2D3] bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8DC26F] hover:shadow-[0_14px_32px_rgba(49,85,31,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F]"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 block text-[14.5px] font-semibold leading-[1.5] text-[#1F2A1A] transition-colors duration-300 group-hover:text-[#31551F]">
                                  <Highlight text={item.judul} keyword={data.query} />
                                </span>

                                {(item.subjudul || item.tahun) && (
                                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#5E6B58]">
                                    {item.subjudul && (
                                      <span className="line-clamp-1">
                                        {item.subjudul}
                                      </span>
                                    )}

                                    {item.tahun && (
                                      <span className="rounded-md bg-[#EEF4EA] px-2 py-0.5 text-[11.5px] font-semibold text-[#3F6B28]">
                                        {item.tahun}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </span>

                              <ChevronRight
                                size={17}
                                strokeWidth={2.2}
                                aria-hidden
                                className="shrink-0 text-[#31551F] transition-transform duration-300 group-hover:translate-x-1"
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>

                      {group.total > group.hasil.length && (
                        <p className="mt-3 text-[12.5px] text-[#5E6B58]">
                          Menampilkan {group.hasil.length} dari {group.total} hasil.{" "}
                          <Link
                            href={config.listHref}
                            className="font-semibold text-[#31551F] underline-offset-2 hover:underline"
                          >
                            Lihat semua di halaman {config.label}
                          </Link>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* =====================================================
          ANIMASI (sama dengan Beranda dan Penelitian)
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
   PESAN KOSONG / ERROR
========================================================= */

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#B9CBB0] bg-white px-5 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF4EA] text-[#31551F]">
        <Search size={20} aria-hidden />
      </div>

      <p className="mt-4 text-[14.5px] font-semibold text-[#1F2A1A]">{title}</p>
      <p className="mt-1 text-[13.5px] text-[#5E6B58]">{text}</p>
    </div>
  );
}

/* useSearchParams wajib dibungkus Suspense agar build Next.js berhasil */
export default function PencarianPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}