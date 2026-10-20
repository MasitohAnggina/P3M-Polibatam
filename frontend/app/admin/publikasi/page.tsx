"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";

import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileUp,
  Info,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

/* =========================================================
   FONT
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

/* =========================================================
   API + TOKEN
   Sama dengan halaman admin Penelitian: login menyimpan token di
   key "p3m_token" (localStorage kalau "Ingat saya", kalau tidak
   sessionStorage).
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const TOKEN_KEYS = ["p3m_token", "token", "auth_token", "access_token"];

function getToken(): string | null {
  if (typeof window === "undefined") return null;

  for (const store of [localStorage, sessionStorage]) {
    for (const key of TOKEN_KEYS) {
      const raw = store.getItem(key);
      if (!raw) continue;

      const value = raw.replace(/^"+|"+$/g, "").trim();
      if (value && value !== "undefined" && value !== "null") return value;
    }
  }

  return null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Terjadi kesalahan (kode ${response.status}).`;

    if (response.status === 401) {
      message = token
        ? "Sesi login habis atau token tidak valid. Silakan login ulang."
        : "Token login tidak ditemukan di browser. Silakan login ulang.";
      throw new Error(message);
    }

    try {
      const body = await response.json();
      if (body?.errors) {
        message = (Object.values(body.errors) as string[][]).flat()[0];
      } else if (body?.message) {
        message = body.message;
      }
    } catch {
      /* body bukan JSON */
    }

    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

/* =========================================================
   TYPE (sama dengan data yang dipakai halaman publik)
========================================================= */

type Publication = {
  id: number;
  slug: string;
  title: string;
  category: string;
  year: number;
  authors: string;
  source_name: string;
  source_detail: string | null;
  indeks: string | null;
  description: string | null;
  href: string | null;
  cover_url: string | null;
  file_url: string | null;
};

type FormState = {
  title: string;
  category: string;
  year: string;
  authors: string;
  source_name: string;
  source_detail: string;
  indeks: string;
  description: string;
  href: string;
};

type ModalType = "add" | "edit" | "detail" | "delete" | null;

/* =========================================================
   OPTIONS
========================================================= */

const ALL_YEARS = "Semua Tahun";
const ALL_CATEGORIES = "Semua Kategori";

/* harus sama dengan kategori di halaman publik & Publikasi::KATEGORI */
const publicationCategories = [
  "Jurnal Internasional bereputasi",
  "Jurnal Nasional",
  "E-Book",
  "Prosiding",
];

const categoryFilters = [ALL_CATEGORIES, ...publicationCategories];

const currentYear = new Date().getFullYear();
const formYearOptions = Array.from({ length: 16 }, (_, i) =>
  String(currentYear - i)
);

const PAGE_SIZE = 8;

/* warna pill ringkasan per kategori (berulang) */
const pillTones = [
  "bg-[#A5D6A7] text-[#1B5E20]",
  "bg-[#DDEBDD] text-[#1F5A23]",
  "border border-[#2E7D32]/30 bg-transparent text-[#2E5B32]",
];

/* =========================================================
   FILE
========================================================= */

const MAX_EVIDENCE_SIZE = 5 * 1024 * 1024;
const MAX_COVER_SIZE = 2 * 1024 * 1024;

const evidenceTypes = ["application/pdf", "image/jpeg", "image/png"];
const coverTypes = ["image/jpeg", "image/png", "image/webp"];

function validateEvidence(file: File): string {
  if (!evidenceTypes.includes(file.type)) {
    return "Format file harus PDF, JPG, atau PNG.";
  }
  if (file.size > MAX_EVIDENCE_SIZE) return "Ukuran file maksimal 5 MB.";
  return "";
}

function validateCover(file: File): string {
  if (!coverTypes.includes(file.type)) {
    return "Format sampul harus JPG, PNG, atau WEBP.";
  }
  if (file.size > MAX_COVER_SIZE) return "Ukuran sampul maksimal 2 MB.";
  return "";
}

