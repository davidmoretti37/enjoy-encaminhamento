/**
 * Import Companies Modal
 *
 * Allows affiliates and schools to import companies from Excel/CSV files
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
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  parseExcelFile,
  getValidationSummary,
  getDocumentTypeLabel,
  type ParsedCompany,
  type ParsedEmail,
} from "@/lib/excelParser";
import { useAuth } from "@/_core/hooks/useAuth";

interface ImportCompaniesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ImportStep = "select-school" | "upload" | "preview" | "importing" | "complete";

export default function ImportCompaniesModal({
  open,
  onClose,
  onSuccess,
}: ImportCompaniesModalProps) {
  const { user } = useAuth();
  const isSchoolUser = user?.role === 'school';

  // For school users, skip school selection and go directly to upload
  const initialStep = isSchoolUser ? "upload" : "select-school";

  const [step, setStep] = useState<ImportStep>(initialStep);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [companies, setCompanies] = useState<ParsedCompany[]>([]);
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
    enabled: !isSchoolUser,
  });

  // Bulk import mutation for affiliates
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

  // Bulk import mutation for schools
  const schoolImportMutation = trpc.school.bulkImportCompanies.useMutation({
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
      const parsed = await parseExcelFile(file);
      if (parsed.length === 0) {
        toast.error("O arquivo não contém dados válidos");
        return;
      }
      setCompanies(parsed);
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
    setCompanies((prev) => prev.filter((c) => c._rowNumber !== rowNumber));
  };

  const handleImport = () => {
    const validCompanies = companies.filter((c) => c._isValid);
    if (validCompanies.length === 0) {
      toast.error("Nenhuma empresa válida para importar");
      return;
    }

    setStep("importing");

    // Prepare data for import (remove validation fields)
    const companiesToImport = validCompanies.map((c) => ({
      company_name: c.company_name,
      email: c.email,
      emails: c.emails, // Pass all parsed emails
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
      // Job data (if present in Excel)
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

    if (isSchoolUser) {
      // School users don't need to select a school
      schoolImportMutation.mutate({
        companies: companiesToImport,
      });
    } else {
      // Affiliates need to specify the school
      affiliateImportMutation.mutate({
        schoolId: selectedSchoolId,
        companies: companiesToImport,
      });
    }
  };

  const handleClose = () => {
    setStep(isSchoolUser ? "upload" : "select-school");
    setSelectedSchoolId("");
    setCompanies([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const validation = getValidationSummary(companies);

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[95vw] !w-[1400px] !max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Empresas
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Step 1: Select School */}
          {step === "select-school" && (
            <div className="space-y-4 max-w-md mx-auto">
              <p className="text-sm text-gray-600">
                Selecione a escola para qual as empresas serão importadas:
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

          {/* Step 2: Upload File */}
          {step === "upload" && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <p className="text-sm text-gray-600">
                Selecione um arquivo Excel (.xlsx, .xls) ou CSV com os dados das
                empresas.
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
                  Colunas reconhecidas:
                </p>
                <div className="grid grid-cols-3 gap-1 text-blue-800 text-xs">
                  <span>• Nome / Empresa / Razão Social</span>
                  <span>• Email / E-mail</span>
                  <span>• CNPJ / CPF</span>
                  <span>• Telefone / Phone</span>
                  <span>• Endereço / Address</span>
                  <span>• Cidade / City</span>
                  <span>• Estado / UF</span>
                  <span>• CEP / Zip</span>
                  <span>• Setor / Industry</span>
                  <span>• Tamanho / Size</span>
                  <span>• Website / Site</span>
                  <span>• Descrição / Notas</span>
                </div>
                <p className="font-medium text-blue-900 mb-2 mt-3">
                  Colunas de vaga (opcional):
                </p>
                <div className="grid grid-cols-3 gap-1 text-blue-800 text-xs">
                  <span>• Título / Cargo / Vaga</span>
                  <span>• Salário / Remuneração / Bolsa</span>
                  <span>• Horário / Jornada</span>
                  <span>• Benefícios</span>
                  <span>• Tipo de Contrato / Vínculo</span>
                  <span>• Modalidade / Local de Trabalho</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary */}
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
                      <strong>{validation.withWarnings}</strong> com avisos (serão importadas)
                    </span>
                  </div>
                )}
                {validation.invalid > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">
                      <strong>{validation.invalid}</strong> com erros (não serão importadas)
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-500 ml-auto">
                  Total: {validation.total} empresas
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
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Email</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">CNPJ/CPF</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Telefone</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Cidade</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Estado</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Endereço</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">CEP</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Setor</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Tamanho</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Website</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Vaga</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
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
                        <td className="px-2 py-2 text-gray-500">
                          {company._rowNumber}
                        </td>
                        <td className="px-2 py-2">
                          {!company._isValid ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <p className="font-medium mb-1">Erros:</p>
                                <ul className="space-y-0.5">
                                  {company._errors.map((error, i) => (
                                    <li key={i} className="text-red-200">• {error}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          ) : company._warnings.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </div>
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
                        <td className="px-2 py-2 font-medium">
                          {company.company_name || <span className="text-red-500">-</span>}
                        </td>
                        <td className="px-2 py-2">
                          {company.emails && company.emails.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {company.emails.map((e, idx) => (
                                <span key={idx} className={idx === 0 ? "font-medium" : "text-gray-500 text-xs"}>
                                  {e.email}
                                </span>
                              ))}
                            </div>
                          ) : company.email ? (
                            company.email
                          ) : (
                            <span className="text-red-500">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {renderCellWithWarning(company.cnpj, 'cnpj', company._warnings)}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {renderCellWithWarning(company.phone, 'telefone', company._warnings)}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {renderCellWithWarning(company.city, 'cidade', company._warnings)}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {company.state || "-"}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          <span className="truncate max-w-[150px] block">{company.address || "-"}</span>
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {company.zip_code || "-"}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {company.industry || "-"}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {company.company_size || "-"}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          <span className="truncate max-w-[100px] block">{company.website || "-"}</span>
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {company.job_title ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate max-w-[150px] block cursor-help text-blue-600">
                                  {company.job_title}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <p className="font-medium">{company.job_title}</p>
                                {company.job_salary && <p className="text-xs">Salário: {company.job_salary}</p>}
                                {company.job_schedule && <p className="text-xs">Horário: {company.job_schedule}</p>}
                                {company.job_contract_type && <p className="text-xs">Tipo: {company.job_contract_type}</p>}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            "-"
                          )}
                        </td>
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
                    ))}
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
                    Empresas importadas com sucesso
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {importResult.failed}
                  </p>
                  <p className="text-sm text-red-600">Empresas com erro</p>
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
