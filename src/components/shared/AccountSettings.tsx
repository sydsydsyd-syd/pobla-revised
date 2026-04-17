//AccountSettings
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  updateProfile,
  verifyBeforeUpdateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }
type Section = "profile" | "email" | "password";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={cn(
      "flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium border",
      ok
        ? "bg-green-50 text-green-800 border-green-200"
        : "bg-red-50 text-red-800 border-red-200"
    )}>
      {ok
        ? <CheckCircleIcon className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
        : <ExclamationCircleIcon className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
      }
      <span>{msg}</span>
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-bold text-foreground/60 uppercase tracking-widest">{label}</Label>
        {hint && <span className="text-[10px] text-muted-foreground italic">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PasswordInput({ id, value, onChange, placeholder = "••••••••" }: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-2xl pr-10 h-11 bg-white border-border/50 focus:border-brand/40 transition-all shadow-sm"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
      >
        {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

function SaveButton({ loading, label, loadingLabel, onClick }: {
  loading: boolean; label: string; loadingLabel: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-60 active:scale-[0.98] shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/30 hover:-translate-y-0.5"
      style={{ background: "linear-gradient(135deg, #bc5d5d 0%, #9e4444 100%)" }}
    >
      {loading
        ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> {loadingLabel}</>
        : label
      }
    </button>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────
function ProfileSection() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    if (!name.trim()) return showToast("Name cannot be empty.", false);
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: name.trim() });
      await updateDoc(doc(db, "users", user.uid), { name: name.trim() });
      showToast("Display name updated successfully.");
    } catch (err) {
      showToast((err as Error).message || "Failed to update name.", false);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black text-lg text-foreground tracking-tight">Profile</h3>
        <p className="text-sm text-muted-foreground mt-1">Update your display name and personal info.</p>
      </div>

      {toast && <Toast {...toast} />}

      {/* Avatar card */}
      <div className="flex items-center gap-4 p-4 rounded-3xl border border-border/50 bg-gradient-to-br from-brand/5 to-transparent">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-lg"
          style={{ background: "linear-gradient(135deg, #bc5d5d 0%, #8b3a3a 100%)" }}
        >
          {(name || user?.displayName || "?")[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-base text-foreground truncate">{name || "Your Name"}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
          <span
            className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: "rgba(188,93,93,0.1)", color: "#bc5d5d" }}
          >
            Registered Account
          </span>
        </div>
      </div>

      <FieldGroup label="Display Name">
        <Input
          id="acct-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="rounded-2xl h-11 bg-white border-border/50 focus:border-brand/40 shadow-sm"
        />
      </FieldGroup>

      <FieldGroup label="Email Address" hint="Read-only">
        <div className="h-11 px-4 flex items-center rounded-2xl bg-muted/40 border border-border/40 text-sm text-muted-foreground select-none">
          {user?.email}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Change your email in the <strong>Email</strong> tab.
        </p>
      </FieldGroup>

      <SaveButton loading={saving} label="Save Changes" loadingLabel="Saving…" onClick={handleSave} />
    </div>
  );
}

// ─── Email Section ────────────────────────────────────────────────────────────
function EmailSection() {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSave() {
    if (!newEmail.trim()) return showToast("Please enter a new email address.", false);
    if (!password) return showToast("Please enter your current password.", false);
    if (!user?.email) return;
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, cred);
      // verifyBeforeUpdateEmail sends a verification link to the new email.
      // The change only takes effect after the user clicks the link.
      await verifyBeforeUpdateEmail(user, newEmail.trim());
      showToast("Verification email sent! Check your new inbox to confirm the change.");
      setNewEmail(""); setPassword("");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      const map: Record<string, string> = {
        "auth/wrong-password": "Incorrect current password.",
        "auth/invalid-credential": "Incorrect current password.",
        "auth/invalid-email": "Invalid email address.",
        "auth/email-already-in-use": "This email is already in use.",
        "auth/requires-recent-login": "Please sign out and sign back in, then try again.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment.",
      };
      showToast(map[code] || "Incorrect password. Please try again.", false);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black text-lg text-foreground tracking-tight">Email Address</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Current: <span className="font-semibold text-foreground">{user?.email}</span>
        </p>
      </div>

      {toast && <Toast {...toast} />}

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
        <ShieldCheckIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          A verification link will be sent to your <strong>new email address</strong>. The change only takes effect after you click the link.
        </p>
      </div>

      <FieldGroup label="New Email Address">
        <Input
          id="acct-newemail"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="new@email.com"
          className="rounded-2xl h-11 bg-white border-border/50 focus:border-brand/40 shadow-sm"
        />
      </FieldGroup>

      <FieldGroup label="Current Password" hint="Required to confirm">
        <PasswordInput id="acct-email-pass" value={password} onChange={setPassword} />
      </FieldGroup>

      <SaveButton loading={saving} label="Update Email" loadingLabel="Updating…" onClick={handleSave} />
    </div>
  );
}

