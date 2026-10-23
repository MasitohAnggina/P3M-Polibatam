"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

/* =========================================================
   ADMIN: DOKUMEN & PANDUAN
   Letakkan di src/app/admin/dokumen-panduan/page.tsx

   Isi form disamakan dengan halaman Dokumen & Panduan publik:
   judul, jenis, tahun, tanggal, keterangan, format, ukuran,
   dan link file.

   KONTRAK API (Laravel, Sanctum):
   GET    /api/admin/dokumen        -> { data: ApiDokumen[] }
   POST   /api/admin/dokumen        -> { data: ApiDokumen }   (JSON)
   PUT    /api/admin/dokumen/{id}   -> { data: ApiDokumen }   (JSON)
   DELETE /api/admin/dokumen/{id}   -> { message }
   Publik: GET /api/dokumen         -> { data: ApiDokumen[] }

   Field JSON saat simpan:
   judul, kategori, tahun (4 angka), tanggal (YYYY-MM-DD, opsional),
   keterangan (opsional), format (opsional), ukuran (opsional),
   link_file (URL, path /dokumen/nama.pdf, atau "#").
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

/* =========================================================
   API + TOKEN
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const ENDPOINT = `${API_URL}/admin/dokumen`;

/* Halaman login menyimpan token di key "p3m_token":
   localStorage kalau "Ingat saya" dicentang, kalau tidak sessionStorage. */
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

function authHeaders(): Record<string, string> {
  const token = getToken();

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

type Failure = { message: string; fields: FieldErrors };

/* nama field API -> nama field form */
const FIELD_MAP: Record<string, keyof FormValues> = {
  judul: "title",
  kategori: "category",
  tahun: "year",
  tanggal: "date",
  keterangan: "description",
  format: "format",
  ukuran: "size",
  link_file: "href",
};

/* Ubah response gagal menjadi pesan umum + pesan per kolom */
async function readFailure(res: Response): Promise<Failure> {
  if (res.status === 401) {
    return {
      message: getToken()
        ? "Sesi login habis atau token tidak valid. Silakan login ulang."
        : "Token login tidak ditemukan di browser. Silakan login ulang.",
      fields: {},
    };
  }

  try {
    const json = await res.json();
    const fields: FieldErrors = {};

    for (const [key, messages] of Object.entries(json?.errors ?? {})) {
      const field = FIELD_MAP[key];
      const first = (messages as string[] | undefined)?.[0];
      if (field && first) fields[field] = first;
    }

    if (Object.keys(fields).length > 0) {
      return { message: "Periksa kembali isian yang ditandai.", fields };
    }

    if (json?.message) return { message: json.message, fields: {} };
  } catch {
    /* response bukan JSON */
  }

  return { message: `Terjadi kesalahan (kode ${res.status}).`, fields: {} };
}

/* Error yang membawa pesan dan kolom yang bermasalah */
class RequestError extends Error {
  fields: FieldErrors;

  constructor(failure: Failure) {
    super(failure.message);
    this.fields = failure.fields;
  }
}

/* =========================================================
   TYPE
========================================================= */

type Document = {
  id: number;
  title: string;
  category: string;
  year: string;
  date: string; // YYYY-MM-DD, "" kalau kosong
  description: string;
  format: string;
  size: string;
  href: string;
};

/* Nilai di form (tanpa id) */
type FormValues = Omit<Document, "id">;

/* Bentuk data dari API Laravel */
type ApiDokumen = {
  id: number;
  judul: string;
  kategori: string;
  tahun: string;
  tanggal: string | null;
  keterangan: string | null;
  format: string | null;
  ukuran: string | null;
  link_file: string;
};

function fromApi(item: ApiDokumen): Document {
  return {
    id: item.id,
    title: item.judul,
    category: item.kategori,
    year: String(item.tahun),
    date: item.tanggal ?? "",
    description: item.keterangan ?? "",
    format: item.format ?? "",
    size: item.ukuran ?? "",
    href: item.link_file,
  };
}

function toPayload(form: FormValues) {
  return {
    judul: form.title.trim(),
    kategori: form.category,
    tahun: form.year,
    tanggal: form.date || null,
    keterangan: form.description.trim() || null,
    format: form.format || null,
    ukuran: form.size.trim() || null,
    link_file: form.href.trim(),
  };
}

type ModalType = "add" | "edit" | "detail" | "delete" | null;

const currentYear = new Date().getFullYear();

const emptyForm: FormValues = {
  title: "",
  category: "",
  year: String(currentYear),
  date: "",
  description: "",
  format: "PDF",
  size: "",
  href: "",
};

/* =========================================================
   KATEGORI, FORMAT, TAHUN
   Harus sama dengan halaman Dokumen & Panduan publik
   dan DokumenController (KATEGORI, FORMAT).
========================================================= */

const ALL_CATEGORIES = "Semua Jenis";
const ALL_YEARS = "Semua Tahun";

const categoryOptions = [
  "Panduan",
  "Template",
  "Formulir",
  "SK & Surat Edaran",
];

const categories = [ALL_CATEGORIES, ...categoryOptions];

const formatOptions = ["PDF", "DOCX", "XLSX", "PPTX", "ZIP"];

const yearOptions = Array.from({ length: 8 }, (_, i) =>
  String(currentYear + 1 - i)
);

const PAGE_SIZE = 10;

/* warna pill ringkasan per jenis (berulang) */
const pillTones = [
  "bg-[#A5D6A7] text-[#1B5E20]",
  "bg-[#DDEBDD] text-[#1F5A23]",
  "border border-[#2E7D32]/30 bg-transparent text-[#2E5B32]",
];

/* =========================================================
   HELPER
========================================================= */

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatDate(date: string) {
  if (!date) return "-";

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) return date;

  return `${Number(day)} ${monthNames[Number(month) - 1]} ${year}`;
}

