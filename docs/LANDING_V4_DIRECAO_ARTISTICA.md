# Landing V4 — Direção artística

Estado: proposta para revisão (Fase 3). Nada implementado, nenhuma imagem gerada.
Fontes: `PRODUCT.md` e a crítica da Fase 2 (`.impeccable/critique/2026-10-09T10-06-00Z__src-pages-landing-tsx.md`).
Âmbito: só a página `/landing` (desktop e mobile). Splash, routing e `/inicio` ficam fora.
Prioridades aprovadas: pessoas e relação; privacidade estrutural.

---

## 1. North star visual

**Um dia comum, visto pelos dois.**

A página é um único dia, da manhã à noite. Cada capítulo acontece numa hora diferente desse dia, e a luz da página acompanha-o: começa em branco de manhã, passa por um branco quente ao fim da tarde e fecha em navy à noite, quando o espaço é só deles.

Em cada capítulo há duas pessoas reais e, no máximo, um pequeno fragmento do LoveNest a acontecer entre elas: uma mensagem, um humor, uma chegada, uma memória. O produto nunca aparece como montra; aparece como o sítio onde estas pequenas coisas ficam.

Teste de identidade: tapando o logotipo, a página continua a ser LoveNest por três sinais que nenhuma outra app tem ao mesmo tempo — a marca rosa de uma pessoa e a marca azul da outra; frases curtas da própria app ("Vocês encontraram-se aqui hoje"); e um dia comum, não um dia perfeito.

## 2. Princípios da Landing V4

1. **Pessoas antes de produto.** O primeiro ecrã mostra duas pessoas e a vida entre elas. As funcionalidades nunca aparecem como lista.
2. **Um fragmento por momento.** Cada capítulo tem no máximo um fragmento de produto, ligado a uma pessoa ou a um objeto da cena. Nunca um dashboard inteiro.
3. **A privacidade é uma forma, não um selo.** Mostra-se pelo que o espaço tem (duas pessoas) e pelo que não tem (seguidores, feed, público). Sem escudos, cadeados, pills nem "privado por defeito".
4. **Presença, não pressão.** A continuidade aparece pequena e calma. Nenhum número é o maior elemento da página, nenhuma frase fala em perder.
5. **Dois, e também um.** Quem chega sozinho reconhece-se no capítulo final e no lugar guardado do par. Quem traz um código de convite tem o seu caminho.
6. **Dias comuns, não dias perfeitos.** Distância, cansaço e rotina cabem na página. O tom é adulto e discreto.

## 3. Sistema de cor e significado

Cada cor tem um papel. Nenhuma cor é decorativa.

| Token | Valor | Significado | Onde |
|---|---|---|---|
| `branco` | `#FFFFFF` | o dia | fundo dominante (capítulos 01–03) |
| `papel` | `#F7F4F0` | fim de tarde, memória | alternância apenas no capítulo 04; nunca a página inteira |
| `tinta` | `#0B1324` | estrutura, noite, o espaço fechado | texto principal, CTA, fundo do capítulo 05 |
| `tinta-2` | `#4B5568` | voz secundária | texto de apoio (≥ 4,5:1 em branco e papel) |
| `rosa` | `#FF6B8F` | uma presença | marca da pessoa A: crescente, aresta de mensagem, ponto de presença |
| `azul` | `#4D7CFE` | a outra presença | marca da pessoa B, nas mesmas formas |
| "nós" | rosa + azul a tocarem-se | o encontro | só quando as duas marcas se aproximam; nunca uma cor misturada (sem roxo) |

Regras:
- Rosa e azul **nunca** pintam títulos, botões, ícones, fundos ou palavras de destaque. Só marcam pessoas.
- Quando uma das pessoas ainda não chegou (modo solo, par por convidar), a sua cor aparece a ~20 % de opacidade: o lugar está guardado.
- Uma só família de cinzentos, derivada da tinta (frios). Nada de `slate-400` em texto: falhou contraste na Fase 2.
- Sem verde, âmbar, laranja ou indigo na Landing. A chama do produto mantém a sua cor própria apenas dentro do fragmento da app, a tamanho real.
- Sombras tingidas de tinta, uma só direção de luz (cima), muito suaves.
- Grão: textura leve só sobre fotografia, nunca sobre superfícies de UI.

