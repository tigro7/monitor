# 🌙 Project Monitor

Agente notturno che analizza i tuoi progetti GitHub ogni notte e ti invia un digest mattutino via email con suggerimenti concreti e prioritizzati.

## Come funziona

1. **GitHub Actions** lancia lo script ogni notte alle 02:00 UTC
2. Per ogni progetto, l'agente analizza:
   - Issue e PR aperte su GitHub
   - Giorni dall'ultimo commit
   - Dipendenze con versioni non sicure
   - File comuni mancanti (README, .env.example, ecc.)
   - Uptime e tempo di risposta del sito live
   - Tag meta SEO mancanti
   - Link interni rotti
3. Claude Sonnet sintetizza i dati e genera 3–5 suggerimenti prioritizzati
4. Resend spedisce una email HTML formattata

## Setup (una volta sola)

### 1. Crea il repo

```bash
git clone https://github.com/tuousername/project-monitor
cd project-monitor
npm install
```

### 2. Crea un GitHub Personal Access Token

Vai su https://github.com/settings/tokens → "Generate new token (classic)"

Permessi necessari:
- `repo` → Read access ai tuoi repository privati
- Se i repo sono pubblici, basta `public_repo`

### 3. Configura i secret su GitHub

Vai su Settings → Secrets and variables → Actions → New repository secret

| Nome secret | Valore |
|---|---|
| `ANTHROPIC_API_KEY` | La tua chiave Anthropic |
| `RESEND_API_KEY` | La tua chiave Resend |
| `GH_PAT` | Il Personal Access Token creato sopra |
| `EMAIL_FROM` | es. `monitor@tuodominio.com` (dominio verificato su Resend) |
| `EMAIL_TO` | La tua email dove ricevere il report |
| `REPO_UFNC` | es. `tuousername/ufnc` |
| `REPO_THATSWHOIAM` | es. `tuousername/thatswhoi.am` |
| `REPO_LENUOVEESPRESSIONI` | es. `tuousername/lenuoveespressioni` |
| `URL_UFNC` | es. `https://ufnc.it` |
| `URL_THATSWHOIAM` | es. `https://thatswhoi.am` |
| `URL_LENUOVEESPRESSIONI` | es. `https://lenuoveespressioni.it` |

### 4. Test manuale

Puoi triggerare il workflow manualmente da:
GitHub → Actions → "Nightly Project Monitor" → "Run workflow"

### 5. Test in locale

```bash
cp .env.example .env
# Compila .env con i tuoi valori reali
npm run dev
```

## Costi stimati

| Voce | Costo |
|---|---|
| GitHub Actions | Gratuito (2000 min/mese free) |
| Claude Sonnet (4 progetti/notte) | ~$0.01–0.03/notte |
| Resend | Gratuito (100 email/giorno free) |
| **Totale mensile** | **< $1** |

## Struttura

```
project-monitor/
├── .github/
│   └── workflows/
│       └── nightly.yml       # Workflow GitHub Actions
├── src/
│   ├── agent.js              # Entry point principale
│   ├── email.js              # Costruisce l'email HTML
│   └── analyzers/
│       ├── github.js         # Analisi repo GitHub
│       └── site.js           # Analisi sito live
├── .env.example
└── package.json
```

## Personalizzazioni possibili

- **Orario**: modifica il cron in `nightly.yml` (default: 02:00 UTC)
- **Nuovi progetti**: aggiungi entry all'array `PROJECTS` in `agent.js`
- **Prompt Claude**: personalizza le istruzioni in `agent.js` per adattare il tono e le aree di analisi
- **Canale**: sostituisci Resend con Telegram Bot API o Slack Webhook in `agent.js`
