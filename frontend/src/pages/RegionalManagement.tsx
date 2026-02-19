import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import {
  Building2,
  MapPin,
  CheckCircle,
  XCircle,
  Mail,
  Loader2,
  Plus,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { toast } from "sonner";

export default function RegionalManagement() {
  const { user, loading: authLoading } = useAuth();

  // State
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Queries
  const { data: agencies, isLoading: agenciesLoading, refetch: refetchAgencies } = trpc.agency.getAll.useQuery();

  // Create invitation mutation - sends email directly via backend
  const createInvitationMutation = trpc.agency.createInvitation.useMutation({
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success("Convite enviado com sucesso!");
      } else if ('emailError' in data && data.emailError) {
        toast.warning(`Convite criado, mas email falhou: ${data.emailError}`);
      } else {
        toast.success("Convite criado com sucesso!");
      }
      setInviteDialogOpen(false);
      setInviteEmail("");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar convite");
    }
  });

  // Mutations - Agencies
  const updateAgencyStatusMutation = trpc.agency.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status da agência atualizado!');
      refetchAgencies();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar agência');
    }
  });

  if (authLoading || agenciesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser um administrador para acessar esta página.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Handlers - Invitation
  const handleInviteSubmit = () => {
    if (!inviteEmail.trim()) {
      toast.error("Digite um email válido");
      return;
    }
    createInvitationMutation.mutate({ email: inviteEmail.trim() });
  };

  // Handlers - Agencies
  const handleApproveAgency = async (id: string) => {
    await updateAgencyStatusMutation.mutateAsync({ id, status: 'active' });
  };

  const handleSuspendAgency = async (id: string) => {
    await updateAgencyStatusMutation.mutateAsync({ id, status: 'suspended' });
  };

  const getAgencyStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500">Suspensa</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500">Inativa</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Invite Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              Agências
            </h1>
            <p className="text-muted-foreground text-sm">Gerencie as agências da sua rede</p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Convidar Agência
          </Button>
        </div>

        {/* Agencies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agências</CardTitle>
            <CardDescription>Lista de todas as agências da rede</CardDescription>
          </CardHeader>
          <CardContent>
            {agencies && agencies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencies.map((agency: any) => (
                    <TableRow key={agency.id}>
                      <TableCell className="font-medium">{agency.agency_name}</TableCell>
                      <TableCell className="font-mono text-sm">{agency.cnpj || 'N/A'}</TableCell>
                      <TableCell>{agency.email || 'N/A'}</TableCell>
                      <TableCell>{agency.city || 'N/A'}</TableCell>
                      <TableCell>{getAgencyStatusBadge(agency.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {agency.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproveAgency(agency.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                          )}
                          {agency.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSuspendAgency(agency.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Suspender
                            </Button>
                          )}
                          {agency.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproveAgency(agency.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Reativar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma agência cadastrada</h3>
                <p className="text-muted-foreground">
                  Envie convites para agências se cadastrarem na plataforma
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite Agency Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Convidar Agência
              </DialogTitle>
              <DialogDescription>
                Digite o email da agência para enviar um convite de cadastro.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                type="email"
                placeholder="email@agencia.com.br"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInviteSubmit();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setInviteDialogOpen(false);
                  setInviteEmail("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleInviteSubmit}
                disabled={createInvitationMutation.isPending}
              >
                {createInvitationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
