import { useState } from "react";
import { Loader2, Droplets, CircleDashed, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buyGuardianItem, type ShopItemKey } from "@/lib/shop";
import { useGuardianState } from "./useGuardianState";

interface ShopItem {
  key: ShopItemKey;
  Icon: React.ElementType;
  title: string;
  description: string;
  price: number;
}

const ITEMS: ShopItem[] = [
  {
    key: "glow_graphite",
    Icon: Droplets,
    title: "Brilho Grafite",
    description: "Troca o brilho do Guardião de rosa para grafite.",
    price: 150,
  },
  {
    key: "guardian_ring",
    Icon: CircleDashed,
    title: "Anel do Guardião",
    description: "Desbloqueia o anel à volta do Guardião antes da Eternidade.",
    price: 300,
  },
];

interface ShopProps {
  coupleSpaceId: string | null;
  totalPoints: number;
  userId?: string;
  isSolo: boolean;
  onPurchased: () => void;
}

export function Shop({ coupleSpaceId, totalPoints, userId, isSolo, onPurchased }: ShopProps) {
  const { purchasedItems, refresh } = useGuardianState(coupleSpaceId);
  const [buying, setBuying] = useState<ShopItemKey | null>(null);

  const handleBuy = async (item: ShopItem) => {
    if (!coupleSpaceId || buying) return;
    setBuying(item.key);
    try {
      const { status } = await buyGuardianItem(coupleSpaceId, item.key, userId);
      if (status === "ok") {
        toast.success(`${item.title} desbloqueado`);
        await Promise.all([refresh(), onPurchased()]);
      } else if (status === "insufficient_points") {
        toast.error("LovePoints insuficientes para esta personalização.");
      } else if (status === "already_purchased") {
        toast.error("Já tens esta personalização.");
      } else {
        toast.error("Não foi possível concluir a compra.");
      }
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="glass-card divide-y divide-border overflow-hidden">
      {ITEMS.map((item) => {
        const owned = purchasedItems.has(item.key);
        const canAfford = totalPoints >= item.price;
        return (
          <div key={item.key} className="flex items-center gap-4 p-4">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              owned ? "bg-rose-100 dark:bg-rose-950/40 text-rose-500" : "bg-muted text-muted-foreground"
            )}>
              <item.Icon className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{item.description}</p>
            </div>
            {owned ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 shrink-0">
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> Ativo
              </span>
            ) : (
              <button
                onClick={() => handleBuy(item)}
                disabled={buying !== null || !canAfford}
                className={cn(
                  "h-9 px-3 rounded-xl text-xs font-semibold shrink-0 transition-all active:scale-[0.97]",
                  canAfford ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground/60",
                  buying !== null && "opacity-60"
                )}
              >
                {buying === item.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `${item.price} pts`}
              </button>
            )}
          </div>
        );
      })}
      <p className="p-4 text-[11px] text-muted-foreground leading-relaxed">
        {isSolo ? "Personaliza o teu Guardião — puramente estético, nunca afeta a tua chama." : "Personalizem o vosso Guardião — puramente estético, nunca afeta a vossa chama."}
      </p>
    </div>
  );
}
