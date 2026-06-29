# LoveNest Progress System
### Documento de Visão de Produto + Roteiro Técnico
**Versão:** 1.0 — 2026-06-29
**Estado:** Aprovado para implementação faseada. Nenhuma linha de código foi alterada ainda — este documento é o ponto de partida.

---

## Como usar este documento

Este ficheiro é a fonte de verdade para a transição do sistema de gamificação
da LoveNest ("Chama", "Pontos", "Ranking") para a **Jornada** — um sistema de
evolução pessoal/do casal, sem competição pública.

Está escrito para ser lido por fases, em sessões de desenvolvimento separadas.
Cada fase tem: contexto, o que constrói em cima do que já existe, ficheiros
exatos a tocar, e critérios de aceitação. Quando abrires uma sessão nova para
continuar este trabalho, aponta para a fase em que ficaste — não é preciso
reler o documento inteiro.

**Regra de oro:** nada aqui se constrói do zero. Em cada secção, identifico
exatamente o que já existe no código de hoje e como evolui. A LoveNest já tem
80% da fundação técnica desta visão — falta a casca visual e conceptual certa,
e três peças novas (Companheiro, Cerimónias, ledger de LovePoints).

---

## 1. Visão & Filosofia

### 1.1 A mudança

Hoje a LoveNest tem três conceitos lado a lado, sem uma narrativa que os una:
**Chama** (streak diário), **Pontos** (moeda de troca por LoveShields), e
**Ranking** (lista pública de casas ordenadas por pontos/streak).

O Ranking, por definição, transforma o crescimento de um casal numa
comparação com estranhos. Isso contradiz o que a LoveNest é — um espaço
íntimo, não uma tabela de classificação. E para quem usa o modo solo, aparecer
num "ranking de casais" é uma situação que nunca devia ter existido.

A mudança proposta:

> **Sai:** competir com outros casais.
> **Entra:** orgulho da própria jornada.

Tudo o que hoje é "pontos para comprar escudos" passa a ser um ecossistema
com sentido: **LovePoints**, ganhos por investir na relação (ou em ti
próprio, no modo solo), trocáveis por personalização, e visíveis através de
um **Nível da Jornada** e de um **Companheiro** que cresce contigo.

### 1.2 O slogan

> **"Na LoveNest, não competes com outros casais. Cresces ao lado da pessoa que escolheste."**

Para quem está em modo solo, a mesma frase aplica-se trocando "a pessoa que
escolheste" por "a tua própria jornada" — o sistema é o mesmo, o significado
adapta-se (ver secção 5.4).

### 1.3 Porque é que isto é defensável (não é só estética)

- **Diferenciação real.** Apps de hábitos/produtividade competem por
  ranking e streaks. Apps de relacionamento (Lasting, Paired, Between)
  não têm um sistema de evolução visual com personagem. Ninguém no
  espaço de "apps de casais" tem um Companheiro.
- **Reduz ansiedade, não a aumenta.** Ranking público gera comparação
  ansiosa ("estamos em #47"). Jornada gera orgulho próprio
  ("chegámos à Eternidade").
- **Já temos a escada de níveis construída.** `getRelationshipState()`
  em `src/components/LoveStreakCard.tsx` já tem Faísca → Brasa → Chama
  → Chama Viva → Farol → Eternidade. Não se inventa nada — **estende-se**.
- **Já temos os pontos, só falta o significado.** A tabela `public.points`
  e a função `get_total_points()` já existem. Hoje só servem para comprar
  LoveShields. Vamos dar-lhes um ecossistema completo.

---

## 2. Glossário — de/para

