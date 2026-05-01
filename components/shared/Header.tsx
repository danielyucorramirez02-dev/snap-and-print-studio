"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";

interface HeaderProps {
  fullName: string;
  role: UserRole;
  pageTitle: string;
}

export default function Header({ fullName, role, pageTitle }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 border-b border-charcoal-800 bg-charcoal-950/50 backdrop-blur-sm flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
            <User size={15} className="text-brand-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white leading-tight">{fullName}</p>
            <Badge
              variant={role === "owner" ? "default" : "secondary"}
              className={
                role === "owner"
                  ? "text-[10px] px-1.5 py-0 bg-brand-500/20 text-brand-400 border-brand-500/30"
                  : "text-[10px] px-1.5 py-0"
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
          className="text-charcoal-400 hover:text-white hover:bg-charcoal-800"
          title="Sign out"
        >
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  );
}
