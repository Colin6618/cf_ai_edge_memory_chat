import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAgent } from "agents/react";

type ChatRole = "user" | "assistant" | "system";
type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};
type AgentConversationState = {
  conversation?: Array<{ role: "user" | "assistant"; text: string }>;
};

function createMessage(role: ChatRole, text: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
  };
}

function parseIncomingMessage(data: unknown): string | null {
  if (data && typeof data === "object") {
    const payload = data as { type?: string; text?: string };
    if (payload.type === "message" && typeof payload.text === "string" && payload.text.trim()) {
      return payload.text;
    }
    return null;
  }

  if (typeof data !== "string") return null;

  try {
    const payload = JSON.parse(data) as { type?: string; text?: string };
    if (payload.type === "message" && typeof payload.text === "string" && payload.text.trim()) {
      return payload.text;
    }
  } catch {
    return null;
  }
  return null;
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("Why is the sky blue");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sendTimeoutRef = useRef<number | null>(null);

  const clearSendTimeout = useCallback(() => {
    if (sendTimeoutRef.current !== null) {
      window.clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = null;
    }
  }, []);

  const handleAgentMessage = useCallback((event: MessageEvent) => {
    const text = parseIncomingMessage(event.data);
    if (!text) return;
    clearSendTimeout();
    setMessages((prev) => [...prev, createMessage("assistant", text)]);
    setIsSending(false);
  }, [clearSendTimeout]);

  const handleAgentClose = useCallback(() => {
    clearSendTimeout();
    setIsSending(false);
  }, [clearSendTimeout]);

  const agentOptions = useMemo(
    () => ({
      agent: "MyAgent",
      onMessage: handleAgentMessage,
      onClose: handleAgentClose,
      onStateUpdate: (state: AgentConversationState) => {
        const conversation = state?.conversation;
        if (!Array.isArray(conversation)) return;
        setMessages(
          conversation.map((item, index) => ({
            id: `state-${index}-${item.role}`,
            role: item.role,
            text: item.text,
          }))
        );
        clearSendTimeout();
        setIsSending(false);
      },
    }),
    [handleAgentMessage, handleAgentClose, clearSendTimeout]
  );

  const agent = useAgent(agentOptions);

  useEffect(() => {
    if (!agent.identified && agent.readyState === WebSocket.OPEN) {
      setTimeout(() => {
        if (!agent.identified && agent.readyState === WebSocket.OPEN) {
          setMessages((prev) => {
            const exists = prev.some(
              (m) => m.role === "system" && m.text.includes("identity is delayed")
            );
            if (exists) return prev;
            return [
              ...prev,
              createMessage("system", "Connection opened but identity is delayed. Retrying..."),
            ];
          });
        }
      }, 3500);
    }
    if (agent.readyState === WebSocket.CLOSED) {
      setIsSending(false);
    }
  }, [agent.identified, agent.readyState]);

  useEffect(() => {
    return () => {
      clearSendTimeout();
    };
  }, [clearSendTimeout]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const connectionStatus = useMemo(() => {
    if (agent.identified) return "Connected";
    if (agent.readyState === WebSocket.CONNECTING) return "Connecting";
    if (agent.readyState === WebSocket.OPEN) return "Connected (identity pending)";
    if (agent.readyState === WebSocket.CLOSING) return "Closing";
    return "Disconnected";
  }, [agent.identified, agent.readyState]);

  const canSend = input.trim().length > 0 && !isSending;

  const ensureReady = async (timeoutMs = 4000): Promise<boolean> => {
    if (agent.identified) return true;
    const timeout = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    });
    const ready = agent.ready.then(() => true).catch(() => false);
    return Promise.race([ready, timeout]);
  };

  const sendMessage = async () => {
    if (!canSend) return;

    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, createMessage("user", text)]);
    setIsSending(true);

    const ready = await ensureReady();
    if (!ready) {
      setMessages((prev) => [
        ...prev,
        createMessage("system", "Connection is not ready. Check Worker and try again."),
      ]);
      setIsSending(false);
      return;
    }

    try {
      agent.send(JSON.stringify({ message: text, text, userId: "guest" }));
      clearSendTimeout();
      sendTimeoutRef.current = window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          createMessage(
            "system",
            "No response yet. The backend may still be processing or failed silently."
          ),
        ]);
        setIsSending(false);
        sendTimeoutRef.current = null;
      }, 12000);
    } catch {
      clearSendTimeout();
      setMessages((prev) => [
        ...prev,
        createMessage("system", "Failed to send message. Please retry."),
      ]);
      setIsSending(false);
    }
  };

  const resetConversation = async () => {
    clearSendTimeout();
    setIsSending(false);

    const ready = await ensureReady();
    if (!ready) {
      setMessages((prev) => [
        ...prev,
        createMessage("system", "Cannot reset yet: connection is not ready."),
      ]);
      return;
    }

    agent.setState({ conversation: [] });
    setMessages([]);
  };

  return (
    <main className="app-shell">
      <section className="chat-panel">
        <header className="chat-header">
          <h1>Cloudflare AI Edge Memory Chat</h1>
          <p>
            Status: <strong>{connectionStatus}</strong>
          </p>
        </header>

        <div className="chat-log">
          {messages.length === 0 ? (
            <p className="empty-state">Start by sending a message.</p>
          ) : (
            messages.map((message) => (
              <article key={message.id} className={`chat-bubble ${message.role}`}>
                <span className="label">{message.role}</span>
                <p>{message.text}</p>
              </article>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <footer className="composer">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Type message..."
            aria-label="Message input"
          />
          <div className="composer-actions">
            <button className="secondary" onClick={() => void resetConversation()}>
              Reset
            </button>
            <button onClick={() => void sendMessage()} disabled={!canSend}>
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
