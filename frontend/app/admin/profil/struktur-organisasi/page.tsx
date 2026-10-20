"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";

import {
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";

/* =========================================================
   FONT (sama dengan halaman Profil publik)
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* =========================================================
   PALET WARNA (sama dengan halaman Profil publik)
   teks utama   : #1F2A1A
   hijau utama  : #31551F
   hijau gelap  : #213B14
   hijau medium : #3F6B28
   hijau aksen  : #8DC26F
   hijau muda   : #EEF4EA
   teks muted   : #5E6B58
   garis        : #D9E2D3
========================================================= */

/* =========================================================
   API
   Atur NEXT_PUBLIC_API_URL di .env.local, contoh:
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const ENDPOINT = `${API_URL}/admin/struktur-organisasi`;

/* Ambil token login (token Sanctum dari POST /api/login).
   Halaman login menyimpan token dengan key "p3m_token": di localStorage
   kalau "Ingat saya" dicentang, kalau tidak di sessionStorage. */
const TOKEN_KEYS = ["p3m_token", "token", "auth_token", "access_token"];

function getToken(): string | null {
  if (typeof window === "undefined") return null;

  for (const store of [localStorage, sessionStorage]) {
    for (const key of TOKEN_KEYS) {
      const raw = store.getItem(key);
      if (!raw) continue;

      // bersihkan tanda kutip kalau token disimpan lewat JSON.stringify
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

/* Ambil pesan error dari response Laravel (validasi 422 atau pesan umum) */
async function readError(res: Response): Promise<string> {
  // 401 dicek dulu supaya pesannya jelas, bukan "Unauthenticated." dari Laravel
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

type OrganizationMember = {
  id: number;
  name: string;
  position: string;
  photo: string;
  order: number;
};

/* Bentuk data dari API Laravel */
type ApiMember = {
  id: number;
  jabatan: string;
  nama: string;
  foto: string | null;
  urutan: number;
};

function fromApi(item: ApiMember): OrganizationMember {
  return {
    id: item.id,
    name: item.nama,
    position: item.jabatan,
    photo: item.foto ?? "",
    order: item.urutan,
  };
}

type ModalType = "add" | "edit" | "detail" | "delete" | null;

const emptyForm: OrganizationMember = {
  id: 0,
  name: "",
  position: "",
  photo: "",
  order: 1,
};

/* =========================================================
   SHARED STYLES
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-[#D9E2D3] bg-white px-3.5 text-[13px] text-[#1F2A1A] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#31551F] focus:ring-4 focus:ring-[#31551F]/10";

const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#31551F] px-5 text-[13px] font-medium text-white transition hover:bg-[#3F6B28] disabled:cursor-not-allowed disabled:opacity-40";

const btnGhost =
  "inline-flex h-10 items-center justify-center rounded-full border border-[#D9E2D3] bg-white px-5 text-[13px] font-medium text-[#5E6B58] transition hover:bg-[#EEF4EA] disabled:cursor-not-allowed disabled:opacity-40";

const btnDanger =
  "inline-flex h-10 items-center justify-center rounded-full bg-[#DC2626] px-5 text-[13px] font-medium text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40";

const thClass =
  "border-b border-dashed border-[#D9E2D3] px-3 py-4 text-[12px] font-medium text-[#5E6B58]";

/* =========================================================
   MAIN PAGE
========================================================= */

export default function StrukturOrganisasiPage() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");

  const [modal, setModal] = useState<ModalType>(null);
  const [form, setForm] = useState<OrganizationMember>(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<OrganizationMember | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  /* =========================================================
     AMBIL DATA DARI API
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(ENDPOINT, { headers: authHeaders() });

        if (!res.ok) throw new Error(await readError(res));

        const json = await res.json();

        if (!cancelled) {
          setMembers((json.data as ApiMember[]).map(fromApi));
          setPageError("");
        }
      } catch (err) {
        if (!cancelled) {
          setPageError(
            err instanceof Error ? err.message : "Gagal memuat data anggota."
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
     FILTER (diurutkan berdasarkan urutan tampilan)
  ========================================================= */

  const filteredMembers = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return [...members]
      .filter(
        (member) =>
          !keyword ||
          member.name.toLowerCase().includes(keyword) ||
          member.position.toLowerCase().includes(keyword)
      )
      .sort((a, b) => a.order - b.order);
  }, [members, search]);

  /* =========================================================
     MODAL
  ========================================================= */

  const closeModal = () => {
    setModal(null);
    setSelectedMember(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setSaveError("");
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
    const nextOrder =
      members.length > 0 ? Math.max(...members.map((m) => m.order)) + 1 : 1;

    setSelectedMember(null);
    setForm({ ...emptyForm, order: nextOrder });
    setPhotoFile(null);
    setSaveError("");
    setModal("add");
  };

  const openEditModal = (member: OrganizationMember) => {
    setSelectedMember(member);
    setForm({ ...member });
    setPhotoFile(null);
    setSaveError("");
    setModal("edit");
  };

  const openDetailModal = (member: OrganizationMember) => {
    setSelectedMember(member);
    setModal("detail");
  };

  const openDeleteModal = (member: OrganizationMember) => {
    setSelectedMember(member);
    setSaveError("");
    setModal("delete");
  };

  const updateForm = (field: keyof OrganizationMember, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  /* =========================================================
     UPLOAD FOTO (tanpa batasan format, ukuran, atau resolusi)
     Preview memakai URL sementara, file aslinya disimpan di
     photoFile untuk dikirim ke server.
  ========================================================= */

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    // reset supaya file yang sama bisa dipilih ulang
    input.value = "";

    if (!file) return;

    setPhotoFile(file);
    updateForm("photo", URL.createObjectURL(file));
  };

  /* =========================================================
     SAVE (POST ke API)
  ========================================================= */

  const canSave =
    form.name.trim() !== "" && form.position.trim() !== "" && form.order >= 1;

  const handleSave = async () => {
    if (!canSave || saving) return;

    const body = new FormData();
    body.append("jabatan", form.position.trim());
    body.append("nama", form.name.trim());
    body.append("urutan", String(form.order));

    if (photoFile) body.append("foto", photoFile);

    // Laravel tidak membaca multipart lewat PUT, jadi pakai POST + _method
    if (modal === "edit") body.append("_method", "PUT");

    const url = modal === "edit" ? `${ENDPOINT}/${form.id}` : ENDPOINT;

    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(), // jangan set Content-Type, browser mengaturnya untuk FormData
        body,
      });

      if (!res.ok) throw new Error(await readError(res));

      const saved = fromApi((await res.json()).data as ApiMember);

      if (modal === "add") {
        setMembers((current) => [...current, saved]);
      } else {
        setMembers((current) =>
          current.map((member) => (member.id === saved.id ? saved : member))
        );
      }

      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Gagal menyimpan data anggota."
      );
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
    setSaveError("");

    try {
      const res = await fetch(`${ENDPOINT}/${selectedMember.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error(await readError(res));

      setMembers((current) =>
        current.filter((member) => member.id !== selectedMember.id)
      );

      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Gagal menghapus data anggota."
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
      className={`${poppins.className} min-h-[calc(100vh-78px)] overflow-x-hidden bg-[linear-gradient(135deg,#F6F9F4_0%,#EEF4EA_50%,#E4EEDE_100%)] px-3 py-4 text-[#1F2A1A] sm:px-5 sm:py-6 md:px-8 md:py-8`}
    >
      <div className="mx-auto w-full max-w-[1320px]">
        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_10px_rgba(31,42,26,0.06)]">
                <Users size={18} strokeWidth={1.8} className="text-[#31551F]" />
              </div>

              <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px]">
                Struktur Organisasi
              </h1>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#5E6B58] sm:ml-[52px]">
              Kelola data anggota dan jabatan yang tampil pada bagian Struktur
              Organisasi di halaman Profil.
            </p>
          </div>

          <button type="button" onClick={openAddModal} className={`${btnPrimary} w-full sm:w-auto`}>
            <Plus size={16} strokeWidth={2} />
            Tambah Anggota
          </button>
        </div>

        {/* =====================================================
            ERROR MEMUAT DATA
        ===================================================== */}

        {pageError && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-[#F3C9C9] bg-[#FFF1F1] px-4 py-3 text-[13px] text-[#B91C1C]"
          >
            {pageError}
          </div>
        )}

        {/* =====================================================
            MAIN CARD
        ===================================================== */}

        <div className="w-full rounded-[28px] bg-white/70 p-3 shadow-[0_8px_30px_rgba(31,42,26,0.06)] backdrop-blur sm:p-4 md:p-5">
          {/* SEARCH */}

          <div className="relative mb-4">
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
              className="h-11 w-full rounded-full border border-transparent bg-white pl-11 pr-4 text-[13px] text-[#1F2A1A] shadow-[0_1px_4px_rgba(31,42,26,0.05)] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#31551F] focus:ring-4 focus:ring-[#31551F]/10"
            />
          </div>

          {/* TABLE */}

          <div className="w-full overflow-hidden rounded-[22px] bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-y-1 px-2 text-left">
                <thead>
                  <tr>
                    <th className={`${thClass} w-[100px] pl-5`}>Urutan</th>
                    <th className={`${thClass} min-w-[300px]`}>Foto dan Nama</th>
                    <th className={`${thClass} min-w-[200px]`}>Jabatan</th>
                    <th className={`${thClass} w-[130px] pr-5 text-right`}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMembers.map((member) => {
                    const cell = "bg-white group-hover:bg-[#EEF4EA]";

                    return (
                      <tr key={member.id} className="group">
                        {/* URUTAN */}

                        <td
                          className={`rounded-l-2xl py-3.5 pl-5 pr-3 align-middle transition-colors ${cell}`}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF4EA] text-[12px] font-medium text-[#31551F]">
                            {member.order}
                          </span>
                        </td>

                        {/* FOTO (4:3) + NAMA */}

                        <td className={`px-3 py-3.5 align-middle transition-colors ${cell}`}>
                          <div className="flex items-center gap-3.5">
                            <PersonPhoto photo={member.photo} name={member.name} width={72} />

                            <p className="max-w-[300px] text-[13px] font-semibold leading-[20px] text-[#1F2A1A]">
                              {member.name}
                            </p>
                          </div>
                        </td>

                        {/* JABATAN */}

                        <td className={`px-3 py-3.5 align-middle transition-colors ${cell}`}>
                          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-[#EEF4EA] px-3 py-1.5 text-[11px] font-medium leading-[15px] text-[#31551F]">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#31551F]" />
                            {member.position}
                          </span>
                        </td>

                        {/* AKSI */}

                        <td
                          className={`rounded-r-2xl py-3.5 pl-3 pr-5 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <IconButton label="Detail" onClick={() => openDetailModal(member)}>
                              <Eye size={16} strokeWidth={1.8} />
                            </IconButton>

                            <IconButton label="Edit" onClick={() => openEditModal(member)}>
                              <Pencil size={16} strokeWidth={1.8} />
                            </IconButton>

                            <IconButton label="Hapus" danger onClick={() => openDeleteModal(member)}>
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
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF4EA] text-[#5E6B58]">
                            <Users size={20} strokeWidth={1.8} />
                          </div>

                          <p className="text-[14px] font-medium text-[#1F2A1A]">
                            {loading
                              ? "Memuat data..."
                              : members.length === 0
                                ? "Belum ada data anggota"
                                : "Data struktur organisasi tidak ditemukan"}
                          </p>

                          {!loading && (
                            <p className="mt-1 text-[12px] text-[#5E6B58]">
                              {members.length === 0
                                ? "Klik Tambah Anggota untuk menambahkan data."
                                : "Coba gunakan kata kunci lain."}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER */}

            <div className="border-t border-[#EEF2EF] px-5 py-3.5">
              <p className="text-[12px] text-[#5E6B58]">
                Menampilkan{" "}
                <span className="font-medium text-[#1F2A1A]">
                  {filteredMembers.length}
                </span>{" "}
                dari {members.length} anggota
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {(modal === "add" || modal === "edit") && (
        <ModalShell onClose={saving ? () => {} : closeModal} maxWidth="max-w-[520px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title={modal === "add" ? "Tambah Anggota" : "Edit Anggota"}
              subtitle="Lengkapi data anggota struktur organisasi."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              {/* FOTO */}

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[#5E6B58]">
                  Foto
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <PersonPhoto photo={form.photo} name={form.name} width={160} />

                  <div className="min-w-0">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[#D9E2D3] bg-white px-4 text-[12px] font-medium text-[#31551F] transition hover:bg-[#EEF4EA]">
                      <Upload size={14} strokeWidth={1.8} />
                      Pilih Foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <FormField label="Jabatan" required>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => updateForm("position", e.target.value)}
                  placeholder="Contoh: Ketua P2M"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Nama Lengkap" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="Masukkan nama lengkap beserta gelar"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Urutan Tampilan" required hint="Angka kecil tampil lebih dulu">
                <input
                  type="number"
                  min={1}
                  value={form.order || ""}
                  onChange={(e) => updateForm("order", Number(e.target.value))}
                  className={inputClass}
                />
              </FormField>

              {saveError && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#FFF1F1] px-3.5 py-2.5 text-[12px] font-medium leading-5 text-[#B91C1C]"
                >
                  {saveError}
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
                    ? "Simpan Anggota"
                    : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DETAIL MODAL (pratinjau kartu seperti di halaman Profil)
      ===================================================== */}

      {modal === "detail" && selectedMember && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[440px]">
          <ModalHeader
            title="Detail Anggota"
            subtitle="Tampilan kartu pada halaman Profil."
            onClose={closeModal}
          />

          <div className="px-5 py-6 sm:px-6">
            <article className="overflow-hidden rounded-2xl border border-[#D9E2D3] bg-white">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EEF4EA]">
                {selectedMember.photo ? (
                  <img
                    src={selectedMember.photo}
                    alt={selectedMember.name}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserRound size={44} strokeWidth={1.5} className="text-[#31551F]" />
                  </div>
                )}
              </div>

              <div className="px-4 pb-5 pt-3.5 text-center">
                <p className="break-words text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#3F6B28]">
                  {selectedMember.position}
                </p>

                <h3 className="mt-1.5 break-words text-[14.5px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#1F2A1A]">
                  {selectedMember.name}
                </h3>
              </div>
            </article>
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
          Data anggota{" "}
          <span className="font-medium text-[#1F2A1A]">{selectedMember.name}</span>{" "}
          akan dihapus secara permanen dan tidak dapat dipulihkan.
        </ConfirmDelete>
      )}
    </div>
  );
}

/* =========================================================
   FOTO ORANG (landscape 4:3, sama dengan kartu di Profil)
========================================================= */

function PersonPhoto({
  photo,
  name,
  width,
}: {
  photo: string;
  name: string;
  width: number;
}) {
  const style = { width, height: Math.round((width * 3) / 4) };

  return photo ? (
    <img
      src={photo}
      alt={name}
      style={style}
      className="shrink-0 rounded-xl border border-[#D9E2D3] object-cover object-center"
    />
  ) : (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-xl border border-[#D9E2D3] bg-[#EEF4EA]"
    >
      <UserRound
        size={Math.round(width * 0.3)}
        strokeWidth={1.5}
        className="text-[#31551F]"
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
          : "text-[#5E6B58] hover:bg-[#EEF4EA] hover:text-[#1F2A1A]"
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
        <h2 className="text-[16px] font-semibold text-[#1F2A1A] sm:text-[18px]">
          {title}
        </h2>

        <p className="mt-1 text-[12px] leading-5 text-[#5E6B58]">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8B9690] transition hover:bg-[#EEF4EA]"
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

        <h3 className="mt-5 text-[17px] font-semibold text-[#1F2A1A]">{title}</h3>

        <p className="mx-auto mt-2 max-w-[340px] break-words text-[13px] leading-[22px] text-[#5E6B58]">
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
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-baseline justify-between gap-2 text-[12px] font-medium text-[#5E6B58]">
        <span>
          {label}
          {required && <span className="ml-0.5 text-[#D84A4A]">*</span>}
        </span>

        {hint && (
          <span className="text-[11px] font-normal text-[#8A948E]">{hint}</span>
        )}
      </label>

      {children}
    </div>
  );
}