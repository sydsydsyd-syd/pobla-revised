import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  EnvelopeIcon, LockClosedIcon, UserIcon, MapPinIcon, PhoneIcon, CheckCircleIcon,
  EyeIcon, EyeSlashIcon, ExclamationCircleIcon, ArrowRightIcon,
} from "@heroicons/react/24/outline";

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
    "auth/email-already-in-use": "Email already in use. Please log in instead.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/invalid-email": "Invalid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

interface SignupPageProps {
  onNavigateLogin: () => void;
  onNavigateRider: () => void;
}

export default function SignupPage({ onNavigateLogin, onNavigateRider }: SignupPageProps) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [address, setAddress] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirm && password.length > 0 && confirm.length > 0;
  const isPasswordValid = passwordStrength.score >= 3;

  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^(09|\+639)\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !phone || !password || !confirm || !address) {
      return setError("Please fill in all fields.");
    }
    if (!isValidPhone(phone)) {
      return setError("Please enter a valid phone number (e.g., 09123456789 or +639123456789).");
    }
    if (password !== confirm) return setError("Passwords do not match.");
    if (!isPasswordValid) return setError("Please use a stronger password (at least 'Good' strength).");
    if (address.length < 10) return setError("Please enter a complete delivery address (at least 10 characters).");

    setLoading(true);
    setError(null);

    try {
      await register(name.trim(), email, password, phone, address);
      setVerificationSent(true);
    }
    catch (err: unknown) {
      const errorCode = (err as { code?: string }).code;
      setError(firebaseError(errorCode ?? ""));
    }
    finally { setLoading(false); }
  }

  // Show verification screen after registration
  if (verificationSent) {
    return (
      <>
        <style>{`
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
            max-height: 90vh;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
            animation: slideUp 0.25s cubic-bezier(.22,.68,0,1.2);
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
            max-height: 90vh;
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
            flex: 1;
            background: #fdfaf9;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            max-height: 90vh;
          }

          .auth-mobile-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 20px 24px 0;
            flex-shrink: 0;
            background: #fdfaf9;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          @media (min-width: 640px) { .auth-mobile-header { display: none; } }

          .auth-mobile-logo {
            width: 36px; height: 36px; border-radius: 10px; overflow: hidden;
            border: 2px solid #bc5d5d;
            flex-shrink: 0;
          }
          .auth-mobile-logo img { width: 100%; height: 100%; object-fit: cover; }
          .auth-mobile-title {
            font-family: 'Syne', sans-serif;
            font-size: 15px; font-weight: 800;
            color: #2a1715; letter-spacing: -0.3px;
          }

          .auth-success-body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px 32px;
            text-align: center;
            flex: 1;
          }
          .auth-success-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fef3c7;
            border: 2px solid #fde68a;
            margin-bottom: 24px;
          }
          .auth-success-title {
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            font-size: 24px;
            color: #1e100e;
            letter-spacing: -0.4px;
            margin-bottom: 12px;
          }
          .auth-success-desc {
            font-family: 'DM Sans', sans-serif;
            font-size: 14px;
            color: #6b7280;
            line-height: 1.7;
            margin-bottom: 8px;
          }
          .auth-success-email {
            font-family: 'DM Sans', sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: #bc5d5d;
            margin-bottom: 20px;
          }
          .auth-success-note {
            font-family: 'DM Sans', sans-serif;
            font-size: 12px;
            color: #9a8180;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .auth-submit {
            width: 100%;
            max-width: 260px;
            padding: 13px;
            border-radius: 12px;
            border: none;
            background: #bc5d5d;
            color: #fff;
            font-family: 'DM Sans', sans-serif;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: opacity 0.15s, transform 0.1s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .auth-submit:hover { opacity: 0.9; transform: translateY(-1px); }
        `}</style>

        <div className="auth-overlay">
          <div className="auth-card">
            <div className="auth-left">
              <div className="auth-left-bg" />
              <div className="auth-left-dots" />
              <div style={{ position: "relative" }}>
                <div className="auth-logo-wrap">
                  <img src="/logo.png" alt="Pobla" />
                </div>
                <div className="auth-brand-title">POBLA</div>
                <div className="auth-brand-sub">ORDER HUB</div>
                <p className="auth-brand-desc">Authentic Filipino Cuisine.<br />Order fresh, delivered fast.</p>
              </div>
              <nav className="auth-nav">
                <button className="auth-nav-item" onClick={onNavigateLogin}>Log In</button>
                <div className="auth-nav-item active">Sign Up</div>
                <button className="auth-nav-item" onClick={onNavigateRider}>Rider Registration</button>
              </nav>
              <span className="auth-copy">© 2025 Poblacion Pares Atbp.</span>
            </div>

            <div className="auth-right">
              <div className="auth-mobile-header">
                <div className="auth-mobile-logo"><img src="/logo.png" alt="Pobla" /></div>
                <span className="auth-mobile-title">POBLA ORDER HUB</span>
              </div>

              <div className="auth-success-body">
                <div className="auth-success-icon">
                  <EnvelopeIcon style={{ width: 40, height: 40, color: "#d97706" }} />
                </div>
                <h2 className="auth-success-title">Verify Your Email</h2>
                <p className="auth-success-desc">
                  We've sent a verification link to:
                </p>
                <p className="auth-success-email">
                  {email}
                </p>
                <p className="auth-success-note">
                  Please check your inbox and click the verification link<br />
                  to activate your account. Then you can log in.
                </p>
                <button onClick={onNavigateLogin} className="auth-submit">
                  <span>Go to Login</span>
                  <ArrowRightIcon style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Original Signup Form
  return (
    <>
      <style>{`
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
          max-height: 90vh;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
          animation: slideUp 0.25s cubic-bezier(.22,.68,0,1.2);
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
          max-height: 90vh;
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
          line-height: 1;
          margin-top: 20px;
        }
        .auth-brand-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 600;
          letter-spacing: 3px;
          color: #bc5d5d;
          margin-top: 4px;
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
        .auth-nav-item.active {
          background: #bc5d5d; color: #fff;
        }
        .auth-nav-item:not(.active) {
          background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5);
        }
        .auth-nav-item:not(.active):hover {
          background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8);
        }

        .auth-copy {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px; color: rgba(255,255,255,0.18);
          position: relative;
        }

        .auth-right {
          flex: 1;
          background: #fdfaf9;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          max-height: 90vh;
        }

        .auth-mobile-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 24px 0;
          flex-shrink: 0;
          background: #fdfaf9;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        @media (min-width: 640px) { .auth-mobile-header { display: none; } }

        .auth-mobile-logo {
          width: 36px; height: 36px; border-radius: 10px; overflow: hidden;
          border: 2px solid #bc5d5d;
          flex-shrink: 0;
        }
        .auth-mobile-logo img { width: 100%; height: 100%; object-fit: cover; }
        .auth-mobile-title {
          font-family: 'Syne', sans-serif;
          font-size: 15px; font-weight: 800;
          color: #2a1715; letter-spacing: -0.3px;
        }

        .auth-mobile-tabs {
          display: flex;
          gap: 4px;
          margin: 16px 24px 0;
          padding: 4px;
          border-radius: 12px;
          background: #ede7e6;
          flex-shrink: 0;
          position: sticky;
          top: 56px;
          z-index: 10;
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
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 24px 32px 32px;
          max-width: 400px;
          width: 100%;
          margin: 0 auto;
          overflow-y: visible;
        }

        .auth-form-content {
          width: 100%;
          padding-bottom: 20px;
        }

        .auth-heading {
          font-family: 'Syne', sans-serif;
          font-weight: 800; font-size: 26px;
          color: #1e100e; letter-spacing: -0.5px;
          line-height: 1.1;
        }
        .auth-subheading {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; color: #9a8180;
          margin-top: 5px;
        }

        .auth-error {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 12px; border-radius: 10px;
          background: #fff1f1; border: 1px solid #fca5a5;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; color: #dc2626;
          margin-top: 18px;
        }

        .auth-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: #b09f9e;
          display: block; margin-bottom: 6px;
        }

        .auth-field {
          position: relative; margin-top: 14px;
        }
        .auth-input {
          width: 100%; box-sizing: border-box;
          padding: 11px 14px 11px 40px;
          border-radius: 12px;
          border: 1.5px solid #e5dcdb;
          background: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; color: #1e100e;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .auth-input::placeholder { color: #c8b8b6; }
        .auth-input:focus {
          border-color: #bc5d5d;
          box-shadow: 0 0 0 3px rgba(188,93,93,0.12);
        }
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
        .requirement-met {
          color: #10b981;
          background: rgba(16, 185, 129, 0.08);
        }
        .requirement-unmet {
          color: #9a8180;
          background: rgba(188, 93, 93, 0.08);
        }
        .requirement-icon {
          width: 10px;
          height: 10px;
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

        .auth-submit {
          width: 100%; margin-top: 20px;
          padding: 13px;
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
          text-decoration: none;
        }
        .auth-link:hover { text-decoration: underline; }
      `}</style>

      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-left">
            <div className="auth-left-bg" />
            <div className="auth-left-dots" />
            <div style={{ position: "relative" }}>
              <div className="auth-logo-wrap">
                <img src="/logo.png" alt="Pobla" />
              </div>
              <div className="auth-brand-title">POBLA</div>
              <div className="auth-brand-sub">ORDER HUB</div>
              <p className="auth-brand-desc">Authentic Filipino Cuisine.<br />Order fresh, delivered fast.</p>
            </div>
            <nav className="auth-nav">
              <button className="auth-nav-item" onClick={onNavigateLogin}>Log In</button>
              <div className="auth-nav-item active">Sign Up</div>
              <button className="auth-nav-item" onClick={onNavigateRider}>Rider Registration</button>
            </nav>
            <span className="auth-copy">© 2025 Poblacion Pares Atbp.</span>
          </div>

          <div className="auth-right">
            <div className="auth-mobile-header">
              <div className="auth-mobile-logo"><img src="/logo.png" alt="Pobla" /></div>
              <span className="auth-mobile-title">POBLA ORDER HUB</span>
            </div>

            <div className="auth-mobile-tabs">
              <button className="auth-tab" onClick={onNavigateLogin}>Log In</button>
              <button className="auth-tab active">Sign Up</button>
              <button className="auth-tab" onClick={onNavigateRider}>Rider</button>
            </div>

            <div className="auth-form-area">
              <div className="auth-form-content">
                <div>
                  <h2 className="auth-heading">Create an account</h2>
                  <p className="auth-subheading">Join us and start ordering</p>
                </div>

                {error && (
                  <div className="auth-error">
                    <ExclamationCircleIcon style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: error ? 0 : 20 }}>
                  {/* Full Name */}
                  <div className="auth-field" style={{ marginTop: error ? 14 : 0 }}>
                    <label className="auth-label">Full Name</label>
                    <div style={{ position: "relative" }}>
                      <UserIcon className="auth-input-icon" />
                      <input
                        type="text" value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Juan dela Cruz" autoComplete="name"
                        className="auth-input"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="auth-field">
                    <label className="auth-label">Email</label>
                    <div style={{ position: "relative" }}>
                      <EnvelopeIcon className="auth-input-icon" />
                      <input
                        type="email" value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="juan@email.com" autoComplete="email"
                        className="auth-input"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="auth-field">
                    <label className="auth-label">Phone Number</label>
                    <div style={{ position: "relative" }}>
                      <PhoneIcon className="auth-input-icon" />
                      <input
                        type="tel" value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="09123456789" autoComplete="tel"
                        className="auth-input"
                      />
                    </div>
                    <p className="auth-subheading" style={{ fontSize: "10px", marginTop: "4px", color: "#c8b8b6" }}>
                      Format: 09123456789
                    </p>
                  </div>

                  {/* Address */}
                  <div className="auth-field">
                    <label className="auth-label">Default Delivery Address</label>
                    <div style={{ position: "relative" }}>
                      <MapPinIcon className="auth-input-icon" />
                      <input
                        type="text" value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Street, City, Landmark"
                        className="auth-input"
                      />
                    </div>
                    <p className="auth-subheading" style={{ fontSize: "10px", marginTop: "4px", color: "#c8b8b6" }}>
                      This will be your default address for delivery orders
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
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="auth-input"
                        style={{ paddingRight: 40 }}
                      />
                      <button type="button" className="auth-input-btn" onClick={() => setShowCf(s => !s)}>
                        {showCf ? <EyeSlashIcon style={{ width: 16, height: 16 }} /> : <EyeIcon style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>

                    {confirm.length > 0 && (
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

                  <button
                    type="submit"
                    disabled={loading || !isPasswordValid || !passwordsMatch || !name || !email || !phone || !address}
                    className="auth-submit"
                  >
                    {loading ? (
                      <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <>
                        <span>Create Account</span>
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
                    Applying as a rider?{" "}
                    <button className="auth-link" onClick={onNavigateRider}>Register here</button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}