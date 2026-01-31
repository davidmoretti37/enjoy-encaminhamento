import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  Settings,
  User,
  Mail,
  Building,
  FileText,
  Upload,
  PenLine,
  Trash2,
  FileCheck,
  Loader2,
  Eye,
  LogOut,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

export default function SettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [isSavingHtml, setIsSavingHtml] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect role
  const isAffiliate = user?.role === "admin";
  const isAgency = user?.role === "agency";

  // Get agency contract
  const { data: contract, refetch: refetchContract, isLoading: contractLoading } = trpc.agency.getContract.useQuery(
    undefined,
    { enabled: isAffiliate || isAgency }
  );

  // Upload PDF mutation
  const uploadMutation = trpc.agency.uploadContractPdf.useMutation({
    onSuccess: () => {
      toast.success("Contrato PDF enviado com sucesso!");
      refetchContract();
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
      setIsUploading(false);
    },
  });

  // Save HTML mutation
  const saveHtmlMutation = trpc.agency.saveContractHtml.useMutation({
    onSuccess: () => {
      toast.success("Contrato salvo com sucesso!");
      refetchContract();
      setIsSavingHtml(false);
      setShowEditorModal(false);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
      setIsSavingHtml(false);
    },
  });

  // Delete contract mutation
  const deleteMutation = trpc.agency.deleteContract.useMutation({
    onSuccess: () => {
      toast.success("Contrato removido!");
      refetchContract();
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
      setIsDeleting(false);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || !user.role || !["admin", "agency"].includes(user.role)) {
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Por favor, selecione um arquivo PDF");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Maximo: 10MB");
      return;
    }

    setIsUploading(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      uploadMutation.mutate({
        fileBase64: base64.split(",")[1], // Remove data:application/pdf;base64, prefix
        fileName: file.name,
      });
    };
    reader.onerror = () => {
      toast.error("Erro ao ler arquivo");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveHtml = () => {
    if (!editorContent.trim()) {
      toast.error("O contrato não pode estar vazio");
      return;
    }
    setIsSavingHtml(true);
    saveHtmlMutation.mutate({ html: editorContent });
  };

  const handleDelete = () => {
    setIsDeleting(true);
    deleteMutation.mutate();
  };

  const openEditor = () => {
    // Pre-fill with existing HTML content if available
    if (contract?.type === "html" && contract.html) {
      setEditorContent(contract.html);
    } else {
      setEditorContent("");
    }
    setShowEditorModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
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

        {/* Contract Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contrato
            </CardTitle>
            <CardDescription>
              Configure o contrato que sera enviado para empresas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contractLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : contract ? (
              // Contract exists
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">
                        Contrato Configurado
                      </p>
                      <p className="text-sm text-green-600">
                        Tipo: {contract.type === "pdf" ? "PDF" : "Texto formatado"}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreviewModal(true)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar
                  </Button>
                  {contract.type === "html" && (
                    <Button
                      variant="outline"
                      onClick={openEditor}
                      className="gap-2"
                    >
                      <PenLine className="h-4 w-4" />
                      Editar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </div>
              </div>
            ) : (
              // No contract
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        Nenhum Contrato Configurado
                      </p>
                      <p className="text-sm text-yellow-600">
                        Configure um contrato para poder enviar para empresas
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Enviar PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={openEditor}
                    className="gap-2"
                  >
                    <PenLine className="h-4 w-4" />
                    Criar Contrato
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Contrato?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O contrato será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rich Text Editor Modal */}
        <Dialog open={showEditorModal} onOpenChange={setShowEditorModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Contrato</DialogTitle>
              <DialogDescription>
                Escreva o texto do contrato. Use a formatação para estruturar o documento.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-[400px] border rounded-md">
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Digite o texto do contrato aqui..."
                className="w-full h-[400px] p-4 resize-none focus:outline-none rounded-md"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditorModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveHtml} disabled={isSavingHtml}>
                {isSavingHtml ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Salvar Contrato
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualizar Contrato</DialogTitle>
            </DialogHeader>
            <div className="min-h-[400px] border rounded-md p-4 bg-white">
              {contract?.type === "pdf" ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4" />
                  <p>Visualizacao de PDF sera implementada em breve</p>
                  {contract.pdfUrl && (
                    <a
                      href={contract.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 text-blue-600 hover:underline"
                    >
                      Abrir PDF em nova aba
                    </a>
                  )}
                </div>
              ) : contract?.type === "html" ? (
                <div
                  className="prose max-w-none whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: contract.html || "" }}
                />
              ) : (
                <p className="text-muted-foreground">Nenhum contrato para visualizar</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
