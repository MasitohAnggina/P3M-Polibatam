"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Poppins } from "next/font/google";

import { Settings } from "lucide-react";

/* =========================================================
   ADMIN: PENGATURAN
   Letakkan di src/app/admin/pengaturan/page.tsx

   Isi: Profil (nama + email), Ganti Kata Sandi, dan Kontak P2M.
   Profil dan kata sandi memakai kolom yang sudah ada di tabel users
   (name, email, password). Kontak P2M butuh tabel sendiri.

   KONTRAK API (Laravel, Sanctum):
   GET /api/user                          -> { name, email } (atau { data: {...} })
   PUT /api/admin/pengaturan/profil       -> { name, email }
   PUT /api/admin/pengaturan/password     -> { password_lama, password, password_confirmation }
   GET /api/admin/pengaturan/kontak       -> { data: { alamat, email, telepon } }
   PUT /api/admin/pengaturan/kontak       -> { alamat, email, telepon } -> { data: {...} }
   Publik: GET /api/kontak                -> { data: { alamat, email, telepon } }
   (dipakai halaman Profil P2M dan footer)
========================================================= */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

/* =========================================================
   API + TOKEN (sama dengan halaman admin lainnya)
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

function authHeaders(json = false): Record<string, string> {
  const token = getToken();

  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* Perbarui salinan data admin di browser (kalau ada), supaya bagian lain
   yang membacanya tidak menampilkan nama/email lama setelah refresh. */
