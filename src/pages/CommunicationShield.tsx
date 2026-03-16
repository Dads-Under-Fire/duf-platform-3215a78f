import { useState } from "react";
import { ArrowUp, Copy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

interface AIResult {
  rewritten_message: string;
  tone_assessment: string;
  risk_flags: string[];
}

export default function CommunicationShield() {
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const [originalMessage, setOriginalMessage] = useState("");
  const [mode, setMode] = useState<"respond" | "rewrite">("respond");
  const [inputMessage, setInputMessage] = useState("");
  const [result, setResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const messageToProcess = inputMessage.trim() || originalMessage.trim();
    if (!messageToProcess || !user) return;

    if ((profile?.message_rewrites_used ?? 0) >= (profile?.message_rewrites_limit ?? 250)) {
      toast({ title: "Limit reached", description: "You've used all your message rewrites.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("rewrite-message", {
        body: {
          message: messageToProcess,
          mode,
          original_context: mode === "respond" ? originalMessage.trim() : undefined,
        },
      });

      if (error) throw error;

      const aiResult: AIResult = data;
      setResult(aiResult);

      // Save to DB
      await supabase.from("message_rewrites").insert({
        user_id: user.id,
        original_message: messageToProcess,
        rewritten_message: aiResult.rewritten_message,
        tone_assessment: aiResult.tone_assessment,
        risk_flags: aiResult.risk_flags,
        mode,
      });

      // Increment usage
      await supabase
        .from("profiles")
        .update({ message_rewrites_used: (profile?.message_rewrites_used ?? 0) + 1 })
        .eq("user_id", user.id);

      refetchProfile();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate response", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (result?.rewritten_message) {
      navigator.clipboard.writeText(result.rewritten_message);
      toast({ title: "Copied", description: "Response copied to clipboard." });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mode label */}
      <div className="text-center py-2 text-muted-foreground text-sm border-b border-border">
        {mode === "respond" ? "Response Mode" : "Rewrite Mode"}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-auto">
        {/* Left panel - Original Message */}
        <div className="flex-1 p-4 lg:p-6 flex flex-col lg:border-r border-border">
          <div className="bg-card rounded-lg border border-border flex-1 flex flex-col p-5">
            <h2 className="text-lg font-semibold text-foreground mb-1">Original Message</h2>
            <div className="h-px bg-border mb-3" />
            <p className="text-muted-foreground text-sm mb-4">
              Paste the message you received below.
              <br />
              DUF will generate a neutral, court-safe response.
            </p>
            <textarea
              value={originalMessage}
              onChange={(e) => setOriginalMessage(e.target.value)}
              placeholder="Paste the original message here..."
              className="flex-1 bg-transparent text-foreground resize-none outline-none text-sm placeholder:text-muted-foreground min-h-[120px]"
            />
          </div>
        </div>

        {/* Arrow separator (desktop only) */}
        <div className="hidden lg:flex items-center -mx-3 z-10">
          <div className="text-muted-foreground">→</div>
        </div>

        {/* Right panel - Court-Safe Response */}
        <div className="flex-1 p-4 lg:p-6 flex flex-col">
          <div className="bg-card rounded-lg border border-primary/30 flex-1 flex flex-col p-5">
            <h2 className="text-lg font-semibold text-primary mb-1">Court-Safe Response</h2>
            <div className="h-px bg-border mb-3" />

            {result ? (
              <div className="flex-1 space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Suggested Response</p>
                  <div className="h-px bg-border mb-2" />
                  <p className="text-foreground whitespace-pre-wrap">{result.rewritten_message}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Tone Assessment</p>
                  <div className="h-px bg-border mb-2" />
                  <p className="text-foreground">{result.tone_assessment}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Risk Flags</p>
                  <div className="h-px bg-border mb-2" />
                  <ul className="space-y-1">
                    {result.risk_flags.map((flag, i) => (
                      <li key={i} className="text-foreground">• {flag}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  {loading ? "Generating response..." : "Your court-safe response will appear here."}
                </p>
              </div>
            )}

            {result && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <button
                  onClick={() => { setResult(null); handleSubmit(); }}
                  className="flex items-center gap-2 text-primary text-sm hover:underline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Generate again
                </button>
                <button
                  onClick={copyResult}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy Response
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="border-t border-border px-4 lg:px-6 py-4 space-y-3">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode("respond")} className="flex items-center gap-2">
            <div className={`h-4 w-4 rounded-full border-2 ${mode === "respond" ? "border-primary bg-primary" : "border-muted-foreground"}`} />
            <span className="text-sm text-foreground">Respond to message</span>
          </button>
          <button onClick={() => setMode("rewrite")} className="flex items-center gap-2">
            <div className={`h-4 w-4 rounded-full border-2 ${mode === "rewrite" ? "border-primary bg-primary" : "border-muted-foreground"}`} />
            <span className="text-sm text-foreground">Rewrite my message</span>
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={mode === "respond" ? "Paste the message you want to rewrite..." : "Paste your message here..."}
            className="flex-1 bg-card border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
