// ─── Tipos ────────────────────────────────────────────────────────────────────

export type BlockType =
  | "text"
  | "list"
  | "tip"
  | "warning"
  | "curiosity"
  | "doctor"
  | "highlight";

export interface ContentBlock {
  type: BlockType;
  title?: string;
  text?: string;
  items?: string[];
}

export interface Article {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string;
  readTime: number; // minutos
  phase?: string;   // 'menstrual' | 'folicular' | 'ovulacao' | 'luteal'
  tags: string[];
  intro: string;
  blocks: ContentBlock[];
  coupleNote: string;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  colorKey: string; // rose | sky | emerald | violet | pink | slate
  illustrationKey: string;
  articleIds: string[];
}

// ─── Conteúdo dos artigos ────────────────────────────────────────────────────

const ARTICLES: Article[] = [

  // ── O Ciclo ──────────────────────────────────────────────────────────────

  {
    id: "ciclo-fases",
    categoryId: "ciclo",
    title: "O Ciclo Menstrual: as 4 fases",
    subtitle: "Compreende o que acontece no teu corpo ao longo do mês",
    readTime: 7,
    tags: ["ciclo", "fases", "hormonas", "básicos", "menstruação", "ovulação"],
    intro:
      "O ciclo menstrual é muito mais do que os dias de menstruação. É um processo hormonal complexo e fascinante que se repete todos os meses — e que influencia a tua energia, humor, criatividade e até a forma como te relacionas com quem amas.",
    blocks: [
      {
        type: "text",
        title: "O que é o ciclo menstrual?",
        text: "O ciclo menstrual é o conjunto de alterações que o teu corpo realiza mensalmente para se preparar para uma possível gravidez. Começa no primeiro dia da menstruação e termina no dia anterior ao início da menstruação seguinte. A duração varia de mulher para mulher — entre 21 e 35 dias é considerado normal, sendo 28 dias o ciclo médio mais citado.",
      },
      {
        type: "highlight",
        title: "O teu ciclo é único",
        text: "Muito poucas mulheres têm ciclos exatamente de 28 dias. O teu ciclo pode variar de mês para mês e continuar a ser completamente saudável. O que importa é perceber o teu padrão único ao longo do tempo.",
      },
      {
        type: "text",
        title: "As 4 fases do ciclo",
        text: "O ciclo menstrual divide-se em quatro fases distintas, cada uma com as suas características hormonais, físicas e emocionais. Conhecê-las transforma a forma como compreendes o teu próprio corpo:",
      },
      {
        type: "list",
        title: "",
        items: [
          "Fase Menstrual (dias 1–5): o revestimento uterino é eliminado, os níveis hormonais estão no mínimo e o corpo pede descanso e gentileza.",
          "Fase Folicular (dias 6–13): o estrogénio sobe, os folículos ovarianos desenvolvem-se, a energia regressa e o humor clarifica a cada dia.",
          "Ovulação (dia ~14): o óvulo é libertado. É o pico de energia, confiança e libido. A janela fértil está aberta.",
          "Fase Lútea (dias 15–28): a progesterona domina. A energia baixa gradualmente e a sensibilidade emocional aumenta, especialmente nos últimos dias.",
        ],
      },
      {
        type: "text",
        title: "O papel das hormonas",
        text: "Quatro hormonas principais conduzem o ciclo: o estrogénio, a progesterona, o hormônio luteinizante (LH) e o hormônio folículo-estimulante (FSH). Cada uma tem o seu papel e o seu momento. Quando o equilíbrio entre elas funciona bem, o ciclo flui naturalmente. Quando algo as perturba — stress, dieta, doença, sono — o ciclo pode alterar-se.",
      },
      {
        type: "tip",
        title: "Acompanhar o ciclo muda tudo",
        text: "Registar o teu ciclo durante 3 meses seguidos dá-te um padrão muito mais fiável do que qualquer média de livro. Regista diariamente como te sentes — a LoveNest faz o resto.",
      },
      {
        type: "text",
        title: "O ciclo no dia-a-dia",
        text: "Muitas mulheres reconhecem que se sentem claramente diferentes em cada fase. Mais enérgicas e criativas na fase folicular e na ovulação. Mais introspetivas e sensíveis na fase lútea. Mais quietas na menstruação. Não é imaginação — é bioquímica real que afeta o teu pensamento, apetite, sono, libido e comunicação.",
      },
      {
        type: "doctor",
        title: "Quando consultar um médico",
        items: [
          "Ciclos com menos de 21 dias ou mais de 35 dias consistentemente",
          "Menstruações que duram mais de 7 dias ou são muito abundantes",
          "Dores muito intensas que impedem o dia-a-dia normal",
          "Ausência de menstruação por mais de 3 meses sem gravidez conhecida",
          "Sangramento entre ciclos sem causa aparente",
        ],
      },
      {
        type: "curiosity",
        title: "Sabia que?",
        text: "Em média, uma mulher tem aproximadamente 450 ciclos menstruais ao longo da vida. Se somarmos todos os dias de menstruação, o total equivale a cerca de 6 anos. É muito tempo para conheceres bem o teu corpo.",
      },
    ],
    coupleNote:
      "O ciclo da tua parceira influencia o seu humor, energia e disposição para o relacionamento de formas que vão muito além dos dias de menstruação. Conhecer as 4 fases é o primeiro passo para navegarem o mês com mais empatia e menos conflito desnecessário.",
  },

  // ── Menstruação ───────────────────────────────────────────────────────────

  {
    id: "o-que-e-menstruacao",
    categoryId: "menstruacao",
    title: "O que é a Menstruação?",
    subtitle: "O início de tudo — o que acontece e porque acontece",
    readTime: 5,
    phase: "menstrual",
    tags: ["menstruação", "período", "sangramento", "revestimento uterino", "hormonas"],
    intro:
      "A menstruação é o primeiro dia do ciclo e o sinal mais visível de que o teu corpo está a funcionar. Mas o que acontece exatamente por dentro — e porque acontece — é uma história fascinante de hormonas, tecidos e renovação.",
    blocks: [
      {
        type: "text",
        title: "O que é a menstruação?",
        text: "A menstruação é a eliminação do revestimento interno do útero (endométrio) que foi construído durante o ciclo anterior para receber um eventual óvulo fertilizado. Quando a fertilização não acontece, os níveis de progesterona e estrogénio caem abruptamente — o endométrio não é mais sustentado e é eliminado juntamente com um pouco de sangue.",
      },
      {
        type: "text",
        title: "O que é o fluxo menstrual?",
        text: "O que sai durante a menstruação não é apenas sangue. É uma mistura de sangue, células do endométrio, muco cervical e fluidos vaginais. A cor pode variar do vermelho vivo ao castanho escuro ao longo dos dias — ambos são completamente normais.",
      },
      {
        type: "list",
        title: "O que é normal no fluxo:",
        items: [
          "Duração: entre 3 e 7 dias",
          "Volume total: entre 30 e 80 ml por ciclo",
          "Cor: vermelho vivo no início, castanho no final",
          "Pequenos coágulos ocasionais (menores que 2–3 cm)",
          "Variação de mês para mês",
        ],
      },
      {
        type: "warning",
        title: "Sinais que merecem atenção",
        items: [
          "Coágulos maiores que uma moeda de 2€ de forma frequente",
          "Necessidade de trocar proteção a cada hora durante vários dias",
          "Menstruação com mais de 7 dias de duração regularmente",
          "Sangramento muito escasso ou ausência de menstruação",
        ],
      },
      {
        type: "text",
        title: "Porque tenho cólicas?",
        text: "Durante a menstruação, o útero contrai-se para expulsar o seu revestimento. Essas contrações são causadas por substâncias chamadas prostaglandinas. Quanto mais altos os níveis de prostaglandinas, mais intensas as contrações — e as cólicas. Calor local, ibuprofeno e movimento suave reduzem os sintomas na maioria dos casos.",
      },
      {
        type: "tip",
        title: "Alívio natural das cólicas",
        text: "Uma almofada térmica na zona abdominal, chá de gengibre ou camomila e ioga suave são tão eficazes quanto medicamentos de venda livre para cólicas ligeiras a moderadas. Experimenta em combinação.",
      },
      {
        type: "text",
        title: "A menstruação e o bem-estar emocional",
        text: "Os primeiros dias do período estão muitas vezes associados a sensações de cansaço, introspecção e menor tolerância ao stress. Não é fraqueza — é uma resposta fisiológica real à queda hormonal. O teu corpo pede literalmente descanso. Honrar esse pedido faz a menstruação passar mais suavemente.",
      },
      {
        type: "curiosity",
        title: "Uma curiosidade sobre o ciclo",
        text: "O revestimento uterino que é eliminado a cada menstruação pode ter entre 5 e 15 mm de espessura. É completamente reconstruído de raiz a cada ciclo — uma das renovações tecidulares mais extraordinárias do corpo humano.",
      },
      {
        type: "doctor",
        title: "Quando consultar um médico",
        items: [
          "Dores que impedem completamente o dia-a-dia normal",
          "Sangramento muito abundante ou com coágulos grandes e frequentes",
          "Menstruações irregulares ou ausentes por mais de 3 meses",
          "Sangramento após a menopausa",
        ],
      },
    ],
    coupleNote:
      "Durante a menstruação, a tua parceira está fisicamente e emocionalmente em modo de recuperação. Não precisa que resolvas nada — precisa da tua presença, paciência e pequenos gestos de carinho. Um chá, uma manta, não pressionar por conversas difíceis. É tão simples quanto isso.",
  },

  {
    id: "colicas",
    categoryId: "menstruacao",
    title: "Cólicas: causas e como aliviar",
    subtitle: "Porque doem, o que é normal e o que pode ajudar",
    readTime: 4,
    phase: "menstrual",
    tags: ["cólicas", "dismenorreia", "dor menstrual", "alívio", "prostaglandinas"],
    intro:
      "As cólicas menstruais são uma das queixas mais comuns — e mais incompreendidas. Não é fraqueza, não é exagero. É bioquímica. Compreender a causa é o primeiro passo para as gerir melhor.",
    blocks: [
      {
        type: "text",
        title: "O que causa as cólicas?",
        text: "As cólicas menstruais (dismenorreia) são causadas por substâncias chamadas prostaglandinas, produzidas pelo endométrio antes e durante a menstruação. Estas substâncias estimulam as contrações uterinas para expulsar o revestimento. Quanto mais prostaglandinas, mais intensas as contrações e a dor.",
      },
      {
        type: "list",
        title: "Tipos de cólicas:",
        items: [
          "Primárias: sem causa médica subjacente — as mais comuns, especialmente nos primeiros anos após a primeira menstruação",
          "Secundárias: causadas por condições como endometriose, fibromiomas, adenomiose ou doenças inflamatórias pélvicas",
        ],
      },
      {
        type: "text",
        title: "Onde e quando aparecem?",
        text: "A dor começa geralmente algumas horas antes ou no primeiro dia da menstruação. Localiza-se principalmente na zona inferior do abdómen, mas pode irradiar para as costas e coxas. Normalmente diminui ao fim de 1–3 dias.",
      },
      {
        type: "tip",
        title: "O que realmente ajuda",
        items: [
          "Calor local: almofada térmica, botija de água quente ou banho quente",
          "Ibuprofeno ou naproxeno (anti-inflamatórios que reduzem prostaglandinas)",
          "Movimento suave: ioga, alongamentos, caminhada curta",
          "Chá de gengibre, camomila ou canela",
          "Massagem circular suave na zona abdominal",
          "Evitar cafeína, álcool e sal em excesso",
        ],
      },
      {
        type: "warning",
        title: "Dores que não são normais",
        text: "Cólicas que aumentam de intensidade ao longo dos anos, que não respondem a medicação de venda livre, que aparecem fora do período ou que são acompanhadas de dor durante as relações sexuais merecem uma avaliação médica — podem indicar endometriose ou outra condição.",
      },
      {
        type: "curiosity",
        title: "Curiosidade",
        text: "Estudos mostram que a dismenorreia é a causa número um de absentismo escolar entre adolescentes do sexo feminino, mas continua sistematicamente subdiagnosticada e subvalorizada. Falar abertamente sobre cólicas — sem as minimizar — é um acto de saúde pública.",
      },
      {
        type: "doctor",
        title: "Quando consultar um médico",
        items: [
          "Dores que impedem completamente as actividades normais",
          "Cólicas que aumentam de intensidade ao longo dos anos",
          "Não resposta a anti-inflamatórios",
          "Dor fora do período menstrual",
          "Suspeita de endometriose, adenomiose ou outra condição",
        ],
      },
    ],
    coupleNote:
      "Quando a tua parceira tem cólicas intensas, o que ela menos precisa é ouvir \"mas é sempre assim\". O que ela precisa é de calor, silêncio e presença. Uma almofada térmica trazida sem que ela peça vale mais do que qualquer palavra.",
  },

  // ── Ovulação ──────────────────────────────────────────────────────────────

  {
    id: "como-acontece-ovulacao",
    categoryId: "ovulacao",
    title: "Como acontece a Ovulação?",
    subtitle: "O momento mais intenso do ciclo — dentro e fora do teu corpo",
    readTime: 5,
    phase: "ovulacao",
    tags: ["ovulação", "óvulo", "LH", "fertilidade", "hormonas", "folículo"],
    intro:
      "A ovulação é o pico do ciclo menstrual — o momento em que o teu corpo liberta um óvulo e, com ele, um pico de energia, confiança e vitalidade. É fascinante como tão breve evento hormonal tem um impacto tão amplo no teu bem-estar.",
    blocks: [
      {
        type: "text",
        title: "O que é a ovulação?",
        text: "A ovulação é a libertação de um óvulo maduro por um dos ovários. Acontece geralmente ao redor do dia 14 do ciclo (num ciclo de 28 dias), mas pode variar significativamente. O óvulo permanece viável durante apenas 12 a 24 horas após a sua libertação.",
      },
      {
        type: "text",
        title: "Como acontece exatamente?",
        text: "Durante a fase folicular, os níveis de estrogénio sobem e estimulam o hipotálamo a libertar GnRH, que por sua vez estimula a hipófise a produzir um pico de LH (hormônio luteinizante). Este pico de LH — que acontece 24 a 36 horas antes da ovulação — é o sinal que desencadeia a rotura do folículo e a libertação do óvulo.",
      },
      {
        type: "list",
        title: "Sinais de que estás a ovular:",
        items: [
          "Corrimento tipo clara de ovo (mais elástico e transparente) — o sinal mais fiável",
          "Ligeiro aumento da temperatura corporal basal (0,2–0,5°C) após a ovulação",
          "Dor ligeira ou pressão num dos lados da zona abdominal baixa (Mittelschmerz)",
          "Sensibilidade aumentada nas mamas",
          "Libido naturalmente mais elevada",
          "Sensação de maior energia e sociabilidade",
        ],
      },
      {
        type: "highlight",
        title: "A ovulação não é sempre no dia 14",
        text: "Em ciclos que não têm exatamente 28 dias, a ovulação acontece proporcionalmente. Num ciclo de 35 dias, a ovulação pode acontecer no dia 21. O que fica constante é a fase lútea — geralmente 14 dias antes da menstruação.",
      },
      {
        type: "text",
        title: "O óvulo e a viagem até ao útero",
        text: "Após ser libertado, o óvulo é captado pelas fímbrias da trompa de Falópio e começa a sua viagem até ao útero. Esse percurso demora entre 3 e 5 dias. É durante este trajeto que pode acontecer a fertilização, se um espermatozóide chegar a tempo.",
      },
      {
        type: "tip",
        title: "Como identificar a ovulação",
        text: "O método mais acessível é observar as alterações no corrimento vaginal. Na ovulação, torna-se claro, elástico e parece clara de ovo — o que facilita o movimento dos espermatozóides. Usar kits de ovulação que detetam o pico de LH na urina é a forma mais precisa para quem está a tentar engravidar.",
      },
      {
        type: "curiosity",
        title: "Uma ovulação, dois ovários",
        text: "Cada ciclo, geralmente apenas um dos dois ovários ovula. A escolha não é alternada de forma rígida — é um processo relativamente aleatório. Em ciclos estimulados (como na FIV), ambos os ovários podem ser ativados em simultâneo.",
      },
    ],
    coupleNote:
      "Durante a ovulação, a tua parceira está no pico da sua vitalidade e abertura emocional. É o melhor momento do ciclo para conversas importantes, intimidade, planos e conexão. Aproveita — e sê presente.",
  },

  {
    id: "janela-fertil",
    categoryId: "ovulacao",
    title: "A Janela Fértil",
    subtitle: "Os dias de maior probabilidade — e o que isso significa",
    readTime: 4,
    phase: "ovulacao",
    tags: ["janela fértil", "fertilidade", "ovulação", "espermatozóides", "conceção"],
    intro:
      "A janela fértil é o período do ciclo em que a gravidez é possível. Perceber quando acontece — e porque — é essencial, seja para quem quer engravidar, seja para quem quer evitar.",
    blocks: [
      {
        type: "text",
        title: "O que é a janela fértil?",
        text: "A janela fértil é o período de 5 a 6 dias por ciclo em que a gravidez é possível. Começa cerca de 5 dias antes da ovulação (porque os espermatozóides podem sobreviver até 5 dias no trato reprodutivo feminino) e termina 1 dia após a ovulação (o óvulo só é viável 12–24 horas).",
      },
      {
        type: "list",
        title: "A janela fértil típica (ciclo de 28 dias):",
        items: [
          "Dias 9–10: probabilidade baixa mas possível",
          "Dias 11–13: probabilidade crescente",
          "Dia 14 (ovulação): probabilidade máxima",
          "Dia 15: probabilidade ainda elevada",
          "Dia 16 em diante: probabilidade muito baixa",
        ],
      },
      {
        type: "warning",
        title: "Atenção: a janela fértil muda com o ciclo",
        text: "Em ciclos irregulares ou sob stress, a ovulação pode atrasar ou acontecer mais cedo. Confiar num calendário fixo sem confirmação pelos sinais do corpo pode ser enganador — tanto para quem quer engravidar como para quem quer evitar.",
      },
      {
        type: "text",
        title: "Como confirmar a janela fértil?",
        text: "A combinação mais fiável é observar as alterações no corrimento (fica tipo clara de ovo) e usar um kit de ovulação que deteta o pico de LH. A temperatura basal confirma que a ovulação JÁ aconteceu — útil para aprender o padrão, não para prever com antecedência.",
      },
      {
        type: "tip",
        title: "Mito frequente",
        text: "\"A menstruação protege de gravidez\" é falso. Se o ciclo for curto ou a ovulação acontecer cedo, pode ser fértil ainda a terminar o período. A janela fértil move-se com o ciclo, não com o calendário.",
      },
      {
        type: "curiosity",
        title: "Sobrevivência dos espermatozóides",
        text: "Os espermatozóides podem sobreviver até 5 dias no trato reprodutivo feminino, especialmente quando o corrimento é fértil (tipo clara de ovo), que funciona como meio de transporte ideal. É por isso que a relação sexual dias antes da ovulação pode resultar em gravidez.",
      },
    ],
    coupleNote:
      "Conhecer a janela fértil da tua parceira é importante para os dois, independentemente de quererem ou não engravidar. É uma parte do corpo dela que afeta diretamente o casal — e que merece ser discutida com abertura e sem tabus.",
  },

  // ── Fase Folicular ────────────────────────────────────────────────────────

  {
    id: "fase-folicular",
    categoryId: "folicular",
    title: "A Fase Folicular: energia a crescer",
    subtitle: "A renovação, a clareza e o poder desta fase",
    readTime: 4,
    phase: "folicular",
    tags: ["fase folicular", "estrogénio", "energia", "criatividade", "renovação", "folículos"],
    intro:
      "A fase folicular começa no primeiro dia da menstruação e estende-se até à ovulação. É a fase de reconstrução — onde tudo o que estava no mínimo começa a recuperar. A energia volta, o humor clarifica e o mundo começa a parecer mais interessante.",
    blocks: [
      {
        type: "text",
        title: "O que acontece na fase folicular?",
        text: "O nome desta fase vem dos folículos — pequenos sacos nos ovários que contêm óvulos imaturos. Sob a influência do hormônio FSH (folículo-estimulante), vários folículos começam a crescer. Geralmente, apenas um torna-se dominante e matura completamente, pronto para ovular. Este processo demora entre 7 e 21 dias, dependendo do comprimento total do ciclo.",
      },
      {
        type: "text",
        title: "O papel do estrogénio",
        text: "À medida que os folículos crescem, produzem quantidades crescentes de estrogénio. Este hormônio tem efeitos que vão muito além do útero: melhora o humor, aumenta a energia, potencia a memória e a cognição, melhora a pele e aumenta a sociabilidade. É o hormônio responsável pela sensação de \"sentir-me eu própria de novo\".",
      },
      {
        type: "list",
        title: "Como te podes sentir:",
        items: [
          "Energia crescente a cada dia que passa",
          "Humor mais optimista e estável",
          "Pensamento mais claro e foco mais fácil",
          "Maior interesse em socializar",
          "Curiosidade e criatividade naturalmente elevadas",
          "Libido a começar a subir progressivamente",
        ],
      },
      {
        type: "tip",
        title: "A melhor fase para começar coisas",
        text: "A fase folicular é biologicamente ideal para iniciar novos projectos, aprender algo novo, marcar reuniões importantes ou ter conversas difíceis. A tua cognição e resiliência emocional estão a crescer — aproveita esse impulso.",
      },
      {
        type: "text",
        title: "O que acontece no útero?",
        text: "Em simultâneo com o desenvolvimento dos folículos, o útero começa a reconstruir o seu revestimento (endométrio). Sob o efeito do estrogénio, o endométrio engrossa e prepara-se para receber um óvulo fertilizado, caso venha a acontecer.",
      },
      {
        type: "curiosity",
        title: "Curiosidade",
        text: "Cada ovário contém entre 200.000 e 400.000 folículos ao nascer. Com o tempo, vão desaparecendo num processo chamado atresia folicular. Quando a reserva se esgota, acontece a menopausa — mas isso é um processo gradual que demora décadas.",
      },
    ],
    coupleNote:
      "Durante a fase folicular, a tua parceira está a recuperar energia e disposição. É um ótimo momento para planos a dois, conversas mais profundas e novas experiências juntos. A sua abertura emocional está a crescer — acompanha-a.",
  },

  // ── Fase Lútea & TPM ──────────────────────────────────────────────────────

  {
    id: "fase-luteal",
    categoryId: "luteal",
    title: "A Fase Lútea",
    subtitle: "A progesterona, a sensibilidade e o que esperar",
    readTime: 5,
    phase: "luteal",
    tags: ["fase lútea", "progesterona", "corpo lúteo", "sensibilidade", "cansaço"],
    intro:
      "A fase lútea é a segunda metade do ciclo — começa logo após a ovulação e dura até ao início da próxima menstruação. É a fase mais longa e, para muitas mulheres, a mais desafiante. Mas compreendê-la muda completamente a forma como a vivemos.",
    blocks: [
      {
        type: "text",
        title: "O que é a fase lútea?",
        text: "Após a ovulação, o folículo que libertou o óvulo transforma-se numa estrutura chamada corpo lúteo. O corpo lúteo produz progesterona — o hormônio dominante desta fase. A progesterona prepara o endométrio para receber um óvulo fertilizado e mantém o ambiente uterino hospitaleiro para uma possível gravidez.",
      },
      {
        type: "text",
        title: "O que acontece se não há fertilização?",
        text: "Se o óvulo não for fertilizado, o corpo lúteo começa a regredir ao fim de 10–14 dias. Os níveis de progesterona (e estrogénio) caem abruptamente. É essa queda que desencadeia a descamação do endométrio — a menstruação — e o início de um novo ciclo.",
      },
      {
        type: "list",
        title: "Como te podes sentir:",
        items: [
          "Energia mais baixa do que nas fases anteriores",
          "Maior necessidade de descanso e sono",
          "Sensibilidade emocional mais elevada",
          "Possível inchaço, especialmente na zona abdominal",
          "Seios sensíveis ou mais pesados",
          "Desejos alimentares (especialmente por açúcar e hidratos de carbono)",
          "Nos últimos dias: sintomas de TPM em muitas mulheres",
        ],
      },
      {
        type: "highlight",
        title: "A fase lútea dura sempre ~14 dias",
        text: "Ao contrário da fase folicular, que pode variar muito, a fase lútea tem uma duração relativamente constante: entre 12 e 16 dias (geralmente 14). Se o teu ciclo varia, é porque a fase folicular é mais curta ou mais longa — não a lútea.",
      },
      {
        type: "tip",
        title: "O que ajuda nesta fase",
        items: [
          "Reduzir o sal (diminui retenção de líquidos e inchaço)",
          "Evitar álcool e cafeína em excesso (amplificam irritabilidade)",
          "Priorizar sono de qualidade",
          "Alimentos ricos em magnésio: chocolate escuro, amêndoas, banana",
          "Actividade física moderada: yoga, pilates, caminhadas",
        ],
      },
      {
        type: "curiosity",
        title: "Curiosidade hormonal",
        text: "A progesterona tem efeito sedativo leve no sistema nervoso central — é parte da razão pela qual te sentes mais cansada e menos tolerante ao stress nesta fase. Não é fraqueza: é farmacologia interna.",
      },
    ],
    coupleNote:
      "A fase lútea é a que mais afeta o humor e a comunicação do casal. A sensibilidade da tua parceira não é instabilidade — é uma resposta fisiológica real. Mais paciência, menos discussões desnecessárias e pequenos gestos de atenção fazem uma diferença enorme nos últimos dias antes da menstruação.",
  },

  {
    id: "tpm",
    categoryId: "luteal",
    title: "TPM: o que é e porque acontece",
    subtitle: "A ciência por detrás da tensão pré-menstrual",
    readTime: 6,
    phase: "luteal",
    tags: ["TPM", "tensão pré-menstrual", "humor", "inchaço", "progesterona", "PMS"],
    intro:
      "A TPM (Tensão Pré-Menstrual) afeta entre 75 a 80% das mulheres em idade reprodutiva. Não é fraqueza, não é exagero e não é \"coisa da cabeça\". É uma condição real com causas fisiológicas bem documentadas — e que pode ser gerida.",
    blocks: [
      {
        type: "text",
        title: "O que é a TPM?",
        text: "A TPM é um conjunto de sintomas físicos, emocionais e comportamentais que aparecem nos dias que precedem a menstruação (geralmente nos últimos 5–14 dias do ciclo) e desaparecem com o início do período. Para ser considerada TPM, os sintomas têm de ser suficientemente intensos para afetar o dia-a-dia.",
      },
      {
        type: "text",
        title: "Porque acontece a TPM?",
        text: "A causa exata ainda não é completamente conhecida, mas sabe-se que está relacionada com as flutuações dos níveis de estrogénio e progesterona na segunda metade do ciclo. Estas alterações hormonais afetam os neurotransmissores cerebrais — especialmente a serotonina, que regula o humor, o sono e o apetite.",
      },
      {
        type: "list",
        title: "Sintomas físicos comuns:",
        items: [
          "Inchaço abdominal e retenção de líquidos",
          "Sensibilidade e tensão nos seios",
          "Cefaleias ou enxaquecas",
          "Cólicas antes da menstruação",
          "Cansaço e fadiga",
          "Alterações no sono (insónia ou sonolência excessiva)",
          "Alterações no apetite e desejos alimentares",
        ],
      },
      {
        type: "list",
        title: "Sintomas emocionais e comportamentais:",
        items: [
          "Irritabilidade e maior dificuldade em lidar com frustração",
          "Ansiedade ou nervosismo sem causa aparente",
          "Tristeza ou choro fácil",
          "Dificuldade de concentração",
          "Sensação de estar sobrecarregada",
          "Retraimento social",
        ],
      },
      {
        type: "warning",
        title: "PMDD — a forma severa",
        text: "A Perturbação Disfórica Pré-Menstrual (PMDD) é uma forma grave de TPM que afeta entre 3 e 8% das mulheres. Os sintomas emocionais são muito intensos e podem incluir depressão severa, pensamentos negativos persistentes e dificuldade em funcionar. Tem tratamento eficaz — consulta um médico se reconheceres estes padrões.",
      },
      {
        type: "tip",
        title: "O que realmente ajuda na TPM",
        items: [
          "Exercício aeróbico regular ao longo do mês (reduz sintomas até 50%)",
          "Dieta com menos sal, açúcar e álcool na semana antes do período",
          "Suplementação de magnésio e vitamina B6 (evidência razoável)",
          "Gestão de stress: meditação, journaling, sono de qualidade",
          "Ibuprofeno para dores e inchaço quando necessário",
          "Em casos severos: consulta médica para opções hormonais",
        ],
      },
      {
        type: "curiosity",
        title: "Curiosidade",
        text: "A nomenclatura \"Tensão Pré-Menstrual\" foi formalmente reconhecida pela medicina apenas em 1931. Durante décadas, os sintomas foram sistematicamente atribuídos a \"histeria\" ou \"instabilidade emocional\". Hoje sabemos que é uma condição com base biológica clara — e que merece ser levada a sério.",
      },
      {
        type: "doctor",
        title: "Quando consultar um médico",
        items: [
          "Sintomas que impedem o dia-a-dia normal durante vários dias por mês",
          "Depressão ou ansiedade intensa antes do período",
          "Sintomas que não melhoram com mudanças de estilo de vida",
          "Suspeita de PMDD",
        ],
      },
    ],
    coupleNote:
      "A TPM pode ser um dos maiores desafios do relacionamento — mas só quando não é compreendida. Quando o parceiro sabe o que é, quando começa e o que pode fazer para ajudar, deixa de ser um problema entre os dois e passa a ser algo que enfrentam juntos. Pergunta, não assumas. Está presente, não te afastes.",
  },

  // ── Fertilidade ───────────────────────────────────────────────────────────

  {
    id: "como-funciona-fertilidade",
    categoryId: "fertilidade",
    title: "Como funciona a Fertilidade",
    subtitle: "Tudo o que afecta a capacidade de engravidar",
    readTime: 6,
    tags: ["fertilidade", "conceção", "óvulo", "espermatozóides", "fatores", "estilo de vida"],
    intro:
      "A fertilidade não é um interruptor de ligar e desligar. É um espectro dinâmico que varia com a idade, o ciclo e inúmeros factores do dia-a-dia. Compreendê-la — mesmo sem querer engravidar agora — é conhecer melhor o teu corpo.",
    blocks: [
      {
        type: "text",
        title: "O que é a fertilidade?",
        text: "A fertilidade feminina refere-se à capacidade de conceber um filho. Depende da qualidade e quantidade dos óvulos disponíveis, da saúde das trompas de Falópio (que conduzem o óvulo ao útero), da qualidade do endométrio (onde o embrião se implanta) e do equilíbrio hormonal que regula todo o processo.",
      },
      {
        type: "text",
        title: "A fertilidade e a idade",
        text: "A fertilidade feminina está diretamente ligada à reserva ovárica — o número de óvulos disponíveis. Esta reserva diminui progressivamente desde o nascimento. A fertilidade começa a declinar de forma mais acentuada a partir dos 35 anos e mais ainda após os 40. Isto não significa que engravidar seja impossível mais tarde, mas que pode ser mais demorado.",
      },
      {
        type: "list",
        title: "Factores que influenciam a fertilidade:",
        items: [
          "Idade — o factor mais determinante",
          "Qualidade e regularidade do ciclo menstrual",
          "Peso corporal — tanto o excesso como o deficit afectam a ovulação",
          "Stress crónico — pode suprimir ou atrasar a ovulação",
          "Tabagismo — reduz significativamente a reserva ovárica",
          "Condições médicas: endometriose, SOP, problemas tiróideos",
          "Infecções anteriores não tratadas nas trompas",
        ],
      },
      {
        type: "tip",
        title: "O que potencia a fertilidade",
        items: [
          "Manter um peso saudável",
          "Dieta mediterrânica: vegetais, azeite, peixe, leguminosas",
          "Reduzir ou eliminar tabaco",
          "Limitar o álcool",
          "Gerir o stress",
          "Tratar condições como SOP ou hipotiroidismo",
          "Ácido fólico — essencial se planeias engravidar",
        ],
      },
      {
        type: "text",
        title: "Quando procurar ajuda médica",
        text: "Recomenda-se consulta médica se, após 12 meses de tentativas regulares (sem contracepção), não houver gravidez. Para mulheres com mais de 35 anos, esse prazo reduz para 6 meses. Em casos com ciclos irregulares ou histórico de problemas ginecológicos, é prudente consultar ainda antes.",
      },
      {
        type: "curiosity",
        title: "A fertilidade masculina também importa",
        text: "Em cerca de metade dos casos de dificuldade em engravidar, há um factor masculino envolvido. O espermiograma — análise ao sémen — é um exame simples que deve fazer parte da avaliação inicial do casal. A fertilidade é sempre uma questão de dois.",
      },
    ],
    coupleNote:
      "A fertilidade é um tema do casal, não apenas da mulher. Quando uma gravidez é desejada e demora, é essencial que ambos façam avaliações e que o stress seja partilhado — não concentrado apenas num dos dois. Apoio mútuo e comunicação aberta são tão importantes quanto os testes médicos.",
  },

  // ── Saúde Íntima ──────────────────────────────────────────────────────────

  {
    id: "higiene-intima",
    categoryId: "saude",
    title: "Higiene Íntima: o essencial",
    subtitle: "O que realmente protege — e o que faz mal",
    readTime: 4,
    tags: ["higiene íntima", "pH vaginal", "saúde vaginal", "limpeza", "microbioma"],
    intro:
      "A zona íntima tem os seus próprios mecanismos de limpeza e protecção. Interferir excessivamente com eles pode ser tão prejudicial quanto negligenciá-los. Menos é mais — e a ciência confirma.",
    blocks: [
      {
        type: "text",
        title: "A vagina é auto-suficiente",
        text: "A vagina possui um microbioma natural — um ecossistema de bactérias benéficas (principalmente Lactobacillus) que mantêm o pH ácido entre 3,8 e 4,5. Este ambiente ácido protege contra infecções. Interferir excessivamente com ele — usando produtos perfumados, duchas ou sabões inapropriados — perturba este equilíbrio.",
      },
      {
        type: "list",
        title: "O que é seguro e recomendado:",
        items: [
          "Lavar a vulva (a parte exterior) com água morna",
          "Usar, se preferires, gel íntimo com pH adequado (entre 3,5 e 4,5)",
          "Roupa interior de algodão, que permite circulação de ar",
          "Mudar frequentemente os pensos durante a menstruação",
          "Limpar sempre de frente para trás para evitar contaminação",
        ],
      },
      {
        type: "warning",
        title: "O que evitar",
        items: [
          "Duchas vaginais — perturbam o microbioma e aumentam o risco de infecções",
          "Sabões perfumados ou produtos com pH elevado na zona vaginal",
          "Roupa muito justa e sintética durante longos períodos",
          "Absorventes perfumados — podem causar irritação",
          "Não lavar a zona vulvar — o mínimo de higiene externa é necessário",
        ],
      },
      {
        type: "text",
        title: "O corrimento normal é sinal de saúde",
        text: "O corrimento vaginal é normal e faz parte dos mecanismos de auto-limpeza e lubrificação da vagina. Varia ao longo do ciclo — mais escasso e espesso após a menstruação, mais abundante e elástico na ovulação. Alarmar-se com a sua presença é desnecessário na maioria dos casos.",
      },
      {
        type: "doctor",
        title: "Sinais que merecem atenção médica",
        items: [
          "Corrimento com odor intenso ou invulgar",
          "Corrimento verde, amarelo ou com grumos",
          "Comichão ou ardor persistentes",
          "Dor durante as relações sexuais",
          "Irritação que não melhora com mudanças simples",
        ],
      },
    ],
    coupleNote:
      "A saúde íntima é um tema que afeta o casal mas raramente é discutido abertamente. Criar um espaço seguro para falar sobre desconfortos, infecções ou preocupações — sem julgamento — é um pilar da intimidade saudável.",
  },

  {
    id: "corrimento-vaginal",
    categoryId: "saude",
    title: "Corrimento Vaginal: o que é normal?",
    subtitle: "Como interpretar as variações ao longo do ciclo",
    readTime: 4,
    tags: ["corrimento", "leucorreia", "muco cervical", "ciclo", "infecção", "normal"],
    intro:
      "O corrimento vaginal é uma das formas mais reveladoras de conhecer o ciclo. Mas também é um dos temas que mais gera dúvidas e ansiedade desnecessária. Aprender a interpretá-lo é uma ferramenta poderosa de auto-conhecimento.",
    blocks: [
      {
        type: "text",
        title: "O que é o corrimento vaginal?",
        text: "O corrimento vaginal (também chamado leucorreia quando normal) é produzido pelas glândulas do colo do útero e da vagina. A sua função é manter a vagina lubrificada, limpa e protegida. A quantidade, textura e cor variam naturalmente ao longo do ciclo — e ao longo da vida.",
      },
      {
        type: "list",
        title: "Como muda ao longo do ciclo:",
        items: [
          "Após a menstruação: escasso, espesso e branco ou amarelado — a \"janela seca\"",
          "Fase folicular: começa a aumentar, mais cremoso e branco",
          "Próximo da ovulação: abundante, transparente e elástico como clara de ovo — o sinal fértil",
          "Após a ovulação: regressa a textura mais espessa e branca",
          "Antes da menstruação: pode tornar-se mais amarelado ou com aspecto diferente",
        ],
      },
      {
        type: "highlight",
        title: "Corrimento fértil: o guia da ovulação",
        text: "O corrimento tipo clara de ovo — transparente, elástico (estica entre os dedos sem partir) — é o sinal mais fiável de que a ovulação está iminente. É biologicamente desenhado para facilitar o movimento dos espermatozóides.",
      },
      {
        type: "warning",
        title: "Quando o corrimento pode indicar problema",
        items: [
          "Odor de peixe intenso (possível vaginose bacteriana)",
          "Textura de queijo fresco com comichão intensa (possível candidíase)",
          "Verde, amarelo brilhante ou espumoso (possível IST)",
          "Sangue fora do período sem causa conhecida",
          "Aumento súbito e acompanhado de ardor ou irritação",
        ],
      },
      {
        type: "tip",
        title: "Aprende a conhecer o teu padrão",
        text: "Observar e registar o corrimento ao longo de 2–3 ciclos dá-te o teu padrão normal. O que é normal para uma mulher pode ser diferente para outra. Conhecer o teu padrão ajuda-te a reconhecer desvios rapidamente.",
      },
    ],
    coupleNote:
      "O corrimento vaginal é muitas vezes fonte de vergonha desnecessária. Que o teu par entenda que é um sinal natural e saudável — não de falta de higiene — contribui para uma relação íntima mais confortável e sem tabus.",
  },

  // ── Emoções ───────────────────────────────────────────────────────────────

  {
    id: "hormonas-emocoes",
    categoryId: "emocoes",
    title: "Hormonas e Emoções: a ligação",
    subtitle: "Como o ciclo influencia o humor, a mente e as relações",
    readTime: 5,
    tags: ["hormonas", "humor", "emoções", "serotonina", "estrogénio", "ciclo emocional"],
    intro:
      "Sentires-te diferente em diferentes partes do mês não é instabilidade emocional. É bioquímica. O ciclo menstrual afecta directamente os neurotransmissores do cérebro — e compreender essa ligação muda completamente a forma como te relacionas contigo própria.",
    blocks: [
      {
        type: "text",
        title: "As hormonas do ciclo e o cérebro",
        text: "O estrogénio e a progesterona não agem apenas no útero e nos ovários — atravessam a barreira hemato-encefálica e afectam directamente o funcionamento do cérebro. O estrogénio aumenta os níveis de serotonina e dopamina (neurotransmissores do bem-estar). A progesterona tem efeito sedativo leve mas pode interferir com a sensibilidade emocional.",
      },
      {
        type: "list",
        title: "Humor ao longo do ciclo:",
        items: [
          "Fase menstrual: introspecção, cansaço, possível tristeza leve — o cérebro está no mínimo hormonal",
          "Fase folicular: crescente optimismo, clareza mental, maior resiliência emocional",
          "Ovulação: pico de bem-estar, confiança, extroversão e libido",
          "Fase lútea: maior sensibilidade emocional, irritabilidade possível, menor tolerância ao stress",
        ],
      },
      {
        type: "text",
        title: "A serotonina e o ciclo",
        text: "A serotonina é crucial para o equilíbrio emocional — e os seus níveis variam com o ciclo. O estrogénio potencia a produção e a eficácia da serotonina. Quando os níveis de estrogénio caem (na fase lútea e na menstruação), a serotonina pode diminuir, contribuindo para maior irritabilidade, ansiedade e tristeza.",
      },
      {
        type: "highlight",
        title: "Não és as tuas hormonas — mas elas influenciam-te",
        text: "Reconhecer que parte das emoções que sentes tem uma base hormonal não te tira responsabilidade ou agência. Pelo contrário: dá-te contexto para te observares com mais gentileza e para comunicares melhor com quem está à tua volta.",
      },
      {
        type: "tip",
        title: "Como usar este conhecimento",
        items: [
          "Agenda actividades sociais e decisões importantes para a fase folicular/ovulação",
          "Reserva tempo para introspecção e descanso na fase lútea tardia e menstruação",
          "Comunica ao teu par em que fase estás — isso só requer uma frase",
          "Usa o registo de humor na LoveNest para identificar os teus padrões ao longo do tempo",
        ],
      },
      {
        type: "curiosity",
        title: "O ciclo e a criatividade",
        text: "Algumas investigações sugerem que a criatividade verbal e a memória verbal são mais aguçadas na fase folicular e na ovulação, quando o estrogénio está em alta. A fase lútea pode ser melhor para pensamento mais analítico e orientado para detalhes. Usar o ciclo como calendário de produtividade começa a ganhar adeptos em áreas como liderança e desempenho desportivo.",
      },
    ],
    coupleNote:
      "O estado emocional da tua parceira muda ao longo do mês — e isso afecta inevitavelmente o casal. Quando a percebes mais irritável ou retraída, saber que pode ser fase lútea muda completamente como respondes. Em vez de te sentires atacado, podes perguntar: \"Como estás? Em que fase estás?\" Esse simples gesto pode transformar um conflito numa conversa.",
  },

  // ── Gravidez ──────────────────────────────────────────────────────────────

  {
    id: "gravidez-sinais",
    categoryId: "gravidez",
    title: "Primeiros Sinais de Gravidez",
    subtitle: "O que o corpo comunica nas primeiras semanas",
    readTime: 4,
    tags: ["gravidez", "sinais", "sintomas", "teste", "implantação", "hCG"],
    intro:
      "Os primeiros sinais de gravidez são subtis e facilmente confundíveis com sintomas pré-menstruais. Compreender a diferença — e quando fazer um teste — reduz a ansiedade e a incerteza das primeiras semanas.",
    blocks: [
      {
        type: "text",
        title: "Quando começam os primeiros sinais?",
        text: "A implantação do embrião no útero acontece geralmente entre o 6.º e o 12.º dia após a fertilização. É a partir desse momento que o organismo começa a produzir hCG (hormônio gonadotrofina coriónica humana) — a hormona que os testes de gravidez detetam. Os sintomas surgem à medida que o hCG sobe.",
      },
      {
        type: "list",
        title: "Sinais mais comuns nas primeiras semanas:",
        items: [
          "Atraso menstrual — o sinal mais óbvio",
          "Sensibilidade ou dor nos seios — semelhante à TPM mas geralmente mais intensa",
          "Cansaço intenso e invulgar",
          "Náuseas (podem aparecer já às 2–3 semanas após a fertilização)",
          "Maior frequência urinária",
          "Corrimento rosado ligeiro (sangramento de implantação) — pode confundir-se com o início do período",
          "Sensibilidade a cheiros",
          "Aumento da temperatura corporal basal que se mantém elevada",
        ],
      },
      {
        type: "highlight",
        title: "TPM vs. gravidez precoce",
        text: "Muitos dos sintomas das primeiras semanas de gravidez são idênticos aos da TPM — o que torna a distinção difícil. A única forma de confirmar é com um teste de gravidez após o atraso menstrual.",
      },
      {
        type: "tip",
        title: "Quando fazer o teste?",
        text: "Os testes modernos de urina são muito sensíveis e podem detetar gravidez 1–2 dias antes do atraso menstrual esperado. Para maior fiabilidade, faz o teste na primeira urina da manhã (mais concentrada). Um resultado negativo com suspeita de gravidez deve ser repetido 2–3 dias depois.",
      },
      {
        type: "text",
        title: "Sangramento de implantação",
        text: "Entre 20 a 30% das mulheres experienciam um pequeno sangramento rosado ou castanho claro na altura em que o embrião se implanta no útero. Este sangramento é geralmente muito ligeiro e breve (1–2 dias). Pode confundir-se facilmente com o início de uma menstruação mais escassa.",
      },
      {
        type: "doctor",
        title: "Quando contactar um médico",
        items: [
          "Teste de gravidez positivo — para confirmar e iniciar acompanhamento",
          "Sangramento abundante com suspeita de gravidez",
          "Dor intensa num dos lados do abdómen (excluir gravidez ectópica)",
          "Náuseas tão intensas que impedem a alimentação",
        ],
      },
    ],
    coupleNote:
      "A espera entre uma possível concepção e o resultado do teste é emocionalmente intensa para os dois. Seja qual for o resultado, vivê-lo juntos — sem pressão e com comunicação aberta — é o que fortalece o casal. Um resultado inesperado, de qualquer sinal, merece conversa, não silêncio.",
  },

  // ── FAQ ───────────────────────────────────────────────────────────────────

  {
    id: "faq-ciclo",
    categoryId: "faq",
    title: "As Perguntas Mais Comuns",
    subtitle: "Respostas directas às dúvidas que toda a gente tem mas poucas perguntam",
    readTime: 6,
    tags: ["FAQ", "perguntas", "dúvidas", "mitos", "ciclo", "menstruação"],
    intro:
      "Há perguntas sobre o ciclo que ficam por fazer — por vergonha, por não saber a quem perguntar ou por achar que é óbvio e só tu não sabes. Não é. Estas são as dúvidas mais comuns — e as respostas honestas.",
    blocks: [
      {
        type: "text",
        title: "É normal o ciclo variar de mês para mês?",
        text: "Sim. Ciclos que variam entre 21 e 35 dias são considerados normais. Mesmo mulheres com ciclos habitualmente regulares podem ter variações ocasionais devido a stress, viagens, doença, mudanças na dieta ou no sono. Um ciclo diferente ocasional raramente é motivo de preocupação.",
      },
      {
        type: "text",
        title: "Posso engravidar durante a menstruação?",
        text: "Tecnicamente sim, embora seja pouco provável. Em ciclos curtos (21–24 dias), a ovulação pode acontecer muito cedo após a menstruação. Como os espermatozóides podem sobreviver até 5 dias, uma relação durante o período pode resultar em gravidez se a ovulação acontecer pouco depois. Não existe momento 100% seguro sem contracepção.",
      },
      {
        type: "text",
        title: "Piscina, mar e banho durante a menstruação — é seguro?",
        text: "Sim, completamente seguro. A água não entra na vagina durante a natação em condições normais. Usar tampão interno ou copo menstrual garante maior conforto e discrição na água. A menstruação não para em contacto com a água — apenas pode abrandar ligeiramente com a pressão.",
      },
      {
        type: "text",
        title: "Porque é que algumas menstruações doem mais do que outras?",
        text: "Os níveis de prostaglandinas (as substâncias que causam as contrações uterinas) variam de ciclo para ciclo. Stress, falta de sono, dieta inflamatória e até o posicionamento do útero influenciam a intensidade das cólicas. Ciclos mais dolorosos também podem estar associados a condições como endometriose.",
      },
      {
        type: "text",
        title: "O exercício físico intenso pode atrasar a menstruação?",
        text: "Sim. Exercício muito intenso, especialmente combinado com baixo peso corporal e restrição calórica, pode suprimir a ovulação e atrasar ou mesmo eliminar a menstruação. Esta condição chama-se amenorreia hipotalâmica e é comum em atletas de alta competição. Não é sinal de saúde — é o corpo a poupar energia.",
      },
      {
        type: "text",
        title: "O stress pode mesmo afetar o ciclo?",
        text: "Definitivamente. O stress activa o eixo hipotálamo-hipófise-suprarrenal, que liberta cortisol. O cortisol em excesso pode inibir a produção de GnRH, interferindo com a ovulação e atrasando ou encurtando o ciclo. Um período de stress intenso pode atrasar a menstruação vários dias — ou fazê-la chegar mais cedo.",
      },
      {
        type: "text",
        title: "É normal não ter TPM?",
        text: "Sim. Embora a maioria das mulheres experiencie algum sintoma pré-menstrual, há mulheres que têm ciclos praticamente sem sintomas. Não ter TPM não significa nada de errado — significa que as tuas flutuações hormonais simplesmente têm menos impacto nos neurotransmissores do teu cérebro.",
      },
      {
        type: "curiosity",
        title: "O ciclo lunar e o ciclo menstrual",
        text: "Existe uma crença popular de que o ciclo menstrual é sincronizado com a lua. A ciência não confirma esta relação — a semelhança de duração (28 dias) é uma coincidência. Não há evidência de que a fase lunar afecte a menstruação. O que afecta é a luz artificial, o stress e os padrões de sono.",
      },
    ],
    coupleNote:
      "Estas perguntas parecem simples, mas muitas nunca são feitas em casal. Partilhar este tipo de informação — sem tabus, com curiosidade — cria um espaço de intimidade que vai muito além do físico. Conversas sobre o corpo da parceira fortalecem a ligação.",
  },
];

