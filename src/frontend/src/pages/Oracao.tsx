import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Prayer } from "../backend";
import { PrayerVisibility } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";

export function Oracao() {
  const { actor } = useActor();
  const { isAdmin } = useAuth();
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    request: "",
    pastorOnly: false,
  });

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const pub = await actor.getPrayersByVisibility(
        PrayerVisibility.publicPrayer,
      );
      if (isAdmin) {
        const priv = await actor.getPrayersByVisibility(
          PrayerVisibility.pastorOnly,
        );
        setPrayers(
          [...pub, ...priv].sort(
            (a, b) => Number(b.createdAt) - Number(a.createdAt),
          ),
        );
      } else {
        setPrayers(
          pub.sort((a, b) => Number(b.createdAt) - Number(a.createdAt)),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [actor, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!actor || !form.name || !form.request) return;
    setSaving(true);
    try {
      await actor.addPrayer({
        memberName: form.name,
        request: form.request,
        visibility: form.pastorOnly
          ? PrayerVisibility.pastorOnly
          : PrayerVisibility.publicPrayer,
        createdAt: BigInt(Date.now()),
      });
      toast.success("Pedido de oração enviado!");
      setForm({ name: "", request: "", pastorOnly: false });
      setShowForm(false);
      load();
    } catch {
      toast.error("Erro ao enviar pedido.");
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
        <h1 className="text-2xl font-bold">Mural de Oração</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? "Cancelar" : "Pedido"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Seu nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome (ou anônimo)"
              />
            </div>
            <div className="grid gap-2">
              <Label>Pedido de oração</Label>
              <Textarea
                value={form.request}
                onChange={(e) => setForm({ ...form, request: e.target.value })}
                placeholder="Compartilhe seu pedido..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="pastor-only"
                checked={form.pastorOnly}
                onCheckedChange={(v) => setForm({ ...form, pastorOnly: v })}
              />
              <Label htmlFor="pastor-only">
                Privado (apenas para o Pastor)
              </Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {prayers.map((p) => {
          const key = `${p.memberName}-${p.createdAt.toString()}`;
          return (
            <Card key={key}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-semibold">{p.memberName}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      {new Date(Number(p.createdAt)).toLocaleDateString(
                        "pt-BR",
                      )}
                    </span>
                  </div>
                  {p.visibility === PrayerVisibility.pastorOnly && (
                    <Badge variant="outline" className="text-xs">
                      Privado
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{p.request}</p>
              </CardContent>
            </Card>
          );
        })}
        {prayers.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Nenhum pedido ainda. Seja o primeiro a compartilhar!
          </p>
        )}
      </div>
    </div>
  );
}
