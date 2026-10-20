"use client";

import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

/* =========================================================
   ADMIN: DATA PENGABDIAN
   Letakkan di src/app/admin/pengabdian/page.tsx

   Yang dikelola admin hanya DAFTAR PENGABDIAN. Bagian lain di
   halaman publik (arah pengabdian, kartu program, tahapan)
   adalah konten tetap di kode, jadi tidak perlu dikelola di sini.

   KONTRAK API (Laravel, Sanctum):
   GET    /api/admin/pengabdian        -> { data: ApiService[] }
   POST   /api/admin/pengabdian        -> { data: ApiService }  (multipart)
   POST   /api/admin/pengabdian/{id}   -> { data: ApiService }  (multipart + _method=PUT)
   DELETE /api/admin/pengabdian/{id}   -> { message }
   Publik: GET /api/pengabdian         -> { data: ApiService[] }

   Field multipart saat simpan:
   judul, ketua, mitra, bidang, kelompok (Internal/Eksternal, otomatis
   dari program), program, tahun, abstrak, anggota[], kata_kunci[],
   gambar (file gambar apa saja, opsional), hapus_gambar (1 = hapus gambar lama).
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
const ENDPOINT = `${API_URL}/admin/pengabdian`;

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
function imageUrl(path: string | null): string {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return `${BASE_URL}/storage/${path.replace(/^\/?(storage\/)?/, "")}`;
}

/* =========================================================
   PROGRAM
   Judul program HARUS sama persis dengan judul di halaman
   publik (programGroups pada app/pengabdian/page.tsx), karena
   halaman publik mencocokkan program lewat judulnya.
========================================================= */

type GroupId = "Internal" | "Eksternal";

const PROGRAM_GROUPS: { id: GroupId; label: string; programs: string[] }[] = [
  {
    id: "Internal",
    label: "Program Internal",
    programs: ["Penugasan Polibatam", "Hibah PBL"],
  },
  {
    id: "Eksternal",
    label: "Program Eksternal",
    programs: [
      "Pengabdian BIMA",
      "Pengabdian CSR",
      "Kerja Sama dan Sumber Lainnya",
    ],
  },
];

function groupOfProgram(program: string): GroupId | "" {
  return PROGRAM_GROUPS.find((g) => g.programs.includes(program))?.id ?? "";
}

/* =========================================================
   TYPE
========================================================= */

type Service = {
  id: number;
  title: string;
  leader: string;
  partner: string;
  field: string;
  group: string;
  program: string;
  year: string;
  abstract: string;
  members: string[];
  keywords: string[];
  image: string;
};

/* Bentuk data dari API Laravel */
type ApiService = {
  id: number;
  judul: string;
  ketua: string;
  mitra: string | null;
  bidang: string | null;
  kelompok: string | null;
  program: string;
  tahun: string | number;
  abstrak: string | null;
  anggota: string[] | null;
  kata_kunci: string[] | null;
  gambar: string | null;
};

function fromApi(item: ApiService): Service {
  return {
    id: item.id,
    title: item.judul,
    leader: item.ketua,
    partner: item.mitra ?? "",
    field: item.bidang ?? "",
    group: item.kelompok ?? groupOfProgram(item.program),
    program: item.program,
    year: String(item.tahun),
    abstract: item.abstrak ?? "",
    members: item.anggota ?? [],
    keywords: item.kata_kunci ?? [],
    image: imageUrl(item.gambar),
  };
}

type ModalType = "add" | "edit" | "view" | "delete" | null;

const emptyForm: Service = {
  id: 0,
  title: "",
  leader: "",
  partner: "",
  field: "",
  group: "",
  program: "",
  year: String(new Date().getFullYear()),
  abstract: "",
  members: [],
  keywords: [],
  image: "",
};

/* =========================================================
   KONSTANTA
========================================================= */

const ALL_PROGRAMS = "Semua Program";
const ALL_YEARS = "Semua Tahun";
const PAGE_SIZE = 10;

/* Tahun: dari tahun depan mundur 7 tahun */
const thisYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => String(thisYear + 1 - i));

