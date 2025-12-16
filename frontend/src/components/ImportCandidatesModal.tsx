/**
 * Import Candidates Modal
 *
 * Allows schools and affiliates to import candidates from Excel/CSV files
 */

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Loader2,
  Users,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  parseCandidateExcelFile,
  getCandidateValidationSummary,
  type ParsedCandidate,
} from "@/lib/candidateExcelParser";
import { useAuth } from "@/_core/hooks/useAuth";

interface ImportCandidatesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ImportStep = "select-school" | "upload" | "preview" | "importing" | "complete";

export default function ImportCandidatesModal({
  open,
  onClose,
  onSuccess,
}: ImportCandidatesModalProps) {
  const { user } = useAuth();
  const isSchoolUser = user?.role === 'school';
  const isAffiliateUser = user?.role === 'affiliate';

  // For school users, skip school selection
  const initialStep = isSchoolUser ? "upload" : "select-school";

  const [step, setStep] = useState<ImportStep>(initialStep);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset step when modal opens based on user type
  useEffect(() => {
    if (open) {
      setStep(isSchoolUser ? "upload" : "select-school");
    }
  }, [open, isSchoolUser]);

  // Get schools for dropdown (only for affiliates)
  const { data: schools } = trpc.school.getAll.useQuery(undefined, {
    enabled: isAffiliateUser,
  });

  // Bulk import mutation for schools
  const schoolImportMutation = trpc.school.bulkImportCandidates.useMutation({
    onSuccess: (data) => {
      setImportResult({
        success: data.created,
        failed: data.failed,
        errors: data.errors || [],
      });
      setStep("complete");
      if (data.created > 0) {
        onSuccess?.();
      }
    },
    onError: (error) => {
      toast.error(`Erro ao importar: ${error.message}`);
      setStep("preview");
    },
  });

  // Bulk import mutation for affiliates
  const affiliateImportMutation = trpc.affiliate.bulkImportCandidates.useMutation({
    onSuccess: (data) => {
      setImportResult({
        success: data.created,
        failed: data.failed,
        errors: data.errors || [],
      });
      setStep("complete");
      if (data.created > 0) {
        onSuccess?.();
      }
    },
    onError: (error) => {
      toast.error(`Erro ao importar: ${error.message}`);
      setStep("preview");
    },
  });

  const processFile = async (file: File) => {
    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      toast.error("Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV");
      return;
    }

    try {
      const parsed = await parseCandidateExcelFile(file);
      if (parsed.length === 0) {
        toast.error("O arquivo não contém dados válidos");
        return;
      }
      setCandidates(parsed);
      setStep("preview");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao processar arquivo"
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleRemoveRow = (rowNumber: number) => {
    setCandidates((prev) => prev.filter((c) => c._rowNumber !== rowNumber));
  };

  const handleImport = () => {
    const validCandidates = candidates.filter((c) => c._isValid);
    if (validCandidates.length === 0) {
      toast.error("Nenhum candidato válido para importar");
      return;
    }

    setStep("importing");

    // Prepare data for import (remove validation fields)
    const candidatesToImport = validCandidates.map((c) => ({
      full_name: c.full_name,
      cpf: c.cpf,
      email: c.email,
      phone: c.phone || undefined,
      date_of_birth: c.date_of_birth || undefined,
      address: c.address || undefined,
      city: c.city || undefined,
      state: c.state || undefined,
      zip_code: c.zip_code || undefined,
      education_level: c.education_level || undefined,
      currently_studying: c.currently_studying || undefined,
      institution: c.institution || undefined,
      course: c.course || undefined,
      skills: c.skills || undefined,
      languages: c.languages || undefined,
      has_work_experience: c.has_work_experience || undefined,
      profile_summary: c.profile_summary || undefined,
      available_for_internship: c.available_for_internship || undefined,
      available_for_clt: c.available_for_clt || undefined,
      available_for_apprentice: c.available_for_apprentice || undefined,
      preferred_work_type: c.preferred_work_type || undefined,
    }));

    if (isSchoolUser) {
      schoolImportMutation.mutate({
        candidates: candidatesToImport,
      });
    } else {
      affiliateImportMutation.mutate({
        schoolId: selectedSchoolId,
        candidates: candidatesToImport,
      });
    }
  };

  const handleClose = () => {
    setStep(isSchoolUser ? "upload" : "select-school");
    setSelectedSchoolId("");
    setCandidates([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const validation = getCandidateValidationSummary(candidates);

  // Helper to render cell with warning tooltip
  const renderCellWithWarning = (value: string | undefined, fieldName: string, warnings: string[]) => {
    const relevantWarning = warnings.find(w => w.toLowerCase().includes(fieldName.toLowerCase()));

    if (!value && relevantWarning) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-gray-400">-</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top">
              {relevantWarning}
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }

    if (value && relevantWarning) {
      return (
        <div className="flex items-center gap-1">
          <span className="truncate max-w-[120px]">{value}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 cursor-help flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top">
              {relevantWarning}
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }

    return <span className="truncate max-w-[120px]">{value || "-"}</span>;
  };

  const educationLabels: Record<string, string> = {
    'fundamental': 'Fundamental',
    'medio': 'Médio',
    'superior': 'Superior',
    'pos-graduacao': 'Pós-graduação',
    'mestrado': 'Mestrado',
    'doutorado': 'Doutorado',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[95vw] !w-[1400px] !max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Importar Candidatos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Step 0: Select School (affiliates only) */}
          {step === "select-school" && (
            <div className="space-y-4 max-w-md mx-auto">
              <p className="text-sm text-gray-600">
                Selecione a escola para qual os candidatos serão importados:
              </p>
              <Select
                value={selectedSchoolId}
                onValueChange={setSelectedSchoolId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma escola" />
                </SelectTrigger>
                <SelectContent>
                  {schools?.map((school: { id: string; school_name: string }) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.school_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 1: Upload File */}
          {step === "upload" && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <p className="text-sm text-gray-600">
                Selecione um arquivo Excel (.xlsx, .xls) ou CSV com os dados dos
                candidatos.
              </p>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="candidate-file-upload"
                />
                <label
                  htmlFor="candidate-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload className={`h-10 w-10 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
                  <span className={`text-sm ${isDragging ? "text-blue-600" : "text-gray-600"}`}>
                    {isDragging ? "Solte o arquivo aqui" : "Clique para selecionar ou arraste o arquivo aqui"}
                  </span>
                  <span className="text-xs text-gray-400">
                    Formatos aceitos: .xlsx, .xls, .csv
                  </span>
                </label>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-900 mb-2">
                  Colunas reconhecidas:
                </p>
                <div className="grid grid-cols-3 gap-1 text-blue-800 text-xs">
                  <span>• Nome / Nome Completo</span>
                  <span>• CPF</span>
                  <span>• Email / E-mail</span>
                  <span>• Telefone / Celular</span>
                  <span>• Data de Nascimento</span>
                  <span>• Endereço</span>
                  <span>• Cidade</span>
                  <span>• Estado / UF</span>
                  <span>• CEP</span>
                  <span>• Escolaridade</span>
                  <span>• Instituição / Escola</span>
                  <span>• Curso</span>
                  <span>• Habilidades / Skills</span>
                  <span>• Idiomas</span>
                  <span>• Disponível para Estágio</span>
                  <span>• Disponível para CLT</span>
                  <span>• Jovem Aprendiz</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    <strong>{validation.valid}</strong> prontos para importar
                  </span>
                </div>
                {validation.withWarnings > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">
                      <strong>{validation.withWarnings}</strong> com avisos (serão importados)
                    </span>
                  </div>
                )}
                {validation.invalid > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">
                      <strong>{validation.invalid}</strong> com erros (não serão importados)
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-500 ml-auto">
                  Total: {validation.total} candidatos
                </span>
              </div>

              {/* Full Table */}
              <div className="border rounded-lg overflow-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">#</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Status</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Nome</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">CPF</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Email</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Telefone</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Cidade</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Estado</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Escolaridade</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Instituição</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Curso</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate) => (
                      <tr
                        key={candidate._rowNumber}
                        className={
                          !candidate._isValid
                            ? "bg-red-50 hover:bg-red-100"
                            : candidate._warnings.length > 0
                            ? "bg-amber-50/50 hover:bg-amber-50"
                            : "hover:bg-gray-50"
                        }
                      >
                        <td className="px-2 py-2 text-gray-500">
                          {candidate._rowNumber}
                        </td>
                        <td className="px-2 py-2">
                          {!candidate._isValid ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <p className="font-medium mb-1">Erros:</p>
                                <ul className="space-y-0.5">
                                  {candidate._errors.map((error, i) => (
                                    <li key={i} className="text-red-200">• {error}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          ) : candidate._warnings.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <p className="font-medium mb-1">Avisos:</p>
                                <ul className="space-y-0.5">
                                  {candidate._warnings.map((warning, i) => (
                                    <li key={i}>• {warning}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </td>
                        <td className="px-2 py-2 font-medium">
                          {candidate.full_name || <span className="text-red-500">-</span>}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {candidate.cpf ? formatCPF(candidate.cpf) : <span className="text-red-500">-</span>}
                        </td>
                        <td className="px-2 py-2">
                          {candidate.email || <span className="text-red-500">-</span>}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {renderCellWithWarning(candidate.phone, 'telefone', candidate._warnings)}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {renderCellWithWarning(candidate.city, 'cidade', candidate._warnings)}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {candidate.state || "-"}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {renderCellWithWarning(
                            candidate.education_level ? educationLabels[candidate.education_level] : undefined,
                            'escolaridade',
                            candidate._warnings
                          )}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          <span className="truncate max-w-[120px] block">{candidate.institution || "-"}</span>
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          <span className="truncate max-w-[120px] block">{candidate.course || "-"}</span>
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRow(candidate._rowNumber)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validation.invalid > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">
                      {validation.invalid} candidato(s) não serão importados
                    </p>
                    <p className="text-red-700 text-xs mt-1">
                      Candidatos sem nome, CPF ou email válido não podem ser importados.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-gray-600">Importando candidatos...</p>
              <p className="text-sm text-gray-400 mt-1">
                Isso pode levar alguns segundos
              </p>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && importResult && (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="flex flex-col items-center py-8">
                {importResult.success > 0 ? (
                  <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-600 mb-4" />
                )}
                <h3 className="text-lg font-semibold">
                  {importResult.success > 0
                    ? "Importação Concluída!"
                    : "Falha na Importação"}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {importResult.success}
                  </p>
                  <p className="text-sm text-green-600">
                    Candidatos importados com sucesso
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {importResult.failed}
                  </p>
                  <p className="text-sm text-red-600">Candidatos com erro</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-700 mb-2">
                    Erros encontrados:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {importResult.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li className="text-gray-400">
                        ... e mais {importResult.errors.length - 5} erros
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "select-school" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => setStep("upload")}
                disabled={!selectedSchoolId}
              >
                Continuar
              </Button>
            </>
          )}

          {step === "upload" && (
            <>
              {!isSchoolUser && (
                <Button variant="outline" onClick={() => setStep("select-school")}>
                  Voltar
                </Button>
              )}
              {isSchoolUser && (
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
              )}
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={validation.valid === 0}
              >
                Importar {validation.valid} candidato(s)
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to format CPF
function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
