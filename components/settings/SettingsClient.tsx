"use client";

import { useState, useTransition } from "react";
import {
  updateProfile,
  changePassword,
  addBlockedDate,
  removeBlockedDate,
  removeBlockedTimeSlot,
  updateMaxSelfShootsPerDay,
} from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, User, Lock, Info, CalendarX, Trash2, Plus, Clock } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils/formatters";
import type { UserRole, BlockedDate, BlockedTimeSlot } from "@/types";

interface SettingsClientProps {
  fullName: string;
  email: string;
  role: UserRole;
  blockedDates: BlockedDate[];
  blockedTimeSlots: BlockedTimeSlot[];
  maxSelfShootsPerDay: number | null;
}

function SectionCard({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-brand-400">{icon}</span>
        <h2 className="text-white font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FeedbackMessage({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
      type === "success"
        ? "bg-green-500/10 border border-green-500/20 text-green-400"
        : "bg-red-500/10 border border-red-500/20 text-red-400"
    }`}>
      {type === "success"
        ? <CheckCircle2 size={15} className="shrink-0" />
        : <AlertCircle size={15} className="shrink-0" />}
      {message}
    </div>
  );
}

export default function SettingsClient({
  fullName,
  email,
  role,
  blockedDates,
  blockedTimeSlots,
  maxSelfShootsPerDay,
}: SettingsClientProps) {
  // Profile form
  const [name, setName] = useState(fullName);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [profilePending, startProfileTransition] = useTransition();

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordPending, startPasswordTransition] = useTransition();

  // Capacity / blocked dates
  const today = new Date().toISOString().split("T")[0];
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockMode, setNewBlockMode] = useState<"whole-day" | "time-range">("whole-day");
  const [newBlockStartTime, setNewBlockStartTime] = useState("13:00");
  const [newBlockEndTime, setNewBlockEndTime] = useState("14:00");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [blockMsg, setBlockMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [blockPending, startBlockTransition] = useTransition();
  const [removingDate, setRemovingDate] = useState<string | null>(null);
  const [removingTimeSlot, setRemovingTimeSlot] = useState<string | null>(null);
  const [, startRemoveTransition] = useTransition();

  const [capInput, setCapInput] = useState<string>(
    maxSelfShootsPerDay === null ? "" : String(maxSelfShootsPerDay)
  );
  const [capMsg, setCapMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [capPending, startCapTransition] = useTransition();

  const handleAddBlockedDate = () => {
    setBlockMsg(null);
    if (!newBlockDate) {
      setBlockMsg({ type: "error", text: "Please choose a date." });
      return;
    }
    startBlockTransition(async () => {
      const result = await addBlockedDate(
        newBlockDate,
        newBlockReason,
        newBlockMode,
        newBlockStartTime,
        newBlockEndTime
      );
      if ("error" in result) {
        setBlockMsg({ type: "error", text: result.error });
        return;
      }
      setBlockMsg({ type: "success", text: newBlockMode === "whole-day" ? "Date blocked." : "Time blocked." });
      if (newBlockMode === "whole-day") setNewBlockDate("");
      setNewBlockReason("");
    });
  };

  const handleRemoveBlockedDate = (date: string) => {
    setBlockMsg(null);
    setRemovingDate(date);
    startRemoveTransition(async () => {
      const result = await removeBlockedDate(date);
      setRemovingDate(null);
      if ("error" in result) {
        setBlockMsg({ type: "error", text: result.error });
      }
    });
  };

  const handleRemoveBlockedTimeSlot = (id: string) => {
    setBlockMsg(null);
    setRemovingTimeSlot(id);
    startRemoveTransition(async () => {
      const result = await removeBlockedTimeSlot(id);
      setRemovingTimeSlot(null);
      if ("error" in result) {
        setBlockMsg({ type: "error", text: result.error });
      }
    });
  };

  const handleCapSave = () => {
    setCapMsg(null);
    const trimmed = capInput.trim();
    let value: number | null;
    if (trimmed === "") {
      value = null;
    } else {
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed) || parsed < 1) {
        setCapMsg({ type: "error", text: "Enter a whole number (1 or more), or leave empty for unlimited." });
        return;
      }
      value = parsed;
    }
    startCapTransition(async () => {
      const result = await updateMaxSelfShootsPerDay(value);
      if ("error" in result) {
        setCapMsg({ type: "error", text: result.error });
        return;
      }
      setCapMsg({ type: "success", text: "Daily cap updated." });
    });
  };

  const handleProfileSave = () => {
    setProfileMsg(null);
    startProfileTransition(async () => {
      const result = await updateProfile(name);
      if ("error" in result) {
        setProfileMsg({ type: "error", text: result.error });
      } else {
        setProfileMsg({ type: "success", text: "Profile updated successfully." });
      }
    });
  };

  const handlePasswordChange = () => {
    setPasswordMsg(null);
    startPasswordTransition(async () => {
      const result = await changePassword(newPassword, confirmPassword);
      if ("error" in result) {
        setPasswordMsg({ type: "error", text: result.error });
      } else {
        setPasswordMsg({ type: "success", text: "Password changed successfully." });
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <div className="max-w-xl space-y-5">
      {/* Profile */}
      <SectionCard icon={<User size={18} />} title="Profile">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Email</Label>
            <Input
              value={email}
              disabled
              className="bg-charcoal-800 border-charcoal-700 text-charcoal-500 cursor-not-allowed"
            />
            <p className="text-charcoal-600 text-xs">Email cannot be changed here.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Role</Label>
            <div className="px-3 py-2 rounded-md bg-charcoal-800 border border-charcoal-700">
              <span className={`text-sm font-medium capitalize ${role === "owner" ? "text-brand-400" : "text-charcoal-300"}`}>
                {role}
              </span>
            </div>
          </div>

          {profileMsg && <FeedbackMessage type={profileMsg.type} message={profileMsg.text} />}

          <Button
            onClick={handleProfileSave}
            disabled={profilePending || name.trim() === fullName}
            className="bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40"
          >
            {profilePending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </SectionCard>

      {/* Password */}
      <SectionCard icon={<Lock size={18} />} title="Change Password">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
            />
          </div>

          {passwordMsg && <FeedbackMessage type={passwordMsg.type} message={passwordMsg.text} />}

          <Button
            onClick={handlePasswordChange}
            disabled={passwordPending || !newPassword || !confirmPassword}
            className="bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40"
          >
            {passwordPending ? "Updating..." : "Change Password"}
          </Button>
        </div>
      </SectionCard>

      {/* Capacity & Blocked Dates */}
      <SectionCard icon={<CalendarX size={18} />} title="Capacity & Blocked Dates">
        <div className="space-y-6">
          {/* Daily cap */}
          <div className="space-y-1.5">
            <Label className="text-charcoal-300">Max self-shoot sessions per day</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={capInput}
                onChange={(e) => setCapInput(e.target.value)}
                placeholder="Unlimited"
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500 w-40"
              />
              <Button
                onClick={handleCapSave}
                disabled={capPending}
                className="bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40"
              >
                {capPending ? "Saving..." : "Save Cap"}
              </Button>
            </div>
            <p className="text-charcoal-600 text-xs">
              Leave empty for no cap. Once the cap is hit on a day, that day shows as fully booked to customers.
            </p>
            {capMsg && <FeedbackMessage type={capMsg.type} message={capMsg.text} />}
          </div>

          {/* Add new blocked date */}
          <div className="space-y-1.5 pt-4 border-t border-charcoal-800">
            <Label className="text-charcoal-300">Block a date or time</Label>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2">
              <Input
                type="date"
                min={today}
                value={newBlockDate}
                onChange={(e) => setNewBlockDate(e.target.value)}
                className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
              />
              <Input
                type="text"
                value={newBlockReason}
                onChange={(e) => setNewBlockReason(e.target.value)}
                placeholder="Reason (optional) — e.g. Editing day, Holiday"
                className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500 focus:border-brand-500"
              />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewBlockMode("whole-day")}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    newBlockMode === "whole-day"
                      ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
                      : "border-charcoal-700 bg-charcoal-800 text-charcoal-400 hover:text-white"
                  }`}
                >
                  Whole day
                </button>
                <button
                  type="button"
                  onClick={() => setNewBlockMode("time-range")}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
                    newBlockMode === "time-range"
                      ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
                      : "border-charcoal-700 bg-charcoal-800 text-charcoal-400 hover:text-white"
                  }`}
                >
                  <Clock size={14} />
                  Certain time
                </button>
              </div>

              {newBlockMode === "time-range" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-charcoal-500 text-xs">Start time</Label>
                    <Input
                      type="time"
                      value={newBlockStartTime}
                      onChange={(e) => setNewBlockStartTime(e.target.value)}
                      className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-charcoal-500 text-xs">End time</Label>
                    <Input
                      type="time"
                      value={newBlockEndTime}
                      onChange={(e) => setNewBlockEndTime(e.target.value)}
                      className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleAddBlockedDate}
                disabled={blockPending}
                className="bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40"
              >
                <Plus size={14} className="mr-1" />
                {blockPending ? "Adding..." : "Block"}
              </Button>
            </div>
            <p className="text-charcoal-600 text-xs">
              Whole-day blocks close the date. Time blocks only hide slots that overlap that time.
            </p>
            {blockMsg && <FeedbackMessage type={blockMsg.type} message={blockMsg.text} />}
          </div>

          {/* List of blocked dates */}
          <div className="space-y-2 pt-4 border-t border-charcoal-800">
            <Label className="text-charcoal-300">Upcoming whole-day blocks</Label>
            {blockedDates.length === 0 ? (
              <p className="text-charcoal-600 text-xs py-2">No upcoming whole-day blocks.</p>
            ) : (
              <div className="space-y-1.5">
                {blockedDates.map((bd) => (
                  <div
                    key={bd.date}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-charcoal-800 border border-charcoal-700"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{formatDate(bd.date)}</p>
                      <p className="text-charcoal-400 text-xs">
                        {bd.start_time && bd.end_time
                          ? `${formatTime(bd.start_time)} - ${formatTime(bd.end_time)}`
                          : "Whole day"}
                      </p>
                      {bd.reason && (
                        <p className="text-charcoal-500 text-xs truncate">{bd.reason}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveBlockedDate(bd.date)}
                      disabled={removingDate === bd.date}
                      className="text-charcoal-500 hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Remove block"
                      aria-label={`Unblock ${bd.date}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-4 border-t border-charcoal-800">
            <Label className="text-charcoal-300">Upcoming blocked times</Label>
            {blockedTimeSlots.length === 0 ? (
              <p className="text-charcoal-600 text-xs py-2">No upcoming blocked times.</p>
            ) : (
              <div className="space-y-1.5">
                {blockedTimeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-charcoal-800 border border-charcoal-700"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{formatDate(slot.date)}</p>
                      <p className="text-charcoal-400 text-xs">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </p>
                      {slot.reason && (
                        <p className="text-charcoal-500 text-xs truncate">{slot.reason}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveBlockedTimeSlot(slot.id)}
                      disabled={removingTimeSlot === slot.id}
                      className="text-charcoal-500 hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Remove time block"
                      aria-label={`Remove blocked time on ${slot.date}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Studio Info */}
      <SectionCard icon={<Info size={18} />} title="Studio Information">
        <div className="space-y-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-charcoal-500 text-xs uppercase tracking-wider">Studio Name</span>
            <span className="text-white">Snap &amp; Print Studio</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-charcoal-500 text-xs uppercase tracking-wider">Address</span>
            <span className="text-charcoal-300 leading-relaxed">
              Phase 5, Block 22, Lot 37 Pandi Residence 1,<br />
              Mapulang Lupa, Pandi, Bulacan
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-charcoal-500 text-xs uppercase tracking-wider">Maps</span>
            <span className="text-charcoal-300">Searchable on Waze &amp; Google Maps as &quot;Snap &amp; Print Studio&quot;</span>
          </div>
          <p className="text-charcoal-600 text-xs pt-1">
            Studio info is used in generated captions and printed receipts.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
