/**
 * Import Companies Modal - Fully Automatic
 *
 * Flow: Select Agency → Upload → Preview → Import
 * No manual column mapping required
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  parseExcelFile,
  getValidationSummary,
  type ParsedCompany,
  type ParseResult,
} from "@/lib/excelParser";
import { useAuth } from "@/_core/hooks/useAuth";

interface ImportCompaniesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ImportStep = "select-agency" | "upload" | "preview" | "importing" | "complete";

export default function ImportCompaniesModal({
  open,
  onClose,
  onSuccess,
}: ImportCompaniesModalProps) {
  const { user } = useAuth();
  const isAgencyUser = user?.role === 'agency';

  const initialStep = isAgencyUser ? "upload" : "select-agency";

  const [step, setStep] = useState<ImportStep>(initialStep);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companies, setCompanies] = useState<ParsedCompany[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    if (open) {
      setStep(isAgencyUser ? "upload" : "select-agency");
      setCompanies([]);
      setHeaders([]);
      setRawRows([]);
      setImportResult(null);
    }
  }, [open, isAgencyUser]);

  const { data: agencies } = trpc.agency.getAll.useQuery(undefined, {
    enabled: !isAgencyUser,
  });

  const affiliateImportMutation = trpc.affiliate.bulkImportCompanies.useMutation({
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

  const agencyImportMutation = trpc.agency.bulkImportCompanies.useMutation({
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
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      toast.error("Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV");
      return;
    }

    try {
      const result = await parseExcelFile(file);
      if (result.companies.length === 0) {
        toast.error("O arquivo não contém dados válidos");
        return;
      }
      setCompanies(result.companies);
      setHeaders(result.headers);
      setRawRows(result.rawRows);
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
    const index = companies.findIndex((c) => c._rowNumber === rowNumber);
    if (index !== -1) {
      setCompanies((prev) => prev.filter((c) => c._rowNumber !== rowNumber));
      setRawRows((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleImport = () => {
    const validCompanies = companies.filter((c) => c._isValid);
    if (validCompanies.length === 0) {
      toast.error("Nenhuma empresa válida para importar");
      return;
    }

    setStep("importing");

    const companiesToImport = validCompanies.map((c) => ({
      company_name: c.company_name,
      email: c.email,
      emails: c.emails,
      cnpj: c.cnpj || undefined,
      phone: c.phone || undefined,
      address: c.address || undefined,
      city: c.city || undefined,
      state: c.state || undefined,
      zip_code: c.zip_code || undefined,
      industry: c.industry || undefined,
      company_size: c.company_size || undefined,
      website: c.website || undefined,
      description: c.description || undefined,
      notes: c.notes || undefined,
      job: c.job_title ? {
        title: c.job_title,
        description: c.job_description,
        salary: c.job_salary,
        schedule: c.job_schedule,
        benefits: c.job_benefits,
        contract_type: c.job_contract_type,
        work_type: c.job_work_type,
        required_skills: c.job_required_skills,
        openings: c.job_openings,
        urgency: c.job_urgency,
        gender_preference: c.job_gender_preference,
        age_range: c.job_age_range,
        education: c.job_education,
        notes: c.job_notes,
      } : undefined,
    }));

    if (isAgencyUser) {
      agencyImportMutation.mutate({ companies: companiesToImport });
    } else {
      affiliateImportMutation.mutate({
        agencyId: selectedAgencyId,
        companies: companiesToImport,
      });
    }
  };

  const handleClose = () => {
    setStep(isAgencyUser ? "upload" : "select-agency");
    setSelectedAgencyId("");
    setCompanies([]);
    setHeaders([]);
    setRawRows([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const validation = getValidationSummary(companies);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[95vw] !w-[1200px] !max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Empresas
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Step 1: Select Agency */}
          {step === "select-agency" && (
            <div className="space-y-4 max-w-md mx-auto">
              <p className="text-sm text-gray-600">
                Selecione a agência para qual as empresas serão importadas:
              </p>
              <Select
                value={selectedAgencyId}
                onValueChange={setSelectedAgencyId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma agência" />
                </SelectTrigger>
                <SelectContent>
                  {agencies?.map((agency: { id: string; agency_name: string }) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.agency_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 2: Upload File */}
          {step === "upload" && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <p className="text-sm text-gray-600">
                Selecione um arquivo Excel (.xlsx, .xls) ou CSV com os dados das empresas.
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
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
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
                  Colunas reconhecidas automaticamente:
                </p>
                <div className="grid grid-cols-3 gap-1 text-blue-800 text-xs">
                  <span>• Nome Fantasia / Razão Social</span>
                  <span>• Email</span>
                  <span>• CNPJ / CPF</span>
                  <span>• Telefone / Celular</span>
                  <span>• Endereço / Bairro</span>
                  <span>• Cidade / Estado / CEP</span>
                  <span>• Website / Redes Sociais</span>
                  <span>• Título da Vaga / Cargo</span>
                  <span>• Salário / Remuneração</span>
                  <span>• Benefícios</span>
                  <span>• Tipo de Contrato</span>
                  <span>• Horário / Jornada</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    <strong>{validation.valid}</strong> prontas para importar
                  </span>
                </div>
                {validation.withWarnings > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">
                      <strong>{validation.withWarnings}</strong> com avisos
                    </span>
                  </div>
                )}
                {validation.invalid > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">
                      <strong>{validation.invalid}</strong> com erros
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-500 ml-auto">
                  Total: {validation.total} empresas
                </span>
              </div>

              <div className="border rounded-lg overflow-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">#</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Status</th>
                      {headers.map((header) => (
                        <th key={header} className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap max-w-[200px]">
                          <span className="block truncate" title={header}>{header}</span>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company, index) => {
                      const rawRow = rawRows[index] || {};
                      return (
                        <tr
                          key={company._rowNumber}
                          className={
                            !company._isValid
                              ? "bg-red-50 hover:bg-red-100"
                              : company._warnings.length > 0
                              ? "bg-amber-50/50 hover:bg-amber-50"
                              : "hover:bg-gray-50"
                          }
                        >
                          <td className="px-2 py-2 text-gray-500">{company._rowNumber}</td>
                          <td className="px-2 py-2">
                            {!company._isValid ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <XCircle className="h-4 w-4 text-red-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[300px]">
                                  <p className="font-medium mb-1">Erros:</p>
                                  <ul className="space-y-0.5">
                                    {company._errors.map((error, i) => (
                                      <li key={i}>• {error}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            ) : company._warnings.length > 0 ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-4 w-4 text-amber-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[300px]">
                                  <p className="font-medium mb-1">Avisos:</p>
                                  <ul className="space-y-0.5">
                                    {company._warnings.map((warning, i) => (
                                      <li key={i}>• {warning}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </td>
                          {headers.map((header) => {
                            const value = rawRow[header] || '';
                            const displayValue = String(value).trim();
                            return (
                              <td key={header} className="px-2 py-2 text-gray-600 max-w-[200px]">
                                {displayValue ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block truncate cursor-help" title={displayValue}>
                                        {displayValue}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[400px]">
                                      <p className="whitespace-pre-wrap break-words">{displayValue}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRow(company._rowNumber)}
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {validation.invalid > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">
                      {validation.invalid} empresa(s) não serão importadas
                    </p>
                    <p className="text-red-700 text-xs mt-1">
                      Empresas sem nome ou email válido não podem ser importadas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-gray-600">Importando empresas...</p>
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
                  <p className="text-2xl font-bold text-green-700">
                    {importResult.success}
                  </p>
                  <p className="text-sm text-green-600">Importadas</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {importResult.failed}
                  </p>
                  <p className="text-sm text-red-600">Com erro</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-700 mb-2">Erros:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {importResult.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li className="text-gray-400">
                        ... e mais {importResult.errors.length - 5}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "select-agency" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={() => setStep("upload")} disabled={!selectedAgencyId}>
                Continuar
              </Button>
            </>
          )}

          {step === "upload" && (
            <>
              {!isAgencyUser && (
                <Button variant="outline" onClick={() => setStep("select-agency")}>
                  Voltar
                </Button>
              )}
              {isAgencyUser && (
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
              <Button onClick={handleImport} disabled={validation.valid === 0}>
                Importar {validation.valid} empresa(s)
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