const baseName = (url: string | null) =>
  url ? decodeURIComponent(url.split("/").pop() ?? "") : "";

/* =========================================================
   HELPER
========================================================= */

const emptyForm: FormState = {
  title: "",
  category: "",
  year: "",
  authors: "",
  source_name: "",
  source_detail: "",
  indeks: "",
  description: "",
  href: "",
};

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

const isLink = (value: string) => /^https?:\/\//i.test(value);

/* =========================================================
   SHARED STYLES
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-[#DCE4DE] bg-white px-3.5 text-[13px] text-[#2B3830] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10";

const textareaClass =
  "w-full resize-none rounded-xl border border-[#DCE4DE] bg-white px-3.5 py-2.5 text-[13px] leading-6 text-[#2B3830] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10";

const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#2E7D32] px-5 text-[13px] font-medium text-white transition hover:bg-[#1B5E20] disabled:cursor-not-allowed disabled:opacity-40";

const btnGhost =
  "inline-flex h-10 items-center justify-center rounded-full border border-[#DCE4DE] bg-white px-5 text-[13px] font-medium text-[#5B675F] transition hover:bg-[#F4F7F4]";

const btnDanger =
  "inline-flex h-10 items-center justify-center rounded-full bg-[#DC2626] px-5 text-[13px] font-medium text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40";

const thClass =
  "border-b border-dashed border-[#DCE4DE] px-3 py-4 text-[12px] font-medium text-[#7A867F]";

/* =========================================================
   MAIN PAGE
========================================================= */

