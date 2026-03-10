# BoilerBrain — Comprehensive Code & Feature Improvement Report

**Date:** July 2025  
**Scope:** Full-stack review of frontend, backend, database, security, performance, and UX

---

## Executive Summary

BoilerBrain is a professionally-scoped boiler diagnostics platform with a strong feature set: 6,026 manuals, 13,881 extracted fault codes, 22,901 procedures, AI-powered chat diagnostics, and a polished iOS-style UI. The codebase is functional but has accumulated significant technical debt. This report identifies **45 improvements** across 8 categories, prioritised by impact.

---

## 1. CRITICAL — Security Vulnerabilities

### 1.1 Authentication Completely Bypassed
**File:** `src/contexts/AuthContext.jsx` (lines 36–44)  
**Severity:** 🔴 Critical  
The `AuthProvider` hardcodes a test user and skips all real auth checks:
```js
const [user, setUser] = useState({ id: 'test-user', email: 'test@test.com' });
const [session, setSession] = useState({ user: { id: 'test-user', email: 'test@test.com' } });
```
The `useEffect` that listens to `onAuthStateChange` is commented out. **Every user is auto-authenticated as a test user.**

**Fix:** Restore the Supabase `onAuthStateChange` listener and remove the hardcoded test user. Use an environment flag (`VITE_AUTH_BYPASS=true`) for dev-only bypass.

---

### 1.2 Hardcoded Credentials in Source Code
**Files:** `src/supabaseClient.js`, `src/utils/apiConfig.js`, `src/utils/http.js`, `src/utils/apiClient.js`  
**Severity:** 🔴 Critical  
The Supabase anon key is hardcoded as a fallback across 4+ files:
```js
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIs...';
```
While anon keys are designed to be public, this pattern means credentials can't be rotated without a code change and redeploy. It also risks accidentally committing service keys.

**Fix:** Remove all hardcoded fallbacks. Fail fast if env vars are missing. Centralise Supabase config in a single `src/config/supabase.js` module.

---

### 1.3 Chat API Endpoints Have No Authentication
**File:** `server/index.js`  
**Severity:** 🟡 High  
`/api/chat`, `/api/agent/chat`, and `/api/agent/chat/stream` use rate limiting (`chatLimiter`) and input validation but **no auth middleware**. Anyone can call these endpoints and consume OpenAI tokens.

**Fix:** Apply the existing `userAuth` middleware from `server/authMiddleware.js` to all chat endpoints. For unauthenticated demo access, add a separate demo rate limiter with strict token limits.

---

### 1.4 CSP Allows `unsafe-inline` and `unsafe-eval`
**File:** `netlify.toml` (line 35)  
**Severity:** 🟡 High  
```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```
This effectively negates XSS protection from the Content Security Policy.

**Fix:** Remove `unsafe-eval`. Replace `unsafe-inline` with nonce-based CSP or hash-based whitelisting. Vite can be configured to generate CSP-compatible output.

---

### 1.5 Input Sanitization is Regex-Based
**File:** `server/middleware/inputValidation.js` (lines 57–61)  
**Severity:** 🟡 Medium  
Sanitization uses simple regex to remove `<script>` and `<iframe>` tags. This is trivially bypassable (e.g., `<SCRIPT>`, `<img onerror=...>`).

**Fix:** Use a proper sanitization library like `DOMPurify` (already a dependency on the frontend) or `sanitize-html` on the server.

---

### 1.6 Environment Variable Name Mismatch
**Files:** `server/utils/envValidator.js` vs `server/supabaseClient.js`  
**Severity:** 🟡 Medium  
`envValidator.js` expects `SUPABASE_SERVICE_ROLE_KEY` but `supabaseClient.js` reads `SUPABASE_SERVICE_KEY`. This inconsistency risks silent failures.

**Fix:** Standardise on one name (`SUPABASE_SERVICE_KEY`) across all files.

---

## 2. HIGH — Backend Architecture

### 2.1 server/index.js is a 2,175-Line Monolith
**Severity:** 🔴 Critical  
All API endpoints — chat, agent chat, streaming, manuals, sessions, feedback — live in a single file with interleaved business logic, response post-processing, and database queries.

