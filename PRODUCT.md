# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first. Hoje é uma PWA (React + Vite, `public/manifest.json`, service worker para push). Está em preparação para Android e iOS com Capacitor, sem bifurcar a lógica de negócio (`docs/NATIVE_READINESS.md`, application id alvo `com.lovenest.app`). A web continua suportada.

## Users

Pessoas reais a viver dias comuns, não "casais perfeitos". O utilizador principal é uma de duas pessoas numa relação, que usa o LoveNest no telemóvel ao longo do dia para estar presente para a outra: falar, dizer como está, guardar o que viveram, planear.

Também existe o modo solo: uma pessoa usa o espaço para si e pode convidar alguém mais tarde. O produto tem de fazer sentido para ela sem a tratar como um casal incompleto.

Mercado: lusófono. Moçambique é o primeiro mercado comercial. O produto pretende suportar métodos locais como M-Pesa, e-Mola e mKesh e pagamentos internacionais por cartão. Os providers definitivos ainda estão em avaliação. O produto deve funcionar também para outros países lusófonos. O texto da app está hoje escrito em português europeu, tratando o utilizador por "tu".

Não há dados demográficos nem de utilização confirmados. Não inventar.

## Product Purpose

Um espaço privado para duas pessoas partilharem a vida em comum: presença diária, conversa e história. O LoveNest existe para que a relação tenha um lugar seu, fora das redes e de qualquer audiência.

O sucesso é o casal (ou a pessoa, no modo solo) voltar todos os dias porque o espaço lhe é útil e íntimo, e não por obrigação, pontos ou medo de perder uma sequência.

## Positioning

A relação não é conteúdo público. O LoveNest é privado por estrutura, não por opção: não há feed, seguidores, audiência nem comparação com outros casais. O Ranking público foi retirado de propósito e substituído pela Jornada, uma evolução própria sem competição ("Na LoveNest, não competes com outros casais. Cresces ao lado da pessoa que escolheste." — `docs/LOVENEST_PROGRESS_SYSTEM.md`).

## Operating Context

- Uso curto e frequente no telemóvel, ao longo do dia; muitas vezes as duas pessoas estão em lugares diferentes.
- Rituais diários: registar o humor, uma pequena ação do dia, manter a chama (streak) viva.
- Cada pessoa tem a sua conta; o casal partilha um espaço (`couple_space`), ao qual o par se junta com um código de convite.
- Notificações push (Firebase Cloud Messaging) trazem a pessoa de volta quando a outra faz algo.

## Capabilities and Constraints

### Implementado (confirmado no código)

Rotas em `src/App.tsx`, funções em `supabase/functions/`:

- Conversa (chat), humor, memórias, momentos, cápsula do tempo, história.
- Planos e rotina, desafios (gerados por `generate-challenges`), conflitos.
- Ciclo, com conteúdo de conhecimento.
- Espiritualidade: oração, jejum, jornada espiritual. Só aparece a quem indica que a fé faz parte da vida.
- Localização partilhada, histórico e geofencing (`geofence-check`), em primeiro plano.
- Biblioteca com leitor e reflexões.
- Jornada: nível, LovePoints (`lovepoints_ledger`), Guardião (`FlamePet`), Cerimónias (`src/lib/ceremonies.ts`). A Nossa Chama (streak diário). LoveWrapped mensal (`generate-love-wrapped`, por `pg_cron`).
- Notificações push na web (Firebase Cloud Messaging, `public/sw.js`) e notificações inteligentes (`smart-notifications`).
- Espaço de casal com código de convite (`create-couple-space`, `join-couple-space`); modo solo.
- Personalização no onboarding: país, género, fé, modo (solo ou a dois), objetivo principal.
- Existe infraestrutura de subscrição, entitlement e pagamento manual. Há código histórico relacionado com PaySuite no repositório, mas PaySuite não é o provider escolhido e não deve ser tratado como solução de produção.
- Painel de administração; eliminação de conta (`delete-account`).
- O Ranking público foi removido e não existe no código.

