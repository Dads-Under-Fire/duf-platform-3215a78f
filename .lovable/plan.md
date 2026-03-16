

## Update AI System Prompt

**What changes:** Replace the system prompt in `supabase/functions/rewrite-message/index.ts` (lines ~18-25) with the new custody communication specialist instructions.

**Implementation:**

Update the `systemPrompt` variable to define the AI as a "custody communication specialist trained in court-admissible co-parent messaging" with explicit rules:
- Neutral, factual tone
- No accusations, emotional language, sarcasm, or defensiveness
- Focus on child logistics (schedules, health, school, transportation)
- Ignore inflammatory language from other parent
- De-escalate conflict
- Appropriate for judge/custody evaluator review
- Keep messages concise and logistics-focused

The mode-specific instructions ("respond" vs "rewrite") and the structured tool output requirements (`rewritten_message`, `tone_assessment`, `risk_flags`) remain unchanged.

**Single file edit:** `supabase/functions/rewrite-message/index.ts` — only the `systemPrompt` string changes. No other files affected.

