import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function MemoriesHomeCard() {
  const spaceId = useCoupleSpaceId();
  const navigate = useNavigate();
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!spaceId) return;
    supabase
      .from("photos")
      .select("file_path", { count: "exact" })
      .eq("couple_space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data, count: c }) => {
        setCount(c ?? 0);
        if (data?.[0]) {
          supabase.storage.from("memories").createSignedUrl(data[0].file_path, 3600).then(({ data: d }) => {
            if (d) setThumbUrl(d.signedUrl);
          });
        }
      });
  }, [spaceId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Memórias</CardTitle>
        <CardDescription>{count === 0 ? "Ainda sem fotos." : `${count} foto${count !== 1 ? "s" : ""}`}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {thumbUrl && (
          <img src={thumbUrl} alt="Última memória" className="w-full h-32 rounded-lg object-cover" />
        )}
        {!thumbUrl && count === 0 && (
          <p className="text-sm text-muted-foreground">Adiciona a primeira foto! 📸</p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/memorias")}>
            Ver memórias
          </Button>
          <Button size="sm" className="flex-1" onClick={() => navigate("/memorias?new=1")}>
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
