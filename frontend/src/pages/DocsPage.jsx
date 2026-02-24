import { Link } from "react-router-dom";

const endpoints = [
  {
    method: "POST", path: "/v1/auth/register", auth: false,
    desc: "Creer un compte utilisateur",
    body: `{"email": "user@example.com", "password": "mypassword123"}`,
    resp: `{"token": "eyJ...", "user": {"id": "uuid", "email": "user@example.com", "plan": "free"}}`
  },
  {
    method: "POST", path: "/v1/auth/login", auth: false,
    desc: "Se connecter et obtenir un token JWT",
    body: `{"email": "user@example.com", "password": "mypassword123"}`,
    resp: `{"token": "eyJ...", "user": {"id": "uuid", "email": "user@example.com", "plan": "free"}}`
  },
  {
    method: "POST", path: "/v1/analyze", auth: true,
    desc: "Analyser un CV par rapport a une offre d emploi. Accepte text/JSON ou multipart/form-data (PDF).",
    body: `{"cv_text": "...", "job_description": "...", "language": "fr"}`,
    resp: `{"id": "uuid", "ats_score": 72, "matching_keywords": ["React", "Node.js"], "missing_keywords": ["Docker"], "strengths": [...], "improvements": [...], "suggestions": [...], "summary": "...", "tokens_used": 1234, "quota_remaining": 2}`
  },
  {
    method: "GET", path: "/v1/analyze/history", auth: true,
    desc: "Historique des 20 dernières analyses (JWT uniquement)",
    body: null,
    resp: `[{"id": "uuid", "ats_score": 72, "summary": "...", "created_at": "2026-02-24T..."}]`
  },
  {
    method: "GET", path: "/v1/keys", auth: true,
    desc: "Lister vos cles API (les secrets ne sont jamais retournes)",
    body: null,
    resp: `[{"id": "uuid", "name": "Mon app", "key_prefix": "sk-ats-AbCd", "plan": "pro", "used_this_month": 12, "monthly_quota": 100}]`
  },
  {
    method: "POST", path: "/v1/keys", auth: true,
    desc: "Creer une nouvelle cle API. Le secret est affiche une seule fois.",
    body: `{"name": "Mon app production", "plan": "pro"}`,
    resp: `{"id": "uuid", "key": "sk-ats-...", "warning": "Save this key now...", "name": "Mon app production", "plan": "pro"}`
  },
  {
    method: "DELETE", path: "/v1/keys/:id", auth: true,
    desc: "Revoquer une cle API",
    body: null,
    resp: `{"message": "API key revoked successfully."}`
  }
];

const methodColor = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800"
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-bold"><span className="text-blue-600">CV ATS</span> Optimizer</Link>
          <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Commencer</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Documentation API</h1>
        <p className="text-lg text-gray-600 mb-2">API REST — Base URL : <code className="bg-gray-100 px-2 py-0.5 rounded text-blue-700">https://api.cv-ats-optimizer.com</code></p>
        <p className="text-gray-500 mb-10">Une interface Swagger interactive est aussi disponible sur <code className="bg-gray-100 px-2 py-0.5 rounded">/docs</code> quand le serveur tourne.</p>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-10">
          <h2 className="font-bold text-blue-900 mb-3">🔐 Authentification</h2>
          <p className="text-blue-800 text-sm mb-3">Tous les endpoints proteges acceptent un header <code className="bg-white px-1 rounded">Authorization: Bearer TOKEN</code> avec :</p>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Un <strong>token JWT</strong> obtenu via <code className="bg-white px-1 rounded">/v1/auth/login</code> (pour les apps web)</li>
            <li>• Une <strong>cle API</strong> au format <code className="bg-white px-1 rounded">sk-ats-...</code> (pour les intégrations developer)</li>
          </ul>
        </div>

        <div className="space-y-4">
          {endpoints.map((ep, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${methodColor[ep.method]}`}>{ep.method}</span>
                <code className="font-mono text-gray-900 font-medium">{ep.path}</code>
                {ep.auth && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-auto">🔐 Auth requise</span>}
              </div>
              <div className="px-5 py-4">
                <p className="text-gray-700 text-sm mb-3">{ep.desc}</p>
                {ep.body && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-500 mb-1">BODY</div>
                    <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs overflow-x-auto">{ep.body}</pre>
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">RESPONSE</div>
                  <pre className="bg-gray-900 text-blue-300 rounded-lg p-3 text-xs overflow-x-auto">{ep.resp}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-gray-900 text-white rounded-2xl p-6">
          <h2 className="font-bold mb-3">Exemple complet (curl)</h2>
          <pre className="text-green-400 text-xs overflow-x-auto">{`# 1. Creer un compte
curl -X POST https://api.cv-ats-optimizer.com/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"strongpass123"}'

# 2. Analyser un CV (JSON)
curl -X POST https://api.cv-ats-optimizer.com/v1/analyze \\
  -H "Authorization: Bearer sk-ats-YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"cv_text":"Jean Dupont...","job_description":"Nous recherchons...","language":"fr"}'

# 3. Analyser avec un PDF
curl -X POST https://api.cv-ats-optimizer.com/v1/analyze \\
  -H "Authorization: Bearer sk-ats-YOUR_API_KEY" \\
  -F "cv_file=@mon-cv.pdf" \\
  -F "job_description=Nous recherchons..." \\
  -F "language=fr"`}</pre>
        </div>
      </div>
    </div>
  );
}
