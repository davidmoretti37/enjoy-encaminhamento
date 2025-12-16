/**
 * useStreamingChat Hook - React hook for streaming chat with typing effect
 *
 * Uses Server-Sent Events (SSE) for real-time message delivery
 */

import { useState, useCallback, useRef, useEffect } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  agentUsed?: string;
  executionTime?: number;
}

export interface StreamMetadata {
  agent?: string;
  task?: string;
  confidence?: number;
}

export interface UseStreamingChatOptions {
  apiUrl?: string;
  conversationId?: string;
  userId?: string;
  affiliateId?: string;
  schoolId?: string | null;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

const CONVERSATION_STORAGE_KEY = "chat_conversation_id";
const MESSAGES_STORAGE_KEY = "chat_messages";

export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  const {
    apiUrl = "/api/chat",
    conversationId: initialConversationId,
    schoolId,
    onError,
    autoReconnect = true,
    maxReconnectAttempts = 3,
  } = options;

  // Initialize conversation ID from localStorage or create new one
  const [conversationId, setConversationId] = useState(() => {
    if (initialConversationId) return initialConversationId;
    const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (stored) return stored;
    const newId = `conv_${Date.now()}`;
    localStorage.setItem(CONVERSATION_STORAGE_KEY, newId);
    return newId;
  });

  // Initialize messages from localStorage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentAgent, setCurrentAgent] = useState<string>("");
  const [currentMetadata, setCurrentMetadata] = useState<StreamMetadata>({});

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Persist conversation ID to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CONVERSATION_STORAGE_KEY, conversationId);
  }, [conversationId]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentMessage, scrollToBottom]);

  /**
   * Send message with streaming response (internal - handles retry without adding message)
   */
  const sendMessageInternal = useCallback(
    async (message: string, isRetry: boolean = false) => {
      if (!message.trim()) {
        return;
      }

      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      try {
        setLoading(true);
        setError(null);
        setCurrentMessage("");
        setCurrentAgent("");
        setCurrentMetadata({});

        // Only add user message on first attempt (not retry)
        if (!isRetry) {
          const userMessage: ChatMessage = {
            role: "user",
            content: message,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, userMessage]);
        }

        // Create EventSource for streaming
        // Get auth token from sessionStorage (Supabase is configured to use sessionStorage)
        let authToken = "";
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
            try {
              const parsed = JSON.parse(sessionStorage.getItem(key) || "");
              authToken = parsed.access_token || "";
              console.log("[Chat] Found auth token in sessionStorage");
              break;
            } catch {
              console.error("Failed to parse auth token");
            }
          }
        }

        if (!authToken) {
          console.error("[Chat] No auth token found in sessionStorage");
        }

        const params = new URLSearchParams({
          message,
          conversationId,
          ...(authToken && { token: authToken }),
          ...(schoolId !== undefined && { schoolId: schoolId || '' }),
        });

        const eventSource = new EventSource(`${apiUrl}/stream?${params.toString()}`);
        eventSourceRef.current = eventSource;

        let fullMessage = "";
        let completed = false;

        // Handle stream events
        eventSource.addEventListener("start", () => {
          console.log("Stream started");
        });

        eventSource.addEventListener("metadata", (e: MessageEvent) => {
          try {
            const metadata = JSON.parse(e.data);
            setCurrentMetadata(metadata);
            setCurrentAgent(metadata.agent || "");
          } catch {
            console.error("Failed to parse metadata");
          }
        });

        eventSource.addEventListener("chunk", (e: MessageEvent) => {
          // The chunk data is JSON-stringified on the server, so we need to parse it
          try {
            const chunk = JSON.parse(e.data);
            fullMessage += chunk;
            setCurrentMessage(fullMessage);
          } catch {
            // If parsing fails, use raw data
            fullMessage += e.data;
            setCurrentMessage(fullMessage);
          }
        });

        eventSource.addEventListener("complete", (e: MessageEvent) => {
          completed = true;
          try {
            const data = JSON.parse(e.data);

            // Add assistant message to history
            const assistantMessage: ChatMessage = {
              role: "assistant",
              content: data.message || fullMessage,
              timestamp: new Date().toISOString(),
              agentUsed: data.agentUsed,
              executionTime: data.executionTime,
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setCurrentMessage("");
            setLoading(false);
            eventSource.close();
            eventSourceRef.current = null;
            reconnectAttemptsRef.current = 0;
          } catch {
            setLoading(false);
            eventSource.close();
            eventSourceRef.current = null;
          }
        });

        eventSource.addEventListener("error", (e: MessageEvent) => {
          completed = true;
          try {
            const errorData = JSON.parse(e.data);
            const err = new Error(errorData.message || "Stream error");
            setError(err);
            onError?.(err);
          } catch {
            const err = new Error("Stream error");
            setError(err);
            onError?.(err);
          }
          setLoading(false);
          eventSource.close();
          eventSourceRef.current = null;
        });

        // Handle connection errors
        eventSource.onerror = () => {
          // Don't retry if we already completed
          if (completed) return;

          console.error("EventSource connection error");
          eventSource.close();
          eventSourceRef.current = null;

          if (
            autoReconnect &&
            reconnectAttemptsRef.current < maxReconnectAttempts
          ) {
            reconnectAttemptsRef.current++;
            console.log(
              `Reconnecting... (attempt ${reconnectAttemptsRef.current})`
            );
            // Retry after delay - pass true to indicate retry
            setTimeout(() => {
              sendMessageInternal(message, true);
            }, 1000 * reconnectAttemptsRef.current);
          } else {
            const err = new Error("Connection lost");
            setError(err);
            onError?.(err);
            setLoading(false);
          }
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        setLoading(false);
      }
    },
    [conversationId, apiUrl, schoolId, onError, autoReconnect, maxReconnectAttempts]
  );

  /**
   * Send message with streaming response
   */
  const sendMessage = useCallback(
    (message: string) => {
      reconnectAttemptsRef.current = 0;
      sendMessageInternal(message, false);
    },
    [sendMessageInternal]
  );

  /**
   * Load conversation history
   */
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/history/${conversationId}`);

      if (!response.ok) {
        throw new Error("Failed to load history");
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, apiUrl, onError]);

  /**
   * Clear conversation
   */
  const clearConversation = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/conversation/${conversationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear conversation");
      }

      const newId = `conv_${Date.now()}`;
      setMessages([]);
      setConversationId(newId);
      // Clear localStorage
      localStorage.setItem(MESSAGES_STORAGE_KEY, "[]");
      localStorage.setItem(CONVERSATION_STORAGE_KEY, newId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    }
  }, [conversationId, apiUrl, onError]);

  /**
   * Start new conversation
   */
  const newConversation = useCallback(() => {
    const newId = `conv_${Date.now()}`;
    setMessages([]);
    setConversationId(newId);
    setError(null);
    setCurrentMessage("");
    setCurrentAgent("");
    setCurrentMetadata({});
    // Clear localStorage
    localStorage.setItem(MESSAGES_STORAGE_KEY, "[]");
    localStorage.setItem(CONVERSATION_STORAGE_KEY, newId);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    messages,
    loading,
    error,
    conversationId,
    currentMessage,
    currentAgent,
    currentMetadata,
    sendMessage,
    loadHistory,
    clearConversation,
    newConversation,
    messagesEndRef,
  };
}

export default useStreamingChat;
