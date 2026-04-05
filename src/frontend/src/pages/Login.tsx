import { Button } from "@/components/ui/button";
import { Copy, Shield } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function Login() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();
  const {
    isApproved,
    isAuthenticated,
    requestApproval,
    isLoading,
    principalText,
  } = useAuth();
  const { actor } = useActor();
  const [requested, setRequested] = useState(false);
  const [adminAssigned, setAdminAssigned] = useState<boolean | null>(null);
  const [isInitializingAdmin, setIsInitializingAdmin] = useState(false);

  // Check if any admin has been assigned yet
  useEffect(() => {
    if (!actor) return;
    actor
      .isAdminAssigned()
      .then((assigned) => setAdminAssigned(assigned))
      .catch(() => setAdminAssigned(true)); // assume assigned on error to avoid showing button
  }, [actor]);

  if (isAuthenticated && isApproved) {
    return <Navigate to="/" replace />;
  }

  const handleRequestApproval = async () => {
    await requestApproval();
    setRequested(true);
  };

  const handleSelfInitializeAdmin = async () => {
    if (!actor) return;
    setIsInitializingAdmin(true);
    try {
      const success = await actor.selfInitializeAsFirstAdmin();
      if (success) {
        toast.success("Você agora é o administrador! Recarregando...");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(
          "Não foi possível inicializar. Já existe um administrador no sistema.",
        );
        setAdminAssigned(true);
      }
    } catch (_e) {
      toast.error("Erro ao tentar inicializar como administrador.");
    } finally {
      setIsInitializingAdmin(false);
    }
  };

  const copyPrincipal = () => {
    if (principalText) {
      navigator.clipboard.writeText(principalText);
      toast.success("Principal ID copiado!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-2">ADPREC</h1>
        <p className="text-muted-foreground mb-10">Ecossistema Digital</p>

        {!isAuthenticated ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl border border-border bg-card text-left">
              <p className="text-sm font-medium mb-1">Como entrar:</p>
              <p className="text-xs text-muted-foreground">
                Clique em "Entrar" abaixo. Na tela que abrir, você pode usar sua
                conta <strong>Google (Gmail)</strong>, passkey, ou criar uma
                identidade nova.
              </p>
            </div>
            <Button
              onClick={login}
              disabled={isLoggingIn || isInitializing}
              className="w-full"
              size="lg"
            >
              {isLoggingIn || isInitializing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Abrindo login...
                </>
              ) : (
                <span className="flex items-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Entrar com Google / Internet Identity
                </span>
              )}
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verificando acesso...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4 items-center">
            {/* Show Principal ID */}
            {principalText && (
              <div className="p-4 rounded-xl border border-border bg-card w-full text-left">
                <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                  Seu Principal ID
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs break-all flex-1">
                    {principalText}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-7 w-7"
                    onClick={copyPrincipal}
                    title="Copiar Principal ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Compartilhe esse ID com o administrador para receber acesso.
                </p>
              </div>
            )}

            {/* First Admin Initialization - only when no admin exists yet */}
            {adminAssigned === false && (
              <div className="p-4 rounded-xl border border-primary/40 bg-primary/5 w-full text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">
                    Primeiro acesso ao sistema
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Nenhum administrador foi configurado ainda. Clique abaixo para
                  se tornar o primeiro administrador do ADPREC.
                </p>
                <Button
                  onClick={handleSelfInitializeAdmin}
                  disabled={isInitializingAdmin}
                  className="w-full"
                  size="sm"
                >
                  {isInitializingAdmin ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Inicializando...
                    </>
                  ) : (
                    "Tornar-me Administrador"
                  )}
                </Button>
              </div>
            )}

            {requested ? (
              <div className="p-6 rounded-xl border border-border bg-card text-center">
                <p className="font-semibold mb-1">Solicitação enviada!</p>
                <p className="text-sm text-muted-foreground">
                  Aguarde a aprovação do administrador para acessar o app.
                </p>
              </div>
            ) : (
              adminAssigned !== false && (
                <div className="flex flex-col gap-4 items-center w-full">
                  <div className="p-6 rounded-xl border border-border bg-card text-center w-full">
                    <p className="font-semibold mb-1">Conta não aprovada</p>
                    <p className="text-sm text-muted-foreground">
                      Sua conta ainda não foi aprovada. Solicite acesso ao
                      administrador ou clique abaixo.
                    </p>
                  </div>
                  <Button onClick={handleRequestApproval} className="w-full">
                    Solicitar Aprovação
                  </Button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
