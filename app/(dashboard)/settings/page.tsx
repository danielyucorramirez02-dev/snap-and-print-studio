import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import type { UserRole, BlockedDate, BlockedTimeSlot } from "@/types";
import SettingsClient from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") redirect("/calendar");

  const today = new Date().toISOString().split("T")[0];

  const blockedQuery = await supabase
    .from("blocked_dates")
    .select("date, reason, start_time, end_time, created_at, created_by")
    .gte("date", today)
    .order("date", { ascending: true });

  const timeBlocksQuery = await supabase
    .from("blocked_time_slots")
    .select("id, date, start_time, end_time, reason, created_at, created_by")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const [{ data: legacyBlockedRows }, { data: timeBlockRows }, { data: settingsRow }] = await Promise.all([
    blockedQuery.error
      ? supabase
          .from("blocked_dates")
          .select("date, reason, created_at, created_by")
          .gte("date", today)
          .order("date", { ascending: true })
      : Promise.resolve({ data: blockedQuery.data }),
    timeBlocksQuery.error
      ? Promise.resolve({ data: [] })
      : Promise.resolve({ data: timeBlocksQuery.data }),
    supabase
      .from("studio_settings")
      .select("max_self_shoots_per_day")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const blockedDates = (legacyBlockedRows ?? []).map((row) => ({
    ...row,
    start_time: "start_time" in row ? row.start_time : null,
    end_time: "end_time" in row ? row.end_time : null,
  })) as BlockedDate[];
  const blockedTimeSlots = (timeBlockRows ?? []) as BlockedTimeSlot[];
  const maxSelfShootsPerDay = (settingsRow?.max_self_shoots_per_day as number | null) ?? null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <Settings size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-charcoal-400 text-sm">Manage your account</p>
        </div>
      </div>

      <SettingsClient
        fullName={profile?.full_name ?? ""}
        email={user.email ?? ""}
        role={(profile?.role ?? "owner") as UserRole}
        blockedDates={blockedDates}
        blockedTimeSlots={blockedTimeSlots}
        maxSelfShootsPerDay={maxSelfShootsPerDay}
      />
    </div>
  );
}
