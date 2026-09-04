# Voice Transcription Implementation Plan

## Feature: Groq/Whisper Voice Message Transcription

### Overview

Enable customers and shop owners to send voice messages via Telegram. Voice messages are transcribed using Groq's Whisper API (free tier), then processed as text orders or commands.

---

## 1. Architecture

```
┌─────────────────┐     Voice Message      ┌──────────────────┐
│   Telegram      │ ───────────────────────▶│   DukaAI API     │
│   User          │                         │   (Railway)      │
└─────────────────┘                         └────────┬─────────┘
                                                     │
                           ┌─────────────────────────┼─────────────────────────┐
                           │                         │                         │
                           ▼                         ▼                         ▼
                  ┌────────────────┐      ┌───────────────┐         ┌───────────────┐
                  │ Telegram API   │      │ Groq Whisper  │         │ Gemini API    │
                  │ (Get file)     │      │ (Transcribe)  │         │ (Parse order) │
                  └────────────────┘      └───────────────┘         └───────────────┘
```

### Flow

1. User sends voice message to Telegram bot
2. Bot receives `voice` message with `file_id`
3. Download voice file from Telegram (OGG format)
4. Send to Groq Whisper API for transcription
5. Process transcribed text (same as text message flow)
6. Respond to user

---

## 2. Groq Whisper API

### Endpoint
```
POST https://api.groq.com/openai/v1/audio/transcriptions
```

### Free Tier Limits
- **Model**: `whisper-large-v3`
- **Rate limit**: ~20 requests/minute
- **Max audio**: 25 MB per file
- **Languages**: Auto-detect (supports Amharic, English, etc.)

### Request Format
```bash
curl https://api.groq.com/openai/v1/audio/transcriptions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -F "file=@audio.ogg" \
  -F "model=whisper-large-v3" \
  -F "response_format=json"
```

### Response
```json
{
  "text": "I need 3 iPhone cases please"
}
```

---

## 3. Implementation

### 3.1 Voice Service (`apps/api/src/services/voice.service.ts`)

```typescript
import { config } from '../config';
import FormData from 'form-data';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

/**
 * Transcribe audio buffer using Groq Whisper API
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'audio.ogg'
): Promise<TranscriptionResult> {
  if (!config.groq.apiKey) {
    throw new Error('Groq API key not configured');
  }

  const formData = new FormData();
  formData.append('file', audioBuffer, {
    filename,
    contentType: 'audio/ogg',
  });
  formData.append('model', WHISPER_MODEL);
  formData.append('response_format', 'verbose_json');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.groq.apiKey}`,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Groq API error:', error);
    throw new Error(`Transcription failed: ${response.status}`);
  }

  const result = await response.json();

  return {
    text: result.text || '',
    language: result.language,
    duration: result.duration,
  };
}
```

### 3.2 Telegram Voice Handler (`apps/api/src/bot/telegram.ts`)

Add to `handleMessage` function:

```typescript
async function handleMessage(message: TelegramBot.Message): Promise<void> {
  if (!bot) return;

  const chatId = message.chat.id;
  const userId = message.from?.id.toString() || '';
  const userName = message.from?.first_name || 'User';

  // Handle voice messages
  if (message.voice) {
    await handleVoiceMessage(chatId, userId, userName, message.voice);
    return;
  }

  // Handle audio messages (voice notes sent as audio)
  if (message.audio) {
    await handleAudioMessage(chatId, userId, userName, message.audio);
    return;
  }

  // ... existing text handling
}

