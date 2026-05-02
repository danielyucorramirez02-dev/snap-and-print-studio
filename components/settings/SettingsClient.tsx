"use client";

import { useState, useTransition } from "react";
import { updateProfile, changePassword } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, User, Lock, Info } from "lucide-react";
import type { UserRole } from "@/types";

interface SettingsClientProps {
  fullName: string;
  email: string;
  role: UserRole;
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

export default function SettingsClient({ fullName, email, role }: SettingsClientProps) {
  // Profile form
  const [name, setName] = useState(fullName);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [profilePending, startProfileTransition] = useTransition();

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordPending, startPasswordTransition] = useTransition();

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
