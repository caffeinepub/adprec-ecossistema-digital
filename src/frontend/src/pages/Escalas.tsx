import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Escala } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const MINISTERIOS = [
  "Louvor",
  "Som",
  "Mídia",
  "Recepção",
  "Ensino",
  "Infantil",
];

export function Escalas() {
  const { actor } = useActor();
  const { isAdmin } = useAuth();
  const { identity } = useInternetIdentity();
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    ministerio: MINISTERIOS[0],
    volunteerName: "",
  });

  const load = useCallback(async () => {
    if (!actor || !identity) return;
    setLoading(true);
    try {
      const data = await actor.getMemberScales(identity.getPrincipal());
      setEscalas(data.sort((a, b) => Number(a.date) - Number(b.date)));
    } finally {
      setLoading(false);
    }
  }, [actor, identity]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!actor || !identity || !form.volunteerName) return;
    setSaving(true);
    try {
      await actor.editScale({
        date: BigInt(new Date(form.date).getTime()),
        ministerio: form.ministerio,
        volunteerName: form.volunteerName,
        volunteerId: identity.getPrincipal(),
        confirmed: false,
      });
      toast.success("Escala criada!");
      setOpen(false);
      load();
    } catch {
      toast.error("Erro ao criar escala.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (escala: Escala, confirmed: boolean) => {
    if (!actor) return;
    await actor.editScale({ ...escala, confirmed });
    toast.success(confirmed ? "Presença confirmada!" : "Presença negada.");
    load();
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
        <h1 className="text-2xl font-bold">Escalas de Voluntários</h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Escala
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Escala</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Ministério</Label>
                  <Select
                    value={form.ministerio}
                    onValueChange={(v) => setForm({ ...form, ministerio: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINISTERIOS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Nome do Voluntário</Label>
                  <Input
                    value={form.volunteerName}
                    onChange={(e) =>
                      setForm({ ...form, volunteerName: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)}>
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

      <div className="grid gap-3">
        {escalas.map((e) => {
          const key = `${e.volunteerId.toText()}-${e.ministerio}-${e.date.toString()}`;
          return (
            <Card key={key}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex-1">
                  <div className="font-semibold">{e.ministerio}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(Number(e.date)).toLocaleDateString("pt-BR", {
                      dateStyle: "full",
                    })}
                    {" · "}
                    {e.volunteerName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      e.confirmed ? "status-confirmed" : "status-pending"
                    }
                  >
                    {e.confirmed ? "Confirmado" : "Pendente"}
                  </Badge>
                  {!e.confirmed && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleConfirm(e, true)}
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleConfirm(e, false)}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {escalas.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma escala encontrada.
          </p>
        )}
      </div>
    </div>
  );
}
