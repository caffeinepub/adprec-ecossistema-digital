import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Edit, Loader2, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { Member } from "../backend";
import { Cargo, MemberStatus } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

// All available cargo roles (extends beyond the backend Cargo enum)
const CARGO_OPTIONS: { value: string; label: string }[] = [
  { value: "membro", label: "Membro" },
  { value: "obreiro", label: "Obreiro/a" },
  { value: "diacono", label: "Diácono" },
  { value: "diaconisa", label: "Diaconisa" },
  { value: "evangelista", label: "Evangelista" },
  { value: "presbitero", label: "Presbítero" },
  { value: "pastor", label: "Pastor" },
  { value: "admin", label: "Administrador" },
];

function cargoLabel(cargo: string): string {
  const found = CARGO_OPTIONS.find((o) => o.value === cargo);
  return found ? found.label : cargo;
}

function MemberForm({
  member,
  onSave,
  onClose,
}: {
  member?: Member;
  onSave: () => void;
  onClose: () => void;
}) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: member?.name || "",
    phone: member?.phone || "",
    cargo: (member?.cargo as string) || Cargo.membro,
    lgpd: member?.lgpd ?? true,
    birthDate: member?.birthDate
      ? new Date(Number(member.birthDate)).toISOString().split("T")[0]
      : "",
    entryDate: member?.entryDate
      ? new Date(Number(member.entryDate)).toISOString().split("T")[0]
      : "",
  });

  const handleSave = async () => {
    if (!actor || !identity) return;
    setSaving(true);
    try {
      let photo = member?.photo;
      if (photoFile) {
        const bytes = new Uint8Array(await photoFile.arrayBuffer());
        photo = ExternalBlob.fromBytes(bytes);
      }
      const updated: Member = {
        id: identity.getPrincipal(),
        name: form.name,
        phone: form.phone,
        cargo: form.cargo as Cargo,
        lgpd: form.lgpd,
        status: member?.status || MemberStatus.pending,
        todaysBirthday: member?.todaysBirthday ?? false,
        photo,
        birthDate: form.birthDate
          ? BigInt(new Date(form.birthDate).getTime())
          : undefined,
        entryDate: form.entryDate
          ? BigInt(new Date(form.entryDate).getTime())
          : undefined,
      };
      await actor.upsertMember(updated);
      toast.success("Perfil salvo com sucesso!");
      onSave();
      onClose();
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label>Nome</Label>
        <Input
          data-ocid="membros.input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nome completo"
        />
      </div>
      <div className="grid gap-2">
        <Label>Telefone</Label>
        <Input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="(00) 00000-0000"
        />
      </div>
      <div className="grid gap-2">
        <Label>Cargo</Label>
        <Select
          value={form.cargo}
          onValueChange={(v) => setForm({ ...form, cargo: v })}
        >
          <SelectTrigger data-ocid="membros.select">
            <SelectValue placeholder="Selecione o cargo" />
          </SelectTrigger>
          <SelectContent>
            {CARGO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Data de Nascimento</Label>
        <Input
          type="date"
          value={form.birthDate}
          onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Data de Ingresso</Label>
        <Input
          type="date"
          value={form.entryDate}
          onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
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
      <div className="flex items-center gap-2">
        <Switch
          checked={form.lgpd}
          onCheckedChange={(v) => setForm({ ...form, lgpd: v })}
          id="lgpd"
          data-ocid="membros.switch"
        />
        <Label htmlFor="lgpd">Autorizo exibição de dados (LGPD)</Label>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          data-ocid="membros.cancel_button"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          data-ocid="membros.submit_button"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar
        </Button>
      </div>
    </div>
  );
}

export function Membros() {
  const { actor } = useActor();
  const { isAdmin } = useAuth();
  const { identity } = useInternetIdentity();
  const [members, setMembers] = useState<Member[]>([]);
  const [ownMember, setOwnMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | undefined>();

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      if (isAdmin) {
        const all = await actor.getAllMembers();
        setMembers(all);
      } else if (identity) {
        const me = await actor.getMember(identity.getPrincipal());
        setOwnMember(me);
      }
    } finally {
      setLoading(false);
    }
  }, [actor, isAdmin, identity]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const calcAge = (birthDate?: bigint) => {
    if (!birthDate) return null;
    const diff = Date.now() - Number(birthDate);
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const calcTenure = (entryDate?: bigint) => {
    if (!entryDate) return null;
    const diff = Date.now() - Number(entryDate);
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
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
        <h1 className="text-2xl font-bold">Membros</h1>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() =>
                setEditTarget(isAdmin ? undefined : ownMember || undefined)
              }
              data-ocid="membros.open_modal_button"
            >
              {isAdmin ? "Adicionar Membro" : "Editar Perfil"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-ocid="membros.dialog">
            <DialogHeader>
              <DialogTitle>
                {editTarget ? "Editar Membro" : "Novo Membro"}
              </DialogTitle>
            </DialogHeader>
            <MemberForm
              member={editTarget}
              onSave={load}
              onClose={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isAdmin ? (
        <>
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 max-w-xs"
            data-ocid="membros.search_input"
          />
          <div className="grid gap-3" data-ocid="membros.list">
            {filtered.map((m, idx) => (
              <Card
                key={m.id.toText()}
                className="flex items-center"
                data-ocid={`membros.item.${idx + 1}`}
              >
                <CardContent className="flex items-center gap-4 py-3 w-full">
                  {m.photo ? (
                    <img
                      src={m.photo.getDirectURL()}
                      alt={m.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {cargoLabel(m.cargo as string)}
                      {m.lgpd && m.birthDate
                        ? ` · ${calcAge(m.birthDate)} anos`
                        : ""}
                      {m.lgpd && m.entryDate
                        ? ` · ${calcTenure(m.entryDate)} ano(s) de igreja`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        m.status === MemberStatus.active
                          ? "status-active"
                          : "status-pending"
                      }
                    >
                      {m.status === MemberStatus.active ? "Ativo" : "Pendente"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-ocid={`membros.edit_button.${idx + 1}`}
                      onClick={() => {
                        setEditTarget(m);
                        setEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p
                className="text-muted-foreground text-center py-8"
                data-ocid="membros.empty_state"
              >
                Nenhum membro encontrado.
              </p>
            )}
          </div>
        </>
      ) : ownMember ? (
        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {ownMember.photo && (
              <img
                src={ownMember.photo.getDirectURL()}
                alt="foto"
                className="h-20 w-20 rounded-full object-cover"
              />
            )}
            <div>
              <span className="text-muted-foreground text-sm">Nome: </span>
              {ownMember.name}
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Cargo: </span>
              {cargoLabel(ownMember.cargo as string)}
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Telefone: </span>
              {ownMember.phone}
            </div>
            {ownMember.lgpd && ownMember.birthDate && (
              <div>
                <span className="text-muted-foreground text-sm">Idade: </span>
                {calcAge(ownMember.birthDate)} anos
              </div>
            )}
            {ownMember.lgpd && ownMember.entryDate && (
              <div>
                <span className="text-muted-foreground text-sm">
                  Tempo de Igreja:{" "}
                </span>
                {calcTenure(ownMember.entryDate)} ano(s)
              </div>
            )}
            <div>
              <span className="text-muted-foreground text-sm">LGPD: </span>
              {ownMember.lgpd ? "Autorizado" : "Não autorizado"}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Nenhum perfil cadastrado ainda.
          </p>
          <Button
            data-ocid="membros.primary_button"
            onClick={() => {
              setEditTarget(undefined);
              setEditOpen(true);
            }}
          >
            Criar Perfil
          </Button>
        </div>
      )}
    </div>
  );
}
