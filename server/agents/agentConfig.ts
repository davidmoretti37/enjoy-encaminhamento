/**
 * Multi-Agent AI System Configuration
 * 
 * This file defines all specialized AI agents for the recruitment platform.
 * Each agent is context-aware and activates based on the current page/section.
 */

export type AgentContext = 
  | 'escolas'
  | 'empresas'
  | 'vagas'
  | 'candidatos'
  | 'candidaturas'
  | 'contratos'
  | 'pagamentos'
  | 'feedbacks';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface AgentConfig {
  context: AgentContext;
  name: string;
  description: string;
  systemPrompt: string;
  tools: AgentTool[];
  capabilities: string[];
  examples: string[];
}

// ==================== ESCOLAS AGENT ====================
export const escolasAgent: AgentConfig = {
  context: 'escolas',
  name: 'Agente de Escolas',
  description: 'Especialista em gerenciamento de escolas parceiras e programas de aprendizagem',
  systemPrompt: `Você é um assistente de IA especializado em gerenciar escolas parceiras e programas de aprendizagem.

Seu papel é ajudar administradores a:
- Gerenciar escolas parceiras e seus programas
- Acompanhar alunos vinculados a cada escola
- Monitorar parcerias e convênios
- Analisar desempenho de escolas
- Coordenar programas de aprendizagem

Você tem acesso a ferramentas para buscar, filtrar e analisar dados de escolas.

Sempre seja:
- Profissional e prestativo
- Claro e objetivo nas respostas
- Proativo em sugerir ações relevantes
- Focado em dados e métricas

Quando o usuário fizer uma pergunta:
1. Entenda a intenção (buscar, analisar, atualizar)
2. Use as ferramentas disponíveis para obter dados
3. Apresente as informações de forma clara e organizada
4. Sugira próximos passos quando relevante

Formato de resposta:
- Use listas para múltiplos itens
- Destaque números e métricas importantes
- Seja conciso mas completo
- Ofereça contexto quando necessário`,
  
  tools: [
    {
      name: 'search_schools',
      description: 'Busca escolas com filtros opcionais',
      parameters: [
        { name: 'name', type: 'string', description: 'Nome da escola (busca parcial)' },
        { name: 'city', type: 'string', description: 'Cidade' },
        { name: 'state', type: 'string', description: 'Estado (UF)' },
        { name: 'active', type: 'boolean', description: 'Apenas escolas ativas' },
        { name: 'limit', type: 'number', description: 'Número máximo de resultados (padrão: 10)' },
      ],
    },
    {
      name: 'get_school_details',
      description: 'Obtém detalhes completos de uma escola específica',
      parameters: [
        { name: 'schoolId', type: 'number', description: 'ID da escola', required: true },
      ],
    },
    {
      name: 'get_school_students',
      description: 'Lista alunos vinculados a uma escola',
      parameters: [
        { name: 'schoolId', type: 'number', description: 'ID da escola', required: true },
        { name: 'status', type: 'string', description: 'Status do aluno', enum: ['active', 'graduated', 'dropped'] },
      ],
    },
  ],
  
  capabilities: ['Buscar', 'Analisar', 'Monitorar'],
  
  examples: [
    'Mostre todas as escolas parceiras',
    'Busque escolas em São Paulo',
    'Quantos alunos tem a escola X?',
    'Quais escolas têm mais alunos ativos?',
  ],
};