async function handleVoiceMessage(
  chatId: number,
  userId: string,
  userName: string,
  voice: TelegramBot.Voice
): Promise<void> {
  if (!bot) return;

  try {
    // Send "processing" indicator
    await bot.sendChatAction(chatId, 'typing');

    // Download voice file from Telegram
    const fileLink = await bot.getFileLink(voice.file_id);
    const response = await fetch(fileLink);
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Transcribe using Groq Whisper
    const transcription = await voiceService.transcribeAudio(audioBuffer, 'voice.ogg');

    if (!transcription.text || transcription.text.trim() === '') {
      await bot.sendMessage(chatId, "Sorry, I couldn't understand the voice message. Please try again or type your message.");
      return;
    }

    // Log transcription for debugging
    console.log(`Voice transcription [${userId}]: "${transcription.text}"`);

    // Send acknowledgment with transcription
    await bot.sendMessage(
      chatId,
      `I heard: "${transcription.text}"\n\nProcessing...`,
      { parse_mode: 'Markdown' }
    );

    // Process as text (commands or natural language)
    const text = transcription.text.trim();
    
    if (text.toLowerCase().startsWith('/')) {
      // Handle as command
      const [command, ...args] = text.split(' ');
      await handleCommand(chatId, userId, userName, command.toLowerCase(), args);
    } else {
      // Handle as natural language order
      await handleNaturalLanguage(chatId, userId, userName, text);
    }

  } catch (error) {
    console.error('Error processing voice message:', error);
    await bot.sendMessage(
      chatId,
      "Sorry, I couldn't process your voice message. Please try again or type your message."
    );
  }
}
```

### 3.3 Dependencies

Uses native Node.js `FormData` and `fetch` (Node 18+). No additional packages needed.

---

## 4. Testing

### Manual Test via cURL

```bash
# Test Groq API directly
curl https://api.groq.com/openai/v1/audio/transcriptions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -F "file=@test-audio.ogg" \
  -F "model=whisper-large-v3"
```

### Telegram Test

1. Open Telegram bot (@fedukaaibot)
2. Send a voice message saying "I need 3 iPhone cases"
3. Bot should respond with transcription and process as order

### Test Cases

| Voice Message | Expected Behavior |
|---------------|-------------------|
| "Hello" | Greeting response |
| "I need 3 phone cases" | Parse as order, confirm |
| "/status" | Execute status command |
| "What products do you have?" | Product inquiry |
| (empty/noise) | "Couldn't understand" error |

---

## 5. Error Handling

| Error | Cause | Response |
|-------|-------|----------|
| Groq API key missing | Not configured | Log warning, ask user to type |
| Transcription empty | Background noise | "Couldn't understand" message |
| File download failed | Telegram API issue | Retry or ask to resend |
| Rate limit (429) | Too many requests | Queue and retry with backoff |

---

## 6. Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `GROQ_API_KEY` | Yes | Get from https://console.groq.com |

### Getting Groq API Key

1. Go to https://console.groq.com
2. Sign up (free, no credit card)
3. Go to API Keys
4. Create new key
5. Add to Railway environment variables

---

## 7. Files Modified/Created

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/services/voice.service.ts` | Created | Groq Whisper transcription |
| `apps/api/src/services/index.ts` | Modified | Export voice service |
| `apps/api/src/bot/telegram.ts` | Modified | Voice message handler |

---

## 8. Implementation Checklist

- [ ] Get Groq API key from https://console.groq.com
- [ ] Add GROQ_API_KEY to Railway environment
- [x] Create voice.service.ts
- [x] Update telegram.ts with voice handler
- [ ] Deploy to Railway
- [ ] Test with Telegram voice message
- [x] Update CLAUDE.md status

---

## 9. Amharic Support

Whisper `whisper-large-v3` supports 99 languages including:
- English (en)
- Amharic (am)

The model auto-detects language, so users can send voice messages in either Amharic or English without configuration.

### Example Amharic Flow

1. Customer sends voice: "3 iPhone case እፈልጋለሁ" (I want 3 iPhone cases)
2. Whisper transcribes: "3 iPhone case እፈልጋለሁ"
3. Gemini parses: `{ product: "iPhone Case", qty: 3 }`
4. Bot confirms in Amharic/English mix

---

## 10. Cost Analysis

| Service | Free Tier | DukaAI Usage | Status |
|---------|-----------|--------------|--------|
| Groq Whisper | ~20 req/min | ~50-100 voice/day | OK |
| Telegram | Unlimited | N/A | OK |

**Conclusion**: Free tier is sufficient for small shop operations.
