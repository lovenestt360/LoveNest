import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "És um assistente criativo para casais. Gera desafios únicos, divertidos e significativos para fortalecer a relação. Responde APENAS em JSON válido, sem markdown."
          },
          {
            role: "user",
            content: `Gera exatamente 5 ${catDesc}. Cada desafio deve ter um título curto (máx 50 caracteres) e uma descrição motivadora (máx 120 caracteres). Responde APENAS com um array JSON no formato: [{"title":"...","description":"..."}]`
          }
        ],
        temperature: 0.9,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse the JSON from the AI response
    let challenges;
    try {
      // Try to extract JSON array from the response
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