| Conceito antigo | Conceito novo | Estado |
|---|---|---|
| Ranking | *(removido)* | Sai por completo, ver secção 3 |
| Pontos | LovePoints | Mesma tabela `points`, novo significado e UI |
| Chama / Streak | A Nossa Chama | Mantém-se quase igual, passa a viver dentro da Jornada |
| LoveStreak (página `/lovestreak`) | Jornada (`/jornada`) | Reestruturada, ver secção 4 |
| *(não existe)* | O Guardião | Novo — companheiro visual evolutivo |
| Nível de relação (`getRelationshipState`) | Nível da Jornada | Estende a escada existente com LovePoints |
| *(não existe)* | Cerimónias | Novo — momentos de celebração partilháveis |

---

## 3. O que sai — remoção do Ranking

### 3.1 Decisão

O Ranking Global sai por completo da aplicação. Não fica como toggle
desativado por defeito — sai do código. Isto é deliberado: manter código
morto "desligado por defeito" é dívida técnica disfarçada, e o objetivo é
simplificar, não acumular.

### 3.2 O que remover, ficheiro a ficheiro

| Ficheiro | Ação |
|---|---|
| `src/pages/Ranking.tsx` | Apagar por completo |
| `src/components/RankingCard.tsx` | Apagar por completo |
| `src/App.tsx` | Remover `<Route path="ranking" .../>` e o `lazy import` de `Ranking` |
| `src/pages/LoveStreak.tsx` | Remover as duas instâncias de `<RankingCard .../>` (separadores "Chama" e "Amor") e os títulos "Casais mais dedicados — Chama/Amor" |
| `src/pages/admin/Features.tsx` | Remover `"home_ranking"` de `DEFAULT_FEATURE_KEYS` |
| `supabase/migrations/` | Nova migration que faz `DROP FUNCTION IF EXISTS public.fn_get_global_ranking(TEXT);` e remove a entrada `'ranking'` de `feature_tiers` (se existir) |
| `src/app/layout/BottomTabs.tsx` | Confirmar que não há nenhuma entrada `/ranking` em `moreItems` (já não deveria ter, mas confirmar) |

### 3.3 O que NÃO sai

- A tabela `couple_spaces.streak_count`, `couple_spaces.is_verified`,
  `couple_spaces.house_image` — continuam a existir, só deixam de
  alimentar uma lista pública. `is_verified`/`house_image` passam a ser
  usados só no perfil da própria Jornada (ver secção 4).
- A tabela `public.points` e `get_total_points()` — ficam, são a base do
  LovePoints.

---

## 4. A Jornada — arquitetura geral

### 4.1 Rota e navegação

- `/lovestreak` → renomear para `/jornada` (manter um redirect de
  `/lovestreak` para `/jornada` durante uns meses, para não partir links
  guardados/atalhos PWA).
- Continua acessível a partir do mesmo sítio onde `LoveStreakCard` (a
  reformular, ver 4.3) vive hoje na Home.
- Separadores atuais "Chama / Amor / Gestos" → tornam-se secções dentro
  de uma única página de Jornada com scroll, **não separadores
  independentes**. A proposta de informação não compete mais por atenção
  em tabs — é uma narrativa de cima para baixo:

```
┌─────────────────────────────┐
│  Cabeçalho: Nível da Jornada │  ← novo, secção 6
│  + O Guardião                │  ← novo, secção 5
├─────────────────────────────┤
│  A Nossa Chama                │  ← já existe, secção 4.2
├─────────────────────────────┤
│  LovePoints (saldo + loja)    │  ← secção 7
├─────────────────────────────┤
│  Gestos de hoje                │  ← já existe (missions.ts), inalterado
├─────────────────────────────┤
│  Conquistas / Cerimónias       │  ← secção 8
└─────────────────────────────┘
```

Isto substitui o `TabBar` de 3 separadores (`Flame`/`Coins`/`Target`) por
uma página única. Reduz saltos de contexto e dá à Jornada a sensação de
"perfil vivo", não de "painel de jogo".

### 4.2 A Nossa Chama (inalterada na lógica, com novo enquadramento)