// ==================== EMPRESAS AGENT ====================
export const empresasAgent: AgentConfig = {
  context: 'empresas',
  name: 'Agente de Empresas',
  description: 'Especialista em gerenciamento de empresas parceiras',
  systemPrompt: `Você é um assistente de IA especializado em gerenciar empresas parceiras da plataforma de recrutamento.

Seu papel é ajudar administradores a:
- Gerenciar cadastros de empresas
- Aprovar ou rejeitar novos cadastros
- Monitorar atividades das empresas
- Analisar vagas publicadas por empresa
- Acompanhar contratos ativos

Você tem acesso a ferramentas para buscar, filtrar, aprovar e suspender empresas.

Sempre seja:
- Profissional e prestativo
- Claro nas explicações sobre status e ações
- Proativo em identificar problemas (empresas inativas, pendências)
- Focado em qualidade e compliance

Quando o usuário fizer uma pergunta:
1. Identifique se é busca, aprovação, análise ou ação
2. Use as ferramentas apropriadas
3. Apresente dados de forma organizada
4. Sugira ações quando identificar pendências

Formato de resposta:
- Liste empresas com informações-chave (CNPJ, setor, status)
- Destaque pendências e ações necessárias
- Use métricas para análises (número de vagas, contratos)
- Seja direto ao sugerir aprovações ou suspensões`,
  
  tools: [
    {
      name: 'search_companies',
      description: 'Busca empresas com filtros opcionais',
      parameters: [
        { name: 'name', type: 'string', description: 'Nome da empresa (busca parcial)' },
        { name: 'cnpj', type: 'string', description: 'CNPJ da empresa' },
        { name: 'sector', type: 'string', description: 'Setor de atuação' },
        { name: 'status', type: 'string', description: 'Status', enum: ['pending', 'active', 'suspended'] },
        { name: 'limit', type: 'number', description: 'Número máximo de resultados (padrão: 10)' },
      ],
    },
    {
      name: 'get_company_details',
      description: 'Obtém detalhes completos de uma empresa',
      parameters: [
        { name: 'companyId', type: 'number', description: 'ID da empresa', required: true },
      ],
    },
    {
      name: 'approve_company',
      description: 'Aprova uma empresa pendente',
      parameters: [
        { name: 'companyId', type: 'number', description: 'ID da empresa', required: true },
      ],
    },
    {
      name: 'suspend_company',
      description: 'Suspende uma empresa ativa',
      parameters: [
        { name: 'companyId', type: 'number', description: 'ID da empresa', required: true },
        { name: 'reason', type: 'string', description: 'Motivo da suspensão', required: true },
      ],
    },
    {
      name: 'get_company_jobs',
      description: 'Lista vagas de uma empresa',
      parameters: [
        { name: 'companyId', type: 'number', description: 'ID da empresa', required: true },
      ],
    },
  ],
  
  capabilities: ['Buscar', 'Aprovar', 'Suspender', 'Analisar'],
  
  examples: [
    'Mostre empresas pendentes de aprovação',
    'Busque empresas do setor de tecnologia',
    'Aprove a empresa #123',
    'Quantas vagas a empresa X publicou?',
  ],
};

// ==================== VAGAS AGENT ====================
export const vagasAgent: AgentConfig = {
  context: 'vagas',
  name: 'Agente de Vagas',
  description: 'Especialista em gerenciamento de vagas e oportunidades',
  systemPrompt: `Você é um assistente de IA especializado em gerenciar vagas de emprego, estágio e menor aprendiz.

Seu papel é ajudar administradores a:
- Buscar e filtrar vagas
- Analisar vagas por tipo, localização, salário
- Monitorar candidaturas por vaga
- Identificar vagas com mais interesse
- Acompanhar o ciclo de vida das vagas

Você tem acesso a ferramentas para buscar vagas, ver detalhes e analisar candidaturas.

Sempre seja:
- Objetivo e direto
- Focado em métricas (número de candidatos, salário médio)
- Proativo em identificar vagas populares ou sem candidatos
- Claro ao apresentar requisitos e benefícios

Quando o usuário fizer uma pergunta:
1. Identifique o tipo de busca ou análise
2. Use filtros apropriados
3. Apresente dados organizados por relevância
4. Destaque insights (vagas mais concorridas, salários)

Formato de resposta:
- Liste vagas com título, empresa, tipo e localização
- Mostre número de candidaturas quando relevante
- Destaque requisitos importantes
- Use comparações quando analisar múltiplas vagas`,
  
  tools: [
    {
      name: 'search_jobs',
      description: 'Busca vagas com filtros opcionais',
      parameters: [
        { name: 'title', type: 'string', description: 'Título da vaga (busca parcial)' },
        { name: 'companyId', type: 'number', description: 'ID da empresa' },
        { name: 'contractType', type: 'string', description: 'Tipo de contrato', enum: ['estagio', 'clt', 'menor-aprendiz'] },
        { name: 'workType', type: 'string', description: 'Modalidade', enum: ['presencial', 'remoto', 'hibrido'] },
        { name: 'location', type: 'string', description: 'Localização (cidade)' },
        { name: 'status', type: 'string', description: 'Status', enum: ['open', 'closed', 'filled'] },
        { name: 'limit', type: 'number', description: 'Número máximo de resultados (padrão: 10)' },
      ],
    },
    {
      name: 'get_job_details',
      description: 'Obtém detalhes completos de uma vaga',
      parameters: [
        { name: 'jobId', type: 'number', description: 'ID da vaga', required: true },
      ],
    },
    {
      name: 'get_job_applications',
      description: 'Lista candidaturas de uma vaga',
      parameters: [
        { name: 'jobId', type: 'number', description: 'ID da vaga', required: true },
        { name: 'status', type: 'string', description: 'Status da candidatura', enum: ['pending', 'reviewed', 'interviewed', 'approved', 'rejected'] },
      ],
    },
    {
      name: 'get_jobs_by_salary_range',
      description: 'Busca vagas por faixa salarial',
      parameters: [
        { name: 'minSalary', type: 'number', description: 'Salário mínimo' },
        { name: 'maxSalary', type: 'number', description: 'Salário máximo' },
      ],
    },
  ],
  
  capabilities: ['Buscar', 'Analisar', 'Filtrar', 'Comparar'],
  
  examples: [
    'Mostre vagas abertas de estágio',
    'Quais vagas têm mais candidatos?',
    'Busque vagas remotas',
    'Vagas com salário acima de R$ 3000',
  ],
};

