import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Briefcase, CheckCircle } from 'lucide-react';
import ClassicLoader from "@/components/ui/ClassicLoader";
import { toast } from 'sonner';

export default function AffiliateAcceptInvitation() {
  const { token } = useParams();
  const [, setLocation] = useLocation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verify invitation on load
  const { data: invitation, isLoading, error } = trpc.affiliate.verifyInvitation.useQuery(
    { token: token || '' },
    { enabled: !!token }
  );

  const acceptMutation = trpc.affiliate.acceptInvitation.useMutation({
    onSuccess: () => {
      toast.success('Conta criada com sucesso! Faça login para continuar.');
      setTimeout(() => {
        setLocation('/login');
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao aceitar convite');
      setIsSubmitting(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Por favor, preencha seu nome');
      return;
    }

    if (!phone.trim()) {
      toast.error('Por favor, preencha seu telefone');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);
    acceptMutation.mutate({
      token: token || '',
      name,
      phone,
      password,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <ClassicLoader />
          <p className="mt-4 text-muted-foreground">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Convite Inválido</CardTitle>
            <CardDescription>
              {error?.message || 'Este convite não é válido, expirou ou já foi utilizado.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/')}
              className="w-full"
            >
              Voltar para Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Briefcase className="h-12 w-12 text-slate-900 mr-3" />
          <h1 className="text-3xl font-bold text-slate-900">Recrutamento</h1>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-slate-900 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle className="h-6 w-6" />
              Convite para Franqueado
            </CardTitle>
            <CardDescription className="text-slate-300">
              Complete seu cadastro para aceitar o convite
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  minLength={6}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ClassicLoader />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aceitar Convite e Criar Conta
                  </>
                )}
              </Button>
            </form>

            {/* Info about pre-filled data */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-sm text-blue-900 mb-2">
                Informações já configuradas pelo administrador:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Dados da franquia e CNPJ</li>
                <li>• Escolas nas cidades: {invitation.cities?.join(', ')}</li>
                <li>• Informações de contato e endereço</li>
              </ul>
              <p className="text-xs text-blue-700 mt-2">
                Você só precisa fornecer seu nome, telefone e criar uma senha para acessar sua conta.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>
            Este convite expira em {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
}
