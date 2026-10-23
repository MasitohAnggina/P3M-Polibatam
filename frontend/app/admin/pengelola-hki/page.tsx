"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";

import {
  Eye,
  FileImage,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

/* =========================================================
   ADMIN: TIM PENGELOLA HKI
   Letakkan di src/app/admin/tim-hki/page.tsx

   Mengelola data yang tampil di bagian "Tim Pengelola Sentra HKI"
   pada halaman publik Pendaftaran HKI: jabatan / tugas, nama,
   foto, dan urutan tampil.

   KONTRAK API (Laravel, Sanctum):
   GET    /api/admin/tim-hki        -> { data: ApiTim[] }
   POST   /api/admin/tim-hki        -> { data: ApiTim }  (multipart)
   POST   /api/admin/tim-hki/{id}   -> { data: ApiTim }  (multipart + _method=PUT)
   DELETE /api/admin/tim-hki/{id}   -> { message }
   Publik: GET /api/tim-hki         -> { data: ApiTim[] }

   Field multipart saat simpan:
   jabatan, nama, urutan, foto (opsional, gambar apa saja),
   hapus_foto (1 = hapus foto lama).
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
const ENDPOINT = `${API_URL}/admin/tim-hki`;

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

/* Jaga-jaga kalau API mengirim path relatif, bukan URL lengkap */
function fileUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return `${BASE_URL}/storage/${path.replace(/^\/?(storage\/)?/, "")}`;
}

type FieldErrors = Partial<Record<keyof FormValues | "photo", string>>;

type Failure = { message: string; fields: FieldErrors };

