import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Initialize GoogleGenAI SDK with server-side API Key
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper: Ensure buffer has a standard 44-byte WAV header (24kHz, 16-bit, mono)
function pcmToWav(buffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  // Check if buffer is already a valid WAV file
  if (
    buffer.length >= 44 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    return buffer;
  }

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = buffer.length;
  const chunkSize = 36 + dataSize;
  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write('RIFF', 0, 4, 'ascii');
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8, 4, 'ascii');

  // "fmt " sub-chunk
  header.write('fmt ', 12, 4, 'ascii');
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat: 1 = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  header.write('data', 36, 4, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, buffer]);
}

// Helper: Extract raw PCM from WAV or raw PCM buffer
function extractPcm(buffer: Buffer): Buffer {
  if (
    buffer.length >= 44 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    let offset = 12;
    while (offset < buffer.length - 8) {
      const subchunkId = buffer.subarray(offset, offset + 4).toString('ascii');
      const subchunkSize = buffer.readUInt32LE(offset + 4);
      if (subchunkId === 'data') {
        const start = offset + 8;
        const end = Math.min(start + subchunkSize, buffer.length);
        return buffer.subarray(start, end);
      }
      offset += 8 + subchunkSize;
    }
    // Fallback: standard 44 bytes header
    return buffer.subarray(44);
  }
  return buffer;
}

// Helper: Delay for exponential backoff
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// TTS Generation Endpoint with retry & error handling
app.post('/api/tts/generate', async (req: Request, res: Response) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      styleInstruction = 'formal, jelas, tempo mantap, intonasi netral-otoritatif seperti pembaca berita TV',
      tempo = 'tempo normal dan wajar',
      language = 'bahasa Indonesia',
      partIndex = 1,
      totalParts = 1,
      preferredModel = 'gemini-2.5-flash-preview-tts',
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Teks tidak boleh kosong.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di server environment.',
      });
      return;
    }

    // Build the directive prompt according to specifications
    let prompt = `Bacakan teks berikut dalam ${language} dengan gaya: ${styleInstruction}, tempo ${tempo}. Patuhi tanda baca dengan ketat: koma = jeda pendek, titik = jeda sedang dan intonasi turun, titik koma dan titik dua = jeda menggantung ringan, tanda tanya = intonasi naik, tanda seru = penekanan kuat, elipsis (...) = jeda panjang menggantung, tanda pisah (—) = jeda dramatis, baris kosong = jeda paragraf. Beri penekanan alami pada kata yang di-CAPSLOCK atau dicetak *miring*. Jangan membaca ulang instruksi ini, jangan menambah kata apa pun, bacakan HANYA teksnya.`;

    if (totalParts > 1 && partIndex > 1) {
      prompt += `\n\nIni bagian ${partIndex} dari ${totalParts} dari satu naskah yang sama. Pertahankan suara, tempo, energi, dan emosi persis seperti bagian sebelumnya. Jangan beri salam pembuka atau penutup.`;
    }

    prompt += `\n\nTEKS:\n${text.trim()}`;

    // Execute generation with retry handling (exponential backoff for 429/5xx, retry once if text returned)
    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError: any = null;
    let audioData: string | null = null;

    // Models to attempt: user preferred model first, then fallback to lite tts if model name changed/unavailable
    const candidateModels = [
      preferredModel,
      'gemini-2.5-flash-preview-tts',
      'gemini-3.8-flash-lite-tts',
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let activeModelIndex = 0;

    while (attempt < MAX_RETRIES) {
      attempt++;
      const currentModel = candidateModels[activeModelIndex] || 'gemini-2.5-flash-preview-tts';

      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
              },
            },
          },
        });

        // Search for audio part in response
        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        let foundAudio: string | null = null;
        let returnedText = '';

        for (const part of parts) {
          if (part.inlineData?.data) {
            foundAudio = part.inlineData.data;
            break;
          }
          if (part.text) {
            returnedText += part.text;
          }
        }

        if (foundAudio) {
          audioData = foundAudio;
          break; // Success!
        }

        // If model returned text instead of audio, retry once
        if (returnedText && attempt < MAX_RETRIES) {
          console.warn(`[TTS] Model returned text instead of audio on attempt ${attempt}. Retrying...`);
          await delay(1000);
          continue;
        }

        throw new Error('Model tidak mengembalikan audio yang valid.');
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.statusCode || (err?.message?.includes('429') ? 429 : 500);
        console.warn(`[TTS] Attempt ${attempt} failed with model ${currentModel}:`, err?.message || err);

        // If model is not found (404), switch to alternative model immediately
        if (
          err?.message?.includes('not found') ||
          err?.message?.includes('is not supported') ||
          err?.status === 404
        ) {
          if (activeModelIndex < candidateModels.length - 1) {
            activeModelIndex++;
            console.log(`[TTS] Switching model to ${candidateModels[activeModelIndex]}`);
            continue;
          }
        }

        // If rate limit (429) or server error (5xx), apply exponential backoff
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`[TTS] Retrying after ${backoffMs}ms backoff...`);
          await delay(backoffMs);
        }
      }
    }

    if (!audioData) {
      const errMsg = lastError?.message || 'Gagal menghasilkan audio setelah beberapa percobaan.';
      res.status(500).json({
        error: `Error TTS (${lastError?.status || 500}): ${errMsg}`,
      });
      return;
    }

    // Convert base64 audio to Buffer and ensure standard WAV header
    const rawBuffer = Buffer.from(audioData, 'base64');
    const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
    const pcmBuffer = extractPcm(rawBuffer);
    const durationSeconds = pcmBuffer.length / (24000 * 2); // 24kHz * 2 bytes per sample (16-bit mono)

    res.json({
      audioBase64: wavBuffer.toString('base64'),
      mimeType: 'audio/wav',
      durationSeconds: Number(durationSeconds.toFixed(2)),
      pcmBytes: pcmBuffer.length,
      sampleRate: 24000,
    });
  } catch (err: any) {
    console.error('[TTS Generate] Unhandled error:', err);
    res.status(500).json({
      error: err?.message || 'Terjadi kesalahan sistem saat memproses TTS.',
    });
  }
});