const programFilterOptions = [
  ALL_PROGRAMS,
  ...PROGRAM_GROUPS.map((g) => g.label),
  ...PROGRAM_GROUPS.flatMap((g) => g.programs),
];

function matchesProgram(service: Service, selected: string) {
  if (selected === ALL_PROGRAMS) return true;

  const group = PROGRAM_GROUPS.find((g) => g.label === selected);
  if (group) return service.group === group.id;

  return service.program === selected;
}

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
  "inline-flex h-10 items-center justify-center rounded-full border border-[#DCE4DE] bg-white px-5 text-[13px] font-medium text-[#5B675F] transition hover:bg-[#F4F7F4] disabled:cursor-not-allowed disabled:opacity-40";

const btnDanger =
  "inline-flex h-10 items-center justify-center rounded-full bg-[#DC2626] px-5 text-[13px] font-medium text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40";

const btnSmall =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[#C8D6CA] bg-white px-4 text-[12px] font-medium text-[#2E7D32] transition hover:bg-[#F1F8F2]";

const thClass =
  "border-b border-dashed border-[#DCE4DE] px-3 py-4 text-[12px] font-medium text-[#7A867F]";

/* =========================================================
   FUNGSI BANTU
========================================================= */

const isBlob = (url: string) => url.startsWith("blob:");

const revokeIfBlob = (url: string) => {
  if (isBlob(url)) URL.revokeObjectURL(url);
};

function buildBody(
  form: Service,
  imageFile: File | null,
  removeImage: boolean,
  isEdit: boolean
): FormData {
  const body = new FormData();

  body.append("judul", form.title.trim());
  body.append("ketua", form.leader.trim());
  body.append("mitra", form.partner.trim());
  body.append("bidang", form.field.trim());
  body.append("kelompok", groupOfProgram(form.program));
  body.append("program", form.program);
  body.append("tahun", form.year);
  body.append("abstrak", form.abstract.trim());

  form.members.forEach((name) => body.append("anggota[]", name));
  form.keywords.forEach((word) => body.append("kata_kunci[]", word));

  if (imageFile) body.append("gambar", imageFile);
  if (removeImage && !imageFile) body.append("hapus_gambar", "1");

  // Laravel tidak membaca multipart lewat PUT, jadi pakai POST + _method
  if (isEdit) body.append("_method", "PUT");

  return body;
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function AdminPengabdianPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState(ALL_YEARS);
  const [programFilter, setProgramFilter] = useState(ALL_PROGRAMS);
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<Service | null>(null);

  const [form, setForm] = useState<Service>(emptyForm);
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
          setServices(((json.data ?? []) as ApiService[]).map(fromApi));
          setPageError("");
        }
      } catch (err) {
        if (!cancelled) {
          setPageError(
            err instanceof Error ? err.message : "Gagal memuat data pengabdian."
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

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return services.filter((item) => {
      const matchSearch =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.leader.toLowerCase().includes(keyword) ||
        item.partner.toLowerCase().includes(keyword) ||
        item.field.toLowerCase().includes(keyword) ||
        item.program.toLowerCase().includes(keyword);

      const matchYear = yearFilter === ALL_YEARS || item.year === yearFilter;

      return matchSearch && matchYear && matchesProgram(item, programFilter);
    });
  }, [services, search, yearFilter, programFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /* filter tahun: tahun standar + tahun yang ada di data */
  const yearFilterOptions = useMemo(() => {
    const fromData = services.map((r) => r.year);
    const all = Array.from(new Set([...YEAR_OPTIONS, ...fromData])).sort(
      (a, b) => Number(b) - Number(a)
    );
    return [ALL_YEARS, ...all];
  }, [services]);

  /* =========================================================
     SUMMARY (ringkasan di atas tabel)
  ========================================================= */

  const summary = useMemo(() => {
    const total = services.length;
    const internal = services.filter((r) => r.group === "Internal").length;
    const eksternal = services.filter((r) => r.group === "Eksternal").length;
    return { total, internal, eksternal };
  }, [services]);

  /* =========================================================
     MODAL
  ========================================================= */

  const closeModal = () => {
    revokeIfBlob(form.image);
    setModal(null);
    setSelected(null);
    setForm(emptyForm);
    setImageFile(null);
    setImageName("");
    setRemoveImage(false);
    setImageError("");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, saving, form.image]);

  const openAddModal = () => {
    setSelected(null);
    setForm(emptyForm);
    setImageFile(null);
    setImageName("");
    setRemoveImage(false);
    setImageError("");
    setSaveError("");
    setModal("add");
  };

  const openEditModal = (service: Service) => {
    setSelected(service);
    setForm({
      ...service,
      members: [...service.members],
      keywords: [...service.keywords],
    });
    setImageFile(null);
    setImageName("");
    setRemoveImage(false);
    setImageError("");
    setSaveError("");
    setModal("edit");
  };

  const openViewModal = (service: Service) => {
    setSelected(service);
    setModal("view");
  };

  const openDeleteModal = (service: Service) => {
    setSelected(service);
    setSaveError("");
    setModal("delete");
  };

  function updateField<K extends keyof Service>(field: K, value: Service[K]) {
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

  const canSave =
    form.title.trim() !== "" &&
    form.leader.trim() !== "" &&
    form.program.trim() !== "" &&
    form.year.trim() !== "";

  const handleSave = async () => {
    if (!canSave || saving) return;

    const isEdit = modal === "edit";
    const body = buildBody(form, imageFile, removeImage, isEdit);
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

      const saved = fromApi((await res.json()).data as ApiService);

      if (isEdit) {
        setServices((current) =>
          current.map((item) => (item.id === saved.id ? saved : item))
        );
      } else {
        setServices((current) => [saved, ...current]);
      }

      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Gagal menyimpan data pengabdian."
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

      setServices((current) => current.filter((item) => item.id !== selected.id));

      closeModal();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Gagal menghapus data pengabdian."
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
                <FileText size={18} strokeWidth={1.8} className="text-[#2E7D32]" />
              </div>

              <h1 className="text-[26px] font-medium tracking-[-0.02em] sm:text-[32px]">
                Data Pengabdian
              </h1>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#7A867F] sm:ml-[52px]">
              Kelola data pengabdian kepada masyarakat yang ditampilkan pada halaman pengguna.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            <Plus size={16} strokeWidth={2} />
            Tambah Pengabdian
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
            value={summary.total}
            grow={Math.max(summary.total, 1)}
            className="bg-[#2E7D32] text-white"
          />
          <SummaryPill
            label="Program Internal"
            value={summary.internal}
            grow={Math.max(summary.internal, 1)}
            className="bg-[#A5D6A7] text-[#1B5E20]"
          />
          <SummaryPill
            label="Program Eksternal"
            value={summary.eksternal}
            grow={Math.max(summary.eksternal, 1)}
            className="bg-[#DDEBDD] text-[#1F5A23]"
          />
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari judul, ketua, mitra, bidang, atau program..."
                className="h-11 w-full rounded-full border border-transparent bg-white pl-11 pr-4 text-[13px] text-[#3D4942] shadow-[0_1px_4px_rgba(38,53,45,0.05)] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10"
              />
            </div>

            <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:w-[460px]">
              <FilterSelect
                value={yearFilter}
                onChange={(v) => {
                  setYearFilter(v);
                  setPage(1);
                }}
                options={yearFilterOptions}
              />
              <FilterSelect
                value={programFilter}
                onChange={(v) => {
                  setProgramFilter(v);
                  setPage(1);
                }}
                options={programFilterOptions}
              />
            </div>
          </div>

          {/* TABLE */}

          <div className="w-full overflow-hidden rounded-[22px] bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1120px] border-separate border-spacing-y-1 px-2 text-left">
                <thead>
                  <tr>
                    <th className={`${thClass} py-4 pl-5 pr-3`}>Judul Pengabdian</th>
                    <th className={`${thClass} w-[190px]`}>Ketua Pengusul</th>
                    <th className={`${thClass} w-[170px]`}>Mitra</th>
                    <th className={`${thClass} w-[170px]`}>Bidang Fokus</th>
                    <th className={`${thClass} w-[220px]`}>Program</th>
                    <th className={`${thClass} w-[80px]`}>Tahun</th>
                    <th className={`${thClass} w-[130px] pl-3 pr-5 text-right`}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {pageItems.map((service) => {
                    const cell = "bg-white group-hover:bg-[#F2F8F2]";

                    return (
                      <tr key={service.id} className="group">
                        <td className={`rounded-l-2xl py-3.5 pl-5 pr-3 align-middle transition-colors ${cell}`}>
                          <div className="flex items-center gap-4">
                            <Thumb src={service.image} className="h-[45px] w-[80px]" iconSize={18} />

                            <p className="line-clamp-2 max-w-[400px] text-[13px] font-medium leading-[20px] text-[#26352C]">
                              {service.title}
                            </p>
                          </div>
                        </td>

                        <td className={`px-3 py-3.5 align-middle text-[13px] text-[#34423A] transition-colors ${cell}`}>
                          {service.leader}
                        </td>

                        <td className={`px-3 py-3.5 align-middle text-[13px] text-[#5D6861] transition-colors ${cell}`}>
                          {service.partner || <span className="text-[#A0AAA4]">—</span>}
                        </td>

                        <td className={`px-3 py-3.5 align-middle text-[13px] text-[#5D6861] transition-colors ${cell}`}>
                          {service.field || <span className="text-[#A0AAA4]">—</span>}
                        </td>

                        <td className={`px-3 py-3.5 align-middle transition-colors ${cell}`}>
                          <span className="inline-flex max-w-[200px] items-center gap-1.5 rounded-full bg-[#E3F1E4] px-3 py-1.5 text-[11px] font-medium leading-[15px] text-[#2E7D32]">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]" />
                            <span className="truncate">{service.program}</span>
                          </span>
                          {service.group && (
                            <p className="mt-1 pl-1 text-[11px] text-[#8A948E]">
                              {service.group}
                            </p>
                          )}
                        </td>

                        <td className={`px-3 py-3.5 align-middle text-[13px] text-[#46544B] transition-colors ${cell}`}>
                          {service.year}
                        </td>

                        <td className={`rounded-r-2xl py-3.5 pl-3 pr-5 align-middle transition-colors ${cell}`}>
                          <div className="flex items-center justify-end gap-1">
                            <IconButton label="Lihat" onClick={() => openViewModal(service)}>
                              <Eye size={16} strokeWidth={1.8} />
                            </IconButton>

                            <IconButton label="Edit" onClick={() => openEditModal(service)}>
                              <Pencil size={16} strokeWidth={1.8} />
                            </IconButton>

                            <IconButton label="Hapus" danger onClick={() => openDeleteModal(service)}>
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
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F2] text-[#7A857D]">
                            <Search size={20} strokeWidth={1.8} />
                          </div>

                          <p className="text-[14px] font-medium text-[#526057]">
                            {loading
                              ? "Memuat data..."
                              : services.length === 0
                                ? "Belum ada data pengabdian"
                                : "Data pengabdian tidak ditemukan"}
                          </p>

                          {!loading && (
                            <p className="mt-1 text-[12px] text-[#8A948E]">
                              {services.length === 0
                                ? "Klik Tambah Pengabdian untuk menambahkan data."
                                : "Coba ubah kata kunci atau filter pencarian."}
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
              <p className="text-[12px] text-[#7A857D]">
                Menampilkan{" "}
                <span className="font-medium text-[#46544B]">{pageItems.length}</span>{" "}
                dari {filtered.length} data pengabdian
                {filtered.length !== services.length && ` (total ${services.length})`}
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    aria-label="Halaman sebelumnya"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCE4DE] text-[#2E7D32] transition hover:bg-[#F1F8F2] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft size={15} strokeWidth={2} />
                  </button>

                  <span className="text-[12px] text-[#7A857D]">
                    Halaman {currentPage} dari {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Halaman berikutnya"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCE4DE] text-[#2E7D32] transition hover:bg-[#F1F8F2] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight size={15} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {(modal === "add" || modal === "edit") && (
        <ModalShell onClose={saving ? () => {} : closeModal} maxWidth="max-w-[720px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title={modal === "add" ? "Tambah Pengabdian" : "Edit Pengabdian"}
              subtitle="Isi data pengabdian sesuai informasi yang akan ditampilkan."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Judul Pengabdian" required className="md:col-span-2">
                  <input
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Masukkan judul pengabdian"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Ketua Pengusul" required>
                  <input
                    value={form.leader}
                    onChange={(e) => updateField("leader", e.target.value)}
                    placeholder="Masukkan nama ketua pengusul"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Mitra">
                  <input
                    value={form.partner}
                    onChange={(e) => updateField("partner", e.target.value)}
                    placeholder="Contoh: Kelompok Pengajian Kampung Tua Belian"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Bidang Fokus">
                  <input
                    value={form.field}
                    onChange={(e) => updateField("field", e.target.value)}
                    placeholder="Contoh: Pemberdayaan Masyarakat"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Program" required>
                  <div className="relative">
                    <select
                      value={form.program}
                      onChange={(e) => updateField("program", e.target.value)}
                      className={`${inputClass} appearance-none pr-9`}
                    >
                      <option value="">Pilih program</option>

                      {/* program lama yang tidak ada di daftar tetap bisa tampil */}
                      {form.program && !groupOfProgram(form.program) && (
                        <option value={form.program}>{form.program}</option>
                      )}

                      {PROGRAM_GROUPS.map((group) => (
                        <optgroup key={group.id} label={group.label}>
                          {group.programs.map((program) => (
                            <option key={program} value={program}>
                              {program}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <ChevronDown
                      size={15}
                      strokeWidth={1.8}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A948E]"
                    />
                  </div>

                  {form.program && groupOfProgram(form.program) && (
                    <p className="mt-1 text-[11px] text-[#8A948E]">
                      Kelompok: Program {groupOfProgram(form.program)}
                    </p>
                  )}
                </FormField>

                <FormField label="Tahun" required className="md:col-span-2">
                  <div className="relative">
                    <select
                      value={form.year}
                      onChange={(e) => updateField("year", e.target.value)}
                      className={`${inputClass} appearance-none pr-9`}
                    >
                      {!YEAR_OPTIONS.includes(form.year) && form.year && (
                        <option value={form.year}>{form.year}</option>
                      )}
                      {YEAR_OPTIONS.map((item) => (
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

                <FormField label="Ringkasan Kegiatan" className="md:col-span-2">
                  <textarea
                    value={form.abstract}
                    onChange={(e) => updateField("abstract", e.target.value)}
                    rows={5}
                    placeholder="Masukkan ringkasan kegiatan pengabdian..."
                    className={textareaClass}
                  />
                </FormField>

                <FormField
                  label="Anggota Tim"
                  hint="Ketik nama lalu tekan Enter"
                  className="md:col-span-2"
                >
                  <TagInput
                    values={form.members}
                    onChange={(v) => updateField("members", v)}
                    placeholder="Contoh: Dr. Rina Marlina, S.Kom., M.Kom."
                    commaAdds={false}
                  />
                </FormField>

                <FormField
                  label="Kata Kunci"
                  hint="Tekan Enter atau koma untuk menambah"
                  className="md:col-span-2"
                >
                  <TagInput
                    values={form.keywords}
                    onChange={(v) => updateField("keywords", v)}
                    placeholder="Contoh: Pendampingan"
                  />
                </FormField>

                {/* IMAGE */}

                <div className="md:col-span-2">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                    <label className="text-[12px] font-medium text-[#536059]">
                      Gambar Pengabdian
                    </label>

                    <span className="text-[11px] text-[#9AA49F]">
                      Semua format gambar
                    </span>
                  </div>

                  <div className="rounded-2xl border border-dashed border-[#C9D7CB] bg-[#FAFCFA] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-[#EEF3EF] sm:w-[200px]">
                        {form.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={form.image}
                            alt="Preview gambar pengabdian"
                            className="block h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center text-[#9AA49F]">
                            <ImagePlus size={22} strokeWidth={1.5} />
                            <span className="mt-1 text-[11px]">Belum ada gambar</span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#536059]">
                          Tambahkan gambar pengabdian
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-[#929C96]">
                          Gunakan gambar dokumentasi kegiatan pengabdian. Semua jenis gambar dan resolusi bisa dipakai.
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
                    ? "Simpan Pengabdian"
                    : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* =====================================================
          VIEW MODAL
      ===================================================== */}

      {modal === "view" && selected && (
        <ModalShell onClose={closeModal} maxWidth="max-w-[660px]">
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title="Detail Pengabdian"
              subtitle="Informasi lengkap pengabdian."
              onClose={closeModal}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <Thumb
                src={selected.image}
                className="mb-5 aspect-video w-full rounded-2xl"
                iconSize={30}
              />

              <h3 className="text-[17px] font-semibold leading-[1.45] text-[#26352D] sm:text-[19px]">
                {selected.title}
              </h3>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Ketua Pengusul" value={selected.leader} />
                <DetailItem
                  label="Mitra"
                  value={selected.partner || "Belum dicantumkan"}
                />
                <DetailItem
                  label="Bidang Fokus"
                  value={selected.field || "Belum dicantumkan"}
                />
                <DetailItem label="Program" value={selected.program} />
                <DetailItem
                  label="Kelompok"
                  value={selected.group ? `Program ${selected.group}` : "-"}
                />
                <DetailItem label="Tahun" value={selected.year} />
              </div>

              <div className="mt-5">
                <p className="text-[12px] font-medium text-[#536059]">Ringkasan</p>

                <p className="mt-2 whitespace-pre-line text-[13px] leading-7 text-[#6E7A73]">
                  {selected.abstract || "Belum ada ringkasan pengabdian."}
                </p>
              </div>

              {selected.members.length > 0 && (
                <div className="mt-5">
                  <p className="text-[12px] font-medium text-[#536059]">
                    Anggota Tim
                  </p>

                  <ul className="mt-2 list-inside list-disc space-y-1 text-[13px] leading-6 text-[#6E7A73]">
                    {selected.members.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.keywords.length > 0 && (
                <div className="mt-5">
                  <p className="text-[12px] font-medium text-[#536059]">Kata Kunci</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.keywords.map((word) => (
                      <span
                        key={word}
                        className="rounded-full bg-[#E3F1E4] px-2.5 py-1 text-[11.5px] font-medium text-[#2E7D32]"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
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
          title="Hapus Pengabdian?"
          onCancel={closeModal}
          onConfirm={handleDelete}
          loading={saving}
          error={saveError}
        >
          Data pengabdian{" "}
          <span className="font-medium text-[#475569]">{selected.title}</span>{" "}
          akan dihapus secara permanen dan tidak dapat dipulihkan.
        </ConfirmDelete>
      )}
    </div>
  );
}

/* =========================================================
   GAMBAR KECIL (16:9) dengan cadangan kalau belum ada gambar
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
        <div className="flex h-full w-full items-center justify-center text-[#9AA49F]">
          <ImagePlus size={iconSize} strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TAG INPUT (anggota tim dan kata kunci)
   commaAdds=false untuk nama, karena gelar memakai koma
   (contoh: "Dr. Rina, S.Kom., M.Kom.").
========================================================= */

function TagInput({
  values,
  onChange,
  placeholder,
  commaAdds = true,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  commaAdds?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const tag = (commaAdds ? draft.replace(/,/g, "") : draft).trim();

    if (tag && !values.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      onChange([...values, tag]);
    }

    setDraft("");
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || (commaAdds && event.key === ",")) {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="rounded-xl border border-[#DCE4DE] bg-white p-2.5 transition focus-within:border-[#2E7D32] focus-within:ring-4 focus-within:ring-[#2E7D32]/10">
      <div className="flex flex-wrap gap-1.5">
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#E3F1E4] py-1 pl-2.5 pr-1.5 text-[11.5px] font-medium leading-tight text-[#2E7D32]"
          >
            <span className="break-words">{tag}</span>
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== tag))}
              aria-label={`Hapus ${tag}`}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition hover:bg-[#2E7D32] hover:text-white"
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
          placeholder={values.length === 0 ? placeholder : "Tambah..."}
          className="h-7 min-w-[160px] flex-1 bg-transparent px-1 text-[13px] text-[#2B3830] outline-none placeholder:text-[#A3ADA7]"
        />
      </div>
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