/* nama field API -> nama field form */
const FIELD_MAP: Record<string, keyof FormValues | "photo"> = {
  jabatan: "role",
  nama: "name",
  urutan: "order",
  foto: "photo",
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

type Member = {
  id: number;
  role: string; // jabatan / tugas
  name: string;
  order: number;
  image: string; // URL foto ("" kalau belum ada, blob: kalau baru dipilih)
};

/* Nilai di form. Urutan disimpan sebagai teks supaya input bisa dikosongkan */
type FormValues = {
  role: string;
  name: string;
  order: string;
};

/* Bentuk data dari API Laravel */
type ApiTim = {
  id: number;
  jabatan: string;
  nama: string;
  urutan: number;
  foto: string | null;
};

function fromApi(item: ApiTim): Member {
  return {
    id: item.id,
    role: item.jabatan,
    name: item.nama,
    order: item.urutan,
    image: fileUrl(item.foto),
  };
}

type ModalType = "add" | "edit" | "detail" | "delete" | null;

const emptyForm: FormValues = { role: "", name: "", order: "1" };

/* =========================================================
   HELPER
========================================================= */

const isBlob = (url: string) => url.startsWith("blob:");

const revokeIfBlob = (url: string) => {
  if (isBlob(url)) URL.revokeObjectURL(url);
};

function byOrder(a: Member, b: Member) {
  return a.order - b.order || a.id - b.id;
}

const isValidOrder = (value: string) => /^\d+$/.test(value) && Number(value) >= 1;

function buildBody(
  form: FormValues,
  photo: { file: File | null; remove: boolean },
  isEdit: boolean
): FormData {
  const body = new FormData();

  body.append("jabatan", form.role.trim());
  body.append("nama", form.name.trim());
  body.append("urutan", form.order);

  if (photo.file) body.append("foto", photo.file);
  if (photo.remove && !photo.file) body.append("hapus_foto", "1");

  // Laravel tidak membaca multipart lewat PUT, jadi pakai POST + _method
  if (isEdit) body.append("_method", "PUT");

  return body;
}

/* =========================================================
   SHARED STYLES
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-[#DCE4DE] bg-white px-3.5 text-[13px] text-[#2B3830] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10";

const inputErrorClass =
  "!border-[#D84A4A] focus:!border-[#D84A4A] focus:!ring-[#D84A4A]/10";

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

export default function AdminTimHkiPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [form, setForm] = useState<FormValues>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);

  /* foto (opsional, semua format, ukuran, dan resolusi) */
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  /* =========================================================
     AMBIL DATA DARI API
  ========================================================= */

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const res = await fetch(ENDPOINT, {
        headers: authHeaders(),
        cache: "no-store",
      });

      if (!res.ok) throw new RequestError(await readFailure(res));

      const json = await res.json();

      setMembers(((json.data ?? []) as ApiTim[]).map(fromApi));
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
    loadMembers();
  }, [loadMembers]);

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredMembers = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return members
      .filter(
        (item) =>
          !keyword ||
          item.name.toLowerCase().includes(keyword) ||
          item.role.toLowerCase().includes(keyword)
      )
      .sort(byOrder);
  }, [members, search]);

  /* =========================================================
     MODAL
  ========================================================= */

  const resetErrors = () => {
    setSaveError("");
    setFieldErrors({});
    setPhotoError("");
  };

  const resetPhoto = (preview = "") => {
    setPhotoPreview(preview);
    setPhotoFile(null);
    setPhotoName("");
    setRemovePhoto(false);
  };

  const closeModal = () => {
    revokeIfBlob(photoPreview);
    setModal(null);
    setSelectedMember(null);
    setEditId(null);
    setForm(emptyForm);
    resetPhoto();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, saving, photoPreview]);

  const openAddModal = () => {
    const nextOrder = members.reduce((max, m) => Math.max(max, m.order), 0) + 1;

    setSelectedMember(null);
    setEditId(null);
    setForm({ ...emptyForm, order: String(nextOrder) });
    resetPhoto();
    resetErrors();
    setModal("add");
  };

  const openEditModal = (item: Member) => {
    setSelectedMember(item);
    setEditId(item.id);
    setForm({ role: item.role, name: item.name, order: String(item.order) });
    resetPhoto(item.image);
    resetErrors();
    setModal("edit");
  };

  const openDetailModal = (item: Member) => {
    setSelectedMember(item);
    setModal("detail");
  };

  const openDeleteModal = (item: Member) => {
    setSelectedMember(item);
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

  /* =========================================================
     FOTO (semua format, ukuran, dan resolusi diterima)
  ========================================================= */

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    // reset supaya file yang sama bisa dipilih ulang
    input.value = "";

    if (!file) return;

    // format, ukuran, dan resolusi bebas; hanya pastikan file adalah gambar
    if (!file.type.startsWith("image/")) {
      setPhotoError("File yang dipilih bukan gambar.");
      return;
    }

    setPhotoError("");
    setFieldErrors((current) => ({ ...current, photo: undefined }));

    revokeIfBlob(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoFile(file);
    setPhotoName(file.name);
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    revokeIfBlob(photoPreview);
    setPhotoPreview("");
    setPhotoFile(null);
    setPhotoName("");
    setRemovePhoto(true);
    setPhotoError("");
    setFieldErrors((current) => ({ ...current, photo: undefined }));
  };

  /* =========================================================
     SAVE (POST ke API)
  ========================================================= */

  const canSave =
    form.role.trim() !== "" &&
    form.name.trim() !== "" &&
    isValidOrder(form.order);

  const handleSave = async () => {
    if (!canSave || saving) return;

    const isEdit = modal === "edit";
    const body = buildBody(
      form,
      { file: photoFile, remove: removePhoto },
      isEdit
    );
    const url = isEdit ? `${ENDPOINT}/${editId}` : ENDPOINT;

    setSaving(true);
    resetErrors();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(), // jangan set Content-Type, browser mengaturnya untuk FormData
        body,
      });

      if (!res.ok) throw new RequestError(await readFailure(res));

      const saved = fromApi((await res.json()).data as ApiTim);

      if (isEdit) {
        setMembers((current) =>
          current.map((item) => (item.id === saved.id ? saved : item))
        );
      } else {
        setMembers((current) => [...current, saved]);
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
     DELETE (DELETE ke API)
  ========================================================= */

  const handleDelete = async () => {
    if (!selectedMember || saving) return;

    setSaving(true);
    resetErrors();

    try {
      const res = await fetch(`${ENDPOINT}/${selectedMember.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) throw new RequestError(await readFailure(res));

      setMembers((current) =>
        current.filter((item) => item.id !== selectedMember.id)
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
                <Users size={18} strokeWidth={1.8} className="text-[#2E7D32]" />
              </div>

              <h1 className="text-[26px] font-medium tracking-[-0.02em] sm:text-[32px]">
                Tim Pengelola HKI
              </h1>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#7A867F] sm:ml-[52px]">
              Kelola jabatan, nama, dan foto tim pengelola Sentra HKI yang
              ditampilkan pada halaman Pendaftaran HKI.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            <Plus size={16} strokeWidth={2} />
            Tambah Anggota
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
              onClick={loadMembers}
              className="self-start rounded-full border border-[#E7B4B4] bg-white px-4 py-1.5 text-[12px] font-medium text-[#B91C1C] transition hover:bg-[#FFF8F8] sm:self-auto"
            >
              Muat Ulang
            </button>
          </div>
        )}

        {/* =====================================================
            MAIN CARD
        ===================================================== */}

        <div className="w-full rounded-[28px] bg-white/70 p-3 shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur sm:p-4 md:p-5">
          {/* FILTER BAR */}

          <div className="mb-4">
            <div className="relative min-w-0">
              <Search
                size={16}
                strokeWidth={1.8}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B9690]"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau jabatan..."
                className="h-11 w-full rounded-full border border-transparent bg-white pl-11 pr-4 text-[13px] text-[#3D4942] shadow-[0_1px_4px_rgba(38,53,45,0.05)] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10"
              />
            </div>
          </div>

          {/* TABLE */}

          <div className="w-full overflow-hidden rounded-[22px] bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-y-1 px-2 text-left">
                <thead>
                  <tr>
                    {/* LEBAR KOLOM DIATUR DI SINI (total harus 100%) */}
                    <th className={`${thClass} w-[9%] pl-5`}>Urutan</th>
                    <th className={`${thClass} w-[32.5%]`}>Nama</th>
                    <th className={`${thClass} w-[40%] text-center`}>
                      Jabatan / Tugas
                    </th>
                    <th className={`${thClass} w-[11.5%] text-center`}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMembers.map((item) => {
                    const cell = "bg-white group-hover:bg-[#F2F8F2]";

                    return (
                      <tr key={item.id} className="group">
                        <td
                          className={`rounded-l-2xl py-3.5 pl-5 pr-3 align-middle transition-colors ${cell}`}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3F1E4] text-[12px] font-medium text-[#2E7D32]">
                            {item.order}
                          </span>
                        </td>

                        <td
                          className={`px-3 py-3.5 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center gap-4">
                            <Thumb
                              src={item.image}
                              className="h-[54px] w-[72px]"
                              iconSize={18}
                            />

                            <p className="line-clamp-2 max-w-[260px] text-[13px] font-medium leading-[20px] text-[#26352C]">
                              {item.name}
                            </p>
                          </div>
                        </td>

                        <td
                          className={`px-3 py-3.5 text-center align-middle text-[13px] leading-[20px] text-[#46544B] transition-colors ${cell}`}
                        >
                          <span className="mx-auto line-clamp-2 max-w-[360px]">
                            {item.role}
                          </span>
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

                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F2] text-[#7A857D]">
                            <Search size={20} strokeWidth={1.8} />
                          </div>

                          <p className="text-[14px] font-medium text-[#526057]">
                            {loading
                              ? "Memuat data tim pengelola..."
                              : members.length === 0
                                ? "Belum ada anggota tim pengelola"
                                : "Anggota tidak ditemukan"}
                          </p>

                          <p className="mt-1 text-[12px] text-[#8A948E]">
                            {loading
                              ? "Mohon tunggu sebentar."
                              : members.length === 0
                                ? "Klik Tambah Anggota untuk menambahkan data pertama."
                                : "Coba gunakan kata kunci lain."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER */}

            <div className="border-t border-[#EEF2EF] px-5 py-3.5">
              <p className="text-[12px] text-[#7A857D]">
                {filteredMembers.length > 0 ? (
                  <>
                    Menampilkan{" "}
                    <span className="font-medium text-[#46544B]">
                      {filteredMembers.length}
                    </span>{" "}
                    anggota
                    {filteredMembers.length !== members.length &&
                      ` (total ${members.length})`}
                  </>
                ) : (
                  <>Tidak ada data yang ditampilkan</>
                )}
              </p>
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
          maxWidth="max-w-[680px]"
        >
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title={modal === "add" ? "Tambah Anggota" : "Edit Anggota"}
              subtitle={
                modal === "add"
                  ? "Isi form berikut untuk menambahkan anggota tim pengelola."
                  : "Perbarui data anggota yang dipilih."
              }
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="Nama"
                  required
                  error={fieldErrors.name}
                  className="md:col-span-2"
                >
                  <input
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="Contoh: Fitriyanti Nakul"
                    className={`${inputClass} ${fieldErrors.name ? inputErrorClass : ""}`}
                  />
                </FormField>

                <FormField
                  label="Jabatan / Tugas"
                  required
                  error={fieldErrors.role}
                  className="md:col-span-2"
                >
                  <input
                    value={form.role}
                    onChange={(e) => updateForm("role", e.target.value)}
                    placeholder="Contoh: Ketua Sentra HKI"
                    className={`${inputClass} ${fieldErrors.role ? inputErrorClass : ""}`}
                  />
                </FormField>

                <FormField
                  label="Urutan Tampil"
                  required
                  hint="1 = paling awal"
                  error={
                    fieldErrors.order ??
                    (form.order !== "" && !isValidOrder(form.order)
                      ? "Urutan harus angka 1 atau lebih."
                      : undefined)
                  }
                  className="md:col-span-2"
                >
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={form.order}
                    onChange={(e) => updateForm("order", e.target.value)}
                    className={`${inputClass} ${
                      fieldErrors.order ||
                      (form.order !== "" && !isValidOrder(form.order))
                        ? inputErrorClass
                        : ""
                    }`}
                  />
                </FormField>

                {/* FOTO */}

                <div className="md:col-span-2">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                    <label className="text-[12px] font-medium text-[#536059]">
                      Foto
                    </label>

                    <span className="text-[11px] text-[#9AA49F]">
                      Opsional, semua format gambar
                    </span>
                  </div>

                  <div className="rounded-2xl border border-dashed border-[#C9D7CB] bg-[#FAFCFA] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-[#EEF3EF] sm:w-[200px]">
                        {photoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoPreview}
                            alt="Preview foto anggota"
                            className="block h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center text-[#9AA49F]">
                            <FileImage size={22} strokeWidth={1.5} />
                            <span className="mt-1 text-[11px]">Belum ada foto</span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#536059]">
                          Tambahkan foto anggota
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-[#929C96]">
                          Semua jenis gambar, ukuran file, dan resolusi bisa
                          dipakai. Di halaman publik foto tampil dengan rasio
                          4:3, jadi tepi foto bisa terpotong.
                        </p>

                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <label className={btnSmall}>
                            <Upload size={14} strokeWidth={1.8} />
                            Pilih Foto
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoChange}
                              className="hidden"
                            />
                          </label>

                          {photoPreview && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className={btnSmall}
                            >
                              <Trash2 size={14} strokeWidth={1.8} />
                              Hapus Foto
                            </button>
                          )}
                        </div>

                        {photoName && (
                          <p className="mt-1.5 max-w-full truncate text-[11px] text-[#7C8881]">
                            {photoName}
                          </p>
                        )}

                        {(photoError || fieldErrors.photo) && (
                          <p
                            role="alert"
                            className="mt-1.5 text-[12px] font-medium text-[#B91C1C]"
                          >
                            {photoError || fieldErrors.photo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

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
                    ? "Simpan Anggota"
                    : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {modal === "detail" && selectedMember && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[560px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title="Detail Anggota"
              subtitle="Informasi lengkap data yang dipilih."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <Thumb
                src={selectedMember.image}
                className="mb-5 aspect-[4/3] w-full !rounded-2xl"
                iconSize={32}
              />

              <h3 className="text-[17px] font-semibold leading-[1.45] text-[#26352D] sm:text-[19px]">
                {selectedMember.name}
              </h3>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
                <DetailItem label="Jabatan / Tugas" value={selectedMember.role} />
                <DetailItem
                  label="Urutan"
                  value={String(selectedMember.order)}
                />
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      {modal === "delete" && selectedMember && (
        <ConfirmDelete
          title="Hapus Anggota?"
          onCancel={closeModal}
          onConfirm={handleDelete}
          loading={saving}
          error={saveError}
        >
          Data{" "}
          <span className="font-medium text-[#475569]">
            {selectedMember.name}
          </span>{" "}
          akan dihapus secara permanen dan tidak lagi tampil di halaman
          Pendaftaran HKI.
        </ConfirmDelete>
      )}
    </div>
  );
}

/* =========================================================
   GAMBAR KECIL dengan cadangan kalau belum ada foto
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
    <div
      className={`shrink-0 overflow-hidden rounded-xl bg-[#EEF3EF] ${className}`}
    >
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