import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const features = [
  { icon: "🎯", title: "Score ATS precis", desc: "Notre IA calcule un score de compatibilite 0-100 base sur les algorithmes ATS reels utilises par les recruteurs." },
  { icon: "🔑", title: "Mots-cles manquants", desc: "Identifie exactement quels mots-cles de l offre sont absents de votre CV pour maximiser vos chances." },
  { icon: "✍️", title: "Suggestions concretes", desc: "Recoit des suggestions de reedition par section : titre, experience, competences, formation." },
  { icon: "📄", title: "PDF + texte", desc: "Collez votre CV en texte ou uploadez directement votre PDF. L analyse s adapte." },
  { icon: "🌍", title: "FR & EN", desc: "Analyse disponible en francais et en anglais pour les marches europeens et internationaux." },
  { icon: "⚡", title: "API developer-first", desc: "Integrez l analyse ATS dans vos apps via notre API REST. Cles API auto-service, quotas flexibles." }
];

const plans = [
  { name: "Free", price: "0", period: "mois", quota: "3 analyses/mois", features: ["Score ATS", "Mots-cles", "Suggestions"], cta: "Commencer gratuit", href: "/login", highlight: false },
  { name: "Pro", price: "9,99", period: "mois", quota: "100 analyses/mois", features: ["Tout Free", "Historique", "API access", "Support email"], cta: "Essayer Pro", href: "/login", highlight: true },
  { name: "Business API", price: "49,99", period: "mois", quota: "1 000 analyses/mois", features: ["Tout Pro", "1000 analyses API", "Webhooks", "SLA 99.9%"], cta: "Contacter", href: "/login", highlight: false }
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold"><span className="text-blue-600">CV ATS</span> Optimizer</span>
          <div className="flex items-center gap-4">
            <Link to="/docs" className="text-gray-600 hover:text-blue-600 text-sm">API Docs</Link>
            {user ? (
              <Link to="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Dashboard</Link>
            ) : (
              <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Commencer</Link>
            )}
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span>✨</span> API-first — Vends l acces a l API
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Optimisez votre CV pour<br /><span className="text-blue-600">passer les filtres ATS</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            75% des CV sont rejetes par les ATS avant qu un humain les lise. Analysez votre CV contre l offre d emploi, obtenez un score et des suggestions concretes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium text-lg hover:bg-blue-700 transition">
              Analyser mon CV gratuitement
            </Link>
            <Link to="/docs" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-medium text-lg hover:border-blue-400 transition">
              Documentation API
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">3 analyses gratuites — sans carte bancaire</p>
        </div>
      </section>

      <section className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Tout ce dont vous avez besoin</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 hover:bg-blue-50 transition">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Pour les developpeurs</h2>
          <p className="text-center text-gray-400 mb-10">Integrez l analyse ATS directement dans vos applications RH, plateformes d emploi ou outils de recrutement.</p>
          <div className="bg-gray-800 rounded-2xl p-6 font-mono text-sm overflow-x-auto">
            <div className="text-gray-400 mb-2"># Analyse un CV en 3 lignes de code</div>
            <div><span className="text-blue-400">curl</span> -X POST https://api.cv-ats-optimizer.com/v1/analyze \</div>
            <div className="ml-4"><span className="text-yellow-400">-H</span> <span className="text-green-400">"Authorization: Bearer sk-ats-YOUR_KEY"</span> \</div>
            <div className="ml-4"><span className="text-yellow-400">-H</span> <span className="text-green-400">"Content-Type: application/json"</span> \</div>
            <div className="ml-4"><span className="text-yellow-400">-d</span> <span className="text-green-400">{'\'{"cv_text":"...","job_description":"...","language":"fr"}\''}</span></div>
          </div>
          <div className="text-center mt-6">
            <Link to="/docs" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Voir la documentation complete</Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Tarifs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.name} className={`rounded-2xl p-6 border-2 ${p.highlight ? "border-blue-600 shadow-lg" : "border-gray-200"}`}>
              {p.highlight && <div className="text-center text-blue-600 text-xs font-bold uppercase tracking-wide mb-2">Populaire</div>}
              <h3 className="text-xl font-bold mb-1">{p.name}</h3>
              <div className="text-3xl font-bold mb-1">{p.price}<span className="text-base font-normal text-gray-500">€/{p.period}</span></div>
              <p className="text-sm text-gray-600 mb-4">{p.quota}</p>
              <ul className="space-y-2 mb-6">
                {p.features.map(f => <li key={f} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500">✓</span>{f}</li>)}
              </ul>
              <Link to={p.href} className={`block text-center py-2 rounded-lg font-medium transition ${p.highlight ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-gray-300 text-gray-700 hover:border-blue-400"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <p>CV ATS Optimizer — API-first CV analysis tool</p>
        <p className="mt-2"><Link to="/docs" className="hover:text-white">API Docs</Link> · <Link to="/login" className="hover:text-white">Se connecter</Link></p>
      </footer>
    </div>
  );
}
