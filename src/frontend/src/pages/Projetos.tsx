import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { Project } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";

export function Projetos() {
  const { actor } = useActor();
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", targetAmount: "", pixKey: "" });
  const [contribution, setContribution] = useState("");

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const data = await actor.getProjects();
      setProjects(data);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!actor || !form.name || !form.targetAmount || !form.pixKey) return;
    setSaving(true);
    try {
      let progressPhoto: ExternalBlob | undefined;
      if (photoFile) {
        const bytes = new Uint8Array(await photoFile.arrayBuffer());
        progressPhoto = ExternalBlob.fromBytes(bytes);
      }
      await actor.addProject({
        name: form.name,
        targetAmount: Number.parseFloat(form.targetAmount),
        currentAmount: 0,
        pixKey: form.pixKey,
        progressPhoto,
      });
      toast.success("Projeto criado!");
      setForm({ name: "", targetAmount: "", pixKey: "" });
      setPhotoFile(null);
      setAddOpen(false);
      load();
    } catch {
      toast.error("Erro ao criar projeto.");
    } finally {
      setSaving(false);
    }
  };

  const handleContribute = async (projectName: string) => {
    if (!actor || !contribution) return;
    setSaving(true);
    try {
      await actor.contributionProject(
        projectName,
        Number.parseFloat(contribution),
      );
      toast.success(`Contribuição de R$ ${contribution} registrada!`);
      setContribution("");
      setContributeOpen(null);
      load();
    } catch {
      toast.error("Erro ao contribuir.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (projectName: string) => {
    if (!actor) return;
    setDeleting(projectName);
    try {
      await actor.deleteProject(projectName);
      toast.success("Projeto excluído com sucesso!");
      load();
    } catch {
      toast.error("Erro ao excluir projeto.");
    } finally {
      setDeleting(null);
    }
  };

  const copyPixKey = (pixKey: string) => {
    navigator.clipboard.writeText(pixKey).then(() => {
      toast.success("Chave Pix copiada!");
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="container py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projetos &amp; Vaquinhas</h1>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button data-ocid="projetos.open_modal_button">
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" data-ocid="projetos.dialog">
              <DialogHeader>
                <DialogTitle>Novo Projeto</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label>Nome do Projeto</Label>
                  <Input
                    data-ocid="projetos.input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nome do projeto"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Meta (R$)</Label>
                  <Input
                    type="number"
                    value={form.targetAmount}
                    onChange={(e) =>
                      setForm({ ...form, targetAmount: e.target.value })
                    }
                    placeholder="0,00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Chave Pix</Label>
                  <Input
                    data-ocid="projetos.pix_input"
                    value={form.pixKey}
                    onChange={(e) =>
                      setForm({ ...form, pixKey: e.target.value })
                    }
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Foto</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setAddOpen(false)}
                    data-ocid="projetos.cancel_button"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={saving}
                    data-ocid="projetos.submit_button"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2" data-ocid="projetos.list">
        {projects.map((p, idx) => {
          const pct = Math.min(
            100,
            Math.round((p.currentAmount / p.targetAmount) * 100),
          );
          return (
            <Card key={p.name} data-ocid={`projetos.item.${idx + 1}`}>
              {p.progressPhoto && (
                <img
                  src={p.progressPhoto.getDirectURL()}
                  alt={p.name}
                  className="w-full h-40 object-cover rounded-t-lg"
                />
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive flex-shrink-0"
                          data-ocid={`projetos.delete_button.${idx + 1}`}
                          disabled={deleting === p.name}
                        >
                          {deleting === p.name ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent data-ocid="projetos.dialog">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o projeto{" "}
                            <strong>{p.name}</strong>? Esta ação não pode ser
                            desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-ocid="projetos.cancel_button">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(p.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-ocid="projetos.confirm_button"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>R$ {p.currentAmount.toFixed(2)}</span>
                  <span>Meta: R$ {p.targetAmount.toFixed(2)}</span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="text-right text-sm font-semibold">{pct}%</div>

                {/* Pix Key */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-muted/40">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Chave Pix
                    </p>
                    <p className="text-sm font-mono truncate">{p.pixKey}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-7 w-7"
                    onClick={() => copyPixKey(p.pixKey)}
                    title="Copiar chave Pix"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <Dialog
                  open={contributeOpen === p.name}
                  onOpenChange={(o) => setContributeOpen(o ? p.name : null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      data-ocid={`projetos.secondary_button.${idx + 1}`}
                    >
                      Contribuir
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="sm:max-w-xs"
                    data-ocid="projetos.dialog"
                  >
                    <DialogHeader>
                      <DialogTitle>Contribuir para {p.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                      <div className="grid gap-2">
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          value={contribution}
                          onChange={(e) => setContribution(e.target.value)}
                          data-ocid="projetos.input"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setContributeOpen(null)}
                          data-ocid="projetos.cancel_button"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => handleContribute(p.name)}
                          disabled={saving}
                          data-ocid="projetos.confirm_button"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
        {projects.length === 0 && (
          <p
            className="text-muted-foreground text-center py-8 col-span-2"
            data-ocid="projetos.empty_state"
          >
            Nenhum projeto cadastrado.
          </p>
        )}
      </div>
    </div>
  );
}
