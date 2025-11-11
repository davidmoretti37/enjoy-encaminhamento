import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { AgentContext, getAgentByContext } from './agentConfig';
import { invokeLLM } from '../_core/llm';
import * as agentTools from './agentTools';

/**
 * Agent Router
 * 
 * Handles all agent-related operations including:
 * - Context-aware chat
 * - Tool execution
 * - Agent switching
 */

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

export const agentRouter = router({
  /**
   * Get agent configuration for a specific context
   */
  getAgentConfig: publicProcedure
    .input(z.object({
      context: z.enum([
        'escolas',
        'empresas',
        'candidatos',
        'vagas',
        'candidaturas',
        'contratos',
        'pagamentos',
        'feedbacks',
      ]),
    }))
    .query(({ input }) => {
      const agent = getAgentByContext(input.context);
      if (!agent) {
        throw new Error(`Agent not found for context: ${input.context}`);
      }
      return {
        name: agent.name,
        description: agent.description,
        capabilities: agent.capabilities,
        examples: agent.examples,
      };
    }),

  /**
   * Chat with context-aware agent
   */
  chat: protectedProcedure
    .input(z.object({
      context: z.enum([
        'escolas',
        'empresas',
        'candidatos',
        'vagas',
        'candidaturas',
        'contratos',
        'pagamentos',
        'feedbacks',
      ]),
      messages: z.array(chatMessageSchema),
      userId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const agent = getAgentByContext(input.context);
      if (!agent) {
        throw new Error(`Agent not found for context: ${input.context}`);
      }

      // Build messages with system prompt
      const messages = [
        {
          role: 'system' as const,
          content: agent.systemPrompt,
        },
        ...input.messages,
      ];

      // Convert agent tools to LLM tool format
      const tools = agent.tools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));

      // Call LLM with tools
      const response = await invokeLLM({
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
      });

      const assistantMessage = response.choices[0].message;

      // If the assistant wants to call a tool
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        const toolCall = assistantMessage.tool_calls[0];
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        // Execute the tool
        const toolResult = await executeAgentTool(
          input.context,
          toolName,
          toolArgs,
          input.userId
        );

        // Call LLM again with tool result
        const followUpMessages = [
          ...messages,
          {
            role: 'assistant' as const,
            content: assistantMessage.content || '',
            tool_calls: assistantMessage.tool_calls,
          },
          {
            role: 'tool' as const,
            content: JSON.stringify(toolResult),
            tool_call_id: toolCall.id,
          },
        ];

        const finalResponse = await invokeLLM({
          messages: followUpMessages,
        });

        return {
          message: finalResponse.choices[0].message.content || '',
          toolCalled: toolName,
          toolResult,
        };
      }

      return {
        message: assistantMessage.content || '',
        toolCalled: null,
        toolResult: null,
      };
    }),

  /**
   * Get suggested questions for current context
   */
  getSuggestedQuestions: publicProcedure
    .input(z.object({
      context: z.enum([
        'escolas',
        'empresas',
        'candidatos',
        'vagas',
        'candidaturas',
        'contratos',
        'pagamentos',
        'feedbacks',
      ]),
    }))
    .query(({ input }) => {
      const agent = getAgentByContext(input.context);
      return agent?.examples || [];
    }),
});

/**
 * Execute agent tool
 */
async function executeAgentTool(
  context: AgentContext,
  toolName: string,
  args: any,
  userId?: number
): Promise<any> {
  // Map tool names to actual functions
  const toolMap: Record<string, Function> = {
    // Dashboard tools
    getDashboardStats: agentTools.getDashboardStats,
    getGrowthTrends: agentTools.getGrowthTrends,

    // Escolas tools
    search_schools: agentTools.searchSchools,
    get_school_details: agentTools.getSchoolDetails,
    get_school_students: agentTools.getSchoolStudents,

    // Empresas tools
    search_companies: agentTools.searchCompanies,
    get_company_details: agentTools.getCompanyDetails,
    approve_company: agentTools.approveCompany,
    suspend_company: agentTools.suspendCompany,
    get_company_jobs: agentTools.getCompanyJobs,

    // Candidatos tools
    search_candidates: agentTools.searchCandidates,
    get_candidate_profile: agentTools.getCandidateProfile,
    match_candidates_to_job: agentTools.matchCandidatesToJob,
    get_candidate_applications: agentTools.getCandidateApplications,

    // Vagas tools
    search_jobs: agentTools.searchJobs,
    get_job_details: agentTools.getJobDetails,
    get_job_applications: agentTools.getJobApplications,
    get_jobs_by_salary_range: agentTools.getJobsBySalaryRange,

    // Candidaturas tools
    search_applications: agentTools.searchApplications,
    get_application_details: agentTools.getApplicationDetails,
    update_application_status: agentTools.updateApplicationStatus,
    get_applications_by_stage: agentTools.getApplicationsByStage,

    // Contratos tools
    search_contracts: agentTools.searchContracts,
    get_contract_details: agentTools.getContractDetails,
    get_contracts_expiring_soon: agentTools.getContractsExpiringSoon,
    get_contract_history: agentTools.getContractHistory,

    // Pagamentos tools
    search_payments: agentTools.searchPayments,
    get_payment_details: agentTools.getPaymentDetails,
    get_overdue_payments: agentTools.getOverduePayments,
    calculate_revenue: agentTools.calculateRevenue,
    get_company_payment_history: agentTools.getCompanyPaymentHistory,

    // Feedbacks tools
    search_feedback: agentTools.searchFeedback,
    get_feedback_by_contract: agentTools.getFeedbackByContract,
    get_pending_feedback: agentTools.getPendingFeedback,
    get_average_rating_by_candidate: agentTools.getAverageRatingByCandidate,
    get_feedback_trends: agentTools.getFeedbackTrends,

    // Matching tools
    matchJobsToCandidate: agentTools.matchJobsToCandidate,
    explainMatch: agentTools.explainMatch,
  };

  const toolFunction = toolMap[toolName];
  if (!toolFunction) {
    throw new Error(`Tool not found: ${toolName}`);
  }

  try {
    return await toolFunction(args, userId);
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    throw error;
  }
}
