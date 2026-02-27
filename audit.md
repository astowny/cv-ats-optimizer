




Maintenant j'ai une vue complète du code. Voici un **audit complet** du projet :

---

## ✅ Ce qui est bien fait

| | |
|---|---|
| **Sécurité auth** | bcrypt coût 12, SHA-256 pour les API keys, JWT 7j, `email.toLowerCase().trim()` |
| **Injection SQL** | 100% requêtes paramétrées (`$1`, `$2`...) — aucune concatenation |
| **Rate limiting** | 3 couches : général (200/15min), auth (20/15min), analyze (15/min) |
| **Upload PDF** | Taille limitée à 5MB, MIME type vérifié |
| **CORS** | `*` en dev, URL restreinte en prod via `FRONTEND_URL` |
| **Docker** | Dockerfile + docker-compose avec healthcheck PostgreSQL |
| **Quota système** | Reset mensuel automatique, plans distincts |
| **OpenAI** | `response_format: json_object` + validation du résultat |

---

## ⚠️ Ce qui manque / problèmes

### 🔴 Critique
- **Pas de Helmet.js** — aucun header de sécurité HTTP (CSP, X-Frame-Options, HSTS, X-Content-Type-Options)
- **JWT dans localStorage** — vulnérable au XSS ; des httpOnly cookies seraient plus sûrs
- **Race condition sur les quotas** — le check et l'increment sont deux requêtes séparées, pas atomiques (risque de dépassement sous charge)
- **Fallback JWT_SECRET dangereux** — `auth.js` ligne 3 a une valeur par défaut si l'env n'est pas définie

### 🟠 Important
- **Rate limiting in-memory** — ne scale pas horizontalement (plusieurs instances = compteurs indépendants), pas de Redis store
- **Pas de retry OpenAI** — si l'API OpenAI fail, l'analyse échoue directement, pas de circuit breaker
- **Swagger exposé en prod** — structure de l'API visible publiquement
- **Pas de GDPR** — les CVs (données personnelles) sont stockés sans endpoint de suppression

### 🟡 Amélioration
- **Aucun test** — 0 tests (unitaires, intégration, e2e)
- **Pas de logging structuré** — que des `console.log/error`, pas de winston/pino
- **Pas de migration DB** — `CREATE TABLE IF NOT EXISTS` est fragile pour les évolutions de schema
- **Pas de `.env.example`** — pas de template pour les variables d'environnement requises
- **Pas de CI/CD** — pas de GitHub Actions
- **Pas de monitoring** — pas de Sentry, pas de métriques (Prometheus/Datadog)
- **Pas de graceful shutdown** — pas de gestion `SIGTERM/SIGINT`

---

---

## 🚀 CI/CD — Déploiement continu gratuit

### Stack retenue

| Rôle | Service | Plan | Lien |
|---|---|---|---|
| **Backend** (Node.js) | [Render](https://render.com) | Free | auto-deploy GitHub |
| **Base de données** | Render PostgreSQL | Free (90j) ou [Neon](https://neon.tech) (∞) | voir note |
| **Frontend** (Vite/React) | [Vercel](https://vercel.com) | Free | auto-deploy GitHub |
| **Redis** (optionnel) | [Upstash](https://upstash.com) | Free (10k cmd/j) | pour rate limiting distribué |
| **CI** (audit + build) | GitHub Actions | Free | `.github/workflows/ci.yml` |

> ⚠️ **Render free tier** : le service se met en veille après 15 min d'inactivité (cold start ~30s). Acceptable pour un MVP.
> Pour éviter ça : utiliser le plan Starter ($7/mois) ou un cron de ping externe (ex: UptimeRobot gratuit).

---

### 1️⃣ Backend — Render

1. Aller sur [render.com](https://render.com) → **New Blueprint**
2. Connecter le repo GitHub → Render détecte `render.yaml` automatiquement
3. **Variables à renseigner manuellement** dans le dashboard Render (onglet *Environment*) :

   | Variable | Valeur |
   |---|---|
   | `OPENAI_API_KEY` | Ta clé OpenAI (`sk-...`) |
   | `FRONTEND_URL` | L'URL Vercel (à renseigner après l'étape 2) |

   > `JWT_SECRET` et `DATABASE_URL` sont gérés automatiquement par `render.yaml`.

4. Cliquer **Apply** → le build démarre, `initDb.js` s'exécute en pre-deploy.

**URL du backend** → `https://cv-ats-optimizer-api.onrender.com`

---

### 2️⃣ Frontend — Vercel

1. Aller sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importer le repo GitHub
3. **Root Directory** : `frontend`
4. **Framework Preset** : Vite (auto-détecté)
5. **Environment Variables** :

   | Variable | Valeur |
   |---|---|
   | `VITE_API_URL` | `https://cv-ats-optimizer-api.onrender.com` |

6. Déployer → Vercel génère une URL `https://cv-ats-optimizer.vercel.app`
7. Retourner dans Render → mettre à jour `FRONTEND_URL` avec cette URL Vercel

---

### 3️⃣ GitHub Actions — Variable optionnelle

Dans le repo GitHub → **Settings → Variables → Actions** :

| Variable | Valeur |
|---|---|
| `VITE_API_URL` | `https://cv-ats-optimizer-api.onrender.com` |

Permet au job CI de builder le frontend avec la vraie URL (sinon il utilise le placeholder).

---

### 🔄 Flux CD complet

```
git push main
    │
    ├─▶ GitHub Actions CI
    │       ├── npm audit backend (bloque si vulnérabilité high/critical)
    │       └── vite build + npm audit frontend
    │
    ├─▶ Render (auto)
    │       ├── npm install --omit=dev
    │       ├── node api/scripts/initDb.js  (pre-deploy)
    │       └── node server.js
    │
    └─▶ Vercel (auto)
            ├── npm ci
            ├── vite build
            └── deploy CDN mondial
```

---

### 📌 Note sur la DB gratuite à long terme

Render PostgreSQL free expire après **90 jours**. Pour une DB gratuite permanente :
1. Créer une DB sur [neon.tech](https://neon.tech) (free, serverless PostgreSQL)
2. Dans Render dashboard → supprimer la variable `DATABASE_URL` auto-injectée
3. Ajouter manuellement `DATABASE_URL` avec la connection string Neon

