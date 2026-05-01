"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import StudioLogo from "@/components/shared/StudioLogo";
import {
  CalendarDays,
  CreditCard,
  Package,
  BarChart3,
  Images,
  Receipt,
  Layers,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const navItems = [
  { href: "/calendar",  label: "Calendar",       icon: CalendarDays, roles: ["owner", "staff"] as UserRole[] },
  { href: "/payments",  label: "Payments",        icon: CreditCard,   roles: ["owner", "staff"] as UserRole[] },
  { href: "/services",  label: "Services",        icon: Layers,       roles: ["owner", "staff"] as UserRole[] },
  { href: "/inventory", label: "Inventory",       icon: Package,      roles: ["owner", "staff"] as UserRole[] },
  { href: "/reports",   label: "Reports",         icon: BarChart3,    roles: ["owner"] as UserRole[] },
  { href: "/gallery",   label: "Client Gallery",  icon: Images,       roles: ["owner", "staff"] as UserRole[] },
  { href: "/caption",   label: "Caption Generator", icon: Sparkles,   roles: ["owner", "staff"] as UserRole[] },
  { href: "/expenses",  label: "Expenses",        icon: Receipt,      roles: ["owner"] as UserRole[] },
  { href: "/settings",  label: "Settings",        icon: Settings,     roles: ["owner"] as UserRole[] },
];

interface SidebarProps {
  userRole: UserRole;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 min-h-screen bg-charcoal-950 border-r border-charcoal-800 flex flex-col">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-charcoal-800">
        <StudioLogo size={36} className="shrink-0" />
        <div>
          <p className="text-sm font-bold text-white leading-tight">Snap &amp; Print</p>
          <p className="text-xs text-charcoal-400">Studio</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-500/15 text-brand-400 border border-brand-500/20"
                  : "text-charcoal-400 hover:text-white hover:bg-charcoal-800"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-charcoal-800">
        <p className="text-xs text-charcoal-600">Snap &amp; Print Studio v1.0</p>
      </div>
    </aside>
  );
}
