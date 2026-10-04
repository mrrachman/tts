/**
 * Client-side Gemini TTS caller dengan multi-API-key rotation.
 * Keys disimpan di localStorage browser (tidak ada server sama sekali).
 * Saat satu key kena rate limit (429) / invalid, otomatis pindah ke key berikutnya.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const KEYS_STORAGE_KEY = 'tts_studio_api_keys';
const ACTIVE_KEY_INDEX = 'tts_studio_active_key_index';

// ============ API Key storage (localStorage) ============

export function getApiKeys(): string[] {
  try {
    const raw = localStorage.getItem(KEYS_STORAGE_KEY);
    const keys = raw ? JSON.parse(raw) : [];
    return Array.isArray(keys) ? keys.filter((k: unknown) => typeof k === 'string' && k.trim()) : [];
  } catch {
    return [];
  }
}

export function saveApiKeys(keys: string[]): void {
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys.map((k) => k.trim()).filter(Boolean)));
  localStorage.removeItem(ACTIVE_KEY_INDEX);
}

export function addApiKey(key: string): string[] {
  const keys = getApiKeys();
  const trimmed = key.trim();
  if (trimmed && !keys.includes(trimmed)) keys.push(trimmed);
  saveApiKeys(keys);
  return keys;
}

export function removeApiKey(key: string): string[] {
  const keys = getApiKeys().filter((k) => k !== key);
  saveApiKeys(keys);
  return keys;
}

/** Mask key buat ditampilkan: AIzaSy...w3xY */
export function maskKey(key: string): string {
  if (key.length <= 10) return key.slice(0, 3) + '...';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

// ============ Key rotation ============

function getActiveStartIndex(total: number): number {
  const idx = parseInt(localStorage.getItem(ACTIVE_KEY_INDEX) || '0', 10);
  return Number.isFinite(idx) && idx >= 0 && idx < total ? idx : 0;
}

function setActiveStartIndex(idx: number): void {
  localStorage.setItem(ACTIVE_KEY_INDEX, String(idx));
}

// ============ PCM -> WAV ============

function createWavFromPcm(pcm: Uint8Array, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Uint8Array {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const chunkSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const out = new Uint8Array(buffer);

  out.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, chunkSize, true);
  out.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
  out.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  out.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, dataSize, true);
  out.set(pcm, 44);

  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
  }
  return btoa(binary);
}

// ============ Prompt builder (mengikuti logika server.ts asli) ============

function buildPrompt(
  text: string,
  styleInstruction: string,
  tempo: string,
  language: string,
  partIndex: number,
  totalParts: number
): string {
  let prompt = `Bacakan teks berikut dalam ${language} dengan gaya: ${styleInstruction}, tempo ${tempo}. Patuhi tanda baca dengan ketat: koma = jeda pendek, titik = jeda sedang dan intonasi turun, titik koma dan titik dua = jeda menggantung ringan, tanda tanya = intonasi naik, tanda seru = penekanan kuat, elipsis (...) = jeda panjang menggantung, tanda pisah (—) = jeda dramatis, baris kosong = jeda paragraf. Beri penekanan alami pada kata yang di-CAPSLOCK atau dicetak *miring*. Jangan membaca ulang instruksi ini, jangan menambah kata apa pun, bacakan HANYA teksnya.`;

  if (totalParts > 1 && partIndex > 1) {
    prompt += `\n\nIni bagian ${partIndex} dari ${totalParts} dari satu naskah yang sama. Pertahankan suara, tempo, energi, dan emosi persis seperti bagian sebelumnya. Jangan beri salam pembuka atau penutup.`;
  }

  prompt += `\n\nTEKS:\n${text.trim()}`;
  return prompt;
}

// ============ Core: generate satu chunk dengan rotasi key ============

export interface GenerateChunkOptions {
  text: string;
  voiceName?: string;
  styleInstruction?: string;
  tempo?: string;
  language?: string;
  partIndex?: number;
  totalParts?: number;
}

export interface GenerateChunkResult {
  audioBase64: string; // WAV 24kHz 16-bit mono, siap diputar/diunduh
  durationSeconds: number;
  apiKeyUsed: string; // key (masked) yang berhasil dipakai
}

