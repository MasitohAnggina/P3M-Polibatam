"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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
   ADMIN: PROFIL PENELITI
   Letakkan di src/app/admin/profil-peneliti/page.tsx
   (sesuaikan dengan struktur folder admin Anda).

   Data ini tampil di halaman publik /profil-peneliti
   (daftar kartu). Klik kartu di halaman publik membuka
   Tautan Profil (SINTA) di tab baru. Karena itu form hanya
   berisi: foto, nama, program studi, dan tautan profil SINTA.

   URUTAN DATA: dari yang terbaru ditambahkan ke yang terlama
   (id terbesar di atas). Peneliti yang baru disimpan langsung
   muncul di halaman 1.

   PAGINATION: nomor halaman, tombol sebelumnya/berikutnya, dan
   pilihan jumlah data per halaman (10, 25, 50).

   KONTRAK API (backend Laravel, Sanctum) TIDAK BERUBAH:
   GET    /api/admin/peneliti          -> { data: ApiResearcher[] }
   POST   /api/admin/peneliti          -> { data: ApiResearcher }  (multipart)
   POST   /api/admin/peneliti/{id}     -> { data: ApiResearcher }  (multipart + _method=PUT)
   DELETE /api/admin/peneliti/{id}     -> { message }
   Publik: GET /api/peneliti           -> { data: ApiResearcher[] }

   CATATAN BACKEND: jabatan, jurusan, dan laboratorium tidak
   diisi lagi dari form (dikirim kosong untuk data baru), jadi
   aturan validasi `jabatan` dan `jurusan` di Laravel harus
   `nullable` (kolom database juga harus boleh NULL).

   Data lama (jabatan, jurusan, laboratorium, keahlian, tentang,
   pendidikan, luaran, NIDN, email, tautan lain) tidak
   ditampilkan di form, tetapi tetap dikirim ulang apa adanya
   saat edit supaya tidak terhapus di server.
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* =========================================================
   API + TOKEN
========================================================= */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const BASE_URL = API_URL.replace(/\/api\/?$/, "");
const ENDPOINT = `${API_URL}/admin/peneliti`;

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
function photoUrl(path: string | null): string {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return `${BASE_URL}/storage/${path.replace(/^\/?(storage\/)?/, "")}`;
}

/* =========================================================
   TYPE
   Yang tampil dan diedit: name, prodi, photo, tautan SINTA.
   Field lainnya hanya dibawa supaya data lama tidak hilang
   saat disimpan ulang.
========================================================= */

type Education = { degree: string; field: string; school: string; year: string };

type Publication = {
  title: string;
  authors: string;
  venue: string;
  year: string;
  type: string;
};

type ProfileLink = { label: string; href: string };

type Researcher = {
  id: number;
  name: string;
  prodi: string;
  photo: string;
  links: ProfileLink[];
  /* data lama, tidak ditampilkan */
  position: string;
  jurusan: string;
  lab: string;
  nidn: string;
  email: string;
  about: string;
  expertise: string[];
  education: Education[];
  publications: Publication[];
};

/* Bentuk data dari API Laravel */
type ApiResearcher = {
  id: number;
  nama: string;
  jabatan: string | null;
  nidn: string | null;
  email: string | null;
  jurusan: string | null;
  prodi: string;
  laboratorium: string | null;
  foto: string | null;
  tentang: string | null;
  keahlian: string[] | null;
  pendidikan:
    | {
        jenjang: string;
        bidang: string | null;
        institusi: string;
        tahun: string | number | null;
      }[]
    | null;
  luaran:
    | {
        judul: string;
        penulis: string | null;
        penerbit: string | null;
        tahun: string | number | null;
        jenis: string | null;
      }[]
    | null;
  tautan: { label: string; url: string }[] | null;
};

