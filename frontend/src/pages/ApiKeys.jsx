import { useState, useEffect } from "react";
import api from "../api/client";

const PLANS = ["free", "pay_per_use", "pro", "business"];

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free");
  const [newKey, setNewKey] = useState(null);
  const [error, setError] = useState("");

  const fetchKeys = async () => {
    try {
      const res = await api.get("/v1/keys");
      setKeys(res.data);
    } catch (e) {
      setError("Impossible de charger les cles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setNewKey(null);
    try {
      const res = await api.post("/v1/keys", { name, plan });
      setNewKey(res.data);
      setName("");
      fetchKeys();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la creation.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm("Revoquer cette cle API ? Cette action est irreversible.")) return;
    try {
      await api.delete(`/v1/keys/${id}`);
      fetchKeys();
    } catch {
      setError("Erreur lors de la revocation.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Creer une cle API</h2>
        {newKey && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-green-800 mb-2">✅ Cle creee ! Copiez-la maintenant, elle ne sera plus affichee.</p>
            <code className="block bg-white border border-green-300 rounded-lg px-3 py-2 text-sm font-mono break-all select-all">{newKey.key}</code>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input value={name} onChange={e => setName(e.target.value)} required
            placeholder="Nom de la cle (ex: Mon app production)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={plan} onChange={e => setPlan(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button type="submit" disabled={creating}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {creating ? "..." : "Creer"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mes cles API</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Aucune cle API. Creez-en une ci-dessus.</div>
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <div key={k.id} className={`border rounded-xl p-4 flex items-center justify-between gap-4 ${!k.is_active ? "opacity-50 bg-gray-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{k.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{k.plan}</span>
                    {!k.is_active && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Revoquee</span>}
                  </div>
                  <code className="text-xs text-gray-500 font-mono">{k.key_prefix}...</code>
                  <span className="text-xs text-gray-400 ml-3">{k.used_this_month}/{k.monthly_quota === -1 ? "∞" : k.monthly_quota} ce mois</span>
                </div>
                {k.is_active && (
                  <button onClick={() => handleRevoke(k.id)}
                    className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition">
                    Revoquer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
