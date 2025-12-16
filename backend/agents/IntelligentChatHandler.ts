/**
 * Intelligent Chat Handler with Streaming Support
 *
 * Uses Server-Sent Events (SSE) for real-time message delivery
 * Agent appears to be "typing" the response character by character
 */

import { invokeLLM } from "../_core/llm";
import { DatabaseAdapter } from "./DatabaseAdapter";
import { EnhancedOrchestrator } from "./Orchestrator";
import { AgentContext } from "./AgentContext";
import { ExecutionContext } from "./types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  agentUsed?: string;
  executionTime?: number;
}

export interface ChatResponse {
  message: string;
  agentUsed?: string;
  executionTime: number;
  confidence?: number;
  conversationId: string;
  data?: unknown;
  suggestedFollowUps?: string[];
  metadata?: Record<string, unknown>;
}

export interface StreamEvent {
  type: "start" | "chunk" | "complete" | "error" | "metadata";
  data: string | Record<string, unknown>;
  timestamp: string;
}

export interface IntentDetectionResult {
  agent: string;
  task: string;
  parameters: Record<string, unknown>;
  confidence: number;
  reasoning: string;
}

export interface ConversationContext {
  userId: string;
  affiliateId: string;
  conversationId: string;
  startTime: number;
}

export class IntelligentChatHandler {
  private conversations: Map<string, ChatMessage[]> = new Map();
  private contexts: Map<string, ConversationContext> = new Map();
  private orchestrator: EnhancedOrchestrator;
  private database: DatabaseAdapter;
  private logger: Console;
  private maxHistorySize: number = 50;
  private responseCache: Map<string, { data: IntentDetectionResult; expiry: number }> = new Map();
  private cacheTTL: number = 3600000; // 1 hour
  private streamChunkDelay: number = 50; // ms between chunks for typing effect

  constructor(options: {
    orchestrator: EnhancedOrchestrator;
    database: DatabaseAdapter;
    logger?: Console;
    streamChunkDelay?: number;
  }) {
    this.orchestrator = options.orchestrator;
    this.database = options.database;
    this.logger = options.logger || console;
    this.streamChunkDelay = options.streamChunkDelay || 15;
  }

