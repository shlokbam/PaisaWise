import React, { useState, useRef, useEffect } from "react";
import { apiRequest } from "../services/api";
import { Send, Sparkles, RefreshCw, User, HelpCircle, Bot } from "lucide-react";
import { useToast } from "../context/ToastContext";

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
  const { showToast } = useToast();

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
      showToast(err.message || "Failed to contact AI copilot.", "error");
      setMessages(prev => [
        ...prev, 
        { role: "assistant", content: `Failed to fetch response: ${err.message || "Please verify your AI configuration keys in Settings."}` }
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

  // Helper parser for inline rich-text markers
  const parseInlineStyles = (text: string) => {
    // Bold matching (**text**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Custom rich text parser for code blocks, list items, headers, and spacing
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    const renderedElements: React.ReactNode[] = [];
    
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Toggle code block
      if (trimmed.startsWith("```")) {
        if (inCodeBlock) {
          renderedElements.push(
            <pre key={`code-${idx}`} className="bg-dark-bg/60 border border-dark-border p-4 rounded-xl font-mono text-[11px] leading-relaxed my-3 overflow-x-auto text-indigo-300">
              <code>{codeBlockLines.join("\n")}</code>
            </pre>
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }
      
      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }
      
      if (!trimmed) {
        renderedElements.push(<div key={idx} className="h-2" />);
        return;
      }

      // Header matching
      if (trimmed.startsWith("###")) {
        const text = trimmed.replace(/^###\s*/, "");
        renderedElements.push(
          <h4 key={idx} className="text-sm font-bold text-white mt-3.5 mb-1.5 flex items-center gap-1.5">
            <span className="w-1 h-3.5 bg-dark-accent rounded-full" />
            {parseInlineStyles(text)}
          </h4>
        );
        return;
      }
      if (trimmed.startsWith("##")) {
        const text = trimmed.replace(/^##\s*/, "");
        renderedElements.push(
          <h3 key={idx} className="text-base font-bold text-white mt-4 mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-4 bg-dark-accent rounded-full" />
            {parseInlineStyles(text)}
          </h3>
        );
        return;
      }

      // Bullet items matching
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const text = trimmed.replace(/^[-*]\s*/, "");
        renderedElements.push(
          <div key={idx} className="flex gap-2 items-start pl-2 py-0.5">
            <span className="text-dark-accent mt-1.5 text-xs font-bold">•</span>
            <span className="flex-1 text-dark-muted text-sm leading-relaxed">{parseInlineStyles(text)}</span>
          </div>
        );
        return;
      }

      // Standard paragraph
      renderedElements.push(
        <p key={idx} className="py-0.5 text-dark-muted text-sm leading-relaxed">
          {parseInlineStyles(trimmed)}
        </p>
      );
    });

    if (inCodeBlock && codeBlockLines.length > 0) {
      renderedElements.push(
        <pre key="code-unclosed" className="bg-dark-bg/60 border border-dark-border p-4 rounded-xl font-mono text-[11px] leading-relaxed my-3 overflow-x-auto text-indigo-300">
          <code>{codeBlockLines.join("\n")}</code>
        </pre>
      );
    }

    return renderedElements;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] glass-panel overflow-hidden">
      {/* AI Chat Header */}
      <div className="p-4 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="p-1.5 bg-yellow-500/10 border border-yellow-500/25 rounded-lg text-yellow-400">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">PaisaWise AI</h3>
            <p className="text-[10px] text-dark-muted">Conversational Financial Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-dark-accent/25 border border-dark-accent/35 text-white font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1 w-1 bg-dark-accent rounded-full animate-ping"></span>
            Adaptive Model Mode
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-dark-bg/25">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-3.5 max-w-3xl ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            }`}
          >
            {/* Avatar indicator */}
            <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold border transition-all ${
              msg.role === "user" 
                ? "bg-dark-accent/15 border-dark-accent/30 text-dark-accent" 
                : "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
            }`}>
              {msg.role === "user" ? <User size={15} /> : <Bot size={15} />}
            </div>
            
            {/* Message box */}
            <div className={`p-4 rounded-2xl text-sm leading-relaxed border shadow-premium ${
              msg.role === "user" 
                ? "bg-dark-accent/10 border-dark-accent/20 text-white rounded-tr-none" 
                : "bg-dark-card/90 border-dark-border text-dark-text rounded-tl-none"
            }`}>
              {msg.role === "user" ? (
                <p className="text-white text-sm">{msg.content}</p>
              ) : (
                <div className="space-y-1.5">
                  {renderFormattedContent(msg.content)}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3.5 max-w-xl">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 flex items-center justify-center text-xs">
              <Sparkles size={15} className="animate-pulse" />
            </div>
            <div className="bg-dark-card/90 border border-dark-border p-4 rounded-2xl rounded-tl-none text-sm text-dark-muted flex flex-col gap-2.5 shadow-premium">
              <div className="flex items-center gap-2 text-xs">
                <RefreshCw className="animate-spin text-dark-accent" size={12} />
                <span>AI is scanning transactions...</span>
              </div>
              <div className="flex space-x-1.5 py-1 px-1.5 items-center">
                <div className="w-2 h-2 bg-dark-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-dark-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-dark-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion prompt list (always visible when not loading) */}
      {!loading && (
        <div className="px-4 py-2.5 border-t border-dark-border/40 bg-dark-bg/10 flex gap-2 overflow-x-auto scrollbar-none select-none">
          {suggestions.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              className="text-xs text-dark-muted hover:text-white bg-dark-hover/20 hover:bg-dark-hover/60 border border-dark-border/60 px-3 py-1.5 rounded-full transition-all shrink-0 flex items-center gap-1.5 hover:border-dark-accent"
            >
              <HelpCircle size={11} className="text-dark-accent" />
              {prompt}
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
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

export default AIChat;
