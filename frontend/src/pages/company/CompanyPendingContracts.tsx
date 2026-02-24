// @ts-nocheck
// Blocking page: company must sign agency's contrato_inicial templates before accessing dashboard
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import DocumentSigningFlow from "@/components/DocumentSigningFlow";
import { FormSkeleton } from "@/components/ui/skeletons";

export default function CompanyPendingContracts() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [allDocsSigned, setAllDocsSigned] = useState(false);
  const [completing, setCompleting] = useState(false);

  const onboardingQuery = trpc.company.checkOnboarding.useQuery(undefined, {
    enabled: !!user,
  });

  const prepareAutentiqueDocs = trpc.contract.prepareAutentiqueDocuments.useMutation({
    onSuccess: () => {
      utils.contract.getDocumentsToSign.invalidate({ category: "contrato_inicial" });
    },
  });

  const markComplete = trpc.company.markContractSigningComplete.useMutation();
  const utils = trpc.useUtils();

  // Prepare Autentique documents on mount
  useEffect(() => {
    if (!onboardingQuery.data?.company || !onboardingQuery.data?.pendingContractSigning) return;

    const company = onboardingQuery.data.company;
    prepareAutentiqueDocs.mutate({
      category: "contrato_inicial",
      companyData: {
        legalName: company.company_name || undefined,
        businessName: company.business_name || undefined,
        cnpj: company.cnpj || undefined,
        contactPerson: company.contact_name || undefined,
        phone: company.phone || undefined,
        email: company.company_email || undefined,
        address: company.address || undefined,
        city: company.city || undefined,
        state: company.state || undefined,
        cep: company.cep || undefined,
        neighborhood: company.neighborhood || undefined,
        complement: company.complement || undefined,
      },
    });
  }, [onboardingQuery.data?.company?.id]);

  // If not pending, redirect to portal
  useEffect(() => {
    if (onboardingQuery.data && !onboardingQuery.data.pendingContractSigning) {
      setLocation("/company/portal");
    }
  }, [onboardingQuery.data]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await markComplete.mutateAsync();
      toast.success("Documentos assinados com sucesso!");
      // Small delay to allow the query to update
      setTimeout(() => {
        window.location.href = "/company/portal";
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Erro ao finalizar assinatura");
      setCompleting(false);
    }
  };

  if (authLoading || onboardingQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#0A2342] flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos de Parceria</h1>
          <p className="text-gray-500 mt-1">
            Assine os documentos abaixo para acessar sua conta
          </p>
        </div>

        {/* Signing Flow */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardContent className="p-8 space-y-6">
            {prepareAutentiqueDocs.isPending ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <FormSkeleton fields={6} />
                <p className="text-sm text-muted-foreground">Preparando documentos para assinatura...</p>
              </div>
            ) : (
              <DocumentSigningFlow
                category="contrato_inicial"
                onAllSigned={() => setAllDocsSigned(true)}
              />
            )}

            {allDocsSigned && (
              <div className="flex justify-center pt-6 border-t">
                <Button
                  onClick={handleComplete}
                  disabled={completing}
                  size="lg"
                  className="px-8 bg-green-600 hover:bg-green-700"
                >
                  {completing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Acessar Minha Conta
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
