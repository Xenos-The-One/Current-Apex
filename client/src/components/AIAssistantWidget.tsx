import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Sparkles, X, Send, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function getPageContext(path: string): "dashboard" | "leads" | "appointments" | "content" | "general" {
  if (path === "/" || path === "/dashboard") return "dashboard";
  if (path.startsWith("/leads")) return "leads";
  if (path.startsWith("/appointments")) return "appointments";
  if (path.startsWith("/content") || path.startsWith("/seo")) return "content";
  return "general";
}

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [location] = useLocation();

  const chatMutation = trpc.aiAssistant.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;
    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    chatMutation.mutate({
      messages: newMessages,
      context: getPageContext(location),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    "How are my leads doing?",
    "What should I focus on today?",
    "Help me write a follow-up text",
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-5 w-5 group-hover:animate-pulse" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-background border rounded-full shadow-lg px-4 py-2 cursor-pointer hover:shadow-xl transition-shadow"
        onClick={() => setIsMinimized(false)}>
        <Sparkles className="h-4 w-4 text-cyan-500" />
        <span className="text-sm font-medium">AI Assistant</span>
        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
          className="ml-1 hover:bg-accent rounded-full p-0.5">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[380px] max-h-[520px] flex flex-col bg-background border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(true)}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors">
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setIsOpen(false); }}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[280px] max-h-[360px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="h-10 w-10 rounded-full bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5 text-cyan-600" />
            </div>
            <p className="text-sm font-medium mb-1">How can I help?</p>
            <p className="text-xs text-muted-foreground mb-4">
              Ask about your leads, pipeline, content, or anything else.
            </p>
            <div className="space-y-1.5 w-full px-2">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(prompt);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border hover:bg-accent transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.role === "assistant" ? (
                  <Streamdown>{msg.content}</Streamdown>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-2">
        <div className="flex items-end gap-1.5">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="min-h-[36px] max-h-[80px] resize-none text-sm border-0 focus-visible:ring-0 shadow-none px-2 py-2"
            rows={1}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
            disabled={!input.trim() || chatMutation.isPending}
            onClick={handleSend}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