// Endpoint to combine multiple WAV / PCM chunks into one single WAV file with ~250ms silence between
app.post('/api/tts/combine', (req: Request, res: Response) => {
  try {
    const { audioBase64List = [], silenceMs = 250 } = req.body;

    if (!Array.isArray(audioBase64List) || audioBase64List.length === 0) {
      res.status(400).json({ error: 'audioBase64List harus berupa array audio base64 yang tidak kosong.' });
      return;
    }

    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = (bitsPerSample / 8) * numChannels; // 2 bytes

    // 250ms of silence in bytes = sampleRate * (silenceMs / 1000) * bytesPerSample
    const silenceSamples = Math.floor(sampleRate * (silenceMs / 1000));
    const silenceBuffer = Buffer.alloc(silenceSamples * bytesPerSample); // all zeros

    const pcmChunks: Buffer[] = [];

    for (let i = 0; i < audioBase64List.length; i++) {
      const b64 = audioBase64List[i];
      if (!b64) continue;
      const buf = Buffer.from(b64, 'base64');
      const pcm = extractPcm(buf);
      pcmChunks.push(pcm);

      // Add silence between chunks (except after the last chunk)
      if (i < audioBase64List.length - 1) {
        pcmChunks.push(silenceBuffer);
      }
    }

    const combinedPcm = Buffer.concat(pcmChunks);
    const combinedWav = pcmToWav(combinedPcm, sampleRate, numChannels, bitsPerSample);
    const durationSeconds = combinedPcm.length / (sampleRate * bytesPerSample);

    res.json({
      audioBase64: combinedWav.toString('base64'),
      mimeType: 'audio/wav',
      durationSeconds: Number(durationSeconds.toFixed(2)),
      totalBytes: combinedWav.length,
    });
  } catch (err: any) {
    console.error('[TTS Combine] Error:', err);
    res.status(500).json({
      error: err?.message || 'Gagal menggabungkan segmen audio.',
    });
  }
});

// Start server
async function start() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TTS Studio server running on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });
}

start().catch((err) => {
  console.error('Fatal server startup error:', err);
});
