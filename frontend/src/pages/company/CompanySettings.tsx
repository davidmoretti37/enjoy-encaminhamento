import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  Settings,
  Building2,
  Users,
  Bell,
  Plus,
  Trash2,
  Mail,
  MessageSquare,
  LogOut
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function CompanySettings() {
  const { user, loading: authLoading, logout } = useAuth();
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: companyInfo, isLoading: infoLoading } = trpc.company.getCompanyInfo.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const { data: companyUsers, isLoading: usersLoading } = trpc.company.getUsers.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const { data: notificationPrefs, isLoading: prefsLoading } = trpc.company.getNotificationPrefs.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const [localPrefs, setLocalPrefs] = useState({
    email_new_candidates: true,
    email_interview_reminders: true,
    email_payment_reminders: true,
    email_contract_expiring: true,
    whatsapp_interview_reminders: true,
    whatsapp_payment_overdue: true,
    whatsapp_new_candidates: false,
  });

  useEffect(() => {
    if (notificationPrefs) {
      setLocalPrefs(notificationPrefs);
    }
  }, [notificationPrefs]);

  const updateNotificationsMutation = trpc.company.updateNotificationPrefs.useMutation({
    onSuccess: () => {
      toast.success('Preferências salvas com sucesso!');
      utils.company.getNotificationPrefs.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao salvar preferências');
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser uma empresa para acessar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Voltar para Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggleNotification = (key: string) => {
    setLocalPrefs(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleSaveNotifications = () => {
    updateNotificationsMutation.mutate(localPrefs);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            Configurações
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie as configurações da sua empresa
          </p>
        </div>

        {/* Company Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-blue-600" />
            Empresa
          </h2>
          <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>
                  Informações cadastradas da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {infoLoading ? (
                  <div className="text-center py-4"><ClassicLoader /></div>
                ) : companyInfo ? (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-gray-500">Razão Social</Label>
                        <p className="font-medium text-gray-900">{companyInfo.company_name || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">CNPJ</Label>
                        <p className="font-medium text-gray-900">{companyInfo.cnpj || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-gray-500">Endereço</Label>
                        <p className="font-medium text-gray-900">
                          {companyInfo.address ? `${companyInfo.address}, ${companyInfo.city} - ${companyInfo.state}` : '-'}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-4">Contato</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label className="text-gray-500">Email</Label>
                          <p className="font-medium text-gray-900">{companyInfo.email || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Telefone</Label>
                          <p className="font-medium text-gray-900">{companyInfo.phone || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline">
                      Solicitar Alteração
                    </Button>
                    <p className="text-sm text-gray-500">
                      (Alterações precisam de aprovação)
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">Informações não disponíveis</p>
                )}
              </CardContent>
            </Card>
        </section>

        {/* Users Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-blue-600" />
            Usuários
          </h2>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Usuários com Acesso</CardTitle>
                  <CardDescription>
                    Gerencie quem tem acesso ao portal da empresa
                  </CardDescription>
                </div>
                <Button onClick={() => setAddUserModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-4"><ClassicLoader /></div>
                ) : companyUsers && companyUsers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyUsers.map((companyUser: any) => (
                        <TableRow key={companyUser.id}>
                          <TableCell className="font-medium">{companyUser.name || '-'}</TableCell>
                          <TableCell>{companyUser.email}</TableCell>
                          <TableCell>
                            <Badge variant={companyUser.isOwner ? 'default' : 'secondary'}>
                              {companyUser.isOwner ? 'Administrador' : 'Membro'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {!companyUser.isOwner && (
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm">Editar</Button>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-gray-500">Nenhum usuário cadastrado</p>
                )}
              </CardContent>
            </Card>
        </section>

        {/* Notifications Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-blue-600" />
            Notificações
          </h2>
          <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                  Escolha como deseja receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {prefsLoading ? (
                  <div className="text-center py-4"><ClassicLoader /></div>
                ) : (
                  <>
                    {/* Email Notifications */}
                    <div>
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email_new_candidates">Novos candidatos pré-selecionados</Label>
                          <Switch
                            id="email_new_candidates"
                            checked={localPrefs.email_new_candidates}
                            onCheckedChange={() => handleToggleNotification('email_new_candidates')}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email_interview_reminders">Lembretes de entrevista</Label>
                          <Switch
                            id="email_interview_reminders"
                            checked={localPrefs.email_interview_reminders}
                            onCheckedChange={() => handleToggleNotification('email_interview_reminders')}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email_payment_reminders">Lembretes de pagamento</Label>
                          <Switch
                            id="email_payment_reminders"
                            checked={localPrefs.email_payment_reminders}
                            onCheckedChange={() => handleToggleNotification('email_payment_reminders')}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email_contract_expiring">Contratos expirando</Label>
                          <Switch
                            id="email_contract_expiring"
                            checked={localPrefs.email_contract_expiring}
                            onCheckedChange={() => handleToggleNotification('email_contract_expiring')}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* WhatsApp Notifications */}
                    <div>
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="whatsapp_interview_reminders">Lembretes de entrevista (dia anterior)</Label>
                          <Switch
                            id="whatsapp_interview_reminders"
                            checked={localPrefs.whatsapp_interview_reminders}
                            onCheckedChange={() => handleToggleNotification('whatsapp_interview_reminders')}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="whatsapp_payment_overdue">Pagamentos vencidos</Label>
                          <Switch
                            id="whatsapp_payment_overdue"
                            checked={localPrefs.whatsapp_payment_overdue}
                            onCheckedChange={() => handleToggleNotification('whatsapp_payment_overdue')}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="whatsapp_new_candidates">Novos candidatos pré-selecionados</Label>
                          <Switch
                            id="whatsapp_new_candidates"
                            checked={localPrefs.whatsapp_new_candidates}
                            onCheckedChange={() => handleToggleNotification('whatsapp_new_candidates')}
                          />
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleSaveNotifications} disabled={updateNotificationsMutation.isPending}>
                      {updateNotificationsMutation.isPending ? 'Salvando...' : 'Salvar Preferências'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
        </section>

        {/* Logout Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-red-600" />
                Sessão
              </CardTitle>
              <CardDescription>
                Encerre sua sessão atual
              </CardDescription>
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
        </section>

        {/* Add User Modal */}
        <Dialog open={addUserModalOpen} onOpenChange={setAddUserModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Usuário</DialogTitle>
              <DialogDescription>
                Convide um novo usuário para acessar o portal da empresa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="new_user_name">Nome</Label>
                <Input id="new_user_name" placeholder="Nome completo" />
              </div>
              <div>
                <Label htmlFor="new_user_email">Email</Label>
                <Input id="new_user_email" type="email" placeholder="email@empresa.com.br" />
              </div>
              <div>
                <Label htmlFor="new_user_role">Função</Label>
                <Select defaultValue="member">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddUserModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                setAddUserModalOpen(false);
                toast.success('Convite enviado!');
              }}>
                Enviar Convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
