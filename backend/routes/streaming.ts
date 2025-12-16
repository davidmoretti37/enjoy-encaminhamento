/**
 * Streaming Routes - SSE endpoints for real-time chat streaming
 */

import { Router, Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase";
import {
  EnhancedOrchestrator,
  EnhancedMatchingAgent,
  EnhancedCompanyHealthAgent,
  EnhancedCandidateInsightsAgent,
  WorkforcePlanningAgent,
  PipelineAgent,
  SchoolPerformanceAgent,
  ContractRenewalAgent,
  FeedbackAnalysisAgent,
  IntelligentChatHandler,
  DatabaseAdapter,
} from "../agents";
import type { Database } from "../types/database";

type User = Database["public"]["Tables"]["users"]["Row"] & {
  affiliate_id?: string | null;
};

const router = Router();

// Create orchestrator and chat handler (shared instances)
const orchestrator = new EnhancedOrchestrator();

// Register all agents
orchestrator.registerAgent("matching", new EnhancedMatchingAgent());
orchestrator.registerAgent("companyHealth", new EnhancedCompanyHealthAgent());
orchestrator.registerAgent("candidateInsights", new EnhancedCandidateInsightsAgent());
orchestrator.registerAgent("workforcePlanning", new WorkforcePlanningAgent());
orchestrator.registerAgent("pipeline", new PipelineAgent());
orchestrator.registerAgent("schoolPerformance", new SchoolPerformanceAgent());
orchestrator.registerAgent("contractRenewal", new ContractRenewalAgent());
orchestrator.registerAgent("feedbackAnalysis", new FeedbackAnalysisAgent());

const databaseAdapter = new DatabaseAdapter();
const chatHandler = new IntelligentChatHandler({
  orchestrator,
  database: databaseAdapter,
  streamChunkDelay: 15,
});

/**
 * Authenticate user from request
 * Supports: Authorization header, cookie, or query param (for EventSource)
 */
async function authenticateUser(req: Request): Promise<User | null> {
  try {
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token as string | undefined;
    const token =
      authHeader?.replace("Bearer ", "") ||
      (req.cookies?.["sb-access-token"] as string | undefined) ||
      queryToken;

    if (!token) {
      console.log("[Auth] No token found in request");
      return null;
    }

    console.log("[Auth] Verifying token...");
    const { data, error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.log("[Auth] Token verification failed:", authError.message);
      return null;
    }
    if (!data?.user) {
      console.log("[Auth] No user in token data");
      return null;
    }
    console.log("[Auth] Token verified for user:", data.user.id);

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.log("[Auth] Profile fetch error:", profileError.message);
      return null;
    }

    if (!userProfile) {
      console.log("[Auth] No profile found for user:", data.user.id);
      return null;
    }

    console.log("[Auth] User authenticated:", userProfile.email);
    return userProfile;
  } catch (err) {
    console.log("[Auth] Exception:", err);
    return null;
  }
}

/**
 * SSE Streaming endpoint for chat
 * GET /api/chat/stream?message=...&conversationId=...
 */
router.get("/stream", async (req: Request, res: Response) => {
  const user = await authenticateUser(req);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { message, conversationId } = req.query;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const convId =
    typeof conversationId === "string" ? conversationId : `conv_${Date.now()}`;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  try {
    const stream = chatHandler.handleChatStream(
      message,
      convId,
      user.id,
      user.affiliate_id || ""
    );

    for await (const event of stream) {
      // Format SSE event
      const eventData = JSON.stringify(event.data);
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${eventData}\n\n`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ message: errorMessage })}\n\n`);
  } finally {
    res.end();
  }
});

/**
 * Non-streaming fallback endpoint
 * POST /api/chat/message
 */
router.post("/message", async (req: Request, res: Response) => {
  const user = await authenticateUser(req);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { message, conversationId } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const convId =
    typeof conversationId === "string" ? conversationId : `conv_${Date.now()}`;

  try {
    const response = await chatHandler.handleChat(
      message,
      convId,
      user.id,
      user.affiliate_id || ""
    );

    res.json(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * Get conversation history
 * GET /api/chat/history/:conversationId
 */
router.get("/history/:conversationId", async (req: Request, res: Response) => {
  const user = await authenticateUser(req);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { conversationId } = req.params;
  const messages = chatHandler.getConversationHistory(conversationId);

  res.json({ messages });
});

/**
 * Clear conversation
 * DELETE /api/chat/conversation/:conversationId
 */
router.delete(
  "/conversation/:conversationId",
  async (req: Request, res: Response) => {
    const user = await authenticateUser(req);

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { conversationId } = req.params;
    chatHandler.clearConversation(conversationId);

    res.json({ success: true });
  }
);

/**
 * Get chat handler status
 * GET /api/chat/status
 */
router.get("/status", async (req: Request, res: Response) => {
  const user = await authenticateUser(req);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const status = chatHandler.getStatus();
  res.json(status);
});

export default router;
