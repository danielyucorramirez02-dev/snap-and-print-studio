"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";

const PAGE_TITLES: Record<string, string> = {
  "/calendar": "Calendar",
  "/payments": "Payments",
  "/services": "Services",
  "/inventory": "Inventory",
  "/reports": "Reports",
  "/gallery": "Client Gallery",
  "/content": "Content Bank",
  "/caption": "Caption Generator",
  "/expenses": "Expenses",
  "/settings": "Settings",
};

interface HeaderProps {
  fullName: string;
  role: UserRole;
  onMenuToggle: () => void;
}

export default function Header({ fullName, role, onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? "Dashboard";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#181713]/85 px-4 shadow-sm shadow-black/10 backdrop-blur-xl lg:px-7">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-charcoal-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-400/80">Studio OS</p>
          <h1 className="text-base font-semibold text-white lg:text-lg">{pageTitle}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-400/30 bg-brand-500/15 shadow-sm shadow-brand-950/20">
            <User size={15} className="text-brand-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-tight text-white">{fullName}</p>
            <Badge
              variant={role === "owner" ? "default" : "secondary"}
              className={
                role === "owner"
                  ? "border-brand-500/30 bg-brand-500/20 px-1.5 py-0 text-[10px] text-brand-400"
                  : "px-1.5 py-0 text-[10px]"
              }
            >
              {role === "owner" ? "Owner" : "Staff"}
            </Badge>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-charcoal-400 hover:bg-white/5 hover:text-white"
          title="Sign out"
        >
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  );
}