## 4. Tipografia e hierarquia

A tipografia separa duas vozes:

- **Voz humana — serifa editorial**, para os títulos dos capítulos. É a voz da vida, não do software. Recomendação: **Newsreader** (Google Fonts, tamanhos óticos, itálico verdadeiro), em regular e itálico, nunca em bold. Alternativa: **Fraunces** (já carregada no `index.html`) com os eixos SOFT e WONK a zero.
- **Voz do produto — Inter**, para corpo de texto, botões e todos os fragmentos da app, aos tamanhos reais da app. Assim, quando a pessoa passa para o registo (Auth V3, Inter), o produto que encontra é o mesmo que viu na página.

Escala (desktop → mobile):

| Papel | Desktop | Mobile | Notas |
|---|---|---|---|
| Título do capítulo 01 | serifa 72–80 px / 1.02 | 40–44 px / 1.05 | tracking −0,02 em; `text-wrap: balance` |
| Títulos dos capítulos | serifa 44–52 px / 1.08 | 30–34 px / 1.1 | uma palavra-chave em itálico, no máximo |
| Corpo | Inter 18 px / 1.6 | 16–17 px / 1.55 | máximo ~60 caracteres por linha; peso 400 |
| Rótulo de capítulo | Inter 13 px, 500, tabular | igual | "01 · Manhã" em sentence case; sem MAIÚSCULAS espaçadas |
| Fragmentos da app | Inter 14–15 px | 14–15 px | tamanho real; nada abaixo de 12 px |
| Botão | Inter 16 px, 600 | 16 px, 600 | |

Hierarquia: um título por capítulo, uma frase de apoio, um fragmento. Os números de capítulo existem porque a página é mesmo uma sequência (o dia), não como decoração.

Fica fora: Inter a peso 900 com tracking agressivo; eyebrows rosa em maiúsculas; micro-texto de 7–11 px.

## 5. Estrutura narrativa por capítulos

O arco manhã → noite é a estrutura narrativa da página, não uma regra literal: nem todos os capítulos precisam de mostrar a hora, e a luz só muda onde ajuda a história. A copy abaixo é provisória.

### 01 — Vida real · manhã
- **Papel:** dizer em três segundos o que o LoveNest é e para quem, através de duas pessoas e não de uma lista. Contém o CTA principal.
- **Mensagem central:** a relação acontece nos dias comuns, e o LoveNest é o lugar onde esses dias ficam.
- **Headline provisória:** "O amor também vive nos dias comuns." (a frase da marca) — ou "A vida a dois acontece nos intervalos."
- **Apoio:** "Um espaço privado para duas pessoas: falar, saber um do outro e guardar o que viveram."
- **Fragmento:** uma troca de mensagens ("Chegaste bem?" / "Cheguei. Guardei-te o último pastel.").

### 02 — Presença · meio da manhã
- **Papel:** mostrar o que torna o LoveNest diferente de um chat — saber do outro sem ter de perguntar.
- **Mensagem central:** pequenos sinais dizem "estou aqui" ao longo do dia.
- **Headline provisória:** "Saber do outro, sem ter de perguntar."
- **Fragmentos possíveis (um só por imagem):** "Ana registou o humor de hoje: em paz" · "Vocês encontraram-se aqui hoje" · a chama pequena, "38 dias", como continuidade.
- **Regra:** a chama aparece pequena, ao lado de um gesto real, com frase calma. Nunca é o maior número do ecrã, nunca "protegida", nunca "em risco".

### 03 — Conversa · meio do dia
- **Papel:** a conversa a dois como um sítio próprio, separado de tudo o resto.
- **Mensagem central:** há conversas que só fazem sentido entre os dois.
- **Headline provisória:** "Um sítio só para falarem um com o outro."
- **Fragmento:** o fio da conversa com as marcas das duas pessoas, as mensagens a chegar cada uma do seu lado.

