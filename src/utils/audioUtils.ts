/**
 * Utilities for processing WAV audio in browser and managing downloads.
 */

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export function base64ToBlobUrl(base64: string, mimeType = 'audio/wav'): string {
  const bytes = base64ToUint8Array(base64);
  const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function downloadWavFile(blobUrlOrBase64: string, filename: string): void {
  let url = blobUrlOrBase64;
  let shouldRevoke = false;

  if (!blobUrlOrBase64.startsWith('blob:') && !blobUrlOrBase64.startsWith('data:')) {
    url = base64ToBlobUrl(blobUrlOrBase64, 'audio/wav');
    shouldRevoke = true;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.wav') ? filename : `${filename}.wav`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (shouldRevoke) {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

/**
 * Extracts raw PCM bytes from a WAV buffer (skipping RIFF headers)
 */
function extractPcmFromWavBytes(bytes: Uint8Array): Uint8Array {
  // Check if buffer starts with RIFF
  if (
    bytes.length >= 44 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF' &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WAVE'
  ) {
    let offset = 12;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    while (offset < bytes.length - 8) {
      const subchunkId = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3]
      );
      const subchunkSize = view.getUint32(offset + 4, true);

      if (subchunkId === 'data') {
        const start = offset + 8;
        const end = Math.min(start + subchunkSize, bytes.length);
        return bytes.subarray(start, end);
      }
      offset += 8 + subchunkSize;
    }
    return bytes.subarray(44);
  }
  return bytes;
}

/**
 * Wraps raw PCM (24kHz, 16-bit mono) into a standard 44-byte WAV header.
 */
function createWavFromPcm(pcm: Uint8Array, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Uint8Array {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const chunkSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const outBytes = new Uint8Array(buffer);

  // RIFF identifier
  outBytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, chunkSize, true);
  outBytes.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // "fmt " subchunk
  outBytes.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // "data" subchunk
  outBytes.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, dataSize, true);

  // PCM data
  outBytes.set(pcm, 44);

  return outBytes;
}

/**
 * Combines multiple WAV / PCM base64 segments in the browser with ~250ms of silence between them.
 */
export function combineWavBase64List(
  base64List: string[],
  silenceMs = 250,
  sampleRate = 24000
): { combinedBase64: string; blobUrl: string; durationSeconds: number; byteLength: number } {
  const validBase64 = base64List.filter(Boolean);
  if (validBase64.length === 0) {
    return { combinedBase64: '', blobUrl: '', durationSeconds: 0, byteLength: 0 };
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = (bitsPerSample / 8) * numChannels;

  // Calculate silence bytes (all zeros)
  const silenceSamples = Math.floor(sampleRate * (silenceMs / 1000));
  const silenceBytesCount = silenceSamples * bytesPerSample;
  const silenceBytes = new Uint8Array(silenceBytesCount); // 0-filled

  const pcmList: Uint8Array[] = [];
  let totalPcmLength = 0;

  for (let i = 0; i < validBase64.length; i++) {
    const rawBytes = base64ToUint8Array(validBase64[i]);
    const pcm = extractPcmFromWavBytes(rawBytes);
    pcmList.push(pcm);
    totalPcmLength += pcm.length;

    // Add silence between chunks
    if (i < validBase64.length - 1) {
      pcmList.push(silenceBytes);
      totalPcmLength += silenceBytesCount;
    }
  }

  // Merge all PCM chunks into one Uint8Array
  const combinedPcm = new Uint8Array(totalPcmLength);
  let offset = 0;
  for (const chunk of pcmList) {
    combinedPcm.set(chunk, offset);
    offset += chunk.length;
  }

  // Build final WAV
  const finalWavBytes = createWavFromPcm(combinedPcm, sampleRate, numChannels, bitsPerSample);
  const combinedBase64 = uint8ArrayToBase64(finalWavBytes);
  const blob = new Blob([finalWavBytes as unknown as BlobPart], { type: 'audio/wav' });
  const blobUrl = URL.createObjectURL(blob);
  const durationSeconds = totalPcmLength / (sampleRate * bytesPerSample);

  return {
    combinedBase64,
    blobUrl,
    durationSeconds: Number(durationSeconds.toFixed(2)),
    byteLength: finalWavBytes.length,
  };
}