  /**
   * Handle chat with streaming response
   * Returns an async generator that yields stream events
   */
  async *handleChatStream(
    userMessage: string,
    conversationId: string,
    userId: string,
    affiliateId: string
  ): AsyncGenerator<StreamEvent> {
    const startTime = Date.now();

    try {
      // Initialize conversation
      if (!this.conversations.has(conversationId)) {
        this.conversations.set(conversationId, []);
        this.contexts.set(conversationId, {
          userId,
          affiliateId,
          conversationId,
          startTime,
        });
      }

      const history = this.conversations.get(conversationId)!;

      // Add user message to history
      history.push({
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      });

      if (history.length > this.maxHistorySize) {
        history.shift();
      }

      this.logger.log(`[${conversationId}] Processing message from ${userId}`);

      // Emit start event
      yield {
        type: "start",
        data: "Processing your message...",
        timestamp: new Date().toISOString(),
      };

      // Step 1: Detect intent
      const intentDetection = await this.detectIntentWithLLM(
        userMessage,
        history,
        affiliateId
      );

      this.logger.log(
        `[${conversationId}] Detected intent: ${intentDetection.agent}.${intentDetection.task}`
      );

      yield {
        type: "metadata",
        data: {
          agent: intentDetection.agent,
          task: intentDetection.task,
          confidence: intentDetection.confidence,
        },
        timestamp: new Date().toISOString(),
      };

      // Step 2: Route to agent
      const agentResponse = await this.routeToAgent(
        intentDetection,
        userId,
        affiliateId,
        conversationId
      );

      // Step 3: Generate response with streaming
      yield* this.generateStreamingResponse(
        userMessage,
        agentResponse,
        intentDetection,
        history,
        conversationId,
        startTime
      );
    } catch (error) {
      this.logger.error(`[${conversationId}] Error:`, error);
      yield {
        type: "error",
        data: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate streaming response with typing effect
   */
  private async *generateStreamingResponse(
    userMessage: string,
    agentResponse: unknown,
    intentDetection: IntentDetectionResult,
    history: ChatMessage[],
    conversationId: string,
    startTime: number
  ): AsyncGenerator<StreamEvent> {
    try {
      const responseData = (agentResponse as { data?: unknown })?.data || agentResponse;

      const responsePrompt = `Você é um assistente de IA amigável e profissional em um sistema de recrutamento.

O usuário perguntou: "${userMessage}"

O agente "${intentDetection.agent}" processou a solicitação e retornou:
${JSON.stringify(responseData, null, 2)}

Gere uma resposta natural em português do Brasil que:
1. Responda diretamente à pergunta do usuário
2. Use os dados do agente para fornecer informações úteis
3. Seja concisa mas completa (máximo 3 parágrafos)
4. Use formatação Markdown quando apropriado
5. Seja amigável e profissional

Responda em português do Brasil.`;

      const response = await invokeLLM({
        messages: [
          ...history.slice(-4).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          {
            role: "user" as const,
            content: responsePrompt,
          },
        ],
      });

      // Extract content from LLM response
      const content =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "";

      if (!content) {
        yield {
          type: "error",
          data: "Failed to generate response",
          timestamp: new Date().toISOString(),
        };
        return;
      }

      // Stream the response line by line (prevents text jumping/reflowing)
      let fullResponse = "";

      // Split by lines, keeping the newline characters
      const lines = content.split(/(\n)/);

      for (const line of lines) {
        if (line === "\n") {
          // Just add newline without delay
          fullResponse += line;
          yield {
            type: "chunk",
            data: line,
            timestamp: new Date().toISOString(),
          };
        } else if (line) {
          // Stream words within the line for a nice effect
          const words = line.split(/(\s+)/);
          for (const word of words) {
            fullResponse += word;
            yield {
              type: "chunk",
              data: word,
              timestamp: new Date().toISOString(),
            };
            // Add delay for actual words
            if (word.trim()) {
              await this.delay(this.streamChunkDelay);
            }
          }
        }
      }

      // Add to history
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: fullResponse,
        timestamp: new Date().toISOString(),
        agentUsed: intentDetection.agent,
        executionTime: Date.now() - startTime,
      };

      this.conversations.get(conversationId)?.push(assistantMessage);

      // Emit completion event
      yield {
        type: "complete",
        data: {
          message: fullResponse,
          agentUsed: intentDetection.agent,
          executionTime: Date.now() - startTime,
          confidence: intentDetection.confidence,
          conversationId,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Response generation error:", error);
      yield {
        type: "error",
        data: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Detect intent using LLM
   */
  private async detectIntentWithLLM(
    userMessage: string,
    history: ChatMessage[],
    affiliateId: string
  ): Promise<IntentDetectionResult> {
    const cacheKey = `intent_${userMessage.toLowerCase().substring(0, 100)}`;

    const cached = this.responseCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      this.logger.log(`[Chat] Intent from cache: agent=${cached.data.agent}, needsDB=${cached.data.parameters?.needsDatabaseQuery}`);
      return cached.data;
    }

    const intentPrompt = `Você é um especialista em entender intenções de usuários em um sistema de recrutamento.

Analise a seguinte mensagem e determine qual agente deve processar:

AGENTES DISPONÍVEIS:
- matching: Encontrar candidatos para vagas
- companyHealth: Análise de saúde da empresa, risco de pagamento, listar empresas
- candidateInsights: Análise profunda de candidatos, listar candidatos
- workforcePlanning: Planejamento de força de trabalho
- pipeline: Análise de pipeline de vendas
- schoolPerformance: Análise de desempenho de escolas, listar escolas
- contractRenewal: Previsão de renovação de contratos, listar contratos
- feedbackAnalysis: Análise de feedback
- general: Perguntas gerais, ajuda, saudações

TIPOS DE CONSULTA AO BANCO DE DADOS (queryType):
- candidates: Buscar/listar candidatos
- companies: Buscar/listar empresas
- contracts: Buscar/listar contratos
- feedback: Buscar feedback
- jobs: Buscar/listar vagas
- schools: Buscar/listar escolas
- payments: Buscar pagamentos
- applications: Buscar candidaturas

MENSAGEM: "${userMessage}"

Responda em JSON:
{
  "agent": "<nome do agente>",
  "task": "<tarefa específica>",
  "parameters": {
    "needsDatabaseQuery": <true se precisar buscar dados do banco, false caso contrário>,
    "queryType": "<tipo de consulta se needsDatabaseQuery for true>"
  },
  "confidence": <0-100>,
  "reasoning": "<explicação breve>"
}

REGRAS:
- Se o usuário pedir para VER, LISTAR, MOSTRAR ou BUSCAR dados, defina needsDatabaseQuery: true
- Escolha o queryType apropriado baseado no que o usuário quer ver
- Para saudações simples (olá, oi, etc), use agent: "general"

IMPORTANTE: Retorne APENAS o JSON.`;

    try {
      const response = await invokeLLM({
        messages: [{ role: "user", content: intentPrompt }],
      });

      const content =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "";

      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Failed to parse intent");
      }

      const result = JSON.parse(jsonMatch[0]) as IntentDetectionResult;

      this.logger.log(`[Chat] Intent detected: agent=${result.agent}, task=${result.task}, needsDB=${result.parameters?.needsDatabaseQuery}, queryType=${(result.parameters as Record<string, unknown>)?.queryType}`);

      this.responseCache.set(cacheKey, {
        data: result,
        expiry: Date.now() + this.cacheTTL,
      });

      return result;
    } catch (error) {
      this.logger.error("Intent detection error:", error);
      return {
        agent: "general",
        task: "explainCapabilities",
        parameters: {},
        confidence: 30,
        reasoning: "Fallback due to error",
      };
    }
  }

  /**
   * Route to agent
   */
  private async routeToAgent(
    intentDetection: IntentDetectionResult,
    userId: string,
    affiliateId: string,
    conversationId: string
  ): Promise<unknown> {
    const { agent, task, parameters } = intentDetection;

    // Handle general/help intent without agent execution
    if (agent === "general") {
      return {
        data: {
          capabilities: [
            "Encontrar candidatos para vagas (matching)",
            "Analisar saúde de empresas (companyHealth)",
            "Insights sobre candidatos (candidateInsights)",
            "Planejamento de força de trabalho (workforcePlanning)",
            "Análise de pipeline de vendas (pipeline)",
            "Desempenho de escolas parceiras (schoolPerformance)",
            "Previsão de renovação de contratos (contractRenewal)",
            "Análise de feedback (feedbackAnalysis)",
          ],
          systemStatus: this.orchestrator.getSystemStatus(),
        },
      };
    }

    const context = new ExecutionContext(userId, affiliateId, {
      source: "chat",
      conversationId,
    });

    try {
      // Check if we need to query the database first
      const params = parameters as { needsDatabaseQuery?: boolean; queryType?: string; filters?: Record<string, unknown> };
      if (params.needsDatabaseQuery && params.queryType) {
        this.logger.log(`[Chat] Querying database: ${params.queryType} for affiliate ${affiliateId}`);
        const dbResults = await this.queryDatabase(params, affiliateId);
        (parameters as Record<string, unknown>).databaseResults = dbResults;
        this.logger.log(`[Chat] Database returned ${Array.isArray(dbResults) ? dbResults.length : 0} results`);

        // If we got database results, return them directly for the response generator
        if (dbResults && (Array.isArray(dbResults) ? dbResults.length > 0 : true)) {
          return {
            data: {
              queryType: params.queryType,
              results: dbResults,
              count: Array.isArray(dbResults) ? dbResults.length : 1,
            },
          };
        }
      }

      const result = await this.orchestrator.executeTask(
        agent,
        task,
        parameters as Record<string, unknown>,
        context
      );

      return result;
    } catch (error) {
      this.logger.error(`Agent execution error:`, error);
      throw error;
    }
  }

  /**
   * Query database
   */
  private async queryDatabase(
    parameters: { queryType?: string; filters?: Record<string, unknown> },
    affiliateId: string
  ): Promise<unknown> {
    const { queryType, filters = {} } = parameters;

    // Only add affiliate_id filter if it's a non-empty string
    const secureFilters = affiliateId
      ? { ...filters, affiliate_id: affiliateId }
      : { ...filters };

    this.logger.log(`[Chat] queryDatabase: type=${queryType}, affiliateId=${affiliateId || "none"}, filters=${JSON.stringify(secureFilters)}`);

    let result: unknown;

    switch (queryType) {
      case "candidates":
        result = await this.database.getCandidates(secureFilters);
        break;
      case "companies":
        result = await this.database.getCompanies(secureFilters);
        break;
      case "contracts":
        result = await this.database.getContracts(secureFilters);
        break;
      case "feedback":
        result = await this.database.getFeedback(secureFilters);
        break;
      case "jobs":
        result = await this.database.getJobs(secureFilters);
        break;
      case "schools":
        result = await this.database.getSchools(secureFilters);
        break;
      case "payments":
        result = await this.database.getPayments(secureFilters);
        break;
      case "applications":
        result = await this.database.getApplications(secureFilters);
        break;
      case "count":
        result = await this.database.count(
          (filters as { table?: string }).table || "candidates",
          secureFilters,
          affiliateId
        );
        break;
      default:
        this.logger.log(`[Chat] Unknown queryType: ${queryType}`);
        return null;
    }

    this.logger.log(`[Chat] queryDatabase returned ${Array.isArray(result) ? result.length : 1} results`);
    return result;
  }

  /**
   * Non-streaming version for compatibility (tRPC)
   */
  async handleChat(
    userMessage: string,
    conversationId: string,
    userId: string,
    affiliateId: string
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    let fullMessage = "";
    let agentUsed = "";
    let confidence = 0;

    try {
      for await (const event of this.handleChatStream(
        userMessage,
        conversationId,
        userId,
        affiliateId
      )) {
        if (event.type === "chunk") {
          fullMessage += event.data;
        } else if (event.type === "metadata") {
          const meta = event.data as { agent?: string; confidence?: number };
          agentUsed = meta.agent || "";
          confidence = meta.confidence || 0;
        } else if (event.type === "complete") {
          const completeData = event.data as Record<string, unknown>;
          return {
            message: (completeData.message as string) || fullMessage,
            agentUsed: (completeData.agentUsed as string) || agentUsed,
            confidence: (completeData.confidence as number) || confidence,
            executionTime: (completeData.executionTime as number) || (Date.now() - startTime),
            conversationId: (completeData.conversationId as string) || conversationId,
          };
        } else if (event.type === "error") {
          throw new Error(event.data as string);
        }
      }

      return {
        message: fullMessage,
        agentUsed,
        confidence,
        executionTime: Date.now() - startTime,
        conversationId,
      };
    } catch (error) {
      return {
        message: `Erro: ${error instanceof Error ? error.message : "Unknown error"}`,
        executionTime: Date.now() - startTime,
        conversationId,
      };
    }
  }

  /**
   * Compatibility methods for existing tRPC router
   */
  async processMessage(
    message: string,
    userId: string,
    context: AgentContext
  ): Promise<ChatResponse> {
    const conversationId = userId;
    const affiliateId = context.affiliateId || "";
    return this.handleChat(message, conversationId, userId, affiliateId);
  }

  getHistory(userId: string): ChatMessage[] {
    return this.getConversationHistory(userId);
  }

  clearHistory(userId: string): void {
    this.clearConversation(userId);
  }

  getConversationHistory(conversationId: string): ChatMessage[] {
    return this.conversations.get(conversationId) || [];
  }

  clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
    this.contexts.delete(conversationId);
    this.logger.log(`Conversation ${conversationId} cleared`);
  }

  getStatus(): Record<string, unknown> {
    return {
      conversationsActive: this.conversations.size,
      contextsActive: this.contexts.size,
      cacheSize: this.responseCache.size,
      orchestratorStatus: this.orchestrator.getSystemStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Utility: delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default IntelligentChatHandler;