### 04 — História · fim de tarde (papel)
- **Papel:** o tempo. O que viveram fica guardado e o que vão viver tem um sítio.
- **Mensagem central:** os dias comuns, juntos, tornam-se uma história.
- **Headline provisória:** "Daqui a um ano, vão querer lembrar-se de hoje."
- **Fragmentos possíveis:** uma memória com data e as iniciais dos dois · um plano ("Sábado · mercado e depois a praia") · "Juntos há 412 dias".

### 05 — Privacidade · noite (navy)
- **Papel:** fazer sentir que o espaço pertence aos dois. É o capítulo escuro porque é de noite e o espaço fecha-se.
- **Mensagem central:** é um espaço com duas pessoas, sem público.
- **Headline provisória:** "Este espaço tem duas pessoas. Não tem seguidores."
- **Apoio, factual e curto:** "Sem feed, sem perfil público, sem comparação com outros casais. Cada um tem a sua conta e pode apagá-la quando quiser."
- **Forma:** o espaço com as duas marcas (rosa e azul) lado a lado, e a frase factual. Sem contadores, sem escudos, sem pills.

### 06 — Começar · depois da meia-noite, ou o dia seguinte
- **Papel:** converter, com três caminhos honestos.
- **Mensagem central:** começa uma pessoa; a outra junta-se quando quiser. Ou fica só teu.
- **Headline provisória:** "Começa pelo teu lado."
- **Caminhos:** criar o espaço (CTA principal) · "Tenho um código do meu par" · "Já temos conta, entrar".
- **Solo:** "Também podes usá-lo só para ti e convidar alguém mais tarde."
- **Nota:** aqui acontece o único momento grande do Ninho — as duas marcas encontram-se e formam o logo (ver 8).
- **Factos a acrescentar quando confirmados:** acesso gratuito e ofertas pagas (sem preços); funciona no telemóvel, no browser.

Frases a evitar em todos os capítulos: "o vosso cantinho", "levem a relação ao próximo nível", "tudo num só lugar", "feito para casais extraordinários", qualquer coisa com "conectar".

## 6. Estratégia de fotografia

Todas as fotografias desta fase são **referências provisórias**: geradas na Fase 4 apenas para os protótipos, marcadas como provisórias, sem licença assumida para produção. Os assets atuais não são substituídos.

Princípios comuns: pessoas reais, não modelos; contexto lusófono e africano quando faz sentido, sem caricatura; pessoas negras, mestiças e brancas com naturalidade; casas e lugares do quotidiano; luz natural; enquadramento editorial (planos médios, cortes assumidos, espaço negativo onde o fragmento possa viver); imperfeição (loiça na banca, cabos, roupa amarrotada). Nada de luxo, nada de "casal a sorrir para o portátil", nada de pose.

### S1 — Manhã, cozinha (capítulo 01)
- **Quem:** um casal, trinta e poucos; ela prepara chá, ele procura as chaves.
- **Contexto:** cozinha pequena de apartamento em Maputo, azulejo antigo, rádio, pão na mesa.
- **Enquadramento:** plano médio largo, horizontal; as duas pessoas em lados opostos do quadro, sem se olharem; espaço livre ao centro-direita.
- **Luz:** sol da manhã lateral pela janela, sombras definidas.
- **Emoção:** rotina tranquila, cumplicidade sem palavras.
- **Produto:** a troca de mensagens vive no espaço entre os dois (para o fim do dia: "Chegaste bem?").
- **Evitar:** beijo, sorrisos para a câmara, cozinha de revista, café de especialidade.

### S2 — Transporte (capítulo 02)
- **Quem:** ela, sozinha, a caminho do trabalho.
- **Contexto:** janela de um chapa ou autocarro, cidade a passar.
- **Enquadramento:** retrato a 3/4, telemóvel na mão, ecrã não visível; foco no rosto.
- **Luz:** luz de manhã a entrar pela janela, reflexos.
- **Emoção:** um pequeno sorriso privado, de quem recebeu uma mensagem.
- **Produto:** fragmento de presença ("Miguel registou o humor de hoje: em paz").
- **Evitar:** pose, auriculares de marca, cenário turístico.