export default function PublikasiPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(ALL_YEARS);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedPublication, setSelectedPublication] =
    useState<Publication | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverName, setCoverName] = useState("");
  const [coverError, setCoverError] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceError, setEvidenceError] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadPublications = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const result = await request<{ data: Publication[] }>("/admin/publikasi");
      setPublications(result.data);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Gagal memuat data publikasi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublications();
  }, [loadPublications]);

  /* =========================================================
     FILTER
  ========================================================= */

  /* tahun filter diambil dari data, otomatis bertambah */
  const filterYears = useMemo(
    () => [
      ALL_YEARS,
      ...Array.from(new Set(publications.map((item) => String(item.year)))).sort(
        (a, b) => b.localeCompare(a)
      ),
    ],
    [publications]
  );

  const filteredPublications = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return publications.filter((item) => {
      const matchSearch =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.authors.toLowerCase().includes(keyword) ||
        item.source_name.toLowerCase().includes(keyword) ||
        (item.description ?? "").toLowerCase().includes(keyword);

      const matchYear =
        selectedYear === ALL_YEARS || String(item.year) === selectedYear;

      const matchCategory =
        selectedCategory === ALL_CATEGORIES || item.category === selectedCategory;

      return matchSearch && matchYear && matchCategory;
    });
  }, [publications, search, selectedYear, selectedCategory]);

  /* kembali ke halaman 1 saat filter berubah */
  useEffect(() => {
    setPage(1);
  }, [search, selectedYear, selectedCategory]);

  /* =========================================================
     PAGINATION
  ========================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPublications.length / PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const visiblePublications = filteredPublications.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  /* =========================================================
     SUMMARY
  ========================================================= */

  const summary = useMemo(
    () =>
      publicationCategories.map((category) => ({
        label: category,
        value: publications.filter((item) => item.category === category).length,
      })),
    [publications]
  );

  /* =========================================================
     MODAL
  ========================================================= */

  const resetFormState = () => {
    setForm(emptyForm);
    setCoverFile(null);
    setCoverName("");
    setCoverError("");
    setEvidenceFile(null);
    setEvidenceName("");
    setEvidenceError("");
    setFormError("");
  };

  const closeModal = () => {
    setModal(null);
    setSelectedPublication(null);
    resetFormState();
  };

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    if (!modal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, saving]);

  const openAddModal = () => {
    setSelectedPublication(null);
    resetFormState();
    setModal("add");
  };

  const openEditModal = (publication: Publication) => {
    resetFormState();
    setSelectedPublication(publication);
    setForm({
      title: publication.title,
      category: publication.category,
      year: String(publication.year),
      authors: publication.authors,
      source_name: publication.source_name,
      source_detail: publication.source_detail ?? "",
      indeks: publication.indeks ?? "",
      description: publication.description ?? "",
      href: publication.href ?? "",
    });
    setCoverName(baseName(publication.cover_url));
    setEvidenceName(baseName(publication.file_url));
    setModal("edit");
  };

  const openDetailModal = (publication: Publication) => {
    setSelectedPublication(publication);
    setModal("detail");
  };

  const openDeleteModal = (publication: Publication) => {
    setSelectedPublication(publication);
    setFormError("");
    setModal("delete");
  };

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  /* =========================================================
     FILE
  ========================================================= */

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const error = validateCover(file);
    if (error) {
      setCoverError(error);
      return;
    }

    setCoverError("");
    setCoverFile(file);
    setCoverName(file.name);
  };

  const handleEvidenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const error = validateEvidence(file);
    if (error) {
      setEvidenceError(error);
      return;
    }

    setEvidenceError("");
    setEvidenceFile(file);
    setEvidenceName(file.name);
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const canSave =
    form.title.trim() !== "" &&
    form.category !== "" &&
    form.year !== "" &&
    form.authors.trim() !== "" &&
    form.source_name.trim() !== "";

  const handleSave = async () => {
    if (!canSave || saving) return;

    const body = new FormData();

    (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
      body.append(key, form[key].trim());
    });

    if (coverFile) body.append("cover", coverFile);
    if (evidenceFile) body.append("file", evidenceFile);

    setSaving(true);
    setFormError("");

    try {
      if (modal === "add") {
        const result = await request<{ data: Publication }>("/admin/publikasi", {
          method: "POST",
          body,
        });
        setPublications((current) => [result.data, ...current]);
      }

      if (modal === "edit" && selectedPublication) {
        /* PUT dengan multipart harus lewat method spoofing */
        body.append("_method", "PUT");

        const result = await request<{ data: Publication }>(
          `/admin/publikasi/${selectedPublication.id}`,
          { method: "POST", body }
        );
        setPublications((current) =>
          current.map((item) =>
            item.id === result.data.id ? result.data : item
          )
        );
      }

      closeModal();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Gagal menyimpan publikasi."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async () => {
    if (!selectedPublication || saving) return;

    setSaving(true);
    setFormError("");

    try {
      await request(`/admin/publikasi/${selectedPublication.id}`, {
        method: "DELETE",
      });

      setPublications((current) =>
        current.filter((item) => item.id !== selectedPublication.id)
      );
      closeModal();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Gagal menghapus publikasi."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <div
      className={`${poppins.className} min-h-[calc(100vh-78px)] overflow-x-hidden bg-[linear-gradient(135deg,#F3F7F3_0%,#EDF5EE_50%,#E2F0E4_100%)] px-3 py-4 text-[#26352D] sm:px-5 sm:py-6 md:px-8 md:py-8`}
    >
      <div className="mx-auto w-full max-w-[1320px]">
        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_10px_rgba(38,53,45,0.06)]">
                <BookOpen size={18} strokeWidth={1.8} className="text-[#2E7D32]" />
              </div>

              <h1 className="text-[26px] font-medium tracking-[-0.02em] sm:text-[32px]">
                Publikasi
              </h1>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#7A867F] sm:ml-[52px]">
              Kelola data publikasi ilmiah yang dihasilkan oleh sivitas
              akademika Polibatam.
            </p>
          </div>

          <button type="button" onClick={openAddModal} className={`${btnPrimary} w-full sm:w-auto`}>
            <Plus size={16} strokeWidth={2} />
            Tambah Publikasi
          </button>
        </div>

        {/* =====================================================
            SUMMARY PILLS
        ===================================================== */}

        <div className="mb-6 flex flex-wrap gap-2 sm:flex-nowrap">
          <SummaryPill
            label="Total"
            value={publications.length}
            grow={Math.max(publications.length, 1)}
            className="bg-[#2E7D32] text-white"
          />

          {summary.map((item, index) => (
            <SummaryPill
              key={item.label}
              label={item.label}
              value={item.value}
              grow={Math.max(item.value, 1)}
              className={pillTones[index % pillTones.length]}
            />
          ))}
        </div>

        {/* =====================================================
            MAIN CARD
        ===================================================== */}

        <div className="w-full rounded-[28px] bg-white/70 p-3 shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur sm:p-4 md:p-5">
          {/* FILTER BAR */}

          <div className="mb-4 flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                strokeWidth={1.8}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B9690]"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul, penulis, atau nama jurnal..."
                className="h-11 w-full rounded-full border border-transparent bg-white pl-11 pr-4 text-[13px] text-[#3D4942] shadow-[0_1px_4px_rgba(38,53,45,0.05)] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10"
              />
            </div>

            <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:w-[480px]">
              <FilterSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={categoryFilters}
              />
              <FilterSelect
                value={selectedYear}
                onChange={setSelectedYear}
                options={filterYears}
              />
            </div>
          </div>

          {/* TABLE */}

          <div className="w-full overflow-hidden rounded-[22px] bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1020px] border-separate border-spacing-y-1 px-2 text-left">
                <thead>
                  <tr>
                    <th className={`${thClass} min-w-[320px] pl-5`}>Judul Publikasi</th>
                    <th className={`${thClass} w-[190px]`}>Penulis</th>
                    <th className={`${thClass} w-[210px]`}>Jurnal / Prosiding</th>
                    <th className={`${thClass} w-[210px]`}>Kategori</th>
                    <th className={`${thClass} w-[80px]`}>Tahun</th>
                    <th className={`${thClass} w-[130px] pr-5 text-right`}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {visiblePublications.map((item) => {
                    const cell = "bg-white group-hover:bg-[#F2F8F2]";

                    return (
                      <tr key={item.id} className="group">
                        {/* JUDUL + SAMPUL */}

                        <td
                          className={`rounded-l-2xl py-3.5 pl-5 pr-3 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center gap-3.5">
                            <CoverThumb url={item.cover_url} title={item.title} />

                            <p className="line-clamp-2 max-w-[360px] text-[13px] font-medium leading-[20px] text-[#26352C]">
                              {item.title}
                            </p>
                          </div>
                        </td>

                        <td className={`px-3 py-3.5 align-middle text-[13px] leading-[20px] text-[#34423A] transition-colors ${cell}`}>
                          <span className="line-clamp-2">{item.authors}</span>
                        </td>

                        <td className={`px-3 py-3.5 align-middle text-[13px] leading-[20px] text-[#5D6861] transition-colors ${cell}`}>
                          {item.source_name}
                        </td>

                        <td className={`px-3 py-3.5 align-middle transition-colors ${cell}`}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#E3F1E4] px-3 py-1.5 text-[11px] font-medium leading-[15px] text-[#2E7D32]">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]" />
                              {item.category}
                            </span>

                            {item.indeks && (
                              <span className="rounded-full bg-[#2E7D32] px-2.5 py-1.5 text-[11px] font-medium leading-[15px] text-white">
                                {item.indeks}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className={`px-3 py-3.5 align-middle text-[13px] text-[#46544B] transition-colors ${cell}`}>
                          {item.year}
                        </td>

                        <td
                          className={`rounded-r-2xl py-3.5 pl-3 pr-5 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <IconButton label="Lihat detail" onClick={() => openDetailModal(item)}>
                              <Eye size={16} strokeWidth={1.8} />
                            </IconButton>

                            <IconButton label="Edit" onClick={() => openEditModal(item)}>
                              <Pencil size={16} strokeWidth={1.8} />
                            </IconButton>

                            <IconButton label="Hapus" danger onClick={() => openDeleteModal(item)}>
                              <Trash2 size={16} strokeWidth={1.8} />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* LOADING / ERROR / EMPTY STATE */}

                  {(loading || loadError || filteredPublications.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F2] text-[#7A857D]">
                            <Search size={20} strokeWidth={1.8} />
                          </div>

                          {loading ? (
                            <p className="text-[14px] font-medium text-[#526057]">
                              Memuat data publikasi...
                            </p>
                          ) : loadError ? (
                            <>
                              <p className="text-[14px] font-medium text-[#B91C1C]">
                                {loadError}
                              </p>
                              <button
                                type="button"
                                onClick={loadPublications}
                                className={`${btnGhost} mt-4`}
                              >
                                Coba lagi
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="text-[14px] font-medium text-[#526057]">
                                {publications.length === 0
                                  ? "Belum ada data publikasi"
                                  : "Data publikasi tidak ditemukan"}
                              </p>

                              <p className="mt-1 text-[12px] text-[#8A948E]">
                                {publications.length === 0
                                  ? 'Klik "Tambah Publikasi" untuk menambahkan data pertama.'
                                  : "Coba ubah kata pencarian atau filter."}
                              </p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER + PAGINATION */}

            <div className="flex flex-col gap-3 border-t border-[#EEF2EF] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[#7A857D]">
                {filteredPublications.length > 0 ? (
                  <>
                    Menampilkan{" "}
                    <span className="font-medium text-[#46544B]">
                      {startIndex + 1}–{startIndex + visiblePublications.length}
                    </span>{" "}
                    dari {filteredPublications.length} data publikasi
                    {filteredPublications.length !== publications.length &&
                      ` (total ${publications.length})`}
                  </>
                ) : (
                  <>Tidak ada data yang ditampilkan</>
                )}
              </p>

              {totalPages > 1 && (
                <nav aria-label="Halaman daftar publikasi" className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Halaman sebelumnya"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#6F7B74] transition hover:bg-[#EEF3EF] disabled:pointer-events-none disabled:opacity-35"
                  >
                    <ChevronLeft size={16} strokeWidth={1.8} />
                  </button>

                  {getPageItems(totalPages, currentPage).map((item, index) =>
                    item === "gap" ? (
                      <span
                        key={`gap-${index}`}
                        className="px-1 text-[12px] text-[#A3AE9E]"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        aria-label={`Halaman ${item}`}
                        aria-current={item === currentPage ? "page" : undefined}
                        onClick={() => setPage(item)}
                        className={`h-8 min-w-8 rounded-full px-2 text-[12px] font-medium transition ${
                          item === currentPage
                            ? "bg-[#2E7D32] text-white"
                            : "text-[#5B675F] hover:bg-[#EEF3EF]"
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
                    onClick={() => setPage(currentPage + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#6F7B74] transition hover:bg-[#EEF3EF] disabled:pointer-events-none disabled:opacity-35"
                  >
                    <ChevronRight size={16} strokeWidth={1.8} />
                  </button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {(modal === "add" || modal === "edit") && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[760px]" locked={saving}>
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title={modal === "add" ? "Tambah Publikasi" : "Edit Publikasi"}
              subtitle={
                modal === "add"
                  ? "Isi form berikut untuk menambahkan data publikasi ilmiah."
                  : "Perbarui informasi publikasi yang dipilih."
              }
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Judul Publikasi" required className="md:col-span-2">
                  <input
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="Masukkan judul publikasi"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Jenis Publikasi" required>
                  <SelectInput
                    value={form.category}
                    onChange={(value) => updateForm("category", value)}
                    placeholder="Pilih jenis publikasi"
                    options={publicationCategories}
                  />
                </FormField>

                <FormField label="Tahun Terbit" required>
                  <SelectInput
                    value={form.year}
                    onChange={(value) => updateForm("year", value)}
                    placeholder="Pilih tahun terbit"
                    options={formYearOptions}
                  />
                </FormField>

                <FormField label="Nama Jurnal / Prosiding" required>
                  <input
                    value={form.source_name}
                    onChange={(e) => updateForm("source_name", e.target.value)}
                    placeholder="Masukkan nama jurnal / prosiding"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Rincian Terbitan" hint="Opsional">
                  <input
                    value={form.source_detail}
                    onChange={(e) => updateForm("source_detail", e.target.value)}
                    placeholder="Vol. 12, No. 1, 2024 | ISSN: 2548-8838"
                    className={inputClass}
                  />
                </FormField>

                <FormField
                  label="Penulis"
                  required
                  hint="Pisahkan dengan koma"
                  className="md:col-span-2"
                >
                  <input
                    value={form.authors}
                    onChange={(e) => updateForm("authors", e.target.value)}
                    placeholder="Penulis 1, Penulis 2, Penulis 3"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Indeks" hint="Opsional, mis. Q1, Sinta 2, Scopus">
                  <input
                    value={form.indeks}
                    onChange={(e) => updateForm("indeks", e.target.value)}
                    placeholder="Masukkan indeks"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Link Publikasi / DOI" hint="Opsional">
                  <input
                    value={form.href}
                    onChange={(e) => updateForm("href", e.target.value)}
                    placeholder="https://doi.org/..."
                    className={inputClass}
                  />
                </FormField>

                {/* SAMPUL */}

                <FormField label="Sampul Publikasi" hint="JPG, PNG, WEBP (maks. 2 MB)">
                  <FileDrop
                    id="publication-cover"
                    accept=".jpg,.jpeg,.png,.webp"
                    name={coverName}
                    error={coverError}
                    emptyLabel="Klik untuk mengunggah sampul"
                    emptyHint="JPG, PNG, atau WEBP"
                    onChange={handleCoverChange}
                  />
                </FormField>

                {/* FILE BUKTI */}

                <FormField label="File Bukti Publikasi" hint="PDF, JPG, PNG (maks. 5 MB)">
                  <FileDrop
                    id="publication-file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    name={evidenceName}
                    error={evidenceError}
                    emptyLabel="Klik untuk mengunggah file"
                    emptyHint="PDF, JPG, atau PNG"
                    onChange={handleEvidenceChange}
                  />
                </FormField>

                <FormField label="Ringkasan / Deskripsi" hint="Opsional" className="md:col-span-2">
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    rows={3}
                    placeholder="Masukkan ringkasan singkat tentang publikasi ini"
                    className={textareaClass}
                  />
                </FormField>
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[#EEF7EF] px-4 py-3 text-[12px] leading-5 text-[#2E7D32]">
                <Info size={16} strokeWidth={1.8} className="mt-0.5 shrink-0" />
                <span>
                  Data publikasi yang disimpan akan langsung tampil di halaman
                  Publikasi publik. File bukti hanya terlihat oleh admin.
                </span>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-[#FFF1F1] px-4 py-2.5 text-[12px] font-medium leading-5 text-[#B91C1C]"
                >
                  {formError}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#EEF2EF] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className={`${btnGhost} w-full sm:w-auto`}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                {saving
                  ? "Menyimpan..."
                  : modal === "add"
                  ? "Simpan Publikasi"
                  : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {modal === "detail" && selectedPublication && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[680px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title="Detail Publikasi"
              subtitle="Informasi lengkap data publikasi."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="flex gap-4">
                <div className="w-[84px] shrink-0 sm:w-[96px]">
                  <CoverThumb
                    url={selectedPublication.cover_url}
                    title={selectedPublication.title}
                    large
                  />
                </div>

                <h3 className="min-w-0 text-[17px] font-semibold leading-[1.45] text-[#26352D] sm:text-[19px]">
                  {selectedPublication.title}
                </h3>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Jenis Publikasi" value={selectedPublication.category} />
                <DetailItem label="Tahun Terbit" value={String(selectedPublication.year)} />
                <DetailItem label="Penulis" value={selectedPublication.authors} full />
                <DetailItem
                  label="Nama Jurnal / Prosiding"
                  value={selectedPublication.source_name}
                />
                <DetailItem label="Indeks" value={selectedPublication.indeks || "-"} />
                <DetailItem
                  label="Rincian Terbitan"
                  value={selectedPublication.source_detail || "-"}
                  full
                />

                {/* Link sebagai tautan kalau berupa URL */}

                <div className="rounded-2xl bg-[#F6F9F6] px-4 py-3 sm:col-span-2">
                  <p className="text-[11px] text-[#89948D]">Link Publikasi / DOI</p>

                  {selectedPublication.href ? (
                    isLink(selectedPublication.href) ? (
                      <a
                        href={selectedPublication.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-[13px] font-medium leading-5 text-[#2E7D32] underline-offset-2 hover:underline"
                      >
                        {selectedPublication.href}
                      </a>
                    ) : (
                      <p className="mt-1 break-all text-[13px] font-medium leading-5 text-[#3B4A41]">
                        {selectedPublication.href}
                      </p>
                    )
                  ) : (
                    <p className="mt-1 text-[13px] font-medium leading-5 text-[#3B4A41]">-</p>
                  )}
                </div>

                <div className="rounded-2xl bg-[#F6F9F6] px-4 py-3 sm:col-span-2">
                  <p className="text-[11px] text-[#89948D]">File Bukti Publikasi</p>

                  {selectedPublication.file_url ? (
                    <a
                      href={selectedPublication.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block break-all text-[13px] font-medium leading-5 text-[#2E7D32] underline-offset-2 hover:underline"
                    >
                      {baseName(selectedPublication.file_url)}
                    </a>
                  ) : (
                    <p className="mt-1 text-[13px] font-medium leading-5 text-[#3B4A41]">
                      Tidak ada file
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[12px] font-medium text-[#536059]">
                  Ringkasan / Deskripsi
                </p>

                <p className="mt-2 text-[13px] leading-7 text-[#6E7A73]">
                  {selectedPublication.description || "Belum ada deskripsi."}
                </p>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      {modal === "delete" && selectedPublication && (
        <ConfirmDelete
          title="Hapus Publikasi?"
          onCancel={closeModal}
          onConfirm={handleDelete}
          busy={saving}
          error={formError}
        >
          Data publikasi{" "}
          <span className="font-medium text-[#475569]">{selectedPublication.title}</span>{" "}
          akan dihapus secara permanen dan tidak dapat dipulihkan.
        </ConfirmDelete>
      )}
    </div>
  );
}

/* =========================================================
   SUMMARY PILL
========================================================= */

function SummaryPill({
  label,
  value,
  grow,
  className = "",
}: {
  label: string;
  value: number;
  grow: number;
  className?: string;
}) {
  return (
    <div className="min-w-[120px] sm:min-w-0" style={{ flexGrow: grow, flexBasis: 0 }}>
      <p className="mb-1.5 truncate pl-1 text-[12px] text-[#7A867F]">{label}</p>

      <div
        className={`flex h-10 items-center rounded-full px-4 text-[13px] font-medium ${className}`}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   COVER THUMB
   Sampul kecil (3:4). Kalau belum ada / gagal dimuat, tampil
   kotak hijau dengan ikon buku, sama seperti halaman publik.
========================================================= */

function CoverThumb({
  url,
  title,
  large = false,
}: {
  url: string | null;
  title: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(url) && !failed;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-[#2E7D32] ${
        large ? "aspect-[3/4] w-full" : "h-14 w-[42px]"
      }`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url as string}
          alt={`Sampul ${title}`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#213B14] via-[#31551F] to-[#3F6B28]">
          <BookOpen size={large ? 22 : 16} strokeWidth={1.6} className="text-[#CFE8BF]" />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   FILE DROP
========================================================= */

function FileDrop({
  id,
  accept,
  name,
  error,
  emptyLabel,
  emptyHint,
  onChange,
}: {
  id: string;
  accept: string;
  name: string;
  error: string;
  emptyLabel: string;
  emptyHint: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <label
        htmlFor={id}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center transition ${
          error
            ? "border-[#E58A8A] bg-[#FFF8F8]"
            : "border-[#C9D7CB] bg-[#FAFCFA] hover:border-[#8DBB93] hover:bg-[#F4FAF5]"
        }`}
      >
        <FileUp size={22} strokeWidth={1.6} className="text-[#2E7D32]" />

        <span className="mt-2 max-w-full truncate text-[13px] font-medium text-[#536059]">
          {name || emptyLabel}
        </span>

        <span className="mt-0.5 text-[11px] text-[#929C96]">
          {name ? "Klik lagi untuk mengganti file" : emptyHint}
        </span>
      </label>

      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
      />

      {error && (
        <p
          role="alert"
          className="mt-1.5 text-[11.5px] font-medium leading-5 text-[#D34B4B]"
        >
          {error}
        </p>
      )}
    </>
  );
}

/* =========================================================
   FILTER SELECT
========================================================= */

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-full border border-transparent bg-white pl-4 pr-10 text-[12px] font-medium text-[#59655E] shadow-[0_1px_4px_rgba(38,53,45,0.05)] outline-none transition focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        strokeWidth={1.8}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8A948E]"
      />
    </div>
  );
}

/* =========================================================
   SELECT INPUT (form)
========================================================= */

function SelectInput({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} appearance-none pr-9`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        strokeWidth={1.8}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A948E]"
      />
    </div>
  );
}

/* =========================================================
   ICON BUTTON
========================================================= */

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
        danger
          ? "text-[#D34B4B] hover:bg-[#FFF1F1]"
          : "text-[#6F7B74] hover:bg-[#EEF3EF] hover:text-[#26352D]"
      }`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   MODAL SHELL
========================================================= */

function ModalShell({
  children,
  onClose,
  maxWidth,
  locked = false,
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidth: string;
  locked?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-[#1A251F]/35 p-3 backdrop-blur-[2px] sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !locked) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`my-auto w-full ${maxWidth} overflow-hidden rounded-[24px] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.18)]`}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between border-b border-[#EEF2EF] px-5 py-4 sm:px-6 sm:py-5">
      <div className="min-w-0 pr-3">
        <h2 className="text-[16px] font-semibold text-[#26352D] sm:text-[18px]">
          {title}
        </h2>

        <p className="mt-1 text-[12px] leading-5 text-[#89948D]">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8B9690] transition hover:bg-[#F2F5F2]"
      >
        <X size={17} strokeWidth={1.8} />
      </button>
    </div>
  );
}

/* =========================================================
   CONFIRM DELETE
========================================================= */

function ConfirmDelete({
  title,
  children,
  onCancel,
  onConfirm,
  busy,
  error,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
  error: string;
}) {
  return (
    <ModalShell onClose={onCancel} maxWidth="max-w-[420px]" locked={busy}>
      <div className="px-6 py-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F1]">
          <Trash2 size={21} strokeWidth={2} className="text-[#DC2626]" />
        </div>

        <h3 className="mt-5 text-[17px] font-semibold text-[#33423A]">{title}</h3>

        <p className="mx-auto mt-2 max-w-[340px] break-words text-[13px] leading-[22px] text-[#718096]">
          {children}
        </p>

        {error && (
          <p role="alert" className="mt-3 text-[12px] font-medium text-[#B91C1C]">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-[#EEF2EF] px-6 py-4 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={`${btnGhost} w-full sm:w-auto`}
        >
          Batal
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`${btnDanger} w-full sm:w-auto`}
        >
          {busy ? "Menghapus..." : "Hapus"}
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  required,
  hint,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12px] font-medium text-[#536059]">
        <span>
          {label}
          {required && <span className="ml-0.5 text-[#D84A4A]">*</span>}
        </span>

        {hint && (
          <span className="text-[11px] font-normal text-[#9AA49F]">{hint}</span>
        )}
      </div>

      {children}
    </div>
  );
}

/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-[#F6F9F6] px-4 py-3 ${full ? "sm:col-span-2" : ""}`}
    >
      <p className="text-[11px] text-[#89948D]">{label}</p>

      <p className="mt-1 break-words text-[13px] font-medium leading-5 text-[#3B4A41]">
        {value}
      </p>
    </div>
  );
}