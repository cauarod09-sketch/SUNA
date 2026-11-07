// AS 21 CONVERSAS E OS 21 DESAFIOS DA SUNA — roteiro fixo, pré-escrito, sem IA.
// [NOME] é substituído pelo nome da usuária na hora de exibir.
import type { HabitId } from './habits';

export type Mood = 'A' | 'B' | 'C';

/** As três opções fixas, iguais em todas as conversas. */
export const MOOD_OPTIONS: { id: Mood; label: string }[] = [
  { id: 'A', label: 'Estou animada e disposta!' },
  { id: 'B', label: 'Estou mais ou menos hoje.' },
  { id: 'C', label: 'Estou cansada e sem energia.' },
];

export interface DayContent {
  day: number;
  /** Título do dia (ex.: "Seu primeiro compromisso"). */
  title: string;
  /** Mensagem inicial da Suna. */
  opening: string;
  /** Reações pré-escritas para A, B e C. */
  reactions: Record<Mood, string>;
  challenge: {
    title: string;
    description: string;
    steps: string[];
    /** Observação de cuidado exibida abaixo dos passos. */
    note?: string;
    button: string;
  };
  /** Mensagem de conclusão do desafio. */
  completion: string;
  habitUnlocked?: HabitId;
  /** Campo opcional de registro escrito ligado ao desafio. */
  reflection?: { label: string; placeholder: string };
  /** Dia 3: campo de hidratação em mL dentro do desafio. */
  waterField?: boolean;
  /** Dia 5: registro da noite de sono dentro do desafio. */
  sleepField?: boolean;
  /** Conquistas especiais: 1 = Dia 7, 2 = Dia 14, 3 = Dia 21. */
  milestone?: 1 | 2 | 3;
}

const DEFAULT_BUTTON = 'CONCLUÍ MEU DESAFIO';

