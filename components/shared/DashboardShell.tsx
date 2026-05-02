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
    <div className="flex min-h-screen bg-charcoal-950">
      <Sidebar
        userRole={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          fullName={fullName}
          role={role}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
