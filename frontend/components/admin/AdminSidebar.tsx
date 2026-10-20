"use client";

import { Poppins } from "next/font/google";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSidebar } from "@/components/admin/SidebarContext";
import {
  BookOpen,
  ChevronDown,
  Copyright,
  FileText,
  FlaskConical,
  HandHeart,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";

/* sesuaikan dengan alamat halaman login dan API kamu */

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const LOGIN_PATH = "/auth/login";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

type NavItem = {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: {
    label: string;
    href: string;
  }[];
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Profil",
    icon: UserCircle,
    children: [
      {
        label: "Struktur Organisasi",
        href: "/admin/profil/struktur-organisasi",
      },
      {
        label: "Profil Peneliti",
        href: "/admin/profil/profil-peneliti",
      },
    ],
  },
  {
    label: "Penelitian",
    href: "/admin/penelitian",
    icon: FlaskConical,
  },
  {
    label: "Pengabdian",
    href: "/admin/pengabdian",
    icon: HandHeart,
  },
  {
    label: "Publikasi",
    href: "/admin/publikasi",
    icon: BookOpen,
  },
  {
    label: "HKI",
    icon: Copyright,
    children: [
      { label: "Data HKI", href: "/admin/hki" },
      { label: "Tim Pengelola", href: "/admin/pengelola-hki" },
    ],
  },
  {
    /* Pengumuman dan Agenda dikelola sebagai kategori di "Berita & Informasi" */
    label: "Informasi",
    icon: FileText,
    children: [
      { label: "Berita & Informasi", href: "/admin/informasi" },
      { label: "Dokumen & Panduan", href: "/admin/dokumen-panduan" },
    ],
  },

  {
    label: "Pengaturan",
    href: "/admin/pengaturan",
    icon: Settings,
  },
];

/* Semua alamat menu. Menu aktif = alamat PALING PANJANG yang cocok,
   jadi di /admin/hki/tim-pengelola hanya "Tim Pengelola" yang menyala,
   bukan "Data HKI" juga. */
const allHrefs = navItems.flatMap((item) =>
  item.children ? item.children.map((c) => c.href) : item.href ? [item.href] : []
);

function getActiveHref(pathname: string) {
  return (
    allHrefs
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] ?? null
  );
}

