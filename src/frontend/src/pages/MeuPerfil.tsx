import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  ArrowRight,
  Cake,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Lock,
  Pencil,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { CantinaRecord, Escala, Event, Member, Tithe } from "../backend";
import { type Cargo, MemberStatus, PaymentStatus } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

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
  return CARGO_OPTIONS.find((o) => o.value === cargo)?.label ?? cargo;
}

function calcMembershipTime(entryDate?: bigint): string {
  if (!entryDate) return "—";
  const diffMs = Date.now() - Number(entryDate);
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years > 0 && months > 0)
    return `${years} ano${years > 1 ? "s" : ""} e ${months} mês${months > 1 ? "es" : ""}`;
  if (years > 0) return `${years} ano${years > 1 ? "s" : ""}`;
  if (months > 0) return `${months} mês${months > 1 ? "es" : ""}`;
  return "Menos de 1 mês";
}

function calcDaysToBirthday(
  birthDate?: bigint,
): { days: number; isToday: boolean } | null {
  if (!birthDate) return null;
  const birth = new Date(Number(birthDate));
  const now = new Date();
  const nextBirthday = new Date(
    now.getFullYear(),
    birth.getMonth(),
    birth.getDate(),
  );
  if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1);
  const diffMs = nextBirthday.getTime() - now.setHours(0, 0, 0, 0);
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return { days, isToday: days === 0 };
}