**Fix:** Extract into route modules:
- `routes/chat.js` — `/api/chat` endpoint
- `routes/agent.js` — `/api/agent/chat` and `/api/agent/chat/stream`  
- `routes/manuals.js` — `/api/manuals/*`
- `routes/sessions.js` — `/api/sessions/*`
- `routes/feedback.js` — `/api/feedback`
- `services/ChatResponseProcessor.js` — post-processing logic
- `services/BoilerDetection.js` — manufacturer/model/fault extraction

---

### 2.2 displayMap Duplicated 5+ Times
**File:** `server/index.js` (lines 1246, 1423, 1683, 1942, 2036)  
**Severity:** 🟡 High  
The same manufacturer display name mapping is copy-pasted in 5 locations.

**Fix:** Extract to a shared constant:
```js
// server/constants/manufacturers.js
export const MANUFACTURER_DISPLAY_MAP = { 'worcester': 'Worcester Bosch', ... };
```

---

### 2.3 Silent Error Swallowing (20+ Instances)
**File:** `server/index.js`  
**Severity:** 🟡 High  
Over 20 instances of `catch {}` or `catch (e) { continue; }` with no logging. Failed database queries, tool calls, and API requests are silently discarded.

**Fix:** At minimum, log errors at `warn` level. Critical tool failures should propagate to influence the response.

---

### 2.4 Fragile Response Post-Processing
**File:** `server/index.js` (lines 904–1010)  
**Severity:** 🟡 High  
The `/api/chat` endpoint uses 10+ regex patterns to detect "incorrect interpretations" (model numbers mistaken as fault codes) and then rewrites the AI response with hardcoded strings for specific manufacturer/model combinations (Ideal, Worcester, Vaillant).

This is brittle — adding a new manufacturer requires adding new regex patterns and hardcoded responses.

**Fix:** Move this to the system prompt. Add explicit instructions: "The user's model number (e.g., Greenstar 30) includes a kW rating, not a fault code. Never interpret standalone numbers as fault codes."

---

### 2.5 No Request Timeout on OpenAI Calls
**File:** `server/index.js` (lines 885, 1331)  
**Severity:** 🟡 Medium  
`fetch()` calls to OpenAI have no `AbortController` timeout. If OpenAI hangs, the request hangs indefinitely.

**Fix:** Add a 30-second `AbortController` timeout:
```js
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);
const response = await fetch(url, { ...options, signal: controller.signal });
clearTimeout(timeout);
```

---

### 2.6 `var` Declaration
**File:** `server/index.js` (line 2069)  
**Severity:** 🟢 Low  
Uses `var structured = {` instead of `let` or `const`. This leaks to function scope.

**Fix:** Replace with `let structured`.

---

## 3. HIGH — Frontend Architecture

### 3.1 Overlapping Chat Components (16 Files)
**Directory:** `src/components/chat/`  
**Severity:** 🟡 High  
16 separate files including overlapping concerns:
- `ChatMessageHistory.jsx` vs `EnhancedMessageHistory.jsx` vs `EnhancedMessageThread.jsx`
- `ChatQuickReplies.jsx` vs `EnhancedQuickStartPrompts.jsx`
- `TypingIndicator.jsx` vs `EnhancedTypingIndicator.jsx`

**Fix:** Audit which "Enhanced" versions are active and remove unused predecessors. Consolidate to ~8 focused components.

---

### 3.2 Multiple Redundant Chat Services
**Files:** `src/services/ChatService.js`, `src/services/engineerChatService.js`, `src/services/ResponseManager.js`  
**Severity:** 🟡 High  
- `ChatService.js` calls non-existent endpoints (`/api/chat/openai`, `/api/chat/deepseek`)
- `ChatService.js` imports `ResponseManager` which is deprecated
- `engineerChatService.js` is the actual working service

**Fix:** Delete `ChatService.js` and `ResponseManager.js`. Keep only `engineerChatService.js`.

---

