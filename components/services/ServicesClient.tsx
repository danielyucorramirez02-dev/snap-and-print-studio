"use client";

import { useState, useMemo, useTransition } from "react";
import type { Service, UserRole } from "@/types";
import ServiceCard from "./ServiceCard";
import ServiceModal from "./ServiceModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toggleServiceActive } from "@/app/(dashboard)/services/actions";
import { Plus, Search, PackageOpen } from "lucide-react";

const TABS = [
  { id: "all", label: "All Packages" },
  { id: "self-shoot", label: "Self-Shoot" },
  { id: "milestone", label: "Milestone" },
  { id: "coverage", label: "Photo Coverage" },
];

interface ServicesClientProps {
  services: Service[];
  userRole: UserRole;
}

export default function ServicesClient({
  services,
  userRole,
}: ServicesClientProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  // undefined = closed | null = add mode | Service = edit mode
  const [editingService, setEditingService] = useState<
    Service | null | undefined
  >(undefined);
  const [, startTransition] = useTransition();

  const isOwner = userRole === "owner";

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchesTab =
        activeTab === "all" || s.category === activeTab;
      const matchesSearch = s.name
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [services, activeTab, search]);

  const handleToggleActive = (service: Service) => {
    startTransition(async () => {
      await toggleServiceActive(service.id, !service.is_active);
    });
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500 pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages..."
            className="pl-9 bg-charcoal-900 border-charcoal-700 text-white placeholder:text-charcoal-500 focus-visible:ring-brand-500"
          />
        </div>
        {isOwner && (
          <Button
            onClick={() => setEditingService(null)}
            className="bg-brand-500 hover:bg-brand-600 text-white shrink-0"
          >
            <Plus size={16} className="mr-2" />
            Add Package
          </Button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 mb-6 bg-charcoal-900 border border-charcoal-800 rounded-lg p-1 w-fit overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-brand-500/15 text-brand-400 border border-brand-500/25"
                : "text-charcoal-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Package Count */}
      <p className="text-charcoal-500 text-xs mb-4">
        {filtered.length} package{filtered.length !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageOpen size={40} className="text-charcoal-700 mb-3" />
          <p className="text-charcoal-400 font-medium">No packages found</p>
          {search && (
            <p className="text-charcoal-600 text-sm mt-1">
              Try a different search term
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isOwner={isOwner}
              onEdit={setEditingService}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {editingService !== undefined && (
        <ServiceModal
          service={editingService}
          onClose={() => setEditingService(undefined)}
        />
      )}
    </>
  );
}
