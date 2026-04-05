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
import { Copy, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { CantinaRecord } from "../backend";
import { PaymentStatus } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const PIX_KEY = "adprec@cantina.com.br";

export function Cantina() {
  const { actor } = useActor();
  const { isAdmin } = useAuth();
  const { identity } = useInternetIdentity();
  const [records, setRecords] = useState<CantinaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    item: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    pixQrCode: PIX_KEY,
  });

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const data = isAdmin
        ? await actor.getAllOverdueCantinaRecords()
        : await actor.getOwnCantinaRecords();
      setRecords(data.sort((a, b) => Number(b.date) - Number(a.date)));
    } finally {
      setLoading(false);
    }
  }, [actor, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!actor || !identity || !form.item || !form.amount) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await actor.addOrUpdateCantinaRecord(id, {
        memberId: identity.getPrincipal(),
        item: form.item,
        amount: Number.parseFloat(form.amount),
        date: BigInt(new Date(form.date).getTime()),
        paymentStatus: PaymentStatus.owing,
        pixQrCode: form.pixQrCode,
      });
      toast.success("Item registrado na cantina!");
      setForm({
        item: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        pixQrCode: PIX_KEY,
      });
      setOpen(false);
      load();
    } catch {
      toast.error("Erro ao registrar item.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!actor) return;
    await actor.markRecordPaid(id);
    toast.success("Pagamento confirmado!");
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Cantina</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Todos os registros" : "Seus consumos"}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Consumo</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label>Item consumido</Label>
                <Input
                  value={form.item}
                  onChange={(e) => setForm({ ...form, item: e.target.value })}
                  placeholder="Ex: Café, Biscoito..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
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
                <Label>Chave Pix</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.pixQrCode}
                    onChange={(e) =>
                      setForm({ ...form, pixQrCode: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(form.pixQrCode);
                      toast.success("Pix copiado!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd} disabled={saving}>
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

      <div className="grid gap-3">
        {records.map((r) => {
          const daysOld = (Date.now() - Number(r.date)) / (1000 * 60 * 60 * 24);
          const key = `${r.memberId.toText()}-${r.item}-${r.date.toString()}`;
          return (
            <Card key={key}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex-1">
                  <div className="font-semibold">{r.item}</div>
                  <div className="text-sm text-muted-foreground">
                    R$ {r.amount.toFixed(2)} ·{" "}
                    {new Date(Number(r.date)).toLocaleDateString("pt-BR")}
                    {daysOld > 30 && (
                      <span className="ml-2 text-red-500 text-xs">
                        (há mais de 30 dias)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Pix: {r.pixQrCode}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      r.paymentStatus === PaymentStatus.paid
                        ? "status-paid"
                        : "status-owing"
                    }
                  >
                    {r.paymentStatus === PaymentStatus.paid
                      ? "Pago"
                      : "Devendo"}
                  </Badge>
                  {isAdmin && r.paymentStatus === PaymentStatus.owing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleMarkPaid(
                          `${r.memberId.toText()}-${r.item}-${r.date}`,
                        )
                      }
                    >
                      Marcar Pago
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {records.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Nenhum registro encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