Tudo o que já existe em `useStreak.ts`, `getCurrentPhase`,
`STREAK_MILESTONES`, o anel de progresso e o `FlameAlertBar` continuam
exatamente como estão. A única mudança é de moldura: a Chama deixa de ser
"a página principal" e passa a ser "o primeiro capítulo dentro da Jornada".

### 4.3 `LoveStreakCard.tsx` na Home

Mantém-se na Home, mas o conteúdo interno evolui em fases (ver Fase 2):
primeiro só troca o link de saída e o texto "Casais mais dedicados" some
(já não existe, foi removido com o Ranking); depois ganha uma prévia
pequena do Guardião.

### 4.4 Modo solo vs. casal

Toda a Jornada (Chama, Guardião, LovePoints, Nível, Gestos) já está
desenhada — nesta mesma sessão — para funcionar em modo solo: o
threshold de missões já é `1` para solo (`useStreak.ts`, `missions.ts`),
e os textos já têm variante singular onde a gramática o exige. A Jornada
não introduz uma segunda lógica solo: **reaproveita a que já existe**.

---

## 5. O Guardião

### 5.1 Nome

**Guardião.** Não "pet" (infantiliza), não "Espírito da Casa" (académico
demais para um label de UI pequeno), não "Luz do Ninho" (bonito mas
verboso em contexto de botão/título). "Guardião" é uma palavra que já
ressoa com o vocabulário existente da app — `LoveShield`, "proteger a
chama" — e funciona igualmente bem no singular para modo solo ("o teu
Guardião") e modo casal ("o vosso Guardião").

### 5.2 O que é, visualmente — e o que é realista construir

Há duas formas de construir isto, com custos muito diferentes:

**Opção A — Personagem ilustrada (não recomendada para v1).**
Um conjunto de ilustrações desenhadas à mão (estilo Apple Memoji/Bitmoji
simplificado) para cada estágio de evolução, com poses/acessórios
diferentes. Isto exige um ilustrador — não é uma tarefa de
"escrever código melhor", é uma tarefa de design gráfico que está fora
do que se constrói numa sessão de programação. Não avançar para aqui
sem teres os assets prontos ou orçamento para os encomendar.

**Opção B — Forma procedural, construída só com código (recomendada).**
O Guardião é uma forma abstrata — uma espécie de "chama-espírito"
minimalista, gerada inteiramente com SVG/CSS (gradientes, blur, glow,
partículas simples), no espírito do "orbe" da Siri ou do efeito de
"breathing glow" que já usamos no `animate-glow-pulse` desta sessão.
Sem olhos, sem boca, sem antropomorfismo — um símbolo, não uma mascote.
Evolui através de:
- **Forma:** de um ponto de luz simples → uma chama suave → um orbe
  com camadas → uma constelação de pequenos pontos orbitando (estágio
  máximo, "Eternidade").
- **Cor:** acompanha a paleta rose/graphite já estabelecida — nunca
  introduz uma cor nova fora da paleta da app.
- **Movimento:** respiração lenta (`animate-glow-pulse`, já existe),
  e nos níveis mais altos, uma órbita lenta de 1-3 partículas.
- **Acessórios discretos:** um anel fino ao redor (desbloqueado por
  LovePoints), uma segunda cor de glow (tema sazonal), um rasto de
  partículas mais longo. Tudo aditivo, nunca um item "vestido" sobre
  uma personagem com corpo.

Esta opção entrega 90% da sensação de "tenho uma personagem que cresce
comigo" com 10% do custo de produção, e fica perfeitamente alinhada
com "estilo Apple, minimalista, sem aspeto de jogo" — pedido explícito
no briefing original.

### 5.3 Evolução — ligada ao Nível da Jornada, não a uma métrica nova

O Guardião não tem a sua própria régua de progresso. Evolui exatamente
nos mesmos limiares do Nível da Jornada (secção 6) — isto evita ter
duas barras de progresso a competir por significado no mesmo ecrã.

