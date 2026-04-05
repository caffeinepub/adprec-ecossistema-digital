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
import { Loader2, Plus } from "lucide-react";
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", targetAmount: "" });
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
    if (!actor || !form.name || !form.targetAmount) return;
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
        progressPhoto,
      });
      toast.success("Projeto criado!");
      setForm({ name: "", targetAmount: "" });
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Projeto</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label>Nome do Projeto</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAdd} disabled={saving}>
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

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((p) => {
          const pct = Math.min(
            100,
            Math.round((p.currentAmount / p.targetAmount) * 100),
          );
          return (
            <Card key={p.name}>
              {p.progressPhoto && (
                <img
                  src={p.progressPhoto.getDirectURL()}
                  alt={p.name}
                  className="w-full h-40 object-cover rounded-t-lg"
                />
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>R$ {p.currentAmount.toFixed(2)}</span>
                  <span>Meta: R$ {p.targetAmount.toFixed(2)}</span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="text-right text-sm font-semibold">{pct}%</div>
                <Dialog
                  open={contributeOpen === p.name}
                  onOpenChange={(o) => setContributeOpen(o ? p.name : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Contribuir
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xs">
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
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setContributeOpen(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => handleContribute(p.name)}
                          disabled={saving}
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
          <p className="text-muted-foreground text-center py-8 col-span-2">
            Nenhum projeto cadastrado.
          </p>
        )}
      </div>
    </div>
  );
}
