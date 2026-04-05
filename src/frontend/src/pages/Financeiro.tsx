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
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { Tithe } from "../backend";
import { TitheStatus, TitheType } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

function titheTypeLabel(type: TitheType): string {
  return type === TitheType.tithe ? "Dízimo" : "Oferta";
}

export function Financeiro() {
  const { actor } = useActor();
  const { isAdmin } = useAuth();
  const { identity } = useInternetIdentity();
  const [tithes, setTithes] = useState<Tithe[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    titheType: TitheType.tithe,
  });
  const [warnOldTithe, setWarnOldTithe] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const data = isAdmin
        ? await actor.getAllTithesByAdmin()
        : await actor.getOwnTithes();
      const sorted = data.sort((a, b) => Number(b.date) - Number(a.date));
      setTithes(sorted);

      if (!isAdmin) {
        const newest = sorted[0];
        if (newest) {
          const daysSince =
            (Date.now() - Number(newest.date)) / (1000 * 60 * 60 * 24);
          setWarnOldTithe(daysSince > 30);
        } else {
          setWarnOldTithe(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [actor, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!actor || !identity || !form.amount) return;
    setSaving(true);
    try {
      let receiptImage: ExternalBlob | undefined;
      if (receiptFile) {
        const bytes = new Uint8Array(await receiptFile.arrayBuffer());
        receiptImage = ExternalBlob.fromBytes(bytes);
      }
      const id = crypto.randomUUID();
      await actor.addOrUpdateTithe(id, {
        memberId: identity.getPrincipal(),
        amount: Number.parseFloat(form.amount),
        date: BigInt(new Date(form.date).getTime()),
        status: TitheStatus.pending,
        titheType: form.titheType,
        receiptImage,
      });
      toast.success(
        `${titheTypeLabel(form.titheType)} registrado${
          form.titheType === TitheType.tithe ? "" : "a"
        }!`,
      );
      setForm({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        titheType: TitheType.tithe,
      });
      setReceiptFile(null);
      setOpen(false);
      load();
    } catch {
      toast.error("Erro ao registrar.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (id: string) => {
    if (!actor) return;
    await actor.confirmTithe(id);
    toast.success("Registro confirmado!");
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
        <h1 className="text-2xl font-bold">Dízimos e Ofertas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-ocid="financeiro.open_modal_button">
              <Plus className="h-4 w-4 mr-2" />
              Registrar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-ocid="financeiro.dialog">
            <DialogHeader>
              <DialogTitle>Novo Registro</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select
                  value={form.titheType}
                  onValueChange={(v) =>
                    setForm({ ...form, titheType: v as TitheType })
                  }
                >
                  <SelectTrigger data-ocid="financeiro.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TitheType.tithe}>Dízimo</SelectItem>
                    <SelectItem value={TitheType.offering}>Oferta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
                  data-ocid="financeiro.input"
                />
              </div>
              <div className="grid gap-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Comprovante (imagem)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-ocid="financeiro.cancel_button"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={saving}
                  data-ocid="financeiro.submit_button"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {warnOldTithe && !isAdmin && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm mb-4"
          data-ocid="financeiro.error_state"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Sentimos falta da sua contribuição este mês. Sua fidelidade ajuda a
          obra de Deus a crescer!
        </div>
      )}

      <div className="grid gap-3" data-ocid="financeiro.list">
        {tithes.map((t, idx) => (
          <Card
            key={`${t.memberId.toText()}-${t.date.toString()}`}
            data-ocid={`financeiro.item.${idx + 1}`}
          >
            <CardContent className="flex items-center gap-4 py-3">
              {t.receiptImage && (
                <img
                  src={t.receiptImage.getDirectURL()}
                  alt="comprovante"
                  className="h-12 w-12 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    R$ {t.amount.toFixed(2)}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0 border-border text-muted-foreground"
                  >
                    {titheTypeLabel(t.titheType)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(Number(t.date)).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    t.status === TitheStatus.confirmed
                      ? "status-confirmed"
                      : "status-pending"
                  }
                >
                  {t.status === TitheStatus.confirmed
                    ? "Confirmado"
                    : "Pendente"}
                </Badge>
                {isAdmin && t.status === TitheStatus.pending && (
                  <Button
                    size="sm"
                    variant="outline"
                    data-ocid={`financeiro.secondary_button.${idx + 1}`}
                    onClick={() =>
                      handleConfirm(`${t.memberId.toText()}-${t.date}`)
                    }
                  >
                    Confirmar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {tithes.length === 0 && (
          <p
            className="text-muted-foreground text-center py-8"
            data-ocid="financeiro.empty_state"
          >
            Nenhum registro encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