// ─── Categorias ───────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: "ciclo",
    title: "O Ciclo Menstrual",
    description: "Compreende as 4 fases e o que acontece no teu corpo ao longo do mês",
    colorKey: "rose",
    illustrationKey: "cycle",
    articleIds: ["ciclo-fases"],
  },
  {
    id: "menstruacao",
    title: "Menstruação",
    description: "O período, o fluxo, as cólicas — tudo o que precisas de saber",
    colorKey: "rose",
    illustrationKey: "period",
    articleIds: ["o-que-e-menstruacao", "colicas"],
  },
  {
    id: "ovulacao",
    title: "Ovulação",
    description: "O pico do ciclo — como acontece e como identificares",
    colorKey: "emerald",
    illustrationKey: "ovulation",
    articleIds: ["como-acontece-ovulacao", "janela-fertil"],
  },
  {
    id: "folicular",
    title: "Fase Folicular",
    description: "A energia a crescer, o estrogénio em alta, o mundo a abrir-se",
    colorKey: "sky",
    illustrationKey: "follicular",
    articleIds: ["fase-folicular"],
  },
  {
    id: "luteal",
    title: "Fase Lútea & TPM",
    description: "Sensibilidade, progesterona e o que acontece antes do período",
    colorKey: "violet",
    illustrationKey: "luteal",
    articleIds: ["fase-luteal", "tpm"],
  },
  {
    id: "fertilidade",
    title: "Fertilidade",
    description: "Como funciona, o que a influencia e a janela fértil",
    colorKey: "emerald",
    illustrationKey: "fertility",
    articleIds: ["como-funciona-fertilidade"],
  },
  {
    id: "saude",
    title: "Saúde Íntima",
    description: "Higiene, corrimento e o que é verdadeiramente normal",
    colorKey: "pink",
    illustrationKey: "health",
    articleIds: ["higiene-intima", "corrimento-vaginal"],
  },
  {
    id: "emocoes",
    title: "Emoções & Humor",
    description: "Como as hormonas afectam o teu cérebro, humor e relações",
    colorKey: "violet",
    illustrationKey: "emotions",
    articleIds: ["hormonas-emocoes"],
  },
  {
    id: "gravidez",
    title: "Gravidez",
    description: "Os primeiros sinais e o que acontece nas primeiras semanas",
    colorKey: "rose",
    illustrationKey: "pregnancy",
    articleIds: ["gravidez-sinais"],
  },
  {
    id: "faq",
    title: "Perguntas Frequentes",
    description: "As dúvidas que toda a gente tem mas poucas perguntam",
    colorKey: "slate",
    illustrationKey: "faq",
    articleIds: ["faq-ciclo"],
  },
];

