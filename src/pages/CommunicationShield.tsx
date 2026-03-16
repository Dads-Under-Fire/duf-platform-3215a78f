import { useState } from "react";
import { ArrowUp, Copy, RefreshCw, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

interface AIResult {
  rewritten_message: string;
  tone_assessment: string;
  risk_flags: string[];
}

type Step = "input" | "select-intent" | "result";

export default function CommunicationShield() {
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [mode, setMode] = useState<"respond" | "rewrite">("respond");
  const [inputMessage, setInputMessage] = useState("");
  const [result, setResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [intentOptions, setIntentOptions] = useState<string[]>([]);
  const [loadingIntents, setLoadingIntents] = useState(false);
  const [communicationContext, setCommunicationContext] = useState("");

  const handleSubmitMessage = async () => {
    const msg = inputMessage.trim();
    if (!msg || !user) return;

    if ((profile?.message_rewrites_used ?? 0) >= (profile?.message_rewrites_limit ?? 250)) {
      toast({ title: "Limit reached", description: "You've used all your message rewrites.", variant: "destructive" });
      return;
    }

    setSubmittedMessage(msg);
    setInputMessage("");
    setStep("select-intent");
    setResult(null);
    setCommunicationContext("");
    setLoadingIntents(true);

    try {
      const { data, error } = await supabase.functions.invoke("suggest-intents", {
        body: { message: msg, mode },
      });
      if (error) throw error;
      setIntentOptions(data.options ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to generate options. Using defaults.", variant: "destructive" });
      setIntentOptions(["Confirm the plan", "Set a boundary", "Ask for clarification", "General neutral response"]);
    } finally {
      setLoadingIntents(false);
    }
  };

  const handleSelectIntent = async (option: string) => {
    setCommunicationContext(option);
    setStep("result");
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("rewrite-message", {
        body: {
          message: submittedMessage,
          mode,
          original_context: mode === "respond" ? submittedMessage : undefined,
          communication_context: option,
        },
      });
      if (error) throw error;

      const aiResult: AIResult = data;
      setResult(aiResult);

      await supabase.from("message_rewrites").insert({
        user_id: user!.id,
        original_message: submittedMessage,
        rewritten_message: aiResult.rewritten_message,
        tone_assessment: aiResult.tone_assessment,
        risk_flags: aiResult.risk_flags,
        mode,
      });

      await supabase
        .from("profiles")
        .update({ message_rewrites_used: (profile?.message_rewrites_used ?? 0) + 1 })
        .eq("user_id", user!.id);

      refetchProfile();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate response", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (communicationContext && submittedMessage) {
      handleSelectIntent(communicationContext);
    }
  };

  const copyResult = () => {
    if (result?.rewritten_message) {
      navigator.clipboard.writeText(result.rewritten_message);
      toast({ title: "Copied", description: "Response copied to clipboard." });
    }
  };

  const handleStartOver = () => {
    setStep("input");
    setSubmittedMessage("");
    setResult(null);
    setCommunicationContext("");
    setIntentOptions([]);
  };

  const hasResult = !!result;

  return (
    <div className="flex flex-col h-full">
      {/* Mode label */}
      <div className="text-center py-2 text-muted-foreground text-sm border-b border-border">
        {mode === "respond" ? "Response Mode" : "Rewrite Mode"}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-auto">
        {/* Left panel */}
        <div className="flex-1 p-4 lg:p-6 flex flex-col lg:border-r border-border gap-4">
          {/* Original Message */}
          <div className="bg-card rounded-lg border border-border flex-1 flex flex-col p-5">
            <h2 className="text-lg font-semibold text-foreground mb-1">Original Message</h2>
            <div className="h-px bg-border mb-3" />

            {submittedMessage ? (
              <div className="flex-1">
                <p className="text-muted-foreground text-xs mb-1">Message:</p>
                <p className="text-foreground text-sm whitespace-pre-wrap">{submittedMessage}</p>
              </div>
            ) : (
              <div className="flex-1 text-muted-foreground text-sm space-y-1">
                {mode === "respond" ? (
                  <>
                    <p>Paste the message you received below.</p>
                    <p>DUF will generate a neutral, court-safe response.</p>
                  </>
                ) : (
                  <>
                    <p>Paste the message you plan to send below.</p>
                    <p>DUF will rewrite it to avoid conflict and reduce escalation.</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Communication Context - only after message submitted */}
          {step !== "input" && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">What would you like to communicate?</p>
              {loadingIntents ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-card rounded-md animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {intentOptions.map((option) => {
                    const isSelected = communicationContext === option;
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          if (step === "select-intent") handleSelectIntent(option);
                        }}
                        disabled={step === "result"}
                        className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : step === "result"
                            ? "bg-card text-muted-foreground cursor-default"
                            : "bg-card text-foreground hover:bg-secondary"
                        }`}
                      >
                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
            ) : loading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Generating response...</p>
              </div>
            ) : (
              <div className="flex-1 text-muted-foreground text-sm space-y-4">
                <div>
                  <p>Suggested Response</p>
                  <div className="h-px bg-border my-1" />
                  <p>[ rewritten message ]</p>
                </div>
                <div>
                  <p>Tone Assessment</p>
                  <div className="h-px bg-border my-1" />
                  <p>Neutral / De-escalated</p>
                </div>
                <div>
                  <p>Risk Flags</p>
                  <div className="h-px bg-border my-1" />
                  <p>• Removed accusatory language</p>
                  <p>• Avoided escalation triggers</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <button
                onClick={handleRegenerate}
                disabled={!hasResult || loading}
                className="flex items-center gap-2 text-primary text-sm hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
              >
                <RefreshCw className="h-4 w-4" />
                Generate again
              </button>
              <button
                onClick={copyResult}
                disabled={!hasResult}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Copy className="h-4 w-4" />
                Copy Response
              </button>
            </div>
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

          {step !== "input" && (
            <button
              onClick={handleStartOver}
              className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Start over
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitMessage()}
            placeholder={mode === "respond" ? "Paste the message you received..." : "Paste your message here..."}
            disabled={step !== "input"}
            className="flex-1 bg-card border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            onClick={handleSubmitMessage}
            disabled={loading || !inputMessage.trim() || step !== "input"}
            className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
