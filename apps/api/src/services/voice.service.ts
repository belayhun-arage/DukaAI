import { config } from '../config';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

/**
 * Transcribe audio buffer using Groq Whisper API
 * Supports Amharic and English (auto-detected)
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'audio.ogg'
): Promise<TranscriptionResult> {
  if (!config.groq.apiKey) {
    throw new Error('Groq API key not configured');
  }

  // Create form data with the audio file
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
  formData.append('file', blob, filename);
  formData.append('model', WHISPER_MODEL);
  formData.append('response_format', 'verbose_json');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.groq.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Groq API error:', response.status, error);
    throw new Error(`Transcription failed: ${response.status}`);
  }

  const result = await response.json() as {
    text?: string;
    language?: string;
    duration?: number;
  };

  return {
    text: result.text || '',
    language: result.language,
    duration: result.duration,
  };
}

/**
 * Check if Groq API is configured
 */
export function isGroqConfigured(): boolean {
  return !!config.groq.apiKey;
}
