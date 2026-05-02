import { z } from "zod";

export const inventorySchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  unit_cost: z.coerce.number().min(0, "Cost cannot be negative"),
  selling_price: z.coerce.number().min(0, "Selling price cannot be negative"),
  low_stock_threshold: z.coerce.number().min(0, "Threshold cannot be negative"),
  supplier: z.string().optional(),
  last_restocked: z.string().optional(),
});

export type InventoryFormData = z.infer<typeof inventorySchema>;