/* nama menu induk yang berisi halaman aktif */
function getActiveParent(pathname: string) {
  const active = getActiveHref(pathname);

  return (
    navItems.find((item) =>
      item.children?.some((child) => child.href === active)
    )?.label ?? null
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open: sidebarOpen, ready } = useSidebar();

  const activeHref = getActiveHref(pathname);

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const parent = getActiveParent(pathname);
    return parent ? { [parent]: true } : {};
  });

  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* popup konfirmasi: Escape menutup (kecuali saat proses keluar berjalan) */
  useEffect(() => {
    if (!confirmOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loggingOut) setConfirmOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, loggingOut]);

  /* pindah halaman: buka menu induk yang aktif, menu lain dibiarkan
     (tidak ikut menutup) */
  useEffect(() => {
    const parent = getActiveParent(pathname);

    if (parent) {
      setOpenMenus((prev) =>
        prev[parent] ? prev : { ...prev, [parent]: true }
      );
    }
  }, [pathname]);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  /* keluar: hapus token di server, bersihkan sesi di browser,
     lalu kembali ke halaman login */
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const token =
        localStorage.getItem("p3m_token") ??
        sessionStorage.getItem("p3m_token");

      if (token) {
        await fetch(`${API_URL}/logout`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      /* server tidak terjangkau: tetap lanjut keluar */
    }

    try {
      ["p3m_token", "p3m_user"].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch {
      /* abaikan */
    }

    router.replace(LOGIN_PATH);
  };

  return (
    <>
    <aside
      aria-label="Menu admin"
      className={`${poppins.className} fixed bottom-0 left-0 top-[84px] z-[90] flex w-[210px] flex-col border-r-[1.5px] border-[#E0E0E0] bg-white ${
        ready
          ? "transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none"
          : ""
      } ${sidebarOpen ? "" : "invisible -translate-x-full"}`}
    >
      {/* PROFILE */}
      <div className="shrink-0 border-b-[1.5px] border-[#E0E0E0] px-[14px] py-[10px]">
        <div className="flex items-center gap-[10px]">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E8F5E9] text-[#2E7D32]">
            <UserCircle size={27} strokeWidth={1.7} />
          </div>

          <div>
            <p className="text-[13px] font-semibold leading-4 text-[#34423A]">
              Profile
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex flex-1 flex-col gap-[2px] overflow-y-auto px-[10px] py-[10px]">
        {navItems.map((item) => {
          const Icon = item.icon;

          /* ITEM TANPA SUBMENU */
          if (!item.children) {
            const isActive = item.href === activeHref;

            return (
              <Link
                key={item.label}
                href={item.href ?? "#"}
                aria-current={isActive ? "page" : undefined}
                className={`group flex items-center gap-[10px] rounded-[8px] px-[12px] py-[9px] text-[13px] font-medium no-underline transition-all duration-150 ${
                  isActive
                    ? "bg-[#E8F5E9] text-[#2E7D32]"
                    : "text-[#666666] hover:bg-[#F5F7F5] hover:text-[#2E7D32]"
                }`}
              >
                <Icon size={17} strokeWidth={1.8} className="shrink-0" />

                <span>{item.label}</span>
              </Link>
            );
          }

          /* ITEM DENGAN SUBMENU */
          const isOpen = openMenus[item.label] ?? false;
          const hasActiveChild = item.children.some(
            (child) => child.href === activeHref
          );

          return (
            <div key={item.label}>
              {/* PARENT MENU */}
              <button
                type="button"
                onClick={() => toggleMenu(item.label)}
                aria-expanded={isOpen}
                className={`group flex w-full items-center justify-between rounded-[8px] border-0 bg-transparent px-[12px] py-[9px] text-[13px] font-medium transition-all duration-150 hover:bg-[#F5F7F5] hover:text-[#2E7D32] ${
                  hasActiveChild ? "text-[#2E7D32]" : "text-[#666666]"
                }`}
              >
                <span className="flex items-center gap-[10px]">
                  <Icon size={17} strokeWidth={1.8} className="shrink-0" />

                  <span>{item.label}</span>
                </span>

                <ChevronDown
                  size={15}
                  strokeWidth={1.8}
                  className={`shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* SUBMENU */}
              {isOpen && (
                <div className="ml-[18px] mt-[2px] border-l border-[#E5E7E5] pl-[10px]">
                  {item.children.map((child) => {
                    const isActive = child.href === activeHref;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative flex items-center rounded-[7px] px-[10px] py-[7px] text-[12px] font-medium no-underline transition-all duration-150 ${
                          isActive
                            ? "bg-[#E8F5E9] text-[#2E7D32]"
                            : "text-[#777777] hover:bg-[#F5F7F5] hover:text-[#2E7D32]"
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <div className="shrink-0 border-t-[1.5px] border-[#E0E0E0] p-[10px]">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex w-full items-center gap-[10px] rounded-[8px] border-0 bg-transparent px-[12px] py-[9px] text-[13px] font-medium text-[#777777] transition-all duration-150 hover:bg-[#FFF5F5] hover:text-[#DC2626]"
        >
          <LogOut size={17} strokeWidth={1.8} />

          <span>Logout</span>
        </button>
      </div>

    </aside>

      {/* POPUP KONFIRMASI LOGOUT */}
      {confirmOpen && (
        <div
          className={`${poppins.className} fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/45 px-4 backdrop-blur-[2px]`}
          onClick={() => {
            if (!loggingOut) setConfirmOpen(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[320px] rounded-[18px] bg-white px-6 pb-5 pt-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
              <LogOut size={22} strokeWidth={1.8} />
            </div>

            <h2
              id="logout-title"
              className="mt-3 text-[16px] font-semibold text-[#26352D]"
            >
              Logout
            </h2>

            <p id="logout-desc" className="mt-1.5 text-[13px] text-[#6B7770]">
              Yakin ingin keluar?
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmOpen(false)}
                disabled={loggingOut}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-[#DCE4DE] bg-white px-5 text-[13px] font-medium text-[#5B675F] transition hover:bg-[#F4F7F4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-[#DC2626] px-5 text-[13px] font-medium text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? "Keluar..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}