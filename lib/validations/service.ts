import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  category: z.enum(["self-shoot", "milestone", "coverage"], {
    required_error: "Category is required",
  }),
  description: z.string().optional(),
  price: z.coerce.number().min(1, "Price must be at least ₱1"),
  duration_minutes: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  inclusions: z.string().min(1, "Add at least one inclusion"),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

export const SERVICE_CATEGORIES = [
  { value: "self-shoot", label: "Self-Shoot" },
  { value: "milestone", label: "Milestone" },
  { value: "coverage", label: "Photo Coverage" },
] as const;
