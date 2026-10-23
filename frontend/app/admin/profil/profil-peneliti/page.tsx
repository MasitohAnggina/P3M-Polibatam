"use client";

import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
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
   (daftar kartu + halaman detail).

   KONTRAK API (backend Laravel, Sanctum):
   GET    /api/admin/peneliti          -> { data: ApiResearcher[] }
   POST   /api/admin/peneliti          -> { data: ApiResearcher }  (multipart)
   POST   /api/admin/peneliti/{id}     -> { data: ApiResearcher }  (multipart + _method=PUT)
   DELETE /api/admin/peneliti/{id}     -> { message }
   Publik: GET /api/peneliti           -> { data: ApiResearcher[] }

   Field multipart yang dikirim saat simpan:
   nama, jabatan, nidn, email, jurusan, prodi, laboratorium, tentang,
   foto (file, opsional), hapus_foto (1 = hapus foto lama, hanya saat edit),
   keahlian[]                         -> array string
   pendidikan[i][jenjang|bidang|institusi|tahun]
   luaran[i][judul|penulis|penerbit|tahun|jenis]
   tautan[i][label|url]
   Saat edit, array dikirim LENGKAP (bukan selisih), jadi backend
   cukup mengganti isi lama dengan isi baru. Array yang tidak
   terkirim (semua barisnya dihapus) dianggap kosong oleh backend.
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
   TYPE (bentuk di frontend sama dengan halaman publik)
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
  position: string;
  nidn: string;
  email: string;
  jurusan: string;
  prodi: string;
  lab: string;
  photo: string;
  about: string;
  expertise: string[];
  education: Education[];
  publications: Publication[];
  links: ProfileLink[];
};

/* Bentuk data dari API Laravel */
type ApiResearcher = {
  id: number;
  nama: string;
  jabatan: string;
  nidn: string | null;
  email: string | null;
  jurusan: string;
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
    position: item.jabatan,
    nidn: item.nidn ?? "",
    email: item.email ?? "",
    jurusan: item.jurusan,
    prodi: item.prodi,
    lab: item.laboratorium ?? "",
    photo: photoUrl(item.foto),
    about: item.tentang ?? "",
    expertise: item.keahlian ?? [],
    education: (item.pendidikan ?? []).map((row) => ({
      degree: row.jenjang,
      field: row.bidang ?? "",
      school: row.institusi,
      year: row.tahun == null ? "" : String(row.tahun),
    })),
    // terbaru di atas, sama dengan halaman publik
    publications: (item.luaran ?? [])
      .map((row) => ({
        title: row.judul,
        authors: row.penulis ?? "",
        venue: row.penerbit ?? "",
        year: row.tahun == null ? "" : String(row.tahun),
        type: row.jenis ?? "",
      }))
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0)),
    links: (item.tautan ?? []).map((row) => ({ label: row.label, href: row.url })),
  };
}

type ModalType = "add" | "edit" | "detail" | "delete" | null;

const emptyForm: Researcher = {
  id: 0,
  name: "",
  position: "",
  nidn: "",
  email: "",
  jurusan: "",
  prodi: "",
  lab: "",
  photo: "",
  about: "",
  expertise: [],
  education: [],
  publications: [],
  links: [],
};

const emptyEducation: Education = { degree: "", field: "", school: "", year: "" };
const emptyPublication: Publication = {
  title: "",
  authors: "",
  venue: "",
  year: "",
  type: "Artikel Jurnal",
};
const emptyLink: ProfileLink = { label: "", href: "" };

/* =========================================================
   KONSTANTA
========================================================= */

const POSITIONS = ["Asisten Ahli", "Lektor", "Lektor Kepala", "Guru Besar"];
const DEGREES = [
  "Doktor (S3)",
  "Magister (S2)",
  "Sarjana (S1)",
  "Diploma (D4)",
  "Diploma (D3)",
];
const PUBLICATION_TYPES = ["Artikel Jurnal", "Prosiding", "HKI", "Buku"];
const DEFAULT_JURUSAN = [
  "Teknik Informatika",
  "Teknik Elektro",
  "Teknik Mesin",
  "Manajemen Bisnis",
];
const LINK_SUGGESTIONS = ["Scopus", "SINTA", "Google Scholar", "ORCID"];

const ALL_JURUSAN = "Semua Jurusan";
const PAGE_SIZE = 10;

