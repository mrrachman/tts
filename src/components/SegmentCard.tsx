import React, { useState } from 'react';
import {
  RefreshCw,
  Download,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Clock,
} from 'lucide-react';
import { AudioSegment } from '../types';
import { downloadWavFile, formatDuration } from '../utils/audioUtils';

interface SegmentCardProps {
  segment: AudioSegment;
  index: number;
  total: number;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
  isProcessing: boolean;
}

export const SegmentCard: React.FC<SegmentCardProps> = ({
  segment,
  index,
  total,
  onRegenerate,
  onDelete,
  isProcessing,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDownload = () => {
    if (!segment.blobUrl && !segment.audioBase64) return;
    const cleanVoice = segment.voiceName.toLowerCase();
    const filename = `segmen_${index + 1}_${cleanVoice}_${segment.wordCount}kata.wav`;
    downloadWavFile(segment.blobUrl || segment.audioBase64!, filename);
  };

  const isCurrentProcessing = segment.status === 'generating';

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-200 ${
        isCurrentProcessing
          ? 'bg-slate-800/80 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
          : segment.status === 'error'
          ? 'bg-rose-950/20 border-rose-800/50'
          : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600/80'
      }`}
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-700 text-xs font-bold text-slate-200">
            {index + 1}
          </span>
          <div>
            <span className="text-sm font-semibold text-slate-200">
              Bagian {index + 1}
              {total > 1 && <span className="text-slate-400 font-normal"> dari {total}</span>}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 text-indigo-300">
                <User className="w-3 h-3" />
                {segment.voiceName} ({segment.voiceCharacter})
              </span>
              <span>•</span>
              <span>{segment.wordCount} kata</span>
              {segment.durationSeconds > 0 && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <Clock className="w-3 h-3" />
                    {formatDuration(segment.durationSeconds)} ({segment.durationSeconds}s)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Tag & Card Actions */}
        <div className="flex items-center gap-1.5">
          {segment.status === 'generating' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Menghasilkan audio...
            </span>
          )}

          {segment.status === 'error' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md">
              <AlertTriangle className="w-3 h-3" />
              Gagal
            </span>
          )}

          {segment.status === 'success' && (
            <button
              onClick={handleDownload}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer"
              title="Download WAV segmen ini"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onRegenerate(segment.id)}
            disabled={isProcessing}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isProcessing
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
            }`}
            title="Generate ulang hanya segmen ini"
          >
            <RefreshCw className={`w-4 h-4 ${isCurrentProcessing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => onDelete(segment.id)}
            disabled={isProcessing && isCurrentProcessing}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
            title="Hapus segmen ini"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Text Preview */}
      <div className="py-2.5">
        <p
          className={`text-xs leading-relaxed text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40 select-text ${
            isExpanded ? '' : 'line-clamp-2'
          }`}
        >
          {segment.text}
        </p>

        {segment.text.length > 130 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" /> Tampilkan lebih sedikit
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> Lihat teks lengkap
              </>
            )}
          </button>
        )}
      </div>

      {/* Error Notice */}
      {segment.status === 'error' && (
        <div className="mt-1 p-2.5 bg-rose-950/40 border border-rose-800/40 rounded-lg text-xs text-rose-300 flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">Gagal memproses segmen:</p>
            <p className="mt-0.5 text-rose-300/80">{segment.error || 'Terjadi kesalahan tidak terduga.'}</p>
          </div>
          <button
            onClick={() => onRegenerate(segment.id)}
            disabled={isProcessing}
            className="shrink-0 px-2 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Coba Lagi
          </button>
        </div>
      )}

      {/* Audio Player Controls */}
      {segment.status === 'success' && segment.blobUrl && (
        <div className="mt-2 pt-2">
          <audio
            src={segment.blobUrl}
            controls
            className="w-full h-9 accent-indigo-500 rounded bg-slate-900/80"
          />
        </div>
      )}
    </div>
  );
};
