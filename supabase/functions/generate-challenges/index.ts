import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category } = await req.json();

    const categoryPrompts: Record<string, string> = {
      romantico: "desafios românticos e criativos para casais (encontros, surpresas, cartas de amor, jantares especiais)",
      aventura: "desafios de aventura e exploração para casais (viajar, experimentar coisas novas, atividades ao ar livre)",
      comunicacao: "desafios de comunicação e conexão emocional para casais (conversas profundas, perguntas, vulnerabilidade)",
      diversao: "desafios divertidos e lúdicos para casais (jogos, competições amigáveis, cozinhar juntos)",
      crescimento: "desafios de crescimento pessoal e espiritual para casais (leitura conjunta, oração, meditação, objetivos)"
    };

    const catDesc = categoryPrompts[category] || "desafios variados e criativos para casais";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: "És um assistente criativo para casais. Gera desafios únicos, divertidos e significativos para fortalecer a relação. Responde APENAS em JSON válido, sem markdown, sem explicações adicionais.",
        messages: [
          {
            role: "user",
            content: `Gera exatamente 5 ${catDesc}. Cada desafio deve ter um título curto (máx 50 caracteres) e uma descrição motivadora (máx 120 caracteres). Responde APENAS com um array JSON no formato: [{"title":"...","description":"..."}]`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "[]";

    let challenges;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      challenges = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      challenges = [];
    }

    return new Response(JSON.stringify({ challenges }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
