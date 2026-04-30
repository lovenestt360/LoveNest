import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK: Record<string, { title: string; description: string }[]> = {
  romantico: [
    { title: "Jantar à luz de velas em casa", description: "Cozinhem juntos e criem uma noite especial sem sair de casa." },
    { title: "Carta de amor surpresa", description: "Escreve uma carta sincera e deixa-a num sítio inesperado." },
    { title: "Pôr do sol juntos", description: "Parem tudo e assistam ao pôr do sol num lugar bonito." },
    { title: "Noite sem telemóveis", description: "Uma noite inteira só para vocês dois, sem ecrãs." },
    { title: "Dança na sala", description: "Ponham uma música especial e dancem juntos em casa." },
  ],
  aventura: [
    { title: "Explorar um bairro novo", description: "Escolham um sítio que nunca visitaram e percorram-no a pé." },
    { title: "Piquenique surpresa", description: "Um de vocês organiza tudo em segredo e surpreende o outro." },
    { title: "Experimentar uma comida nova", description: "Escolham um restaurante de culinária que nunca provaram." },
    { title: "Caminhada na natureza", description: "Encontrem uma trilha e passem o dia ao ar livre juntos." },
    { title: "Road trip de um dia", description: "Escolham uma direção e descubram o que encontram pelo caminho." },
  ],
  comunicacao: [
    { title: "36 perguntas do amor", description: "Façam as 36 perguntas científicas que aproximam as pessoas." },
    { title: "Conversa sem julgamentos", description: "Partilhem um medo ou insegurança que nunca disseram em voz alta." },
    { title: "Carta para daqui a 5 anos", description: "Cada um escreve o que espera da relação no futuro." },
    { title: "Agradecer 3 coisas por dia", description: "Durante uma semana, digam 3 coisas que agradecem um ao outro." },
    { title: "Desligar e conversar 1 hora", description: "Uma hora inteira de conversa profunda sem distrações." },
  ],
  diversao: [
    { title: "Noite de jogos de tabuleiro", description: "Escolham 3 jogos e passem a noite a competir com boa disposição." },
    { title: "Cozinhar um prato novo juntos", description: "Escolham uma receita difícil e tentem fazer juntos." },
    { title: "Maratona de filmes temática", description: "Escolham um tema e vejam filmes o dia todo com snacks." },
    { title: "Desafio de karaoke em casa", description: "Cantem as músicas favoritas um do outro sem vergonha." },
    { title: "Aula de algo novo juntos", description: "Inscrevam-se numa aula — culinária, dança, pintura ou outra." },
  ],
  crescimento: [
    { title: "Ler o mesmo livro juntos", description: "Escolham um livro e discutam um capítulo por semana." },
    { title: "Definir objetivos do ano", description: "Sentem-se e escrevam juntos os objetivos para os próximos 12 meses." },
    { title: "Meditar juntos 10 minutos", description: "Experimentem uma sessão de meditação guiada em casal." },
    { title: "Voluntariado por um dia", description: "Encontrem uma causa e passem um dia a ajudar juntos." },
    { title: "Podcast ou documentário juntos", description: "Assistam a algo que vos ensine algo novo e debatam no final." },
  ],
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

    // Try Anthropic API first
    if (ANTHROPIC_API_KEY) {
      try {
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
            messages: [{
              role: "user",
              content: `Gera exatamente 5 ${catDesc}. Cada desafio deve ter um título curto (máx 50 caracteres) e uma descrição motivadora (máx 120 caracteres). Responde APENAS com um array JSON no formato: [{"title":"...","description":"..."}]`
            }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.content?.[0]?.text || "[]";
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          const challenges = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
          if (challenges.length > 0) {
            return new Response(JSON.stringify({ challenges }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch {
        // fall through to fallback
      }
    }

    // Fallback: return curated challenges for the category
    const fallback = FALLBACK[category] || FALLBACK.romantico;
    // Shuffle so it feels different each time
    const shuffled = fallback.sort(() => Math.random() - 0.5);

    return new Response(JSON.stringify({ challenges: shuffled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