### S3 — Trabalho, meio do dia (capítulo 03)
- **Quem:** ele, numa pausa.
- **Contexto:** oficina, loja ou escritório simples; uniforme ou roupa de trabalho; garrafa de água, papelada.
- **Enquadramento:** plano médio, ligeiramente de lado; mãos e telemóvel.
- **Luz:** luz fluorescente misturada com luz do dia.
- **Emoção:** um minuto só deles a meio de um dia cheio.
- **Produto:** a conversa (S3 é a metade "dele" da conversa do capítulo 03).
- **Evitar:** escritório tecnológico, portátil Apple, open space.

### S4 — Distância (capítulo 02 ou 03, díptico)
- **Quem:** as mesmas duas pessoas, em lugares diferentes.
- **Contexto:** ela numa varanda ao fim do dia; ele num quarto de outra cidade, mala aberta.
- **Enquadramento:** duas imagens verticais lado a lado, com a mesma altura de horizonte, para se lerem como uma só.
- **Luz:** horas diferentes (pôr do sol / noite), para mostrar que estão longe.
- **Emoção:** saudade sem drama.
- **Produto:** uma mensagem de cada lado ("Já jantaste?" / "Ainda não. Liga-me quando chegares.").
- **Evitar:** aeroportos, malas de luxo, lágrimas.

### S5 — Varanda, fim de tarde (capítulo 04)
- **Quem:** o casal, sentados lado a lado.
- **Contexto:** varanda com plantas e cadeiras de plástico; vizinhança ao fundo.
- **Enquadramento:** plano largo, ligeiramente de cima ou de trás; as pessoas pequenas no quadro.
- **Luz:** hora dourada suave.
- **Emoção:** um bom silêncio.
- **Produto:** uma memória com data ("12 de março · A primeira vez que pintámos a sala").
- **Evitar:** pôr do sol de postal, copos de vinho, poses românticas.

### S6 — Memória doméstica (capítulo 04, detalhe)
- **Quem:** ninguém; vestígios dos dois.
- **Contexto:** porta do frigorífico com uma fotografia impressa, duas canecas diferentes, um bilhete escrito à mão.
- **Enquadramento:** plano de detalhe, quadrado ou vertical.
- **Luz:** luz difusa interior.
- **Emoção:** a vida acumulada nos objetos.
- **Produto:** plano futuro ("Sábado · mercado e depois a praia").
- **Evitar:** flat lay arrumado, objetos novos, marcas visíveis.

### S7 — Noite (capítulo 05)
- **Quem:** uma pessoa, já deitada, no escuro.
- **Contexto:** quarto, lençóis amarrotados; o outro lado da cama ocupado ou vazio (decisão da direção).
- **Enquadramento:** plano apertado, muito escuro; só a luz do telemóvel no rosto.
- **Luz:** a luz do ecrã e pouco mais.
- **Emoção:** intimidade, recolhimento.
- **Produto:** nenhum fragmento sobre a foto; o capítulo fala sozinho.
- **Evitar:** sensualidade, lingerie, filtros azuis artificiais.

### S8 — Sozinho, calmo (capítulo 06)
- **Quem:** uma pessoa só, bem consigo.
- **Contexto:** a ler à janela ou a regar plantas num domingo.
- **Enquadramento:** plano médio com muito ar.
- **Luz:** manhã de fim de semana.
- **Emoção:** autonomia, não solidão.
- **Produto:** marca rosa presente, marca azul esbatida (o lugar guardado).
- **Evitar:** tristeza, olhar perdido, chuva na janela.

## 7. Estratégia de UI dentro da fotografia