### Planeado (ainda não implementado)

- Apps Android e iOS com Capacitor. Hoje só existe a fronteira de runtime (`src/lib/appRuntime.ts`); o Capacitor não está instalado. O plano por capacidade está em `docs/NATIVE_READINESS.md` (push nativo, câmara, partilha, deep links, retorno do OAuth).

### Em aberto (decisões por tomar)

- Localização em segundo plano: é uma decisão de produto e de privacidade separada; não assumir que existe.
- Mercados lusófonos para lá de Moçambique: o produto deve funcionar para eles, mas não há localização específica (moeda, métodos de pagamento) fora de Moçambique.
- Arquitetura de pagamentos: selecionar provider local e provider internacional. PaySuite está excluído da estratégia atual.
- Dados de utilizadores, demografia e métricas: não confirmados.

### Restrições de produto

- As funcionalidades existem, mas não devem aparecer todas ao mesmo tempo. A personalização (país, género, fé, modo, objetivo) decide o que se mostra.
- Presença diária em vez de gamificação agressiva: sem ranking, sem comparação pública, sem pressão de pontos.
- Privacidade é estrutural: Postgres com RLS por espaço de casal; nada é público por omissão.
- Modelo de negócio: o produto terá acesso gratuito e ofertas pagas.

Stack: React 18 + TypeScript + Vite, Tailwind, shadcn/ui, Framer Motion; Supabase (Auth, Postgres com RLS, Storage, Realtime, Edge Functions, pg_cron); Firebase Cloud Messaging; Sentry; Vercel. Produção em https://www.lovenestt.com.

## Brand Commitments

- Nome: LoveNest. Logo: dois crescentes que se encontram, rosa à esquerda e azul à direita (`src/components/Logo.tsx`). O logo é preservado.
- Significado relacional das cores, definido pelo dono do produto: rosa = uma presença, azul = a outra presença, navy = estrutura, a aproximação ou interseção dos dois = "nós". Rosa e azul são usados com contenção e só com esse significado.
- Voz: adulta, íntima, humana e discreta. Nada de "app fofinha de casais".
- Evitar emojis decorativos como linguagem visual. Elementos semânticos existentes, como representação de humor, podem ser usados quando forem úteis e coerentes.

## Evidence on Hand

- Existem assets fotográficos da Landing antiga no repositório: `public/hero-*.webp`, `public/distance-*.webp`, `public/gestures-*.webp`, `public/safe-*.webp` (768, 1280 e 1920 px). A utilização em produção depende da proveniência e da licença confirmadas.
- A UI real do produto (Home, Chat, Nós, Vida, Jornada) pode ser mostrada como prova, com dados de exemplo claramente fictícios.
- Não existem testemunhos, números de utilizadores, avaliações, imprensa nem casos reais. Não fabricar nenhum destes.

## Product Principles

1. **A relação vem antes das funcionalidades.** Mostrar uma coisa de cada vez, a que importa naquele momento.
2. **Privado por estrutura.** Nada que transforme a relação em conteúdo, audiência ou comparação.
3. **Presença, não pressão.** Os rituais diários convidam a voltar; não castigam quem falha um dia.
4. **Dois, e também um.** Cada decisão funciona para o casal e para quem está no modo solo.
5. **Dias comuns.** Falar para pessoas reais, não para uma ideia de casal perfeito.

## Accessibility & Inclusion

Não há um padrão formal confirmado. Restrições conhecidas: mobile-first em ecrãs de telemóvel (o dispositivo de referência para revisão é um Samsung S25+), e as superfícies V3 em revisão respeitam `prefers-reduced-motion`; isso deve tornar-se um requisito geral das superfícies redesenhadas. A linguagem é inclusiva quanto a género e fé: ambos são opcionais e "Prefiro não dizer" é sempre uma resposta válida.
