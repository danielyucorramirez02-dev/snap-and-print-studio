"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import StudioLogo from "@/components/shared/StudioLogo";
import { X, CalendarDays, CreditCard, Package, BarChart3, Images, Receipt, Layers, Settings, Sparkles, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const navItems = [
  { href: "/new-booking", label: "New Booking",        icon: PlusCircle,   roles: ["owner", "staff"] as UserRole[] },
  { href: "/calendar",    label: "Calendar",            icon: CalendarDays, roles: ["owner", "staff"] as UserRole[] },
  { href: "/payments",    label: "Payments",            icon: CreditCard,   roles: ["owner", "staff"] as UserRole[] },
  { href: "/services",  label: "Services",           icon: Layers,       roles: ["owner", "staff"] as UserRole[] },
  { href: "/inventory", label: "Inventory",          icon: Package,      roles: ["owner", "staff"] as UserRole[] },
  { href: "/reports",   label: "Reports",            icon: BarChart3,    roles: ["owner"] as UserRole[] },
  { href: "/gallery",   label: "Client Gallery",     icon: Images,       roles: ["owner", "staff"] as UserRole[] },
  { href: "/caption",   label: "Caption Generator",  icon: Sparkles,     roles: ["owner", "staff"] as UserRole[] },
  { href: "/expenses",  label: "Expenses",           icon: Receipt,      roles: ["owner"] as UserRole[] },
  { href: "/settings",  label: "Settings",           icon: Settings,     roles: ["owner"] as UserRole[] },
];

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
        "fixed top-0 left-0 bottom-0 z-50 w-64 bg-charcoal-950 border-r border-charcoal-800 flex flex-col transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:static lg:translate-x-0"
      )}>
        {/* Logo / Brand */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-charcoal-800">
          <div className="flex items-center gap-3">
            <StudioLogo size={36} className="shrink-0" />
            <div>
              <p className="text-sm font-bold text-white leading-tight">Snap &amp; Print</p>
              <p className="text-xs text-charcoal-400">Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-charcoal-400 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
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
    </>
  );
}
