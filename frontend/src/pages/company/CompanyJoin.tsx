import { useState } from "react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Building2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function CompanyJoin() {
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";

  const { data: validation, isLoading: validating } = trpc.company.validateUserInvitation.useQuery(
    { token },
    { enabled: !!token }
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const acceptMutation = trpc.company.acceptUserInvitation.useMutation({
    onSuccess: () => {
      setSuccess(true);
      toast.success("Conta criada com sucesso!");
    },
    onError: (err) => toast.error(err.message || "Erro ao criar conta"),
  });

  // Pre-fill from invitation
  useState(() => {
    if (validation?.invitation) {
      if (validation.invitation.name) setName(validation.invitation.name);
      if (validation.invitation.email) setEmail(validation.invitation.email);
    }
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-lg font-medium">Link inválido</p>
            <p className="text-slate-500 mt-2">Este link de convite não é válido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!validation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-lg font-medium">Convite expirado ou inválido</p>
            <p className="text-slate-500 mt-2">Solicite um novo convite ao administrador da empresa.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Conta criada com sucesso!</p>
            <p className="text-slate-500 mt-2">Agora você pode fazer login para acessar o portal da empresa.</p>
            <Button className="mt-6 w-full" onClick={() => window.location.href = "/login"}>
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Senha deve ter pelo menos 6 caracteres"); return; }
    if (password !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    acceptMutation.mutate({ token, name, email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Building2 className="h-12 w-12 text-slate-900 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Criar Conta</h1>
            <p className="text-slate-500 text-sm">{validation.invitation?.companyName}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Complete seu cadastro</CardTitle>
            <CardDescription>
              Você foi convidado(a) para acessar o portal da empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={acceptMutation.isPending}>
                {acceptMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando conta...</>
                ) : (
                  "Criar Conta"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
