"use client";

import { Poppins } from "next/font/google";
import { Bell, UserCircle } from "lucide-react";
import { usePathname } from "next/navigation";

import { useSidebar } from "@/components/admin/SidebarContext";


const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const pageInfo: Record<
  string,
  {
    title: string;
    subtitle: string;
  }
> = {
  "/admin": {
    title: "DASHBOARD",
    subtitle: "Ringkasan dan informasi sistem P2M Polibatam.",
  },

  "/admin/penelitian": {
    title: "PENELITIAN",
    subtitle: "Tambah, kelola, dan atur data penelitian yang ada.",
  },

  "/admin/pengabdian": {
    title: "PENGABDIAN",
    subtitle: "Tambah, kelola, dan atur data pengabdian yang ada.",
  },

  "/admin/publikasi": {
    title: "PUBLIKASI",
    subtitle: "Tambah, kelola, dan atur data publikasi yang ada.",
  },

  "/admin/hki": {
    title: "HKI",
    subtitle: "Tambah, kelola, dan atur data HKI yang ada.",
  },

  "/admin/informasi": {
    title: "INFORMASI",
    subtitle: "Tambah, kelola, dan atur informasi yang ditampilkan.",
  },

  "/admin/profil": {
    title: "PROFIL",
    subtitle: "Kelola informasi profil P2M Polibatam.",
  },

  "/admin/pengaturan": {
    title: "PENGATURAN",
    subtitle: "Kelola pengaturan akun dan sistem P2M.",
  },
};

export default function AdminHeader() {
  const pathname = usePathname();
  const { open, toggle } = useSidebar();

  const matchedPath =
    Object.keys(pageInfo)
      .sort((a, b) => b.length - a.length)
      .find(
        (path) =>
          pathname === path || pathname.startsWith(`${path}/`)
      ) ?? "/admin";

  const currentPage = pageInfo[matchedPath];

  return (
    <header
      className={`${poppins.className} fixed left-0 right-0 top-0 z-[100] flex h-[84px] shrink-0 bg-[#2E7D32]`}
    >
      {/* =====================================================
          LEFT BRAND AREA — SAMA DENGAN LEBAR SIDEBAR
          ===================================================== */}
      <div
        className={`relative flex h-full shrink-0 items-center ${
          open ? "w-[210px]" : "w-[64px] justify-center"
        }`}
      >
        {/* Logo: tepat di tengah area kiri saat sidebar terbuka,
            hilang saat sidebar ditutup (tinggal hamburger di kiri) */}
        {open && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <img
              src="/img/logo-polibatam2.png"
              alt="Politeknik Negeri Batam"
              className="h-auto w-[105px] translate-y-[1px] object-contain"
            />
          </div>
        )}

        {/* Hamburger */}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Tutup menu samping" : "Buka menu samping"}
          aria-expanded={open}
          className={`relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[8px] border-0 bg-transparent p-0 transition-colors hover:bg-white/10 ${
            open ? "ml-auto mr-[10px]" : ""
          }`}
        >
          <div className="flex flex-col gap-[4px]">
            <span className="block h-[2px] w-[17px] rounded-full bg-white" />
            <span className="block h-[2px] w-[17px] rounded-full bg-white" />
            <span className="block h-[2px] w-[17px] rounded-full bg-white" />
          </div>
        </button>
      </div>

      {/* =====================================================
          PAGE TITLE
          ===================================================== */}
      <div className="flex min-w-0 flex-1 items-center justify-between px-[28px]">
        {/* Title + Subtitle */}
        <div className="min-w-0">
          <h1 className="m-0 text-[18px] font-bold leading-[1.3] text-white">
            {currentPage.title}
          </h1>

          <p className="m-0 mt-[2px] truncate text-[13px] leading-[1.4] text-[#C6E6CB]">
            {currentPage.subtitle}
          </p>
        </div>

        {/* =====================================================
            RIGHT AREA
            ===================================================== */}
        <div className="flex shrink-0 items-center gap-[10px]">
          {/* Notification */}
          <button
            type="button"
            aria-label="Notifikasi"
            className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border-0 bg-white/[0.08] text-white transition-colors hover:bg-white/[0.14]"
          >
            <Bell
              size={17}
              strokeWidth={2}
            />

            {/* Notification dot */}
            <span className="absolute right-[8px] top-[7px] h-[5px] w-[5px] rounded-full bg-[#FF5252]" />
          </button>

          {/* Admin */}
          <button
            type="button"
            className="flex items-center gap-[7px] border-0 bg-transparent p-0 text-white"
          >
            <UserCircle
              size={27}
              strokeWidth={1.8}
            />

            <span className="text-[13px] font-semibold">
              Admin
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}