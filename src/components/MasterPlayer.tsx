import React, { useRef, useState } from 'react';
import { Download, Volume2, Music, CheckCircle2 } from 'lucide-react';
import { downloadWavFile, formatDuration } from '../utils/audioUtils';

interface MasterPlayerProps {
  blobUrl: string | null;
  combinedBase64: string | null;
  durationSeconds: number;
  totalSegments: number;
  totalWords: number;
  byteLength: number;
}

export const MasterPlayer: React.FC<MasterPlayerProps> = ({
  blobUrl,
  combinedBase64,
  durationSeconds,
  totalSegments,
  totalWords,
  byteLength,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!blobUrl || totalSegments === 0) {
    return null;
  }

  const handleDownload = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `TTS_Studio_Full_${timestamp}.wav`;
    downloadWavFile(blobUrl, filename);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const fileSizeKb = Math.round(byteLength / 1024);

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 mb-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Audio Gabungan (WAV Utuh)
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Siap Putar & Download
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {totalSegments} segmen digabung • jeda jeding 250ms antar segmen • {totalWords} kata • {formatDuration(durationSeconds)} ({fileSizeKb} KB)
            </p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-sm"
          title="Download audio WAV utuh hasil penggabungan semua segmen"
        >
          {downloadSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Tersimpan!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download WAV Gabungan</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/50">
        <audio
          ref={audioRef}
          src={blobUrl}
          controls
          className="w-full h-10 accent-emerald-500"
        />
      </div>
    </div>
  );
};
