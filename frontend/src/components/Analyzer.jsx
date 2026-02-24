import { useState, useRef } from "react";
import api from "../api/client";

function ScoreBadge({ score }) {
  const color = score >= 70 ? "bg-green-100 text-green-800" : score >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${color}`}>
      <span>{score}/100</span>
    </div>
  );
}

export default function Analyzer() {
  const [inputMode, setInputMode] = useState("text");
  const [cvText, setCvText] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [jobDesc, setJobDesc] = useState("");
  const [language, setLanguage] = useState("fr");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleAnalyze = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const formData = new FormData();
      if (inputMode === "pdf" && cvFile) formData.append("cv_file", cvFile);
      else formData.append("cv_text", cvText);
      formData.append("job_description", jobDesc);
      formData.append("language", language);

      const res = await api.post("/v1/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "L analyse a echoue. Veuillez reessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Analyser mon CV</h2>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-4 w-fit">
          <button onClick={() => setInputMode("text")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${inputMode === "text" ? "bg-white shadow" : "text-gray-500"}`}>
            Coller le texte
          </button>
          <button onClick={() => setInputMode("pdf")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${inputMode === "pdf" ? "bg-white shadow" : "text-gray-500"}`}>
            Uploader PDF
          </button>
        </div>

        {inputMode === "text" ? (
          <textarea value={cvText} onChange={e => setCvText(e.target.value)} rows={8}
            placeholder="Collez ici le contenu complet de votre CV..."
            className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
        ) : (
          <div className="mb-4">
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition">
              {cvFile ? (
                <div className="text-blue-600 font-medium">📄 {cvFile.name}</div>
              ) : (
                <>
                  <div className="text-4xl mb-2">📎</div>
                  <p className="text-gray-500 text-sm">Cliquez pour selectionner un PDF (max 5MB)</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
              onChange={e => setCvFile(e.target.files[0])} />
          </div>
        )}

        <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} rows={5}
          placeholder="Collez ici l offre d emploi complete..."
          className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />

        <div className="flex items-center gap-4">
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="fr">Francais</option>
            <option value="en">English</option>
          </select>
          <button onClick={handleAnalyze} disabled={loading || (!cvText && !cvFile) || !jobDesc}
            className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? "Analyse en cours..." : "Analyser"}
          </button>
        </div>

        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
      </div>

      {result && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Resultat de l analyse</h3>
            <ScoreBadge score={result.ats_score} />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm italic">{result.summary}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">✅ Mots-cles correspondants ({result.matching_keywords?.length})</h4>
              <div className="flex flex-wrap gap-2">
                {result.matching_keywords?.map(k => <span key={k} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{k}</span>)}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-red-700 mb-2">❌ Mots-cles manquants ({result.missing_keywords?.length})</h4>
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords?.map(k => <span key={k} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">{k}</span>)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">💪 Points forts</h4>
              <ul className="space-y-1">{result.strengths?.map((s, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500 mt-0.5">•</span>{s}</li>)}</ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🔧 Ameliorations prioritaires</h4>
              <ul className="space-y-1">{result.improvements?.map((s, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-orange-500 mt-0.5">•</span>{s}</li>)}</ul>
            </div>
          </div>

          {result.suggestions?.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">📝 Suggestions detaillees</h4>
              <div className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4">
                    <div className="text-xs font-bold uppercase text-gray-400 mb-1">{s.section}</div>
                    <p className="text-sm text-red-600 mb-2">⚠️ {s.issue}</p>
                    <p className="text-sm text-gray-700">💡 {s.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.quota_remaining !== undefined && (
            <p className="text-xs text-gray-400 text-right">Analyses restantes ce mois : {result.quota_remaining === -1 ? "illimitees" : result.quota_remaining}</p>
          )}
        </div>
      )}
    </div>
  );
}