1. **Um fragmento por fotografia**, colocado no espaço negativo junto da pessoa a quem pertence (a mensagem dela perto dela).
2. **A tamanho real da app.** Mesmo componente, mesmo raio, mesmo tipo (Inter 14–15 px). Se não se lê, não entra.
3. **Superfícies sólidas**, branco ou tinta, com sombra curta tingida de tinta. Sem glassmorphism, sem blur de fundo.
4. **Sempre com as marcas das pessoas:** um crescente rosa junto da Ana, azul junto do Miguel.
5. **Texto vindo da app real**, sempre que existe: "Vocês encontraram-se aqui hoje", "O teu par ainda não chegou hoje", "Juntos há 412 dias", humor "em paz".
6. **Telemóvel inteiro só quando é diegético**, isto é, quando alguém na fotografia o está a segurar. Nunca um mockup a flutuar.
7. **Dados de exemplo claramente fictícios** e marcados como decorativos para leitores de ecrã (`aria-hidden`); o texto que importa existe também fora da imagem.
8. **Sem localização na Landing:** nenhum fragmento de localização ou geofencing aparece nesta página.

## 8. Uso correto do Ninho

O Ninho é uma gramática de presença, não uma ilustração.

Onde aparece:
- **Marca de pessoa:** um crescente pequeno (11–20 px) junto do nome ou da mensagem de cada um.
- **Presença e ausência:** a marca do par a 20 % quando ainda não chegou; a 100 % quando chega, com uma pequena aproximação.
- **Emparelhamento:** quando os dois fazem algo no mesmo dia, as duas marcas tocam-se. É o "nós".
- **Transição:** na passagem para o capítulo 06, as duas marcas viajam uma para a outra e encontram-se.
- **Detalhe gráfico discreto:** o cursor de escrita da conversa, ou o separador entre as duas metades do díptico.

Onde não aparece:
- Como ilustração grande em cada secção.
- Como fundo, padrão ou marca de água.
- Em botões, ícones ou títulos.

Logotipo completo: no cabeçalho (pequeno) e uma vez no capítulo 06, onde as duas marcas se encontram. Nunca no mesmo ecrã duas vezes.

## 9. Motion language

O movimento conta a relação: alguém chega, aproxima-se, fica.

| Movimento | O que significa | Duração | Detalhe |
|---|---|---|---|
| Chegada | uma mensagem ou sinal chega de quem o enviou | 280–340 ms | entra do lado da pessoa (rosa da esquerda, azul da direita), 12–16 px + opacidade |
| Aproximação | duas presenças encontram-se | 320 ms | as marcas deslocam-se até se tocarem; easing `[0.22, 1, 0.36, 1]` |
| Presença | alguém está | 200 ms, uma vez | a marca passa de 20 % a 100 %; sem pulsar em loop |
| Revelação de fotografia | entramos numa cena | 500–600 ms, uma vez | opacidade e máscara a abrir; sem zoom de Ken Burns |
| Passagem do dia | o tempo avança | ligada ao scroll | o fundo vai de branco a papel e a tinta entre capítulos, devagar |
| Toque | resposta física | 150 ms | `scale(0.98)` no botão; sem hover que salte |

Regras: nada em loop infinito; nada de blobs a flutuar; sem smooth-scroll sequestrado (sem Lenis nem GSAP, por regra do projeto, mantém-se o framer-motion existente). Com `prefers-reduced-motion` tudo passa a opacidade simples ou a estado final imediato, incluindo os `hover` e `active`.

## 10. Composição desktop

Grelha de 12 colunas, largura máxima 1280 px, margens laterais generosas. Composição assimétrica: os títulos alinham-se à coluna 2, a fotografia ocupa 7–8 colunas e sangra para a margem quando o capítulo o pede.

