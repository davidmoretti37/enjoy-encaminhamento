// @ts-nocheck
// Reusable document signing flow component
// Shows PDF pages rendered inline with signature overlay on last page
import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eraser,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentSigningFlowProps {
  category: "contrato_inicial" | "clt" | "estagio" | "menor_aprendiz";
  contractId?: string;
  candidateId?: string;
  onAllSigned?: () => void;
}

const categoryLabels: Record<string, string> = {
  contrato_inicial: "Contrato Inicial",
  clt: "Documentos CLT",
  estagio: "Documentos Estágio",
  menor_aprendiz: "Documentos Jovem Aprendiz",
};

function PdfWithSignature({
  fileUrl,
  sigPadRef,
}: {
  fileUrl: string;
  sigPadRef: React.MutableRefObject<SignatureCanvas | null>;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      containerRef.current = node;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      observer.observe(node);
      setContainerWidth(node.clientWidth);
    }
  }, []);

  return (
    <div ref={measuredRef} className="border rounded-lg overflow-hidden bg-gray-100">
      <div className="max-h-[600px] overflow-y-auto">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
          error={
            <div className="text-center py-16 text-muted-foreground text-sm">
              Erro ao carregar o documento.
            </div>
          }
        >
          {numPages &&
            Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="relative">
                <Page
                  pageNumber={i + 1}
                  width={containerWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
                {/* Signature overlay on the last page */}
                {i === numPages - 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[280px]">
                    <div className="bg-white/90 backdrop-blur-sm border-2 border-dashed border-gray-400 rounded-lg p-2">
                      <p className="text-[10px] text-gray-500 text-center mb-1">Assine aqui</p>
                      <div className="relative bg-white rounded border border-gray-300">
                        <SignatureCanvas
                          ref={sigPadRef}
                          canvasProps={{
                            className: "w-full",
                            style: { width: "100%", height: "80px" },
                          }}
                          penColor="black"
                        />
                        <button
                          type="button"
                          className="absolute top-0.5 right-0.5 p-0.5 rounded hover:bg-gray-100"
                          onClick={() => sigPadRef.current?.clear()}
                        >
                          <Eraser className="h-3 w-3 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </Document>
      </div>
    </div>
  );
}

export default function DocumentSigningFlow({
  category,
  contractId,
  candidateId,
  onAllSigned,
}: DocumentSigningFlowProps) {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const sigPadRef = useRef<SignatureCanvas | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.contract.getDocumentsToSign.useQuery({
    category,
    contractId,
    candidateId,
  });

  // Call onAllSigned when initial data loads with everything already signed
  useEffect(() => {
    if (data?.allSigned && onAllSigned) {
      onAllSigned();
    }
  }, [data?.allSigned, onAllSigned]);

  const signMutation = trpc.contract.signDocument.useMutation({
    onSuccess: (result) => {
      toast.success("Documento assinado com sucesso!");
      setExpandedDoc(null);
      setSignerName("");
      setSignerCpf("");
      setAcceptedTerms(false);
      sigPadRef.current?.clear();
      utils.contract.getDocumentsToSign.invalidate({ category, contractId, candidateId });

      if (result.allSigned && onAllSigned) {
        onAllSigned();
      }
    },
    onError: (error) => {
      toast.error("Erro ao assinar: " + error.message);
    },
  });

  const handleSign = (templateId: string) => {
    if (!signerName.trim()) {
      toast.error("Preencha o nome do assinante");
      return;
    }
    if (!signerCpf.trim() || signerCpf.replace(/\D/g, "").length < 11) {
      toast.error("Preencha o CPF corretamente");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Aceite os termos para continuar");
      return;
    }
    if (sigPadRef.current?.isEmpty()) {
      toast.error("Assine o documento");
      return;
    }

    const signature = sigPadRef.current?.toDataURL("image/png") || "";

    signMutation.mutate({
      templateId,
      signerName: signerName.trim(),
      signerCpf: signerCpf.replace(/\D/g, ""),
      signature,
      contractId,
      candidateId,
    });
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>Nenhum documento necessário para esta categoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <span className="text-sm font-medium">{categoryLabels[category]}</span>
        <Badge variant={data.allSigned ? "default" : "secondary"}>
          {data.signedCount} de {data.total} assinado(s)
        </Badge>
      </div>

      {/* Document List */}
      {data.templates.map((template: any) => {
        const hasAutentique = !!template.autentiqueSignUrl;
        const autentiqueStatus = template.autentiqueStatus;

        return (
          <Card key={template.id} className={template.isSigned ? "border-green-200 bg-green-50/30" : ""}>
            <CardHeader
              className={!template.isSigned && !hasAutentique ? "cursor-pointer py-3" : "py-3"}
              onClick={() => {
                if (!template.isSigned && !hasAutentique) {
                  setExpandedDoc(expandedDoc === template.id ? null : template.id);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {template.isSigned ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : hasAutentique ? (
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                  <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {template.isSigned ? (
                    <Badge className="bg-green-100 text-green-700">Assinado</Badge>
                  ) : autentiqueStatus === "processing" ? (
                    <Badge variant="secondary">Processando</Badge>
                  ) : hasAutentique ? (
                    <Badge variant="outline" className="border-blue-300 text-blue-700">Pendente (Autentique)</Badge>
                  ) : (
                    <>
                      <Badge variant="outline">Pendente</Badge>
                      {expandedDoc === template.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Autentique signing action */}
            {hasAutentique && !template.isSigned && (
              <CardContent className="border-t pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  A assinatura deste documento será realizada pela plataforma Autentique com validade jurídica.
                </p>
                <Button
                  className="w-full"
                  onClick={() => window.open(template.autentiqueSignUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Assinar na Autentique
                </Button>
              </CardContent>
            )}

            {/* Legacy expanded signing form */}
            {!hasAutentique && expandedDoc === template.id && !template.isSigned && (
              <CardContent className="space-y-4 border-t pt-4">
                {/* PDF pages with signature overlay on last page */}
                <PdfWithSignature
                  fileUrl={template.file_url}
                  sigPadRef={sigPadRef}
                />

                {/* Signer info + submit */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome Completo do Assinante</Label>
                      <Input
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div>
                      <Label>CPF do Assinante</Label>
                      <Input
                        value={signerCpf}
                        onChange={(e) => setSignerCpf(formatCpf(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`terms-${template.id}`}
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                    />
                    <label htmlFor={`terms-${template.id}`} className="text-sm">
                      Li e concordo com os termos deste documento
                    </label>
                  </div>

                  <Button
                    onClick={() => handleSign(template.id)}
                    disabled={signMutation.isPending}
                    className="w-full"
                  >
                    {signMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Assinar Documento
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {data.allSigned && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Todos os documentos foram assinados!</span>
        </div>
      )}
    </div>
  );
}
