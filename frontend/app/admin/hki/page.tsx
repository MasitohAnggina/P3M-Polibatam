"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";

import {
  ChevronDown,
  Copyright,
  Eye,
  ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
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
   API + TOKEN (sama dengan halaman admin Penelitian)
   Halaman login menyimpan token di key "p3m_token":
   localStorage kalau "Ingat saya" dicentang, kalau tidak sessionStorage.
========================================================= */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

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

/* =========================================================
   TYPE
========================================================= */

type Hki = {
  id: number;
  jenis: string;
  kategori: string | null;
  judul: string;
  inventor: string[];
  nomor_permohonan: string;
  tahun: number | string;
  gambar: string | null;
};

type ModalType = "add" | "edit" | "view" | "delete" | null;

type FormState = {
  jenis: string;
  kategori: string;
  judul: string;
  inventor: string; // satu nama per baris
  nomorPermohonan: string;
  tahun: string;
  gambarFile: File | null;
  gambarUrl: string | null; // pratinjau (foto lama atau foto baru)
  hapusGambar: boolean;
};

/* =========================================================
   OPSI (sama dengan halaman publik)
========================================================= */

const hkiTypes = [
  "Semua Jenis",
  "Hak Cipta",
  "Paten",
  "Paten Sederhana",
  "Desain Industri",
];

const hkiCategories = [
  "Karya Tulis/Buku",
  "Karya Lainnya/Program Komputer",
  "Karya Audio Visual/Karya Rekaman Video",
  "Lainnya",
];

const makeEmptyForm = (): FormState => ({
  jenis: "",
  kategori: "",
  judul: "",
  inventor: "",
  nomorPermohonan: "",
  tahun: String(new Date().getFullYear()),
  gambarFile: null,
  gambarUrl: null,
  hapusGambar: false,
});

/* "A\nB; C" -> ["A", "B", "C"] */
const splitInventor = (value: string) =>
  value
    .split(/[\n;]/)
    .map((name) => name.trim())
    .filter(Boolean);

/* =========================================================
   STYLE
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
  "inline-flex h-10 items-center justify-center rounded-full bg-[#DC2626] px-5 text-[13px] font-medium text-white transition hover:bg-[#B91C1C]";

/* =========================================================
   HALAMAN
========================================================= */

export default function AdminHkiPage() {
  const [items, setItems] = useState<Hki[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Semua Jenis");
  const [yearFilter, setYearFilter] = useState("Semua Tahun");

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<Hki | null>(null);
  const [form, setForm] = useState<FormState>(makeEmptyForm);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ---------- LOAD DATA ---------- */

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/hki`, {
        headers: authHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        setPageError(await readError(res));
        return;
      }

      const json = await res.json();
      setItems((json.data ?? []) as Hki[]);
      setPageError(null);
    } catch {
      setPageError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  /* ---------- PILIHAN TAHUN (otomatis dari data) ---------- */

  const years = useMemo(
    () => [
      "Semua Tahun",
      ...Array.from(new Set(items.map((i) => String(i.tahun)))).sort(
        (a, b) => Number(b) - Number(a)
      ),
    ],
    [items]
  );

  /* ---------- FILTER ---------- */

  const filteredItems = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return items.filter((item) => {
      const matchSearch =
        !keyword ||
        item.judul.toLowerCase().includes(keyword) ||
        item.inventor.join(" ").toLowerCase().includes(keyword) ||
        item.nomor_permohonan.toLowerCase().includes(keyword) ||
        (item.kategori ?? "").toLowerCase().includes(keyword);

      const matchType = typeFilter === "Semua Jenis" || item.jenis === typeFilter;
      const matchYear =
        yearFilter === "Semua Tahun" || String(item.tahun) === yearFilter;

      return matchSearch && matchType && matchYear;
    });
  }, [items, search, typeFilter, yearFilter]);

  /* ---------- RINGKASAN ---------- */

  const summary = useMemo(
    () => ({
      total: items.length,
      hakCipta: items.filter((i) => i.jenis === "Hak Cipta").length,
      paten: items.filter(
        (i) => i.jenis === "Paten" || i.jenis === "Paten Sederhana"
      ).length,
      desain: items.filter((i) => i.jenis === "Desain Industri").length,
    }),
    [items]
  );

  /* ---------- MODAL ---------- */

  const closeModal = useCallback(() => {
    setModal(null);
    setSelectedItem(null);
    setFormError(null);
  }, []);

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    if (!modal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, closeModal]);

  // Bersihkan URL pratinjau foto baru saat diganti / ditutup
  useEffect(() => {
    const url = form.gambarFile ? form.gambarUrl : null;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [form.gambarFile, form.gambarUrl]);

  const openAddModal = () => {
    setSelectedItem(null);
    setForm(makeEmptyForm());
    setFormError(null);
    setModal("add");
  };

  const openEditModal = (item: Hki) => {
    setSelectedItem(item);
    setForm({
      jenis: item.jenis,
      kategori: item.kategori ?? "",
      judul: item.judul,
      inventor: item.inventor.join("\n"),
      nomorPermohonan: item.nomor_permohonan,
      tahun: String(item.tahun),
      gambarFile: null,
      gambarUrl: item.gambar,
      hapusGambar: false,
    });
    setFormError(null);
    setModal("edit");
  };

  const openViewModal = (item: Hki) => {
    setSelectedItem(item);
    setModal("view");
  };

  const openDeleteModal = (item: Hki) => {
    setSelectedItem(item);
    setModal("delete");
  };

  /* ---------- FOTO ---------- */

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setForm((prev) => ({
      ...prev,
      gambarFile: file,
      gambarUrl: URL.createObjectURL(file),
      hapusGambar: false,
    }));
  };

  const removeImage = () => {
    setForm((prev) => ({
      ...prev,
      gambarFile: null,
      gambarUrl: null,
      hapusGambar: true,
    }));
  };

  /* ---------- SIMPAN ---------- */

  const canSave =
    form.jenis !== "" &&
    form.judul.trim() !== "" &&
    splitInventor(form.inventor).length > 0 &&
    form.nomorPermohonan.trim() !== "" &&
    /^\d{4}$/.test(form.tahun.trim());

  const handleSave = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setFormError(null);

    const body = new FormData();
    body.append("jenis", form.jenis);
    body.append("kategori", form.kategori);
    body.append("judul", form.judul.trim());
    body.append("nomor_permohonan", form.nomorPermohonan.trim());
    body.append("tahun", form.tahun.trim());
    splitInventor(form.inventor).forEach((name) =>
      body.append("inventor[]", name)
    );

    if (form.gambarFile) body.append("gambar", form.gambarFile);
    if (form.hapusGambar) body.append("hapus_gambar", "1");

    const isEdit = modal === "edit" && selectedItem !== null;

    // multipart + PUT tidak terbaca PHP, jadi pakai POST + _method
    if (isEdit) body.append("_method", "PUT");

    try {
      const res = await fetch(
        `${API}/admin/hki${isEdit ? `/${selectedItem!.id}` : ""}`,
        { method: "POST", headers: authHeaders(), body }
      );
      if (!res.ok) {
        setFormError(await readError(res));
        return;
      }

      await loadItems();
      closeModal();
    } catch {
      setFormError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- HAPUS ---------- */

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      const res = await fetch(`${API}/admin/hki/${selectedItem.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) {
        setPageError(await readError(res));
      } else {
        await loadItems();
      }
    } catch {
      setPageError("Tidak dapat terhubung ke server.");
    }

    closeModal();
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className={`${poppins.className} min-h-[calc(100vh-78px)] overflow-x-hidden bg-[linear-gradient(135deg,#F3F7F3_0%,#EDF5EE_50%,#E2F0E4_100%)] px-3 py-4 text-[#26352D] sm:px-5 sm:py-6 md:px-8 md:py-8`}
    >
      <div className="mx-auto w-full max-w-[1320px]">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_10px_rgba(38,53,45,0.06)]">
                <Copyright size={18} strokeWidth={1.8} className="text-[#2E7D32]" />
              </div>

              <h1 className="text-[26px] font-medium tracking-[-0.02em] sm:text-[32px]">
                Data HKI
              </h1>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#7A867F] sm:ml-[52px]">
              Kelola data hak kekayaan intelektual Politeknik Negeri Batam.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            <Plus size={16} strokeWidth={2} />
            Tambah Data HKI
          </button>
        </div>

        {/* ERROR HALAMAN */}
        {pageError && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-[#F5C6C6] bg-[#FFF1F1] px-4 py-3 text-[13px] text-[#B42323]">
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => setPageError(null)}
              aria-label="Tutup"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* RINGKASAN */}
        <div className="mb-6 flex flex-wrap gap-2 sm:flex-nowrap">
          <SummaryPill
            label="Total"
            value={summary.total}
            grow={Math.max(summary.total, 1)}
            className="bg-[#2E7D32] text-white"
          />
          <SummaryPill
            label="Hak Cipta"
            value={summary.hakCipta}
            grow={Math.max(summary.hakCipta, 1)}
            className="bg-[#A5D6A7] text-[#1B5E20]"
          />
          <SummaryPill
            label="Paten"
            value={summary.paten}
            grow={Math.max(summary.paten, 1)}
            className="bg-[#DDEBDD] text-[#1F5A23]"
          />
          <SummaryPill
            label="Desain Industri"
            value={summary.desain}
            grow={Math.max(summary.desain, 1)}
            className="border border-[#2E7D32]/30 bg-transparent text-[#2E5B32]"
          />
        </div>

        {/* KARTU UTAMA */}
        <div className="w-full rounded-[28px] bg-white/70 p-3 shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur sm:p-4 md:p-5">
          {/* FILTER */}
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
                placeholder="Cari judul, inventor, atau nomor permohonan..."
                className="h-11 w-full rounded-full border border-transparent bg-white pl-11 pr-4 text-[13px] text-[#3D4942] shadow-[0_1px_4px_rgba(38,53,45,0.05)] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10"
              />
            </div>

            <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:w-[460px]">
              <FilterSelect value={yearFilter} onChange={setYearFilter} options={years} />
              <FilterSelect value={typeFilter} onChange={setTypeFilter} options={hkiTypes} />
            </div>
          </div>

          {/* TABEL */}
          <div className="w-full overflow-hidden rounded-[22px] bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-y-1 px-2 text-left">
                <thead>
                  <tr>
                    <th className="border-b border-dashed border-[#DCE4DE] py-4 pl-5 pr-3 text-[12px] font-medium text-[#7A867F]">
                      Judul HKI
                    </th>
                    <th className="w-[250px] border-b border-dashed border-[#DCE4DE] px-3 py-4 text-center text-[12px] font-medium text-[#7A867F]">
                      Inventor / Pencipta
                    </th>
                    <th className="w-[200px] border-b border-dashed border-[#DCE4DE] px-3 py-4 text-center text-[12px] font-medium text-[#7A867F]">
                      Kategori
                    </th>
                    <th className="w-[170px] border-b border-dashed border-[#DCE4DE] px-3 py-4 text-center text-[12px] font-medium text-[#7A867F]">
                      Jenis HKI
                    </th>
                    <th className="w-[80px] border-b border-dashed border-[#DCE4DE] px-3 py-4 text-center text-[12px] font-medium text-[#7A867F]">
                      Tahun
                    </th>
                    <th className="w-[130px] border-b border-dashed border-[#DCE4DE] px-3 py-4 text-center text-[12px] font-medium text-[#7A867F]">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => {
                    const cell = "bg-white group-hover:bg-[#F2F8F2]";

                    return (
                      <tr key={item.id} className="group">
                        <td
                          className={`rounded-l-2xl py-3.5 pl-5 pr-3 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EEF3EF] text-[#2E7D32]">
                              {item.gambar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.gambar}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Copyright size={20} strokeWidth={1.6} />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="line-clamp-2 max-w-[400px] text-[13px] font-medium leading-[20px] text-[#26352C]">
                                {item.judul}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#8A948E]">
                                {item.nomor_permohonan}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td
                          className={`px-3 py-3.5 text-center align-middle text-[13px] leading-5 text-[#34423A] transition-colors ${cell}`}
                        >
                          <p className="mx-auto line-clamp-2 max-w-[230px]">
                            {item.inventor.join(", ")}
                          </p>
                        </td>

                        <td
                          className={`px-3 py-3.5 text-center align-middle text-[13px] text-[#5D6861] transition-colors ${cell}`}
                        >
                          {item.kategori || <span className="text-[#A0AAA4]">—</span>}
                        </td>

                        <td className={`px-3 py-3.5 text-center align-middle transition-colors ${cell}`}>
                          <span className="inline-flex max-w-[170px] items-center gap-1.5 rounded-full bg-[#E3F1E4] px-3 py-1.5 text-[11px] font-medium leading-[15px] text-[#2E7D32]">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]" />
                            {item.jenis}
                          </span>
                        </td>

                        <td
                          className={`px-3 py-3.5 text-center align-middle text-[13px] text-[#46544B] transition-colors ${cell}`}
                        >
                          {item.tahun}
                        </td>

                        <td
                          className={`rounded-r-2xl px-3 py-3.5 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <IconButton label="Lihat" onClick={() => openViewModal(item)}>
                              <Eye size={16} strokeWidth={1.8} />
                            </IconButton>

                            <IconButton label="Edit" onClick={() => openEditModal(item)}>
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

                  {/* LOADING / KOSONG */}
                  {(loading || filteredItems.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        {loading ? (
                          <p className="text-[13px] text-[#8A948E]">
                            Memuat data HKI...
                          </p>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F2] text-[#7A857D]">
                              <Search size={20} strokeWidth={1.8} />
                            </div>

                            <p className="text-[14px] font-medium text-[#526057]">
                              {items.length === 0
                                ? "Belum ada data HKI"
                                : "Data HKI tidak ditemukan"}
                            </p>

                            <p className="mt-1 text-[12px] text-[#8A948E]">
                              {items.length === 0
                                ? "Klik “Tambah Data HKI” untuk menambahkan data pertama."
                                : "Coba ubah kata kunci atau filter pencarian."}
                            </p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div className="flex flex-col gap-2 border-t border-[#EEF2EF] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[#7A857D]">
                Menampilkan{" "}
                <span className="font-medium text-[#46544B]">
                  {filteredItems.length}
                </span>{" "}
                dari {items.length} data HKI
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          MODAL TAMBAH / EDIT
      ===================================================== */}

      {(modal === "add" || modal === "edit") && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[720px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title={modal === "add" ? "Tambah Data HKI" : "Edit Data HKI"}
              subtitle="Data ini akan tampil di halaman HKI publik."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Jenis HKI" required>
                  <SelectField
                    value={form.jenis}
                    onChange={(value) => setForm({ ...form, jenis: value })}
                    placeholder="Pilih jenis HKI"
                    options={hkiTypes.filter((t) => t !== "Semua Jenis")}
                  />
                </FormField>

                <FormField label="Kategori (opsional)">
                  <SelectField
                    value={form.kategori}
                    onChange={(value) => setForm({ ...form, kategori: value })}
                    placeholder="Tanpa kategori"
                    options={hkiCategories}
                  />
                </FormField>

                <FormField label="Judul HKI" required className="md:col-span-2">
                  <input
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    placeholder="Masukkan judul HKI"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Nomor Permohonan" required>
                  <input
                    value={form.nomorPermohonan}
                    onChange={(e) =>
                      setForm({ ...form, nomorPermohonan: e.target.value })
                    }
                    placeholder="Contoh: EC002025063021"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Tahun" required>
                  <input
                    value={form.tahun}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tahun: e.target.value.replace(/\D/g, "").slice(0, 4),
                      })
                    }
                    inputMode="numeric"
                    placeholder="Contoh: 2025"
                    className={inputClass}
                  />
                </FormField>

                <FormField
                  label="Inventor / Pencipta (satu nama per baris)"
                  required
                  className="md:col-span-2"
                >
                  <textarea
                    value={form.inventor}
                    onChange={(e) => setForm({ ...form, inventor: e.target.value })}
                    rows={5}
                    placeholder={"Nama inventor utama\nNama anggota 1\nNama anggota 2"}
                    className={textareaClass}
                  />
                  <p className="mt-1 text-[11px] text-[#9AA49F]">
                    Baris pertama dianggap inventor utama.
                  </p>
                </FormField>

                {/* FOTO */}
                <div className="md:col-span-2">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                    <label className="text-[12px] font-medium text-[#536059]">
                      Foto HKI (opsional)
                    </label>

                    <span className="text-[11px] text-[#9AA49F]">
                      16:9, JPG / PNG, maks. 5 MB
                    </span>
                  </div>

                  <div className="rounded-2xl border border-dashed border-[#C9D7CB] bg-[#FAFCFA] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex aspect-[16/9] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EEF3EF] text-[#9AA49F] sm:w-[160px]">
                        {form.gambarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={form.gambarUrl}
                            alt="Pratinjau foto HKI"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center">
                            <ImageIcon size={22} strokeWidth={1.5} />
                            <span className="mt-1 text-[11px]">Belum ada foto</span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#536059]">
                          Foto untuk halaman detail
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-[#929C96]">
                          Jika kosong, halaman detail publik tampil tanpa foto.
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[#C8D6CA] bg-white px-4 text-[12px] font-medium text-[#2E7D32] transition hover:bg-[#F1F8F2]">
                            <Upload size={14} strokeWidth={1.8} />
                            {form.gambarUrl ? "Ganti Foto" : "Pilih Foto"}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                          </label>

                          {form.gambarUrl && (
                            <button
                              type="button"
                              onClick={removeImage}
                              className="inline-flex h-9 items-center rounded-full px-3 text-[12px] font-medium text-[#D34B4B] transition hover:bg-[#FFF1F1]"
                            >
                              Hapus Foto
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-[#EEF2EF] px-5 py-4 sm:px-6">
              {formError && (
                <p className="mb-3 rounded-xl bg-[#FFF1F1] px-3.5 py-2 text-[12px] text-[#B42323]">
                  {formError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
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
                      ? "Simpan Data HKI"
                      : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          MODAL LIHAT
      ===================================================== */}

      {modal === "view" && selectedItem && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[660px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title="Detail HKI"
              subtitle="Informasi lengkap data kekayaan intelektual."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {selectedItem.gambar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedItem.gambar}
                  alt={selectedItem.judul}
                  className="mb-4 aspect-[16/9] w-full rounded-2xl object-cover"
                />
              )}

              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3F1E4] px-3 py-1.5 text-[11px] font-medium leading-[15px] text-[#2E7D32]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]" />
                {selectedItem.jenis}
              </span>

              <h3 className="mt-3 text-[17px] font-semibold leading-[1.45] text-[#26352D] sm:text-[19px]">
                {selectedItem.judul}
              </h3>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Kategori" value={selectedItem.kategori || "—"} />
                <DetailItem label="Tahun" value={String(selectedItem.tahun)} />
                <DetailItem
                  label="Nomor Permohonan"
                  value={selectedItem.nomor_permohonan}
                  full
                />
                <DetailItem
                  label={`Inventor / Pencipta (${selectedItem.inventor.length})`}
                  value={selectedItem.inventor.join(", ")}
                  full
                />
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          MODAL HAPUS
      ===================================================== */}

      {modal === "delete" && selectedItem && (
        <ConfirmDelete
          title="Hapus Data HKI?"
          onCancel={closeModal}
          onConfirm={handleDelete}
        >
          Data HKI{" "}
          <span className="font-medium text-[#475569]">{selectedItem.judul}</span>{" "}
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
   SELECT FIELD (di dalam form)
========================================================= */

function SelectField({
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
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidth: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#1A251F]/35 p-3 backdrop-blur-[2px] sm:p-4"
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
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell onClose={onCancel} maxWidth="max-w-[420px]">
      <div className="px-6 py-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F1]">
          <Trash2 size={21} strokeWidth={2} className="text-[#DC2626]" />
        </div>

        <h3 className="mt-5 text-[17px] font-semibold text-[#33423A]">{title}</h3>

        <p className="mx-auto mt-2 max-w-[340px] break-words text-[13px] leading-[22px] text-[#718096]">
          {children}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-[#EEF2EF] px-6 py-4 sm:flex-row sm:justify-center">
        <button type="button" onClick={onCancel} className={`${btnGhost} w-full sm:w-auto`}>
          Batal
        </button>

        <button type="button" onClick={onConfirm} className={`${btnDanger} w-full sm:w-auto`}>
          Hapus
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
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[12px] font-medium text-[#536059]">
        {label}
        {required && <span className="ml-0.5 text-[#D84A4A]">*</span>}
      </label>

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