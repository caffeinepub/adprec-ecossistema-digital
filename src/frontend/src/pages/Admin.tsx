import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Principal } from "@icp-sdk/core/principal";
import {
  Check,
  DollarSign,
  Loader2,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { UserApprovalInfo } from "../backend";
import { ApprovalStatus, UserRole } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";

interface ApprovalWithRole extends UserApprovalInfo {
  currentRole?: UserRole;
}

export function Admin() {
  const { actor } = useActor();
  const { isAdmin } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalWithRole[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [pendingTithes, setPendingTithes] = useState(0);
  const [overdueCantina, setOverdueCantina] = useState(0);
  const [loading, setLoading] = useState(true);

  // Role management state
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<{
    principal: Principal;
    name: string;
  } | null>(null);
  const [newAdminPrincipal, setNewAdminPrincipal] = useState("");
  const [promotingLoading, setPromotingLoading] = useState(false);
  const [showManualPromote, setShowManualPromote] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const [appr, members, tithes, cantina] = await Promise.all([
        actor.listApprovals(),
        actor.getAllMembers(),
        actor.getAllTithesByAdmin(),
        actor.getAllOverdueCantinaRecords(),
      ]);
      setApprovals(appr.filter((a) => a.status === ApprovalStatus.pending));
      setMemberCount(members.length);
      setPendingTithes(tithes.filter((t) => t.status === "pending").length);
      setOverdueCantina(cantina.length);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApproval = async (
    principal: Principal,
    status: ApprovalStatus,
  ) => {
    if (!actor) return;
    await actor.setApproval(principal, status);
    toast.success(
      status === ApprovalStatus.approved
        ? "Membro aprovado!"
        : "Membro rejeitado.",
    );
    load();
  };

  const handlePromoteToAdmin = async (principalText: string) => {
    if (!actor || !principalText.trim()) return;
    setPromotingLoading(true);
    try {
      const principal = Principal.fromText(principalText.trim());
      await actor.assignCallerUserRole(principal, UserRole.admin);
      toast.success("Usuário promovido a administrador!");
      setShowPromoteDialog(false);
      setShowManualPromote(false);
      setNewAdminPrincipal("");
      setPromoteTarget(null);
    } catch (_err) {
      toast.error("Erro ao promover usuário. Verifique o Principal ID.");
    } finally {
      setPromotingLoading(false);
    }
  };

  const _handleDemoteFromAdmin = async (principal: Principal) => {
    if (!actor) return;
    setPromotingLoading(true);
    try {
      await actor.assignCallerUserRole(principal, UserRole.user);
      toast.success("Permissões de admin removidas.");
      load();
    } catch (_err) {
      toast.error("Erro ao alterar permissões.");
    } finally {
      setPromotingLoading(false);
    }
  };

  if (!isAdmin)
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">
          Acesso restrito a administradores.
        </p>
      </div>
    );

  if (loading)
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="container py-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold mb-6">Painel do Administrador</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{memberCount}</div>
            <div className="text-xs text-muted-foreground">Membros</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold text-yellow-500">
              {pendingTithes}
            </div>
            <div className="text-xs text-muted-foreground">
              Dízimos Pendentes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <ShoppingBag className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold text-red-500">
              {overdueCantina}
            </div>
            <div className="text-xs text-muted-foreground">Cantina Vencida</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Aprovações Pendentes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {approvals.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma solicitação pendente.
            </p>
          ) : (
            approvals.map((a) => (
              <div
                key={a.principal.toText()}
                className="flex items-center gap-3"
              >
                <div className="flex-1 font-mono text-sm truncate">
                  {a.principal.toText()}
                </div>
                <Badge variant="outline" className="status-pending">
                  Pendente
                </Badge>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    handleApproval(a.principal, ApprovalStatus.approved)
                  }
                >
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    handleApproval(a.principal, ApprovalStatus.rejected)
                  }
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Role Management */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Administradores
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Promova usuários aprovados a administrador usando o Principal ID
            deles. O Principal ID pode ser visto na tela de perfil do usuário
            após o login.
          </p>

          <Button
            variant="outline"
            className="w-full sm:w-auto flex items-center gap-2"
            onClick={() => setShowManualPromote(true)}
          >
            <ShieldCheck className="h-4 w-4" />
            Promover usuário a Administrador
          </Button>

          {showManualPromote && (
            <div className="flex flex-col gap-3 p-4 border border-border rounded-lg bg-card">
              <Label htmlFor="principal-input">Principal ID do usuário</Label>
              <Input
                id="principal-input"
                placeholder="Ex: xxxx-xxx...."
                value={newAdminPrincipal}
                onChange={(e) => setNewAdminPrincipal(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Peça ao usuário para copiar o Principal ID dele na tela de login
                ou perfil.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePromoteToAdmin(newAdminPrincipal)}
                  disabled={promotingLoading || !newAdminPrincipal.trim()}
                  size="sm"
                >
                  {promotingLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Promoção
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowManualPromote(false);
                    setNewAdminPrincipal("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Navegação Rápida</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { path: "/membros", label: "Membros" },
            { path: "/calendario", label: "Calendário" },
            { path: "/financeiro", label: "Dízimos" },
            { path: "/cantina", label: "Cantina" },
            { path: "/projetos", label: "Projetos" },
            { path: "/escalas", label: "Escalas" },
            { path: "/oracao", label: "Oração" },
          ].map(({ path, label }) => (
            <Link key={path} to={path}>
              <Button variant="outline" className="w-full">
                {label}
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Promote Dialog */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promover a Administrador</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja promover{" "}
              <span className="font-mono">{promoteTarget?.name}</span> a
              administrador? Administradores têm acesso total ao sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPromoteDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                promoteTarget &&
                handlePromoteToAdmin(promoteTarget.principal.toText())
              }
              disabled={promotingLoading}
            >
              {promotingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
