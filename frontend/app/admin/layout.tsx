import type { ReactNode } from "react";

import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  AdminMain,
  SidebarProvider,
} from "@/components/admin/SidebarContext";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#F4F7F4]">
        <AdminHeader />
        <AdminSidebar />

        <AdminMain>{children}</AdminMain>
      </div>
    </SidebarProvider>
  );
}