| Nível da Jornada | Estágio do Guardião |
|---|---|
| Início | Ponto de luz, quase imperceptível |
| Faísca | Pequena chama, sem glow |
| Brasa | Chama com glow suave |
| Chama | Chama com glow + 1 partícula orbital |
| Chama Viva | Orbe com 2 camadas de glow |
| Farol | Orbe com 3 partículas orbitais |
| Eternidade | Constelação — orbe + anel + 4-5 partículas, glow mais amplo |

### 5.4 Solo vs. Casal

Mesmo componente, mesmo código — só o texto à volta muda de significado:

- **Casal:** "O vosso Guardião cresce com a vossa presença diária."
- **Solo:** "O teu Guardião cresce com o teu cuidado contigo próprio."

Não há um Guardião "diferente" para solo. Replicar o padrão já usado em
`missions.ts` (texto condicional por `isSolo`, mesma lógica de dados).

### 5.5 Personalização (liga-se a LovePoints, secção 7)

No lançamento (Fase 4): cor do glow, forma do anel, intensidade do
rasto de partículas — tudo guardado como preferências simples
(`guardian_glow_color`, `guardian_ring_style` em `couple_spaces` ou
numa tabela `guardian_state` dedicada, ver secção 9).

---

## 6. Nível da Jornada

### 6.1 Não se inventa — estende-se

`getRelationshipState()` (em `LoveStreakCard.tsx`, linhas ~107-114) já
define exatamente esta escada, hoje calculada a partir de
`currentStreak` (dias de sequência):

```
Início (0) → Faísca (1) → Brasa (3) → Chama (7) →
Chama Viva (14) → Farol (30) → Eternidade (90)
```

A mudança: o nível passa a ser calculado a partir de **LovePoints
acumulados**, não só de dias de streak. Isto resolve uma limitação
atual — hoje, um casal que falha um dia perde o streak e "desce" de
nível imediatamente, o que é desencorajador. Pontos acumulados nunca
desaparecem (são um histórico, não um contador frágil), por isso o
Nível da Jornada **nunca desce** — só sobe. A Chama (streak) continua a
existir em paralelo, com a sua própria lógica de risco/quebra — são
duas réguas diferentes e isso é intencional (uma celebra consistência
recente, a outra celebra investimento acumulado).

### 6.2 Nova escada de limiares (proposta, em LovePoints)

| Nível | Nome | LovePoints necessários |
|---|---|---|
| 1 | Início | 0 |
| 2 | Faísca | 50 |
| 3 | Brasa | 150 |
| 4 | Chama | 400 |
| 5 | Chama Viva | 900 |
| 6 | Farol | 1 800 |
| 7 | Eternidade | 3 200 |
| 8+ | A Construção, O Horizonte, ... | a definir na Fase 3, ver 6.3 |

Os números são uma proposta inicial — calibrar depois de teres dados
reais de quanto os casais ativos ganham por semana (estimativa: um
casal ativo todos os dias ganha ~25-30 pts/dia com os gestos atuais,
logo ~175-210/semana; a escada acima dá progressão visível na primeira
semana e satisfação a longo prazo).

### 6.3 Para além da Eternidade

O briefing original menciona "Nível 12 — A Construção" e "próximo
nível: O Horizonte" como exemplo. Proposta de nomes para os níveis
8-15 (depois de Eternidade), a confirmar/ajustar antes da Fase 3:

A Construção · O Horizonte · A Raiz · O Refúgio · A Promessa ·
O Legado · A Constelação · Para Sempre

### 6.4 UI do cabeçalho

```
┌─────────────────────────────┐
│        ✦ (Guardião)          │
│                               │
│   Nível 4 — Chama             │
│   1 280 LovePoints            │
│   ──────────────────●────────│  barra até ao próximo nível
│   620 até Chama Viva          │
└─────────────────────────────┘
```

---

## 7. LovePoints

### 7.1 O que já existe (reaproveitar)