- **01 Manhã:** fotografia S1 grande, à direita (colunas 5–12, sangrando para a margem). Título serifa à esquerda, sobreposto ao canto da foto; a troca de mensagens assenta entre as duas pessoas da imagem. CTA e "Já temos conta" por baixo do título. Cabeçalho mínimo: logo, "Entrar".
- **02 Presença:** composição invertida; foto S2 vertical à esquerda (colunas 1–5), texto à direita, um fragmento de presença a sobrepor a aresta da foto.
- **03 Conversa:** díptico S3/S4, as duas metades separadas por uma calha estreita; a conversa corre por cima da calha, cada mensagem do lado de quem a escreveu. É o centro emocional da página.
- **04 História (papel):** uma faixa horizontal de memórias com fotografias de tamanhos diferentes (S5 largo, S6 quadrado), datas reais, um plano futuro no fim. Desloca-se com scroll natural, sem carrossel com setas.
- **05 Privacidade (navy):** página escura, texto grande centrado-à-esquerda, a "ficha" do espaço à direita: duas marcas e o que não existe. A foto S7 aparece pequena e muito escura, ou não aparece.
- **06 Começar:** as duas marcas encontram-se e formam o logo; título, três caminhos, linha do modo solo, e a foto S8 pequena ao lado da linha do solo.

Ritmo vertical: alturas diferentes por capítulo (01 e 03 altos, 02 e 05 compactos); espaço maior antes de cada título do que depois.

## 11. Composição mobile

O mobile é uma página contínua (sem o estado escondido de "Conhecer"), desenhada para o polegar e para dados móveis.

- **Primeiro ecrã (= capítulo 01):** fotografia S1 em cima, a ocupar ~55 svh, com o corte a favorecer as duas pessoas. A troca de mensagens sobrepõe-se à base da foto, a primeira bolha do lado esquerdo e a resposta do lado direito, como na Auth V3. Por baixo: título serifa, uma frase, o CTA principal e "Já temos conta". Tudo cabe em `100svh` num S25+, com a safe area respeitada.
- **Hipótese a testar (não regra):** uma barra fixa em baixo com o CTA, que só aparece quando o CTA original sai do ecrã, com `env(safe-area-inset-bottom)`.
- **02 Presença:** fotografia vertical a toda a largura, fragmento por baixo dela (não por cima do rosto), título curto.
- **03 Conversa:** o díptico torna-se uma sequência vertical: metade dele, a conversa no meio, metade dela. É aqui que a descoberta da conversa ganha profundidade.
- **04 História:** fita horizontal de memórias com scroll lateral nativo (snap suave), a primeira já parcialmente visível para convidar ao gesto.
- **05 Privacidade:** ecrã navy com o título e a ficha do espaço; sem fotografia ou com uma tira muito escura.
- **06 Começar:** encontro das marcas, CTA, "Tenho um código do meu par", linha do solo.

Regras mobile: `svh`/`dvh` em vez de `vh`; alvos de 44 px no mínimo; tap feedback sem hover pegajoso (`@media (hover: hover)` para hovers); imagens com `srcset` real e AVIF/WebP pequenos (≤ 120 KB por imagem no mobile); nenhum texto abaixo de 12 px; nunca uma sequência de cartões iguais.

## 12. O que explicitamente NÃO fazer

- Hero com mockup de telemóvel a flutuar; três cartões com ícone; mosaico de funcionalidades; faixa de pills de confiança; CTA final com glow.
- Ícones Lucide como ilustração; escudos, cadeados, selos verdes.
- "Privado por defeito", "deve", "sem publicidade dentro"; qualquer promessa que o produto não cumpre ("o LoveNest aprende").
- A chama como maior número; "protegida", "em risco", "não percas".
- Listas de funcionalidades (humor, ciclo, oração, biblioteca…) num bloco.
- Rosa ou azul em títulos, botões, fundos ou ícones; gradientes decorativos; blobs; roxo de "nós".
- Página inteira em creme; três cremes diferentes.
- Inter 900 com tracking agressivo; eyebrows em maiúsculas; texto abaixo de 12 px.
- Logotipo grande repetido; logotipo duas vezes no mesmo ecrã.
- Fotografia de stock ou de luxo; casais em pose; "Para casais extraordinários".
- Frase enorme com muito vazio em todos os capítulos, como fórmula.
- Testemunhos, números de utilizadores, avaliações ou preços inventados.

## 13. Três direções para prototipar na Fase 4

As três partilham a cor, a tipografia, as regras do Ninho e a copy dos capítulos. Diferem na composição e na forma como a página se move.