/* urut: tahun terbaru, lalu tanggal terbaru, lalu data terbaru */
function newestFirst(a: Document, b: Document) {
  return (
    b.year.localeCompare(a.year) ||
    b.date.localeCompare(a.date) ||
    b.id - a.id
  );
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

/* sama dengan aturan link_file di DokumenController */
const LINK_PATTERN = /^(#|https?:\/\/\S+|\/\S+)$/;

const isRealLink = (href: string) => href !== "" && href !== "#";

function fileInfo(item: Pick<Document, "format" | "size">) {
  if (!item.format && !item.size) return "";
  return [item.format, item.size].filter(Boolean).join(" · ");
}

/* =========================================================
   SHARED STYLES
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-[#DCE4DE] bg-white px-3.5 text-[13px] text-[#2B3830] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10";

const inputErrorClass =
  "!border-[#D84A4A] focus:!border-[#D84A4A] focus:!ring-[#D84A4A]/10";

const textareaClass =
  "w-full resize-y rounded-xl border border-[#DCE4DE] bg-white px-3.5 py-2.5 text-[13px] leading-6 text-[#2B3830] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10";

const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#2E7D32] px-5 text-[13px] font-medium text-white transition hover:bg-[#1B5E20] disabled:cursor-not-allowed disabled:opacity-40";

const btnGhost =
  "inline-flex h-10 items-center justify-center rounded-full border border-[#DCE4DE] bg-white px-5 text-[13px] font-medium text-[#5B675F] transition hover:bg-[#F4F7F4] disabled:cursor-not-allowed disabled:opacity-40";

const btnDanger =
  "inline-flex h-10 items-center justify-center rounded-full bg-[#DC2626] px-5 text-[13px] font-medium text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40";

const thClass =
  "border-b border-dashed border-[#DCE4DE] px-3 py-4 text-[12px] font-medium text-[#7A867F]";

/* =========================================================
   MAIN PAGE
========================================================= */

export default function AdminDokumenPanduanPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [selectedYear, setSelectedYear] = useState(ALL_YEARS);
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );

  const [form, setForm] = useState<FormValues>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  /* =========================================================
     AMBIL DATA DARI API
  ========================================================= */

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const res = await fetch(ENDPOINT, {
        headers: authHeaders(),
        cache: "no-store",
      });

      if (!res.ok) throw new RequestError(await readFailure(res));

      const json = await res.json();

      setDocuments(((json.data ?? []) as ApiDokumen[]).map(fromApi));
    } catch (err) {
      setPageError(
        err instanceof RequestError
          ? err.message
          : "Tidak dapat terhubung ke server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  /* =========================================================
     FILTER + PAGINASI
  ========================================================= */

  /* tahun diambil otomatis dari data, terbaru di atas */
  const years = useMemo(
    () => [
      ALL_YEARS,
      ...Array.from(new Set(documents.map((d) => d.year))).sort((a, b) =>
        b.localeCompare(a)
      ),
    ],
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return documents
      .filter((item) => {
        const matchSearch =
          !keyword ||
          item.title.toLowerCase().includes(keyword) ||
          item.category.toLowerCase().includes(keyword) ||
          item.description.toLowerCase().includes(keyword);

        const matchCategory =
          selectedCategory === ALL_CATEGORIES ||
          item.category === selectedCategory;

        const matchYear =
          selectedYear === ALL_YEARS || item.year === selectedYear;

        return matchSearch && matchCategory && matchYear;
      })
      .sort(newestFirst);
  }, [documents, search, selectedCategory, selectedYear]);

  /* kembali ke halaman 1 saat filter berubah */
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory, selectedYear]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDocuments.length / PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const visibleDocuments = filteredDocuments.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  /* =========================================================
     SUMMARY
  ========================================================= */

  const summary = useMemo(
    () =>
      categoryOptions.map((category) => ({
        label: category,
        value: documents.filter((item) => item.category === category).length,
      })),
    [documents]
  );

  /* =========================================================
     MODAL
  ========================================================= */

  const resetErrors = () => {
    setSaveError("");
    setFieldErrors({});
  };

  const closeModal = () => {
    setModal(null);
    setSelectedDocument(null);
    setEditId(null);
    setForm(emptyForm);
    resetErrors();
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
    setSelectedDocument(null);
    setEditId(null);
    setForm(emptyForm);
    resetErrors();
    setModal("add");
  };

  const openEditModal = (item: Document) => {
    setSelectedDocument(item);
    setEditId(item.id);
    setForm({
      title: item.title,
      category: item.category,
      year: item.year,
      date: item.date,
      description: item.description,
      format: item.format,
      size: item.size,
      href: item.href,
    });
    resetErrors();
    setModal("edit");
  };

  const openDetailModal = (item: Document) => {
    setSelectedDocument(item);
    setModal("detail");
  };

  const openDeleteModal = (item: Document) => {
    setSelectedDocument(item);
    resetErrors();
    setModal("delete");
  };

  function updateForm<K extends keyof FormValues>(
    field: K,
    value: FormValues[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  /* memilih tanggal otomatis mengisi tahun */
  const changeDate = (value: string) => {
    setForm((current) => ({
      ...current,
      date: value,
      year: value ? value.slice(0, 4) : current.year,
    }));
    setFieldErrors((current) => ({
      ...current,
      date: undefined,
      year: undefined,
    }));
  };

  /* tahun yang sudah ada di data tetap muncul di pilihan */
  const formYearOptions = yearOptions.includes(form.year)
    ? yearOptions
    : [form.year, ...yearOptions];

  /* =========================================================
     VALIDASI + SAVE
  ========================================================= */

  const hrefValid = LINK_PATTERN.test(form.href.trim());

  const canSave =
    form.title.trim() !== "" &&
    form.category !== "" &&
    /^\d{4}$/.test(form.year) &&
    hrefValid;

  const handleSave = async () => {
    if (!canSave || saving) return;

    const isEdit = modal === "edit";
    const url = isEdit ? `${ENDPOINT}/${editId}` : ENDPOINT;

    setSaving(true);
    resetErrors();

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });

      if (!res.ok) throw new RequestError(await readFailure(res));

      const saved = fromApi((await res.json()).data as ApiDokumen);

      if (isEdit) {
        setDocuments((current) =>
          current.map((item) => (item.id === saved.id ? saved : item))
        );
      } else {
        setDocuments((current) => [saved, ...current]);
      }

      closeModal();
    } catch (err) {
      if (err instanceof RequestError) {
        setSaveError(err.message);
        setFieldErrors(err.fields);
      } else {
        setSaveError("Tidak dapat terhubung ke server.");
      }
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async () => {
    if (!selectedDocument || saving) return;

    setSaving(true);
    resetErrors();

    try {
      const res = await fetch(`${ENDPOINT}/${selectedDocument.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) throw new RequestError(await readFailure(res));

      setDocuments((current) =>
        current.filter((item) => item.id !== selectedDocument.id)
      );

      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof RequestError
          ? err.message
          : "Tidak dapat terhubung ke server."
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
                <FolderOpen
                  size={18}
                  strokeWidth={1.8}
                  className="text-[#2E7D32]"
                />
              </div>

              <h1 className="text-[26px] font-medium tracking-[-0.02em] sm:text-[32px]">
                Dokumen &amp; Panduan
              </h1>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#7A867F] sm:ml-[52px]">
              Kelola buku panduan, template, formulir, dan SK yang ditampilkan
              pada halaman Dokumen &amp; Panduan P2M.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            <Plus size={16} strokeWidth={2} />
            Tambah Dokumen
          </button>
        </div>

        {pageError && (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-2 rounded-2xl border border-[#F3C9C9] bg-[#FFF1F1] px-4 py-3 text-[13px] text-[#B91C1C] sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{pageError}</span>

            <button
              type="button"
              onClick={loadDocuments}
              className="self-start rounded-full border border-[#E7B4B4] bg-white px-4 py-1.5 text-[12px] font-medium text-[#B91C1C] transition hover:bg-[#FFF8F8] sm:self-auto"
            >
              Muat Ulang
            </button>
          </div>
        )}

        {/* =====================================================
            SUMMARY PILLS
        ===================================================== */}

        <div className="mb-6 flex flex-wrap gap-2 sm:flex-nowrap">
          <SummaryPill
            label="Total"
            value={documents.length}
            grow={Math.max(documents.length, 1)}
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
                placeholder="Cari judul atau keterangan dokumen..."
                className="h-11 w-full rounded-full border border-transparent bg-white pl-11 pr-4 text-[13px] text-[#3D4942] shadow-[0_1px_4px_rgba(38,53,45,0.05)] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:flex">
              <div className="lg:w-[210px]">
                <FilterSelect
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  options={categories}
                />
              </div>

              <div className="lg:w-[170px]">
                <FilterSelect
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={years}
                />
              </div>
            </div>
          </div>

          {/* TABLE */}

          <div className="w-full overflow-hidden rounded-[22px] bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[820px] border-separate border-spacing-y-1 px-2 text-left">
                <thead>
                  <tr>
                    <th className={`${thClass} min-w-[340px] pl-5`}>
                      Judul Dokumen
                    </th>
                    <th className={`${thClass} w-[170px] text-center`}>Jenis</th>
                    <th className={`${thClass} w-[160px] text-center`}>
                      Tahun / Tanggal
                    </th>
                    <th className={`${thClass} w-[140px] text-center`}>File</th>
                    <th className={`${thClass} w-[130px] text-center`}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleDocuments.map((item) => {
                    const cell = "bg-white group-hover:bg-[#F2F8F2]";
                    const info = fileInfo(item);

                    return (
                      <tr key={item.id} className="group">
                        {/* TITLE */}

                        <td
                          className={`rounded-l-2xl py-3.5 pl-5 pr-3 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-xl bg-[#EEF3EF] text-[#2E7D32]">
                              <FileText size={20} strokeWidth={1.6} />
                            </div>

                            <div className="min-w-0">
                              <p className="line-clamp-2 max-w-[420px] text-[13px] font-medium leading-[20px] text-[#26352C]">
                                {item.title}
                              </p>

                              {item.description && (
                                <p className="mt-0.5 line-clamp-1 max-w-[420px] text-[11.5px] leading-[18px] text-[#98A39C]">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td
                          className={`px-3 py-3.5 text-center align-middle transition-colors ${cell}`}
                        >
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#E3F1E4] px-3 py-1.5 text-[11px] font-medium leading-[15px] text-[#2E7D32]">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]" />
                            {item.category}
                          </span>
                        </td>

                        <td
                          className={`px-3 py-3.5 text-center align-middle text-[13px] text-[#46544B] transition-colors ${cell}`}
                        >
                          {item.date ? formatDate(item.date) : item.year}
                        </td>

                        <td
                          className={`px-3 py-3.5 text-center align-middle text-[12px] text-[#6E7A73] transition-colors ${cell}`}
                        >
                          {info ? (
                            <span className="whitespace-nowrap">{info}</span>
                          ) : (
                            <span className="text-[#A3AE9E]">-</span>
                          )}
                        </td>

                        <td
                          className={`rounded-r-2xl px-3 py-3.5 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <IconButton
                              label="Lihat detail"
                              onClick={() => openDetailModal(item)}
                            >
                              <Eye size={16} strokeWidth={1.8} />
                            </IconButton>

                            <IconButton
                              label="Edit"
                              onClick={() => openEditModal(item)}
                            >
                              <Pencil size={16} strokeWidth={1.8} />
                            </IconButton>

                            <IconButton
                              label="Hapus"
                              danger
                              onClick={() => openDeleteModal(item)}
                            >
                              <Trash2 size={16} strokeWidth={1.8} />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* EMPTY STATE */}

                  {filteredDocuments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F2] text-[#7A857D]">
                            <Search size={20} strokeWidth={1.8} />
                          </div>

                          <p className="text-[14px] font-medium text-[#526057]">
                            {loading
                              ? "Memuat data dokumen..."
                              : documents.length === 0
                                ? "Belum ada data dokumen"
                                : "Data dokumen tidak ditemukan"}
                          </p>

                          <p className="mt-1 text-[12px] text-[#8A948E]">
                            {loading
                              ? "Mohon tunggu sebentar."
                              : documents.length === 0
                                ? "Klik Tambah Dokumen untuk menambahkan data pertama."
                                : "Coba gunakan kata kunci, jenis, atau tahun lain."}
                          </p>
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
                {filteredDocuments.length > 0 ? (
                  <>
                    Menampilkan{" "}
                    <span className="font-medium text-[#46544B]">
                      {startIndex + 1}–{startIndex + visibleDocuments.length}
                    </span>{" "}
                    dari {filteredDocuments.length} data dokumen
                    {filteredDocuments.length !== documents.length &&
                      ` (total ${documents.length})`}
                  </>
                ) : (
                  <>Tidak ada data yang ditampilkan</>
                )}
              </p>

              {totalPages > 1 && (
                <nav
                  aria-label="Halaman daftar dokumen"
                  className="flex items-center gap-1"
                >
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
        <ModalShell
          onClose={saving ? () => {} : closeModal}
          maxWidth="max-w-[720px]"
        >
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title={modal === "add" ? "Tambah Dokumen" : "Edit Dokumen"}
              subtitle={
                modal === "add"
                  ? "Isi form berikut untuk menambahkan dokumen."
                  : "Perbarui dokumen yang dipilih."
              }
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="Judul Dokumen"
                  required
                  error={fieldErrors.title}
                  className="md:col-span-2"
                >
                  <input
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="Contoh: Template Proposal Penelitian"
                    className={`${inputClass} ${fieldErrors.title ? inputErrorClass : ""}`}
                  />
                </FormField>

                <FormField
                  label="Jenis Dokumen"
                  required
                  error={fieldErrors.category}
                >
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => updateForm("category", e.target.value)}
                      className={`${inputClass} appearance-none pr-9 ${fieldErrors.category ? inputErrorClass : ""}`}
                    >
                      <option value="">Pilih jenis dokumen</option>
                      {categoryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={15}
                      strokeWidth={1.8}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A948E]"
                    />
                  </div>
                </FormField>

                <FormField label="Tahun" required error={fieldErrors.year}>
                  <div className="relative">
                    <select
                      value={form.year}
                      onChange={(e) => updateForm("year", e.target.value)}
                      className={`${inputClass} appearance-none pr-9 ${fieldErrors.year ? inputErrorClass : ""}`}
                    >
                      {formYearOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={15}
                      strokeWidth={1.8}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A948E]"
                    />
                  </div>
                </FormField>

                <FormField
                  label="Tanggal"
                  hint="Opsional, kosong = hanya tahun"
                  error={fieldErrors.date}
                  className="md:col-span-2"
                >
                  <div className="relative">
                    <CalendarDays
                      size={16}
                      strokeWidth={1.8}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A948E]"
                    />

                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => changeDate(e.target.value)}
                      className={`${inputClass} pl-10 ${fieldErrors.date ? inputErrorClass : ""}`}
                    />
                  </div>
                </FormField>

                <FormField
                  label="Keterangan"
                  hint="Opsional, ikut dicari di halaman publik"
                  error={fieldErrors.description}
                  className="md:col-span-2"
                >
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    rows={3}
                    placeholder="Keterangan singkat isi dokumen"
                    className={textareaClass}
                  />
                </FormField>

                <FormField
                  label="Format File"
                  hint="Opsional"
                  error={fieldErrors.format}
                >
                  <div className="relative">
                    <select
                      value={form.format}
                      onChange={(e) => updateForm("format", e.target.value)}
                      className={`${inputClass} appearance-none pr-9 ${fieldErrors.format ? inputErrorClass : ""}`}
                    >
                      <option value="">Tidak ditentukan</option>
                      {formatOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={15}
                      strokeWidth={1.8}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A948E]"
                    />
                  </div>
                </FormField>

                <FormField
                  label="Ukuran File"
                  hint="Opsional"
                  error={fieldErrors.size}
                >
                  <input
                    value={form.size}
                    onChange={(e) => updateForm("size", e.target.value)}
                    placeholder="Contoh: 2,4 MB"
                    className={`${inputClass} ${fieldErrors.size ? inputErrorClass : ""}`}
                  />
                </FormField>

                <FormField
                  label="Link File"
                  required
                  error={
                    fieldErrors.href ??
                    (form.href.trim() !== "" && !hrefValid
                      ? 'Isi dengan URL (https://...), path (/dokumen/nama.pdf), atau "#".'
                      : undefined)
                  }
                  className="md:col-span-2"
                >
                  <input
                    value={form.href}
                    onChange={(e) => updateForm("href", e.target.value)}
                    placeholder="https://... atau /dokumen/nama-file.pdf"
                    className={`${inputClass} ${
                      fieldErrors.href ||
                      (form.href.trim() !== "" && !hrefValid)
                        ? inputErrorClass
                        : ""
                    }`}
                  />

                  <p className="mt-1.5 text-[11px] leading-5 text-[#929C96]">
                    Link SharePoint, Google Drive, atau path file di folder
                    public. Isi &quot;#&quot; selama file belum tersedia
                    (kartu di halaman publik belum bisa diklik).
                  </p>
                </FormField>

                {saveError && (
                  <p
                    role="alert"
                    className="rounded-xl bg-[#FFF1F1] px-3.5 py-2.5 text-[12px] font-medium leading-5 text-[#B91C1C] md:col-span-2"
                  >
                    {saveError}
                  </p>
                )}
              </div>
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
                    ? "Simpan Dokumen"
                    : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {modal === "detail" && selectedDocument && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[640px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title="Detail Dokumen"
              subtitle="Informasi lengkap data yang dipilih."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#EEF3EF] text-[#2E7D32]">
                  <FileText size={22} strokeWidth={1.6} />
                </div>

                <h3 className="min-w-0 text-[17px] font-semibold leading-[1.45] text-[#26352D] sm:text-[19px]">
                  {selectedDocument.title}
                </h3>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DetailItem label="Jenis" value={selectedDocument.category} />
                <DetailItem label="Tahun" value={selectedDocument.year} />
                <DetailItem
                  label="Tanggal"
                  value={formatDate(selectedDocument.date)}
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Format"
                  value={selectedDocument.format || "-"}
                />
                <DetailItem label="Ukuran" value={selectedDocument.size || "-"} />
              </div>

              <div className="mt-5">
                <p className="text-[12px] font-medium text-[#536059]">
                  Keterangan
                </p>

                <p className="mt-2 whitespace-pre-line text-[13px] leading-7 text-[#6E7A73]">
                  {selectedDocument.description || "Belum ada keterangan."}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-[12px] font-medium text-[#536059]">
                  Link File
                </p>

                {isRealLink(selectedDocument.href) ? (
                  <a
                    href={selectedDocument.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-start gap-2.5 rounded-xl bg-[#F6F9F6] px-4 py-3 text-[13px] font-medium leading-5 text-[#2E7D32] transition hover:bg-[#EEF5EE]"
                  >
                    <ExternalLink
                      size={15}
                      strokeWidth={1.8}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="break-all">{selectedDocument.href}</span>
                  </a>
                ) : (
                  <p className="mt-2 rounded-xl bg-[#F6F9F6] px-4 py-3 text-[13px] leading-5 text-[#7A867F]">
                    File belum tersedia.
                  </p>
                )}
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      {modal === "delete" && selectedDocument && (
        <ConfirmDelete
          title="Hapus Dokumen?"
          onCancel={closeModal}
          onConfirm={handleDelete}
          loading={saving}
          error={saveError}
        >
          Data dokumen{" "}
          <span className="font-medium text-[#475569]">
            {selectedDocument.title}
          </span>{" "}
          akan dihapus secara permanen dan tidak lagi tampil di halaman publik.
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
    <div
      className="min-w-[110px] sm:min-w-0"
      style={{ flexGrow: grow, flexBasis: 0 }}
    >
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
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidth: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-[#1A251F]/35 p-3 backdrop-blur-[2px] sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
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
  loading,
  error,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <ModalShell onClose={loading ? () => {} : onCancel} maxWidth="max-w-[420px]">
      <div className="px-6 py-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F1]">
          <Trash2 size={21} strokeWidth={2} className="text-[#DC2626]" />
        </div>

        <h3 className="mt-5 text-[17px] font-semibold text-[#33423A]">
          {title}
        </h3>

        <p className="mx-auto mt-2 max-w-[340px] break-words text-[13px] leading-[22px] text-[#718096]">
          {children}
        </p>

        {error && (
          <p
            role="alert"
            className="mx-auto mt-3 max-w-[340px] rounded-xl bg-[#FFF1F1] px-3.5 py-2.5 text-[12px] font-medium leading-5 text-[#B91C1C]"
          >
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-[#EEF2EF] px-6 py-4 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={`${btnGhost} w-full sm:w-auto`}
        >
          Batal
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`${btnDanger} w-full sm:w-auto`}
        >
          {loading ? "Menghapus..." : "Hapus"}
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
  error,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-baseline justify-between gap-2 text-[12px] font-medium text-[#536059]">
        <span>
          {label}
          {required && <span className="ml-0.5 text-[#D84A4A]">*</span>}
        </span>

        {hint && (
          <span className="text-[11px] font-normal text-[#9AA49F]">{hint}</span>
        )}
      </label>

      {children}

      {error && (
        <p className="mt-1.5 text-[11.5px] font-medium leading-5 text-[#D34B4B]">
          {error}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F6F9F6] px-4 py-3">
      <p className="text-[11px] text-[#89948D]">{label}</p>

      <p className="mt-1 break-words text-[13px] font-medium leading-5 text-[#3B4A41]">
        {value}
      </p>
    </div>
  );
}