### 3.3 secureAuthService.js is Deprecated but Still Exported
**File:** `src/services/secureAuthService.js`  
**Severity:** 🟡 Medium  
File header says "deprecated" and main functions throw errors, but it's still exported and may be imported elsewhere.

**Fix:** Search for imports and remove. Delete the file.

---

### 3.4 UUID Generation Uses Math.random()
**File:** `src/hooks/useChatSession.js` (lines 6–10)  
**Severity:** 🟡 Medium  
```js
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
```
`Math.random()` is not cryptographically secure and can produce collisions.

**Fix:** Use `crypto.randomUUID()` (supported in all modern browsers) or the `uuid` package.

---

### 3.5 No TypeScript
**Severity:** 🟡 Medium (long-term)  
The entire codebase is plain JavaScript with no type safety. Complex objects like `structured` responses, session data, and fault code extractions are passed around without type contracts.

**Fix:** Incrementally adopt TypeScript. Start with shared types/interfaces for API responses and database models.

---

### 3.6 z-index: 999999 Band-Aid
**File:** `src/components/ManualFinderStandalone.jsx`  
**Severity:** 🟢 Low  
The manufacturer dropdown uses `z-index: 999999` to force visibility. This was a workaround for `overflow: hidden` on parent containers.

**Fix:** Use a React Portal (already imported via `createPortal`) for the dropdown, which avoids stacking context issues entirely.

---

## 4. HIGH — Database Schema

### 4.1 Redundant Fault Code Tables (4 Tables)
**Severity:** 🟡 High  
Four tables store overlapping fault code data:
| Table | Rows | Purpose |
|---|---|---|
| `boiler_fault_codes` | 760 | Basic fault codes |
| `diagnostic_fault_codes` | ~175 | Detailed diagnostics |
| `gc_fault_codes` | 13,881 | GC-extracted fault codes |
| `fault_finding_guides` | 839 | Fault guides (solutions NULL) |

The `EnhancedFaultCodeService` queries all 4 plus `gc_procedures` for every chat message.

**Fix:** Consolidate into a single `fault_codes` table with a `source` column. Migrate data with deduplication.

---

### 4.2 Missing Foreign Key Relationships
**Severity:** 🟡 High  
`gc_fault_codes` and `gc_procedures` link to manuals via `gc_number` (text), not via a foreign key to `boiler_manuals.gc_number`. This allows orphaned records and makes joins slower.

**Fix:** Add foreign key constraints or at minimum create an index on `gc_number` in both tables.

---

### 4.3 Missing Indexes on Frequently Queried Columns
**Severity:** 🟡 High  
Columns frequently used in `ILIKE` and `=` queries have no visible indexes:
- `boiler_manuals.manufacturer`
- `gc_fault_codes.fault_code`, `gc_fault_codes.manufacturer`
- `gc_procedures.gc_number`, `gc_procedures.manufacturer`
- `fault_finding_guides.fault_code`

**Fix:** Create indexes:
```sql
CREATE INDEX idx_boiler_manuals_manufacturer ON boiler_manuals (lower(manufacturer));
CREATE INDEX idx_gc_fault_codes_fault ON gc_fault_codes (lower(fault_code));
CREATE INDEX idx_gc_fault_codes_mfr ON gc_fault_codes (lower(manufacturer));
```

---

### 4.4 Empty Tables Consuming Schema Space
**Severity:** 🟡 Medium  
Tables with 0 rows that are never queried:
- `boiler_part_images` (0 rows)
- `part_replacement_procedures` (0 rows)
- `gc_aliases` (0 rows)
- `knowledge_base` (1 row)

**Fix:** Either populate these tables (they have good schemas) or drop them to reduce confusion.

---

### 4.5 Table Naming Inconsistency
**Severity:** 🟢 Low  
`regulations-visuals` uses hyphens while all other tables use underscores. Hyphens require quoting in SQL.

**Fix:** Rename to `regulations_visuals`.

---

### 4.6 fault_finding_guides.solutions is All NULL
**Severity:** 🟡 Medium  
All 839 rows have `solutions: NULL`. This column exists but was never populated during extraction.

