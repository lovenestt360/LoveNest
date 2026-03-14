import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, MessageCircle, Gift, Flame, Camera, Trophy, Smile, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface WrappedData {
  id: string;
  couple_space_id: string;
  month: number;
  year: number;
  messages_count: number;
  memories_count: number;
  challenges_completed: number;
  streak_days: number;
  mood_checkins: number;
  generated_at: string;
}

export default function LoveWrapped() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [wrappedList, setWrappedList] = useState<WrappedData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [houseName, setHouseName] = useState("LoveNest");
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!spaceId || !user) return;

    Promise.all([
      (supabase as any).from("love_wrapped").select("*")
        .eq("couple_space_id", spaceId)
        .order("year", { ascending: false })
        .order("month", { ascending: false }),
      supabase.from("couple_spaces").select("house_name").eq("id", spaceId).maybeSingle(),
      supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle(),
      (supabase as any).from("referrals").select("id", { count: "exact", head: true })
        .eq("referrer_user_id", user.id),
    ]).then(([wrappedRes, houseRes, profileRes, referralRes]) => {
      setWrappedList((wrappedRes.data as WrappedData[]) || []);
      setHouseName((houseRes.data as any)?.house_name || "LoveNest");
      setReferralCode((profileRes.data as any)?.referral_code || "");
      setReferralCount(referralRes.count ?? 0);
      setLoading(false);
    });
  }, [spaceId, user]);

  const current = wrappedList[currentIndex];

  const shareUrl = referralCode
    ? `${window.location.origin}/criar-conta?ref=${referralCode}`
    : window.location.origin;

  const shareText = current
    ? `💕 O nosso LoveWrapped de ${MONTH_NAMES[current.month]} ${current.year}!\n🔥 ${current.streak_days} dias de streak\n💬 ${current.messages_count} mensagens\n📸 ${current.memories_count} memórias\n\nJunta-te ao LoveNest: ${shareUrl}`
    : "";

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "LoveWrapped", text: shareText, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <section className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </section>
    );
  }

  return (
    <section className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          LoveWrapped
        </h1>
        <p className="text-sm text-muted-foreground">O resumo mensal do vosso amor.</p>
      </header>

      {wrappedList.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Ainda não há resumos gerados.</p>
            <p className="text-xs text-muted-foreground">O vosso primeiro LoveWrapped será gerado no início do próximo mês!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost" size="icon"
              disabled={currentIndex >= wrappedList.length - 1}
              onClick={() => setCurrentIndex(i => i + 1)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm font-semibold">
              {current && `${MONTH_NAMES[current.month]} ${current.year}`}
            </span>
            <Button
              variant="ghost" size="icon"
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex(i => i - 1)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Wrapped Card */}
          {current && (
            <div ref={cardRef} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-accent/20 border border-primary/20 p-6 space-y-5">
              {/* Header */}
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-primary font-bold">LoveWrapped</p>
                <h2 className="text-xl font-extrabold text-foreground">{houseName}</h2>
                <p className="text-sm text-muted-foreground">
                  {MONTH_NAMES[current.month]} {current.year}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatBox icon={<Flame className="w-5 h-5 text-orange-500" />} value={current.streak_days} label="Dias de Streak" />
                <StatBox icon={<MessageCircle className="w-5 h-5 text-blue-500" />} value={current.messages_count} label="Mensagens" />
                <StatBox icon={<Camera className="w-5 h-5 text-pink-500" />} value={current.memories_count} label="Memórias" />
                <StatBox icon={<Trophy className="w-5 h-5 text-yellow-500" />} value={current.challenges_completed} label="Desafios" />
              </div>

              {current.mood_checkins > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Smile className="w-4 h-4" />
                  <span>{current.mood_checkins} check-ins de humor</span>
                </div>
              )}

              {/* Branding */}
              <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                ❤️ LoveNest
              </p>
            </div>
          )}

          {/* Share Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-center">Partilhar</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-2">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
                <Copy className="w-4 h-4" /> Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={handleNativeShare} className="gap-2">
                <Share2 className="w-4 h-4" /> Partilhar
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Referral Stats */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Convites</p>
              <p className="text-xs text-muted-foreground">
                {referralCount > 0
                  ? `${referralCount} pessoa${referralCount !== 1 ? "s" : ""} convidada${referralCount !== 1 ? "s" : ""}`
                  : "Partilha o teu LoveWrapped e convida amigos!"}
              </p>
            </div>
          </div>
          {referralCode && (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono">
                {shareUrl}
              </code>
              <Button variant="ghost" size="icon" onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast({ title: "Link copiado!" });
              }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 text-center space-y-1">
      <div className="flex justify-center">{icon}</div>
      <p className="text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
    </div>
  );
}