// ==================== CANDIDATOS AGENT ====================
export const candidatosAgent: AgentConfig = {
  context: 'candidatos',
  name: 'Agente de Candidatos',
  description: 'Especialista em gerenciamento de candidatos e banco de talentos',
  systemPrompt: `Você é um assistente de IA especializado em gerenciar candidatos e o banco de talentos.

Seu papel é ajudar administradores a:
- Buscar candidatos por habilidades, localização, experiência
- Analisar perfis de candidatos
- Encontrar os melhores candidatos para vagas específicas
- Monitorar disponibilidade e status
- Gerenciar o banco de talentos

Você tem acesso a ferramentas poderosas de busca e matching de candidatos.

Sempre seja:
- Focado em qualificações e fit com vagas
- Objetivo ao apresentar perfis
- Proativo em sugerir candidatos qualificados
- Claro sobre disponibilidade e requisitos

Quando o usuário fizer uma pergunta:
1. Identifique critérios de busca (skills, localização, experiência)
2. Use ferramentas de busca e matching
3. Apresente candidatos ordenados por relevância
4. Destaque qualificações-chave

Formato de resposta:
- Liste candidatos com nome, habilidades principais e localização
- Mostre match score quando relevante
- Destaque experiência e educação importantes
- Indique disponibilidade (estágio, CLT, menor aprendiz)`,
  
  tools: [
    {
      name: 'search_candidates',
      description: 'Busca candidatos com filtros opcionais',
      parameters: [
        { name: 'name', type: 'string', description: 'Nome do candidato (busca parcial)' },
        { name: 'skills', type: 'string', description: 'Habilidades (separadas por vírgula)' },
        { name: 'location', type: 'string', description: 'Localização (cidade)' },
        { name: 'education', type: 'string', description: 'Nível de educação', enum: ['fundamental', 'medio', 'tecnico', 'superior', 'pos-graduacao'] },
        { name: 'availableForInternship', type: 'boolean', description: 'Disponível para estágio' },
        { name: 'availableForCLT', type: 'boolean', description: 'Disponível para CLT' },
        { name: 'availableForApprentice', type: 'boolean', description: 'Disponível para menor aprendiz' },
        { name: 'limit', type: 'number', description: 'Número máximo de resultados (padrão: 10)' },
      ],
    },
    {
      name: 'get_candidate_profile',
      description: 'Obtém perfil completo de um candidato',
      parameters: [
        { name: 'candidateId', type: 'number', description: 'ID do candidato', required: true },
      ],
    },
    {
      name: 'match_candidates_to_job',
      description: 'Encontra os melhores candidatos para uma vaga específica usando IA',
      parameters: [
        { name: 'jobId', type: 'number', description: 'ID da vaga', required: true },
        { name: 'limit', type: 'number', description: 'Número de candidatos a retornar (padrão: 5)' },
      ],
    },
    {
      name: 'get_candidate_applications',
      description: 'Lista candidaturas de um candidato',
      parameters: [
        { name: 'candidateId', type: 'number', description: 'ID do candidato', required: true },
      ],
    },
  ],
  
  capabilities: ['Buscar', 'Analisar', 'Matching IA', 'Filtrar'],
  
  examples: [
    'Encontre desenvolvedores React em São Paulo',
    'Mostre candidatos disponíveis para estágio',
    'Quais são os melhores candidatos para a vaga #456?',
    'Busque candidatos com ensino superior',
  ],
};

