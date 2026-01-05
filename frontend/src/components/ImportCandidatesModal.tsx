/**
 * Import Candidates Modal - Dynamic Excel Preview
 *
 * Flow: Upload → AI identifies columns → Preview ALL Excel data → Import
 * Shows the ACTUAL Excel columns, not fixed schema
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
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Users,
  Sparkles,
  User,
  Mail,
  CreditCard,
} from "lucide-react";
import { extractFullExcelData } from "@/lib/candidateExcelParser";
import { useAuth } from "@/_core/hooks/useAuth";

interface ImportCandidatesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ImportStep = "select-school" | "upload" | "analyzing" | "preview" | "importing" | "complete";

interface IdentifiedColumns {
  nameColumn: string | null;
  cpfColumn: string | null;
  emailColumn: string | null;
}

export default function ImportCandidatesModal({
  open,
  onClose,
  onSuccess,
}: ImportCandidatesModalProps) {
  const { user } = useAuth();
  const isSchoolUser = user?.role === 'school';
  const isAffiliateUser = user?.role === 'affiliate';

  const initialStep = isSchoolUser ? "upload" : "select-school";

  const [step, setStep] = useState<ImportStep>(initialStep);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");

  // Raw Excel data
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<Record<string, string>[]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);

  // AI-identified columns
  const [identifiedColumns, setIdentifiedColumns] = useState<IdentifiedColumns>({
    nameColumn: null,
    cpfColumn: null,
    emailColumn: null,
  });

  // Candidate source (internal = from school, external = from outside)
  const [candidateSource, setCandidateSource] = useState<'internal' | 'external'>('internal');

  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset step when modal opens
  useEffect(() => {
    if (open) {
      setStep(isSchoolUser ? "upload" : "select-school");
    }
  }, [open, isSchoolUser]);

  // Get schools for dropdown (only for affiliates)
  const { data: schools } = trpc.school.getAll.useQuery(undefined, {
    enabled: isAffiliateUser,
  });

  // Bulk import mutations
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

  // AI analyze mutations
  const schoolAnalyzeMutation = trpc.school.analyzeExcel.useMutation();
  const affiliateAnalyzeMutation = trpc.affiliate.analyzeExcel.useMutation();

  // Check if a row has a valid name (only requirement for import now)
  const hasValidName = (row: Record<string, string>) => {
    const name = identifiedColumns.nameColumn ? row[identifiedColumns.nameColumn]?.trim() : null;
    return name && name.length > 0;
  };

  const processFile = async (file: File) => {
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      toast.error("Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV");
      return;
    }

    try {
      setStep("analyzing");

      // Extract all data from Excel (with smart header detection)
      const { headers, rows, headerRowIndex: detectedRow } = await extractFullExcelData(file);

      if (rows.length === 0) {
        toast.error("O arquivo está vazio");
        setStep("upload");
        return;
      }

      setExcelHeaders(headers);
      setExcelRows(rows);
      setHeaderRowIndex(detectedRow);

      // Send sample rows to AI for column identification
      const sampleRows = rows.slice(0, 5);
      const analyzeMutation = isSchoolUser ? schoolAnalyzeMutation : affiliateAnalyzeMutation;

      const result = await analyzeMutation.mutateAsync({
        headers,
        sampleRows,
      });

      setIdentifiedColumns(result);

      // Only name column is required now
      if (result.nameColumn) {
        const extras = [result.cpfColumn && 'CPF', result.emailColumn && 'Email'].filter(Boolean);
        if (extras.length > 0) {
          toast.success(`IA identificou Nome, ${extras.join(' e ')}`);
        } else {
          toast.success(`IA identificou coluna de Nome`);
        }
      } else {
        toast.error("IA não conseguiu identificar a coluna de Nome");
      }

      setStep("preview");
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Erro ao processar arquivo");
      setStep("upload");
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

  const handleRemoveRow = (index: number) => {
    setExcelRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    // Only filter by name - CPF/Email are now optional
    const rowsWithName = excelRows.filter(hasValidName);
    if (rowsWithName.length === 0) {
      toast.error("Nenhum candidato com nome para importar");
      return;
    }

    if (!identifiedColumns.nameColumn) {
      toast.error("Coluna de nome não identificada");
      return;
    }

    setStep("importing");

    // Prepare candidates - only name is required, cpf/email are optional
    const candidatesToImport = rowsWithName.map((row) => ({
      full_name: row[identifiedColumns.nameColumn!].trim(),
      cpf: identifiedColumns.cpfColumn
        ? row[identifiedColumns.cpfColumn]?.replace(/\D/g, '') || undefined
        : undefined,
      email: identifiedColumns.emailColumn
        ? row[identifiedColumns.emailColumn]?.trim().toLowerCase() || undefined
        : undefined,
      source: candidateSource,
    }));

    if (isSchoolUser) {
      schoolImportMutation.mutate({ candidates: candidatesToImport });
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
    setExcelHeaders([]);
    setExcelRows([]);
    setHeaderRowIndex(0);
    setIdentifiedColumns({ nameColumn: null, cpfColumn: null, emailColumn: null });
    setCandidateSource('internal');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  // Count rows with valid names (the only requirement now)
  const importableCount = excelRows.filter(hasValidName).length;

  // Check if name column is identified (only required column now)
  const canImport = identifiedColumns.nameColumn !== null && importableCount > 0;

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
              <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
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
                Selecione um arquivo Excel (.xlsx, .xls) ou CSV com os dados dos candidatos.
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
                    {isDragging ? "Solte o arquivo aqui" : "Clique para selecionar ou arraste o arquivo"}
                  </span>
                  <span className="text-xs text-gray-400">
                    Formatos aceitos: .xlsx, .xls, .csv
                  </span>
                </label>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-sm flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">
                    Importação flexível
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    Seu arquivo pode ter qualquer formato. A IA identifica automaticamente
                    as colunas de Nome, CPF e Email. Todas as outras colunas serão preservadas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: AI Analyzing */}
          {step === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                <Sparkles className="h-5 w-5 text-yellow-500 absolute -top-1 -right-1" />
              </div>
              <p className="text-lg font-medium mt-6">IA analisando planilha...</p>
              <p className="text-sm text-gray-500 mt-2">
                Identificando colunas de Nome, CPF e Email
              </p>
            </div>
          )}

          {/* Step 3: Preview - Dynamic Columns */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* AI Identification Summary */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">IA identificou:</span>
                  {headerRowIndex > 0 && (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                      Cabeçalhos na linha {headerRowIndex + 1}
                    </span>
                  )}
                  {identifiedColumns.nameColumn && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      <User className="h-3 w-3" />
                      Nome = "{identifiedColumns.nameColumn}"
                    </span>
                  )}
                  {identifiedColumns.cpfColumn && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      <CreditCard className="h-3 w-3" />
                      CPF = "{identifiedColumns.cpfColumn}"
                    </span>
                  )}
                  {identifiedColumns.emailColumn && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                      <Mail className="h-3 w-3" />
                      Email = "{identifiedColumns.emailColumn}"
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span><strong>{importableCount}</strong> candidatos para importar</span>
                  </div>
                  <span className="text-gray-500 ml-auto">
                    Total: {excelRows.length} linhas | {excelHeaders.length} colunas
                  </span>
                </div>

                {/* Source selector */}
                <div className="flex items-center gap-3 pt-2 border-t">
                  <span className="text-sm font-medium text-gray-700">Origem:</span>
                  <Select value={candidateSource} onValueChange={(v) => setCandidateSource(v as 'internal' | 'external')}>
                    <SelectTrigger className="w-[200px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Interno (da escola)</SelectItem>
                      <SelectItem value="external">Externo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Warning if name column not identified */}
              {!identifiedColumns.nameColumn && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <XCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">
                      Coluna de nome não identificada
                    </p>
                    <p className="text-amber-700 text-xs mt-1">
                      A IA não conseguiu identificar qual coluna contém os nomes dos candidatos.
                    </p>
                  </div>
                </div>
              )}

              {/* Dynamic Preview Table - Horizontal Scroll */}
              <div className="border rounded-lg overflow-x-auto" style={{ maxHeight: 'calc(90vh - 350px)' }}>
                <table className="min-w-max text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 sticky left-0 bg-gray-50 z-20 border-r">
                        #
                      </th>
                      {/* ALL columns from Excel */}
                      {excelHeaders.map((header) => (
                        <th
                          key={header}
                          className={`px-3 py-2 text-left font-medium whitespace-nowrap ${
                            header === identifiedColumns.nameColumn
                              ? "bg-green-50 text-green-800"
                              : header === identifiedColumns.cpfColumn
                              ? "bg-blue-50 text-blue-800"
                              : header === identifiedColumns.emailColumn
                              ? "bg-purple-50 text-purple-800"
                              : "text-gray-700"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {header === identifiedColumns.nameColumn && (
                              <User className="h-3.5 w-3.5" />
                            )}
                            {header === identifiedColumns.cpfColumn && (
                              <CreditCard className="h-3.5 w-3.5" />
                            )}
                            {header === identifiedColumns.emailColumn && (
                              <Mail className="h-3.5 w-3.5" />
                            )}
                            {header}
                          </div>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-left font-medium text-gray-700 sticky right-0 bg-gray-50 z-20 border-l">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelRows.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-gray-500 sticky left-0 bg-white z-10 border-r">
                          {index + 2}
                        </td>
                        {/* ALL data from row */}
                        {excelHeaders.map((header) => (
                          <td
                            key={header}
                            className={`px-3 py-2 whitespace-nowrap max-w-[200px] truncate ${
                              header === identifiedColumns.nameColumn
                                ? "bg-green-50/50 font-medium"
                                : header === identifiedColumns.cpfColumn
                                ? "bg-blue-50/50"
                                : header === identifiedColumns.emailColumn
                                ? "bg-purple-50/50"
                                : ""
                            }`}
                            title={row[header] || ''}
                          >
                            {row[header] || <span className="text-gray-300">-</span>}
                          </td>
                        ))}
                        <td className="px-2 py-2 sticky right-0 bg-white z-10 border-l">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRow(index)}
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

              <p className="text-xs text-gray-500 text-center">
                Arraste horizontalmente para ver todas as {excelHeaders.length} colunas
              </p>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-gray-600">Importando candidatos...</p>
              <p className="text-sm text-gray-400 mt-1">
                Isso pode levar alguns segundos
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && importResult && (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="flex flex-col items-center py-8">
                {importResult.success > 0 ? (
                  <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-600 mb-4" />
                )}
                <h3 className="text-lg font-semibold">
                  {importResult.success > 0 ? "Importação Concluída!" : "Falha na Importação"}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{importResult.success}</p>
                  <p className="text-sm text-green-600">Importados com sucesso</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{importResult.failed}</p>
                  <p className="text-sm text-red-600">Com erro</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-700 mb-2">Erros encontrados:</p>
                  <ul className="text-sm text-gray-600 space-y-1 max-h-40 overflow-auto">
                    {importResult.errors.slice(0, 10).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="text-gray-400">
                        ... e mais {importResult.errors.length - 10} erros
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
              <Button onClick={() => setStep("upload")} disabled={!selectedSchoolId}>
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
                disabled={!canImport}
              >
                Importar {importableCount} candidato(s)
              </Button>
            </>
          )}

          {step === "complete" && <Button onClick={handleClose}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