- Tabela `public.points` (`couple_space_id`, `total_points`) — fica
  como o saldo atual.
- `get_total_points(p_couple_space_id)` — fica, é a leitura de saldo.
- `fn_buy_loveshield` — fica como o primeiro "sink" já existente.
- Todos os gatilhos de pontos já ligados a `daily_activity` via
  `missions.ts` (checkin +10, mood +5, leitura/oração +5, plano +10).

### 7.2 O que falta — um livro de movimentos (ledger)

Hoje `points` é só um saldo — não há histórico de "porque é que ganhei
isto". Isto limita o que se pode mostrar ("Hoje ganhaste +25
LovePoints: Presença +10, Sentimento +5, Leitura +5, Nova memória +5").
Proposta: nova tabela `lovepoints_ledger`:

```sql
CREATE TABLE public.lovepoints_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  amount          integer NOT NULL,           -- positivo (ganho) ou negativo (gasto)
  source          text NOT NULL,              -- 'checkin' | 'mood' | 'leitura' | 'prayer' |
                                               -- 'plano' | 'reflexao' | 'livro_concluido' |
                                               -- 'memoria' | 'data_especial' | 'desafio' |
                                               -- 'capsula_tempo' | 'shield' | 'personalizacao' | ...
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

`total_points` em `points` passa a ser um **cache desnormalizado**
(soma do ledger), atualizado pela mesma função que já insere — não
substitui `points`, complementa-o. Isto é aditivo e de baixo risco: o
saldo atual nunca é recalculado de forma destrutiva.

### 7.3 Fontes de LovePoints — mapeamento direto ao que já existe

| Fonte | Já dispara hoje? | Onde |
|---|---|---|
| Check-in diário | Sim | `missions.ts` → `daily_activity` tipo `checkin` |
| Sentimento (mood) | Sim | idem, tipo `mood` |
| Rotina ("Plano") | Sim (corrigido nesta sessão) | `useRoutineLogs.ts` |
| Oração / Leitura | Sim | `missions.ts`, condicional por religião |
| Reflexões (Biblioteca) | Não — a adicionar | `useBookReflections.ts` |
| Livro concluído | Não — a adicionar | `BookReader.tsx` (progresso = 100%) |
| Memórias (fotos) | Não — a adicionar | `UploadMemoryDialog.tsx` |
| Datas especiais (Nossa História) | Não — a adicionar | `useRelationshipEvents.ts` (ao criar evento) |
| Desafios completados | Não — a adicionar | `Challenges.tsx` |
| Cápsula do Tempo | Não — a adicionar | `TimeCapsule.tsx` (ao criar) |

Cada uma destas "a adicionar" é uma única chamada nova a uma função
central `awardLovePoints(coupleSpaceId, userId, amount, source,
description)` (novo helper em `src/lib/lovePoints.ts`, espelhando o
padrão já estabelecido de `logActivity.ts`). Não se reinventa a roda —
copia-se o padrão existente.

### 7.4 Onde gastar — loja de personalização

**Fase 4 (lançamento do sistema de gastos):**
- Molduras para o avatar do perfil
- Temas de cor da "casa" (fundo da Home — variações dentro da paleta
  rose/graphite, nunca cores fora da identidade)
- Cor/estilo do glow do Guardião
- Títulos junto ao nome (ex: "Guardiões da Chama", desbloqueado a
  partir do Nível 5)
- LoveShields (já existe, mantém-se)

**Mais tarde (Fase 6+, dependente de catálogo de Biblioteca):**
- Desconto em livros da Biblioteca
- Desbloqueio direto de livros completos
- Temas sazonais (Natal, Dia dos Namorados — só temas visuais, nunca
  conteúdo pago disfarçado de "evento")

---

## 8. Cerimónias — os momentos WOW

### 8.1 O conceito

Um marco importante (30 dias de Chama, livro terminado, 1 ano de
relação, novo Nível) não aparece como toast. Toma o ecrã inteiro por
~3 segundos, com uma animação de celebração, e termina com a opção de
guardar/partilhar uma imagem pronta para Instagram Stories.

### 8.2 Gatilhos de Cerimónia (Fase 5)

- Marcos de streak já existentes (`STREAK_MILESTONES`: 7/14/30/50/100/365)
- Subida de Nível da Jornada
- Livro terminado (Biblioteca)
- Aniversário de relação (via `relationship_events`, já construído
  nesta sessão — recorrência anual já calculada em `engine.ts`-style
  helpers de `useRelationshipEvents.ts`)
- Cápsula do Tempo aberta

### 8.3 Viabilidade técnica — gerar a imagem partilhável

Isto é a parte tecnicamente nova do sistema (tudo o resto reaproveita
infraestrutura existente). Caminho recomendado:

1. Construir o ecrã de celebração como um componente React normal
   (não canvas) — texto, Guardião, fundo gradiente, tudo em HTML/CSS,
   tal como o resto da app.
2. Usar uma biblioteca de "DOM para imagem" (`html-to-image` ou
   `html2canvas`, ambas leves, sem dependências de servidor) para
   capturar esse componente como PNG no proporção 9:16 (Stories).
3. No mobile (PWA), usar a Web Share API (`navigator.share` com
   `files`) quando disponível — já há precedente disto na app
   (verifica `notifyPartner.ts`/PWA install flow para padrões de
   feature-detection semelhantes); fallback para download direto do
   PNG em browsers sem suporte.
4. Não depender de geração de imagem no servidor (Edge Function) na
   v1 — é mais lento, mais caro, e desnecessário para um PNG estático
   gerado a partir de dados que o cliente já tem.

### 8.4 Regra de ouro das Cerimónias

Disparam **no máximo uma vez por marco** (mesmo padrão de dedupe já
usado em `fireMissionIfNotFired`/`recentMilestone` — reaproveitar
`localStorage` + verificação na tabela certa antes de mostrar). Nunca
interrompem uma ação que o utilizador esteja a meio de fazer (ex: não
disparar uma Cerimónia enquanto está a escrever uma mensagem no Chat).

---

## 9. Arquitetura técnica — resumo de tudo

### 9.1 Tabelas novas

| Tabela | Propósito | Fase |
|---|---|---|
| `lovepoints_ledger` | Histórico de movimentos de LovePoints | 3 |
| `guardian_state` | Estado/preferências do Guardião por `couple_space_id` (cor, acessórios desbloqueados) | 4 |
| `ceremonies_log` | Marcos de Cerimónia já mostrados (dedupe) — `couple_space_id, ceremony_type, ceremony_key, shown_at` | 5 |
| `shop_purchases` | Itens de personalização desbloqueados (molduras, temas) — `couple_space_id, item_key, purchased_at` | 4 |

### 9.2 Tabelas/funções que mudam

| Item | Mudança |
|---|---|
| `public.points` | Passa a ser atualizado via `awardLovePoints()`, não diretamente |
| `get_total_points` | Inalterada |
| `fn_get_global_ranking` | Removida (Fase 1) |
| `couple_spaces.is_verified`, `house_image` | Reaproveitados no perfil da Jornada, deixam de servir o Ranking |

### 9.3 Ficheiros novos (frontend)

```
src/features/journey/
  ├─ Guardian.tsx              — componente visual do Guardião (SVG/CSS)
  ├─ JourneyLevel.tsx          — cabeçalho de nível + barra de progresso
  ├─ LovePointsCard.tsx        — saldo + extrato recente
  ├─ Shop.tsx                  — loja de personalização
  ├─ CeremonyOverlay.tsx       — ecrã de celebração full-screen
  ├─ useJourney.ts             — hook central (nível, pontos, guardião)
  └─ journeyLevels.ts          — escada de níveis (extensão de getRelationshipState)