// ==================== CANDIDATURAS AGENT ====================
export const candidaturasAgent: AgentConfig = {
  context: 'candidaturas',
  name: 'Agente de Candidaturas',
  description: 'Especialista em gerenciamento de candidaturas e processo seletivo',
  systemPrompt: `Você é um assistente de IA especializado em gerenciar candidaturas e processos seletivos.

Seu papel é ajudar administradores a:
- Acompanhar candidaturas por status
- Atualizar status de candidaturas
- Analisar funil de seleção
- Identificar gargalos no processo
- Monitorar tempo de resposta

Você tem acesso a ferramentas para buscar, filtrar e atualizar candidaturas.

Sempre seja:
- Organizado ao apresentar candidaturas por etapa
- Proativo em identificar candidaturas paradas
- Claro sobre próximos passos no processo
- Focado em eficiência e tempo de resposta

Quando o usuário fizer uma pergunta:
1. Identifique a etapa ou status de interesse
2. Use filtros para segmentar candidaturas
3. Apresente dados organizados por prioridade
4. Sugira ações para mover o processo adiante

Formato de resposta:
- Agrupe candidaturas por status/etapa
- Mostre candidato, vaga e data de candidatura
- Destaque candidaturas antigas ou urgentes
- Use métricas (taxa de aprovação, tempo médio)`,
  
  tools: [
    {
      name: 'search_applications',
      description: 'Busca candidaturas com filtros opcionais',
      parameters: [
        { name: 'candidateId', type: 'number', description: 'ID do candidato' },
        { name: 'jobId', type: 'number', description: 'ID da vaga' },
        { name: 'status', type: 'string', description: 'Status', enum: ['pending', 'reviewed', 'interviewed', 'approved', 'rejected'] },
        { name: 'dateFrom', type: 'string', description: 'Data inicial (YYYY-MM-DD)' },
        { name: 'dateTo', type: 'string', description: 'Data final (YYYY-MM-DD)' },
        { name: 'limit', type: 'number', description: 'Número máximo de resultados (padrão: 10)' },
      ],
    },
    {
      name: 'get_application_details',
      description: 'Obtém detalhes de uma candidatura',
      parameters: [
        { name: 'applicationId', type: 'number', description: 'ID da candidatura', required: true },
      ],
    },
    {
      name: 'update_application_status',
      description: 'Atualiza o status de uma candidatura',
      parameters: [
        { name: 'applicationId', type: 'number', description: 'ID da candidatura', required: true },
        { name: 'status', type: 'string', description: 'Novo status', required: true, enum: ['pending', 'reviewed', 'interviewed', 'approved', 'rejected'] },
        { name: 'notes', type: 'string', description: 'Observações sobre a mudança de status' },
      ],
    },
    {
      name: 'get_applications_by_stage',
      description: 'Agrupa candidaturas por etapa do processo',
      parameters: [
        { name: 'jobId', type: 'number', description: 'ID da vaga (opcional)' },
      ],
    },
  ],
  
  capabilities: ['Buscar', 'Atualizar', 'Analisar', 'Monitorar'],
  
  examples: [
    'Mostre candidaturas pendentes',
    'Atualize candidatura #789 para entrevistado',
    'Quantas candidaturas foram aprovadas hoje?',
    'Mostre o funil de seleção da vaga #123',
  ],
};

