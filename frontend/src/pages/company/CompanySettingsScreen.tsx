import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { FunnelLayout, CardEntrance } from "@/components/funnel";
import ContentTransition from "@/components/ui/ContentTransition";
import { FormSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Trash2,
  Mail,
  MessageSquare,
  FileText,
  Edit2,
  UserPlus,
  UserCheck,
  Calendar,
  Clock,
  AlertCircle,
  Briefcase,
  BarChart,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { format, differenceInDays, addMonths } from "date-fns";
import SignedDocumentsView from "@/components/SignedDocumentsView";

export default function CompanySettingsScreen() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();

  // Read initial tab from URL params
  const initialTab = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    return params.get("tab") || "company";
  }, []);

  const [activeTab, setActiveTabState] = useState(initialTab);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setLocation(`/company/settings?tab=${tab}`, { replace: true });
  };
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FormSkeleton fields={5} />
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

  // Hiring processes query for employees tab
  const { data: hiringProcesses = [], isLoading: hiringLoading } = trpc.hiring.getCompanyHiringProcesses.useQuery(
    undefined,
    { enabled: !!user && user.role === "company", staleTime: 30000 }
  );

  const activeEmployees = useMemo(() => {
    return hiringProcesses.filter((hp: any) => hp.status === "active");
  }, [hiringProcesses]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success('Senha alterada com sucesso');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao alterar senha');
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('Nova senha deve ter pelo menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  // Section titles for the header
  const sectionTitles: Record<string, string> = {
    company: "Empresa",
    users: "Usuários",
    notifications: "Notificações",
    documents: "Documentos",
    employees: "Funcionários Ativos",
    security: "Segurança",
  };

  return (
    <FunnelLayout
      onMenuClick={undefined}
      onBackClick={() => setLocation("/company/portal")}
      tabs={[]}
      activeTab=""
      onTabChange={() => {}}
      steps={undefined}
      currentStep={0}
      selectorLabel={undefined}
      selectorValue={undefined}
      selectorOptions={undefined}
      onSelectorChange={undefined}
    >
      <div className="space-y-6">
        {/* Section title */}
        <h2 className="text-2xl font-bold text-[#0A2342]">{sectionTitles[activeTab] || "Configurações"}</h2>

        {/* Company Data Tab */}
        {activeTab === "company" && (
          <CardEntrance>
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <div>
                    <h3 className="text-[#0A2342] font-semibold">Dados da Empresa</h3>
                    <p className="text-slate-600 text-sm">Informações cadastradas</p>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 hover:bg-slate-50 transition-all text-[#0A2342] font-medium">
                  Solicitar Alteração
                </button>
              </div>

              {infoLoading ? (
                <FormSkeleton fields={5} />
              ) : companyInfo ? (
                <>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">Razão Social</span>
                      <p className="font-medium text-[#0A2342] mt-1">{companyInfo.company_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">CNPJ</span>
                      <p className="font-medium text-[#0A2342] mt-1">{companyInfo.cnpj || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-slate-500 uppercase tracking-wider">Endereço</span>
                      <p className="font-medium text-[#0A2342] mt-1">
                        {companyInfo.address ? `${companyInfo.address}, ${companyInfo.city} - ${companyInfo.state}` : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200 my-6" />

                  <div>
                    <h4 className="font-semibold text-[#0A2342] mb-4">Contato</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Email</span>
                        <p className="font-medium text-[#0A2342] mt-1">{companyInfo.email || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Telefone</span>
                        <p className="font-medium text-[#0A2342] mt-1">{companyInfo.phone || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mt-6">
                    Alterações precisam de aprovação
                  </p>
                </>
              ) : (
                <p className="text-slate-500 text-center py-8">Informações não disponíveis</p>
              )}
            </div>
          </CardEntrance>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0A2342]">Usuários com Acesso</h2>
              <button
                onClick={() => setAddUserModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Adicionar Usuário
              </button>
            </div>

            <CardEntrance>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
                {usersLoading ? (
                  <div className="p-4">
                    <FormSkeleton fields={5} />
                  </div>
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
                          <TableCell className="font-medium text-[#0A2342]">{companyUser.name || '-'}</TableCell>
                          <TableCell className="text-slate-600">{companyUser.email}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              companyUser.isOwner
                                ? 'bg-[#FF6B35]/20 text-[#FF6B35]'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {companyUser.isOwner ? 'Administrador' : 'Membro'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {!companyUser.isOwner && (
                              <div className="flex items-center justify-end gap-2">
                                <button className="p-2 rounded-lg text-slate-600 hover:text-[#0A2342] hover:bg-slate-100 transition-all">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-slate-500">Nenhum usuário cadastrado</p>
                )}
              </div>
            </CardEntrance>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            {prefsLoading ? (
              <FormSkeleton fields={5} />
            ) : (
              <>
                {/* Email Notifications */}
                <CardEntrance>
                  <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/20 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-[#FF6B35]" />
                      </div>
                      <h3 className="text-[#0A2342] font-semibold">Notificações por Email</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <span className="text-[#0A2342]">Novos candidatos pré-selecionados</span>
                        <Switch
                          checked={localPrefs.email_new_candidates}
                          onCheckedChange={() => handleToggleNotification('email_new_candidates')}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <span className="text-[#0A2342]">Lembretes de entrevista</span>
                        <Switch
                          checked={localPrefs.email_interview_reminders}
                          onCheckedChange={() => handleToggleNotification('email_interview_reminders')}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <span className="text-[#0A2342]">Lembretes de pagamento</span>
                        <Switch
                          checked={localPrefs.email_payment_reminders}
                          onCheckedChange={() => handleToggleNotification('email_payment_reminders')}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <span className="text-[#0A2342]">Contratos expirando</span>
                        <Switch
                          checked={localPrefs.email_contract_expiring}
                          onCheckedChange={() => handleToggleNotification('email_contract_expiring')}
                        />
                      </div>
                    </div>
                  </div>
                </CardEntrance>

                {/* WhatsApp Notifications */}
                <CardEntrance delay={0.1}>
                  <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="text-[#0A2342] font-semibold">Notificações por WhatsApp</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <span className="text-[#0A2342]">Lembretes de entrevista (dia anterior)</span>
                        <Switch
                          checked={localPrefs.whatsapp_interview_reminders}
                          onCheckedChange={() => handleToggleNotification('whatsapp_interview_reminders')}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <span className="text-[#0A2342]">Pagamentos vencidos</span>
                        <Switch
                          checked={localPrefs.whatsapp_payment_overdue}
                          onCheckedChange={() => handleToggleNotification('whatsapp_payment_overdue')}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <span className="text-[#0A2342]">Novos candidatos pré-selecionados</span>
                        <Switch
                          checked={localPrefs.whatsapp_new_candidates}
                          onCheckedChange={() => handleToggleNotification('whatsapp_new_candidates')}
                        />
                      </div>
                    </div>
                  </div>
                </CardEntrance>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotifications}
                    disabled={updateNotificationsMutation.isPending}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateNotificationsMutation.isPending ? 'Salvando...' : 'Salvar Preferências'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <CardEntrance>
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <div>
                  <h3 className="text-[#0A2342] font-semibold">Documentos Assinados</h3>
                  <p className="text-slate-600 text-sm">Todos os documentos assinados pela sua empresa</p>
                </div>
              </div>

              <SignedDocumentsView />
            </div>
          </CardEntrance>
        )}

        {/* Employees Tab */}
        {activeTab === "employees" && (
          <div className="space-y-6">
            {hiringLoading ? (
              <FormSkeleton fields={5} />
            ) : activeEmployees.length === 0 ? (
              <CardEntrance>
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-8">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                      <UserCheck className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhum funcionário ativo</h3>
                    <p className="text-slate-600 max-w-sm">
                      Funcionários contratados aparecem aqui após a conclusão do processo de contratação
                    </p>
                  </div>
                </div>
              </CardEntrance>
            ) : (
              <>
                {/* Summary header */}
                <CardEntrance>
                  <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                        <UserCheck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#0A2342]">Funcionários Ativos</h3>
                        <p className="text-slate-600 text-sm">
                          <span className="font-semibold text-green-600">{activeEmployees.length}</span> funcionário{activeEmployees.length !== 1 ? "s" : ""} em todas as vagas
                        </p>
                      </div>
                    </div>
                  </div>
                </CardEntrance>

                {/* Employee cards */}
                <div className="space-y-4">
                  {activeEmployees.map((employee: any, index: number) => (
                    <CardEntrance key={employee.id} delay={index * 0.05}>
                      <SettingsEmployeeCard employee={employee} />
                    </CardEntrance>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <CardEntrance>
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <div>
                  <h3 className="text-[#0A2342] font-semibold">Alterar Senha</h3>
                  <p className="text-slate-600 text-sm">Atualize sua senha de acesso</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="current_password">Senha atual</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new_password">Nova senha</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Mínimo de 8 caracteres</p>
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirmar nova senha</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}

                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changePasswordMutation.isPending ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </form>
            </div>
          </CardEntrance>
        )}

      </div>

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
            <button
              onClick={() => setAddUserModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 hover:bg-slate-50 transition-all text-[#0A2342] font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setAddUserModalOpen(false);
                toast.success('Convite enviado!');
              }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all"
            >
              Enviar Convite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FunnelLayout>
  );
}

function SettingsEmployeeCard({ employee }: { employee: any }) {
  const candidate = employee.candidate;
  const job = employee.job;
  const isEstagio = employee.hiring_type === "estagio";
  const startDate = employee.start_date ? new Date(employee.start_date) : null;
  const endDate = employee.end_date ? new Date(employee.end_date) : startDate ? addMonths(startDate, 12) : null;

  const daysUntilExpiry = endDate ? differenceInDays(endDate, new Date()) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
      {/* Expiry warning */}
      {isEstagio && isExpiringSoon && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700 font-medium">
            Contrato expira em {daysUntilExpiry} dias
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-full bg-[#0A2342] flex items-center justify-center border-2 border-white shadow-md">
              {candidate?.photo_url ? (
                <img
                  src={candidate.photo_url}
                  alt={candidate.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">
                  {candidate?.full_name?.charAt(0) || "?"}
                </span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-[#0A2342] font-semibold text-base truncate">
                {candidate?.full_name || "Funcionário"}
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                isEstagio
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {isEstagio ? "Estágio" : "CLT"}
              </span>
            </div>

            {/* Job title */}
            {job && (
              <div className="flex items-center gap-1.5 mb-3">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-600">{job.title}</span>
              </div>
            )}

            {/* Date details */}
            <div className="flex items-center gap-4">
              {startDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600">
                    Início: <span className="font-medium text-[#0A2342]">{format(startDate, "dd/MM/yyyy")}</span>
                  </span>
                </div>
              )}
              {isEstagio && endDate && (
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${isExpiringSoon ? "text-amber-500" : "text-slate-400"}`} />
                  <span className={`text-xs ${isExpiringSoon ? "text-amber-600 font-semibold" : "text-slate-600"}`}>
                    Término: <span className={`font-medium ${isExpiringSoon ? "" : "text-[#0A2342]"}`}>{format(endDate, "dd/MM/yyyy")}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          <button
            className="px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 hover:bg-slate-50 transition-all text-sm font-medium text-[#0A2342] flex items-center gap-2 shrink-0"
          >
            <BarChart className="w-4 h-4" />
            Relatório
          </button>
        </div>
      </div>
    </div>
  );
}
