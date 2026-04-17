import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { submitRiderRegistration } from "@/lib/riderService";
import {
  EnvelopeIcon, LockClosedIcon, UserIcon, PhoneIcon, TruckIcon,
  EyeIcon, EyeSlashIcon, ExclamationCircleIcon, ArrowRightIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { VehicleType } from "@/types";

// Password strength checker function
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  requirements: string[];
} {
  let score = 0;
  const requirements: string[] = [];

  if (password.length >= 8) {
    score += 1;
  } else {
    requirements.push("At least 8 characters");
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    requirements.push("One lowercase letter");
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    requirements.push("One uppercase letter");
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    requirements.push("One number");
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    requirements.push("One special character (!@#$%^&*)");
  }

  let label = "";
  let color = "";

  if (password.length === 0) {
    label = "";
    color = "#c8b8b6";
  } else if (score <= 2) {
    label = "Weak";
    color = "#dc2626";
  } else if (score <= 3) {
    label = "Fair";
    color = "#f59e0b";
  } else if (score <= 4) {
    label = "Good";
    color = "#10b981";
  } else {
    label = "Strong";
    color = "#059669";
  }

  return { score, label, color, requirements };
}

function firebaseError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "Email already in use.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/invalid-email": "Invalid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

interface RiderRegistrationPageProps {
  onNavigateLogin: () => void;
  onNavigateSignup: () => void;
}

// Simple boolean check for plate number
const isPlateNumberValid = (plateNum: string): boolean => {
  const cleanPlate = plateNum.trim().toUpperCase().replace(/\s/g, '');
  if (!cleanPlate) return false;

  const patterns: RegExp[] = [
    /^[A-Z]{3}\d{3}$/,      // ABC 123
    /^[A-Z]{3}\d{4}$/,      // ABC 1234
    /^[A-Z]{2}\d{4}$/,      // AB 1234
    /^\d{4}[A-Z]{2}$/,      // 1234 AB
    /^\d{3}[A-Z]{3}$/,      // 123 ABC
    /^[A-Z]{3}\d{3}[E]$/,   // ABC 123 E
    /^\d{4}[D]$/,           // 1234 D
  ];

  return patterns.some(pattern => pattern.test(cleanPlate));
};

// Format plate number as user types
const formatPlateNumber = (value: string): string => {
  let cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleaned.length > 3 && !cleaned.includes(' ')) {
    const firstPart = cleaned.slice(0, 3);
    const secondPart = cleaned.slice(3);
    cleaned = `${firstPart} ${secondPart}`;
  }

  if (cleaned.length > 8) {
    cleaned = cleaned.slice(0, 8);
  }

  return cleaned;
};

