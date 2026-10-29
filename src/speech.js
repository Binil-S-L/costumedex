// ── Voice preference ──────────────────────────────────────
// en-GB male preferred; en-* fallback. Resolved on voiceschanged.

let preferredVoice = null;

const MALE_GB = ['daniel', 'arthur', 'oliver', 'george', 'james', 'harry', 'stewart'];
const MALE_EN = ['alex', 'fred', 'tom', 'guy', 'mark', 'david', 'richard'];

function pickVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;

  const find = (test) => voices.find(test) ?? null;

  preferredVoice =
    find(v => v.lang === 'en-GB' && MALE_GB.some(n => v.name.toLowerCase().includes(n))) ??
    find(v => v.lang === 'en-GB') ??
    find(v => v.lang.startsWith('en-') && MALE_EN.some(n => v.name.toLowerCase().includes(n))) ??
    find(v => v.lang.startsWith('en-')) ??
    voices[0] ??
    null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
  pickVoice();
}

// ── Text helpers ──────────────────────────────────────────

function clean(text) {
  return String(text)
    // #007 → "number 7", #001 → "number 1", etc.
    .replace(/#0*(\d+)/g, (_, n) => `number ${parseInt(n, 10)}`)
    // Emoji: supplementary planes (most emoji)
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    // Misc symbols & dingbats
    .replace(/[☀-➿]/g, '')
    // Variation selectors & ZWJ sequences
    .replace(/[︀-️]/g, '')
    .replace(/‍/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  // Split on . ! ? keeping the punctuation attached
  const parts = text.match(/[^.!?]+[.!?]+/g);
  return (parts ?? [text]).map(s => s.trim()).filter(Boolean);
}

// ── Utterance factory ─────────────────────────────────────

function utter(text) {
  const u = new SpeechSynthesisUtterance(clean(text));
  u.rate  = 0.92;
  u.pitch = 0.7;
  u.lang  = 'en-GB';
  if (!preferredVoice) pickVoice();
  if (preferredVoice)  u.voice = preferredVoice;
  return u;
}

// ── Public API ────────────────────────────────────────────

/**
 * Call this synchronously inside the A-button tap handler, before any await.
 * iOS requires a user-gesture-triggered utterance before async speech is allowed.
 */
export function unlockSpeech() {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

export function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/**
 * Reads an entry in order:
 *   "Entry number N" → species name → "Type: X, Y"
 *   → description sentences → "Rarity: R" → weakness line
 */
export function speakEntry(entry) {
  if (!('speechSynthesis' in window)) return;

  const { data, id } = entry;
  const types = (Array.isArray(data.types) ? data.types : []).join(', ');

  // Cancel anything already playing before queuing new utterances
  window.speechSynthesis.cancel();

  const phrases = [
    `Entry number ${id}.`,
    data.species_name,
    `Type: ${types}.`,
    ...splitSentences(data.description),
    `Rarity: ${data.rarity}.`,
    data.weakness,
  ];

  for (const phrase of phrases) {
    window.speechSynthesis.speak(utter(phrase));
  }
}