/* =========================================================
   STYLE BERSAMA
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-[#D9E2D3] bg-white px-3.5 text-[13px] text-[#1F2A1A] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#31551F] focus:ring-4 focus:ring-[#31551F]/10";

const textareaClass =
  "min-h-[110px] w-full resize-y rounded-xl border border-[#D9E2D3] bg-white px-3.5 py-2.5 text-[13px] leading-6 text-[#1F2A1A] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#31551F] focus:ring-4 focus:ring-[#31551F]/10";

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

function patchRow<T>(list: T[], index: number, patch: Partial<T>): T[] {
  return list.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

/* nama tanpa gelar, mis. "Dr. Rina Marlina, S.Kom." -> "Rina Marlina"
   (dipakai untuk mengurutkan, sama dengan halaman publik) */
function coreName(name: string) {
  return name.replace(/^(Dr\.|Prof\.|Ir\.)\s*/i, "").split(",")[0].trim();
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
  const { education, publications, links } = cleanForm(form);

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "Format email tidak valid.";
  }

  for (const row of education) {
    if (!row.degree.trim() || !row.school.trim()) {
      return "Pendidikan: jenjang dan institusi wajib diisi.";
    }
    if (row.year.trim() && !/^\d{4}$/.test(row.year.trim())) {
      return "Pendidikan: tahun harus 4 digit angka, contoh 2021.";
    }
  }

  for (const row of publications) {
    if (!row.title.trim()) return "Luaran penelitian: judul wajib diisi.";
    if (row.year.trim() && !/^\d{4}$/.test(row.year.trim())) {
      return "Luaran penelitian: tahun harus 4 digit angka, contoh 2024.";
    }
  }

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
  body.append("jabatan", form.position.trim());
  body.append("nidn", form.nidn.trim());
  body.append("email", form.email.trim());
  body.append("jurusan", form.jurusan.trim());
  body.append("prodi", form.prodi.trim());
  body.append("laboratorium", form.lab.trim());
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
  const [jurusanFilter, setJurusanFilter] = useState(ALL_JURUSAN);
  const [page, setPage] = useState(1);

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
     OPSI (diambil dari data yang sudah ada)
  ========================================================= */

  const jurusanOptions = useMemo(
    () =>
      Array.from(
        new Set([...DEFAULT_JURUSAN, ...members.map((m) => m.jurusan)])
      ).filter(Boolean),
    [members]
  );

  const prodiOptions = useMemo(
    () => Array.from(new Set(members.map((m) => m.prodi))).filter(Boolean),
    [members]
  );

  const labOptions = useMemo(
    () => Array.from(new Set(members.map((m) => m.lab))).filter(Boolean),
    [members]
  );

  const filterJurusanOptions = useMemo(
    () => [
      ALL_JURUSAN,
      ...Array.from(new Set(members.map((m) => m.jurusan))).filter(Boolean),
    ],
    [members]
  );

  /* Kalau jurusan yang sedang difilter sudah tidak ada (mis. peneliti
     terakhirnya dihapus), kembali ke "Semua Jurusan" supaya daftar tidak
     kosong tanpa alasan dan dropdown tidak menampilkan nilai kosong. */
  const activeJurusan = filterJurusanOptions.includes(jurusanFilter)
    ? jurusanFilter
    : ALL_JURUSAN;

  /* =========================================================
     FILTER + PAGINASI
  ========================================================= */

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return members
      .filter((m) => {
        if (activeJurusan !== ALL_JURUSAN && m.jurusan !== activeJurusan) {
          return false;
        }
        if (!keyword) return true;

        return [m.name, m.position, m.prodi, m.jurusan, m.lab, ...m.expertise]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .sort((a, b) =>
        coreName(a.name).localeCompare(coreName(b.name), "id")
      );
  }, [members, search, activeJurusan]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
    setForm({
      ...emptyForm,
      position: POSITIONS[0],
      education: [{ ...emptyEducation }],
    });
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

  const canSave =
    form.name.trim() !== "" &&
    form.position.trim() !== "" &&
    form.jurusan.trim() !== "" &&
    form.prodi.trim() !== "";

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
        setMembers((current) => [...current, saved]);
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
              Kelola data dosen peneliti yang tampil pada halaman Profil
              Peneliti di situs publik.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            <Plus size={16} strokeWidth={2} />
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
          {/* SEARCH + FILTER */}

          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_240px]">
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
                placeholder="Cari nama, jabatan, prodi, atau keahlian..."
                className="h-11 w-full rounded-full border border-transparent bg-white pl-11 pr-4 text-[13px] text-[#1F2A1A] shadow-[0_1px_4px_rgba(31,42,26,0.05)] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#31551F] focus:ring-4 focus:ring-[#31551F]/10"
              />
            </div>

            <select
              value={activeJurusan}
              onChange={(e) => {
                setJurusanFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter jurusan"
              className="h-11 w-full rounded-full border border-transparent bg-white px-4 text-[13px] text-[#1F2A1A] shadow-[0_1px_4px_rgba(31,42,26,0.05)] outline-none transition focus:border-[#31551F] focus:ring-4 focus:ring-[#31551F]/10"
            >
              {filterJurusanOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* TABLE */}

          <div className="w-full overflow-hidden rounded-[22px] bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[860px] border-separate border-spacing-y-1 px-2 text-left">
                <thead>
                  <tr>
                    <th className={`${thClass} min-w-[320px] pl-5`}>Peneliti</th>
                    <th className={`${thClass} min-w-[220px]`}>Prodi dan Jurusan</th>
                    <th className={`${thClass} min-w-[220px] text-center`}>Bidang Keahlian</th>
                    <th className={`${thClass} w-[130px] text-center`}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {pageItems.map((member) => {
                    const cell = "bg-white group-hover:bg-[#EEF4EA]";
                    const shown = member.expertise.slice(0, 2);
                    const rest = member.expertise.length - shown.length;

                    return (
                      <tr key={member.id} className="group">
                        {/* FOTO (4:5) + NAMA */}

                        <td
                          className={`rounded-l-2xl py-3 pl-5 pr-3 align-middle transition-colors ${cell}`}
                        >
                          <div className="flex items-center gap-3.5">
                            <PersonPhoto photo={member.photo} name={member.name} width={48} />

                            <div className="min-w-0">
                              <p className="max-w-[300px] text-[13px] font-semibold leading-[20px] text-[#1F2A1A]">
                                {member.name}
                              </p>
                              <p className="text-[11.5px] text-[#3F6B28]">
                                {member.position}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* PRODI + JURUSAN */}

                        <td className={`px-3 py-3 align-middle transition-colors ${cell}`}>
                          <p className="text-[12.5px] font-medium leading-5 text-[#1F2A1A]">
                            {member.prodi}
                          </p>
                          <p className="text-[11.5px] leading-5 text-[#5E6B58]">
                            {member.jurusan}
                          </p>
                        </td>

                        {/* KEAHLIAN */}

                        <td
                          className={`px-3 py-3 text-center align-middle transition-colors ${cell}`}
                        >
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {shown.map((tag) => (
                              <Chip key={tag}>{tag}</Chip>
                            ))}
                            {rest > 0 && (
                              <span className="rounded-full border border-[#D9E2D3] px-2.5 py-1 text-[11px] font-semibold leading-tight text-[#5E6B58]">
                                +{rest}
                              </span>
                            )}
                            {member.expertise.length === 0 && (
                              <span className="text-[12px] text-[#A3ADA7]">-</span>
                            )}
                          </div>
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
                      <td colSpan={4} className="px-5 py-16 text-center">
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
                                : "Coba gunakan kata kunci atau jurusan lain."}
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

            <div className="flex flex-col gap-3 border-t border-[#EEF2EF] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[#5E6B58]">
                Menampilkan{" "}
                <span className="font-medium text-[#1F2A1A]">{pageItems.length}</span>{" "}
                dari {filtered.length} peneliti
                {filtered.length !== members.length && ` (total ${members.length})`}
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    aria-label="Halaman sebelumnya"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9E2D3] text-[#31551F] transition hover:bg-[#EEF4EA] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft size={15} strokeWidth={2} />
                  </button>

                  <span className="text-[12px] text-[#5E6B58]">
                    Halaman {currentPage} dari {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Halaman berikutnya"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9E2D3] text-[#31551F] transition hover:bg-[#EEF4EA] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight size={15} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* daftar saran untuk kolom isian */}
      <datalist id="opsi-jurusan">
        {jurusanOptions.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="opsi-prodi">
        {prodiOptions.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="opsi-lab">
        {labOptions.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {(modal === "add" || modal === "edit") && (
        <ModalShell onClose={safeClose} maxWidth="max-w-[760px]">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FormField label="Nama Lengkap" required>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="Masukkan nama lengkap beserta gelar"
                        className={inputClass}
                      />
                    </FormField>
                  </div>

                  <FormField label="Jabatan Fungsional" required>
                    <select
                      value={form.position}
                      onChange={(e) => updateField("position", e.target.value)}
                      className={inputClass}
                    >
                      {!POSITIONS.includes(form.position) && form.position && (
                        <option value={form.position}>{form.position}</option>
                      )}
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="NIDN">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.nidn}
                      onChange={(e) => updateField("nidn", e.target.value)}
                      placeholder="Contoh: 0012345678"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Jurusan" required>
                    <input
                      type="text"
                      list="opsi-jurusan"
                      value={form.jurusan}
                      onChange={(e) => updateField("jurusan", e.target.value)}
                      placeholder="Pilih atau ketik jurusan"
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

                  <FormField label="Laboratorium">
                    <input
                      type="text"
                      list="opsi-lab"
                      value={form.lab}
                      onChange={(e) => updateField("lab", e.target.value)}
                      placeholder="Contoh: Laboratorium Kecerdasan Buatan"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Email">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="nama@polibatam.ac.id"
                      className={inputClass}
                    />
                  </FormField>
                </div>
              </FormSection>

              {/* TENTANG */}

              <FormSection title="Tentang">
                <textarea
                  value={form.about}
                  onChange={(e) => updateField("about", e.target.value)}
                  placeholder="Latar belakang, kegiatan riset, dan kontribusi peneliti"
                  className={textareaClass}
                />
              </FormSection>

              {/* KEAHLIAN */}

              <FormSection
                title="Bidang Keahlian"
                hint="Ketik lalu tekan Enter atau koma untuk menambah"
              >
                <TagInput
                  values={form.expertise}
                  onChange={(v) => updateField("expertise", v)}
                />
              </FormSection>

              {/* PENDIDIKAN */}

              <FormSection
                title="Pendidikan"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      updateField("education", [...form.education, { ...emptyEducation }])
                    }
                    className={btnSmall}
                  >
                    <Plus size={14} strokeWidth={2} />
                    Tambah
                  </button>
                }
              >
                {form.education.length === 0 && <EmptyRows text="Belum ada riwayat pendidikan." />}

                <div className="space-y-3">
                  {form.education.map((row, i) => (
                    <RowCard
                      key={i}
                      onRemove={() =>
                        updateField(
                          "education",
                          form.education.filter((_, idx) => idx !== i)
                        )
                      }
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="Jenjang" required>
                          <select
                            value={row.degree}
                            onChange={(e) =>
                              updateField(
                                "education",
                                patchRow(form.education, i, { degree: e.target.value })
                              )
                            }
                            className={inputClass}
                          >
                            <option value="">Pilih jenjang</option>
                            {DEGREES.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </FormField>

                        <FormField label="Bidang / Jurusan">
                          <input
                            type="text"
                            value={row.field}
                            onChange={(e) =>
                              updateField(
                                "education",
                                patchRow(form.education, i, { field: e.target.value })
                              )
                            }
                            placeholder="Contoh: Teknik Informatika"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Institusi" required>
                          <input
                            type="text"
                            value={row.school}
                            onChange={(e) =>
                              updateField(
                                "education",
                                patchRow(form.education, i, { school: e.target.value })
                              )
                            }
                            placeholder="Nama perguruan tinggi"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Tahun Lulus">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={row.year}
                            onChange={(e) =>
                              updateField(
                                "education",
                                patchRow(form.education, i, {
                                  year: e.target.value.replace(/\D/g, ""),
                                })
                              )
                            }
                            placeholder="2021"
                            className={inputClass}
                          />
                        </FormField>
                      </div>
                    </RowCard>
                  ))}
                </div>
              </FormSection>

              {/* LUARAN PENELITIAN */}

              <FormSection
                title="Luaran Penelitian"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      updateField("publications", [
                        ...form.publications,
                        { ...emptyPublication },
                      ])
                    }
                    className={btnSmall}
                  >
                    <Plus size={14} strokeWidth={2} />
                    Tambah
                  </button>
                }
              >
                {form.publications.length === 0 && (
                  <EmptyRows text="Belum ada luaran penelitian." />
                )}

                <div className="space-y-3">
                  {form.publications.map((row, i) => (
                    <RowCard
                      key={i}
                      onRemove={() =>
                        updateField(
                          "publications",
                          form.publications.filter((_, idx) => idx !== i)
                        )
                      }
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <FormField label="Judul" required>
                            <input
                              type="text"
                              value={row.title}
                              onChange={(e) =>
                                updateField(
                                  "publications",
                                  patchRow(form.publications, i, { title: e.target.value })
                                )
                              }
                              placeholder="Judul karya"
                              className={inputClass}
                            />
                          </FormField>
                        </div>

                        <div className="sm:col-span-2">
                          <FormField label="Penulis">
                            <input
                              type="text"
                              value={row.authors}
                              onChange={(e) =>
                                updateField(
                                  "publications",
                                  patchRow(form.publications, i, { authors: e.target.value })
                                )
                              }
                              placeholder="Contoh: R. Marlina, A. Penulis"
                              className={inputClass}
                            />
                          </FormField>
                        </div>

                        <div className="sm:col-span-2">
                          <FormField label="Jurnal / Penerbit / Prosiding">
                            <input
                              type="text"
                              value={row.venue}
                              onChange={(e) =>
                                updateField(
                                  "publications",
                                  patchRow(form.publications, i, { venue: e.target.value })
                                )
                              }
                              placeholder="Nama jurnal, prosiding, atau penerbit"
                              className={inputClass}
                            />
                          </FormField>
                        </div>

                        <FormField label="Jenis">
                          <select
                            value={row.type}
                            onChange={(e) =>
                              updateField(
                                "publications",
                                patchRow(form.publications, i, { type: e.target.value })
                              )
                            }
                            className={inputClass}
                          >
                            {PUBLICATION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </FormField>

                        <FormField label="Tahun">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={row.year}
                            onChange={(e) =>
                              updateField(
                                "publications",
                                patchRow(form.publications, i, {
                                  year: e.target.value.replace(/\D/g, ""),
                                })
                              )
                            }
                            placeholder="2024"
                            className={inputClass}
                          />
                        </FormField>
                      </div>
                    </RowCard>
                  ))}
                </div>
              </FormSection>

              {/* TAUTAN PROFIL */}

              <FormSection
                title="Tautan Profil"
                hint="Scopus, SINTA, Google Scholar, ORCID, dan sebagainya"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      updateField("links", [...form.links, { ...emptyLink }])
                    }
                    className={btnSmall}
                  >
                    <Plus size={14} strokeWidth={2} />
                    Tambah
                  </button>
                }
              >
                {form.links.length === 0 && <EmptyRows text="Belum ada tautan profil." />}

                <div className="space-y-3">
                  {form.links.map((row, i) => (
                    <RowCard
                      key={i}
                      onRemove={() =>
                        updateField(
                          "links",
                          form.links.filter((_, idx) => idx !== i)
                        )
                      }
                    >
                      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                        <FormField label="Nama" required>
                          <input
                            type="text"
                            list="opsi-tautan"
                            value={row.label}
                            onChange={(e) =>
                              updateField(
                                "links",
                                patchRow(form.links, i, { label: e.target.value })
                              )
                            }
                            placeholder="SINTA"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Alamat Tautan" required>
                          <input
                            type="url"
                            value={row.href}
                            onChange={(e) =>
                              updateField(
                                "links",
                                patchRow(form.links, i, { href: e.target.value })
                              )
                            }
                            placeholder="https://..."
                            className={inputClass}
                          />
                        </FormField>
                      </div>
                    </RowCard>
                  ))}
                </div>

                <datalist id="opsi-tautan">
                  {LINK_SUGGESTIONS.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
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
          DETAIL MODAL (pratinjau profil)
      ===================================================== */}

      {modal === "detail" && selected && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[640px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title="Detail Peneliti"
              subtitle="Data yang tampil pada halaman Profil Peneliti."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-6">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <PersonPhoto photo={selected.photo} name={selected.name} width={140} />

                <div className="min-w-0 text-center sm:text-left">
                  <p className="text-[11.5px] font-semibold text-[#3F6B28]">
                    {selected.position}
                  </p>
                  <h3 className="mt-1 break-words text-[17px] font-semibold leading-[1.4] text-[#1F2A1A]">
                    {selected.name}
                  </h3>
                  <p className="mt-1 text-[12.5px] leading-6 text-[#5E6B58]">
                    {selected.prodi} | {selected.jurusan}
                  </p>

                  <dl className="mt-3 space-y-1 text-[12.5px] text-[#4A5646]">
                    {selected.nidn && (
                      <div>
                        <dt className="inline font-medium">NIDN: </dt>
                        <dd className="inline">{selected.nidn}</dd>
                      </div>
                    )}
                    {selected.lab && (
                      <div>
                        <dt className="inline font-medium">Laboratorium: </dt>
                        <dd className="inline">{selected.lab}</dd>
                      </div>
                    )}
                    {selected.email && (
                      <div>
                        <dt className="inline font-medium">Email: </dt>
                        <dd className="inline break-all">{selected.email}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {selected.about && (
                <DetailBlock title="Tentang">
                  <p className="whitespace-pre-line text-[13px] leading-[1.8] text-[#5E6B58]">
                    {selected.about}
                  </p>
                </DetailBlock>
              )}

              {selected.expertise.length > 0 && (
                <DetailBlock title="Bidang Keahlian">
                  <div className="flex flex-wrap gap-2">
                    {selected.expertise.map((tag) => (
                      <Chip key={tag}>{tag}</Chip>
                    ))}
                  </div>
                </DetailBlock>
              )}

              {selected.education.length > 0 && (
                <DetailBlock title="Pendidikan">
                  <ul className="space-y-2">
                    {selected.education.map((row, i) => (
                      <li key={i} className="text-[13px] leading-6 text-[#1F2A1A]">
                        <span className="font-medium">
                          {row.degree}
                          {row.field && ` - ${row.field}`}
                        </span>
                        <span className="text-[#5E6B58]">
                          , {row.school}
                          {row.year && ` (${row.year})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </DetailBlock>
              )}

              {selected.publications.length > 0 && (
                <DetailBlock title={`Luaran Penelitian (${selected.publications.length})`}>
                  <ul className="space-y-3">
                    {selected.publications.map((row, i) => (
                      <li key={i} className="text-[13px] leading-6">
                        <p className="font-medium text-[#31551F]">{row.title}</p>
                        <p className="text-[12px] text-[#5E6B58]">
                          {[row.authors, row.venue].filter(Boolean).join(", ")}
                          {(row.type || row.year) &&
                            ` | ${[row.type, row.year].filter(Boolean).join(", ")}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </DetailBlock>
              )}

              {selected.links.length > 0 && (
                <DetailBlock title="Tautan Profil">
                  <div className="flex flex-wrap gap-2">
                    {selected.links.map((row, i) => (
                      <a
                        key={i}
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnSmall}
                      >
                        {row.label}
                        <ExternalLink size={12} strokeWidth={2} aria-hidden />
                      </a>
                    ))}
                  </div>
                </DetailBlock>
              )}
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

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#EEF4EA] px-2.5 py-1 text-[11px] font-semibold leading-tight text-[#31551F]">
      {children}
    </span>
  );
}

/* Input tag untuk bidang keahlian */
function TagInput({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const tag = draft.replace(/,/g, "").trim();

    if (tag && !values.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      onChange([...values, tag]);
    }

    setDraft("");
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="rounded-xl border border-[#D9E2D3] bg-white p-2.5 transition focus-within:border-[#31551F] focus-within:ring-4 focus-within:ring-[#31551F]/10">
      <div className="flex flex-wrap gap-1.5">
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[#EEF4EA] py-1 pl-2.5 pr-1.5 text-[11.5px] font-semibold leading-tight text-[#31551F]"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== tag))}
              aria-label={`Hapus ${tag}`}
              className="flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-[#31551F] hover:text-white"
            >
              <X size={10} strokeWidth={2.4} />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          placeholder={values.length === 0 ? "Contoh: Machine Learning" : "Tambah keahlian..."}
          className="h-7 min-w-[160px] flex-1 bg-transparent px-1 text-[13px] text-[#1F2A1A] outline-none placeholder:text-[#A3ADA7]"
        />
      </div>
    </div>
  );
}

function FormSection({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-[#EEF2EF] pb-2.5">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-[#1F2A1A]">{title}</h3>
          {hint && <p className="mt-0.5 text-[11.5px] text-[#8A948E]">{hint}</p>}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function RowCard({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative rounded-xl border border-[#E7EDE3] bg-[#F9FBF7] p-3.5 pr-11">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Hapus baris"
        title="Hapus baris"
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-[#D34B4B] transition hover:bg-[#FFF1F1]"
      >
        <Trash2 size={14} strokeWidth={1.8} />
      </button>

      {children}
    </div>
  );
}

function EmptyRows({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[#D9E2D3] px-4 py-4 text-center text-[12px] text-[#8A948E]">
      {text}
    </p>
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