export async function generateTtsChunk(opts: GenerateChunkOptions): Promise<GenerateChunkResult> {
  const {
    text,
    voiceName = 'Kore',
    styleInstruction = 'formal, jelas, tempo mantap, intonasi netral-otoritatif seperti pembaca berita TV',
    tempo = 'tempo normal dan wajar',
    language = 'bahasa Indonesia',
    partIndex = 1,
    totalParts = 1,
  } = opts;

  if (!text || !text.trim()) throw new Error('Teks tidak boleh kosong.');

  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error('Belum ada API key. Klik "API Keys" di pojok atas untuk menambahkan Gemini API key (aistudio.google.com).');
  }

  const prompt = buildPrompt(text, styleInstruction, tempo, language, partIndex, totalParts);

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
        },
      },
    },
  });

  const startIndex = getActiveStartIndex(keys.length);
  const tried = new Set<number>();
  const keyErrors: string[] = [];

  while (tried.size < keys.length) {
    // Ambil key berikutnya yang belum dicoba (mulai dari key aktif terakhir)
    let idx = startIndex;
    while (tried.has(idx)) idx = (idx + 1) % keys.length;
    tried.add(idx);
    const key = keys[idx];

    let res: Response;
    try {
      res = await fetch(`${GEMINI_BASE}/models/${TTS_MODEL}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body,
      });
    } catch (networkErr: any) {
      keyErrors.push(`Key #${idx + 1}: jaringan gagal (${networkErr?.message || 'unknown'})`);
      continue; // coba key berikutnya
    }

    // Rate limit / quota / invalid key -> rotate ke key berikutnya
    if (res.status === 429 || res.status === 403 || res.status === 401 || res.status === 400) {
      let detail = '';
      try {
        const errJson = await res.json();
        detail = errJson?.error?.message || '';
      } catch { /* ignore */ }
      keyErrors.push(`Key #${idx + 1} (HTTP ${res.status}): ${detail || (res.status === 429 ? 'quota/rate limit' : 'key tidak valid')}`);
      // Kalau key ini memang bermasalah, aktifkan key berikutnya sebagai start point
      if (res.status !== 429 || tried.size < keys.length) {
        setActiveStartIndex((idx + 1) % keys.length);
      }
      continue;
    }

    if (!res.ok) {
      let detail = '';
      try {
        const errJson = await res.json();
        detail = errJson?.error?.message || '';
      } catch { /* ignore */ }
      keyErrors.push(`Key #${idx + 1} (HTTP ${res.status}): ${detail || 'server error'}`);
      continue;
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    let audioPcmBase64: string | null = null;
    let returnedText = '';

    for (const part of parts) {
      if (part.inlineData?.data) {
        audioPcmBase64 = part.inlineData.data;
        break;
      }
      if (part.text) returnedText += part.text;
    }

    if (!audioPcmBase64) {
      // Model balas teks, bukan audio -> retry pakai key yang sama sekali (maks 2x), lalu rotate
      let ok = false;
      for (let retry = 0; retry < 2 && !ok; retry++) {
        const retryRes = await fetch(`${GEMINI_BASE}/models/${TTS_MODEL}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body,
        });
        if (!retryRes.ok) break;
        const retryData = await retryRes.json();
        for (const part of retryData?.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData?.data) {
            audioPcmBase64 = part.inlineData.data;
            ok = true;
            break;
          }
        }
      }
      if (!audioPcmBase64) {
        keyErrors.push(`Key #${idx + 1}: model tidak mengembalikan audio${returnedText ? ` (balasan: "${returnedText.slice(0, 80)}...")` : ''}`);
        continue;
      }
    }

    // Sukses! Simpan key ini sebagai key aktif (biar next chunk mulai dari sini)
    setActiveStartIndex(idx);

    // PCM mentah dari Gemini (24kHz 16-bit mono) -> bungkus header WAV
    const binary = atob(audioPcmBase64);
    const pcmBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) pcmBytes[i] = binary.charCodeAt(i);

    const wavBytes = createWavFromPcm(pcmBytes, 24000, 1, 16);
    const durationSeconds = pcmBytes.length / (24000 * 2);

    return {
      audioBase64: bytesToBase64(wavBytes),
      durationSeconds: Number(durationSeconds.toFixed(2)),
      apiKeyUsed: maskKey(key),
    };
  }

  throw new Error(
    `Semua ${keys.length} API key gagal dipakai:\n${keyErrors.join('\n')}`
  );
}