// ─── Password Section ─────────────────────────────────────────────────────────
function PasswordSection() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  const strength = newPass.length === 0 ? 0 : newPass.length < 6 ? 1 : newPass.length < 10 ? 2 : 3;
  const strengthMeta = [
    { label: "", color: "" },
    { label: "Weak", color: "bg-red-400" },
    { label: "Fair", color: "bg-yellow-400" },
    { label: "Strong", color: "bg-green-500" },
  ];

  async function handleSave() {
    if (!current) return showToast("Please enter your current password.", false);
    if (!newPass) return showToast("Please enter a new password.", false);
    if (newPass.length < 6) return showToast("Password must be at least 6 characters.", false);
    if (newPass !== confirm) return showToast("Passwords do not match.", false);
    if (!user?.email) return;
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);
      showToast("Password changed successfully.");
      setCurrent(""); setNewPass(""); setConfirm("");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      const map: Record<string, string> = {
        "auth/wrong-password": "Incorrect current password.",
        "auth/invalid-credential": "Incorrect current password.",
        "auth/weak-password": "New password is too weak. Use at least 6 characters.",
        "auth/requires-recent-login": "Please sign out and sign back in, then try again.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment.",
      };
      showToast(map[code] || "Incorrect password. Please try again.", false);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black text-lg text-foreground tracking-tight">Change Password</h3>
        <p className="text-sm text-muted-foreground mt-1">Use at least 6 characters for a strong password.</p>
      </div>

      {toast && <Toast {...toast} />}

      <FieldGroup label="Current Password">
        <PasswordInput id="acct-curr" value={current} onChange={setCurrent} />
      </FieldGroup>

      <FieldGroup label="New Password">
        <PasswordInput id="acct-new" value={newPass} onChange={setNewPass} />
        {newPass.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            <div className="flex gap-1.5">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    i <= strength ? strengthMeta[strength].color : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className={cn(
              "text-[11px] font-bold",
              strength === 1 ? "text-red-500" : strength === 2 ? "text-yellow-600" : "text-green-600"
            )}>
              {strengthMeta[strength].label} password
            </p>
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="Confirm New Password">
        <PasswordInput id="acct-confirm" value={confirm} onChange={setConfirm} />
        {confirm.length > 0 && (
          <p className={cn(
            "text-[11px] font-semibold mt-1.5 flex items-center gap-1",
            newPass === confirm ? "text-green-600" : "text-red-500"
          )}>
            {newPass === confirm
              ? <><CheckCircleIcon className="w-3 h-3" /> Passwords match</>
              : "Passwords do not match"
            }
          </p>
        )}
      </FieldGroup>

      <SaveButton loading={saving} label="Change Password" loadingLabel="Updating…" onClick={handleSave} />
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function AccountSettings({ open, onClose }: Props) {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("profile");

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const SECTIONS: { id: Section; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "profile", label: "Profile", icon: <UserIcon className="w-4 h-4" />, desc: "Name & info" },
    { id: "email", label: "Email", icon: <EnvelopeIcon className="w-4 h-4" />, desc: "Change your email" },
    { id: "password", label: "Password", icon: <LockClosedIcon className="w-4 h-4" />, desc: "Update security" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
        <DialogTitle className="sr-only">Account Settings</DialogTitle>

        <div className="flex flex-col sm:flex-row" style={{ minHeight: "min(520px, 90vh)" }}>

          {/* ── Sidebar ── */}
          <div
            className="sm:w-60 shrink-0 flex flex-col"
            style={{ background: "#2e2726" }}
          >
            {/* User card */}
            <div className="px-5 pt-6 pb-5 border-b border-white/5">
              <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0">
                <div
                  className="w-12 h-12 sm:w-16 sm:h-16 sm:mb-3 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-lg shrink-0"
                  style={{ background: "linear-gradient(135deg, #bc5d5d 0%, #8b3a3a 100%)" }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-white leading-tight truncate">{displayName}</p>
                  <p className="text-[11px] text-white/40 truncate mt-0.5">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-row sm:flex-col gap-1 p-3 overflow-x-auto sm:overflow-visible">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all shrink-0 sm:w-full text-left",
                    section === s.id
                      ? "text-white shadow-md"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  )}
                  style={section === s.id ? { background: "#bc5d5d" } : {}}
                >
                  <span className={cn("shrink-0", section === s.id ? "text-white" : "text-white/40")}>
                    {s.icon}
                  </span>
                  <div className="flex-1 min-w-0 hidden sm:block">
                    <p className="text-xs font-bold leading-none">{s.label}</p>
                    <p className={cn("text-[10px] mt-0.5 leading-none", section === s.id ? "text-white/70" : "text-white/30")}>
                      {s.desc}
                    </p>
                  </div>
                  <span className="sm:hidden text-xs font-semibold">{s.label}</span>
                  {section === s.id && (
                    <ChevronRightIcon className="w-3 h-3 text-white/60 hidden sm:block ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 p-5 sm:p-8 overflow-y-auto bg-gray-50/50 min-w-0">
            {section === "profile" && <ProfileSection />}
            {section === "email" && <EmailSection />}
            {section === "password" && <PasswordSection />}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}