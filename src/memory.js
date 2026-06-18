/**
 * memory.js
 *
 * Persiste i suggerimenti già visti in `data/seen-suggestions.json`
 * che viene committato nel repo dal workflow GitHub Actions.
 *
 * Ogni suggerimento viene identificato da un hash deterministico
 * basato su (repo + area + action), così lo stesso concetto
 * espresso con parole leggermente diverse viene comunque deduplicato.
 */

import { createHash } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const MEMORY_FILE = join(DATA_DIR, "seen-suggestions.json");

// Quanti giorni prima che un suggerimento "scada" e possa essere riproposto
const EXPIRY_DAYS = 30;

function fingerprint(repo, suggestion) {
  const key = `${repo}::${suggestion.area}::${suggestion.action}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha1").update(key).digest("hex").slice(0, 12);
}

function loadMemory() {
  if (!existsSync(MEMORY_FILE)) return {};
  try {
    return JSON.parse(readFileSync(MEMORY_FILE, "utf8"));
  } catch {
    console.warn("⚠️  Could not parse memory file — starting fresh");
    return {};
  }
}

function saveMemory(memory) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), "utf8");
}

/**
 * Filtra i suggerimenti già visti di recente.
 * Restituisce solo quelli nuovi, ognuno arricchito con il suo `id` (fingerprint).
 */
export function filterNew(repo, suggestions) {
  const memory = loadMemory();
  const now = Date.now();
  const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  return suggestions
    .map((s) => ({ ...s, id: fingerprint(repo, s) }))
    .filter(({ id }) => {
      const seen = memory[id];
      if (!seen) return true; // mai visto
      const age = now - new Date(seen.seenAt).getTime();
      return age > expiryMs; // scaduto → riproponi
    });
}

/**
 * Marca i suggerimenti come "visti" nella memoria.
 * Va chiamato DOPO aver inviato l'email, solo per quelli effettivamente inviati.
 */
export function markAsSeen(repo, suggestions) {
  const memory = loadMemory();
  const now = new Date().toISOString();

  for (const s of suggestions) {
    const id = s.id ?? fingerprint(repo, s);
    memory[id] = {
      seenAt: now,
      repo,
      area: s.area,
      action: s.action,
      priority: s.priority,
    };
  }

  // Pulizia: rimuovi entry scadute per tenere il file leggero
  const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  for (const [id, entry] of Object.entries(memory)) {
    if (Date.now() - new Date(entry.seenAt).getTime() > expiryMs) {
      delete memory[id];
    }
  }

  saveMemory(memory);
  console.log(`💾 Memory updated: ${Object.keys(memory).length} entries`);
}