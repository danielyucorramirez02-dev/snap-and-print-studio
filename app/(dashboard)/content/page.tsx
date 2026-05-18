import { redirect } from "next/navigation";
import { ClipboardList, CalendarDays, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/formatters";
import { createContentItem, deleteContentItem, updateContentStatus } from "@/app/(dashboard)/content/actions";
import type { ContentBankItem, ContentPostType, ContentStatus } from "@/types";

const POST_TYPES: { value: ContentPostType; label: string }[] = [
  { value: "fresh-shoot", label: "Fresh shoot" },
  { value: "open-slots", label: "Open slots" },
  { value: "package-highlight", label: "Package highlight" },
  { value: "behind-the-scenes", label: "Behind the scenes" },
  { value: "client-love", label: "Client love" },
  { value: "throwback", label: "Throwback" },
  { value: "promo", label: "Promo" },
];

const STATUSES: { value: ContentStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "needs-shoot", label: "Needs shoot" },
  { value: "shot", label: "Shot" },
  { value: "edited", label: "Edited" },
  { value: "captioned", label: "Captioned" },
  { value: "posted", label: "Posted" },
];

const STATUS_STYLES: Record<ContentStatus, string> = {
  idea: "bg-charcoal-700 text-charcoal-300 border-charcoal-600",
  "needs-shoot": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  shot: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  edited: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  captioned: "bg-brand-500/15 text-brand-400 border-brand-500/25",
  posted: "bg-green-500/15 text-green-400 border-green-500/25",
};

function SelectField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-charcoal-400">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-charcoal-400">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-950 px-3 py-2 text-sm text-white placeholder:text-charcoal-600 focus:outline-none focus:border-brand-500"
      />
    </label>
  );
}

function TextAreaField({
  name,
  label,
  placeholder,
  rows = 3,
}: {
  name: string;
  label: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-charcoal-400">{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-950 px-3 py-2 text-sm text-white placeholder:text-charcoal-600 focus:outline-none focus:border-brand-500"
      />
    </label>
  );
}

export default async function ContentBankPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("content_bank")
    .select("*")
    .order("target_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const items = error ? [] : (data ?? []) as ContentBankItem[];
  const readyCount = items.filter((item) => item.status === "edited" || item.status === "captioned").length;
  const openCount = items.filter((item) => item.status !== "posted").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <ClipboardList size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Content Bank</h1>
          <p className="text-charcoal-400 text-sm">
            {openCount} open idea{openCount !== 1 ? "s" : ""} · {readyCount} ready to caption or post
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-300">
          Run `supabase-migration-v7.sql` in Supabase SQL Editor to enable the content bank.
        </div>
      )}

      <form action={createContentItem} className="rounded-xl border border-charcoal-800 bg-charcoal-900 p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <InputField name="title" label="Title" placeholder="Pink backdrop solo sample" />
          <SelectField name="post_type" label="Post type" options={POST_TYPES} defaultValue="open-slots" />
          <SelectField name="status" label="Status" options={STATUSES} defaultValue="idea" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField name="target_date" label="Target date" type="date" />
          <InputField name="photo_url" label="Photo/link" placeholder="Drive link or local note" />
        </div>
        <TextAreaField name="asset_note" label="Asset note" placeholder="Which photo/video to use, where it lives, what needs shooting..." />
        <TextAreaField name="caption_draft" label="Caption draft" placeholder="Optional caption idea" rows={4} />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Add content idea
        </button>
      </form>

      <div className="rounded-xl border border-charcoal-800 bg-charcoal-900 overflow-hidden">
        {items.length === 0 ? (
          <div className="py-16 text-center text-charcoal-600 text-sm">
            No content ideas yet. Add 10 small ideas first; perfect can wait.
          </div>
        ) : (
          <div className="divide-y divide-charcoal-800">
            {items.map((item) => (
              <div key={item.id} className="p-4 hover:bg-charcoal-800/35 transition-colors">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[item.status]}`}>
                        {STATUSES.find((status) => status.value === item.status)?.label ?? item.status}
                      </span>
                      <span className="text-xs text-charcoal-500">
                        {POST_TYPES.find((type) => type.value === item.post_type)?.label ?? item.post_type}
                      </span>
                    </div>
                    {item.target_date && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-charcoal-400">
                        <CalendarDays size={12} /> Target {formatDate(item.target_date)}
                      </p>
                    )}
                    {item.asset_note && <p className="mt-2 text-sm text-charcoal-300">{item.asset_note}</p>}
                    {item.photo_url && (
                      <a href={item.photo_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-brand-400 hover:text-brand-300">
                        Open asset/link
                      </a>
                    )}
                    {item.caption_draft && (
                      <p className="mt-2 rounded-lg border border-charcoal-800 bg-charcoal-950 p-3 text-xs leading-relaxed text-charcoal-300">
                        {item.caption_draft}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <form action={updateContentStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={item.id} />
                      <select
                        name="status"
                        defaultValue={item.status}
                        className="rounded-md border border-charcoal-700 bg-charcoal-950 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                      >
                        {STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                      <button type="submit" className="rounded-md border border-brand-500/25 px-2 py-1.5 text-xs font-medium text-brand-400 hover:bg-brand-500/10">
                        Save
                      </button>
                    </form>
                    <form action={deleteContentItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="rounded-md p-1.5 text-charcoal-600 hover:text-red-400 hover:bg-red-500/10" aria-label={`Delete ${item.title}`}>
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
