import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, ExternalLink, User, Pencil, Check, X } from "lucide-react";

/**
 * Documents belonging to the people a company has hired.
 *
 * This panel used to render `hiring_processes`, which is empty for every company
 * in production because the operator does not create them. The upload button next
 * to it wrote through outreach.uploadSignedContract, filing the document as a
 * COMPANY service-contract file. Net effect: upload succeeded, a success toast
 * appeared, and nothing showed up here. She re-uploaded the same TCE three times.
 *
 * It now reads and writes the company's own document list, grouped by person and
 * tagged by type, and never needs a hiring process to exist.
 */

const CATEGORIES: Array<{ value: string; label: string; perEmployee: boolean }> = [
  { value: "contrato_estagio", label: "Contrato de estágio (TCE)", perEmployee: true },
  { value: "termo", label: "Termo", perEmployee: true },
  { value: "seguro", label: "Apólice / certificado de seguro", perEmployee: true },
  { value: "encaminhamento", label: "Carta de encaminhamento", perEmployee: true },
  { value: "atestado", label: "Atestado", perEmployee: true },
  { value: "taxa", label: "Taxa / cobrança", perEmployee: true },
  { value: "contrato_empresa", label: "Contrato com a empresa", perEmployee: false },
  { value: "outros", label: "Outros", perEmployee: true },
];

const labelFor = (c?: string | null) =>
  CATEGORIES.find((x) => x.value === c)?.label ?? "Outros";

const TONE: Record<string, string> = {
  contrato_estagio: "bg-emerald-100 text-emerald-800",
  termo: "bg-blue-100 text-blue-800",
  seguro: "bg-purple-100 text-purple-800",
  encaminhamento: "bg-amber-100 text-amber-800",
  atestado: "bg-rose-100 text-rose-800",
  taxa: "bg-slate-200 text-slate-800",
  outros: "bg-slate-100 text-slate-700",
};

type Doc = {
  url: string;
  key?: string;
  name?: string;
  category?: string;
  employee?: string | null;
  uploadedAt?: string;
};

export function EmployeeDocumentsPanel({ companyId }: { companyId: string }) {
  const utils = trpc.useUtils();
  const [category, setCategory] = useState("contrato_estagio");
  const [employee, setEmployee] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data, isLoading } = trpc.agency.listCompanyDocuments.useQuery(
    { companyId },
    { enabled: !!companyId },
  );

  const invalidate = () => utils.agency.listCompanyDocuments.invalidate({ companyId });

  const upload = trpc.agency.uploadCompanyDocument.useMutation({
    onSuccess: (r: any) => {
      toast.success(
        r?.file?.employee
          ? `Documento salvo para ${r.file.employee}.`
          : "Documento salvo.",
      );
      setBusy(false);
      invalidate();
    },
    onError: (e: any) => {
      toast.error(e.message || "Erro ao enviar documento");
      setBusy(false);
    },
  });

  const updateMeta = trpc.agency.updateCompanyDocumentMeta.useMutation({
    onSuccess: () => {
      toast.success("Documento atualizado.");
      setEditingKey(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });

  // Group by person. Company-level agreements are shown separately so they do
  // not masquerade as somebody's paperwork.
  const { byPerson, companyLevel } = useMemo(() => {
    const docs: Doc[] = data?.files ?? [];
    const groups = new Map<string, Doc[]>();
    const company: Doc[] = [];
    for (const d of docs) {
      if (d.category === "contrato_empresa") {
        company.push(d);
        continue;
      }
      const who = (d.employee || "").trim() || "Sem pessoa identificada";
      if (!groups.has(who)) groups.set(who, []);
      groups.get(who)!.push(d);
    }
    const sorted = [...groups.entries()].sort(([a], [b]) =>
      a === "Sem pessoa identificada" ? 1 : b === "Sem pessoa identificada" ? -1 : a.localeCompare(b),
    );
    return { byPerson: sorted, companyLevel: company };
  }, [data]);

  const handleFile = (file: File) => {
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      upload.mutate({
        companyId,
        fileName: file.name,
        fileData: base64,
        contentType: file.type || "application/pdf",
        category: category as any,
        employee: employee.trim() || null,
      });
    };
    reader.readAsDataURL(file);
  };

  const needsPerson = CATEGORIES.find((c) => c.value === category)?.perEmployee;

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
        <p className="text-xs font-medium text-slate-700">Adicionar documento</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-sm border rounded-md px-2 py-1.5 bg-white flex-1"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {needsPerson && (
            <Input
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              placeholder="Nome do jovem (ex: Maria Clara)"
              className="text-sm h-[34px] flex-1"
            />
          )}
        </div>
        <label
          className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-white text-sm transition-colors ${
            busy ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          {busy ? "Enviando..." : "Escolher arquivo"}
          <input
            type="file"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {needsPerson && !employee.trim() && (
          <p className="text-[11px] text-slate-500">
            Sem o nome, o documento fica em "Sem pessoa identificada" e você pode corrigir depois.
          </p>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando documentos...</p>
      ) : byPerson.length === 0 && companyLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
      ) : (
        <div className="space-y-4">
          {byPerson.map(([person, docs]) => (
            <div key={person} className="rounded-lg border bg-white">
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-slate-50 rounded-t-lg">
                <User className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-800">{person}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {docs.length}
                </Badge>
              </div>
              <div className="divide-y">
                {docs.map((d, i) => (
                  <div key={d.key || i} className="px-3 py-2">
                    <div className="flex items-start gap-2">
                      <Badge className={`text-[10px] shrink-0 ${TONE[d.category || "outros"]}`}>
                        {labelFor(d.category)}
                      </Badge>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 break-all"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        {d.name || "Documento"}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      {d.key && editingKey !== d.key && (
                        <button
                          onClick={() => {
                            setEditingKey(d.key!);
                            setEditName(d.employee || "");
                          }}
                          className="ml-auto text-slate-400 hover:text-slate-700 shrink-0"
                          title="Corrigir a quem pertence"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {editingKey === d.key && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nome do jovem"
                          className="h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() =>
                            updateMeta.mutate({
                              companyId,
                              key: d.key!,
                              employee: editName.trim() || null,
                            })
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => setEditingKey(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {companyLevel.length > 0 && (
            <div className="rounded-lg border bg-white">
              <div className="px-3 py-2 border-b bg-slate-50 rounded-t-lg">
                <span className="text-sm font-medium text-slate-800">Contratos com a empresa</span>
              </div>
              <div className="divide-y">
                {companyLevel.map((d, i) => (
                  <a
                    key={d.key || i}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 break-all"
                  >
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    {d.name || "Documento"}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
