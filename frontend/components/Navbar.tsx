"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Poppins } from "next/font/google";
import { ChevronDown, Menu, Search, X } from "lucide-react";

/* Poppins bukan variable font, jadi weight harus ditulis */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

type NavItem = { label: string; href: string };

const BEFORE_PROFIL: NavItem[] = [{ label: "Beranda", href: "/" }];

/* Profil sekarang punya sub menu */
const PROFIL_SUBMENU: NavItem[] = [
  { label: "Profil P2M", href: "/profil" },
  { label: "Profil Peneliti", href: "/profil-peneliti" },
];

const BEFORE_HKI: NavItem[] = [
  { label: "Penelitian", href: "/penelitian" },
  { label: "Pengabdian", href: "/pengabdian" },
];

const HKI_SUBMENU: NavItem[] = [
  { label: "Pendaftaran HKI", href: "/hki/pendaftaran" },
  { label: "HKI", href: "/hki/hki" },
];

const AFTER_HKI: NavItem[] = [{ label: "Publikasi", href: "/publikasi" }];

/* Informasi sekarang punya sub menu */
const INFORMASI_SUBMENU: NavItem[] = [
  { label: "Pengumuman & Berita", href: "/informasi" },
  { label: "Dokumen & Panduan", href: "/dokumen-dan-panduan" },
];

const AFTER_INFORMASI: NavItem[] = [
  { label: "Infografis", href: "/infografis" },
];

const LANGUAGES = [
  {
    code: "ID",
    name: "Indonesia",
    flag: "🇮🇩",
  },
  {
    code: "EN",
    name: "English",
    flag: "🇬🇧",
  },
];

/* =========================================================
   KOMPONEN KECIL (dipakai ulang oleh Profil, HKI, Informasi)
========================================================= */

/* link biasa di navbar desktop */
function DesktopLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`relative px-3 py-2 text-[13px] font-medium transition-colors ${
        active ? "text-[#2E7D32]" : "text-[#4B554E] hover:text-[#2E7D32]"
      }`}
    >
      {item.label}

      {active && (
        <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#2E7D32]" />
      )}
    </Link>
  );
}

/* menu dengan sub menu.
   Status buka/tutup dikendalikan oleh Navbar (state), bukan CSS hover,
   supaya sub menu langsung menutup setelah salah satu linknya diklik
   atau setelah tombol menunya diklik lagi. */
function DesktopDropdown({
  label,
  items,
  pathname,
  open,
  onOpen,
  onClose,
  onToggle,
  align = "right",
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  align?: "left" | "right";
}) {
  const active = items.some((item) => item.href === pathname);

  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onBlur={(event) => {
        // tutup kalau fokus keyboard keluar dari menu ini
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`relative flex items-center gap-1 px-3 py-2 text-[13px] font-medium transition-colors hover:text-[#2E7D32] ${
          active || open ? "text-[#2E7D32]" : "text-[#4B554E]"
        }`}
      >
        {label}

        <ChevronDown
          size={13}
          strokeWidth={1.8}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />

        {active && (
          <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#2E7D32]" />
        )}
      </button>

      <div
        className={`absolute top-full w-[195px] pt-3 transition-all duration-200 ${
          align === "right" ? "right-0" : "left-0"
        } ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible translate-y-2 opacity-0"
        }`}
      >
        <div className="rounded-md border border-[#E1E6E1] bg-white py-2 shadow-[0_12px_35px_rgba(0,0,0,0.08)]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`block px-4 py-2.5 text-[13px] transition-colors hover:bg-[#F0F5F0] hover:text-[#2E7D32] ${
                pathname === item.href
                  ? "bg-[#F0F5F0] font-medium text-[#2E7D32]"
                  : "text-[#59635C]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* link biasa di menu mobile */
function MobileLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`border-b border-[#EDF0ED] py-3.5 text-[14px] font-medium ${
        active ? "text-[#2E7D32]" : "text-[#4B554E]"
      }`}
    >
      {item.label}
    </Link>
  );
}

