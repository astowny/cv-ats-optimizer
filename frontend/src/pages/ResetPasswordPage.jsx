import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <p className="text-red-600 font-medium mb-4">Lien invalide ou manquant.</p>
          <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm">
            Faire une nouvelle demande
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/v1/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <span className="text-2xl font-bold text-blue-600">CV ATS</span>
          <span className="text-2xl font-bold text-gray-800">Optimizer</span>
        </Link>

        <h1 className="text-xl font-bold text-gray-900 mb-6">Nouveau mot de passe</h1>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm">
            <p className="font-medium">Mot de passe réinitialisé !</p>
            <p className="mt-1">Redirection vers la connexion...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: "Nouveau mot de passe", value: password, setValue: setPassword, show: showPassword, setShow: setShowPassword },
                { label: "Confirmer le mot de passe", value: confirm, setValue: setConfirm, show: showConfirm, setShow: setShowConfirm },
              ].map(({ label, value, setValue, show, setShow }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={value}
                      onChange={e => setValue(e.target.value)}
                      required
                      minLength={8}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="button" onClick={() => setShow(v => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      tabIndex={-1} aria-label={show ? "Masquer" : "Afficher"}>
                      <EyeIcon open={show} />
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-blue-600 hover:underline">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}