// ─── Exports e helpers ────────────────────────────────────────────────────────

export const allArticles: Article[] = ARTICLES;
export const allCategories: Category[] = CATEGORIES;

export function getArticleById(id: string): Article | undefined {
  return ARTICLES.find(a => a.id === id);
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id);
}

export function getArticlesByPhase(phase: string): Article[] {
  return ARTICLES.filter(a => a.phase === phase);
}

export function searchArticles(query: string): Article[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return ARTICLES.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.subtitle.toLowerCase().includes(q) ||
    a.tags.some(t => t.toLowerCase().includes(q)) ||
    a.intro.toLowerCase().includes(q)
  );
}

// Cores Tailwind por colorKey — centralizadas para evitar purge do CSS
export const COLOR_MAP: Record<string, {
  bg: string; bgDark: string; text: string; textDark: string;
  border: string; borderDark: string; dot: string;
  cardBg: string; cardBgDark: string;
}> = {
  rose:    { bg: "bg-rose-100",    bgDark: "dark:bg-rose-950/30",    text: "text-rose-600",    textDark: "dark:text-rose-300",    border: "border-rose-200",    borderDark: "dark:border-rose-800",    dot: "bg-rose-500",    cardBg: "bg-rose-50",    cardBgDark: "dark:bg-rose-950/20"    },
  emerald: { bg: "bg-emerald-100", bgDark: "dark:bg-emerald-950/30", text: "text-emerald-600", textDark: "dark:text-emerald-300", border: "border-emerald-200", borderDark: "dark:border-emerald-800", dot: "bg-emerald-500", cardBg: "bg-emerald-50", cardBgDark: "dark:bg-emerald-950/20" },
  sky:     { bg: "bg-sky-100",     bgDark: "dark:bg-sky-950/30",     text: "text-sky-600",     textDark: "dark:text-sky-300",     border: "border-sky-200",     borderDark: "dark:border-sky-800",     dot: "bg-sky-500",     cardBg: "bg-sky-50",     cardBgDark: "dark:bg-sky-950/20"     },
  violet:  { bg: "bg-violet-100",  bgDark: "dark:bg-violet-950/30",  text: "text-violet-600",  textDark: "dark:text-violet-300",  border: "border-violet-200",  borderDark: "dark:border-violet-800",  dot: "bg-violet-500",  cardBg: "bg-violet-50",  cardBgDark: "dark:bg-violet-950/20"  },
  pink:    { bg: "bg-pink-100",    bgDark: "dark:bg-pink-950/30",    text: "text-pink-600",    textDark: "dark:text-pink-300",    border: "border-pink-200",    borderDark: "dark:border-pink-800",    dot: "bg-pink-500",    cardBg: "bg-pink-50",    cardBgDark: "dark:bg-pink-950/20"    },
  slate:   { bg: "bg-slate-100",   bgDark: "dark:bg-slate-800/50",   text: "text-slate-600",   textDark: "dark:text-slate-300",   border: "border-slate-200",   borderDark: "dark:border-slate-700",   dot: "bg-slate-500",   cardBg: "bg-slate-50",   cardBgDark: "dark:bg-slate-900/20"   },
};
