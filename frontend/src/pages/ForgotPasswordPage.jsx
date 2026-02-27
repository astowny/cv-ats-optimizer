import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/v1/auth/forgot-password", { email });
      setSubmitted(true);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
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

        <h1 className="text-xl font-bold text-gray-900 mb-2">Mot de passe oublié</h1>
        <p className="text-sm text-gray-500 mb-6">
          Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm">
            <p className="font-medium mb-1">Email envoyé !</p>
            <p>Si un compte existe avec cet email, vous recevrez un lien dans les prochaines minutes.</p>
            <p className="mt-3 text-gray-500">Vérifiez aussi vos spams.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Envoi en cours..." : "Envoyer le lien"}
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