**Fix:** Re-run extraction targeting the solutions field, or populate from `gc_fault_codes.remedy`.

---

## 5. MEDIUM — Performance

### 5.1 Chat History Grows Unbounded
**Severity:** 🟡 High  
The entire chat history array is sent to OpenAI with every message. Long conversations will exceed token limits and increase costs.

**Fix:** Implement a sliding window (last 10-15 messages) or use token counting to trim history before sending to OpenAI.

---

### 5.2 Multiple Sequential DB Queries Per Chat Message
**Severity:** 🟡 Medium  
Each agent chat request makes 3-4 sequential database calls:
1. `get_fault_info` → queries 4-7 tables
2. `search_manuals` → queries boiler_manuals
3. `get_verified_knowledge` → queries knowledge_chunks
4. `get_symptom_guidance` → queries symptom tables

**Fix:** Run independent queries in parallel with `Promise.all()`. Cache frequent lookups (e.g., manufacturer + fault code combinations) with a TTL.

---

### 5.3 No Response Caching for Fault Codes
**Severity:** 🟡 Medium  
The same fault code lookup (e.g., "Vaillant F22") hits the database every time. These are static data that rarely change.

**Fix:** Add an in-memory LRU cache (e.g., `lru-cache` package) with 1-hour TTL for fault code lookups.

---

### 5.4 ILIKE Queries Without Trigram Indexes
**Severity:** 🟡 Medium  
Manual search uses `ILIKE '%term%'` which forces sequential scans.

