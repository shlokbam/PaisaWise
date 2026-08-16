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
      content: "Hello! I'm PaisaWise AI, your personal financial assistant. You can ask me questions about your budgets, subscriptions, or spending trends. How can I help you today?"
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

  // Helper parser for inline rich-text markers (**bold**, `code`)
  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={index} className="font-semibold text-indigo-300 bg-indigo-500/10 px-1 py-0.5 rounded">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <code key={index} className="font-mono text-[11px] bg-dark-bg/90 border border-dark-border px-1.5 py-0.5 rounded text-amber-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Custom rich text parser for markdown tables, code blocks, callouts, lists, headers, and spacing
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    const renderedElements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Code blocks
      if (trimmed.startsWith("```")) {
        const codeBlockLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeBlockLines.push(lines[i]);
          i++;
        }
        i++; // Skip closing ```
        renderedElements.push(
          <pre key={`code-${i}`} className="bg-dark-bg/80 border border-dark-border/80 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed my-3 overflow-x-auto text-indigo-300">
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        continue;
      }

      // 2. Markdown Tables
      if (trimmed.startsWith("|")) {
        const tableLines: string[] = [];
        let j = i;
        while (j < lines.length) {
          const lTrim = lines[j].trim();
          if (lTrim.startsWith("|")) {
            tableLines.push(lTrim);
            j++;
          } else if (!lTrim && j + 1 < lines.length && lines[j + 1].trim().startsWith("|")) {
            j++; // Skip empty line in between table rows
          } else {
            break;
          }
        }

        if (tableLines.length >= 2) {
          i = j;
          const parseRow = (rowStr: string) =>
            rowStr.split("|").slice(1, rowStr.endsWith("|") ? -1 : undefined).map(c => c.trim());

          const headerCells = parseRow(tableLines[0]);
          let bodyLines = tableLines.slice(1);

          // Remove separator row if present (e.g. |---|---|)
          if (bodyLines.length > 0 && /^[|\s-:]+$/.test(bodyLines[0])) {
            bodyLines = bodyLines.slice(1);
          }

          const bodyRows = bodyLines.map(parseRow);

          renderedElements.push(
            <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-dark-border/80 bg-dark-card/70 shadow-md">
              <table className="w-full text-xs text-left border-collapse min-w-[340px]">
                <thead className="bg-dark-bg/90 border-b border-dark-border/80 font-semibold text-indigo-300 uppercase tracking-wider text-[10px]">
                  <tr>
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} className="px-3.5 py-2.5 whitespace-nowrap">
                        {parseInlineStyles(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-dark-hover/40 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2.5 text-slate-200">
                          {parseInlineStyles(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // 3. Horizontal Rule
      if (trimmed === "--" || trimmed === "---" || trimmed === "***") {
        renderedElements.push(<hr key={`hr-${i}`} className="my-3 border-t border-dark-border/60" />);
        i++;
        continue;
      }

      // 4. Blank lines
      if (!trimmed) {
        renderedElements.push(<div key={`blank-${i}`} className="h-1.5" />);
        i++;
        continue;
      }

      // 5. Headers (###, ##, #)
      if (trimmed.startsWith("###")) {
        const text = trimmed.replace(/^###\s*/, "");
        renderedElements.push(
          <h4 key={`h4-${i}`} className="text-xs font-bold uppercase tracking-wider text-indigo-300 mt-3 mb-1 flex items-center gap-1.5">
            <span className="w-1 h-3 bg-dark-accent rounded-full" />
            {parseInlineStyles(text)}
          </h4>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith("##") || trimmed.startsWith("#")) {
        const text = trimmed.replace(/^#{1,2}\s*/, "");
        renderedElements.push(
          <h3 key={`h3-${i}`} className="text-sm font-bold text-white mt-3.5 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-dark-accent rounded-full" />
            {parseInlineStyles(text)}
          </h3>
        );
        i++;
        continue;
      }

      // 6. Blockquote
      if (trimmed.startsWith(">")) {
        const text = trimmed.replace(/^>\s*/, "");
        renderedElements.push(
          <blockquote key={`quote-${i}`} className="border-l-2 border-dark-accent/80 pl-3 py-1 my-1.5 bg-dark-accent/5 text-slate-300 text-xs italic rounded-r">
            {parseInlineStyles(text)}
          </blockquote>
        );
        i++;
        continue;
      }

      // 7. Bullet lists
      if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•")) {
        const text = trimmed.replace(/^[-*•]\s*/, "");
        renderedElements.push(
          <div key={`bullet-${i}`} className="flex gap-2 items-start pl-1 py-0.5">
            <span className="text-dark-accent mt-1 text-xs font-bold">•</span>
            <span className="flex-1 text-dark-muted text-xs leading-relaxed">{parseInlineStyles(text)}</span>
          </div>
        );
        i++;
        continue;
      }

      // 8. Numbered lists
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        renderedElements.push(
          <div key={`num-${i}`} className="flex gap-2 items-start pl-1 py-0.5">
            <span className="text-indigo-400 font-bold text-xs shrink-0 mt-0.5">{numMatch[1]}.</span>
            <span className="flex-1 text-dark-muted text-xs leading-relaxed">{parseInlineStyles(numMatch[2])}</span>
          </div>
        );
        i++;
        continue;
      }

      // 9. Standard paragraph
      renderedElements.push(
        <p key={`p-${i}`} className="py-0.5 text-dark-muted text-xs leading-relaxed">
          {parseInlineStyles(trimmed)}
        </p>
      );
      i++;
    }

    return renderedElements;
  };

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-6.5rem)] md:h-[calc(100vh-6rem)] glass-panel overflow-hidden w-full max-w-full min-w-0">
      {/* AI Chat Header */}
      <div className="p-2.5 sm:p-4 border-b border-dark-border bg-dark-card/50 flex items-center justify-between shrink-0 w-full min-w-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="p-1 sm:p-1.5 bg-yellow-500/10 border border-yellow-500/25 rounded-lg text-yellow-400">
              <Sparkles size={14} className="animate-pulse sm:w-4 sm:h-4" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-xs sm:text-sm truncate">PaisaWise AI</h3>
            <p className="text-[9px] sm:text-[10px] text-dark-muted truncate">Conversational Assistant</p>
          </div>
        </div>

        <div className="hidden xs:flex items-center gap-2 shrink-0">
          <span className="text-[9px] sm:text-[10px] bg-dark-accent/25 border border-dark-accent/35 text-white font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1 w-1 bg-dark-accent rounded-full animate-ping"></span>
            Adaptive Model Mode
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-6 space-y-3.5 sm:space-y-6 bg-dark-bg/25 w-full min-w-0">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-2 sm:gap-3.5 w-full max-w-full sm:max-w-3xl min-w-0 ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            }`}
          >
            {/* Avatar indicator */}
            <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl shrink-0 flex items-center justify-center text-xs font-bold border transition-all ${
              msg.role === "user" 
                ? "bg-dark-accent/15 border-dark-accent/30 text-dark-accent" 
                : "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
            }`}>
              {msg.role === "user" ? <User size={13} className="sm:w-3.5 sm:h-3.5" /> : <Bot size={13} className="sm:w-3.5 sm:h-3.5" />}
            </div>
            
            {/* Message box */}
            <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm leading-relaxed border shadow-premium flex-1 min-w-0 max-w-full overflow-hidden break-words ${
              msg.role === "user" 
                ? "bg-dark-accent/10 border-dark-accent/20 text-white rounded-tr-none" 
                : "bg-dark-card/90 border-dark-border text-dark-text rounded-tl-none"
            }`}>
              {msg.role === "user" ? (
                <p className="text-white text-xs sm:text-sm break-words">{msg.content}</p>
              ) : (
                <div className="space-y-1.5 min-w-0 overflow-x-auto break-words">
                  {renderFormattedContent(msg.content)}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-2 sm:gap-3.5 max-w-xl">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 flex items-center justify-center text-xs">
              <Sparkles size={13} className="animate-pulse sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="bg-dark-card/90 border border-dark-border p-3 sm:p-4 rounded-xl sm:rounded-2xl rounded-tl-none text-xs sm:text-sm text-dark-muted flex flex-col gap-2 shadow-premium">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                <RefreshCw className="animate-spin text-dark-accent" size={11} />
                <span>AI is scanning transactions...</span>
              </div>
              <div className="flex space-x-1.5 py-0.5 px-1 items-center">
                <div className="w-1.5 h-1.5 bg-dark-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-dark-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-dark-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion prompt list (always visible when not loading) */}
      {!loading && (
        <div className="px-3 py-2 border-t border-dark-border/40 bg-dark-bg/10 flex gap-1.5 overflow-x-auto scrollbar-none select-none shrink-0">
          {suggestions.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              className="text-[10px] sm:text-xs text-dark-muted hover:text-white bg-dark-hover/20 hover:bg-dark-hover/60 border border-dark-border/60 px-2.5 py-1 rounded-full transition-all shrink-0 flex items-center gap-1 hover:border-dark-accent whitespace-nowrap"
            >
              <HelpCircle size={10} className="text-dark-accent" />
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
        className="p-2.5 sm:p-4 border-t border-dark-border bg-dark-card/30 flex gap-2 shrink-0"
      >
        <input
          type="text"
          placeholder="Ask PaisaWise AI..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 glass-input py-2 px-3 text-xs sm:text-sm focus:ring-dark-accent focus:border-dark-accent min-w-0"
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          className="premium-btn py-2 px-3 sm:px-4 shrink-0 disabled:opacity-50 disabled:scale-100 text-xs sm:text-sm flex items-center justify-center gap-1"
        >
          <Send size={14} />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};

export default AIChat;
