"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";

import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileImage,
  Info,
  List as ListIcon,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Table as TableIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";

/* =========================================================
   ADMIN: DATA INFORMASI
   Letakkan di src/app/admin/informasi/page.tsx

   Isi form disamakan dengan halaman Informasi publik:
   judul, kategori, tanggal, penulis, gambar, isi informasi
   (blok paragraf / daftar poin / tabel) dan lampiran
   (file atau tautan).

   KONTRAK API (Laravel, Sanctum):
   GET    /api/admin/informasi        -> { data: ApiInformation[] }
   POST   /api/admin/informasi        -> { data: ApiInformation }  (multipart)
   POST   /api/admin/informasi/{id}   -> { data: ApiInformation }  (multipart + _method=PUT)
   DELETE /api/admin/informasi/{id}   -> { message }
   Publik: GET /api/informasi         -> { data: ApiInformation[] }

   Field multipart saat simpan:
   judul, kategori, tanggal (YYYY-MM-DD), penulis (opsional),
   isi (JSON string berisi blok), gambar (gambar apa saja, opsional),
   hapus_gambar (1 = hapus gambar lama),
   lampiran[i][label], lampiran[i][url] (tautan) atau
   lampiran[i][file] (file baru) atau lampiran[i][path] (file lama).
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
const BASE_URL = API_URL.replace(/\/api\/?$/, "");
const ENDPOINT = `${API_URL}/admin/informasi`;

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

async function readError(res: Response): Promise<string> {
  if (res.status === 401) {
    return getToken()
      ? "Sesi login habis atau token tidak valid. Silakan login ulang."
      : "Token login tidak ditemukan di browser. Silakan login ulang.";
  }

  try {
    const json = await res.json();

    if (json?.errors) {
      const first = Object.values(json.errors)[0] as string[] | undefined;
      if (first?.[0]) return first[0];
    }

    if (json?.message) return json.message;
  } catch {
    /* response bukan JSON */
  }

  return `Terjadi kesalahan (kode ${res.status}).`;
}

/* Jaga-jaga kalau API mengirim path relatif, bukan URL lengkap */
function fileUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return `${BASE_URL}/storage/${path.replace(/^\/?(storage\/)?/, "")}`;
}

function fileLabel(url: string): string {
  const last = url.split("?")[0].split("/").pop() ?? "";

  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/* =========================================================
   TYPE
========================================================= */

/* Blok isi informasi (sama dengan ContentBlock di halaman publik) */
type ApiBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; head: [string, string]; rows: [string, string][] };

/* Blok di editor. Daftar poin disimpan sebagai teks (satu poin per baris) */
type Block =
  | { id: string; type: "p"; text: string }
  | { id: string; type: "list"; items: string }
  | { id: string; type: "table"; head: [string, string]; rows: [string, string][] };

/* Lampiran: tautan (mode "link") atau file (mode "file") */
type Attachment = {
  id: string;
  label: string;
  mode: "link" | "file";
  url: string; // mode link
  path: string; // mode file: path file lama di server ("" kalau file baru)
  href: string; // URL file lama, untuk ditampilkan
  file: File | null; // file baru yang dipilih
};

type Information = {
  id: number;
  title: string;
  category: string;
  date: string; // YYYY-MM-DD
  author: string;
  blocks: Block[];
  attachments: Attachment[];
  image: string; // URL gambar ("" kalau belum ada, blob: kalau baru dipilih)
};

