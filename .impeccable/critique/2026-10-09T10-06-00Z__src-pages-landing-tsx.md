---
target: landing
total_score: 17
max_score: 36
na_heuristics: 7
p0_count: 6
p1_count: 12
target_identity: "file:C:\\Users\\Alcides\\Desktop\\Meus Projectos\\LoveNest\\src\\pages\\Landing.tsx"
target_fingerprint: "sha256:939d8895ca22414eb9de62d553b4a593e40368482476d1bb74c158e282f04ee6"
target_path: "C:\\Users\\Alcides\\Desktop\\Meus Projectos\\LoveNest\\src\\pages\\Landing.tsx"
timestamp: 2026-10-09T10-06-00Z
slug: src-pages-landing-tsx
---
# Crítica — Landing atual (desktop + mobile)
Método: dual-agent (A: revisão de design · B: detector + browser)

## Factos
- Cenas fotográficas (Hero/Distance/Gestures/Flame/MemoriesScene, LandingNav) órfãs; Landing real = Landing.tsx + LandingProductPreview.tsx + MobileWelcome.tsx; webp/jpg no deploy sem uso.
- Visitante novo: / -> ProtectedRoute -> /entrar -> /landing sob splash ~2,9 s ("Para Casais Extraordinários").
- CTA -> /inicio repete a Welcome com outra linguagem.

## Heurísticas
1 Visibilidade 2 · 2 Mundo real 3 · 3 Controlo 1 · 4 Consistência 1 · 5 Prevenção 2 · 6 Reconhecimento 3 · 7 n/a · 8 Estética 2 · 9 Recuperação 2 · 10 Ajuda 1 — Total 17/36 (47%).

## Especificidade
Template SaaS intermutável (hero 2 colunas + mockup, 3 cards Lucide, mosaico 2x2, faixa navy, CTA com glow). Ninho só como carimbo. Sem pessoas. Detector browser: 48 desktop / 8 welcome mobile (low-contrast 19, texto pequeno 24, kicker 3, eyebrow-chip 1, nested-cards 1 FP, overused-font 1); CLI 0 (falso negativo Tailwind); text-occlusion = FP.

## Contradições PRODUCT.md
- Relação antes de funcionalidades: Landing.tsx:265 inventário de 7 após :262; 4 listas.
- Privado por estrutura: "Privado por defeito" Landing.tsx:336, MobileWelcome.tsx:96; "deve" :332; "dentro" :57; ShieldCheck :204.
- Presença, não pressão: Preview:52-59 "18 dias juntos" herói; :305 "protegida hoje"; :39 hábito; :175 "Todos os dias." rosa.
- Dois, e também um: zero menção ao modo solo; copy só "vocês".
- Dias comuns: SplashScreen.tsx:146 "Extraordinários"; só o dia perfeito.

## P0
1 "Privado por defeito" (Landing.tsx:336, MobileWelcome.tsx:96)
2 Splash "Para Casais Extraordinários" (SplashScreen.tsx:146)
3 Modo solo invisível
4 Streak como herói + linguagem de perda (Preview:52-59, Landing:305,39,175)
5 Rosa/azul sem significado relacional; indigo/laranja/âmbar/esmeralda
6 Estrutura template SaaS; sem pessoas

## P1
7 CTA -> Welcome duplicada (/inicio)
8 Redirects + splash antes do conteúdo
9 "Conhecer" só em memória (Landing.tsx:103,113-115)
10 Sem caminho para par convidado com código
11 6 rótulos de CTA; secundário com peso igual (:192-198)
12 Inventário em 4 listas; "O LoveNest aprende" (:266)
13 Linguagem incompatível com Auth V3 (glow, rosa UI, escala tipográfica, 3 cremes)
14 Mockup ≠ app (Index.tsx:562-591, BottomTabs 5 tabs), 7–9 px, data fixa
15 Contraste slate-400 ~2,4:1 (:201,:249,:284,:377, MW:95; :230 grande)
16 Falta grátis/pago, precisa do par?, plataforma, dados
17 Mobile completo 5203 px sem CTA ~4500 px
18 Mockup e 24 ícones sem aria-hidden

## P2
19 Logo CTA final desalinhado (:352) · 20 IDs de máscara SVG fixos (Logo.tsx:24,30) · 21 alvos <44 px · 22 chips falsa affordance (MW:60-74) · 23 logo repetido · 24 Lucide como ilustração · 25 Inter 900/-0,055em, micro-texto, ritmo uniforme · 26 fontes sem uso (Fraunces, Merriweather, Roboto Slab, Nunito) · 27 /landing carrega a Home (AppShell.tsx:16), entry 337 KB gzip, icon-512 297 KB · 28 código/asset morto, 1920w=1672 px · 29 fotografia fora de tom e sem licença confirmada · 30 motion uniforme, sem motion-reduce em hover/active

## Personas
Jordan, Riley, Casey (S25+), Neide (Maputo, gama média, solo/distância).

## Perguntas
Sem logo, o que é só LoveNest? · Porque é "Todos os dias." a palavra mais rosa? · Onde está o dia comum mau? · Pill vs mostrar o que não existe? · Onde se vê quem chega sozinho ou com código?
