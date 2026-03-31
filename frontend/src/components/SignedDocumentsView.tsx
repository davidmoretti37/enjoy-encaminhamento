// Displays signed documents for a company (used by both agency and company views)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignedDocumentsViewProps {
  companyId?: string;
  contractId?: string;
  category?: string;
}

const categoryLabels: Record<string, string> = {
  contrato_inicial: "Contrato Inicial",
  clt: "CLT",
  estagio: "Estágio",
  menor_aprendiz: "Jovem Aprendiz",
};

export default function SignedDocumentsView({
  companyId,
  contractId,
  category,
}: SignedDocumentsViewProps) {
  const { data: signedDocs, isLoading } = trpc.contract.getSignedDocuments.useQuery({
    companyId,
    contractId,
    category,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!signedDocs || signedDocs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum documento assinado</p>
      </div>
    );
  }

  // Group by category
  const grouped: Record<string, any[]> = {};
  signedDocs.forEach((doc: any) => {
    const cat = doc.category || "outro";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(doc);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, docs]) => (
        <div key={cat}>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            {categoryLabels[cat] || cat}
          </h4>
          <div className="space-y-2">
            {docs.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-white border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {doc.template?.name || "Documento"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Assinado por {doc.signer_name} ({doc.signer_cpf}) em{" "}
                      {new Date(doc.signed_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700">Assinado</Badge>
                  {(doc.signed_pdf_url || doc.template?.file_url) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.signed_pdf_url || doc.template.file_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
