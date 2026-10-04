import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, X, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import {
  getApiKeys,
  addApiKey,
  removeApiKey,
  maskKey,
} from '../utils/geminiTts';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ApiKeyManager({ open, onClose }: Props) {
  const [keys, setKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setKeys(getApiKeys());
  }, [open]);

  if (!open) return null;

  const handleAdd = () => {
    if (!newKey.trim()) return;
    setKeys([...addApiKey(newKey)]);
    setNewKey('');
  };

  const handleRemove = (key: string) => {
    setKeys(removeApiKey(key));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Key className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Gemini API Keys</h2>
              <p className="text-[11px] text-slate-400">Multi-key + rotasi otomatis saat kena limit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-start gap-2.5 p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
            {keys.length > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p>
                {keys.length > 0
                  ? `${keys.length} key aktif. Saat satu key kena quota/rate limit, otomatis lanjut ke key berikutnya.`
                  : 'Belum ada key. Ambil API key gratis di Google AI Studio.'}
              </p>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200 underline underline-offset-2"
              >
                aistudio.google.com/apikey
                <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-slate-400 text-[11px]">
                Key disimpan di browser kamu (localStorage), tidak dikirim ke server manapun selain Google.
              </p>
            </div>
          </div>

          {/* Key list */}
          {keys.length > 0 && (
            <div className="space-y-2">
              {keys.map((key, idx) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded shrink-0">
                      #{idx + 1}
                    </span>
                    <code className="text-xs text-slate-300 font-mono truncate">{maskKey(key)}</code>
                  </div>
                  <button
                    onClick={() => handleRemove(key)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded cursor-pointer transition-colors shrink-0"
                    title="Hapus key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add key input */}
          <div className="flex gap-2">
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              placeholder="Tempel API key baru (AIzaSy...)"
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleAdd}
              disabled={!newKey.trim()}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                newKey.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
