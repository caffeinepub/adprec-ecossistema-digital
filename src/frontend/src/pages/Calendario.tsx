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
import { Textarea } from "@/components/ui/textarea";
import { CalendarPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { Event } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";

function generateICS(event: Event): string {
  const start = new Date(Number(event.eventDate));
  const end = new Date(Number(event.eventDate) + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ADPREC//App//PT",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(event: Event) {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/ /g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function Calendario() {
  const { actor } = useActor();
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "10:00",
    description: "",
  });

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const data = await actor.getAllEvents();
      setEvents(data.sort((a, b) => Number(a.eventDate) - Number(b.eventDate)));
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!actor || !form.title || !form.date) return;
    setSaving(true);
    try {
      let posterImage: ExternalBlob | undefined;
      if (posterFile) {
        const bytes = new Uint8Array(await posterFile.arrayBuffer());
        posterImage = ExternalBlob.fromBytes(bytes);
      }
      const dt = new Date(`${form.date}T${form.time}`);
      await actor.addEvent({
        title: form.title,
        description: form.description,
        eventDate: BigInt(dt.getTime()),
        posterImage,
      });
      toast.success("Evento criado!");
      setForm({ title: "", date: "", time: "10:00", description: "" });
      setPosterFile(null);
      setOpen(false);
      load();
    } catch {
      toast.error("Erro ao criar evento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (title: string) => {
    if (!actor) return;
    await actor.removeEvent(title);
    toast.success("Evento removido.");
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
        <h1 className="text-2xl font-bold">Calendário</h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Evento</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label>Título</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={form.time}
                      onChange={(e) =>
                        setForm({ ...form, time: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Cartaz (imagem)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
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

      <div className="grid gap-4">
        {events.map((ev) => (
          <Card key={ev.title}>
            <CardContent className="pt-4">
              <div className="flex gap-4">
                {ev.posterImage && (
                  <img
                    src={ev.posterImage.getDirectURL()}
                    alt={ev.title}
                    className="h-24 w-24 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{ev.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(Number(ev.eventDate)).toLocaleString(
                          "pt-BR",
                          { dateStyle: "full", timeStyle: "short" },
                        )}
                      </p>
                      {ev.description && (
                        <p className="text-sm mt-2">{ev.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadICS(ev)}
                      >
                        <CalendarPlus className="h-4 w-4 mr-1" />
                        Agenda
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(ev.title)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Nenhum evento cadastrado.
          </p>
        )}
      </div>
    </div>
  );
}
