import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Analyzer from "../components/Analyzer";
import ApiKeys from "./ApiKeys";

function TrialBanner({ trialEndsAt }) {
  if (!trialEndsAt) return null;
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)));
  if (daysLeft <= 0) return null;
  const urgent = daysLeft <= 7;
  return (
    <div className={`px-4 py-2 text-sm text-center font-medium ${urgent ? "bg-orange-500 text-white" : "bg-blue-600 text-white"}`}>
      🎉 Essai gratuit illimité — encore <strong>{daysLeft} jour{daysLeft > 1 ? "s" : ""}</strong>
      {urgent && " · Passez à un plan payant pour conserver l'accès"}
    </div>
  );
}

function NavLink({ to, icon, label }) {
  const loc = useLocation();
  const active = loc.pathname.startsWith(to);
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}>
      <span>{icon}</span>{label}
    </Link>
  );
}

function planLabel(plan) {
  if (plan === "trial") return "🎁 Essai gratuit";
  if (plan === "free") return "Gratuit";
  if (plan === "pro") return "Pro";
  if (plan === "business") return "Business";
  return plan;
}

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {user?.plan === "trial" && <TrialBanner trialEndsAt={user?.trial_ends_at} />}
      <div className="flex flex-1">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <span className="text-lg font-bold"><span className="text-blue-600">CV ATS</span> Optimizer</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/dashboard/analyze" icon="🔍" label="Analyser un CV" />
          <NavLink to="/dashboard/keys" icon="🔑" label="Cles API" />
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-1">{user?.email}</div>
          <div className="text-xs text-blue-600 font-medium mb-3">{planLabel(user?.plan)}</div>
          <button onClick={logout} className="text-xs text-gray-500 hover:text-red-500 transition">Se déconnecter</button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route index element={<Navigate to="analyze" replace />} />
          <Route path="analyze" element={<Analyzer />} />
          <Route path="keys" element={<ApiKeys />} />
        </Routes>
      </main>
      </div>
    </div>
  );
}
