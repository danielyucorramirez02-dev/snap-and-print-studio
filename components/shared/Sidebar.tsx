"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import StudioLogo from "@/components/shared/StudioLogo";
import { X, LayoutDashboard, CalendarDays, CreditCard, Package, BarChart3, Images, Receipt, Layers, Settings, Sparkles, PlusCircle, Frame, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const navItems = [
  { href: "/",            label: "Dashboard",           icon: LayoutDashboard, roles: ["owner", "staff"] as UserRole[] },
  { href: "/new-booking", label: "New Booking",        icon: PlusCircle,   roles: ["owner", "staff"] as UserRole[] },
  { href: "/calendar",    label: "Calendar",            icon: CalendarDays, roles: ["owner", "staff"] as UserRole[] },
  { href: "/payments",    label: "Payments",            icon: CreditCard,   roles: ["owner", "staff"] as UserRole[] },
  { href: "/services",  label: "Services",           icon: Layers,       roles: ["owner", "staff"] as UserRole[] },
  { href: "/inventory", label: "Inventory",          icon: Package,      roles: ["owner", "staff"] as UserRole[] },
  { href: "/reports",   label: "Reports",            icon: BarChart3,    roles: ["owner"] as UserRole[] },
  { href: "/gallery",   label: "Client Gallery",     icon: Images,       roles: ["owner", "staff"] as UserRole[] },
  { href: "/content",   label: "Content Bank",       icon: ClipboardList, roles: ["owner", "staff"] as UserRole[] },
  { href: "/caption",   label: "Caption Generator",  icon: Sparkles,     roles: ["owner", "staff"] as UserRole[] },
  { href: "/photo-tool", label: "Photo Tools",       icon: Frame,        roles: ["owner", "staff"] as UserRole[] },
  { href: "/expenses",  label: "Expenses",           icon: Receipt,      roles: ["owner"] as UserRole[] },
  { href: "/settings",  label: "Settings",           icon: Settings,     roles: ["owner"] as UserRole[] },
];

const roleLabel: Record<UserRole, string> = {
  owner: "Owner workspace",
  staff: "Staff workspace",
};

interface SidebarProps {
  userRole: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ userRole, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside className={cn(
        "fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#181713]/95 shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:static lg:translate-x-0"
      )}>
        {/* Logo / Brand */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-400/60"
            aria-label="Go to dashboard"
          >
            <div className="rounded-lg border border-brand-400/20 bg-brand-500/10 p-1 shadow-sm shadow-brand-950/30">
              <StudioLogo size={34} className="shrink-0" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Snap &amp; Print</p>
              <p className="text-xs text-charcoal-400">{roleLabel[userRole]}</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-charcoal-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "border-brand-400/25 bg-brand-500/15 text-brand-300 shadow-sm shadow-brand-950/20"
                    : "border-transparent text-charcoal-400 hover:border-white/10 hover:bg-white/[0.045] hover:text-white"
                )}
              >
                <Icon size={18} className={cn("transition-colors", isActive ? "text-brand-300" : "text-charcoal-500 group-hover:text-brand-300")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs font-medium text-charcoal-400">Studio OS</p>
          <p className="mt-0.5 text-[11px] text-charcoal-600">Snap &amp; Print Studio v1.0</p>
        </div>
      </aside>
    </>
  );
}
