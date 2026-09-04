# XState Workflow Implementation Plan

## Feature: Conversation State Management

### Overview

Use XState to manage multi-step conversation flows in the Telegram bot. This enables:
- Order confirmation flows (confirm/cancel before creating)
- Multi-turn conversations (clarification questions)
- Session persistence across messages
- Timeout handling for abandoned conversations

---

## 1. Architecture

```
┌─────────────────┐     Message      ┌──────────────────┐     Event      ┌──────────────────┐
│   Telegram      │ ───────────────▶ │   Bot Handler    │ ─────────────▶ │   XState         │
│   User          │                  │                  │                │   Machine        │
└─────────────────┘                  └──────────────────┘                └────────┬─────────┘
        ▲                                                                         │
        │                                                                         │
        └─────────────────────── Response ◀───────────────────────────────────────┘
```

---

## 2. Conversation States

### Order Flow State Machine

```
                    ┌─────────────┐
                    │    IDLE     │
                    └──────┬──────┘
                           │ user message
                           ▼
                    ┌─────────────┐
              ┌─────│  DETECTING  │─────┐
              │     │   INTENT    │     │
              │     └─────────────┘     │
              │                         │
         ORDER│                         │OTHER
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │   PARSING   │           │  RESPONDING │──────▶ IDLE
       │    ORDER    │           └─────────────┘
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │  CONFIRMING │◀──────┐
       │    ORDER    │       │ clarification
       └──────┬──────┘───────┘
              │
       ┌──────┴──────┐
       │             │
  confirm         cancel
       │             │
       ▼             ▼
┌─────────────┐ ┌─────────────┐
│  CREATING   │ │  CANCELLED  │──────▶ IDLE
│    ORDER    │ └─────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  COMPLETED  │──────────────────────▶ IDLE
└─────────────┘
```

---

## 3. Implementation

### 3.1 State Machine Definition (`apps/api/src/machines/conversation.machine.ts`)

```typescript
import { createMachine, assign } from 'xstate';
import { ParsedOrder, Product, Shop } from '@dukaai/shared';

interface ConversationContext {
  chatId: number;
  userId: string;
  userName: string;
  shopId: string | null;
  pendingOrder: ParsedOrder | null;
  pendingItems: Array<{
    productId: string;
    productName: string;
    qty: number;
    unitPrice: number;
    variant?: string;
  }> | null;
  totalAmount: number;
  lastMessageAt: Date;
  retryCount: number;
}

type ConversationEvent =
  | { type: 'MESSAGE'; text: string }
  | { type: 'VOICE'; text: string }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL' }
  | { type: 'CLARIFY'; text: string }
  | { type: 'TIMEOUT' }
  | { type: 'RESET' };

export const conversationMachine = createMachine({
  id: 'conversation',
  initial: 'idle',
  context: {
    chatId: 0,
    userId: '',
    userName: '',
    shopId: null,
    pendingOrder: null,
    pendingItems: null,
    totalAmount: 0,
    lastMessageAt: new Date(),
    retryCount: 0,
  } as ConversationContext,
  states: {
    idle: {
      on: {
        MESSAGE: 'detectingIntent',
        VOICE: 'detectingIntent',
      },
    },
    detectingIntent: {
      invoke: {
        src: 'detectIntent',
        onDone: [
          { target: 'parsingOrder', guard: 'isOrderIntent' },
          { target: 'answeringQuestion', guard: 'isQuestionIntent' },
          { target: 'responding' },
        ],
        onError: 'responding',
      },
    },
    parsingOrder: {
      invoke: {
        src: 'parseOrder',
        onDone: [
          { target: 'confirmingOrder', guard: 'orderParsedSuccessfully' },
          { target: 'clarifying' },
        ],
        onError: 'responding',
      },
    },
    confirmingOrder: {
      on: {
        CONFIRM: 'creatingOrder',
        CANCEL: 'cancelled',
        CLARIFY: 'parsingOrder',
        TIMEOUT: 'idle',
      },
      after: {
        300000: 'idle', // 5 minute timeout
      },
    },
    clarifying: {
      on: {
        MESSAGE: 'parsingOrder',
        CANCEL: 'cancelled',
        TIMEOUT: 'idle',
      },
    },
    creatingOrder: {
      invoke: {
        src: 'createOrder',
        onDone: 'completed',
        onError: 'responding',
      },
    },
    completed: {
      after: {
        1000: 'idle',
      },
    },
    cancelled: {
      after: {
        1000: 'idle',
      },
    },
    answeringQuestion: {
      invoke: {
        src: 'answerQuestion',
        onDone: 'idle',
        onError: 'responding',
      },
    },
    responding: {
      after: {
        100: 'idle',
      },
    },
  },
});
```

### 3.2 Session Storage (`apps/api/src/services/session.service.ts`)

Store conversation state in Firestore for persistence.

```typescript
import { collections } from '../config/firebase';

interface ConversationSession {
  chatId: number;
  userId: string;
  state: string;
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export async function getSession(chatId: number): Promise<ConversationSession | null> {
  const doc = await collections.sessions().doc(chatId.toString()).get();
  if (!doc.exists) return null;
  return doc.data() as ConversationSession;
}

export async function saveSession(chatId: number, state: string, context: Record<string, any>): Promise<void> {
  const session: ConversationSession = {
    chatId,
    userId: context.userId,
    state,
    context,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
  };
  await collections.sessions().doc(chatId.toString()).set(session);
}

export async function deleteSession(chatId: number): Promise<void> {
  await collections.sessions().doc(chatId.toString()).delete();
}
```

---

## 4. Simplified Implementation (Recommended)

For the assignment scope, a simpler approach without full XState persistence:

### In-Memory Session with Confirmation Flow

```typescript
// Simple in-memory session store
const sessions = new Map<number, {
  state: 'idle' | 'confirming';
  pendingOrder: any;
  expiresAt: number;
}>();

// In handleOrderIntent, instead of creating order immediately:
// 1. Store pending order in session
// 2. Send confirmation message with buttons
// 3. Wait for user to confirm/cancel

// In handleCallbackQuery:
// 1. Check if confirm or cancel
// 2. If confirm, create order
// 3. Clear session
```

---

## 5. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/machines/conversation.machine.ts` | Create | XState machine definition |
| `apps/api/src/services/session.service.ts` | Create | Session persistence |
| `apps/api/src/bot/telegram.ts` | Modify | Integrate state machine |

---

## 6. Implementation Checklist

- [ ] Create conversation state machine
- [ ] Add session storage service
- [ ] Integrate with Telegram bot
- [ ] Add confirmation flow for orders
- [ ] Add timeout handling
- [ ] Test multi-turn conversations
- [ ] Update CLAUDE.md

---

## 7. Timeline

| Task | Estimate |
|------|----------|
| State machine definition | 30 min |
| Session service | 20 min |
| Bot integration | 1 hour |
| Testing | 30 min |

**Total: ~2 hours**