function EditProfileDialog({
  member,
  isAdmin,
  onSave,
}: {
  member: Member;
  isAdmin: boolean;
  onSave: () => void;
}) {
  const { actor } = useActor();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [phone, setPhone] = useState(member.phone);
  const [cargo, setCargo] = useState(member.cargo as string);

  const handleSave = async () => {
    if (!actor) return;
    setSaving(true);
    try {
      let photo = member.photo;
      if (photoFile) {
        const bytes = new Uint8Array(await photoFile.arrayBuffer());
        photo = ExternalBlob.fromBytes(bytes);
      }
      const updated: Member = {
        ...member,
        phone,
        cargo: cargo as Cargo,
        photo,
      };
      await actor.upsertMember(updated);
      toast.success("Perfil atualizado com sucesso!");
      onSave();
      setOpen(false);
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-ocid="perfil.open_modal_button"
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Editar Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-ocid="perfil.dialog">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Foto</Label>
            <Input
              type="file"
              accept="image/*"
              data-ocid="perfil.upload_button"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Telefone</Label>
            <Input
              value={phone}
              data-ocid="perfil.input"
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          {isAdmin && (
            <div className="grid gap-2">
              <Label>Cargo</Label>
              <Select value={cargo} onValueChange={setCargo}>
                <SelectTrigger data-ocid="perfil.select">
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
              <p className="text-xs text-muted-foreground">
                Apenas administradores podem alterar o cargo.
              </p>
            </div>
          )}
          {!isAdmin && (
            <p className="text-xs text-muted-foreground border border-border rounded-md p-2">
              🔒 Cargo e nível de acesso só podem ser alterados por um
              Administrador.
            </p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-ocid="perfil.cancel_button"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              data-ocid="perfil.save_button"
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
  );
}

export function MeuPerfil() {
  const { actor } = useActor();
  const { isAdmin } = useAuth();
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [cantinaRecords, setCantinaRecords] = useState<CantinaRecord[]>([]);
  const [tithes, setTithes] = useState<Tithe[]>([]);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [confirmingEscala, setConfirmingEscala] = useState(false);

  const loadData = useCallback(async () => {
    if (!actor || !identity) return;
    setLoading(true);
    try {
      const principal = identity.getPrincipal();
      const [memberData, cantinaData, titheData, escalasData, eventsData] =
        await Promise.all([
          actor.getMember(principal),
          actor.getOwnCantinaRecords(),
          actor.getOwnTithes(),
          actor.getMemberScales(principal),
          actor.getAllEvents(),
        ]);
      setMember(memberData);
      setCantinaRecords(cantinaData);
      setTithes(titheData);
      setEscalas(escalasData);
      setEvents(eventsData);
    } finally {
      setLoading(false);
    }
  }, [actor, identity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmAttendance = async (escala: Escala) => {
    if (!actor) return;
    setConfirmingEscala(true);
    try {
      await actor.editScale({ ...escala, confirmed: true });
      toast.success("Presença confirmada!");
      loadData();
    } catch {
      toast.error("Erro ao confirmar presença.");
    } finally {
      setConfirmingEscala(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        data-ocid="perfil.loading_state"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!member) {
    return (
      <div
        className="container py-12 pb-24 lg:pb-12 text-center"
        data-ocid="perfil.empty_state"
      >
        <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Perfil não encontrado</h2>
        <p className="text-muted-foreground mb-6">
          Você ainda não possui um perfil cadastrado. Crie seu perfil na página
          de Membros.
        </p>
        <Button
          onClick={() => navigate("/membros")}
          data-ocid="perfil.primary_button"
        >
          Ir para Membros
        </Button>
      </div>
    );
  }

  // Computed values
  const owingRecords = cantinaRecords.filter(
    (r) => r.paymentStatus === PaymentStatus.owing,
  );
  const totalDebt = owingRecords.reduce((sum, r) => sum + r.amount, 0);

  const now = Date.now();
  const futureEscalas = escalas
    .filter((e) => Number(e.date) > now)
    .sort((a, b) => Number(a.date) - Number(b.date));
  const nextEscala = futureEscalas[0] ?? null;

  const futureEvents = events
    .filter((e) => Number(e.eventDate) > now)
    .sort((a, b) => Number(a.eventDate) - Number(b.eventDate))
    .slice(0, 3);

  const birthdayInfo = member.lgpd
    ? calcDaysToBirthday(member.birthDate)
    : null;
  const showBirthdayCard = birthdayInfo !== null && birthdayInfo.days <= 30;

  const photoUrl = member.photo?.getDirectURL();
  const initials = member.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="container py-8 pb-24 lg:pb-8 max-w-2xl">
      {/* Privacy notice */}
      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-6">
        <Lock className="h-3 w-3" />
        Visão privada — somente você vê estes dados
      </p>

      {/* ── User Header Card ── */}
      <Card className="mb-4" data-ocid="perfil.card">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 text-2xl">
              {photoUrl ? (
                <AvatarImage
                  src={photoUrl}
                  alt={member.name}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="text-xl font-bold">
                {initials || <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight truncate">
                {member.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {isAdmin ? (
                  <Badge className="bg-foreground text-background text-xs font-semibold">
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Membro
                  </Badge>
                )}
                {member.status === MemberStatus.active ? (
                  <Badge
                    variant="outline"
                    className="text-xs text-green-600 border-green-600"
                  >
                    Ativo
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs text-yellow-600 border-yellow-600"
                  >
                    Pendente
                  </Badge>
                )}
              </div>
              {member.phone && (
                <p className="text-sm text-muted-foreground mt-1">
                  {member.phone}
                </p>
              )}
            </div>
            <EditProfileDialog
              member={member}
              isAdmin={isAdmin}
              onSave={loadData}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Membership Status Card ── */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Situação na Igreja</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Cargo
            </p>
            <p className="font-semibold">
              {cargoLabel(member.cargo as string)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Tempo de Igreja
            </p>
            {member.lgpd ? (
              <p className="font-semibold">
                {calcMembershipTime(member.entryDate)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Oculto (privacidade)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Birthday Countdown ── */}
      {showBirthdayCard && birthdayInfo && (
        <Card className="mb-4 border-yellow-400/50 bg-yellow-50/10">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <Cake className="h-8 w-8 text-yellow-500 shrink-0" />
              <div>
                {birthdayInfo.isToday ? (
                  <p className="font-bold text-lg">
                    🎂 Feliz aniversário, {member.name.split(" ")[0]}!
                  </p>
                ) : (
                  <>
                    <p className="font-semibold">
                      🎂 Seu aniversário em {birthdayInfo.days} dia
                      {birthdayInfo.days !== 1 ? "s" : ""}!
                    </p>
                    {member.birthDate && (
                      <p className="text-sm text-muted-foreground">
                        {new Date(Number(member.birthDate)).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "numeric",
                            month: "long",
                          },
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Financial Summary Card ── */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {totalDebt > 0 ? (
            <p
              className="text-red-500 font-bold text-lg"
              data-ocid="perfil.error_state"
            >
              R$ {totalDebt.toFixed(2).replace(".", ",")} em aberto na cantina
            </p>
          ) : (
            <p
              className="text-green-600 font-semibold"
              data-ocid="perfil.success_state"
            >
              ✓ Sem débitos na cantina
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {owingRecords.length > 0
              ? `${owingRecords.length} item${owingRecords.length > 1 ? "s" : ""} em aberto`
              : `${tithes.length} contribuição${tithes.length !== 1 ? "ões" : ""} registrada${tithes.length !== 1 ? "s" : ""}`}
          </p>
          <Button
            variant="ghost"
            className="w-fit p-0 h-auto text-sm font-medium text-foreground hover:text-foreground/80 flex items-center gap-1"
            onClick={() => navigate("/financeiro")}
            data-ocid="perfil.link"
          >
            Ver histórico de dízimos
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* ── Personal Schedule Card ── */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Meu Próximo Serviço
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextEscala ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-lg">{nextEscala.ministerio}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(Number(nextEscala.date)).toLocaleDateString(
                    "pt-BR",
                    {
                      dateStyle: "full",
                    },
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {nextEscala.confirmed ? (
                  <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Presença Confirmada
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleConfirmAttendance(nextEscala)}
                    disabled={confirmingEscala}
                    data-ocid="perfil.primary_button"
                  >
                    {confirmingEscala ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : null}
                    Confirmar Presença
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p
              className="text-muted-foreground text-sm"
              data-ocid="perfil.empty_state"
            >
              Nenhum serviço agendado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Upcoming Events Card ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {futureEvents.length > 0 ? (
            <div className="flex flex-col gap-3" data-ocid="perfil.list">
              {futureEvents.map((ev, idx) => (
                <div
                  key={`${ev.title}-${ev.eventDate.toString()}`}
                  className="flex items-start gap-3"
                  data-ocid={`perfil.item.${idx + 1}`}
                >
                  <div className="h-2 w-2 rounded-full bg-foreground mt-2 shrink-0" />
                  <div>
                    <p className="font-medium leading-tight">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(Number(ev.eventDate)).toLocaleDateString(
                        "pt-BR",
                        {
                          dateStyle: "long",
                        },
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p
              className="text-muted-foreground text-sm"
              data-ocid="perfil.empty_state"
            >
              Nenhum evento próximo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
