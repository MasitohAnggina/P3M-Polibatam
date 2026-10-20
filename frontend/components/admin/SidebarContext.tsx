"use client";

// src/components/admin/SidebarContext.tsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* Status buka/tutup sidebar, dipakai bersama oleh header (tombol hamburger),
   sidebar, dan area isi halaman. Pilihan terakhir diingat di browser. */

const STORAGE_KEY = "p3m_sidebar_open";

/* layar lebih kecil dari ini: sidebar tertutup secara bawaan */
const MOBILE_QUERY = "(max-width: 767px)";

type SidebarState = {
  open: boolean;
  toggle: () => void;
  /* false sampai status tersimpan selesai dibaca; dipakai agar animasi
     tidak berjalan saat halaman pertama kali dimuat */
  ready: boolean;
};

const SidebarContext = createContext<SidebarState | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let saved: string | null = null;

    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* abaikan */
    }

    if (saved === "1") setOpen(true);
    else if (saved === "0") setOpen(false);
    else setOpen(!window.matchMedia(MOBILE_QUERY).matches);

    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    setOpen((current) => {
      const next = !current;

      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* abaikan */
      }

      return next;
    });
  }, []);

  const value = useMemo(() => ({ open, toggle, ready }), [open, toggle, ready]);

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarState {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar harus dipakai di dalam <SidebarProvider>.");
  }

  return context;
}

/* Area isi halaman: jarak kiri 210px (selebar sidebar) saat sidebar
   terbuka, dan 0 saat tertutup sehingga halaman melebar penuh. */
export function AdminMain({ children }: { children: ReactNode }) {
  const { open, ready } = useSidebar();

  return (
    <main
      className={`min-h-screen pt-[84px] ${
        open ? "pl-[210px]" : "pl-0"
      } ${ready ? "transition-[padding] duration-300 ease-out motion-reduce:transition-none" : ""}`}
    >
      {children}
    </main>
  );
}