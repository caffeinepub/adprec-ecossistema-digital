import {
  Calendar,
  ClipboardList,
  DollarSign,
  Heart,
  Settings,
  ShoppingBag,
  Target,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { NotificationBanners } from "../components/NotificationBanners";
import { useAuth } from "../hooks/useAuth";

const modules = [
  {
    path: "/membros",
    label: "Membros",
    icon: Users,
    description: "Cadastro e perfis",
  },
  {
    path: "/calendario",
    label: "Calendário",
    icon: Calendar,
    description: "Eventos da igreja",
  },
  {
    path: "/financeiro",
    label: "Dízimos",
    icon: DollarSign,
    description: "Contribuições",
  },
  {
    path: "/cantina",
    label: "Cantina",
    icon: ShoppingBag,
    description: "Consumo e débitos",
  },
  {
    path: "/projetos",
    label: "Projetos",
    icon: Target,
    description: "Vaquinhas",
  },
  {
    path: "/escalas",
    label: "Escalas",
    icon: ClipboardList,
    description: "Voluntários",
  },
  {
    path: "/oracao",
    label: "Oração",
    icon: Heart,
    description: "Mural de intercessão",
  },
];

export function Home() {
  const { isAdmin } = useAuth();

  return (
    <div className="container py-8 pb-24 lg:pb-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold tracking-tight mb-2">ADPREC</h1>
        <p className="text-muted-foreground text-lg">
          Seja bem-vindo à Família ADPREC
        </p>
      </div>

      {/* Notifications */}
      <NotificationBanners />

      {/* Module Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {modules.map(({ path, label, icon: Icon, description }) => (
          <Link
            key={path}
            to={path}
            className="group flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:bg-accent hover:border-foreground/30 transition-all duration-200"
          >
            <Icon className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-colors" />
            <div className="text-center">
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {description}
              </div>
            </div>
          </Link>
        ))}
        {isAdmin && (
          <Link
            to="/admin"
            className="group flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:bg-accent hover:border-foreground/30 transition-all duration-200"
          >
            <Settings className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-colors" />
            <div className="text-center">
              <div className="font-semibold text-sm">Admin</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Gestão completa
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
