import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  User,
  Mail,
  Building,
  FileText,
  Trash2,
  Loader2,
  LogOut,
  Plus,
  ExternalLink,
  FolderOpen,
  CreditCard,
  Save,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useAgencyContext } from "@/contexts/AgencyContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CATEGORIES = [
  { key: "contrato_inicial", label: "Contrato Inicial", description: "Documentos assinados pela empresa durante o onboarding" },
  { key: "clt", label: "CLT", description: "Documentos para contratação CLT" },
  { key: "estagio", label: "Estágio", description: "Documentos para contratação de estagiários" },
  { key: "menor_aprendiz", label: "Jovem Aprendiz", description: "Documentos para contratação de jovens aprendizes" },
] as const;

export default function SettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docDeleting, setDocDeleting] = useState<string | null>(null);
  const [docDeleteConfirm, setDocDeleteConfirm] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cnpj");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [paymentInfoLoaded, setPaymentInfoLoaded] = useState(false);
  const [savingPaymentInfo, setSavingPaymentInfo] = useState(false);

  // Detect role
  const isAffiliate = user?.role === "admin";
  const isAgency = user?.role === "agency";
  const { currentAgency, isAllAgenciesMode } = useAgencyContext();

  // For admins, only fetch when an agency is selected
  const canManageDocs = isAgency || (isAffiliate && !isAllAgenciesMode);

  // Document template queries and mutations
  const { data: docTemplates, refetch: refetchDocTemplates, isLoading: docTemplatesLoading } =
    trpc.agency.getDocumentTemplates.useQuery(
      {},
      { enabled: canManageDocs }
    );

  const uploadDocMutation = trpc.agency.uploadDocumentTemplate.useMutation({
    onSuccess: () => {
      toast.success("Documento adicionado com sucesso!");
      refetchDocTemplates();
      setDocUploading(false);
      setDocName("");
      setUploadCategory(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar: ${error.message}`);
      setDocUploading(false);
    },
  });

  const deleteDocMutation = trpc.agency.deleteDocumentTemplate.useMutation({
    onSuccess: () => {
      toast.success("Documento removido!");
      refetchDocTemplates();
      setDocDeleting(null);
      setDocDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
      setDocDeleting(null);
    },
  });

  // Agency profile (for payment info)
  const agencyProfileQuery = trpc.agency.getProfile.useQuery(undefined, {
    enabled: canManageDocs,
    onSuccess: (data: any) => {
      if (!paymentInfoLoaded && data) {
        setPixKey(data.pix_key || "");
        setPixKeyType(data.pix_key_type || "cnpj");
        setPaymentInstructions(data.payment_instructions || "");
        setPaymentInfoLoaded(true);
      }
    },
  });

  const utils = trpc.useUtils();

  const updateProfileMutation = trpc.agency.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Informacoes de pagamento salvas!");
      setSavingPaymentInfo(false);
      utils.agency.getProfile.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar: ${error.message}`);
      setSavingPaymentInfo(false);
    },
  });

  const handleSavePaymentInfo = () => {
    setSavingPaymentInfo(true);
    updateProfileMutation.mutate({
      pix_key: pixKey || undefined,
      pix_key_type: (pixKeyType as any) || undefined,
      payment_instructions: paymentInstructions || undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || !user.role || !["super_admin", "admin", "agency"].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleDocFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadCategory) return;

    if (file.type !== "application/pdf") {
      toast.error("Por favor, selecione um arquivo PDF");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }

    setDocUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      uploadDocMutation.mutate({
        category: uploadCategory as any,
        name: docName.trim() || file.name.replace(/\.pdf$/i, ""),
        fileBase64: base64.split(",")[1],
        fileName: file.name,
      });
    };
    reader.onerror = () => {
      toast.error("Erro ao ler arquivo");
      setDocUploading(false);
    };
    reader.readAsDataURL(file);

    if (docFileInputRef.current) {
      docFileInputRef.current.value = "";
    }
  };

  const triggerUpload = (category: string) => {
    setUploadCategory(category);
    // Small delay to ensure state is set before file dialog opens
    setTimeout(() => docFileInputRef.current?.click(), 0);
  };

  const getTemplatesForCategory = (category: string) => {
    if (!docTemplates) return [];
    return docTemplates.filter((t: any) => t.category === category);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Hidden file input shared across categories */}
        <input
          type="file"
          accept=".pdf"
          ref={docFileInputRef}
          onChange={handleDocFileSelect}
          className="hidden"
        />

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie seu perfil e configurações
          </p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil
            </CardTitle>
            <CardDescription>Informações da sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium">{user.name || "Usuario"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <Badge variant="outline">
                {isAffiliate ? "Afiliado" : "Escola"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Document Templates Section — List View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Documentos
            </CardTitle>
            <CardDescription>
              {isAffiliate && currentAgency
                ? `Documentos da agência: ${currentAgency.name}`
                : "Gerencie os documentos que as empresas devem assinar em cada etapa"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isAffiliate && isAllAgenciesMode ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Selecione uma agência para gerenciar documentos</p>
              </div>
            ) : docTemplatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              CATEGORIES.map((cat, index) => {
                const templates = getTemplatesForCategory(cat.key);
                return (
                  <div key={cat.key}>
                    {index > 0 && <Separator className="mb-6" />}

                    {/* Category header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold">{cat.label}</h3>
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {templates.length} {templates.length === 1 ? "documento" : "documentos"}
                      </Badge>
                    </div>

                    {/* Document list */}
                    {templates.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {templates.map((template: any) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between p-3 bg-white border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium">{template.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(template.created_at).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(template.file_url, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDocDeleteConfirm(template.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload row */}
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Nome do documento (opcional)"
                          value={uploadCategory === cat.key ? docName : ""}
                          onFocus={() => setUploadCategory(cat.key)}
                          onChange={(e) => {
                            setUploadCategory(cat.key);
                            setDocName(e.target.value);
                          }}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerUpload(cat.key)}
                        disabled={docUploading && uploadCategory === cat.key}
                        className="gap-2 shrink-0"
                      >
                        {docUploading && uploadCategory === cat.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Adicionar PDF
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Payment Info Section */}
        {canManageDocs && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Informacoes de Pagamento
              </CardTitle>
              <CardDescription>
                Configure os dados de pagamento que serao exibidos para as empresas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Chave PIX</label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="cnpj">CNPJ</option>
                    <option value="cpf">CPF</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Chave aleatoria</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Chave PIX</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder={pixKeyType === 'cnpj' ? '00.000.000/0001-00' : pixKeyType === 'cpf' ? '000.000.000-00' : pixKeyType === 'email' ? 'email@exemplo.com' : pixKeyType === 'phone' ? '(00) 00000-0000' : 'Chave aleatoria'}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Instrucoes de Pagamento (opcional)</label>
                <textarea
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="Ex: Realizar pagamento via PIX ate o dia do vencimento. Em caso de duvidas, entre em contato..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSavePaymentInfo}
                  disabled={savingPaymentInfo}
                  className="gap-2"
                >
                  {savingPaymentInfo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logout Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Sessão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </Button>
          </CardContent>
        </Card>

        {/* Document Template Delete Confirmation */}
        <AlertDialog open={!!docDeleteConfirm} onOpenChange={(open) => !open && setDocDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Documento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O documento será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!docDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (docDeleteConfirm) {
                    setDocDeleting(docDeleteConfirm);
                    deleteDocMutation.mutate({ templateId: docDeleteConfirm });
                  }
                }}
                disabled={!!docDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {docDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
