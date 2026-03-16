import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, mode, original_context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a family court communication specialist. Your job is to help fathers communicate safely and effectively with a co-parent during custody disputes.

${mode === "respond"
  ? `The user received a message from the other parent. Generate a neutral, factual, court-safe RESPONSE to that message.${original_context ? ` The original message received was: "${original_context}"` : ""}`
  : "The user wants to REWRITE their own message so it is calmer, neutral, and court-safe."
}

You MUST respond by calling the provided tool with your structured output. Always provide:
- rewritten_message: The suggested court-safe message
- tone_assessment: A brief label like "Neutral / De-escalated" or "Professional / Factual"
- risk_flags: An array of bullet points describing what was removed, changed, or improved (e.g., "Removed accusatory language", "Avoided escalation triggers", "Focused on logistics")

Keep the rewritten message concise, respectful, and focused on facts and logistics. Never include emotional language, blame, or passive-aggressive tone.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "format_response",
              description: "Return the structured court-safe response",
              parameters: {
                type: "object",
                properties: {
                  rewritten_message: { type: "string", description: "The court-safe rewritten message" },
                  tone_assessment: { type: "string", description: "Brief tone label e.g. Neutral / De-escalated" },
                  risk_flags: {
                    type: "array",
                    items: { type: "string" },
                    description: "What was removed or improved",
                  },
                },
                required: ["rewritten_message", "tone_assessment", "risk_flags"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "format_response" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rewrite-message error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
