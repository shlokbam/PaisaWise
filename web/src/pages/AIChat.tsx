import React, { useState, useRef, useEffect } from "react";
import { apiRequest } from "../services/api";
import { Send, Sparkles, RefreshCw, User, HelpCircle } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello Shlok! I'm PaisaWise AI, your personal financial assistant. You can ask me questions about your budgets, subscriptions, or spending trends. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Package conversation history (limit to last 10 messages to save context limits)
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await apiRequest("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          history: history
        })
      });

      setMessages(prev => [...prev, { role: "assistant", content: res.response }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev, 
        { role: "assistant", content: `Failed to fetch response: ${err.message || "Unknown error"}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Where did my money go this month?",
    "Can I afford ₹5,000 headphones?",
    "How much did I spend on subscriptions?",
    "Show me my budget limits"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] glass-panel overflow-hidden">
      {/* AI Chat Header */}
      <div className="p-4 border-b border-dark-border bg-dark-card/50 flex items-center gap-2">
        <Sparkles className="text-yellow-400" size={18} />
        <h3 className="font-bold text-white text-sm">PaisaWise AI Financial Assistant</h3>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-3 max-w-2xl ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            }`}
          >
            {/* Avatar indicator */}
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border ${
              msg.role === "user" 
                ? "bg-dark-accent/15 border-dark-accent/20 text-dark-accent" 
                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
            }`}>
              {msg.role === "user" ? <User size={14} /> : <Sparkles size={14} />}
            </div>
            
            {/* Message box */}
            <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
              msg.role === "user" 
                ? "bg-dark-accent/10 border-dark-accent/20 text-white rounded-tr-none" 
                : "bg-dark-card border-dark-border text-dark-text rounded-tl-none"
            }`}>
              {/* Support simple bullet formats */}
              {msg.content.split("\n").map((line, lIdx) => (
                <p key={lIdx} className={line.startsWith("-") || line.startsWith("*") ? "pl-2 py-0.5" : "py-0.5"}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs">
              <Sparkles size={14} className="animate-pulse" />
            </div>
            <div className="bg-dark-card border border-dark-border p-4 rounded-2xl rounded-tl-none text-sm text-dark-muted flex items-center">
              <RefreshCw className="animate-spin mr-2" size={14} />
              AI is analyzing financial ledger...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion prompt list */}
      {messages.length === 1 && !loading && (
        <div className="p-4 border-t border-dark-border/40 bg-dark-bg/20 flex flex-wrap gap-2 justify-center select-none">
          {suggestions.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              className="text-xs text-dark-muted hover:text-white bg-dark-hover/30 hover:bg-dark-hover/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
              <HelpCircle size={12} /> {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Form at bottom */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="p-4 border-t border-dark-border bg-dark-card/30 flex gap-2"
      >
        <input
          type="text"
          placeholder="Ask a question (e.g., 'How much did I spend on food this month?')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 glass-input py-2 text-sm focus:ring-dark-accent focus:border-dark-accent"
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          className="premium-btn py-2 px-4 shrink-0 disabled:opacity-50 disabled:scale-100"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
