"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Poppins } from "next/font/google";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

type FieldErrors = { email?: string; password?: string };
type Toast = { type: "success" | "error" | "info"; message: string } | null;

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Notifikasi hilang otomatis.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => setToast(null),
      toast.type === "success" ? 2500 : 4000
    );
    return () => clearTimeout(timer);
  }, [toast]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    setToast(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password, remember }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          setFieldErrors({
            email: data.errors.email?.[0],
            password: data.errors.password?.[0],
          });
        } else if (response.status === 429) {
          setToast({
            type: "error",
            message: "Terlalu banyak percobaan. Coba lagi sebentar.",
          });
        } else {
          setToast({
            type: "error",
            message: data.message || "Email atau password tidak sesuai.",
          });
        }
        return;
      }

      const storage = remember ? localStorage : sessionStorage;
      const otherStorage = remember ? sessionStorage : localStorage;

      otherStorage.removeItem("p3m_user");
      otherStorage.removeItem("p3m_token");
      storage.setItem("p3m_user", JSON.stringify(data.user));
      storage.setItem("p3m_token", data.token);

      setToast({ type: "success", message: "Login berhasil. Mengalihkan..." });
      await new Promise((resolve) => setTimeout(resolve, 900));
      router.push("/admin/dashboard");
    } catch {
      setToast({
        type: "error",
        message: "Tidak dapat terhubung ke server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (error?: string) =>
    `h-11 w-full border-b bg-transparent pl-8 text-[13px] text-[#26332C] outline-none transition-colors placeholder:text-[#AAB3BD] ${
      error ? "border-red-400" : "border-[#D9DFE6]"
    }`;

  return (
    <main
      className={`${poppins.className} flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0b3d20] via-[#17703a] to-[#3cae5f] p-4`}
    >
      <style>{`
        @keyframes p3m-card-in { from { opacity: 0; transform: translateY(26px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes p3m-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

        .p3m-card { animation: p3m-card-in .8s cubic-bezier(.2,.8,.2,1) both; }
        .p3m-in-up { animation: p3m-fade-up .7s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes p3m-toast-in { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: none; } }
        .p3m-toast { animation: p3m-toast-in .35s cubic-bezier(.2,.8,.2,1) both; }

        .p3m-field .p3m-underline {
          position: absolute; left: 0; bottom: 0; height: 2px; width: 100%;
          background: #2e9e4f; transform: scaleX(0); transform-origin: left;
          transition: transform .35s cubic-bezier(.2,.8,.2,1);
        }
        .p3m-field:focus-within .p3m-underline { transform: scaleX(1); }
        .p3m-field:focus-within .p3m-icon { color: #2e9e4f; }

        @media (prefers-reduced-motion: reduce) {
          .p3m-card, .p3m-in-up, .p3m-toast { animation: none !important; }
        }
      `}</style>

      {/* Notifikasi (toast) */}
      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={`p3m-toast fixed inset-x-4 top-5 z-50 mx-auto flex max-w-[340px] items-start gap-3 rounded-xl border-l-4 bg-white px-4 py-3 shadow-[0_12px_32px_rgba(0,40,20,0.25)] ${
            toast.type === "success"
              ? "border-[#2e9e4f]"
              : toast.type === "error"
              ? "border-red-500"
              : "border-amber-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#2e9e4f]" />
          ) : toast.type === "error" ? (
            <XCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
          ) : (
            <Info size={20} className="mt-0.5 shrink-0 text-amber-500" />
          )}

          <p className="flex-1 text-[13px] leading-5 text-[#26332C]">
            {toast.message}
          </p>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="mt-0.5 shrink-0 text-[#9AA4B0] transition-colors hover:text-[#26332C]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="p3m-card relative flex w-full max-w-[360px] flex-col bg-white px-8 pb-6 pt-7 shadow-[0_30px_70px_rgba(0,40,20,0.35)]">
        {/* logo */}
        <div className="w-full">
          <div className="flex items-center justify-between">
            <h1
              className="p3m-in-up text-[18px] font-semibold tracking-wide text-[#2e9e4f]"
              style={{ animationDelay: ".2s" }}
            >
              LOGIN
            </h1>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={22} strokeWidth={1.8} className="text-[#2e9e4f]" />
              <span className="text-[14px] font-semibold text-[#2e9e4f]">P3M</span>
            </div>
          </div>

          <form onSubmit={handleLogin} noValidate className="mt-5">
            {/* Email */}
            <div className="p3m-in-up" style={{ animationDelay: ".3s" }}>
              <div className="p3m-field relative">
                <User
                  size={17}
                  strokeWidth={1.6}
                  className="p3m-icon absolute left-0 top-1/2 -translate-y-1/2 text-[#8A95A3] transition-colors"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                  autoFocus
                  required
                  aria-invalid={!!fieldErrors.email}
                  className={inputClass(fieldErrors.email)}
                />
                <span className="p3m-underline" />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="p3m-in-up mt-6" style={{ animationDelay: ".4s" }}>
              <div className="p3m-field relative">
                <Lock
                  size={17}
                  strokeWidth={1.6}
                  className="p3m-icon absolute left-0 top-1/2 -translate-y-1/2 text-[#8A95A3] transition-colors"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  aria-label="Password"
                  autoComplete="current-password"
                  required
                  aria-invalid={!!fieldErrors.password}
                  className={`${inputClass(fieldErrors.password)} pr-[118px]`}
                />
                <span className="p3m-underline" />

                <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    className="text-[#8A95A3] transition-colors hover:text-[#2e9e4f]"
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.7} />
                    ) : (
                      <Eye size={16} strokeWidth={1.7} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setToast({
                        type: "info",
                        message: "Fitur lupa password belum tersedia.",
                      })
                    }
                    className="text-[10px] font-medium uppercase tracking-wide text-[#2e9e4f] transition-colors hover:text-[#237a3c]"
                  >
                    Lupa password?
                  </button>
                </div>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="p3m-in-up mt-6 flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#2e9e4f] to-[#4cc06d] text-[13px] font-medium tracking-wider text-white shadow-[0_8px_20px_rgba(46,158,79,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(46,158,79,0.45)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ animationDelay: ".5s" }}
            >
              {isLoading ? <Loader2 size={17} className="animate-spin" /> : "LOGIN"}
            </button>

            {/* Remember me */}
            <div
              className="p3m-in-up mt-4 flex justify-end"
              style={{ animationDelay: ".6s" }}
            >
              <label className="flex cursor-pointer select-none items-center gap-2 text-[12px] text-[#5A6572]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#CBD3DC] accent-[#2e9e4f]"
                />
                Ingat saya
              </label>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] text-[#9AA4B0]">
          © P3M Polibatam
        </p>
      </div>
    </main>
  );
}