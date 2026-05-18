"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ContentPostType, ContentStatus } from "@/types";

const POST_TYPES = new Set<ContentPostType>([
  "fresh-shoot",
  "open-slots",
  "package-highlight",
  "behind-the-scenes",
  "client-love",
  "throwback",
  "promo",
]);

const STATUSES = new Set<ContentStatus>([
  "idea",
  "needs-shoot",
  "shot",
  "edited",
  "captioned",
  "posted",
]);

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value.length > 0 ? value : null;
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, user };
}

export async function createContentItem(formData: FormData) {
  const auth = await requireUser();

  const title = textValue(formData, "title");
  const postType = textValue(formData, "post_type") as ContentPostType;
  const status = textValue(formData, "status") as ContentStatus;

  if (!title) return;
  if (!POST_TYPES.has(postType)) return;
  if (!STATUSES.has(status)) return;

  const { error } = await auth.supabase.from("content_bank").insert({
    title,
    post_type: postType,
    status,
    target_date: nullableText(formData, "target_date"),
    asset_note: nullableText(formData, "asset_note"),
    photo_url: nullableText(formData, "photo_url"),
    caption_draft: nullableText(formData, "caption_draft"),
    posted_on: status === "posted" ? (nullableText(formData, "posted_on") ?? new Date().toISOString().split("T")[0]) : null,
    created_by: auth.user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/content");
}

export async function updateContentStatus(formData: FormData) {
  const auth = await requireUser();

  const id = textValue(formData, "id");
  const status = textValue(formData, "status") as ContentStatus;
  if (!id) return;
  if (!STATUSES.has(status)) return;

  const { error } = await auth.supabase
    .from("content_bank")
    .update({
      status,
      posted_on: status === "posted" ? new Date().toISOString().split("T")[0] : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/content");
}

export async function deleteContentItem(formData: FormData) {
  const auth = await requireUser();

  const id = textValue(formData, "id");
  if (!id) return;

  const { error } = await auth.supabase.from("content_bank").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/content");
}