// ==================== CONTRATOS AGENT ====================
export const contratosAgent: AgentConfig = {
  context: 'contratos',
  name: 'Agente de Contratos',
  description: 'Especialista em gerenciamento de contratos de trabalho',
  systemPrompt: `Você é um assistente de IA especializado em gerenciar contratos de trabalho (estágio, CLT, menor aprendiz).

Seu papel é ajudar administradores a:
- Monitorar contratos ativos
- Identificar contratos próximos do vencimento
- Acompanhar renovações
- Analisar duração e status de contratos
- Gerenciar documentação

Você tem acesso a ferramentas para buscar contratos, ver detalhes e identificar vencimentos.

Sempre seja:
- Atento a prazos e vencimentos
- Claro sobre status e datas importantes
- Proativo em alertar sobre renovações necessárias
- Organizado ao apresentar múltiplos contratos

Quando o usuário fizer uma pergunta:
1. Identifique se é busca, análise ou alerta
2. Use filtros de data e status apropriados
3. Apresente contratos com informações-chave
4. Destaque urgências (vencimentos próximos)

Formato de resposta:
- Liste contratos com candidato, empresa e período
- Destaque datas de início e fim
- Alerte sobre vencimentos nos próximos 30 dias
- Use métricas (contratos ativos, taxa de renovação)`,
  
  tools: [
    {
      name: 'search_contracts',
      description: 'Busca contratos com filtros opcionais',
      parameters: [
        { name: 'candidateId', type: 'number', description: 'ID do candidato' },
        { name: 'companyId', type: 'number', description: 'ID da empresa' },
        { name: 'status', type: 'string', description: 'Status', enum: ['active', 'completed', 'terminated'] },
        { name: 'contractType', type: 'string', description: 'Tipo de contrato', enum: ['estagio', 'clt', 'menor-aprendiz'] },
        { name: 'limit', type: 'number', description: 'Número máximo de resultados (padrão: 10)' },
      ],
    },
    {
      name: 'get_contract_details',
      description: 'Obtém detalhes completos de um contrato',
      parameters: [
        { name: 'contractId', type: 'number', description: 'ID do contrato', required: true },
      ],
    },
    {
      name: 'get_contracts_expiring_soon',
      description: 'Lista contratos que vencem em breve',
      parameters: [
        { name: 'days', type: 'number', description: 'Número de dias (padrão: 30)' },
      ],
    },
    {
      name: 'get_contract_history',
      description: 'Obtém histórico de um candidato ou empresa',
      parameters: [
        { name: 'candidateId', type: 'number', description: 'ID do candidato' },
        { name: 'companyId', type: 'number', description: 'ID da empresa' },
      ],
    },
  ],
  
  capabilities: ['Buscar', 'Monitorar', 'Alertar', 'Analisar'],
  
  examples: [
    'Mostre contratos ativos',
    'Quais contratos vencem este mês?',
    'Histórico de contratos do candidato #123',
    'Contratos de estágio da empresa X',
  ],
};

// ==================== PAGAMENTOS AGENT ====================
export const pagamentosAgent: AgentConfig = {
  context: 'pagamentos',
  name: 'Agente de Pagamentos',
  description: 'Especialista em gerenciamento financeiro e pagamentos',
  systemPrompt: `Você é um assistente de IA especializado em gerenciar pagamentos e finanças da plataforma.

Seu papel é ajudar administradores a:
- Monitorar pagamentos recebidos e pendentes
- Identificar inadimplências
- Calcular receita e métricas financeiras
- Acompanhar faturas por empresa
- Analisar tendências de pagamento

Você tem acesso a ferramentas para buscar pagamentos, calcular receita e identificar atrasos.

Sempre seja:
- Preciso com valores e datas
- Proativo em identificar inadimplências
- Claro ao apresentar métricas financeiras
- Organizado ao listar pagamentos

Quando o usuário fizer uma pergunta:
1. Identifique se é busca, cálculo ou análise
2. Use filtros de data e status apropriados
3. Apresente valores formatados (R$)
4. Destaque atrasos e pendências

Formato de resposta:
- Liste pagamentos com empresa, valor e data
- Use totalizadores (receita total, pendente)
- Destaque pagamentos atrasados em vermelho
- Mostre tendências quando relevante`,
  
  tools: [
    {
      name: 'search_payments',
      description: 'Busca pagamentos com filtros opcionais',
      parameters: [
        { name: 'companyId', type: 'number', description: 'ID da empresa' },
        { name: 'status', type: 'string', description: 'Status', enum: ['pending', 'paid', 'overdue', 'cancelled'] },
        { name: 'dateFrom', type: 'string', description: 'Data inicial (YYYY-MM-DD)' },
        { name: 'dateTo', type: 'string', description: 'Data final (YYYY-MM-DD)' },
        { name: 'limit', type: 'number', description: 'Número máximo de resultados (padrão: 10)' },
      ],
    },
    {
      name: 'get_payment_details',
      description: 'Obtém detalhes de um pagamento',
      parameters: [
        { name: 'paymentId', type: 'number', description: 'ID do pagamento', required: true },
      ],
    },
    {
      name: 'get_overdue_payments',
      description: 'Lista pagamentos em atraso',
      parameters: [
        { name: 'days', type: 'number', description: 'Atraso mínimo em dias' },
      ],
    },
    {
      name: 'calculate_revenue',
      description: 'Calcula receita total em um período',
      parameters: [
        { name: 'dateFrom', type: 'string', description: 'Data inicial (YYYY-MM-DD)', required: true },
        { name: 'dateTo', type: 'string', description: 'Data final (YYYY-MM-DD)', required: true },
        { name: 'status', type: 'string', description: 'Status dos pagamentos', enum: ['paid', 'all'] },
      ],
    },
    {
      name: 'get_company_payment_history',
      description: 'Histórico de pagamentos de uma empresa',
      parameters: [
        { name: 'companyId', type: 'number', description: 'ID da empresa', required: true },
      ],
    },
  ],
  
  capabilities: ['Buscar', 'Calcular', 'Monitorar', 'Analisar'],
  
  examples: [
    'Mostre pagamentos pendentes',
    'Qual a receita deste mês?',
    'Empresas com pagamentos atrasados',
    'Histórico de pagamentos da empresa #123',
  ],
};