export const DAYS: DayContent[] = [
  {
    day: 1,
    title: 'Seu primeiro compromisso',
    opening:
      'Oi, [NOME]! Eu sou a Suna e vou acompanhar você pelos próximos 21 dias. Hoje vamos começar uma jornada muito especial. Antes de revelar seu primeiro desafio, quero saber: como você está se sentindo?',
    reactions: {
      A: 'Adorei essa energia! Vamos transformar essa vontade em atitudes. Seu primeiro passo começa agora!',
      B: 'Não precisa estar completamente preparada. O mais importante é que você decidiu começar.',
      C: 'Podemos começar com calma. Hoje você não precisa fazer nada complicado. Vamos dar nosso primeiro passo juntas.',
    },
    challenge: {
      title: 'Crie seu grupo de evolução',
      description: 'Hoje você vai criar seu diário privado, onde poderá registrar sua evolução durante os próximos 21 dias.',
      steps: [
        'Abra o WhatsApp.',
        'Crie um grupo chamado "SUNA | Minha Evolução".',
        'Se precisar adicionar alguém para criar o grupo, combine isso previamente e remova essa pessoa depois.',
        'Deixe apenas você no grupo.',
        'Você também poderá utilizar a conversa consigo mesma no WhatsApp.',
        'Escreva seu primeiro compromisso.',
        'Durante os próximos dias, utilize esse espaço para registrar fotos de pratos, atividades, treinos e conquistas.',
      ],
      note: 'Fotos são opcionais; registros escritos também são válidos.',
      button: 'CONCLUÍ MEU PRIMEIRO DESAFIO',
    },
    completion: 'Seu primeiro compromisso está registrado! Agora você tem um espaço só seu para acompanhar essa jornada.',
  },
  {
    day: 2,
    title: 'Sua versão de verão',
    opening: 'Bom dia, [NOME]! Hoje quero que você imagine quem deseja ser neste verão. Antes de começarmos, como está se sentindo?',
    reactions: {
      A: 'Perfeito! Vamos transformar seus desejos em objetivos claros.',
      B: 'Mesmo sem ter tudo definido, você pode começar a descobrir o que realmente importa.',
      C: 'Hoje nosso desafio é tranquilo. Você só precisa reservar alguns minutos para refletir.',
    },
    challenge: {
      title: 'Escreva quem você quer ser no verão',
      description: 'Hoje você vai dar forma à versão de você que deseja construir neste verão.',
      steps: [
        'Pegue um papel.',
        'Escreva o título "Minha versão de verão".',
        'Liste cinco características que deseja desenvolver.',
        'Escreva três hábitos que deseja construir.',
        'Guarde esse papel.',
        'Se quiser, registre o texto no grupo privado.',
      ],
      button: 'GUARDEI MEUS OBJETIVOS',
    },
    completion: 'Guarde esse papel. No Dia 21 vamos voltar a ele.',
    reflection: {
      label: 'Minha versão de verão (opcional)',
      placeholder: 'Cinco características que quero desenvolver e três hábitos que quero construir…',
    },
  },
  {
    day: 3,
    title: 'Seu compromisso com a água',
    opening: 'Hoje vamos começar a cuidar da sua hidratação. Como está sua disposição?',
    reactions: {
      A: 'Ótimo! Vamos organizar esse hábito e acompanhar sua evolução.',
      B: 'Comece prestando atenção em quanto você bebe durante o dia.',
      C: 'Faça isso com tranquilidade. Hidratação é importante, mas respeitar suas necessidades também é.',
    },
    challenge: {
      title: 'Comece a registrar sua hidratação',
      description: 'Hoje você vai observar e registrar quanta água bebe ao longo do dia.',
      steps: [
        'Registre a quantidade de água que você bebe.',
        'Distribua a hidratação ao longo do dia.',
        'Mantenha água disponível durante sua rotina.',
        'Utilize o registro da SUNA.',
        'Procure manter uma ingestão adequada às suas necessidades.',
      ],
      note: 'Não existe uma quantidade única para todas as pessoas. Respeite suas necessidades e as orientações de profissionais de saúde.',
      button: DEFAULT_BUTTON,
    },
    completion: 'Esse hábito continuará fazendo parte da sua rotina até o final do desafio.',
    habitUnlocked: 'hidratacao',
    waterField: true,
  },
  {
    day: 4,
    title: 'Seus cuidados matinais',
    opening: 'Bom dia! Hoje quero que você reserve alguns minutos para cuidar de si. Como acordou?',
    reactions: {
      A: 'Vamos criar um ritual de autocuidado!',
      B: 'Não precisamos de uma rotina complicada. Pequenos passos são suficientes.',
      C: 'Escolha uma versão simples e confortável para hoje.',
    },
    challenge: {
      title: 'Comece sua rotina de cuidados',
      description: 'Hoje você vai reservar alguns minutos da manhã só para você.',
      steps: [
        'Lave o rosto de maneira adequada à sua pele.',
        'Organize sua higiene matinal.',
        'Utilize protetor solar apropriado quando necessário, seguindo as instruções do produto.',
        'Reserve alguns minutos para cuidados pessoais.',
        'Marque o desafio como concluído.',
      ],
      button: DEFAULT_BUTTON,
    },
    completion: 'Seu cuidado pessoal não termina hoje. Vamos tentar manter esse hábito nos próximos dias.',
    habitUnlocked: 'cuidados_matinais',
  },
  {
    day: 5,
    title: 'Priorize seu sono',
    opening: 'Hoje vamos cuidar de algo que influencia sua disposição: uma boa noite de sono. Como está se sentindo?',
    reactions: {
      A: 'Vamos aproveitar sua energia e organizar uma noite tranquila!',
      B: 'Comece definindo um horário de dormir que combine com sua rotina.',
      C: 'Hoje seu descanso merece prioridade.',
    },
    challenge: {
      title: 'Prepare uma boa noite de sono',
      description: 'Hoje você vai preparar sua noite para descansar de verdade.',
      steps: [
        'Defina um horário adequado para dormir.',
        'Organize seu ambiente.',
        'Reduza distrações antes de deitar.',
        'Procure dormir o suficiente para suas necessidades.',
        'Registre como foi sua noite.',
      ],
      note: 'Para adultas, a referência geral é de pelo menos sete horas de sono por noite, reconhecendo que cada pessoa tem necessidades diferentes.',
      button: DEFAULT_BUTTON,
    },
    completion: 'Seu descanso agora faz parte da sua rotina. Vamos cuidar dele nos próximos dias.',
    habitUnlocked: 'sono',
    sleepField: true,
    reflection: { label: 'Como foi sua noite?', placeholder: 'Dormi às… acordei às… me senti…' },
  },
  {
    day: 6,
    title: 'Uma manhã sem redes sociais',
    opening: 'Hoje quero propor um desafio diferente: começar o dia com menos distrações. Como está?',
    reactions: {
      A: 'Vamos começar sua manhã com mais foco!',
      B: 'Pode parecer difícil, mas vamos tentar aos poucos.',
      C: 'Faça o melhor que puder e adapte o tempo se necessário.',
    },
    challenge: {
      title: '30 minutos sem redes sociais',
      description: 'Hoje você vai começar o dia com mais presença e menos distrações.',
      steps: [
        'Ao acordar, evite abrir redes sociais por 30 minutos.',
        'Faça sua higiene matinal.',
        'Registre a hidratação.',
        'Organize suas prioridades.',
        'Marque o desafio.',
      ],
      button: DEFAULT_BUTTON,
    },
    completion: 'Sua manhã começou com mais presença. Esse hábito vai continuar com você nos próximos dias.',
    habitUnlocked: 'manha_sem_redes',
  },
  {
    day: 7,
    title: 'Sua primeira conquista',
    opening:
      'Você chegou ao Dia 7! Uma semana de jornada! Hoje quero que observe o que conseguiu construir. Como está se sentindo?',
    reactions: {
      A: 'Que bom! Vamos registrar suas conquistas!',
      B: 'Mesmo que alguns dias tenham sido difíceis, vamos reconhecer o progresso.',
      C: 'Seu esforço merece reconhecimento. Hoje vamos fazer uma revisão tranquila.',
    },
    challenge: {
      title: 'Revise sua primeira semana',
      description: 'Hoje você vai olhar para os seus primeiros sete dias e reconhecer o que construiu.',
      steps: [
        'Abra o calendário.',
        'Observe os checklists.',
        'Releia suas anotações.',
        'Escreva três conquistas.',
        'Identifique uma dificuldade.',
        'Planeje uma melhoria para a próxima semana.',
      ],
      button: DEFAULT_BUTTON,
    },
    completion: 'Primeira semana concluída! Agora começa uma nova etapa.',
    milestone: 1,
    reflection: {
      label: 'Minha primeira semana',
      placeholder: 'Três conquistas… Uma dificuldade… Uma melhoria para a próxima semana…',
    },
  },
  {
    day: 8,
    title: 'Sua rotina matinal completa',
    opening: 'Começamos a segunda semana! Agora vamos reunir os hábitos que você já começou a construir. Como está?',
    reactions: {
      A: 'Vamos fazer uma manhã organizada!',
      B: 'Escolha suas prioridades e siga no seu ritmo.',
      C: 'Mantenha os cuidados essenciais e respeite sua energia.',
    },
    challenge: {
      title: 'Complete sua manhã',
      description: 'Hoje você vai reunir, em uma só manhã, os hábitos que já começou a construir.',
      steps: [
        'Faça seus cuidados matinais.',
        'Registre sua hidratação.',
        'Fique até 45 minutos sem redes sociais após acordar, se viável.',
        'Defina três prioridades para o dia.',
        'Registre a conclusão.',
      ],
      button: DEFAULT_BUTTON,
    },
    completion: 'Sua manhã está ganhando forma. O planejamento matinal agora faz parte dos seus hábitos.',
    habitUnlocked: 'planejamento_matinal',
  },
  {
    day: 9,
    title: 'Organize seu espaço',
    opening: 'Hoje vamos cuidar do seu ambiente. Um espaço organizado pode ajudar bastante na rotina. Como você está?',
    reactions: {
      A: 'Vamos aproveitar essa disposição!',
      B: 'Escolha apenas um espaço para começar.',
      C: 'Faça uma versão menor do desafio.',
    },
    challenge: {
      title: '20 minutos de organização',
      description: 'Hoje você vai dedicar um tempo curto para deixar um espaço seu mais leve.',
      steps: [
        'Escolha um espaço pessoal.',
        'Organize por aproximadamente 20 minutos.',
        'Separe objetos desnecessários.',
        'Limpe e organize o local.',
        'Registre como se sentiu.',
      ],
      button: DEFAULT_BUTTON,
    },
    completion: 'Seu espaço está mais leve, e a sua rotina também. Pequenas organizações fazem diferença.',
    reflection: { label: 'Como me senti', placeholder: 'Depois de organizar, eu me senti…' },
  },
  {
    day: 10,
    title: 'Alimentação consciente',
    opening:
      'Hoje vamos prestar atenção em suas escolhas alimentares. Nosso objetivo é melhorar a rotina sem criar restrições extremas. Como está?',
    reactions: {
      A: 'Vamos organizar suas refeições!',
      B: 'Comece com uma pequena melhoria.',
      C: 'Mantenha refeições regulares e priorize seu bem-estar.',
    },
    challenge: {
      title: 'Organize sua alimentação',
      description: 'Hoje você vai observar suas refeições e planejar pequenas melhorias, com equilíbrio.',
      steps: [
        'Planeje suas refeições.',
        'Procure manter uma alimentação regular.',
        'Se costuma consumir bebidas açucaradas, experimente substituir uma delas.',
        'Observe seus horários.',
        'Registre uma reflexão.',
      ],
      note: 'Nada de pular refeições, fazer compensações ou restrições extremas. Cuidar da alimentação é cuidar de você.',
      button: DEFAULT_BUTTON,
    },
    completion: 'Você olhou para sua alimentação com cuidado, não com cobrança. É assim que hábitos duram.',
    reflection: { label: 'Minha reflexão', placeholder: 'Hoje percebi que…' },
  },
  {
    day: 11,
    title: 'Mais foco pela manhã',
    opening: 'Você já construiu alguns hábitos. Hoje vamos aumentar um pouco seu compromisso com a organização. Como acordou?',
    reactions: {
      A: 'Vamos aproveitar essa disposição!',
      B: 'Faça a versão possível para você.',
      C: 'Hoje podemos manter uma meta menor.',
    },
    challenge: {
      title: '45 minutos sem redes sociais',
      description: 'Hoje você vai estender um pouco mais o seu tempo de manhã sem distrações.',
      steps: [
        'Evite redes sociais pelos primeiros 45 minutos após acordar.',
        'Faça seus cuidados matinais.',
        'Registre sua hidratação.',
        'Organize as prioridades do dia.',
        'Marque a conclusão.',
      ],
      button: DEFAULT_BUTTON,
    },
    completion: 'Mais foco, mais presença. Sua manhã está ficando cada vez mais sua.',
  },
  {
    day: 12,
    title: 'Planeje sua semana',
    opening: 'Hoje quero que você organize os próximos dias e tenha mais clareza sobre seus compromissos. Como está?',
    reactions: {
      A: 'Vamos preparar tudo!',
      B: 'Comece pelo que for mais importante.',
      C: 'Faça um planejamento simples e realista.',
    },
    challenge: {
      title: 'Organize seus próximos sete dias',
      description: 'Hoje você vai olhar para a semana que vem e reservar espaço para o que importa.',
      steps: [
        'Abra seu planner.',
        'Anote os compromissos importantes.',
        'Defina horários possíveis.',
        'Reserve momentos para autocuidado.',
        'Escolha três prioridades.',
      ],
      note: 'Seu planner de 21 dias fica na aba Evolução.',
      button: DEFAULT_BUTTON,
    },
    completion: 'Sua semana tem direção agora. Lembre-se: planejar também é se cuidar.',
    reflection: { label: 'Minhas três prioridades', placeholder: '1. … 2. … 3. …' },
  },
  {
    day: 13,
    title: 'Desconecte para dormir',
    opening: 'Hoje nosso foco é sua noite. Vamos tentar reduzir as distrações antes de dormir. Como você está?',
    reactions: {
      A: 'Vamos preparar uma noite tranquila!',
      B: 'Escolha um horário para começar a desacelerar.',
      C: 'Priorize sua recuperação.',
    },
    challenge: {
      title: '60 minutos sem redes antes de dormir',
      description: 'Hoje você vai criar um tempo de desaceleração antes de deitar.',
      steps: [
        'Escolha um horário para encerrar as redes sociais.',
        'Organize os compromissos do dia seguinte.',
        'Faça seus cuidados pessoais.',
        'Prepare seu ambiente.',
        'Procure manter sua rotina de sono.',
      ],
      button: DEFAULT_BUTTON,
    },
    completion: 'Sua noite ganhou um ritual. Esse hábito continua com você até o fim da jornada.',
    habitUnlocked: 'noite_sem_redes',
  },
  {
    day: 14,
    title: 'Sua evolução até aqui',
    opening:
      'Você chegou ao Dia 14! Duas semanas de jornada. Quero que observe o que mudou desde o começo. Como está se sentindo?',
    reactions: {
      A: 'Vamos registrar suas conquistas!',
      B: 'Vamos reconhecer o progresso e identificar melhorias.',
      C: 'Faça essa revisão com calma.',
    },
    challenge: {
      title: 'Revise duas semanas de evolução',
      description: 'Hoje você vai comparar suas duas semanas e decidir como quer seguir.',
      steps: [
        'Consulte seus checklists.',
        'Compare as duas semanas.',
        'Registre três mudanças positivas.',
        'Identifique dois hábitos que precisam de atenção.',
        'Planeje como pretende continuar.',
      ],
      button: DEFAULT_BUTTON,
    },
    completion: 'Duas semanas concluídas! Você já tem uma história para contar. Agora começa a reta final.',
    milestone: 2,
    reflection: {
      label: 'Minhas duas semanas',
      placeholder: 'Três mudanças positivas… Dois hábitos que precisam de atenção… Como vou continuar…',
    },
  },
  {
    day: 15,
    title: 'Um dia de constância',
    opening: 'Chegamos à última semana! Agora vamos reunir vários hábitos construídos até aqui. Como está sua energia?',
    reactions: {
      A: 'Vamos executar sua rotina completa!',
      B: 'Escolha prioridades e mantenha a organização.',
      C: 'Faça uma versão mais leve.',
    },
    challenge: {
      title: 'Cumpra sua rotina completa',
      description: 'Hoje você vai viver um dia inteiro com os hábitos que construiu, no seu ritmo.',
      steps: [
        'Faça seus cuidados matinais.',
        'Registre sua hidratação.',
        'Organize suas refeições.',
        'Realize a atividade física ou descanso planejado.',
        'Reserve um momento para autocuidado.',
        'Organize sua noite.',
        'Atualize o checklist.',
      ],
      note: 'Não precisa ser perfeito. Constância é fazer o possível, todos os dias.',
      button: DEFAULT_BUTTON,
    },
    completion: 'Um dia inteiro de cuidado com você. A rotina completa agora faz parte dos seus hábitos.',
    habitUnlocked: 'rotina_completa',
  },
  {
    day: 16,
    title: 'Tempo para você',
    opening: 'Hoje quero que você reserve um período do dia exclusivamente para cuidar de seus objetivos. Como está?',
    reactions: {
      A: 'Vamos organizar esse tempo!',
      B: 'Divida em blocos menores.',
      C: 'Reduza a duração se necessário.',
    },
    challenge: {
      title: 'Reserve até 90 minutos para você',
      description: 'Hoje você vai proteger um tempo do seu dia só para os seus objetivos.',
      steps: [
        'Reserve até 90 minutos ao longo do dia.',
        'Divida em períodos menores se desejar.',
        'Utilize esse tempo para organização, autocuidado ou atividade planejada.',
        'Reduza distrações.',
        'Registre a conclusão.',
      ],
      note: 'A duração pode ser adaptada conforme a sua disponibilidade.',
      button: DEFAULT_BUTTON,
    },
    completion: 'Você reservou tempo para você. Esse é um dos compromissos mais bonitos que existem.',
  },
  {
    day: 17,
    title: 'Disciplina na prática',
    opening: 'Estamos perto do final. Hoje quero que você pratique a consistência de seus compromissos. Como acordou?',
    reactions: {
      A: 'Vamos cumprir o planejamento!',
      B: 'Faça o possível e mantenha suas prioridades.',
      C: 'Adapte sua rotina e respeite seus limites.',
    },
    challenge: {
      title: 'Siga seu planejamento',
      description: 'Hoje você vai colocar seu planejamento em prática e observar o que funciona.',
      steps: [
        'Consulte suas prioridades.',
        'Organize seus horários.',
        'Realize as atividades possíveis.',
        'Registre o que conseguiu cumprir.',
        'Escreva o que precisou adaptar.',
      ],
      button: DEFAULT_BUTTON,
    },
    completion: 'Disciplina também é saber adaptar. Você seguiu em frente, e isso conta muito.',
    reflection: { label: 'O que cumpri e o que adaptei', placeholder: 'Consegui cumprir… Precisei adaptar…' },
  },
  {
    day: 18,
    title: 'Um dia organizado',
    opening: 'Hoje quero que você organize seu dia da manhã até a noite. Como está se sentindo?',
    reactions: {
      A: 'Vamos colocar tudo em prática!',
      B: 'Comece pelo essencial.',
      C: 'Faça uma rotina mais leve.',
    },
    challenge: {
      title: 'Planeje seu dia inteiro',
      description: 'Hoje você vai desenhar o seu dia, da manhã até a noite, com espaço para respirar.',
      steps: [
        'Planeje sua manhã.',
        'Organize suas refeições.',
        'Defina horários para seus compromissos.',
        'Reserve tempo para descanso.',
        'Faça seus cuidados pessoais.',
        'Prepare sua noite.',
        'Registre como foi.',
      ],
      note: 'O planejamento deve incluir pausas e descanso.',
      button: DEFAULT_BUTTON,
    },
    completion: 'Um dia pensado do começo ao fim, com pausas e cuidado. Você está pronta para a reta final.',
    reflection: { label: 'Como foi meu dia', placeholder: 'De manhã… à tarde… à noite…' },
  },
  {
    day: 19,
    title: 'Supere um obstáculo',
    opening: 'Faltam poucos dias! Quero que você escolha um hábito que ainda encontra dificuldade para manter. Como está?',
    reactions: {
      A: 'Vamos encontrar uma solução!',
      B: 'Escolha uma melhoria pequena e possível.',
      C: 'Hoje podemos simplificar bastante.',
    },
    challenge: {
      title: 'Resolva uma dificuldade da sua rotina',
      description: 'Hoje você vai transformar uma dificuldade em uma solução prática.',
      steps: [
        'Identifique um hábito difícil.',
        'Escreva o motivo.',
        'Escolha uma solução prática.',
        'Teste essa solução.',
        'Registre o resultado.',
      ],
      note: 'Exemplo: "Esqueço de beber água." Solução: "Deixar uma garrafa em local visível."',
      button: DEFAULT_BUTTON,
    },
    completion: 'Obstáculos fazem parte. Agora você tem uma solução na mão, e isso é evolução.',
    reflection: { label: 'Minha dificuldade e minha solução', placeholder: 'Hábito difícil… Motivo… Solução… Resultado…' },
  },
  {
    day: 20,
    title: 'Seus próximos 30 dias',
    opening: 'Amanhã será nosso último dia desta jornada, mas os hábitos podem continuar. Vamos planejar seus próximos 30 dias?',
    reactions: {
      A: 'Perfeito! Vamos organizar sua próxima etapa!',
      B: 'Escolha poucos hábitos que consiga manter.',
      C: 'Faça um plano simples e confortável.',
    },
    challenge: {
      title: 'Planeje os próximos 30 dias',
      description: 'Hoje você vai preparar a continuação da sua jornada, para além dos 21 dias.',
      steps: [
        'Escolha três hábitos que deseja continuar.',
        'Defina horários realistas.',
        'Planeje sua rotina de autocuidado.',
        'Organize suas atividades.',
        'Escreva como pretende acompanhar sua evolução.',
      ],
      note: 'Seu planejamento fica salvo aqui na SUNA.',
      button: DEFAULT_BUTTON,
    },
    completion: 'Seu plano para os próximos 30 dias está salvo. A jornada continua com você.',
    reflection: {
      label: 'Meu plano para os próximos 30 dias',
      placeholder: 'Três hábitos que vou continuar… Horários… Autocuidado… Como vou acompanhar…',
    },
  },
  {
    day: 21,
    title: 'Sua nova versão',
    opening:
      '[NOME], você chegou ao Dia 21! Quero que lembre da pessoa que decidiu começar essa jornada. Hoje vamos olhar para suas conquistas e aprendizados. Como está se sentindo?',
    reactions: {
      A: 'Que conquista! Vamos celebrar tudo que você construiu!',
      B: 'Mesmo que nem tudo tenha acontecido como imaginava, você pode reconhecer seu progresso.',
      C: 'Seu esforço merece reconhecimento. Vamos concluir essa jornada com calma.',
    },
    challenge: {
      title: 'O encontro com sua nova versão',
      description: 'Hoje você vai reencontrar quem decidiu começar e reconhecer o caminho que fez.',
      steps: [
        'Pegue o papel que escreveu no Dia 2.',
        'Releia quem você queria ser no verão.',
        'Compare seus hábitos atuais com os do começo.',
        'Escreva o que mudou.',
        'Identifique suas principais conquistas.',
        'Escreva uma carta para sua versão futura.',
        'Conclua seu último checklist.',
      ],
      button: 'CONCLUÍ MINHA JORNADA',
    },
    completion:
      'Você chegou ao fim dos seus 21 dias. Talvez nem tudo tenha mudado, mas você começou a construir hábitos e aprendeu mais sobre sua rotina. Essa jornada pode continuar muito além daqui.',
    milestone: 3,
    reflection: { label: 'Carta para minha versão futura', placeholder: 'Querida eu do futuro…' },
  },
];

export function dayContent(day: number): DayContent {
  const d = DAYS[day - 1];
  if (!d) throw new Error(`Dia inválido: ${day}`);
  return d;
}

export function withName(text: string, name: string): string {
  const first = (name || '').trim().split(/\s+/)[0] || 'querida';
  return text.replace(/\[NOME\]/g, first);
}
