import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CheckSquare,
  Image,
  CalendarDays,
  BookOpen,
  HeartHandshake,
  Flame,
} from "lucide-react";

const quickActions = [
  { label: "Nova tarefa", icon: CheckSquare, path: "/tarefas?new=1" },
  { label: "Nova memória", icon: Image, path: "/memorias?new=1" },
  { label: "Novo evento", icon: CalendarDays, path: "/agenda?new=1" },
  { label: "Nova oração", icon: BookOpen, path: "/oracao?new=1" },
  { label: "Registar jejum", icon: Flame, path: "/jejum?register=1" },
  { label: "Nova reclamação", icon: HeartHandshake, path: "/conflitos?new=1" },
];

export function Fab() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const path = location.pathname;

  if (path !== "/") {
    return null;
  }

  const handleClick = () => {
    setMenuOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-[calc(theme(spacing.20)+1rem)] right-6 z-[110]">
        <Button
          type="button"
          size="icon"
          className="h-14 w-14 rounded-full shadow-[0_8px_30px_rgb(255,45,85,0.4)] bg-primary text-primary-foreground hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/50"
          aria-label="Adicionar"
          onClick={handleClick}
        >
          <Plus className="h-8 w-8" />
        </Button>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/50 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <SheetHeader>
            <SheetTitle className="text-left text-lg font-bold">Criar</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 pt-4">
            {quickActions.map(({ label, icon: Icon, path: to }) => (
              <button
                key={to}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(to);
                }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/50 p-4 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary active:scale-[0.97]"
              >
                <Icon className="h-6 w-6" />
                <span className="leading-tight text-center">{label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
