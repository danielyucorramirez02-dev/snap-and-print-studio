"use client";

import { useState } from "react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import type { UserRole } from "@/types";

interface DashboardShellProps {
  children: React.ReactNode;
  fullName: string;
  role: UserRole;
}

export default function DashboardShell({ children, fullName, role }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#141310] text-white">
      <Sidebar
        userRole={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex min-w-0 flex-col">
        <Header
          fullName={fullName}
          role={role}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto bg-[linear-gradient(180deg,#1d1b17_0%,#141310_260px)] px-4 py-5 sm:px-5 lg:px-7 lg:py-7">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