function syncStoredUser(data: { name: string; email: string }) {
  if (typeof window === "undefined") return;

  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem("p3m_user");
      if (!raw) continue;

      store.setItem("p3m_user", JSON.stringify({ ...JSON.parse(raw), ...data }));
    } catch {
      /* abaikan */
    }
  }
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
   STYLE (sama dengan halaman admin lainnya)
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-[#DCE4DE] bg-white px-3.5 text-[13px] text-[#2B3830] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10 disabled:bg-[#F6F9F6] disabled:text-[#8A948E]";

const textareaClass =
  "w-full resize-none rounded-xl border border-[#DCE4DE] bg-white px-3.5 py-2.5 text-[13px] leading-6 text-[#2B3830] outline-none transition placeholder:text-[#A3ADA7] focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10 disabled:bg-[#F6F9F6] disabled:text-[#8A948E]";

const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#2E7D32] px-5 text-[13px] font-medium text-white transition hover:bg-[#1B5E20] disabled:cursor-not-allowed disabled:opacity-40";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Notice = { type: "success" | "error"; text: string } | null;

/* =========================================================
   HALAMAN
========================================================= */

export default function AdminPengaturanPage() {
  /* ---------- PROFIL ---------- */

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savedProfile, setSavedProfile] = useState({ name: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);

  /* ---------- KATA SANDI ---------- */

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);

  /* ---------- KONTAK P2M ---------- */

  const [loadingKontak, setLoadingKontak] = useState(true);
  const [savedKontak, setSavedKontak] = useState({
    alamat: "",
    email: "",
    telepon: "",
  });
  const [alamat, setAlamat] = useState("");
  const [kontakEmail, setKontakEmail] = useState("");
  const [telepon, setTelepon] = useState("");
  const [savingKontak, setSavingKontak] = useState(false);
  const [kontakNotice, setKontakNotice] = useState<Notice>(null);

  /* ---------- AMBIL DATA ADMIN ---------- */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/user`, {
          headers: authHeaders(),
          cache: "no-store",
        });

        if (!res.ok) throw new Error(await readError(res));

        const json = await res.json();
        /* bentuk respons /user bisa { data: {...} }, { user: {...} }, atau langsung { name, email } */
        const user = json?.data?.user ?? json?.data ?? json?.user ?? json;

        if (!cancelled) {
          const loaded = {
            name: String(user?.name ?? ""),
            email: String(user?.email ?? ""),
          };

          setSavedProfile(loaded);
          setName(loaded.name);
          setEmail(loaded.email);
        }
      } catch (err) {
        if (!cancelled) {
          setProfileNotice({
            type: "error",
            text: err instanceof Error ? err.message : "Gagal memuat data admin.",
          });
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- SIMPAN PROFIL ---------- */

  const profileChanged =
    name.trim() !== savedProfile.name || email.trim() !== savedProfile.email;

  const canSaveProfile =
    !loadingProfile &&
    profileChanged &&
    name.trim() !== "" &&
    EMAIL_PATTERN.test(email.trim());

  const handleSaveProfile = async () => {
    if (!canSaveProfile || savingProfile) return;

    setSavingProfile(true);
    setProfileNotice(null);

    try {
      const res = await fetch(`${API_URL}/admin/pengaturan/profil`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (!res.ok) throw new Error(await readError(res));

      const saved = { name: name.trim(), email: email.trim() };

      setSavedProfile(saved);
      setName(saved.name);
      setEmail(saved.email);
      syncStoredUser(saved);
      setProfileNotice({ type: "success", text: "Profil berhasil disimpan." });
    } catch (err) {
      setProfileNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal menyimpan profil.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  /* ---------- KONTAK P2M ---------- */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/pengaturan/kontak`, {
          headers: authHeaders(),
          cache: "no-store",
        });

        if (!res.ok) throw new Error(await readError(res));

        const json = await res.json();
        const data = json?.data ?? json;

        if (!cancelled) {
          const loaded = {
            alamat: String(data?.alamat ?? ""),
            email: String(data?.email ?? ""),
            telepon: String(data?.telepon ?? ""),
          };

          setSavedKontak(loaded);
          setAlamat(loaded.alamat);
          setKontakEmail(loaded.email);
          setTelepon(loaded.telepon);
        }
      } catch (err) {
        if (!cancelled) {
          setKontakNotice({
            type: "error",
            text: err instanceof Error ? err.message : "Gagal memuat data kontak.",
          });
        }
      } finally {
        if (!cancelled) setLoadingKontak(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const kontakChanged =
    alamat.trim() !== savedKontak.alamat ||
    kontakEmail.trim() !== savedKontak.email ||
    telepon.trim() !== savedKontak.telepon;

  const kontakEmailInvalid =
    kontakEmail.trim() !== "" && !EMAIL_PATTERN.test(kontakEmail.trim());

  const canSaveKontak = !loadingKontak && kontakChanged && !kontakEmailInvalid;

  const handleSaveKontak = async () => {
    if (!canSaveKontak || savingKontak) return;

    setSavingKontak(true);
    setKontakNotice(null);

    const payload = {
      alamat: alamat.trim(),
      email: kontakEmail.trim(),
      telepon: telepon.trim(),
    };

    try {
      const res = await fetch(`${API_URL}/admin/pengaturan/kontak`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await readError(res));

      setSavedKontak(payload);
      setKontakNotice({ type: "success", text: "Kontak berhasil disimpan." });
    } catch (err) {
      setKontakNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal menyimpan kontak.",
      });
    } finally {
      setSavingKontak(false);
    }
  };

  /* ---------- GANTI KATA SANDI ---------- */

  const passwordMismatch =
    confirmPassword !== "" && confirmPassword !== newPassword;

  const canSavePassword =
    oldPassword !== "" &&
    newPassword.length >= 8 &&
    confirmPassword === newPassword;

  const handleSavePassword = async () => {
    if (!canSavePassword || savingPassword) return;

    setSavingPassword(true);
    setPasswordNotice(null);

    try {
      const res = await fetch(`${API_URL}/admin/pengaturan/password`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({
          password_lama: oldPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      if (!res.ok) throw new Error(await readError(res));

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice({ type: "success", text: "Kata sandi berhasil diganti." });
    } catch (err) {
      setPasswordNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal mengganti kata sandi.",
      });
    } finally {
      setSavingPassword(false);
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
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_10px_rgba(38,53,45,0.06)]">
              <Settings size={18} strokeWidth={1.8} className="text-[#2E7D32]" />
            </div>

            <h1 className="text-[26px] font-medium tracking-[-0.02em] sm:text-[32px]">
              Pengaturan
            </h1>
          </div>

          <p className="mt-2 text-[13px] leading-6 text-[#7A867F] sm:ml-[52px]">
            Kelola akun admin dan kontak P2M.
          </p>
        </div>

        <div className="space-y-5">
          {/* PROFIL */}
          <SettingsCard title="Profil">
            <div className="grid gap-4">
              <FormField label="Nama">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loadingProfile || savingProfile}
                  placeholder={loadingProfile ? "Memuat..." : "Nama admin"}
                  autoComplete="name"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loadingProfile || savingProfile}
                  placeholder={loadingProfile ? "Memuat..." : "Email admin"}
                  autoComplete="email"
                  className={inputClass}
                />
              </FormField>

              {profileNotice && <Message notice={profileNotice} />}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={!canSaveProfile || savingProfile}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                {savingProfile ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </SettingsCard>

          {/* KATA SANDI */}
          <SettingsCard title="Kata Sandi">
            <div className="grid gap-4">
              <FormField label="Kata Sandi Lama">
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="current-password"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Kata Sandi Baru">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="new-password"
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-[#9AA49F]">Minimal 8 karakter.</p>
              </FormField>

              <FormField label="Konfirmasi Kata Sandi Baru">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="new-password"
                  className={inputClass}
                />
                {passwordMismatch && (
                  <p className="mt-1 text-[11px] text-[#B91C1C]">
                    Konfirmasi kata sandi tidak sama.
                  </p>
                )}
              </FormField>

              {passwordNotice && <Message notice={passwordNotice} />}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSavePassword}
                disabled={!canSavePassword || savingPassword}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                {savingPassword ? "Menyimpan..." : "Ganti Kata Sandi"}
              </button>
            </div>
          </SettingsCard>

          {/* KONTAK P2M */}
          <SettingsCard title="Kontak P2M">
            <div className="grid gap-4">
              <FormField label="Alamat">
                <textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  disabled={loadingKontak || savingKontak}
                  rows={3}
                  placeholder={loadingKontak ? "Memuat..." : "Alamat lengkap kantor P2M"}
                  className={textareaClass}
                />
              </FormField>

              <FormField label="Email">
                <input
                  type="email"
                  value={kontakEmail}
                  onChange={(e) => setKontakEmail(e.target.value)}
                  disabled={loadingKontak || savingKontak}
                  placeholder={loadingKontak ? "Memuat..." : "p2m@polibatam.ac.id"}
                  className={inputClass}
                />
                {kontakEmailInvalid && (
                  <p className="mt-1 text-[11px] text-[#B91C1C]">
                    Format email belum benar.
                  </p>
                )}
              </FormField>

              <FormField label="Telepon">
                <input
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  disabled={loadingKontak || savingKontak}
                  inputMode="tel"
                  placeholder={loadingKontak ? "Memuat..." : "Contoh: 0822-1199-6677"}
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-[#9AA49F]">
                  Kontak ini tampil di halaman Profil P2M.
                </p>
              </FormField>

              {kontakNotice && <Message notice={kontakNotice} />}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSaveKontak}
                disabled={!canSaveKontak || savingKontak}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                {savingKontak ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   KOMPONEN KECIL
========================================================= */

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full rounded-[28px] bg-white/70 p-3 shadow-[0_8px_30px_rgba(38,53,45,0.06)] backdrop-blur sm:p-4 md:p-5">
      <div className="rounded-[22px] bg-white px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="mb-5 text-[16px] font-semibold text-[#26352D] sm:text-[18px]">
          {title}
        </h2>

        {children}
      </div>
    </section>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-[#536059]">
        {label}
      </label>

      {children}
    </div>
  );
}

function Message({ notice }: { notice: NonNullable<Notice> }) {
  const isSuccess = notice.type === "success";

  return (
    <p
      role={isSuccess ? "status" : "alert"}
      className={`rounded-xl px-3.5 py-2.5 text-[12px] font-medium leading-5 ${
        isSuccess
          ? "bg-[#E3F1E4] text-[#1B5E20]"
          : "bg-[#FFF1F1] text-[#B91C1C]"
      }`}
    >
      {notice.text}
    </p>
  );
}