function fromApi(item: ApiResearcher): Researcher {
  return {
    id: item.id,
    name: item.nama,
    prodi: item.prodi,
    photo: photoUrl(item.foto),
    links: (item.tautan ?? []).map((row) => ({ label: row.label, href: row.url })),
    position: item.jabatan ?? "",
    jurusan: item.jurusan ?? "",
    lab: item.laboratorium ?? "",
    nidn: item.nidn ?? "",
    email: item.email ?? "",
    about: item.tentang ?? "",
    expertise: item.keahlian ?? [],
    education: (item.pendidikan ?? []).map((row) => ({
      degree: row.jenjang,
      field: row.bidang ?? "",
      school: row.institusi,
      year: row.tahun == null ? "" : String(row.tahun),
    })),
    publications: (item.luaran ?? []).map((row) => ({
      title: row.judul,
      authors: row.penulis ?? "",
      venue: row.penerbit ?? "",
      year: row.tahun == null ? "" : String(row.tahun),
      type: row.jenis ?? "",
    })),
  };
}

type ModalType = "add" | "edit" | "detail" | "delete" | null;

const emptyForm: Researcher = {
  id: 0,
  name: "",
  prodi: "",
  photo: "",
  links: [],
  position: "",
  jurusan: "",
  lab: "",
  nidn: "",
  email: "",
  about: "",
  expertise: [],
  education: [],
  publications: [],
};

/* =========================================================
   KONSTANTA
========================================================= */

const SINTA_LABEL = "SINTA";
const PAGE_SIZE_OPTIONS = [10, 25, 50];

/* =========================================================
   STYLE BERSAMA
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-[#D9E2D3] bg-white px-3.5 text-[13px] text-[#1F2A1A] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#31551F] focus:ring-4 focus:ring-[#31551F]/10";

const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#31551F] px-5 text-[13px] font-medium text-white transition hover:bg-[#3F6B28] disabled:cursor-not-allowed disabled:opacity-40";

const btnGhost =
  "inline-flex h-10 items-center justify-center rounded-full border border-[#D9E2D3] bg-white px-5 text-[13px] font-medium text-[#5E6B58] transition hover:bg-[#EEF4EA] disabled:cursor-not-allowed disabled:opacity-40";

const btnDanger =
  "inline-flex h-10 items-center justify-center rounded-full bg-[#DC2626] px-5 text-[13px] font-medium text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40";

const btnSmall =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-[#D9E2D3] bg-white px-3.5 text-[12px] font-medium text-[#31551F] transition hover:bg-[#EEF4EA]";

const thClass =
  "border-b border-dashed border-[#D9E2D3] px-3 py-4 text-[12px] font-medium text-[#5E6B58]";

/* =========================================================
   FUNGSI BANTU
========================================================= */

const isBlank = (...values: string[]) => values.every((v) => v.trim() === "");

const isBlob = (url: string) => url.startsWith("blob:");

const revokeIfBlob = (url: string) => {
  if (isBlob(url)) URL.revokeObjectURL(url);
};

/* Tautan SINTA = tautan yang namanya mengandung "sinta" */
const isSintaLink = (link: ProfileLink) => /sinta/i.test(link.label);

function getSintaUrl(links: ProfileLink[]): string {
  return links.find(isSintaLink)?.href ?? "";
}

/* ID SINTA ada di URL profil: .../authors/profile/6808685 */
function getSintaId(links: ProfileLink[]): string {
  return getSintaUrl(links).match(/\/authors\/profile\/(\d+)/i)?.[1] ?? "";
}

/* Daftar nomor halaman dengan "…", contoh: 1 … 4 5 6 … 12 */
function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const nums = Array.from(
    new Set([1, total, current - 1, current, current + 1])
  )
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);

  const out: (number | "…")[] = [];

  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });

  return out;
}

/* Buang baris kosong sebelum divalidasi dan dikirim */
function cleanForm(form: Researcher) {
  return {
    education: form.education.filter(
      (r) => !isBlank(r.degree, r.field, r.school, r.year)
    ),
    publications: form.publications.filter(
      (r) => !isBlank(r.title, r.authors, r.venue, r.year)
    ),
    links: form.links.filter((r) => !isBlank(r.label, r.href)),
  };
}