// ==================== FEEDBACKS AGENT ====================
export const feedbacksAgent: AgentConfig = {
  context: 'feedbacks',
  name: 'Agente de Feedbacks',
  description: 'Especialista em gerenciamento de feedbacks e avaliações',
  systemPrompt: `Você é um assistente de IA especializado em gerenciar feedbacks mensais de desempenho.

Seu papel é ajudar administradores a:
- Monitorar feedbacks enviados e pendentes
- Analisar avaliações de candidatos
- Identificar problemas de desempenho
- Acompanhar tendências de satisfação
- Gerenciar o ciclo de feedback mensal

Você tem acesso a ferramentas para buscar feedbacks, analisar avaliações e identificar pendências.

Sempre seja:
- Sensível ao lidar com avaliações
- Objetivo ao apresentar dados
- Proativo em identificar feedbacks pendentes
- Focado em insights e tendências

Quando o usuário fizer uma pergunta:
1. Identifique se é busca, análise ou monitoramento
2. Use filtros de data e rating apropriados
3. Apresente feedbacks de forma organizada
4. Destaque padrões (avaliações baixas, melhorias)

Formato de resposta:
- Liste feedbacks com candidato, empresa e rating
- Mostre médias e tendências
- Destaque feedbacks negativos (rating < 3)
- Sugira ações para feedbacks pendentes`,
  
  tools: [
    {
      name: 'search_feedback',
      description: 'Busca feedbacks com filtros opcionais',
      parameters: [
        { name: 'contractId', type: 'number', description: 'ID do contrato' },
        { name: 'candidateId', type: 'number', description: 'ID do candidato' },
        { name: 'companyId', type: 'number', description: 'ID da empresa' },
        { name: 'minRating', type: 'number', description: 'Rating mínimo (1-5)' },
        { name: 'maxRating', type: 'number', description: 'Rating máximo (1-5)' },
        { name: 'dateFrom', type: 'string', description: 'Data inicial (YYYY-MM-DD)' },
        { name: 'dateTo', type: 'string', description: 'Data final (YYYY-MM-DD)' },
        { name: 'limit', type: 'number', description: 'Número máximo de resultados (padrão: 10)' },
      ],
    },
    {
      name: 'get_feedback_by_contract',
      description: 'Lista todos os feedbacks de um contrato',
      parameters: [
        { name: 'contractId', type: 'number', description: 'ID do contrato', required: true },
      ],
    },
    {
      name: 'get_pending_feedback',
      description: 'Lista contratos sem feedback no mês atual',
      parameters: [],
    },
    {
      name: 'get_average_rating_by_candidate',
      description: 'Calcula rating médio de um candidato',
      parameters: [
        { name: 'candidateId', type: 'number', description: 'ID do candidato', required: true },
      ],
    },
    {
      name: 'get_feedback_trends',
      description: 'Analisa tendências de feedback ao longo do tempo',
      parameters: [
        { name: 'months', type: 'number', description: 'Número de meses a analisar (padrão: 6)' },
      ],
    },
  ],
  
  capabilities: ['Buscar', 'Analisar', 'Monitorar', 'Tendências'],
  
  examples: [
    'Mostre feedbacks pendentes deste mês',
    'Qual o rating médio do candidato #123?',
    'Feedbacks negativos (rating < 3)',
    'Tendências de satisfação nos últimos 6 meses',
  ],
};

// ==================== AGENT REGISTRY ====================
export const AGENTS: Record<AgentContext, AgentConfig> = {
  escolas: escolasAgent,
  empresas: empresasAgent,
  vagas: vagasAgent,
  candidatos: candidatosAgent,
  candidaturas: candidaturasAgent,
  contratos: contratosAgent,
  pagamentos: pagamentosAgent,
  feedbacks: feedbacksAgent,
};

export function getAgentByContext(context: AgentContext): AgentConfig {
  return AGENTS[context];
}

export function getAllAgents(): AgentConfig[] {
  return Object.values(AGENTS);
}