/* kelompok dengan sub menu di menu mobile */
function MobileGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  const active = items.some((item) => item.href === pathname);

  return (
    <div className="border-b border-[#EDF0ED]">
      <p
        className={`py-3.5 text-[14px] font-medium ${
          active ? "text-[#2E7D32]" : "text-[#4B554E]"
        }`}
      >
        {label}
      </p>

      <div className="pb-2 pl-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`block py-2.5 text-[13px] ${
              pathname === item.href ? "font-medium text-[#2E7D32]" : "text-[#737C76]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   NAVBAR
   Menu desktop tampil mulai layar xl (1280px) supaya muat
   dengan ukuran huruf yang lebih besar. Di bawah itu dipakai
   tombol menu (hamburger).
========================================================= */

export default function Navbar() {
  const pathname = usePathname() ?? "";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);

  /* nama sub menu yang sedang terbuka di desktop ("Profil", "HKI", ...) */
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const navRef = useRef<HTMLElement>(null);

  const handleLanguageChange = (language: (typeof LANGUAGES)[number]) => {
    setSelectedLanguage(language);
    setLanguageOpen(false);
  };

  const closeMobile = () => setMobileOpen(false);

  const openDropdown = (name: string) => {
    setLanguageOpen(false);
    setOpenMenu(name);
  };

  const closeDropdown = (name: string) =>
    setOpenMenu((current) => (current === name ? null : current));

  const toggleDropdown = (name: string) => {
    setLanguageOpen(false);
    setOpenMenu((current) => (current === name ? null : name));
  };

  /* tutup sub menu / bahasa saat klik di luar navbar atau tekan Escape */
  useEffect(() => {
    if (!openMenu && !languageOpen) return;

    const closeAll = () => {
      setOpenMenu(null);
      setLanguageOpen(false);
    };

    const onPointerDown = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        closeAll();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAll();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu, languageOpen]);

  return (
    <header
      className={`${poppins.className} sticky top-0 z-50 border-b border-[#E5E7E5] bg-white/95 backdrop-blur-md`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center px-5 md:px-7">
        {/* =====================================================
            LOGO
        ===================================================== */}
        <Link href="/" className="shrink-0">
          <Image
            src="/img/logo-polibatam3.png"
            alt="Politeknik Negeri Batam"
            width={155}
            height={40}
            priority
            className="h-[38px] w-auto object-contain"
          />
        </Link>

        {/* =====================================================
            DESKTOP NAV
        ===================================================== */}
        <nav ref={navRef} className="ml-auto hidden items-center gap-1 xl:flex">
          {BEFORE_PROFIL.map((item) => (
            <DesktopLink key={item.href} item={item} active={pathname === item.href} />
          ))}

          {/* PROFIL (dengan sub menu) */}
          <DesktopDropdown
            label="Profil"
            items={PROFIL_SUBMENU}
            pathname={pathname}
            open={openMenu === "Profil"}
            onOpen={() => openDropdown("Profil")}
            onClose={() => closeDropdown("Profil")}
            onToggle={() => toggleDropdown("Profil")}
            align="left"
          />

          {BEFORE_HKI.map((item) => (
            <DesktopLink key={item.href} item={item} active={pathname === item.href} />
          ))}

          {/* HKI (dengan sub menu) */}
          <DesktopDropdown
            label="HKI"
            items={HKI_SUBMENU}
            pathname={pathname}
            open={openMenu === "HKI"}
            onOpen={() => openDropdown("HKI")}
            onClose={() => closeDropdown("HKI")}
            onToggle={() => toggleDropdown("HKI")}
          />

          {AFTER_HKI.map((item) => (
            <DesktopLink key={item.href} item={item} active={pathname === item.href} />
          ))}

          {/* INFORMASI (dengan sub menu) */}
          <DesktopDropdown
            label="Informasi"
            items={INFORMASI_SUBMENU}
            pathname={pathname}
            open={openMenu === "Informasi"}
            onOpen={() => openDropdown("Informasi")}
            onClose={() => closeDropdown("Informasi")}
            onToggle={() => toggleDropdown("Informasi")}
          />

          {AFTER_INFORMASI.map((item) => (
            <DesktopLink key={item.href} item={item} active={pathname === item.href} />
          ))}

          {/* ===================================================
              SEARCH
          =================================================== */}
          <div className="ml-3 flex h-[36px] w-[150px] items-center border-l border-[#E5E7E5] pl-4">
            <Search size={15} strokeWidth={1.7} className="mr-2 text-[#879088]" />

            <input
              type="text"
              placeholder="Cari..."
              aria-label="Cari"
              className="w-full bg-transparent text-[12px] text-[#465049] outline-none placeholder:text-[#9BA39D]"
            />
          </div>

          {/* ===================================================
              LANGUAGE DROPDOWN
          =================================================== */}
          <div className="relative ml-3">
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setLanguageOpen((prev) => !prev);
              }}
              aria-expanded={languageOpen}
              aria-haspopup="menu"
              className={`flex h-[36px] items-center gap-1.5 border-l border-[#E5E7E5] pl-4 text-[12px] font-medium transition-colors hover:text-[#2E7D32] ${
                languageOpen ? "text-[#2E7D32]" : "text-[#4B554E]"
              }`}
            >
              <span className="text-[16px] leading-none">{selectedLanguage.flag}</span>

              <span>{selectedLanguage.code}</span>

              <ChevronDown
                size={11}
                strokeWidth={1.8}
                className={`transition-transform duration-200 ${
                  languageOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {languageOpen && (
              <div className="absolute right-0 top-full z-50 w-[160px] pt-3">
                <div className="overflow-hidden rounded-md border border-[#E1E6E1] bg-white py-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.08)]">
                  {LANGUAGES.map((language) => {
                    const active = selectedLanguage.code === language.code;

                    return (
                      <button
                        key={language.code}
                        type="button"
                        onClick={() => handleLanguageChange(language)}
                        className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[12px] transition-colors ${
                          active
                            ? "bg-[#F0F5F0] text-[#2E7D32]"
                            : "text-[#59635C] hover:bg-[#F0F5F0] hover:text-[#2E7D32]"
                        }`}
                      >
                        <span className="text-[16px] leading-none">{language.flag}</span>

                        <span className="flex-1">{language.name}</span>

                        {active && <span className="text-[10px] font-semibold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* =====================================================
            MOBILE BUTTON
        ===================================================== */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="ml-auto flex h-10 w-10 items-center justify-center border border-[#DDE3DE] text-[#39433D] xl:hidden"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {/* =====================================================
          MOBILE MENU
      ===================================================== */}
      {mobileOpen && (
        <div className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-[#E5E7E5] bg-white px-5 py-5 xl:hidden">
          <nav className="flex flex-col">
            {BEFORE_PROFIL.map((item) => (
              <MobileLink
                key={item.href}
                item={item}
                active={pathname === item.href}
                onNavigate={closeMobile}
              />
            ))}

            <MobileGroup
              label="Profil"
              items={PROFIL_SUBMENU}
              pathname={pathname}
              onNavigate={closeMobile}
            />

            {BEFORE_HKI.map((item) => (
              <MobileLink
                key={item.href}
                item={item}
                active={pathname === item.href}
                onNavigate={closeMobile}
              />
            ))}

            <MobileGroup
              label="HKI"
              items={HKI_SUBMENU}
              pathname={pathname}
              onNavigate={closeMobile}
            />

            {AFTER_HKI.map((item) => (
              <MobileLink
                key={item.href}
                item={item}
                active={pathname === item.href}
                onNavigate={closeMobile}
              />
            ))}

            <MobileGroup
              label="Informasi"
              items={INFORMASI_SUBMENU}
              pathname={pathname}
              onNavigate={closeMobile}
            />

            {AFTER_INFORMASI.map((item) => (
              <MobileLink
                key={item.href}
                item={item}
                active={pathname === item.href}
                onNavigate={closeMobile}
              />
            ))}

            {/* MOBILE SEARCH */}
            <div className="mt-4 flex h-[42px] items-center border border-[#DDE3DE] px-3">
              <Search size={15} className="mr-2 text-[#8B958E]" />

              <input
                type="text"
                placeholder="Cari informasi..."
                aria-label="Cari informasi"
                className="w-full bg-transparent text-[13px] outline-none"
              />
            </div>

            {/* MOBILE LANGUAGE */}
            <div className="mt-4 border border-[#DDE3DE]">
              <p className="border-b border-[#EDF0ED] px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#89928C]">
                Bahasa
              </p>

              {LANGUAGES.map((language) => {
                const active = selectedLanguage.code === language.code;

                return (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => handleLanguageChange(language)}
                    className={`flex w-full items-center gap-2.5 px-3 py-3 text-left text-[13px] ${
                      active ? "text-[#2E7D32]" : "text-[#59635C]"
                    }`}
                  >
                    <span className="text-[17px]">{language.flag}</span>

                    <span className="flex-1">{language.name}</span>

                    {active && <span className="text-[11px] font-semibold">✓</span>}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}