export default function RiderRegistrationPage({ onNavigateLogin, onNavigateSignup }: RiderRegistrationPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState<VehicleType>(VehicleType.MOTORCYCLE);
  const [plate, setPlate] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && password.length > 0 && confirmPassword.length > 0;
  const isPasswordValid = passwordStrength.score >= 3;
  const requiresPlateNumber = vehicle !== VehicleType.BICYCLE;

  // Validate phone number (Philippines format)
  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^(09|\+639)\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Calculate if submit should be disabled (returns explicit boolean)
  const isSubmitDisabled = (): boolean => {
    if (loading) return true;
    if (!isPasswordValid) return true;
    if (!passwordsMatch) return true;
    if (!name) return true;
    if (!email) return true;
    if (!phone) return true;
    if (requiresPlateNumber && !plate) return true;
    if (requiresPlateNumber && plate && !isPlateNumberValid(plate)) return true;
    return false;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check all required fields
    if (!name || !email || !password || !confirmPassword || !phone) {
      return setError("Please fill in all fields.");
    }

    // Check plate number only if required
    if (requiresPlateNumber && !plate) {
      return setError("Please enter a plate number.");
    }

    // Validate phone
    if (!isValidPhone(phone)) {
      return setError("Please enter a valid phone number (e.g., 09123456789 or +639123456789).");
    }

    // Validate plate number only if required
    if (requiresPlateNumber && plate && !isPlateNumberValid(plate)) {
      return setError("Invalid plate format. Examples: ABC123, ABC1234, 1234AB, 123ABC");
    }

    // Password validation
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!isPasswordValid) return setError("Please use a stronger password (at least 'Good' strength).");

    setLoading(true);
    setError(null);

    try {
      // Clean plate number only if provided
      const cleanPlate = plate ? plate.replace(/\s/g, '').toUpperCase() : '';
      await submitRiderRegistration({
        name,
        email,
        password,
        phone,
        vehicleType: vehicle,
        plateNumber: cleanPlate
      });
      setSuccess(true);
    }
    catch (err: unknown) {
      setError(firebaseError((err as { code?: string }).code ?? ""));
    }
    finally { setLoading(false); }
  }

  const sharedStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

    .auth-overlay {
      position: fixed; inset: 0; z-index: 50;
      display: flex; align-items: center; justify-content: center;
      background: rgba(20, 12, 10, 0.82);
      backdrop-filter: blur(6px);
      padding: 16px;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    .auth-card {
      display: flex;
      width: 100%; max-width: 860px;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
      animation: slideUp 0.25s cubic-bezier(.22,.68,0,1.2);
      max-height: 90vh;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.98) }
      to   { opacity: 1; transform: translateY(0) scale(1) }
    }

    .auth-left {
      display: none;
      flex-direction: column;
      justify-content: space-between;
      width: 300px; flex-shrink: 0;
      padding: 40px 32px;
      background: #1a0f0d;
      position: relative;
      overflow-y: auto;
    }
    @media (min-width: 640px) { .auth-left { display: flex; } }

    .auth-left-bg {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse at 20% 50%, rgba(188,93,93,0.18) 0%, transparent 65%),
                  radial-gradient(ellipse at 80% 10%, rgba(188,93,93,0.10) 0%, transparent 50%);
      pointer-events: none;
    }
    .auth-left-dots {
      position: absolute; inset: 0;
      background-image: radial-gradient(circle, rgba(188,93,93,0.15) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }

    .auth-logo-wrap {
      position: relative;
      width: 56px; height: 56px;
      border-radius: 16px; overflow: hidden;
      border: 2px solid rgba(188,93,93,0.5);
      box-shadow: 0 0 0 4px rgba(188,93,93,0.08);
    }
    .auth-logo-wrap img { width: 100%; height: 100%; object-fit: cover; }

    .auth-brand-title {
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 28px;
      color: #fff; letter-spacing: -0.5px;
      line-height: 1; margin-top: 20px;
    }
    .auth-brand-sub {
      font-family: 'DM Sans', sans-serif;
      font-size: 10px; font-weight: 600;
      letter-spacing: 3px; color: #bc5d5d; margin-top: 4px;
    }
    .auth-brand-desc {
      font-family: 'DM Sans', sans-serif;
      font-size: 12px; color: rgba(255,255,255,0.35);
      line-height: 1.7; margin-top: 14px;
    }

    .auth-nav {
      display: flex; flex-direction: column; gap: 6px;
      position: relative;
    }
    .auth-nav-item {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 600;
      padding: 10px 14px; border-radius: 10px;
      cursor: pointer; transition: all 0.15s;
      border: none; text-align: left;
    }
    .auth-nav-item.active { background: #bc5d5d; color: #fff; }
    .auth-nav-item:not(.active) { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); }
    .auth-nav-item:not(.active):hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }

    .auth-copy {
      font-family: 'DM Sans', sans-serif;
      font-size: 11px; color: rgba(255,255,255,0.18);
      position: relative;
    }

    .auth-right {
      flex: 1; background: #fdfaf9;
      display: flex; flex-direction: column;
      overflow-y: auto;
      max-height: 90vh;
    }

    .auth-mobile-header {
      display: flex; align-items: center;
      gap: 10px; padding: 20px 24px 0;
      flex-shrink: 0;
    }
    @media (min-width: 640px) { .auth-mobile-header { display: none; } }

    .auth-mobile-logo {
      width: 36px; height: 36px; border-radius: 10px; overflow: hidden;
      border: 2px solid #bc5d5d; flex-shrink: 0;
    }
    .auth-mobile-logo img { width: 100%; height: 100%; object-fit: cover; }
    .auth-mobile-title {
      font-family: 'Syne', sans-serif;
      font-size: 15px; font-weight: 800;
      color: #2a1715; letter-spacing: -0.3px;
    }

    .auth-mobile-tabs {
      display: flex; gap: 4px;
      margin: 16px 24px 0;
      padding: 4px; border-radius: 12px;
      background: #ede7e6;
      flex-shrink: 0;
    }
    @media (min-width: 640px) { .auth-mobile-tabs { display: none; } }
    .auth-tab {
      flex: 1; padding: 8px 4px;
      border-radius: 9px; border: none;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .auth-tab.active { background: #bc5d5d; color: #fff; }
    .auth-tab:not(.active) { background: transparent; color: #9a8180; }

    .auth-form-area {
      flex: 1;
      padding: 28px 32px 32px;
      max-width: 400px;
      width: 100%;
      margin: 0 auto;
      overflow-y: auto;
    }

    .auth-heading {
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 26px;
      color: #1e100e; letter-spacing: -0.5px; line-height: 1.1;
    }
    .auth-subheading {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; color: #9a8180; margin-top: 5px;
    }

    .auth-error {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; border-radius: 10px;
      background: #fff1f1; border: 1px solid #fca5a5;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px; color: #dc2626; margin-top: 18px;
    }

    .auth-notice {
      padding: 10px 12px; border-radius: 10px;
      background: #faf7f6; border: 1px solid #e5dcdb;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px; color: #9a8180;
      line-height: 1.6; margin-top: 14px;
    }

    .auth-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 11px; font-weight: 700;
      letter-spacing: 1.5px; text-transform: uppercase;
      color: #b09f9e; display: block; margin-bottom: 6px;
    }

    .auth-field { position: relative; margin-top: 14px; }
    .auth-input {
      width: 100%; box-sizing: border-box;
      padding: 11px 14px 11px 40px;
      border-radius: 12px; border: 1.5px solid #e5dcdb;
      background: #fff;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px; color: #1e100e;
      outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .auth-input::placeholder { color: #c8b8b6; }
    .auth-input:focus { border-color: #bc5d5d; box-shadow: 0 0 0 3px rgba(188,93,93,0.12); }
    .auth-input-icon {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      width: 16px; height: 16px; color: #bc5d5d;
    }
    .auth-input-btn {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: #c8b8b6; padding: 0; display: flex;
    }
    .auth-input-btn:hover { color: #9a8180; }

    .auth-vehicle-group {
      display: flex; gap: 6px; margin-top: 6px;
    }
    .auth-vehicle-btn {
      flex: 1; padding: 9px 4px;
      border-radius: 10px; border: 1.5px solid #e5dcdb;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
      background: #fff; color: #7a6160;
    }
    .auth-vehicle-btn.active {
      background: #bc5d5d; color: #fff; border-color: #bc5d5d;
    }
    .auth-vehicle-btn:not(.active):hover {
      background: #faf7f6; border-color: #c8b8b6;
    }

    /* Password Strength Styles */
    .password-strength-container {
      margin-top: 10px;
      padding: 10px 0 4px 0;
    }
    .strength-bar-container {
      display: flex;
      gap: 6px;
      margin: 8px 0;
    }
    .strength-bar {
      flex: 1;
      height: 3px;
      border-radius: 3px;
      transition: all 0.2s ease;
    }
    .strength-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .requirements-list {
      list-style: none;
      padding: 0;
      margin: 8px 0 0 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .requirement-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: 'DM Sans', sans-serif;
      font-size: 9px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 12px;
      transition: all 0.2s ease;
    }
    .requirement-unmet {
      color: #9a8180;
      background: rgba(188, 93, 93, 0.08);
    }
    .match-indicator {
      margin-top: 8px;
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .bicycle-notice {
      margin-top: 14px;
      padding: 10px 12px;
      border-radius: 10px;
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      color: #0369a1;
      line-height: 1.6;
    }

    .auth-submit {
      width: 100%; margin-top: 20px; padding: 13px;
      border-radius: 12px; border: none;
      background: #bc5d5d; color: #fff;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px; font-weight: 700;
      cursor: pointer; transition: opacity 0.15s, transform 0.1s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .auth-submit:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .auth-submit:active:not(:disabled) { transform: translateY(0); }
    .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .auth-footer-links {
      margin-top: 22px; padding-top: 18px;
      border-top: 1px solid #ede7e6;
      display: flex; flex-direction: column;
      align-items: center; gap: 8px;
    }
    .auth-footer-text {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; color: #9a8180;
    }
    .auth-link {
      background: none; border: none; cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 700;
      color: #bc5d5d; padding: 0;
    }
    .auth-link:hover { text-decoration: underline; }

    /* Success screen */
    .auth-success-body {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 48px 32px;
      text-align: center;
    }
    .auth-success-icon {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: #f0fdf4; border: 2px solid #bbf7d0;
      margin-bottom: 24px;
    }
    .auth-success-title {
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 22px;
      color: #1e100e; letter-spacing: -0.4px;
      margin-bottom: 10px;
    }
    .auth-success-desc {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; color: #9a8180;
      line-height: 1.7; margin-bottom: 28px;
    }
  `;

  // Success screen
  if (success) {
    return (
      <>
        <style>{sharedStyles}</style>
        <div className="auth-overlay">
          <div className="auth-card">
            <div className="auth-left">
              <div className="auth-left-bg" />
              <div className="auth-left-dots" />
              <div style={{ position: "relative" }}>
                <div className="auth-logo-wrap"><img src="/logo.png" alt="Pobla" /></div>
                <div className="auth-brand-title">POBLA</div>
                <div className="auth-brand-sub">ORDER HUB</div>
                <p className="auth-brand-desc">Authentic Filipino Cuisine.<br />Order fresh, delivered fast.</p>
              </div>
              <nav className="auth-nav">
                <button className="auth-nav-item" onClick={onNavigateLogin}>Log In</button>
                <button className="auth-nav-item" onClick={onNavigateSignup}>Sign Up</button>
                <div className="auth-nav-item active">Rider Registration</div>
              </nav>
              <span className="auth-copy">© 2025 Poblacion Pares Atbp.</span>
            </div>

            <div className="auth-right">
              <div className="auth-mobile-header">
                <div className="auth-mobile-logo"><img src="/logo.png" alt="Pobla" /></div>
                <span className="auth-mobile-title">POBLA ORDER HUB</span>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="auth-success-body">
                  <div className="auth-success-icon">
                    <CheckCircleIcon style={{ width: 32, height: 32, color: "#22c55e" }} />
                  </div>
                  <div className="auth-success-title">Application Submitted!</div>
                  <p className="auth-success-desc">
                    Your rider registration is under review.<br />
                    The admin will notify you once your<br />application is approved.
                  </p>
                  <button className="auth-submit" style={{ maxWidth: 260 }} onClick={onNavigateLogin}>
                    <span>Back to Login</span>
                    <ArrowRightIcon style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Registration form
  return (
    <>
      <style>{sharedStyles}</style>

      <div className="auth-overlay">
        <div className="auth-card">
          {/* Left panel */}
          <div className="auth-left">
            <div className="auth-left-bg" />
            <div className="auth-left-dots" />
            <div style={{ position: "relative" }}>
              <div className="auth-logo-wrap"><img src="/logo.png" alt="Pobla" /></div>
              <div className="auth-brand-title">POBLA</div>
              <div className="auth-brand-sub">ORDER HUB</div>
              <p className="auth-brand-desc">Authentic Filipino Cuisine.<br />Order fresh, delivered fast.</p>
            </div>
            <nav className="auth-nav">
              <button className="auth-nav-item" onClick={onNavigateLogin}>Log In</button>
              <button className="auth-nav-item" onClick={onNavigateSignup}>Sign Up</button>
              <div className="auth-nav-item active">Rider Registration</div>
            </nav>
            <span className="auth-copy">© 2025 Poblacion Pares Atbp.</span>
          </div>

          {/* Right panel */}
          <div className="auth-right">
            {/* Mobile header */}
            <div className="auth-mobile-header">
              <div className="auth-mobile-logo"><img src="/logo.png" alt="Pobla" /></div>
              <span className="auth-mobile-title">POBLA ORDER HUB</span>
            </div>

            {/* Mobile tabs */}
            <div className="auth-mobile-tabs">
              <button className="auth-tab" onClick={onNavigateLogin}>Log In</button>
              <button className="auth-tab" onClick={onNavigateSignup}>Sign Up</button>
              <button className="auth-tab active">Rider</button>
            </div>

            {/* Scrollable form area */}
            <div className="auth-form-area">
              <div>
                <h2 className="auth-heading">Rider Registration</h2>
                <p className="auth-subheading">Apply to become a delivery rider</p>
              </div>

              <div className="auth-notice">
                ⚠️ Your registration will be reviewed by the admin. You'll receive access once approved.
              </div>

              {error && (
                <div className="auth-error">
                  <ExclamationCircleIcon style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ marginTop: 4 }}>
                {/* Full Name */}
                <div className="auth-field">
                  <label className="auth-label">Full Name</label>
                  <div style={{ position: "relative" }}>
                    <UserIcon className="auth-input-icon" />
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Juan dela Cruz" autoComplete="name"
                      className="auth-input" required />
                  </div>
                </div>

                {/* Email */}
                <div className="auth-field">
                  <label className="auth-label">Email</label>
                  <div style={{ position: "relative" }}>
                    <EnvelopeIcon className="auth-input-icon" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="juan@email.com" autoComplete="email"
                      className="auth-input" required />
                  </div>
                </div>

                {/* Phone */}
                <div className="auth-field">
                  <label className="auth-label">Phone Number</label>
                  <div style={{ position: "relative" }}>
                    <PhoneIcon className="auth-input-icon" />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="09123456789" autoComplete="tel"
                      className="auth-input" required />
                  </div>
                  <p className="auth-subheading" style={{ fontSize: "10px", marginTop: "4px", color: "#c8b8b6" }}>
                    Format: 09123456789
                  </p>
                </div>

                {/* Password with Strength Indicator */}
                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div style={{ position: "relative" }}>
                    <LockClosedIcon className="auth-input-icon" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="auth-input"
                      style={{ paddingRight: 40 }}
                      required
                    />
                    <button type="button" className="auth-input-btn" onClick={() => setShowPw(s => !s)}>
                      {showPw ? <EyeSlashIcon style={{ width: 16, height: 16 }} /> : <EyeIcon style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="password-strength-container">
                      <div className="strength-bar-container">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className="strength-bar"
                            style={{
                              background: level <= passwordStrength.score ? passwordStrength.color : "#ede7e6"
                            }}
                          />
                        ))}
                      </div>
                      {passwordStrength.label && (
                        <div className="strength-label" style={{ color: passwordStrength.color }}>
                          {passwordStrength.label} password
                        </div>
                      )}
                      <ul className="requirements-list">
                        {passwordStrength.requirements.map((req, index) => (
                          <li key={index} className="requirement-item requirement-unmet">
                            <span>○</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="auth-field">
                  <label className="auth-label">Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <LockClosedIcon className="auth-input-icon" />
                    <input
                      type={showCf ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="auth-input"
                      style={{ paddingRight: 40 }}
                      required
                    />
                    <button type="button" className="auth-input-btn" onClick={() => setShowCf(s => !s)}>
                      {showCf ? <EyeSlashIcon style={{ width: 16, height: 16 }} /> : <EyeIcon style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>

                  {confirmPassword.length > 0 && (
                    <div className="match-indicator">
                      {passwordsMatch ? (
                        <>
                          <CheckCircleIcon style={{ width: 12, height: 12, color: "#10b981" }} />
                          <span style={{ color: "#10b981" }}>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <ExclamationCircleIcon style={{ width: 12, height: 12, color: "#dc2626" }} />
                          <span style={{ color: "#dc2626" }}>Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Vehicle Type */}
                <div className="auth-field">
                  <label className="auth-label">Vehicle Type</label>
                  <div className="auth-vehicle-group">
                    {Object.values(VehicleType).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setVehicle(v);
                          // Clear plate number when switching to bicycle
                          if (v === VehicleType.BICYCLE) {
                            setPlate("");
                          }
                        }}
                        className={`auth-vehicle-btn${vehicle === v ? " active" : ""}`}
                      >
                        {v === VehicleType.MOTORCYCLE ? "Motorcycle" :
                          v === VehicleType.BICYCLE ? "Bicycle" : "Car"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plate Number - Only show for motorcycles and cars */}
                {requiresPlateNumber && (
                  <div className="auth-field">
                    <label className="auth-label">Plate Number</label>
                    <div style={{ position: "relative" }}>
                      <TruckIcon className="auth-input-icon" />
                      <input
                        type="text"
                        value={plate}
                        onChange={e => {
                          const formatted = formatPlateNumber(e.target.value);
                          setPlate(formatted);
                        }}
                        placeholder="ABC 1234"
                        className={`auth-input ${plate && !isPlateNumberValid(plate) ? 'border-red-500 focus:ring-red-500' : ''}`}
                        required={requiresPlateNumber}
                      />
                    </div>
                    {plate && !isPlateNumberValid(plate) && (
                      <p className="text-xs text-red-500 mt-1">
                        Invalid plate format. Examples: ABC123, ABC1234, 1234AB, 123ABC
                      </p>
                    )}
                    {plate && isPlateNumberValid(plate) && (
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircleIcon style={{ width: 12, height: 12 }} />
                        Valid plate number format
                      </p>
                    )}
                    <p className="auth-subheading" style={{ fontSize: "10px", marginTop: "4px", color: "#c8b8b6" }}>
                      Examples: ABC123, ABC1234, 1234AB, 123ABC
                    </p>
                  </div>
                )}

                {/* Note for bicycle riders */}
                {!requiresPlateNumber && (
                  <div className="bicycle-notice">
                    🚲 Bicycles don't require a plate number. Please ensure you have proper safety equipment (helmet, lights, reflectors).
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitDisabled()}
                  className="auth-submit"
                >
                  {loading ? (
                    <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <ArrowRightIcon style={{ width: 16, height: 16 }} />
                    </>
                  )}
                </button>
              </form>

              <div className="auth-footer-links">
                <p className="auth-footer-text">
                  Already have an account?{" "}
                  <button className="auth-link" onClick={onNavigateLogin}>Log In</button>
                </p>
                <p className="auth-footer-text">
                  Customer sign up?{" "}
                  <button className="auth-link" onClick={onNavigateSignup}>Register here</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}