**Fix:** Enable the `pg_trgm` extension in Supabase and create GIN trigram indexes:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_manuals_name_trgm ON boiler_manuals USING gin (name gin_trgm_ops);
```

---

## 6. MEDIUM — API Design

### 6.1 Three Overlapping Chat Endpoints
**Severity:** 🟡 High  
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Original chat (non-streaming) |
| `/api/agent/chat` | POST | Agent chat with tool calls |
| `/api/agent/chat/stream` | GET | SSE streaming version |

All three have separate but overlapping system prompts, post-processing logic, and response formatting. The `/api/chat` endpoint is ~350 lines; `/api/agent/chat` is ~600 lines.

**Fix:** Consolidate into one endpoint: `POST /api/v1/chat` with a `stream: boolean` option. Share a single system prompt template and post-processing pipeline.

---

### 6.2 GET Used for Streaming Chat
**File:** `server/index.js` (line 1152)  
**Severity:** 🟡 Medium  
`GET /api/agent/chat/stream` passes the user's message in a query parameter. Query params have length limits, are logged in server access logs, and cached by proxies.

**Fix:** Use `POST` with the message in the request body. SSE can still work over POST.

---

### 6.3 Inconsistent Response Format
**Severity:** 🟡 Medium  
- `/api/chat` returns `{ reply }`
- `/api/agent/chat` returns `{ reply, sessionId, structured }`
- Frontend `ChatService.js` tries to handle `reply`, `response`, `content`, and `message` fields

**Fix:** Standardise all endpoints to return:
```json
{ "reply": "...", "sessionId": "...", "structured": { ... }, "sources": [...] }
```

---

## 7. LOW — Code Quality & Maintainability

### 7.1 Mixed Logging (console.log vs logger)
**File:** `server/index.js`  
**Severity:** 🟢 Low  
Mixes `console.log`, `console.warn`, `console.error` with structured `logger.info`, `logger.warn`, `logger.error`.

**Fix:** Replace all `console.*` calls with the structured logger.

---

### 7.2 No Error Boundaries on Lazy-Loaded Routes
**File:** `src/App.jsx`  
**Severity:** 🟡 Medium  
Components are lazy-loaded with `React.lazy` and wrapped in `<Suspense>`, but there's no `<ErrorBoundary>` wrapping most routes. A failing import will crash the app.

**Fix:** Wrap each lazy route (or the `<Suspense>`) in an `<ErrorBoundary>`.

---

### 7.3 Inline Styles Mixed with Tailwind CSS
**Severity:** 🟢 Low  
Several components use `style={{...}}` alongside Tailwind classes. This makes styles harder to maintain and override.

**Fix:** Prefer Tailwind classes or custom CSS for all styling. Use inline styles only for truly dynamic values (e.g., computed widths).

---

### 7.4 No Automated Tests
**Severity:** 🟡 Medium  
All test files and Jest configuration were removed in a previous cleanup. There are currently **zero** tests.

**Fix:** Add critical-path tests:
- Unit tests for `EnhancedFaultCodeService.extractFaultInfo()`
- Integration tests for `/api/chat` and `/api/agent/chat` endpoints
- Component tests for `MessageBubble` and `ManualFinderStandalone`

---

## 8. UX & Feature Improvements

### 8.1 No Persistent Chat History
**Severity:** 🟡 Medium  
Chat sessions expire after 30 minutes. Users lose all conversation history on browser close.

**Fix:** For authenticated users, persist chat history in Supabase tied to their user ID. Show a "Recent Conversations" list.

---

### 8.2 No User Preferences
**Severity:** 🟡 Medium  
Engineers often work on the same boiler brands. There's no way to set a default manufacturer/model.

**Fix:** Add a user preferences table and pre-fill chat context with the user's preferred boiler.

---

### 8.3 No Offline Fault Code Lookup
**Severity:** 🟡 Medium  
PWA caching is configured but the chat requires internet. Engineers on-site may have limited connectivity.

**Fix:** Cache the top 50 fault codes per major manufacturer in IndexedDB. Provide offline fault code lookup with basic information.

---

### 8.4 No Manual Bookmarking
**Severity:** 🟢 Low  
Users can't bookmark or favourite frequently-used manuals.

**Fix:** Add a `user_bookmarks` table and a bookmark toggle on manual cards.

---

### 8.5 No Search History
**Severity:** 🟢 Low  
Manual Finder doesn't remember recent searches.

**Fix:** Store recent searches in localStorage and show them as quick-access chips.

---

## Priority Implementation Roadmap

### Phase 1 — Security (Week 1-2)
1. ✅ Restore real authentication in `AuthContext.jsx`
2. ✅ Remove hardcoded credentials
3. ✅ Add auth middleware to chat endpoints
4. ✅ Fix CSP headers
5. ✅ Standardise env variable names

### Phase 2 — Backend Refactor (Week 3-4)
1. Split `server/index.js` into route modules
2. Extract shared constants (displayMap, regex patterns)
3. Consolidate 3 chat endpoints into 1
4. Add request timeouts to OpenAI calls
5. Replace silent catches with proper logging

### Phase 3 — Database Optimisation (Week 5)
1. Add indexes on manufacturer, fault_code, gc_number
2. Enable pg_trgm for ILIKE performance
3. Consolidate redundant fault code tables
4. Populate fault_finding_guides.solutions
5. Rename `regulations-visuals` table

### Phase 4 — Frontend Cleanup (Week 6-7)
1. Remove dead services (ChatService, ResponseManager, secureAuthService)
2. Consolidate chat components (16 → 8)
3. Fix UUID generation
4. Add Error Boundaries to all routes
5. Begin TypeScript migration (shared types first)

### Phase 5 — Performance & UX (Week 8-9)
1. Implement chat history sliding window
2. Add fault code response caching
3. Parallelise database queries
4. Add persistent chat history for authenticated users
5. Add offline fault code lookup

---

## Summary Table

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Security | 2 | 2 | 2 | 0 | **6** |
| Backend Architecture | 1 | 3 | 1 | 1 | **6** |
| Frontend Architecture | 0 | 2 | 3 | 1 | **6** |
| Database Schema | 0 | 3 | 2 | 1 | **6** |
| Performance | 0 | 1 | 3 | 0 | **4** |
| API Design | 0 | 1 | 2 | 0 | **3** |
| Code Quality | 0 | 0 | 2 | 2 | **4** |
| UX & Features | 0 | 0 | 3 | 2 | **5** |
| **Total** | **3** | **12** | **18** | **7** | **40** |

---

*Report generated from full codebase review of BoilerBrain v1.0*
