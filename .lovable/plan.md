

## Refine Communication Shield Flow and Output

Three files need changes: the frontend component, the rewrite edge function, and the suggest-intents edge function.

### 1. Edge Function: `supabase/functions/rewrite-message/index.ts`

**Expanded output schema.** Replace the current 3-field tool schema with 6 fields:
- `primary_response` (was `rewritten_message`)
- `shorter_response`
- `firmer_response`
- `tone_assessment` (unchanged)
- `risk_flags` (unchanged)
- `why_this_is_safer`

**Updated system prompt** to instruct the AI to:
- Prefer concise, direct responses
- Avoid open-ended phrasing ("so we can discuss", "let me know your thoughts")
- Reference the parenting plan when relevant
- Acknowledge only what is necessary
- Generate all three response variants with clear distinctions

### 2. Edge Function: `supabase/functions/suggest-intents/index.ts`

**Add fallback enforcement.** Update the system prompt to instruct the AI: if it cannot confidently classify the message, return the fallback set ("Set a boundary", "Ask for clarification", "Acknowledge without engaging", "General neutral response"). The prompt already asks for 4-6 options; this adds an explicit fallback instruction. No structural changes needed.

### 3. Frontend: `src/pages/CommunicationShield.tsx`

**Updated `AIResult` interface:**
```typescript
interface AIResult {
  primary_response: string;
  shorter_response: string;
  firmer_response: string;
  tone_assessment: string;
  risk_flags: string[];
  why_this_is_safer: string;
}
```

**"Other..." option with inline text input:**
- After the intent buttons, add an "Other..." button
- On click, reveal a small text input with placeholder "What would you like to communicate?"
- On submit, use the custom text as `communication_context` and trigger response generation

**Header copy change:** "What would you like to communicate?" becomes "How would you like to respond?"

**Right panel layout update:** Display all 6 output sections:
- Primary Response
- Shorter Version
- Firmer Version
- Tone Assessment
- Risk Flags
- Why This Is Safer

**Copy button** copies `primary_response` by default.

**DB insert** updates: save `primary_response` as `rewritten_message` in the `message_rewrites` table (preserving existing schema).

**Fallback handling** in `handleSubmitMessage`: if the edge function returns empty/missing options, use the hardcoded fallback list (already partially implemented, just ensure it never shows blank).

