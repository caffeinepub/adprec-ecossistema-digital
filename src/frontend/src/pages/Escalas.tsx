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
import { Check, Loader2, Plus, Settings2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Escala } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const DEFAULT_MINISTERIOS = [
  "Oportunidade",
  "Oportunidade Ofertório",
  "Oportunidade Louvor",
  "Oportunidade Oração",
  "Início do Culto - Oração e Salmos",
  "Oportunidade Pregação",
  "Louvor",
  "Som",
  "Mídia",
  "Recepção",
  "Ensino",
  "Infantil",
];

const LS_KEY = "adprec_ministerios";

export function Escalas() {
  const { actor } = useActor();
  const { isAdmin } = useAuth();
  const { identity } = useInternetIdentity();
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newOption, setNewOption] = useState("");

  const [ministerios, setMinisterios] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_MINISTERIOS;
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    ministerio: "",
    volunteerName: "",
  });

  // Sync form.ministerio when ministerios changes
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      ministerio:
        prev.ministerio || (ministerios.length > 0 ? ministerios[0] : ""),
    }));
  }, [ministerios]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(ministerios));
  }, [ministerios]);

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
    if (!actor || !identity || !form.volunteerName || !form.ministerio) return;
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

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (ministerios.includes(trimmed)) {
      toast.error("Esta opção já existe.");
      return;
    }
    setMinisterios((prev) => [...prev, trimmed]);
    setNewOption("");
    toast.success("Opção adicionada!");
  };

  const handleRemoveOption = (option: string) => {
    if (ministerios.length <= 1) {
      toast.error("Não é possível remover a última opção.");
      return;
    }
    setMinisterios((prev) => prev.filter((m) => m !== option));
    setForm((prev) => ({
      ...prev,
      ministerio:
        prev.ministerio === option
          ? (ministerios.find((m) => m !== option) ?? "")
          : prev.ministerio,
    }));
    toast.success("Opção removida.");
  };

  const handleRestoreDefaults = () => {
    setMinisterios(DEFAULT_MINISTERIOS);
    toast.success("Opções restauradas para o padrão.");
  };

  if (loading)
    return (
      <div
        className="flex items-center justify-center h-48"
        data-ocid="escalas.loading_state"
      >
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="container py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Escalas de Voluntários</h1>
        {isAdmin && (
          <div className="flex gap-2">
            {/* Manage Options Dialog */}
            <Dialog open={manageOpen} onOpenChange={setManageOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-ocid="escalas.open_modal_button">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Gerenciar Opções
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" data-ocid="escalas.dialog">
                <DialogHeader>
                  <DialogTitle>Opções de Ministério</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                    {ministerios.map((m) => (
                      <div
                        key={m}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <span className="flex-1">{m}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(m)}
                          disabled={ministerios.length <= 1}
                          className="text-destructive hover:text-destructive/80 disabled:opacity-30 flex-shrink-0"
                          aria-label={`Remover ${m}`}
                          data-ocid="escalas.delete_button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova opção..."
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddOption();
                      }}
                      data-ocid="escalas.input"
                    />
                    <Button
                      onClick={handleAddOption}
                      data-ocid="escalas.primary_button"
                    >
                      Adicionar
                    </Button>
                  </div>

                  <div className="flex gap-2 justify-between pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestoreDefaults}
                      data-ocid="escalas.secondary_button"
                    >
                      Restaurar Padrões
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setManageOpen(false)}
                      data-ocid="escalas.close_button"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Nova Escala Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-ocid="escalas.open_modal_button">
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
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                      data-ocid="escalas.input"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Ministério / Oportunidade</Label>
                    <Select
                      value={form.ministerio}
                      onValueChange={(v) => setForm({ ...form, ministerio: v })}
                    >
                      <SelectTrigger data-ocid="escalas.select">
                        <SelectValue placeholder="Selecione uma opção" />
                      </SelectTrigger>
                      <SelectContent>
                        {ministerios.map((m) => (
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
                      data-ocid="escalas.input"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setOpen(false)}
                      data-ocid="escalas.cancel_button"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAdd}
                      disabled={saving}
                      data-ocid="escalas.submit_button"
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
          </div>
        )}
      </div>

      <div className="grid gap-3" data-ocid="escalas.list">
        {escalas.map((e, idx) => {
          const key = `${e.volunteerId.toText()}-${e.ministerio}-${e.date.toString()}`;
          return (
            <Card key={key} data-ocid={`escalas.item.${idx + 1}`}>
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
                        data-ocid="escalas.toggle"
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleConfirm(e, false)}
                        data-ocid="escalas.toggle"
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
          <p
            className="text-muted-foreground text-center py-8"
            data-ocid="escalas.empty_state"
          >
            Nenhuma escala encontrada.
          </p>
        )}
      </div>
    </div>
  );
}