src/lib/
  └─ lovePoints.ts             — awardLovePoints(), espelha logActivity.ts
```

### 9.4 Ficheiros que são substituídos/removidos

```
src/pages/Ranking.tsx              — apagar (Fase 1)
src/components/RankingCard.tsx     — apagar (Fase 1)
src/pages/LoveStreak.tsx           — reestruturado para Jornada (Fases 1-5)
```

---

## 10. Fases de implementação

Cada fase é independentemente lançável — nenhuma depende de uma fase
futura para entregar valor. Esta é a ordem recomendada, do mais
essencial para o mais ambicioso.

### **Fase 0 — Remoção do Ranking** (essencial, baixo risco, fundação da filosofia)
- Apagar `Ranking.tsx`, `RankingCard.tsx`, rota, referências em
  `LoveStreak.tsx`, flag `home_ranking`.
- Migration: `DROP FUNCTION fn_get_global_ranking`.
- **Critério de aceitação:** zero referências a "ranking" no código
  (`grep -ri ranking src/`); `npx tsc --noEmit` limpo; app continua a
  funcionar sem a aba "Amor" antiga ter o ranking embutido.

### **Fase 1 — Renomear e reestruturar a página** (essencial)
- `/lovestreak` → `/jornada` com redirect.
- Substituir os 3 separadores por scroll único (secção 4.1).
- Renomear labels visuais: "Pontos" → "LovePoints", título da página.
- **Nenhuma mudança de dados ainda** — só UI/routing.
- **Critério de aceitação:** Jornada abre, mostra Chama + Gestos +
  saldo de pontos (com o nome novo), nada partido.

### **Fase 2 — Nível da Jornada baseado em LovePoints**
- Nova tabela `lovepoints_ledger` + função `awardLovePoints()`.
- Migrar os gatilhos existentes (`missions.ts`/`useRoutineLogs.ts`) de
  incrementar `points` diretamente para passar por `awardLovePoints()`.
- `journeyLevels.ts` com a escada de limiares (secção 6.2).
- Cabeçalho da Jornada mostra Nível + barra de progresso.
- **Critério de aceitação:** ganhar um gesto hoje aparece no extrato
  do ledger; nível sobe corretamente ao cruzar um limiar; nível nunca
  desce mesmo que o streak quebre.

### **Fase 3 — Expandir fontes de LovePoints**
- Ligar `awardLovePoints()` a: reflexões, livro concluído, memórias,
  datas especiais (Nossa História), desafios, cápsula do tempo.
- **Critério de aceitação:** cada uma das 6 novas fontes soma pontos
  visíveis no extrato, com a descrição certa.

### **Fase 4 — O Guardião + Loja de personalização**
- `Guardian.tsx` (forma procedural SVG/CSS, 7 estágios).
- `guardian_state` + `shop_purchases`.
- Loja com as primeiras personalizações (molduras, temas de cor, cor
  do glow).
- **Critério de aceitação:** Guardião muda de estágio visual ao subir
  de Nível; loja permite comprar um item e o item aplica-se
  visivelmente.

### **Fase 5 — Cerimónias**
- `CeremonyOverlay.tsx` + `ceremonies_log` (dedupe).
- Integração com `html-to-image` para exportar PNG 9:16.
- Web Share API com fallback de download.
- Ligar aos gatilhos: marcos de streak, subida de nível, livro
  terminado, aniversário de relação, cápsula aberta.
- **Critério de aceitação:** atingir um marco dispara a Cerimónia uma
  única vez; o botão "Partilhar"/"Guardar" produz uma imagem correta
  com os dados certos.

### **Fase 6 — Loja avançada** (sem data fixa, depende do catálogo da Biblioteca)
- Desconto/desbloqueio de livros, conteúdo premium, temas sazonais.

---

## 11. Diretrizes de design

Estas regras já são as regras da LoveNest — este sistema não introduz
nenhuma nova, só as reforça num espaço com mais tentação de "parecer
jogo":

- **Paleta:** só rose/graphite. Nunca amarelo/amber (regra já em vigor
  no projeto). O Guardião pode ter variações de saturação/brilho
  dentro de rose, nunca um hue completamente novo no v1.
- **Sem emojis na UI.** Só ícones `lucide-react`. As Cerimónias podem
  usar tipografia grande e cor para impacto — não precisam de emoji
  para parecer celebratórias.
- **Sem texto "de jogo".** Evitar "XP", "level up!", "loot",
  "achievement unlocked". Preferir linguagem da própria marca:
  "subiram de nível", "o vosso Guardião cresceu", "desbloquearam".
- **Motion:** reaproveitar `animate-glow-pulse` (já definido em
  `tailwind.config.ts`) como base do "sinal de vida" do Guardião e da
  Chama — não inventar uma segunda linguagem de animação.
- **Apple/Airbnb, não Duolingo.** Progressão visível mas discreta;
  nunca confetti excessivo, nunca sons obrigatórios, nunca
  notificações push agressivas a pedir para "voltar e não perder o
  streak". A app já tem o cuidado de não fazer isto (ver `glow-pulse`
  em vez do `animate-ping` removido nesta sessão) — manter esse padrão.

---

## 12. UX, motion, acessibilidade, performance

- **Motion respeita `prefers-reduced-motion`.** O Guardião e a
  Cerimónia devem ter uma versão estática/sem partículas quando o
  sistema do utilizador pede menos movimento.
- **Cerimónias nunca bloqueiam navegação.** Sempre com um botão de
  saída claro, nunca um overlay sem forma de fechar.
- **Geração de imagem é assíncrona e não bloqueia a UI.** Mostrar um
  estado de carregamento curto enquanto `html-to-image` processa.
- **O Guardião é leve.** SVG/CSS puro, sem bibliotecas de animação
  pesadas (não introduzir Lottie/Three.js para isto — não é
  necessário para o nível de fidelidade visual proposto na Opção B).
- **Todas as novas tabelas têm RLS**, seguindo exatamente o padrão já
  estabelecido nesta sessão (`is_member_of_couple_space`, owner +
  parceiro condicionado quando aplicável).

---

## 13. O que não implementar (em nenhuma fase, por agora)

- IA generativa para personalizar o Guardião ou gerar texto de
  Cerimónia — está fora do âmbito deste sistema.
- Qualquer forma de ranking, mesmo "anónimo" ou "por região" — a
  filosofia é explicitamente anti-comparação.
- Moeda paga (comprar LovePoints com dinheiro real) — LovePoints
  ganham-se, não se compram. Misturar isso destrói o significado do
  sistema.
- Multiplayer/social entre casais diferentes (ex: "amigos", feed
  partilhado entre casas) — fora do âmbito; a LoveNest é um espaço de
  dois (ou de um, em modo solo), não uma rede social.
- Loja com itens "pay to win" que afetem o streak ou os gestos — a
  loja é puramente estética/cosmética.

---

## 14. Resumo executivo (para retomar rapidamente numa sessão nova)

1. **Sai:** Ranking (`Ranking.tsx`, `RankingCard.tsx`, `fn_get_global_ranking`, flag `home_ranking`).
2. **Fica e reenquadra-se:** Chama (`useStreak.ts`), Pontos (`public.points` → LovePoints), escada de níveis (`getRelationshipState` → Nível da Jornada).
3. **Constrói-se de novo:** ledger de LovePoints, Guardião (SVG/CSS procedural, 7 estágios, sem ilustração customizada), loja de personalização, Cerimónias com exportação de imagem partilhável.
4. **Ordem:** remover Ranking → reestruturar a página → ligar Nível a LovePoints → expandir fontes de pontos → Guardião + loja → Cerimónias.
5. **Regra de design constante:** rose/graphite, sem emoji, sem linguagem de "jogo", motion discreto reaproveitando `animate-glow-pulse`.