### A — "Um dia" (editorial e fotográfica)
- **Composição:** página vertical clássica de revista. Fotografias grandes e assimétricas, a sangrar alternadamente para a esquerda e para a direita; títulos serifa grandes sobre o branco; um fragmento pequeno por imagem. A passagem do dia (branco → papel → navy) é o fio condutor.
- **Hero:** S1 grande à direita, título à esquerda a sobrepor-se à foto, troca de mensagens entre as duas pessoas da imagem.
- **Mobile:** fotografia em cima, mensagens a sobrepor a base, título e CTA por baixo.
- **Problema que resolve:** o P0-6 (falta de pessoas e relação) com o máximo de humanidade e textura.
- **Vantagem:** a mais humana e a mais distante de um SaaS; envelhece bem.
- **Custo:** depende inteiramente da qualidade da fotografia; sem fotografia final boa e licenciada, cai.

### B — "Entre os dois" (produto na vida real)
- **Composição:** díptico permanente. O ecrã é dividido em duas metades, uma para cada pessoa, cada uma no seu lugar e na sua hora. O LoveNest vive na calha entre as duas metades: as mensagens, os sinais de presença e as memórias atravessam-na. A cada capítulo as metades mudam (casa/trabalho, cidade/outra cidade, varanda/quarto) e a calha estreita-se; no capítulo 06 as metades juntam-se numa só imagem.
- **Hero:** ela à esquerda (rosa), ele à direita (azul), o "Chegaste bem?" a atravessar o meio.
- **Mobile:** as metades empilham-se (ele em cima, ela em baixo) e a conversa corre entre elas; ao fazer scroll, a distância entre as duas imagens diminui.
- **Problema que resolve:** P0-6 e a privacidade estrutural ao mesmo tempo: o espaço entre os dois é literalmente o produto.
- **Vantagem:** a composição é o conceito "duas pessoas, um espaço"; a mais proprietária das três.
- **Custo:** exige pares de fotografias coerentes (mesmas pessoas, lugares diferentes); a composição dividida é mais difícil de afinar entre 390 px e 1440 px.

### C — "Plano a plano" (cinemática mínima)
- **Composição:** planos de ecrã inteiro em scroll nativo, sem scroll-jacking nem snap obrigatório. As fotografias sucedem-se como planos de um filme, cada uma com uma só linha de texto. As duas marcas (rosa e azul) estão sempre no ecrã, pequenas, em lados opostos, e aproximam-se ao longo de toda a página; encontram-se no fim, no CTA. Poucas palavras; os fragmentos de produto aparecem um a um, como legendas.
- **Hero:** S1 em ecrã inteiro com escurecimento suave, uma linha serifa, as duas marcas afastadas nos cantos.
- **Mobile:** cada plano ocupa cerca de um ecrã vertical (`svh`), em scroll nativo e livre; o CTA principal aparece no primeiro plano e no último.
- **Problema que resolve:** P0-6 e o excesso de texto e listas (P1-12), com a página mais calma e mais memorável.
- **Vantagem:** a mais cinematográfica; o próprio scroll é a aproximação das duas pessoas.
- **Custo:** menos informação explícita (o visitante que quer saber "o que é" tem de chegar ao fim); scroll ligado a sequência é mais exigente em performance e acessibilidade, e precisa de uma alternativa estática completa para `prefers-reduced-motion`.

---

## Decisões tomadas (aprovação da Fase 3)

1. **Títulos:** Newsreader.
2. **Localização:** "Chegou a Casa" fica fora da Landing.
3. **Casal de exemplo:** Ana e Miguel.
4. **Destino do CTA:** os protótipos apontam para `/inicio?start=1`; a integração depende do Auth V3.
5. **Imagens:** sem Morphix nesta primeira ronda; os protótipos usam placeholders com a proporção e o shot brief corretos.
6. **Ajustes:** o arco manhã → noite é estrutura narrativa, não regra literal; sem contadores na privacidade; CTA fixo no mobile é hipótese, não regra; a direção C usa scroll nativo, sem scroll-jacking nem snap obrigatório; o capítulo Conversa usa "Um sítio só para falarem um com o outro."
