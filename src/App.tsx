import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider, useApp } from "@/context/AppContext";
import Navbar from "@/components/shared/Navbar";
import LoginPage from "@/components/auth/LoginPage";
import SignupPage from "@/components/auth/SignupPage";
import RiderRegistrationPage from "@/components/auth/RiderRegistrationPage";
import CustomerMenu from "@/components/customer/CustomerMenu";
import CartSidebar from "@/components/customer/CartSidebar";
import KitchenDashboard from "@/components/kitchen/KitchenDashboard";
import DeliveryDashboard from "@/components/delivery/DeliveryDashboard";
import OwnerDashboard from "@/components/owner/OwnerDashboard";

function AuthLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background:"#3b3130" }}>
      <svg className="animate-spin w-10 h-10 mb-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="#bc5d5d" strokeWidth="4"/>
        <path className="opacity-80" fill="#bc5d5d" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <p className="text-sm font-semibold text-white/40">Loading Pobla Order Hub…</p>
    </div>
  );
}

function RejectedPage() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background:"#3b3130" }}>
      <div className="text-center max-w-sm">
        
        <h2 className="font-display font-black text-2xl text-white mb-2">Registration Rejected</h2>
        <p className="text-white/50 text-sm mb-6">
        Your rider registration was not approved. Please contact the restaurant owner for more details.
        </p>
        <button onClick={logout}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all"style={{ background:"#bc5d5d" }}>
        Sign Out
        </button>
      </div>
    </div>
  );
}

function PendingApprovalPage() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background:"#3b3130" }}>
      <div className="text-center max-w-sm">
        
        <h2 className="font-display font-black text-2xl text-white mb-2">Pending Approval</h2>
        <p className="text-white/50 text-sm mb-6">
        Your rider registration is being reviewed by the admin. You'll receive access once approved.
          Please check back later.
        </p>
        <button onClick={logout}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all"style={{ background:"rgba(188,93,93,0.5)" }}>
        Sign Out
        </button>
      </div>
    </div>
  );
}

type AuthPage = "login" | "signup" | "rider";

function AppContent() {
  const { user, userRole, isGuest, authLoading } = useAuth();
  const { dispatch } = useApp();
  const [cartOpen, setCartOpen]       = useState(false);
  const [authOpen, setAuthOpen]       = useState(false);
  const [authPage, setAuthPage]       = useState<AuthPage>("login");

  // Auto-close auth overlay once user is logged in
  useEffect(() => {
    if (user && authOpen) setAuthOpen(false);
  }, [user]);

  function openAuth(page: AuthPage = "login") {
    setAuthPage(page);
    setAuthOpen(true);
  }

  // Sync Firestore role → AppContext
  useEffect(() => {
    if (userRole) dispatch({ type: "SET_ROLE", payload: userRole as any });
  }, [userRole, dispatch]);

  if (authLoading) return <AuthLoading />;

  // Handle special pending/rejected states
  if (userRole === "delivery_pending") return <PendingApprovalPage />;
  if (userRole === "rejected") return <RejectedPage />;

  // Not logged in — show CustomerMenu as default landing page
  // Auth pages appear as overlays when login button is clicked
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar onCartClick={() => {}} onLoginClick={() => openAuth("login")} />
        <main><CustomerMenu onOpenCart={() => {}} onLoginClick={() => openAuth("login")} /></main>
        {authOpen && authPage === "login" && (
          <LoginPage
            onClose={() => setAuthOpen(false)}
            onNavigateSignup={() => setAuthPage("signup")}
            onNavigateRider={() => setAuthPage("rider")}
          />
        )}
        {authOpen && authPage === "signup" && (
          <SignupPage
            onNavigateLogin={() => setAuthPage("login")}
            onNavigateRider={() => setAuthPage("rider")}
          />
        )}
        {authOpen && authPage === "rider" && (
          <RiderRegistrationPage
            onNavigateLogin={() => setAuthPage("login")}
            onNavigateSignup={() => setAuthPage("signup")}
          />
        )}
      </div>
    );
  }

  const role = userRole ?? "customer";

  // 4 roles: customer, kitchen, delivery, owner
  const pages: Record<string, React.ReactNode> = {
    customer: <CustomerMenu onOpenCart={() => setCartOpen(true)} onLoginClick={() => openAuth("login")} />,
    kitchen:  <KitchenDashboard />,
    delivery: <DeliveryDashboard />,
    owner:    <OwnerDashboard />,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onCartClick={() => setCartOpen(true)} onLoginClick={() => openAuth("login")} />
      <main>{pages[role] ?? <CustomerMenu onOpenCart={() => setCartOpen(true)} />}</main>
      {role === "customer" && (
        <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
      )}
      {authOpen && authPage === "login" && (
        <LoginPage onClose={() => setAuthOpen(false)} onNavigateSignup={() => setAuthPage("signup")} onNavigateRider={() => setAuthPage("rider")} />
      )}
      {authOpen && authPage === "signup" && (
        <SignupPage onNavigateLogin={() => setAuthPage("login")} onNavigateRider={() => setAuthPage("rider")} />
      )}
      {authOpen && authPage === "rider" && (
        <RiderRegistrationPage onNavigateLogin={() => setAuthPage("login")} onNavigateSignup={() => setAuthPage("signup")} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}