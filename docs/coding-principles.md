# Coding Principles

Senior-level best practices for the DukaAI codebase.

---

## 1. TypeScript

### Strict Mode, No Exceptions
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### Type Definitions
- **Prefer interfaces** for object shapes, `type` for unions/intersections
- **Never use `any`** — use `unknown` and narrow with type guards
- **Export types from `@dukaai/shared`** — single source of truth
- **Use const assertions** for literal types: `as const`

```typescript
// Good: Discriminated union for API responses
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Good: Type guard
function isOrder(value: unknown): value is Order {
  return typeof value === 'object' && value !== null && 'orderId' in value;
}
```

### Zod for Runtime Validation
```typescript
// Validate at system boundaries only (API endpoints, webhook handlers)
const CreateOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(OrderItemSchema).min(1),
});

// Infer types from schemas
type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
```

---

## 2. React (Frontend)

### Component Design
- **One component per file** — name matches export
- **Props interface above component** — never inline
- **Prefer composition over props drilling** — use context sparingly
- **No business logic in components** — extract to hooks or services

```typescript
// components/orders/OrderCard.tsx
interface OrderCardProps {
  order: Order;
  onStatusChange: (status: OrderStatus) => void;
}

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  // Render only, no data fetching
}
```

### Hooks
- **Custom hooks for reusable logic** — prefix with `use`
- **One responsibility per hook**
- **Return object for >2 values** — easier to destructure selectively

```typescript
// hooks/useOrders.ts
export function useOrders(shopId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch logic...

  return { orders, loading, error, refetch };
}
```

### State Management
- **Local state first** — lift only when shared
- **URL state for filters/pagination** — use `useSearchParams`
- **Server state via custom hooks** — consider React Query for caching later
- **Context for truly global state** — auth, shop selection

### Performance
- **Lazy load routes** — `React.lazy()` with Suspense
- **Memoize expensive renders** — `React.memo` for list items
- **Stable references** — `useCallback` for handlers passed to children
- **Avoid anonymous functions in JSX** — define outside render

---

## 3. Express (Backend)

### Route Structure
```
src/
├── routes/           # Route definitions only
├── controllers/      # Request handling, call services
├── services/         # Business logic, database calls
├── middleware/       # Auth, validation, error handling
└── utils/            # Pure helper functions
```

### Controller Pattern
```typescript
// controllers/orders.controller.ts
export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input = CreateOrderSchema.parse(req.body);
    const order = await orderService.create(req.shopId, input);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}
```

### Error Handling
- **Throw domain errors** — let middleware handle HTTP mapping
- **Custom error classes** with status codes
- **Async errors auto-caught** — use `express-async-errors` or wrap

```typescript
// errors/AppError.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}
```

### Middleware Order
```typescript
app.use(helmet());              // Security headers
app.use(cors(corsOptions));     // CORS
app.use(express.json());        // Body parsing
app.use(requestLogger);         // Logging
app.use('/api', routes);        // Routes
app.use(notFoundHandler);       // 404
app.use(errorHandler);          // Error handling (always last)
```

---

## 4. Firebase Firestore

### Collection References
```typescript
// services/firebase.ts — centralize references
export const collections = {
  shops: db.collection('shops'),
  shopProducts: (shopId: string) =>
    db.collection('shops').doc(shopId).collection('products'),
  shopOrders: (shopId: string) =>
    db.collection('shops').doc(shopId).collection('orders'),
};
```

### Transaction Patterns
```typescript
// Use transactions for multi-document updates
async function updateOrderAndStock(orderId: string, items: OrderItem[]) {
  await db.runTransaction(async (tx) => {
    // Read all documents first
    const orderRef = collections.shopOrders(shopId).doc(orderId);
    const orderSnap = await tx.get(orderRef);

    // Then write
    tx.update(orderRef, { status: 'CONFIRMED' });
    for (const item of items) {
      tx.update(productRef, { stockQty: FieldValue.increment(-item.qty) });
    }
  });
}
```

### Query Optimization
- **Create composite indexes** in `firestore.indexes.json`
- **Limit results** — always use `.limit()`
- **Paginate with cursors** — `.startAfter(lastDoc)`
- **Denormalize for read performance** — store `customerName` on order

### Data Mapping
```typescript
// Always convert Firestore docs to typed objects
function mapOrder(doc: FirebaseFirestore.DocumentSnapshot): Order {
  const data = doc.data();
  if (!data) throw new NotFoundError('Order');
  
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as Order;
}
```

---

## 5. API Design

### RESTful Conventions
```
GET    /api/orders          # List (with pagination)
POST   /api/orders          # Create
GET    /api/orders/:id      # Read
PATCH  /api/orders/:id      # Partial update
DELETE /api/orders/:id      # Delete (soft delete preferred)

# Actions as sub-resources
POST   /api/orders/:id/confirm
POST   /api/orders/:id/cancel
```

### Response Format
```typescript
// Success
{ "success": true, "data": { ... } }

// Paginated
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 150, "hasMore": true }
}

// Error
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Order not found" } }
```

### Validation
- **Validate at entry points** — controllers, webhook handlers
- **Fail fast** — reject bad input before processing
- **Return specific errors** — field-level validation messages

---

## 6. AI Integration (Gemini)

