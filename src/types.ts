export type Gender = 'female' | 'male';

export interface Voice {
  id: string;
  name: string;
  gender: Gender;
  character: string;
}

export interface StylePreset {
  id: string;
  label: string;
  instruction: string;
}

export interface TempoOption {
  id: string;
  label: string;
  instruction: string;
}

export interface LanguageOption {
  id: string;
  label: string;
  promptName: string;
}

export interface AudioSegment {
  id: string;
  text: string;
  wordCount: number;
  partIndex: number;
  totalParts: number;
  voiceName: string;
  voiceGender: Gender;
  voiceCharacter: string;
  styleInstruction: string;
  tempo: string;
  tempoLabel: string;
  language: string;
  languageLabel: string;
  audioBase64: string | null;
  blobUrl: string | null;
  durationSeconds: number;
  status: 'idle' | 'generating' | 'success' | 'error';
  error?: string;
  createdAt: number;
}
