// Order Status Constants
export const ORDER_STATUS = {
  NEW: 'NEW',
  CONFIRMED: 'CONFIRMED',
  PAID: 'PAID',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export const ORDER_STATUS_FLOW: Record<string, string[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PAID', 'CANCELLED'],
  PAID: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

// Telegram Bot States
export const BOT_STATES = {
  IDLE: 'IDLE',
  AWAITING_ORDER: 'AWAITING_ORDER',
  CONFIRMING_ORDER: 'CONFIRMING_ORDER',
  AWAITING_CLARIFICATION: 'AWAITING_CLARIFICATION',
  BROWSING_PRODUCTS: 'BROWSING_PRODUCTS',
  CHECKING_ORDER_STATUS: 'CHECKING_ORDER_STATUS',
} as const;

// Owner Bot Commands
export const OWNER_COMMANDS = {
  START: '/start',
  STATS: '/stats',
  ORDERS: '/orders',
  PRODUCTS: '/products',
  LOW_STOCK: '/lowstock',
  HELP: '/help',
} as const;

// Customer Bot Commands
export const CUSTOMER_COMMANDS = {
  START: '/start',
  ORDER: '/order',
  STATUS: '/status',
  PRODUCTS: '/products',
  HELP: '/help',
} as const;

// RFM Segmentation Thresholds
export const RFM_THRESHOLDS = {
  RECENCY_DAYS: {
    HIGH: 7,
    MEDIUM: 30,
    LOW: 90,
  },
  FREQUENCY_ORDERS: {
    HIGH: 10,
    MEDIUM: 5,
    LOW: 2,
  },
  MONETARY_VALUE: {
    HIGH: 5000,
    MEDIUM: 2000,
    LOW: 500,
  },
} as const;

// Customer Segments
export const CUSTOMER_SEGMENTS = {
  CHAMPION: 'CHAMPION',
  LOYAL: 'LOYAL',
  POTENTIAL: 'POTENTIAL',
  AT_RISK: 'AT_RISK',
  LOST: 'LOST',
} as const;

// Default Settings
export const DEFAULT_SETTINGS = {
  CURRENCY: 'ETB',
  TIMEZONE: 'Africa/Addis_Ababa',
  LOW_STOCK_THRESHOLD: 10,
  ORDER_CONFIRMATION_TIMEOUT_MINUTES: 5,
  PAYMENT_REMINDER_HOURS: 24,
} as const;

// Gemini API Settings
export const GEMINI_CONFIG = {
  MODEL: 'gemini-1.5-flash',
  MAX_OUTPUT_TOKENS: 1024,
  TEMPERATURE: 0.3,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
