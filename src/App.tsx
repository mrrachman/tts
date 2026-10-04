import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  Volume2,
  Settings,
  Sliders,
  FileText,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Layers,
  StopCircle,
} from 'lucide-react';
import {
  VOICES,
  STYLE_PRESETS,
  TEMPO_OPTIONS,
  LANGUAGE_OPTIONS,
  SAMPLE_TEXTS,
} from './data/voices';
import { Gender, AudioSegment } from './types';
import {
  countWords,
  splitTextIntoChunks,
  isSsmlText,
  convertSsmlToNaturalText,
} from './utils/textChunker';
import {
  base64ToBlobUrl,
  combineWavBase64List,
  downloadWavFile,
} from './utils/audioUtils';
import { MasterPlayer } from './components/MasterPlayer';
import { SegmentCard } from './components/SegmentCard';

export default function App() {
  // Input & configuration states
  const [inputText, setInputText] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | Gender>('all');
  const [selectedVoiceId, setSelectedVoiceId] = useState('Kore');
  const [selectedPresetId, setSelectedPresetId] = useState('berita');
  const [styleInstruction, setStyleInstruction] = useState(
    STYLE_PRESETS[0].instruction
  );
  const [tempoStep, setTempoStep] = useState(1); // 0 = Lambat, 1 = Normal, 2 = Cepat
  const [selectedLanguageId, setSelectedLanguageId] = useState('id');
  const [showChunkPreview, setShowChunkPreview] = useState(false);

  // Generation & Session states
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgressText, setCurrentProgressText] = useState('');
  const [currentProgressPercent, setCurrentProgressPercent] = useState(0);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Abort controller reference for cancelling generation sequence
  const abortRef = useRef(false);

  // SSML detection & word count calculations
  const isInputSsml = useMemo(() => isSsmlText(inputText), [inputText]);
  const cleanInputText = useMemo(
    () => (isInputSsml ? convertSsmlToNaturalText(inputText) : inputText),
    [inputText, isInputSsml]
  );
  const wordCount = useMemo(() => countWords(cleanInputText), [cleanInputText]);
  const plannedChunks = useMemo(() => {
    if (!inputText.trim()) return [];
    return splitTextIntoChunks(inputText, 200);
  }, [inputText]);

  // Filtered voice options
  const filteredVoices = useMemo(() => {
    if (genderFilter === 'all') return VOICES;
    return VOICES.filter((v) => v.gender === genderFilter);
  }, [genderFilter]);

  // Selected voice object
  const currentVoice = useMemo(() => {
    return VOICES.find((v) => v.id === selectedVoiceId) || VOICES[0];
  }, [selectedVoiceId]);

  // Selected tempo object
  const currentTempo = useMemo(() => {
    return TEMPO_OPTIONS[tempoStep] || TEMPO_OPTIONS[1];
  }, [tempoStep]);

  // Selected language object
  const currentLanguage = useMemo(() => {
    return (
      LANGUAGE_OPTIONS.find((l) => l.id === selectedLanguageId) ||
      LANGUAGE_OPTIONS[0]
    );
  }, [selectedLanguageId]);

  // Combined master WAV data calculated from all successful segments
  const combinedAudioData = useMemo(() => {
    const successfulSegments = segments.filter(
      (s) => s.status === 'success' && s.audioBase64
    );
    if (successfulSegments.length === 0) {
      return { combinedBase64: null, blobUrl: null, durationSeconds: 0, byteLength: 0 };
    }

    const base64List = successfulSegments.map((s) => s.audioBase64 as string);
    const result = combineWavBase64List(base64List, 250);
    return {
      combinedBase64: result.combinedBase64,
      blobUrl: result.blobUrl,
      durationSeconds: result.durationSeconds,
      byteLength: result.byteLength,
    };
  }, [segments]);

  // Handle Preset selection change
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = STYLE_PRESETS.find((p) => p.id === presetId);
    if (found && presetId !== 'custom') {
      setStyleInstruction(found.instruction);
    }
  };

  // Handle custom style edit
  const handleStyleInstructionChange = (text: string) => {
    setStyleInstruction(text);
    // If text does not match selected preset, change to custom
    const match = STYLE_PRESETS.find(
      (p) => p.id !== 'custom' && p.instruction.trim() === text.trim()
    );
    setSelectedPresetId(match ? match.id : 'custom');
  };

  // Load sample text
  const handleSelectSample = (sample: (typeof SAMPLE_TEXTS)[0]) => {
    setInputText(sample.text);
    setSelectedVoiceId(sample.voiceId);
    handlePresetChange(sample.presetId);
    const tempoIdx = TEMPO_OPTIONS.findIndex((t) => t.id === sample.tempoId);
    if (tempoIdx !== -1) setTempoStep(tempoIdx);
    setGlobalError(null);
  };

  // Core API caller for single TTS chunk
  const generateSingleChunk = async (
    textChunk: string,
    voiceName: string,
    styleInstr: string,
    tempoInstr: string,
    langPrompt: string,
    partIndex: number,
    totalParts: number
  ): Promise<{ audioBase64: string; durationSeconds: number }> => {
    const res = await fetch('/api/tts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: textChunk,
        voiceName,
        styleInstruction: styleInstr,
        tempo: tempoInstr,
        language: langPrompt,
        partIndex,
        totalParts,
        preferredModel: 'gemini-2.5-flash-preview-tts',
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${res.status}: Gagal memproses audio dari Gemini API`
      );
    }

    const data = await res.json();
    return {
      audioBase64: data.audioBase64,
      durationSeconds: data.durationSeconds || 0,
    };
  };

  // Primary Generate / Start Session handler
  const handleGenerate = async (isAppending = false) => {
    if (!inputText.trim()) {
      setGlobalError('Masukkan teks terlebih dahulu sebelum generate audio.');
      return;
    }

    const chunks = splitTextIntoChunks(inputText, 200);
    if (chunks.length === 0) return;

    setGlobalError(null);
    setIsProcessing(true);
    abortRef.current = false;

    // Snapshot current configurations
    const voiceToUse = currentVoice;
    const styleToUse = styleInstruction;
    const tempoToUse = currentTempo.instruction;
    const tempoLabel = currentTempo.label;
    const langToUse = currentLanguage.promptName;
    const langLabel = currentLanguage.label;

    const baseStartIndex = isAppending ? segments.length : 0;
    const totalChunks = chunks.length;

    // Create placeholder segment entries in state
    const newSegmentPlaceholders: AudioSegment[] = chunks.map((chunkText, idx) => ({
      id: `seg_${Date.now()}_${baseStartIndex + idx + 1}_${Math.random().toString(36).substring(2, 7)}`,
      text: chunkText,
      wordCount: countWords(chunkText),
      partIndex: baseStartIndex + idx + 1,
      totalParts: baseStartIndex + totalChunks,
      voiceName: voiceToUse.name,
      voiceGender: voiceToUse.gender,
      voiceCharacter: voiceToUse.character,
      styleInstruction: styleToUse,
      tempo: tempoToUse,
      tempoLabel,
      language: langToUse,
      languageLabel: langLabel,
      audioBase64: null,
      blobUrl: null,
      durationSeconds: 0,
      status: 'generating',
      createdAt: Date.now() + idx,
    }));

    if (isAppending) {
      setSegments((prev) => [...prev, ...newSegmentPlaceholders]);
    } else {
      setSegments(newSegmentPlaceholders);
    }

    // Process chunks sequentially
    let hasFailure = false;
    for (let i = 0; i < chunks.length; i++) {
      if (abortRef.current) {
        // User aborted
        setGlobalError('Proses generate dihentikan oleh pengguna.');
        break;
      }

      const chunkIndex = baseStartIndex + i;
      const targetId = newSegmentPlaceholders[i].id;
      const currentChunkText = chunks[i];
      const partNumber = i + 1;

      setCurrentProgressText(`Menghasilkan Chunk ${partNumber} dari ${totalChunks}...`);
      setCurrentProgressPercent(Math.round(((i + 1) / totalChunks) * 100));

      // Mark this specific segment as generating
      setSegments((prev) =>
        prev.map((s) => (s.id === targetId ? { ...s, status: 'generating', error: undefined } : s))
      );

      try {
        const result = await generateSingleChunk(
          currentChunkText,
          voiceToUse.name,
          styleToUse,
          tempoToUse,
          langToUse,
          partNumber,
          totalChunks
        );

        const blobUrl = base64ToBlobUrl(result.audioBase64);

        // Update segment state with success and audio
        setSegments((prev) =>
          prev.map((s) =>
            s.id === targetId
              ? {
                  ...s,
                  status: 'success',
                  audioBase64: result.audioBase64,
                  blobUrl,
                  durationSeconds: result.durationSeconds,
                }
              : s
          )
        );
      } catch (err: any) {
        hasFailure = true;
        console.error(`Error processing chunk ${partNumber}:`, err);
        const errMsg = err?.message || 'Gagal menghasilkan audio untuk bagian ini.';

        setSegments((prev) =>
          prev.map((s) =>
            s.id === targetId
              ? {
                  ...s,
                  status: 'error',
                  error: errMsg,
                }
              : s
          )
        );

        setGlobalError(
          `Chunk ${partNumber}/${totalChunks} gagal: ${errMsg}. Anda dapat mencoba lagi pada segmen tersebut.`
        );
        // Do not abort subsequent chunks automatically unless aborted by user, or let it continue
      }
    }

    setIsProcessing(false);
    setCurrentProgressText('');
    setCurrentProgressPercent(0);

    // If all succeeded, clear input text so user can continue seamlessly
    if (!hasFailure && !abortRef.current) {
      setInputText('');
    }
  };

  // Regenerate a single segment without touching others
  const handleRegenerateSegment = async (segmentId: string) => {
    const targetSegment = segments.find((s) => s.id === segmentId);
    if (!targetSegment) return;

    setGlobalError(null);
    setIsProcessing(true);

    // Mark segment as generating
    setSegments((prev) =>
      prev.map((s) => (s.id === segmentId ? { ...s, status: 'generating', error: undefined } : s))
    );

    try {
      const result = await generateSingleChunk(
        targetSegment.text,
        targetSegment.voiceName,
        targetSegment.styleInstruction,
        targetSegment.tempo,
        targetSegment.language,
        targetSegment.partIndex,
        targetSegment.totalParts
      );

      const blobUrl = base64ToBlobUrl(result.audioBase64);

      setSegments((prev) =>
        prev.map((s) =>
          s.id === segmentId
            ? {
                ...s,
                status: 'success',
                audioBase64: result.audioBase64,
                blobUrl,
                durationSeconds: result.durationSeconds,
                error: undefined,
              }
            : s
        )
      );
    } catch (err: any) {
      console.error('Error regenerating segment:', err);
      const errMsg = err?.message || 'Gagal menghasilkan ulang audio.';
      setSegments((prev) =>
        prev.map((s) =>
          s.id === segmentId
            ? {
                ...s,
                status: 'error',
                error: errMsg,
              }
            : s
        )
      );
      setGlobalError(`Gagal regenerate segmen: ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete single segment
  const handleDeleteSegment = (segmentId: string) => {
    setSegments((prev) => {
      const filtered = prev.filter((s) => s.id !== segmentId);
      // Re-index remaining segments
      return filtered.map((s, idx) => ({
        ...s,
        partIndex: idx + 1,
        totalParts: filtered.length,
      }));
    });
  };

  // Cancel generation
  const handleCancelGeneration = () => {
    abortRef.current = true;
    setIsProcessing(false);
    setCurrentProgressText('');
  };

  // Reset entire session
  const handleResetSession = () => {
    if (segments.length > 0 && !window.confirm('Hapus seluruh riwayat segmen dan reset sesi?')) {
      return;
    }
    setSegments([]);
    setInputText('');
    setGlobalError(null);
  };

  const totalWordsInSegments = useMemo(() => {
    return segments.reduce((sum, s) => sum + s.wordCount, 0);
  }, [segments]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-500/20">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">TTS Studio</h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Gemini 2.5 TTS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Text-to-Speech dengan gaya bicara dinamis, chaining naskah & WAV 24kHz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {segments.length > 0 && (
              <button
                onClick={handleResetSession}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-rose-300 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Bersihkan semua segmen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Sesi</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {/* Global Error Banner */}
        {globalError && (
          <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800 text-rose-200 text-sm rounded-xl flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Pemberitahuan Sistem</p>
                <p className="text-xs text-rose-200/90 mt-0.5">{globalError}</p>
              </div>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-rose-400 hover:text-rose-200 text-xs px-2 py-1 hover:bg-rose-900/50 rounded cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ============================================================== */}
          {/* LEFT COLUMN: Input Teks & Pengaturan TTS                       */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 space-y-5">
            {/* Input Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Naskah Teks
                </label>

                {/* Sample Text Selector */}
                <div className="flex items-center gap-2">
                  <div className="relative inline-block text-left">
                    <select
                      onChange={(e) => {
                        const sample = SAMPLE_TEXTS.find((s) => s.title === e.target.value);
                        if (sample) handleSelectSample(sample);
                        e.target.value = '';
                      }}
                      defaultValue=""
                      className="text-xs bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700 rounded px-2 py-1 cursor-pointer transition-colors"
                    >
                      <option value="" disabled>
                        Pilih Contoh Naskah...
                      </option>
                      {SAMPLE_TEXTS.map((sample) => (
                        <option key={sample.title} value={sample.title}>
                          {sample.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {inputText && (
                    <button
                      onClick={() => setInputText('')}
                      className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  )}
                </div>
              </div>

              {/* SSML Detection Notice */}
              {isInputSsml && (
                <div className="mb-2.5 p-2.5 bg-indigo-950/60 border border-indigo-500/40 rounded-lg flex items-center justify-between text-xs text-indigo-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      <strong>Format SSML terdeteksi.</strong> Otomatis dioptimalkan untuk Gemini TTS (tag diubah jadi penekanan CAPSLOCK & jeda tanda baca alami).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInputText(convertSsmlToNaturalText(inputText))}
                    className="ml-2 shrink-0 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                    title="Ubah teks di kolom jadi format teks bersih sekarang"
                  >
                    Bersihkan SSML Sekarang
                  </button>
                </div>
              )}

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik atau tempel teks di sini... (Gunakan CAPSLOCK untuk penekanan, koma untuk jeda pendek, titik untuk jeda kalimat, elipsis (...) untuk jeda dramatis)."
                  rows={6}
                  className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-y min-h-[140px]"
                />
              </div>

              {/* Word Counter & Safe Limit Indicator */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      wordCount === 0
                        ? 'text-slate-500'
                        : wordCount <= 200
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {wordCount} kata
                  </span>
                  <span className="text-slate-500">/ batas 200 kata per chunk</span>
                </div>

                <div className="flex items-center gap-2">
                  {plannedChunks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowChunkPreview(!showChunkPreview)}
                      className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 font-medium transition-colors cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      {showChunkPreview ? 'Tutup Pratinjau' : `Pratinjau ${plannedChunks.length} Bagian`}
                    </button>
                  )}
                  {wordCount > 0 && wordCount <= 200 && (
                    <span className="text-emerald-400/90 font-medium">1 chunk aman</span>
                  )}
                </div>
              </div>

              {/* Chunk Preview Drawer */}
              {showChunkPreview && plannedChunks.length > 1 && (
                <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                    <span>Pratinjau Hasil Pemisahan ({plannedChunks.length} Bagian)</span>
                    <span className="text-slate-500">Maks 200 kata per bagian</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">
                    {plannedChunks.map((chunk, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800/80">
                        <div className="flex items-center justify-between text-[10px] text-indigo-400 font-semibold mb-1">
                          <span>Bagian #{idx + 1}</span>
                          <span className="text-slate-400 font-normal">{countWords(chunk)} kata</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                          {chunk}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* TTS Settings Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-800">
                <Settings className="w-4 h-4 text-indigo-400" />
                Pengaturan Suara & Karakter
              </h2>

              {/* 1. Voice & Gender Filter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Pilihan Suara</label>
                  {/* Gender Filter Buttons */}
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setGenderFilter('all')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        genderFilter === 'all'
                          ? 'bg-slate-800 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Semua ({VOICES.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('female')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        genderFilter === 'female'
                          ? 'bg-slate-800 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Perempuan (8)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('male')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        genderFilter === 'male'
                          ? 'bg-slate-800 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Laki-laki (8)
                    </button>
                  </div>
                </div>

                {/* Voice Dropdown */}
                <select
                  value={selectedVoiceId}
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {filteredVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} — [{voice.gender === 'female' ? 'Perempuan' : 'Laki-laki'}] {voice.character}
                    </option>
                  ))}
                </select>

                <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Suara aktif: <strong className="text-slate-200">{currentVoice.name}</strong></span>
                  <span className="text-indigo-300">Karakter: {currentVoice.character}</span>
                </div>
              </div>

              {/* 2. Style Preset & Editable Instruction */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Preset Gaya Bicara</label>
                  <span className="text-[11px] text-slate-400">Pilih atau sesuaikan di bawah</span>
                </div>

                <select
                  value={selectedPresetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer mb-2"
                >
                  {STYLE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>

                {/* Style Instruction Box */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400">Instruksi Gaya (Style Instruction)</label>
                    <span className="text-[10px] text-slate-500">Kirim direktif ke Gemini</span>
                  </div>
                  <input
                    type="text"
                    value={styleInstruction}
                    onChange={(e) => handleStyleInstructionChange(e.target.value)}
                    placeholder="Contoh: formal, jelas, tempo mantap, berwibawa..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 3. Tempo Slider & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Tempo Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      Tempo Bicara
                    </label>
                    <span className="text-xs font-semibold text-indigo-300">
                      {TEMPO_OPTIONS[tempoStep].label}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={1}
                    value={tempoStep}
                    onChange={(e) => setTempoStep(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />

                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Lambat</span>
                    <span>Normal</span>
                    <span>Cepat</span>
                  </div>
                </div>

                {/* Language Dropdown */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">
                    Pilihan Bahasa
                  </label>
                  <select
                    value={selectedLanguageId}
                    onChange={(e) => setSelectedLanguageId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                {isProcessing ? (
                  <button
                    onClick={handleCancelGeneration}
                    className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <StopCircle className="w-4 h-4" />
                    Hentikan Proses
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleGenerate(false)}
                      disabled={!inputText.trim()}
                      className={`flex-1 py-2.5 px-4 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                        !inputText.trim()
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-indigo-600/20'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Audio
                      {plannedChunks.length > 1 && ` (${plannedChunks.length} Chunk)`}
                    </button>

                    {/* Button Lanjutkan (Chaining new text to current session) */}
                    {segments.length > 0 && (
                      <button
                        onClick={() => handleGenerate(true)}
                        disabled={!inputText.trim()}
                        className={`py-2.5 px-3.5 font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
                          !inputText.trim()
                            ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-indigo-300 hover:text-white'
                        }`}
                        title="Tambahkan teks ini sebagai segmen lanjutan ke sesi yang sama"
                      >
                        <Plus className="w-4 h-4" />
                        Lanjutkan Sesi
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: Master Player & Daftar Segmen Audio              */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 space-y-4">
            {/* Master Combined Player (shown when segments exist) */}
            <MasterPlayer
              blobUrl={combinedAudioData.blobUrl}
              combinedBase64={combinedAudioData.combinedBase64}
              durationSeconds={combinedAudioData.durationSeconds}
              totalSegments={segments.filter((s) => s.status === 'success').length}
              totalWords={totalWordsInSegments}
              byteLength={combinedAudioData.byteLength}
            />

            {/* Active Generation Progress Banner */}
            {isProcessing && (
              <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-indigo-300 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    {currentProgressText || 'Sedang memproses segmen audio...'}
                  </span>
                  <span className="text-indigo-400 font-mono">{currentProgressPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${currentProgressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Instruksi kontinuitas diterapkan antar segmen agar suara dan emosi konsisten.
                </p>
              </div>
            )}

            {/* Segments Header */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-200">
                  Daftar Segmen Audio ({segments.length})
                </h2>
                {segments.length > 0 && (
                  <span className="text-xs text-slate-400">
                    • {segments.filter((s) => s.status === 'success').length} siap
                  </span>
                )}
              </div>
            </div>

            {/* Empty State */}
            {segments.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Volume2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">Belum ada segmen audio</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  Masukkan teks di kolom kiri dan tekan tombol <strong>Generate Audio</strong>.
                  Teks yang panjang (&gt; 200 kata) otomatis dipecah menjadi beberapa chunk berurutan.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => handleSelectSample(SAMPLE_TEXTS[0])}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4 cursor-pointer"
                  >
                    Muat Contoh Teks Berita
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {segments.map((segment, index) => (
                  <SegmentCard
                    key={segment.id}
                    segment={segment}
                    index={index}
                    total={segments.length}
                    onRegenerate={handleRegenerateSegment}
                    onDelete={handleDeleteSegment}
                    isProcessing={isProcessing}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500 mt-auto">
        <p>TTS Studio • Powered by Gemini Text-to-Speech API • 24000 Hz Mono WAV</p>
      </footer>
    </div>
  );
}