/* Mengembalikan pesan error pertama, atau "" kalau semua valid */
function validateForm(form: Researcher): string {
  const { links } = cleanForm(form);

  for (const row of links) {
    if (!row.label.trim() || !row.href.trim()) {
      return "Tautan profil: nama dan alamat tautan wajib diisi.";
    }
    if (!/^https?:\/\//i.test(row.href.trim())) {
      return "Tautan profil: alamat harus diawali http:// atau https://";
    }
  }

  return "";
}

function buildBody(
  form: Researcher,
  photoFile: File | null,
  removePhoto: boolean,
  isEdit: boolean
): FormData {
  const { education, publications, links } = cleanForm(form);
  const body = new FormData();

  body.append("nama", form.name.trim());
  body.append("prodi", form.prodi.trim());

  /* data lama: dikirim ulang apa adanya (kosong untuk data baru) */
  body.append("jabatan", form.position.trim());
  body.append("jurusan", form.jurusan.trim());
  body.append("laboratorium", form.lab.trim());
  body.append("nidn", form.nidn.trim());
  body.append("email", form.email.trim());
  body.append("tentang", form.about.trim());

  form.expertise.forEach((tag) => body.append("keahlian[]", tag));

  education.forEach((row, i) => {
    body.append(`pendidikan[${i}][jenjang]`, row.degree.trim());
    body.append(`pendidikan[${i}][bidang]`, row.field.trim());
    body.append(`pendidikan[${i}][institusi]`, row.school.trim());
    body.append(`pendidikan[${i}][tahun]`, row.year.trim());
  });

  publications.forEach((row, i) => {
    body.append(`luaran[${i}][judul]`, row.title.trim());
    body.append(`luaran[${i}][penulis]`, row.authors.trim());
    body.append(`luaran[${i}][penerbit]`, row.venue.trim());
    body.append(`luaran[${i}][tahun]`, row.year.trim());
    body.append(`luaran[${i}][jenis]`, row.type.trim());
  });

  links.forEach((row, i) => {
    body.append(`tautan[${i}][label]`, row.label.trim());
    body.append(`tautan[${i}][url]`, row.href.trim());
  });

  if (photoFile) body.append("foto", photoFile);
  if (removePhoto && !photoFile) body.append("hapus_foto", "1");

  // Laravel tidak membaca multipart lewat PUT, jadi pakai POST + _method
  if (isEdit) body.append("_method", "PUT");

  return body;
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function ProfilPenelitiAdminPage() {
  const [members, setMembers] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const [modal, setModal] = useState<ModalType>(null);
  const [form, setForm] = useState<Researcher>(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [selected, setSelected] = useState<Researcher | null>(null);

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
          setMembers(((json.data ?? []) as ApiResearcher[]).map(fromApi));
          setPageError("");
        }
      } catch (err) {
        if (!cancelled) {
          setPageError(
            err instanceof Error ? err.message : "Gagal memuat data peneliti."
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
     OPSI PRODI (diambil dari data yang sudah ada)
  ========================================================= */

  const prodiOptions = useMemo(
    () => Array.from(new Set(members.map((m) => m.prodi))).filter(Boolean),
    [members]
  );

  /* =========================================================
     FILTER + URUTAN + PAGINASI
     Urutan: terbaru ditambahkan di atas (id terbesar lebih dulu).
  ========================================================= */

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return members
      .filter((m) => {
        if (!keyword) return true;
        return [m.name, m.prodi].join(" ").toLowerCase().includes(keyword);
      })
      .sort((a, b) => b.id - a.id);
  }, [members, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(startIndex, startIndex + pageSize);

  const showingFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const showingTo = startIndex + pageItems.length;

  /* =========================================================
     MODAL
  ========================================================= */

  const closeModal = useCallback(() => {
    // lepas URL foto sementara (kalau ada) tanpa bergantung pada state lama
    setForm((current) => {
      revokeIfBlob(current.photo);
      return emptyForm;
    });
    setModal(null);
    setSelected(null);
    setPhotoFile(null);
    setRemovePhoto(false);
    setPhotoError("");
    setSaveError("");
  }, []);

  // Tutup modal dengan tombol Escape (tidak saat sedang menyimpan)
  useEffect(() => {
    if (!modal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, saving, closeModal]);

  const openAddModal = () => {
    setSelected(null);
    setForm({ ...emptyForm });
    setPhotoFile(null);
    setRemovePhoto(false);
    setPhotoError("");
    setSaveError("");
    setModal("add");
  };

  const openEditModal = (member: Researcher) => {
    setSelected(member);
    setForm({
      ...member,
      expertise: [...member.expertise],
      education: member.education.map((r) => ({ ...r })),
      publications: member.publications.map((r) => ({ ...r })),
      links: member.links.map((r) => ({ ...r })),
    });
    setPhotoFile(null);
    setRemovePhoto(false);
    setPhotoError("");
    setSaveError("");
    setModal("edit");
  };

  const openDetailModal = (member: Researcher) => {
    setSelected(member);
    setModal("detail");
  };

  const openDeleteModal = (member: Researcher) => {
    setSelected(member);
    setSaveError("");
    setModal("delete");
  };

  function updateField<K extends keyof Researcher>(
    field: K,
    value: Researcher[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  /* Isian tunggal "Tautan Profil SINTA": mengubah hanya tautan yang
     bernama SINTA; tautan lain (kalau ada di data lama) dibiarkan. */
  const setSintaUrl = (value: string) => {
    setForm((current) => {
      const index = current.links.findIndex(isSintaLink);

      if (index === -1) {
        if (!value.trim()) return current;
        return {
          ...current,
          links: [...current.links, { label: SINTA_LABEL, href: value }],
        };
      }

      if (!value.trim()) {
        return {
          ...current,
          links: current.links.filter((_, i) => i !== index),
        };
      }

      return {
        ...current,
        links: current.links.map((row, i) =>
          i === index ? { ...row, href: value } : row
        ),
      };
    });
  };

  /* =========================================================
     UPLOAD FOTO (tanpa batasan ukuran file atau resolusi)
     Preview memakai URL sementara, file aslinya disimpan di
     photoFile untuk dikirim ke server. Server yang memotong
     foto ke rasio 4:5.
  ========================================================= */

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    // reset supaya file yang sama bisa dipilih ulang
    input.value = "";

    if (!file) return;

    setPhotoError("");

    if (!file.type.startsWith("image/")) {
      setPhotoError("File foto harus berupa gambar.");
      return;
    }

    setForm((current) => {
      revokeIfBlob(current.photo);
      return { ...current, photo: URL.createObjectURL(file) };
    });
    setPhotoFile(file);
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    setForm((current) => {
      revokeIfBlob(current.photo);
      return { ...current, photo: "" };
    });
    setPhotoFile(null);
    setRemovePhoto(true);
    setPhotoError("");
  };

  /* =========================================================
     SAVE (POST ke API)
  ========================================================= */

  const canSave = form.name.trim() !== "" && form.prodi.trim() !== "";

  const handleSave = async () => {
    if (!canSave || saving) return;

    const problem = validateForm(form);
    if (problem) {
      setSaveError(problem);
      return;
    }

    const isEdit = modal === "edit";
    const body = buildBody(form, photoFile, removePhoto, isEdit);
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

      const saved = fromApi((await res.json()).data as ApiResearcher);

      if (isEdit) {
        setMembers((current) =>
          current.map((member) => (member.id === saved.id ? saved : member))
        );
      } else {
        setMembers((current) => [saved, ...current]);

        // data terbaru tampil di paling atas, jadi kembali ke halaman 1
        setSearch("");
        setPage(1);
      }

      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Gagal menyimpan data peneliti."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     DELETE (DELETE ke API)
  ========================================================= */

  const handleDelete = async () => {
    if (!selected || saving) return;

    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`${ENDPOINT}/${selected.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error(await readError(res));

      setMembers((current) => current.filter((m) => m.id !== selected.id));

      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Gagal menghapus data peneliti."
      );
    } finally {
      setSaving(false);
    }
  };

  /* modal tidak boleh ditutup saat request sedang berjalan */
  const safeClose = saving ? () => {} : closeModal;

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
                Profil Peneliti
              </h1>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#5E6B58] sm:ml-[52px]">
              Kelola daftar dosen peneliti pada halaman Profil Peneliti di situs
              publik. Klik kartu di situs publik akan membuka tautan profil
              SINTA peneliti.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full bg-[#31551F] px-5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(49,85,31,0.18)] transition hover:bg-[#3F6B28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31551F] sm:self-auto"
          >
            <Plus size={16} strokeWidth={2.2} aria-hidden />
            Tambah Peneliti
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
            MAIN CARD
        ===================================================== */}

        <div className="w-full rounded-[28px] bg-white/70 p-3 shadow-[0_8px_30px_rgba(31,42,26,0.06)] backdrop-blur sm:p-4 md:p-5">
          {/* SEARCH */}

          <div className="mb-4">
            <div className="relative">
              <Search
                size={16}
                strokeWidth={1.8}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B9690]"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama atau program studi..."
                className="h-11 w-full rounded-full border border-transparent bg-white pl-11 pr-4 text-[13px] text-[#1F2A1A] shadow-[0_1px_4px_rgba(31,42,26,0.05)] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#31551F] focus:ring-4 focus:ring-[#31551F]/10"
              />
            </div>
          </div>

          {/* TABLE */}

          <div className="w-full overflow-hidden rounded-[22px] bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[820px] border-separate border-spacing-y-1 px-2 text-left">
                <thead>
                  <tr>
                    <th className={`${thClass} min-w-[320px] pl-5`}>Peneliti</th>
                    <th className={`${thClass} min-w-[220px]`}>Program Studi</th>
                    <th className={`${thClass} w-[120px]`}>ID SINTA</th>
                    <th className={`${thClass} w-[130px] text-center`}>Tautan SINTA</th>
                    <th className={`${thClass} w-[130px] text-center`}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {pageItems.map((member) => {
                    const cell = "bg-white group-hover:bg-[#EEF4EA]";
                    const sintaUrl = getSintaUrl(member.links);

                    return (
                      <tr key={member.id} className="group">
                        {/* FOTO (4:5) + NAMA */}

                        <td
                          className={`rounded-l-2xl py-3 pl-5 pr-3 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center gap-3.5">
                            <PersonPhoto photo={member.photo} name={member.name} width={48} />

                            <p className="max-w-[300px] text-[13px] font-semibold leading-[20px] text-[#1F2A1A]">
                              {member.name}
                            </p>
                          </div>
                        </td>

                        {/* PRODI */}

                        <td className={`px-3 py-3 align-middle transition-colors ${cell}`}>
                          <p className="text-[12.5px] font-medium leading-5 text-[#1F2A1A]">
                            {member.prodi}
                          </p>
                        </td>

                        {/* ID SINTA (dari tautan) */}

                        <td className={`px-3 py-3 align-middle transition-colors ${cell}`}>
                          {getSintaId(member.links) ? (
                            <span className="text-[12.5px] font-medium text-[#1F2A1A]">
                              {getSintaId(member.links)}
                            </span>
                          ) : (
                            <span className="text-[12px] text-[#A3ADA7]">-</span>
                          )}
                        </td>

                        {/* TAUTAN SINTA */}

                        <td
                          className={`px-3 py-3 text-center align-middle transition-colors ${cell}`}
                        >
                          {sintaUrl ? (
                            <a
                              href={sintaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#31551F] hover:underline"
                            >
                              Buka
                              <ExternalLink size={12} strokeWidth={2} aria-hidden />
                            </a>
                          ) : (
                            <span className="text-[12px] text-[#A3ADA7]">
                              Belum diisi
                            </span>
                          )}
                        </td>

                        {/* AKSI */}

                        <td
                          className={`rounded-r-2xl px-3 py-3 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center justify-center gap-1">
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

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF4EA] text-[#5E6B58]">
                            <Users size={20} strokeWidth={1.8} />
                          </div>

                          <p className="text-[14px] font-medium text-[#1F2A1A]">
                            {loading
                              ? "Memuat data..."
                              : members.length === 0
                                ? "Belum ada data peneliti"
                                : "Peneliti tidak ditemukan"}
                          </p>

                          {!loading && (
                            <p className="mt-1 text-[12px] text-[#5E6B58]">
                              {members.length === 0
                                ? "Klik Tambah Peneliti untuk menambahkan data."
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

            {/* FOOTER + PAGINASI */}

            <div className="flex flex-col gap-3 border-t border-[#EEF2EF] px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <p className="text-[12px] text-[#5E6B58]">
                  Menampilkan{" "}
                  <span className="font-medium text-[#1F2A1A]">
                    {showingFrom}-{showingTo}
                  </span>{" "}
                  dari {filtered.length} peneliti
                  {filtered.length !== members.length &&
                    ` (total ${members.length})`}
                </p>

                <label className="flex items-center gap-2 text-[12px] text-[#5E6B58]">
                  Per halaman
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    aria-label="Jumlah data per halaman"
                    className="h-8 rounded-full border border-[#D9E2D3] bg-white px-3 text-[12px] font-medium text-[#1F2A1A] outline-none transition hover:border-[#8DC26F] focus:border-[#31551F] focus:ring-4 focus:ring-[#31551F]/10"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onChange={setPage}
              />
            </div>
          </div>
        </div>
      </div>

      {/* daftar saran untuk kolom prodi */}
      <datalist id="opsi-prodi">
        {prodiOptions.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {(modal === "add" || modal === "edit") && (
        <ModalShell onClose={safeClose} maxWidth="max-w-[600px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title={modal === "add" ? "Tambah Peneliti" : "Edit Peneliti"}
              subtitle="Lengkapi data peneliti. Kolom bertanda * wajib diisi."
              onClose={safeClose}
            />

            <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-6">
              {/* FOTO */}

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[#5E6B58]">
                  Foto
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                  <PersonPhoto photo={form.photo} name={form.name} width={120} />

                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <label className={`${btnSmall} cursor-pointer`}>
                        <Upload size={14} strokeWidth={1.8} />
                        Pilih Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>

                      {form.photo && (
                        <button type="button" onClick={handleRemovePhoto} className={btnSmall}>
                          <Trash2 size={14} strokeWidth={1.8} />
                          Hapus Foto
                        </button>
                      )}
                    </div>

                    <p className="mt-2 text-[11.5px] leading-5 text-[#8A948E]">
                      Semua ukuran dan resolusi bisa diunggah. Foto otomatis
                      dipotong ke rasio 4:5 (potret).
                    </p>

                    {photoError && (
                      <p role="alert" className="mt-1.5 text-[12px] font-medium text-[#B91C1C]">
                        {photoError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* IDENTITAS */}

              <FormSection title="Identitas">
                <div className="space-y-4">
                  <FormField label="Nama Lengkap" required>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Masukkan nama lengkap beserta gelar"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Program Studi" required>
                    <input
                      type="text"
                      list="opsi-prodi"
                      value={form.prodi}
                      onChange={(e) => updateField("prodi", e.target.value)}
                      placeholder="Pilih atau ketik program studi"
                      className={inputClass}
                    />
                  </FormField>
                </div>
              </FormSection>

              {/* TAUTAN PROFIL SINTA */}

              <FormSection
                title="Tautan Profil SINTA"
                hint="Dibuka di tab baru saat kartu peneliti diklik di situs publik"
              >
                <FormField label="Alamat Tautan">
                  <input
                    type="url"
                    value={getSintaUrl(form.links)}
                    onChange={(e) => setSintaUrl(e.target.value)}
                    placeholder="https://sinta.kemdiktisaintek.go.id/authors/profile/..."
                    className={inputClass}
                  />
                </FormField>

                <p className="mt-2 text-[11.5px] leading-5 text-[#8A948E]">
                  ID SINTA diambil otomatis dari tautan.{" "}
                  {getSintaId(form.links) ? (
                    <span className="font-semibold text-[#31551F]">
                      Terdeteksi: {getSintaId(form.links)}
                    </span>
                  ) : (
                    <span>Belum terdeteksi.</span>
                  )}{" "}
                  Kalau dikosongkan, kartu peneliti tetap tampil tetapi tidak
                  bisa diklik.
                </p>
              </FormSection>

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
                    ? "Simpan Peneliti"
                    : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DETAIL MODAL (pratinjau kartu)
      ===================================================== */}

      {modal === "detail" && selected && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[520px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title="Detail Peneliti"
              subtitle="Data yang tampil pada kartu di halaman Profil Peneliti."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-6">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <PersonPhoto photo={selected.photo} name={selected.name} width={140} />

                <div className="min-w-0 text-center sm:text-left">
                  <h3 className="break-words text-[17px] font-semibold leading-[1.4] text-[#1F2A1A]">
                    {selected.name}
                  </h3>
                  <p className="mt-1 text-[12.5px] leading-6 text-[#5E6B58]">
                    {selected.prodi}
                  </p>
                  {getSintaId(selected.links) && (
                    <p className="mt-1 text-[12px] font-medium text-[#8A948E]">
                      ID : {getSintaId(selected.links)}
                    </p>
                  )}
                </div>
              </div>

              <DetailBlock title="Tautan Profil SINTA">
                {getSintaUrl(selected.links) ? (
                  <a
                    href={getSintaUrl(selected.links)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={btnSmall}
                  >
                    Buka Profil
                    <ExternalLink size={12} strokeWidth={2} aria-hidden />
                  </a>
                ) : (
                  <p className="text-[13px] text-[#8A948E]">Belum diisi.</p>
                )}
              </DetailBlock>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      {modal === "delete" && selected && (
        <ConfirmDelete
          title="Hapus Peneliti?"
          onCancel={closeModal}
          onConfirm={handleDelete}
          loading={saving}
          error={saveError}
        >
          Data peneliti{" "}
          <span className="font-medium text-[#1F2A1A]">{selected.name}</span>{" "}
          akan dihapus secara permanen dan tidak dapat dipulihkan.
        </ConfirmDelete>
      )}
    </div>
  );
}

/* =========================================================
   PAGINATION (nomor halaman + sebelumnya/berikutnya)
========================================================= */

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const arrow =
    "flex h-8 w-8 items-center justify-center rounded-full border border-[#D9E2D3] bg-white text-[#31551F] transition hover:bg-[#EEF4EA] disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav
      aria-label="Halaman tabel"
      className="flex flex-wrap items-center gap-1.5"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Halaman sebelumnya"
        className={arrow}
      >
        <ChevronLeft size={15} strokeWidth={2} />
      </button>

      {pageList(page, totalPages).map((item, i) =>
        item === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-[12px] text-[#A3AE9E]">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-label={`Halaman ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={`h-8 min-w-8 rounded-full px-2.5 text-[12px] font-semibold transition ${
              item === page
                ? "border border-[#31551F] bg-[#31551F] text-white"
                : "border border-[#D9E2D3] bg-white text-[#4A5646] hover:border-[#31551F] hover:text-[#31551F]"
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Halaman berikutnya"
        className={arrow}
      >
        <ChevronRight size={15} strokeWidth={2} />
      </button>
    </nav>
  );
}

/* =========================================================
   FOTO ORANG (potret 4:5, sama dengan halaman publik)
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
  const style = { width, height: Math.round((width * 5) / 4) };

  return photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt={name}
      style={style}
      className="shrink-0 rounded-xl border border-[#D9E2D3] object-cover object-top"
    />
  ) : (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-xl border border-[#D9E2D3] bg-[#EEF4EA]"
    >
      <UserRound
        size={Math.round(width * 0.4)}
        strokeWidth={1.5}
        className="text-[#31551F]"
      />
    </div>
  );
}

/* =========================================================
   KOMPONEN KECIL
========================================================= */

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-[#EEF2EF] pb-2.5">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-[#1F2A1A]">{title}</h3>
          {hint && <p className="mt-0.5 text-[11.5px] text-[#8A948E]">{hint}</p>}
        </div>
      </div>

      {children}
    </section>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 border-b border-[#EEF2EF] pb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3F6B28]">
        {title}
      </h4>
      {children}
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