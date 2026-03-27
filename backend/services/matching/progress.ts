// In-memory progress store for matching pipeline
// Messages are ephemeral — only needed during the matching run

interface ProgressMessage {
  text: string;
  timestamp: number;
}

interface JobProgress {
  status: 'running' | 'completed' | 'failed';
  messages: ProgressMessage[];
  percentComplete: number;
}

const store = new Map<string, JobProgress>();

export function initProgress(jobId: string) {
  store.set(jobId, {
    status: 'running',
    messages: [],
    percentComplete: 0,
  });
}

export function addMessage(jobId: string, text: string, percentComplete?: number) {
  const progress = store.get(jobId);
  if (!progress) return;
  progress.messages.push({ text, timestamp: Date.now() });
  if (percentComplete !== undefined) {
    progress.percentComplete = percentComplete;
  }
}

export function completeProgress(jobId: string, matchCount: number) {
  const progress = store.get(jobId);
  if (!progress) return;
  progress.status = 'completed';
  progress.percentComplete = 100;
  progress.messages.push({
    text: matchCount > 0
      ? `Pronto! ${matchCount} candidatos compatíveis encontrados.`
      : 'Busca finalizada. Nenhum candidato compatível no momento.',
    timestamp: Date.now(),
  });
  // Clean up after 60s
  setTimeout(() => store.delete(jobId), 60000);
}

export function failProgress(jobId: string, error: string) {
  const progress = store.get(jobId);
  if (!progress) return;
  progress.status = 'failed';
  progress.messages.push({ text: `Erro: ${error}`, timestamp: Date.now() });
  setTimeout(() => store.delete(jobId), 60000);
}

export function getProgress(jobId: string): JobProgress | null {
  return store.get(jobId) || null;
}

export function getMessagesSince(jobId: string, since: number): ProgressMessage[] {
  const progress = store.get(jobId);
  if (!progress) return [];
  return progress.messages.filter(m => m.timestamp > since);
}
