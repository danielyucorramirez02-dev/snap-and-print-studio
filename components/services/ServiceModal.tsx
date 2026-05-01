"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema, type ServiceFormData, SERVICE_CATEGORIES } from "@/lib/validations/service";
import { createService, updateService } from "@/app/(dashboard)/services/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Service } from "@/types";
import { X } from "lucide-react";

interface ServiceModalProps {
  service: Service | null;
  onClose: () => void;
}

export default function ServiceModal({ service, onClose }: ServiceModalProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: service
      ? {
          name: service.name,
          category: (service.category ?? "self-shoot") as ServiceFormData["category"],
          description: service.description ?? "",
          price: service.price,
          duration_minutes: service.duration_minutes,
          inclusions: service.inclusions.join("\n"),
        }
      : {
          name: "",
          category: "self-shoot",
          description: "",
          price: undefined,
          duration_minutes: undefined,
          inclusions: "",
        },
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const onSubmit = (data: ServiceFormData) => {
    startTransition(async () => {
      const result = service
        ? await updateService(service.id, data)
        : await createService(data);

      if (result.error) {
        alert(result.error);
        return;
      }
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-charcoal-900 border border-charcoal-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-800">
          <h2 className="text-white font-semibold text-lg">
            {service ? "Edit Package" : "Add New Package"}
          </h2>
          <button
            onClick={onClose}
            className="text-charcoal-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300 text-sm">Package Name</Label>
            <Input
              {...register("name")}
              placeholder="e.g., Solo Muna Package"
              className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus-visible:ring-brand-500"
            />
            {errors.name && (
              <p className="text-red-400 text-xs">{errors.name.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300 text-sm">Category</Label>
            <select
              {...register("category")}
              className="w-full bg-charcoal-800 border border-charcoal-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-400 text-xs">{errors.category.message}</p>
            )}
          </div>

          {/* Price + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-charcoal-300 text-sm">Price (₱)</Label>
              <Input
                {...register("price")}
                type="number"
                min={1}
                placeholder="499"
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus-visible:ring-brand-500"
              />
              {errors.price && (
                <p className="text-red-400 text-xs">{errors.price.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-charcoal-300 text-sm">Duration (min)</Label>
              <Input
                {...register("duration_minutes")}
                type="number"
                min={1}
                placeholder="25"
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus-visible:ring-brand-500"
              />
              {errors.duration_minutes && (
                <p className="text-red-400 text-xs">
                  {errors.duration_minutes.message}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300 text-sm">
              Description{" "}
              <span className="text-charcoal-500">(optional)</span>
            </Label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Brief description of this package..."
              className="w-full bg-charcoal-800 border border-charcoal-700 text-white rounded-md px-3 py-2 text-sm placeholder:text-charcoal-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Inclusions */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300 text-sm">Inclusions</Label>
            <p className="text-charcoal-500 text-xs">One item per line</p>
            <textarea
              {...register("inclusions")}
              rows={6}
              placeholder={"10 Mins Photoshoot\n10 Pcs Soft Copies (Enhanced)\n1 Pc 4R Hard Copy\n1 Background"}
              className="w-full bg-charcoal-800 border border-charcoal-700 text-white rounded-md px-3 py-2 text-sm placeholder:text-charcoal-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono"
            />
            {errors.inclusions && (
              <p className="text-red-400 text-xs">{errors.inclusions.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
              disabled={isPending}
            >
              {isPending
                ? "Saving..."
                : service
                ? "Save Changes"
                : "Add Package"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