/* Bentuk data dari API Laravel */
type ApiInformation = {
  id: number;
  judul: string;
  kategori: string;
  tanggal: string;
  penulis: string | null;
  isi: ApiBlock[] | null;
  lampiran: { label: string; href: string; path: string | null }[] | null;
  gambar: string | null;
};

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${++idCounter}`;

function blocksFromApi(blocks: ApiBlock[] | null): Block[] {
  return (blocks ?? []).map((block): Block => {
    if (block.type === "list") {
      return { id: newId("b"), type: "list", items: block.items.join("\n") };
    }

    if (block.type === "table") {
      return {
        id: newId("b"),
        type: "table",
        head: [block.head[0], block.head[1]],
        rows: block.rows.map((row) => [row[0], row[1]] as [string, string]),
      };
    }

    return { id: newId("b"), type: "p", text: block.text };
  });
}

/* Blok kosong dibuang, backend juga membersihkannya */
function blocksToApi(blocks: Block[]): ApiBlock[] {
  const result: ApiBlock[] = [];

  for (const block of blocks) {
    if (block.type === "p") {
      const text = block.text.trim();
      if (text) result.push({ type: "p", text });
    } else if (block.type === "list") {
      const items = block.items
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length) result.push({ type: "list", items });
    } else {
      const rows = block.rows
        .map((row) => [row[0].trim(), row[1].trim()] as [string, string])
        .filter((row) => row[0] || row[1]);
      if (rows.length) {
        result.push({
          type: "table",
          head: [block.head[0].trim() || "Keterangan", block.head[1].trim() || "Detail"],
          rows,
        });
      }
    }
  }

  return result;
}

function fromApi(item: ApiInformation): Information {
  return {
    id: item.id,
    title: item.judul,
    category: item.kategori,
    date: item.tanggal,
    author: item.penulis ?? "",
    blocks: blocksFromApi(item.isi),
    attachments: (item.lampiran ?? []).map((l) => ({
      id: newId("a"),
      label: l.label,
      mode: l.path ? "file" : "link",
      url: l.path ? "" : l.href,
      path: l.path ?? "",
      href: l.path ? fileUrl(l.href) : "",
      file: null,
    })),
    image: fileUrl(item.gambar),
  };
}

/* ringkasan = paragraf pertama (untuk tabel dan pencarian) */
function summaryOf(blocks: Block[]): string {
  const first = blocks.find((block) => block.type === "p" && block.text.trim());
  return first && first.type === "p" ? first.text.trim() : "";
}

type ModalType = "add" | "edit" | "detail" | "delete" | null;

const emptyForm: Information = {
  id: 0,
  title: "",
  category: "",
  date: "",
  author: "",
  blocks: [],
  attachments: [],
  image: "",
};

/* =========================================================
   KATEGORI
   Harus sama dengan daftar kategori di halaman Informasi publik.
========================================================= */

const ALL_CATEGORIES = "Semua Kategori";

const categoryOptions = [
  "Informasi",
  "Kegiatan",
  "Penelitian",
  "Pengabdian",
  "Panduan",
  "Pengumuman",
  "Agenda",
];

const categories = [ALL_CATEGORIES, ...categoryOptions];

const PAGE_SIZE = 10;

/* warna pill ringkasan per kategori (berulang) */
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

const isBlob = (url: string) => url.startsWith("blob:");

const revokeIfBlob = (url: string) => {
  if (isBlob(url)) URL.revokeObjectURL(url);
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

/* Lampiran valid: ada nama dan tujuan (tautan atau file) */
function attachmentValid(item: Attachment) {
  if (item.label.trim() === "") return false;

  return item.mode === "link"
    ? item.url.trim() !== ""
    : item.file !== null || item.path !== "";
}

function buildBody(
  form: Information,
  image: { file: File | null; remove: boolean },
  isEdit: boolean
): FormData {
  const body = new FormData();

  body.append("judul", form.title.trim());
  body.append("kategori", form.category);
  body.append("tanggal", form.date);
  body.append("penulis", form.author.trim());
  body.append("isi", JSON.stringify(blocksToApi(form.blocks)));

  form.attachments.forEach((item, index) => {
    body.append(`lampiran[${index}][label]`, item.label.trim());

    if (item.mode === "link") {
      body.append(`lampiran[${index}][url]`, item.url.trim());
    } else if (item.file) {
      body.append(`lampiran[${index}][file]`, item.file);
    } else {
      body.append(`lampiran[${index}][path]`, item.path);
    }
  });

  if (image.file) body.append("gambar", image.file);
  if (image.remove && !image.file) body.append("hapus_gambar", "1");

  // Laravel tidak membaca multipart lewat PUT, jadi pakai POST + _method
  if (isEdit) body.append("_method", "PUT");

  return body;
}

/* =========================================================
   SHARED STYLES
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-[#DCE4DE] bg-white px-3.5 text-[13px] text-[#2B3830] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10";

const textareaClass =
  "w-full resize-y rounded-xl border border-[#DCE4DE] bg-white px-3.5 py-2.5 text-[13px] leading-6 text-[#2B3830] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10";

const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#2E7D32] px-5 text-[13px] font-medium text-white transition hover:bg-[#1B5E20] disabled:cursor-not-allowed disabled:opacity-40";

const btnGhost =
  "inline-flex h-10 items-center justify-center rounded-full border border-[#DCE4DE] bg-white px-5 text-[13px] font-medium text-[#5B675F] transition hover:bg-[#F4F7F4] disabled:cursor-not-allowed disabled:opacity-40";

const btnDanger =
  "inline-flex h-10 items-center justify-center rounded-full bg-[#DC2626] px-5 text-[13px] font-medium text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40";

const btnSmall =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[#C8D6CA] bg-white px-4 text-[12px] font-medium text-[#2E7D32] transition hover:bg-[#F1F8F2]";

const thClass =
  "border-b border-dashed border-[#DCE4DE] px-3 py-4 text-[12px] font-medium text-[#7A867F]";

/* =========================================================
   MAIN PAGE
========================================================= */

export default function AdminInformasiPage() {
  const [informations, setInformations] = useState<Information[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedInformation, setSelectedInformation] =
    useState<Information | null>(null);

  const [form, setForm] = useState<Information>(emptyForm);

  /* gambar (opsional, semua format) */
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  /* =========================================================
     AMBIL DATA DARI API
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(ENDPOINT, {
          headers: authHeaders(),
          cache: "no-store",
        });

        if (!res.ok) throw new Error(await readError(res));

        const json = await res.json();

        if (!cancelled) {
          setInformations(((json.data ?? []) as ApiInformation[]).map(fromApi));
          setPageError("");
        }
      } catch (err) {
        if (!cancelled) {
          setPageError(
            err instanceof Error ? err.message : "Gagal memuat data informasi."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     FILTER + PAGINASI
  ========================================================= */

  const filteredInformations = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return informations.filter((item) => {
      const matchSearch =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        item.author.toLowerCase().includes(keyword) ||
        summaryOf(item.blocks).toLowerCase().includes(keyword);

      const matchCategory =
        selectedCategory === ALL_CATEGORIES ||
        item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [informations, search, selectedCategory]);

  /* kembali ke halaman 1 saat filter berubah */
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInformations.length / PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const visibleInformations = filteredInformations.slice(
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
        value: informations.filter((item) => item.category === category).length,
      })),
    [informations]
  );

  /* =========================================================
     MODAL
  ========================================================= */

  const resetUploads = () => {
    setImageFile(null);
    setImageName("");
    setRemoveImage(false);
    setImageError("");
    setSaveError("");
  };

  const closeModal = () => {
    revokeIfBlob(form.image);
    setModal(null);
    setSelectedInformation(null);
    setForm(emptyForm);
    resetUploads();
  };

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    if (!modal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, saving, form.image]);

  const openAddModal = () => {
    setSelectedInformation(null);
    setForm(emptyForm);
    resetUploads();
    setModal("add");
  };

  const openEditModal = (information: Information) => {
    setSelectedInformation(information);
    setForm({
      ...information,
      blocks: information.blocks.map((block) => ({ ...block })) as Block[],
      attachments: information.attachments.map((item) => ({ ...item })),
    });
    resetUploads();
    setModal("edit");
  };

  const openDetailModal = (information: Information) => {
    setSelectedInformation(information);
    setModal("detail");
  };

  const openDeleteModal = (information: Information) => {
    setSelectedInformation(information);
    setSaveError("");
    setModal("delete");
  };

  function updateForm<K extends keyof Information>(
    field: K,
    value: Information[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  /* =========================================================
     GAMBAR (semua format, ukuran, dan resolusi diterima)
  ========================================================= */

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    // reset supaya file yang sama bisa dipilih ulang
    input.value = "";

    if (!file) return;

    // format, ukuran, dan resolusi bebas; hanya pastikan file adalah gambar
    if (!file.type.startsWith("image/")) {
      setImageError("File yang dipilih bukan gambar.");
      return;
    }

    setImageError("");

    setForm((current) => {
      revokeIfBlob(current.image);
      return { ...current, image: URL.createObjectURL(file) };
    });
    setImageFile(file);
    setImageName(file.name);
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setForm((current) => {
      revokeIfBlob(current.image);
      return { ...current, image: "" };
    });
    setImageFile(null);
    setImageName("");
    setRemoveImage(true);
    setImageError("");
  };

  /* =========================================================
     SAVE (POST ke API)
  ========================================================= */

  const attachmentsOk = form.attachments.every(attachmentValid);

  const canSave =
    form.title.trim() !== "" &&
    form.category !== "" &&
    form.date !== "" &&
    attachmentsOk;

  const handleSave = async () => {
    if (!canSave || saving) return;

    const isEdit = modal === "edit";
    const body = buildBody(
      form,
      { file: imageFile, remove: removeImage },
      isEdit
    );
    const url = isEdit ? `${ENDPOINT}/${form.id}` : ENDPOINT;

    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(), // jangan set Content-Type, browser mengaturnya untuk FormData
        body,
      });

      if (!res.ok) throw new Error(await readError(res));

      const saved = fromApi((await res.json()).data as ApiInformation);

      if (isEdit) {
        setInformations((current) =>
          current.map((item) => (item.id === saved.id ? saved : item))
        );
      } else {
        setInformations((current) => [saved, ...current]);
      }

      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Gagal menyimpan data informasi."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     DELETE (DELETE ke API)
  ========================================================= */

  const handleDelete = async () => {
    if (!selectedInformation || saving) return;

    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`${ENDPOINT}/${selectedInformation.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error(await readError(res));

      setInformations((current) =>
        current.filter((item) => item.id !== selectedInformation.id)
      );

      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Gagal menghapus data informasi."
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
                <Info size={18} strokeWidth={1.8} className="text-[#2E7D32]" />
              </div>

              <h1 className="text-[26px] font-medium tracking-[-0.02em] sm:text-[32px]">
                Informasi
              </h1>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#7A867F] sm:ml-[52px]">
              Kelola informasi, kegiatan, dan panduan yang ditampilkan pada
              halaman informasi P2M.
            </p>
          </div>

          <button type="button" onClick={openAddModal} className={`${btnPrimary} w-full sm:w-auto`}>
            <Plus size={16} strokeWidth={2} />
            Tambah Informasi
          </button>
        </div>

        {pageError && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-[#F3C9C9] bg-[#FFF1F1] px-4 py-3 text-[13px] text-[#B91C1C]"
          >
            {pageError}
          </div>
        )}

        {/* =====================================================
            SUMMARY PILLS
        ===================================================== */}

        <div className="mb-6 flex flex-wrap gap-2 sm:flex-nowrap">
          <SummaryPill
            label="Total"
            value={informations.length}
            grow={Math.max(informations.length, 1)}
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
                placeholder="Cari judul, penulis, atau isi informasi..."
                className="h-11 w-full rounded-full border border-transparent bg-white pl-11 pr-4 text-[13px] text-[#3D4942] shadow-[0_1px_4px_rgba(38,53,45,0.05)] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10"
              />
            </div>

            <div className="w-full lg:w-[240px]">
              <FilterSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={categories}
              />
            </div>
          </div>

          {/* TABLE */}

          <div className="w-full overflow-hidden rounded-[22px] bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-y-1 px-2 text-left">
                <thead>
                  <tr>
                    <th className={`${thClass} min-w-[360px] pl-5`}>Judul Informasi</th>
                    <th className={`${thClass} w-[150px]`}>Kategori</th>
                    <th className={`${thClass} w-[170px]`}>Tanggal</th>
                    <th className={`${thClass} w-[130px] pr-5 text-right`}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleInformations.map((item) => {
                    const cell = "bg-white group-hover:bg-[#F2F8F2]";
                    const summaryText = summaryOf(item.blocks);

                    return (
                      <tr key={item.id} className="group">
                        {/* TITLE + IMAGE */}

                        <td
                          className={`rounded-l-2xl py-3.5 pl-5 pr-3 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center gap-4">
                            <Thumb src={item.image} className="h-[60px] w-[80px]" iconSize={18} />

                            <div className="min-w-0">
                              <p className="line-clamp-2 max-w-[420px] text-[13px] font-medium leading-[20px] text-[#26352C]">
                                {item.title}
                              </p>

                              {summaryText && (
                                <p className="mt-0.5 line-clamp-1 max-w-[420px] text-[11.5px] leading-[18px] text-[#98A39C]">
                                  {summaryText}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className={`px-3 py-3.5 align-middle transition-colors ${cell}`}>
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#E3F1E4] px-3 py-1.5 text-[11px] font-medium leading-[15px] text-[#2E7D32]">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]" />
                            {item.category}
                          </span>
                        </td>

                        <td className={`px-3 py-3.5 align-middle text-[13px] text-[#46544B] transition-colors ${cell}`}>
                          {formatDate(item.date)}
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

                  {/* EMPTY STATE */}

                  {filteredInformations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F2] text-[#7A857D]">
                            <Search size={20} strokeWidth={1.8} />
                          </div>

                          <p className="text-[14px] font-medium text-[#526057]">
                            {loading
                              ? "Memuat data informasi..."
                              : informations.length === 0
                                ? "Belum ada data informasi"
                                : "Data informasi tidak ditemukan"}
                          </p>

                          <p className="mt-1 text-[12px] text-[#8A948E]">
                            {loading
                              ? "Mohon tunggu sebentar."
                              : informations.length === 0
                                ? "Klik Tambah Informasi untuk menambahkan data pertama."
                                : "Coba gunakan kata kunci atau kategori lain."}
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
                {filteredInformations.length > 0 ? (
                  <>
                    Menampilkan{" "}
                    <span className="font-medium text-[#46544B]">
                      {startIndex + 1}–{startIndex + visibleInformations.length}
                    </span>{" "}
                    dari {filteredInformations.length} data informasi
                    {filteredInformations.length !== informations.length &&
                      ` (total ${informations.length})`}
                  </>
                ) : (
                  <>Tidak ada data yang ditampilkan</>
                )}
              </p>

              {totalPages > 1 && (
                <nav aria-label="Halaman daftar informasi" className="flex items-center gap-1">
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
        <ModalShell onClose={saving ? () => {} : closeModal} maxWidth="max-w-[780px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title={modal === "add" ? "Tambah Informasi" : "Edit Informasi"}
              subtitle={
                modal === "add"
                  ? "Isi form berikut untuk menambahkan informasi."
                  : "Perbarui informasi yang dipilih."
              }
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Judul Informasi" required className="md:col-span-2">
                  <input
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="Masukkan judul informasi"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Kategori" required>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => updateForm("category", e.target.value)}
                      className={`${inputClass} appearance-none pr-9`}
                    >
                      <option value="">Pilih kategori</option>
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

                <FormField label="Tanggal" required>
                  <div className="relative">
                    <CalendarDays
                      size={16}
                      strokeWidth={1.8}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A948E]"
                    />

                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => updateForm("date", e.target.value)}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </FormField>

                <FormField
                  label="Penulis"
                  hint="Opsional, kosong = P3M"
                  className="md:col-span-2"
                >
                  <input
                    value={form.author}
                    onChange={(e) => updateForm("author", e.target.value)}
                    placeholder="P3M"
                    className={inputClass}
                  />
                </FormField>

                {/* IMAGE */}

                <div className="md:col-span-2">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                    <label className="text-[12px] font-medium text-[#536059]">
                      Gambar Informasi
                    </label>

                    <span className="text-[11px] text-[#9AA49F]">
                      Opsional, semua format gambar
                    </span>
                  </div>

                  <div className="rounded-2xl border border-dashed border-[#C9D7CB] bg-[#FAFCFA] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-[#EEF3EF] sm:w-[200px]">
                        {form.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={form.image}
                            alt="Preview gambar informasi"
                            className="block h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center text-[#9AA49F]">
                            <FileImage size={22} strokeWidth={1.5} />
                            <span className="mt-1 text-[11px]">Belum ada gambar</span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#536059]">
                          Tambahkan gambar informasi
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-[#929C96]">
                          Gunakan gambar yang relevan dengan informasi. Semua
                          jenis gambar dan resolusi bisa dipakai. Di halaman
                          publik gambar tampil dengan rasio 16:9, jadi tepi
                          gambar bisa terpotong.
                        </p>

                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <label className={btnSmall}>
                            <Upload size={14} strokeWidth={1.8} />
                            Pilih Gambar
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                          </label>

                          {form.image && (
                            <button type="button" onClick={handleRemoveImage} className={btnSmall}>
                              <Trash2 size={14} strokeWidth={1.8} />
                              Hapus Gambar
                            </button>
                          )}
                        </div>

                        {imageName && (
                          <p className="mt-1.5 max-w-full truncate text-[11px] text-[#7C8881]">
                            {imageName}
                          </p>
                        )}

                        {imageError && (
                          <p role="alert" className="mt-1.5 text-[12px] font-medium text-[#B91C1C]">
                            {imageError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ISI INFORMASI */}

                <FormField
                  label="Isi Informasi"
                  hint="Opsional"
                  className="md:col-span-2"
                >
                  <BlockEditor
                    blocks={form.blocks}
                    onChange={(blocks) => updateForm("blocks", blocks)}
                  />
                </FormField>

                {/* LAMPIRAN */}

                <FormField
                  label="Lampiran"
                  hint="Opsional. File maks. 20 MB"
                  className="md:col-span-2"
                >
                  <AttachmentEditor
                    items={form.attachments}
                    onChange={(items) => updateForm("attachments", items)}
                  />

                  {!attachmentsOk && (
                    <p className="mt-1.5 text-[11.5px] font-medium leading-5 text-[#D34B4B]">
                      Lengkapi nama dan tautan/file setiap lampiran, atau hapus
                      lampiran yang belum lengkap.
                    </p>
                  )}
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
                    ? "Simpan Informasi"
                    : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {modal === "detail" && selectedInformation && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[700px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title="Detail Informasi"
              subtitle="Informasi lengkap data yang dipilih."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <Thumb
                src={selectedInformation.image}
                className="mb-5 aspect-video w-full !rounded-2xl"
                iconSize={32}
              />

              <h3 className="text-[17px] font-semibold leading-[1.45] text-[#26352D] sm:text-[19px]">
                {selectedInformation.title}
              </h3>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DetailItem label="Kategori" value={selectedInformation.category} />
                <DetailItem
                  label="Tanggal"
                  value={formatDate(selectedInformation.date)}
                />
                <DetailItem
                  label="Penulis"
                  value={selectedInformation.author || "P3M"}
                />
              </div>

              <div className="mt-5">
                <p className="text-[12px] font-medium text-[#536059]">Isi Informasi</p>

                <div className="mt-2">
                  <BlockPreview blocks={selectedInformation.blocks} />
                </div>
              </div>

              {selectedInformation.attachments.length > 0 && (
                <div className="mt-5">
                  <p className="text-[12px] font-medium text-[#536059]">Lampiran</p>

                  <ul className="mt-2 space-y-2">
                    {selectedInformation.attachments.map((item) => {
                      const href = item.mode === "file" ? item.href : item.url;

                      return (
                        <li key={item.id}>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2.5 rounded-xl bg-[#F6F9F6] px-4 py-3 text-[13px] font-medium leading-5 text-[#2E7D32] transition hover:bg-[#EEF5EE]"
                          >
                            <Download size={15} strokeWidth={1.8} className="mt-0.5 shrink-0" />
                            <span className="break-words">{item.label}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      {modal === "delete" && selectedInformation && (
        <ConfirmDelete
          title="Hapus Informasi?"
          onCancel={closeModal}
          onConfirm={handleDelete}
          loading={saving}
          error={saveError}
        >
          Data informasi{" "}
          <span className="font-medium text-[#475569]">{selectedInformation.title}</span>{" "}
          akan dihapus secara permanen dan tidak dapat dipulihkan.
        </ConfirmDelete>
      )}
    </div>
  );
}

/* =========================================================
   GAMBAR KECIL dengan cadangan kalau belum ada gambar
========================================================= */

function Thumb({
  src,
  className = "",
  iconSize,
}: {
  src: string;
  className?: string;
  iconSize: number;
}) {
  return (
    <div className={`shrink-0 overflow-hidden rounded-xl bg-[#EEF3EF] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[#9AA59E]">
          <FileImage size={iconSize} strokeWidth={1.6} />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   EDITOR ISI INFORMASI
   Tiga jenis blok, sama dengan yang ditampilkan halaman publik:
   paragraf, daftar poin, dan tabel dua kolom (mis. jadwal).
========================================================= */

const blockMeta = {
  p: { label: "Paragraf", icon: AlignLeft },
  list: { label: "Daftar Poin", icon: ListIcon },
  table: { label: "Tabel", icon: TableIcon },
} as const;

function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const update = (id: string, patch: Partial<Block>) =>
    onChange(
      blocks.map((block) =>
        block.id === id ? ({ ...block, ...patch } as Block) : block
      )
    );

  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;

    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = (type: Block["type"]) => {
    const id = newId("b");

    const block: Block =
      type === "p"
        ? { id, type: "p", text: "" }
        : type === "list"
          ? { id, type: "list", items: "" }
          : {
              id,
              type: "table",
              head: ["Tahapan", "Tanggal"],
              rows: [["", ""]],
            };

    onChange([...blocks, block]);
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-[#C9D7CB] bg-[#FAFCFA] px-4 py-5 text-center text-[12px] leading-5 text-[#929C96]">
          Belum ada isi. Tambahkan paragraf, daftar poin, atau tabel di bawah.
          Kalau dikosongkan, halaman publik menampilkan &quot;sedang
          disiapkan&quot;.
        </p>
      )}

      {blocks.map((block, index) => {
        const Icon = blockMeta[block.type].icon;

        return (
          <div
            key={block.id}
            className="rounded-2xl border border-[#DCE4DE] bg-[#FAFCFA] p-3"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#2E7D32]">
                <Icon size={14} strokeWidth={1.8} />
                {blockMeta[block.type].label}
              </span>

              <div className="flex items-center gap-0.5">
                <IconButton label="Naikkan" onClick={() => move(index, -1)}>
                  <ArrowUp size={15} strokeWidth={1.8} />
                </IconButton>
                <IconButton label="Turunkan" onClick={() => move(index, 1)}>
                  <ArrowDown size={15} strokeWidth={1.8} />
                </IconButton>
                <IconButton label="Hapus blok" danger onClick={() => remove(block.id)}>
                  <Trash2 size={15} strokeWidth={1.8} />
                </IconButton>
              </div>
            </div>

            {block.type === "p" && (
              <textarea
                value={block.text}
                onChange={(e) => update(block.id, { text: e.target.value })}
                rows={4}
                placeholder="Tulis paragraf informasi..."
                className={textareaClass}
              />
            )}

            {block.type === "list" && (
              <>
                <textarea
                  value={block.items}
                  onChange={(e) => update(block.id, { items: e.target.value })}
                  rows={4}
                  placeholder={"Satu poin per baris\nPoin kedua\nPoin ketiga"}
                  className={textareaClass}
                />
                <p className="mt-1 text-[11px] text-[#9AA49F]">
                  Tulis satu poin per baris.
                </p>
              </>
            )}

            {block.type === "table" && (
              <TableBlockEditor
                block={block}
                onChange={(patch) => update(block.id, patch)}
              />
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => add("p")} className={btnSmall}>
          <Plus size={14} strokeWidth={1.8} />
          Paragraf
        </button>
        <button type="button" onClick={() => add("list")} className={btnSmall}>
          <Plus size={14} strokeWidth={1.8} />
          Daftar Poin
        </button>
        <button type="button" onClick={() => add("table")} className={btnSmall}>
          <Plus size={14} strokeWidth={1.8} />
          Tabel
        </button>
      </div>
    </div>
  );
}

function TableBlockEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "table" }>;
  onChange: (patch: Partial<Extract<Block, { type: "table" }>>) => void;
}) {
  const setHead = (col: 0 | 1, value: string) => {
    const head: [string, string] = [...block.head];
    head[col] = value;
    onChange({ head });
  };

  const setCell = (row: number, col: 0 | 1, value: string) => {
    const rows = block.rows.map((r) => [...r] as [string, string]);
    rows[row][col] = value;
    onChange({ rows });
  };

  const addRow = () => onChange({ rows: [...block.rows, ["", ""]] });

  const removeRow = (row: number) =>
    onChange({ rows: block.rows.filter((_, i) => i !== row) });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_32px] gap-2">
        <input
          value={block.head[0]}
          onChange={(e) => setHead(0, e.target.value)}
          placeholder="Judul kolom 1"
          className={`${inputClass} font-medium`}
        />
        <input
          value={block.head[1]}
          onChange={(e) => setHead(1, e.target.value)}
          placeholder="Judul kolom 2"
          className={`${inputClass} font-medium`}
        />
        <span />
      </div>

      {block.rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_32px] items-center gap-2">
          <input
            value={row[0]}
            onChange={(e) => setCell(index, 0, e.target.value)}
            placeholder="Contoh: Pengumuman Program Hibah"
            className={inputClass}
          />
          <input
            value={row[1]}
            onChange={(e) => setCell(index, 1, e.target.value)}
            placeholder="Contoh: 29 April 2026"
            className={inputClass}
          />
          <IconButton label="Hapus baris" danger onClick={() => removeRow(index)}>
            <X size={15} strokeWidth={1.8} />
          </IconButton>
        </div>
      ))}

      <button type="button" onClick={addRow} className={btnSmall}>
        <Plus size={14} strokeWidth={1.8} />
        Tambah Baris
      </button>
    </div>
  );
}

/* Pratinjau isi informasi di modal detail */
function BlockPreview({ blocks }: { blocks: Block[] }) {
  const apiBlocks = blocksToApi(blocks);

  if (apiBlocks.length === 0) {
    return (
      <p className="text-[13px] leading-7 text-[#6E7A73]">
        Belum ada isi informasi.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {apiBlocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul key={index} className="space-y-1.5">
              {block.items.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-6 text-[#6E7A73]">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]" />
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "table") {
          return (
            <div key={index} className="overflow-x-auto rounded-xl border border-[#E3EAE4]">
              <table className="w-full min-w-[360px] text-left text-[12.5px]">
                <thead className="bg-[#F1F8F2] text-[#2E7D32]">
                  <tr>
                    <th className="px-3.5 py-2.5 font-medium">{block.head[0]}</th>
                    <th className="px-3.5 py-2.5 font-medium">{block.head[1]}</th>
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, i) => (
                    <tr key={i} className="border-t border-[#EEF2EF]">
                      <td className="px-3.5 py-2.5 font-medium text-[#3B4A41]">{row[0]}</td>
                      <td className="px-3.5 py-2.5 text-[#6E7A73]">{row[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={index} className="whitespace-pre-line text-[13px] leading-7 text-[#6E7A73]">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

/* =========================================================
   EDITOR LAMPIRAN (file atau tautan)
========================================================= */

function AttachmentEditor({
  items,
  onChange,
}: {
  items: Attachment[];
  onChange: (items: Attachment[]) => void;
}) {
  const update = (id: string, patch: Partial<Attachment>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const add = () =>
    onChange([
      ...items,
      {
        id: newId("a"),
        label: "",
        mode: "link",
        url: "",
        path: "",
        href: "",
        file: null,
      },
    ]);

  const pickFile = (id: string, event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    // reset supaya file yang sama bisa dipilih ulang
    input.value = "";

    if (file) update(id, { file });
  };

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const currentFile =
          item.file?.name ?? (item.path ? fileLabel(item.href || item.path) : "");

        return (
          <div
            key={item.id}
            className="rounded-2xl border border-[#DCE4DE] bg-[#FAFCFA] p-3"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={item.label}
                onChange={(e) => update(item.id, { label: e.target.value })}
                placeholder="Nama lampiran, contoh: Buku Panduan 2026"
                className={inputClass}
              />

              <div className="flex items-center gap-2">
                <div className="inline-flex h-10 rounded-full border border-[#DCE4DE] bg-white p-1 text-[12px] font-medium">
                  {(["link", "file"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => update(item.id, { mode })}
                      className={`rounded-full px-3.5 transition ${
                        item.mode === mode
                          ? "bg-[#2E7D32] text-white"
                          : "text-[#5B675F] hover:bg-[#F1F8F2]"
                      }`}
                    >
                      {mode === "link" ? "Tautan" : "File"}
                    </button>
                  ))}
                </div>

                <IconButton
                  label="Hapus lampiran"
                  danger
                  onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                >
                  <Trash2 size={16} strokeWidth={1.8} />
                </IconButton>
              </div>
            </div>

            <div className="mt-2">
              {item.mode === "link" ? (
                <input
                  value={item.url}
                  onChange={(e) => update(item.id, { url: e.target.value })}
                  placeholder="https://..."
                  className={inputClass}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <label className={btnSmall}>
                    <Paperclip size={14} strokeWidth={1.8} />
                    {currentFile ? "Ganti File" : "Pilih File"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png"
                      onChange={(e) => pickFile(item.id, e)}
                      className="hidden"
                    />
                  </label>

                  <span className="min-w-0 max-w-full truncate text-[12px] text-[#7C8881]">
                    {currentFile || "Belum ada file dipilih"}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" onClick={add} className={btnSmall}>
        <Plus size={14} strokeWidth={1.8} />
        Tambah Lampiran
      </button>
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
    <div className="min-w-[110px] sm:min-w-0" style={{ flexGrow: grow, flexBasis: 0 }}>
      <p className="mb-1.5 pl-1 text-[12px] text-[#7A867F]">{label}</p>

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

        <h3 className="mt-5 text-[17px] font-semibold text-[#33423A]">{title}</h3>

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