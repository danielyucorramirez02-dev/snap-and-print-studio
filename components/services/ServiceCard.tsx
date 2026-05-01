"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/utils/formatters";
import type { Service } from "@/types";
import { Clock, Edit2, Archive, RotateCcw, CheckCircle2 } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  "self-shoot": "Self-Shoot",
  milestone: "Milestone",
  coverage: "Photo Coverage",
};

const CATEGORY_STYLES: Record<string, string> = {
  "self-shoot": "bg-brand-500/10 text-brand-400 border-brand-500/20",
  milestone: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  coverage: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

interface ServiceCardProps {
  service: Service;
  isOwner: boolean;
  onEdit: (service: Service) => void;
  onToggleActive: (service: Service) => void;
}

export default function ServiceCard({
  service,
  isOwner,
  onEdit,
  onToggleActive,
}: ServiceCardProps) {
  const cat = service.category ?? "self-shoot";
  const categoryLabel = CATEGORY_LABELS[cat] ?? "Package";
  const categoryStyle = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES["self-shoot"];

  return (
    <Card
      className={`bg-charcoal-900 border-charcoal-700 flex flex-col transition-opacity ${
        !service.is_active ? "opacity-50" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border mb-2 ${categoryStyle}`}
            >
              {categoryLabel}
            </span>
            {!service.is_active && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-charcoal-800 text-charcoal-500 border-charcoal-700">
                Archived
              </span>
            )}
            <h3 className="text-white font-semibold text-base leading-tight">
              {service.name}
            </h3>
            {service.description && (
              <p className="text-charcoal-400 text-xs mt-1 leading-snug">
                {service.description}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-brand-400 font-bold text-xl">
              {formatPeso(service.price)}
            </p>
            <div className="flex items-center gap-1 text-charcoal-400 text-xs mt-1 justify-end">
              <Clock size={12} />
              <span>{service.duration_minutes} min</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0 flex flex-col">
        <ul className="space-y-1.5 flex-1">
          {service.inclusions.map((inc, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-charcoal-300">
              <CheckCircle2
                size={13}
                className="text-brand-500 mt-0.5 shrink-0"
              />
              <span>{inc}</span>
            </li>
          ))}
        </ul>

        {isOwner && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-charcoal-800">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800"
              onClick={() => onEdit(service)}
            >
              <Edit2 size={13} className="mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`flex-1 border-charcoal-700 hover:bg-charcoal-800 ${
                service.is_active
                  ? "text-charcoal-400 hover:text-amber-400"
                  : "text-charcoal-400 hover:text-green-400"
              }`}
              onClick={() => onToggleActive(service)}
            >
              {service.is_active ? (
                <>
                  <Archive size={13} className="mr-1" />
                  Archive
                </>
              ) : (
                <>
                  <RotateCcw size={13} className="mr-1" />
                  Restore
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
