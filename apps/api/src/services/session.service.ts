/**
 * Simple in-memory session store for conversation state
 * In production, consider using Redis or Firestore for persistence
 */

export interface PendingOrderItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  variant?: string;
}

export interface ConversationSession {
  chatId: number;
  userId: string;
  userName: string;
  shopId: string;
  state: 'idle' | 'confirming' | 'clarifying';
  pendingItems: PendingOrderItem[];
  totalAmount: number;
  createdAt: number;
  expiresAt: number;
}

// In-memory session store (cleared on restart)
const sessions = new Map<number, ConversationSession>();

// Session timeout: 5 minutes
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Get session for a chat
 */
export function getSession(chatId: number): ConversationSession | null {
  const session = sessions.get(chatId);

  if (!session) return null;

  // Check if expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(chatId);
    return null;
  }

  return session;
}

/**
 * Create or update session
 */
export function saveSession(session: ConversationSession): void {
  sessions.set(session.chatId, {
    ...session,
    expiresAt: Date.now() + SESSION_TIMEOUT_MS,
  });
}

/**
 * Create a new confirming session
 */
export function createConfirmingSession(
  chatId: number,
  userId: string,
  userName: string,
  shopId: string,
  pendingItems: PendingOrderItem[],
  totalAmount: number
): ConversationSession {
  const session: ConversationSession = {
    chatId,
    userId,
    userName,
    shopId,
    state: 'confirming',
    pendingItems,
    totalAmount,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TIMEOUT_MS,
  };

  sessions.set(chatId, session);
  return session;
}

/**
 * Delete session
 */
export function deleteSession(chatId: number): void {
  sessions.delete(chatId);
}

/**
 * Check if user has a pending confirmation
 */
export function hasPendingConfirmation(chatId: number): boolean {
  const session = getSession(chatId);
  return session?.state === 'confirming';
}

/**
 * Clean up expired sessions (call periodically)
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [chatId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(chatId);
      cleaned++;
    }
  }

  return cleaned;
}

// Clean up expired sessions every minute
setInterval(cleanupExpiredSessions, 60 * 1000);
