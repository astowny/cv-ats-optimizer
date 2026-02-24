import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Analyzer from "../components/Analyzer";
import ApiKeys from "./ApiKeys";

function NavLink({ to, icon, label }) {
  const loc = useLocation();
  const active = loc.pathname.startsWith(to);
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}>
      <span>{icon}</span>{label}
    </Link>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
          <div className="text-xs text-blue-600 font-medium capitalize mb-3">Plan {user?.plan}</div>
          <button onClick={logout} className="text-xs text-gray-500 hover:text-red-500 transition">Se deconnecter</button>
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
  );
}