### Prompt Engineering
```typescript
// Structured prompts with clear instructions
const SYSTEM_PROMPT = `You are an order parsing assistant.
Respond ONLY with valid JSON. No explanations.
If uncertain, set "needsClarification": true.`;

// Include context
const userPrompt = `
Available products:
${products.map(p => `- ${p.name} (${p.price} ETB)`).join('\n')}

Customer message: "${message}"
`;
```

### Error Handling
```typescript
// Always handle AI failures gracefully
async function parseOrder(message: string): Promise<ParsedOrder | null> {
  try {
    const result = await gemini.generateContent(prompt);
    const json = extractJSON(result.text);
    return ParsedOrderSchema.parse(json);
  } catch (error) {
    logger.warn('AI parsing failed', { message, error });
    return null; // Fallback to manual handling
  }
}
```

### Rate Limiting
- **Cache product catalog** — don't fetch for every request
- **Batch requests where possible**
- **Implement retry with exponential backoff**

---

## 7. Telegram Bot

### Command Handlers
```typescript
// Separate handler per command
bot.onText(/\/start/, handleStart);
bot.onText(/\/orders/, handleOrders);
bot.on('message', handleMessage); // Catch-all for NLP

// Handler pattern
async function handleStart(msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  try {
    // Logic
  } catch (error) {
    await bot.sendMessage(chatId, 'Something went wrong. Please try again.');
    logger.error('handleStart failed', { chatId, error });
  }
}
```

### Callback Queries
```typescript
// Use structured callback data
const callbackData = `confirm_order:${orderId}`;

bot.on('callback_query', async (query) => {
  const [action, id] = query.data?.split(':') ?? [];
  
  switch (action) {
    case 'confirm_order':
      await confirmOrder(id, query);
      break;
  }
  
  await bot.answerCallbackQuery(query.id);
});
```

---

## 8. XState Workflows

### Machine Design
```typescript
// machines/orderWorkflow.ts
const orderMachine = createMachine({
  id: 'order',
  initial: 'pending',
  states: {
    pending: {
      on: { CONFIRM: 'confirmed' }
    },
    confirmed: {
      entry: 'notifyCustomer',
      on: { PAY: 'paid', CANCEL: 'cancelled' }
    },
    // ...
  }
});
```

### Actions as Side Effects
```typescript
// Keep machines pure, inject services
const orderService = interpret(
  orderMachine.withConfig({
    actions: {
      notifyCustomer: (ctx) => sendTelegramMessage(ctx.customerId, '...'),
    },
  })
);
```

---

## 9. Error Handling

### Logging
```typescript
// Use structured logging
logger.info('Order created', { orderId, shopId, customerId });
logger.error('Payment failed', { orderId, error: error.message, stack: error.stack });
```

### User-Facing Errors
- **Never expose stack traces** or internal details
- **Provide actionable messages** — "Please try again" or "Contact support"
- **Log correlation IDs** — trace requests across services

---

## 10. Security

### Input Validation
- **Validate all external input** — request bodies, query params, headers
- **Sanitize before storage** — prevent XSS in stored data
- **Use parameterized queries** — Firestore handles this, but be aware

### Authentication
- **Verify Telegram webhook signatures**
- **Use secure tokens for cron jobs** — `x-cron-secret` header
- **Validate shop ownership** — user can only access their shop

### Environment Variables
- **Never commit secrets** — use `.env` files, add to `.gitignore`
- **Validate env vars at startup** — fail fast if missing
- **Use different secrets per environment**

---

## 11. Testing

### Unit Tests
- **Test pure functions** — validators, transformers, utils
- **Mock external services** — Firebase, Gemini, Telegram

### Integration Tests
- **Test API endpoints** — use supertest
- **Use Firebase emulator** — for local Firestore testing

### Test Naming
```typescript
describe('OrderService', () => {
  describe('create', () => {
    it('creates order with valid input', async () => {});
    it('throws when product not found', async () => {});
    it('decrements stock on creation', async () => {});
  });
});
```

---

## 12. Git & Code Review

### Commits
- **Atomic commits** — one logical change per commit
- **Conventional commits** — `feat:`, `fix:`, `refactor:`, `docs:`
- **Reference issues** — `feat: add order parsing (#12)`

### Branch Strategy
```
main              # Production-ready
├── feature/xyz   # New features
├── fix/abc       # Bug fixes
└── refactor/def  # Code improvements
```

### PR Guidelines
- **Small, focused PRs** — easier to review
- **Describe the "why"** — not just the "what"
- **Self-review first** — catch obvious issues

---

## 13. Performance

### Backend
- **Pagination for lists** — never return unbounded results
- **Index Firestore queries** — check query planner
- **Cache static data** — product catalog, shop settings

### Frontend
- **Code splitting** — lazy load routes and heavy components
- **Optimize re-renders** — use React DevTools Profiler
- **Compress assets** — Vite handles this in production

---

## 14. Code Style

### Naming
- **PascalCase** — components, types, interfaces, classes
- **camelCase** — variables, functions, methods
- **SCREAMING_SNAKE** — constants
- **kebab-case** — file names (except components)

### File Organization
- **Co-locate related code** — component + styles + tests
- **Index files for public API** — re-export from `index.ts`
- **Flat over nested** — avoid deep folder hierarchies

### Comments
- **Explain "why", not "what"** — code shows what
- **TODO format** — `// TODO(name): description`
- **JSDoc for public APIs** — functions exported from packages
