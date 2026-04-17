//AuthPage
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { submitRiderRegistration } from "@/lib/riderService";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  EnvelopeIcon, LockClosedIcon, UserIcon, EyeIcon, EyeSlashIcon,
  ExclamationCircleIcon, ArrowRightIcon, UserGroupIcon, TruckIcon, PhoneIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { VehicleType } from "@/types";

type Tab = "login" | "register" | "rider";

function PasswordInput({ id, value, onChange, placeholder = "••••••••" }: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <input id={id} type={show ? "text" : "password"} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        autoComplete={id.includes("confirm") ? "new-password" : id.includes("new") ? "new-password" : "current-password"}
        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20 transition-all"
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
        {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

function TextInput({ id, icon, value, onChange, placeholder, type = "text", autoComplete }: {
  id: string; icon: React.ReactNode; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; autoComplete?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20 transition-all"
      />
    </div>
  );
}

function firebaseError(code: string): string {
  const map: Record<string, string> = {
    "auth/user-not-found": "Account not found. Please sign up first.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/email-already-in-use": "Email already in use. Please log in instead.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/invalid-email": "Invalid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

export default function AuthPage({ onClose }: { onClose?: () => void }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  // Rider-specific
  const [rPhone, setRPhone] = useState("");
  const [rVehicle, setRVehicle] = useState<VehicleType>(VehicleType.MOTORCYCLE);
  const [rPlate, setRPlate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields.");
    setLoading(true); setError(null);
    try { await login(email, password); }
    catch (err: unknown) { setError(firebaseError((err as { code?: string }).code ?? "")); }
    finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password || !confirm) return setError("Please fill in all fields.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true); setError(null);
    try { await register(name.trim(), email, password, phone, address); }
    catch (err: unknown) { setError(firebaseError((err as { code?: string }).code ?? "")); }
    finally { setLoading(false); }
  }

  // Diagram 3: Rider submits registration, admin reviews
  async function handleRiderReg(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password || !rPhone || !rPlate) return setError("Please fill in all fields.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true); setError(null); setSuccess(null);
    try {
      await submitRiderRegistration({ name, email, password, phone: rPhone, vehicleType: rVehicle, plateNumber: rPlate });
      setSuccess("Registration submitted! The admin will review your application. You will be notified upon approval.");
      setName(""); setEmail(""); setPassword(""); setRPhone(""); setRPlate("");
    }
    catch (err: unknown) { setError(firebaseError((err as { code?: string }).code ?? "")); }
    finally { setLoading(false); }
  }

  function switchTab(t: Tab) { setTab(t); setError(null); setSuccess(null); }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 py-8" style={{ background: "rgba(59,49,48,0.97)" }}>
      {/* Close button — only when used as overlay */}
      {onClose && (
        <button onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/5 transition-all z-10">
          <XMarkIcon className="w-5 h-5" />
        </button>
      )}
      <div className="fixed -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "#bc5d5d" }} />
      <div className="fixed -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "#bc5d5d" }} />

      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Brand - Reduced padding for rider tab */}
        <div className={cn(
          "px-8 pt-8 pb-6 text-center",
          tab === "rider" && "pt-6 pb-4"
        )}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 overflow-hidden" style={{ border: "1.5px solid rgba(188,93,93,0.4)" }}>
            <img src="/logo.png" alt="Pobla" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display font-black text-2xl text-white tracking-tight">POBLA</h1>
          <p className="text-xs font-bold tracking-widest mt-0.5" style={{ color: "#bc5d5d" }}>ORDER HUB</p>
          <p className="text-xs text-white/40 mt-2">Authentic Filipino Cuisine</p>
        </div>

        {/* Tabs */}
        <div className="flex mx-6 mb-5 rounded-xl p-1 shrink-0" style={{ background: "rgba(0,0,0,0.2)" }}>
          {([
            { id: "login" as Tab, label: "Login" },
            { id: "register" as Tab, label: "Sign Up" },
            { id: "rider" as Tab, label: "Rider" },
          ]).map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)}
              className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", tab === t.id ? "text-white shadow-md" : "text-white/40 hover:text-white/60")}
              style={tab === t.id ? { background: "#bc5d5d" } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form onSubmit={tab === "login" ? handleLogin : tab === "register" ? handleRegister : handleRiderReg}
            className="space-y-3">

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <ExclamationCircleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-red-300">{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl text-xs" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <span className="text-green-300">{success}</span>
              </div>
            )}

            {/* Name — register + rider */}
            {(tab === "register" || tab === "rider") && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Full Name</label>
                <TextInput id="name" icon={<UserIcon className="w-4 h-4" />} value={name} onChange={setName} placeholder="Juan dela Cruz" autoComplete="name" />
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email</label>
              <TextInput id="email" icon={<EnvelopeIcon className="w-4 h-4" />} value={email} onChange={setEmail} placeholder="juan@email.com" type="email" autoComplete="email" />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
              <PasswordInput id="password" value={password} onChange={setPassword} />
            </div>

            {/* Confirm — register only */}
            {tab === "register" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Confirm Password</label>
                <PasswordInput id="confirm" value={confirm} onChange={setConfirm} />
              </div>
            )}

            {/* Rider-specific fields */}
            {tab === "rider" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Phone Number</label>
                  <TextInput id="rphone" icon={<PhoneIcon className="w-4 h-4" />} value={rPhone} onChange={setRPhone} placeholder="09XX XXX XXXX" type="tel" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Vehicle Type</label>
                  <div className="flex gap-2">
                    {Object.values(VehicleType).map(v => (
                      <button key={v} type="button" onClick={() => setRVehicle(v)}
                        className={cn("...",
                          rVehicle === v ? "text-white border-brand/60" : "text-white/40 border-white/10"
                        )}
                      >
                        {v === VehicleType.MOTORCYCLE ? "Motorcycle" :
                          v === VehicleType.BICYCLE ? "Bicycle" : "Car"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Plate Number</label>
                  <TextInput id="rplate" icon={<TruckIcon className="w-4 h-4" />} value={rPlate} onChange={setRPlate} placeholder="ABC 1234" />
                </div>
                <div className="p-3 rounded-xl text-xs text-white/40" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  📋 Your registration will be reviewed by the admin. You'll receive access once approved.
                </div>
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 mt-4 sticky bottom-0"
              style={{ background: "#bc5d5d" }}>
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  {tab === "login" ? "Login" : tab === "register" ? "Create Account" : "Submit Registration"}
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span className="text-xs text-white/30">or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>

          <div className="mt-4 pb-2">
            <button onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white/80 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <UserGroupIcon className="w-4 h-4" />
              Browse Menu as Guest
              <span className="text-[10px] text-white/30">(no ordering)</span>
            </button>
          </div>
        </div>
      </div>
      <p className="mt-6 text-xs text-white/20">© 2025 Poblacion Pares Atbp.</p>
    </div>
  );
}