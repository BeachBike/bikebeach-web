/* eslint-disable react-refresh/only-export-components --
 * This file is a JSX-bearing data module, not a component module — the
 * answers carry rich markup so they sit next to the question metadata.
 * HMR for components is irrelevant here. */
import type { ReactNode } from 'react';

/// FAQ content — every answer is grounded in the canonical product rules
/// (see CLAUDE.md "Product rules locked 2026-05-03"). When a rule changes,
/// this file is the customer-facing mirror that must change with it.

export interface FaqQuestion {
  id: string;
  q: string;
  a: ReactNode;
  /// Lowercase keyword bag used by the live search — keep it generous so
  /// "fiquei na fila" still finds the waitlist answers.
  search: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  tagline: string;
  /// A CSS color token name from the bikebeach palette (index.css @theme).
  accent: string;
  questions: FaqQuestion[];
}

export interface Situation {
  id: string;
  label: string;
  /// Question this chip jumps to (and auto-opens).
  target: string;
}

const A = ({ children }: { children: ReactNode }) => (
  <div className="space-y-2.5">{children}</div>
);

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'reservas',
    label: 'Reservar a bike',
    tagline: 'sem reserva, sem pedalada',
    accent: 'sea',
    questions: [
      {
        id: 'reservar-obrigatorio',
        q: 'Preciso mesmo reservar uma bike pra entrar na aula?',
        search:
          'reservar obrigatorio bike entrar aula credito vaga lugar precisa',
        a: (
          <A>
            <p>
              Precisa. Reservar uma bike específica é o que garante seu lugar
              na aula — não tem fila na areia, não tem &quot;chega e vê se
              sobra&quot;. Cada reserva <strong>consome 1 crédito</strong> da
              sua carteira no momento em que você confirma.
            </p>
            <p>
              É por isso que o app te leva direto pro mapa da arena: você não
              reserva &quot;uma aula&quot;, você reserva a bike número 14 da
              fila B.
            </p>
          </A>
        ),
      },
      {
        id: 'quando-reservar',
        q: 'Com quanta antecedência posso reservar?',
        search:
          'antecedencia reservar quando dias futuro 7 sete agenda calendario',
        a: (
          <A>
            <p>
              A janela de reserva é de <strong>até 7 dias à frente</strong>.
              Aulas mais distantes que isso ainda não abrem — volte quando a
              data entrar na janela.
            </p>
            <p>
              Prioridade de reserva pra mensalistas (tipo um head start de
              24h) está no radar, mas não entra agora.
            </p>
          </A>
        ),
      },
      {
        id: 'escolher-bike',
        q: 'Como escolho qual bike é a minha?',
        search: 'escolher bike numero mapa arena fila fileira mar palco posicao',
        a: (
          <A>
            <p>
              No último passo da reserva você vê o mapa da arena: 4 fileiras de
              8 bikes, oceano no topo, palco/instrutor logo abaixo. As bikes
              livres são clicáveis; as ocupadas aparecem marcadas.
            </p>
            <p>
              Dica de quem já pedalou: a <strong>fila A é a de frente pro
              mar</strong>. Brisa no rosto, vista aberta. As de trás ficam mais
              perto do som.
            </p>
          </A>
        ),
      },
      {
        id: 'bike-ocupada',
        q: 'Cliquei numa bike e deu "bike já reservada". O que rolou?',
        search:
          'bike ocupada reservada erro conflito 409 ao mesmo tempo duas pessoas concorrencia',
        a: (
          <A>
            <p>
              Você e outra pessoa clicaram na mesma bike quase no mesmo
              instante — e só uma reserva pode vencer. Quem confirmou primeiro
              ficou com o assento; pra você o sistema não cobrou crédito
              nenhum.
            </p>
            <p>
              O mapa se atualiza sozinho mostrando a bike como ocupada. É só
              escolher outra livre e seguir. Acontece mais nas aulas
              concorridas de fim de tarde.
            </p>
          </A>
        ),
      },
      {
        id: 'varias-reservas',
        q: 'Posso ter várias reservas ao mesmo tempo?',
        search:
          'varias reservas multiplas ao mesmo tempo quantas aulas semana limite',
        a: (
          <A>
            <p>
              Pode — enquanto houver crédito na carteira. Cada bike reservada
              segura 1 crédito até a aula acontecer (ou até você cancelar).
              Reservou três aulas da semana? São três créditos comprometidos.
            </p>
          </A>
        ),
      },
    ],
  },
  {
    id: 'cancelamento',
    label: 'Cancelar e check-in',
    tagline: 'a regra das 8 horas',
    accent: 'clay',
    questions: [
      {
        id: 'janela-8h',
        q: 'Até quando posso cancelar sem perder o crédito?',
        search:
          'cancelar janela 8 horas oito antes credito volta carteira gratis sem custo',
        a: (
          <A>
            <p>
              Até <strong>8 horas antes</strong> do horário de início da aula.
              Cancelou dentro desse prazo, o crédito volta automaticamente pra
              sua carteira — sem custo, sem pedir pra ninguém.
            </p>
            <p>
              A conta é simples: aula às 18h, você tem até as 10h da manhã pra
              desistir limpo.
            </p>
          </A>
        ),
      },
      {
        id: 'dentro-janela',
        q: 'Cancelei faltando menos de 8h. Perdi o crédito?',
        search:
          'cancelar dentro janela tarde perdi credito menos 8 horas em cima da hora',
        a: (
          <A>
            <p>
              Sim. Cancelamento dentro das 8 horas que antecedem a aula{' '}
              <strong>consome o crédito</strong> — a bike ficou reservada no
              seu nome e tarde demais pra outra pessoa pegar.
            </p>
            <p>
              Única exceção: se a sua reserva veio da lista de espera, a regra
              é mais branda. Veja a seção{' '}
              <em>Lista de espera</em>.
            </p>
          </A>
        ),
      },
      {
        id: 'no-show',
        q: 'E se eu simplesmente não aparecer?',
        search:
          'nao aparecer faltei no show no-show falta credito perdido automatico',
        a: (
          <A>
            <p>
              Isso é um <strong>no-show</strong>: não cancelou, não fez
              check-in. O crédito é consumido automaticamente, sem revisão
              manual e sem aquela &quot;cortesia do mês&quot;.
            </p>
            <p>
              Se você não vai conseguir ir, cancele. Mesmo em cima da hora,
              cancelar é melhor que sumir — libera a bike pra quem está na
              lista de espera.
            </p>
          </A>
        ),
      },
      {
        id: 'check-in-tolerancia',
        q: 'Cheguei atrasado. Ainda dá pra fazer check-in?',
        search:
          'atrasado check-in checkin tolerancia 5 minutos cinco atraso chegar tarde',
        a: (
          <A>
            <p>
              Você tem <strong>5 minutos depois do horário de início</strong>{' '}
              pra fazer o check-in. Aula às 18h, check-in liberado até as
              18h05.
            </p>
            <p>
              Passou disso, vira no-show e o crédito vai embora — a aula já
              está rolando e o instrutor não para a turma. (Esse prazo de
              tolerância é configurável por arena, mas o padrão é 5 minutos.)
            </p>
          </A>
        ),
      },
      {
        id: 'como-cancelar',
        q: 'Onde eu cancelo uma reserva?',
        search: 'onde cancelar reserva painel dashboard aba aulas botao',
        a: (
          <A>
            <p>
              No seu painel, aba <strong>aulas</strong>. Cada reserva ativa tem
              o botão de cancelar e mostra na hora se você está dentro ou fora
              da janela das 8h — sem surpresa depois.
            </p>
          </A>
        ),
      },
    ],
  },
  {
    id: 'espera',
    label: 'Lista de espera',
    tagline: 'a fila anda sozinha',
    accent: 'sun',
    questions: [
      {
        id: 'espera-como',
        q: 'A aula que eu queria encheu. Como entro na lista de espera?',
        search:
          'lista espera fila cheia lotada esgotada entrar fifo aula encheu',
        a: (
          <A>
            <p>
              Aula lotada mostra a opção de entrar na lista de espera. A fila é{' '}
              <strong>FIFO</strong> — ordem de chegada, sem furar. Você não
              gasta crédito só por entrar na fila.
            </p>
          </A>
        ),
      },
      {
        id: 'espera-promo',
        q: 'Como sei se fui promovido da lista de espera?',
        search:
          'promovido lista espera abriu vaga automatico email aviso confirmar',
        a: (
          <A>
            <p>
              Abriu uma vaga e você é o próximo da fila? O sistema{' '}
              <strong>reserva a bike pra você na hora e consome o
              crédito</strong> — automático. Não existe &quot;janela de 5
              minutos pra confirmar&quot;; a fila anda sozinha.
            </p>
            <p>
              Você recebe um e-mail informando: a aula é tal, você está dentro,
              e tem um link caso queira cancelar. O aviso é informativo, não é
              um botão de aceitar.
            </p>
          </A>
        ),
      },
      {
        id: 'espera-credito',
        q: 'Fui promovido mas não vi a tempo. Vou perder o crédito?',
        search:
          'promovido lista espera nao vi tarde perder credito janela protegida 2 horas',
        a: (
          <A>
            <p>
              Aqui a regra é mais justa com você. Reserva que veio da lista de
              espera tem uma <strong>janela protegida</strong>: dá pra cancelar
              até <strong>2 horas antes</strong> da aula{' '}
              <strong>sem perder o crédito</strong> — mesmo que isso já esteja
              dentro do prazo normal de 8h.
            </p>
            <p>
              O motivo: você pode ter sido promovido tarde e não teve a mesma
              chance de cancelar no prazo cheio. Essa proteção vale pra aquela
              reserva específica, e o app a marca como{' '}
              <em>&quot;promovido da lista de espera&quot;</em>.
            </p>
          </A>
        ),
      },
      {
        id: 'espera-sair',
        q: 'Mudei de ideia. Posso sair da lista de espera?',
        search: 'sair lista espera desistir cancelar fila mudei de ideia',
        a: (
          <A>
            <p>
              Pode, a qualquer momento antes de ser promovido — e sem custo
              nenhum, já que entrar na fila não gasta crédito. Depois que a
              promoção acontece, aí já virou uma reserva normal e segue as
              regras de cancelamento.
            </p>
          </A>
        ),
      },
    ],
  },
  {
    id: 'creditos',
    label: 'Créditos e validade',
    tagline: 'o que vence e o que zera',
    accent: 'sea-d',
    questions: [
      {
        id: 'creditos-validade',
        q: 'Meus créditos têm prazo de validade?',
        search:
          'credito validade vence prazo expira pacote 30 60 90 120 dias',
        a: (
          <A>
            <p>
              Os pacotes avulsos têm validade conforme o tamanho — quanto maior
              o pacote, mais tempo pra usar:
            </p>
            <ul className="ml-1 space-y-1">
              <li>
                <strong>1 aula (avulsa)</strong> — 30 dias
              </li>
              <li>
                <strong>5 aulas</strong> — 60 dias
              </li>
              <li>
                <strong>10 aulas</strong> — 90 dias
              </li>
              <li>
                <strong>20 aulas ou mais</strong> — 120 dias
              </li>
            </ul>
            <p>
              O relógio começa a contar a partir da compra. Crédito vencido sai
              da carteira.
            </p>
          </A>
        ),
      },
      {
        id: 'creditos-mensal',
        q: 'Sou mensalista. Os créditos que não usei acumulam pro mês seguinte?',
        search:
          'mensal mensalista assinatura credito acumula nao usei sobra ciclo zera',
        a: (
          <A>
            <p>
              Não acumulam. Os créditos do plano mensal{' '}
              <strong>zeram no fim do ciclo</strong> e o ciclo seguinte começa
              do zero. O mensal é desenhado pra quem fez do spinning rotina —
              se você está sobrando crédito todo mês, talvez um pacote avulso
              caiba melhor no seu ritmo.
            </p>
          </A>
        ),
      },
      {
        id: 'creditos-onde',
        q: 'Onde vejo quantos créditos eu tenho?',
        search: 'onde ver saldo credito carteira painel meu plano quantos tenho',
        a: (
          <A>
            <p>
              No painel, na aba <strong>meu plano</strong>. Ali aparece o saldo
              da carteira, de qual pacote cada crédito veio e a data de
              validade de cada lote.
            </p>
          </A>
        ),
      },
      {
        id: 'creditos-sumiu',
        q: 'Meu saldo diminuiu sozinho. Pra onde foi o crédito?',
        search:
          'credito sumiu diminuiu desapareceu perdi saldo caiu sozinho cobrado',
        a: (
          <A>
            <p>Quase sempre é uma destas três coisas:</p>
            <ul className="ml-1 space-y-1">
              <li>
                um <strong>no-show</strong> — você tinha reserva e não fez
                check-in;
              </li>
              <li>
                um <strong>cancelamento dentro das 8h</strong> — o crédito é
                consumido nesse caso;
              </li>
              <li>
                um <strong>pacote que venceu</strong> — créditos com validade
                expirada saem da carteira.
              </li>
            </ul>
            <p>
              No histórico do painel dá pra ver cada movimentação. Se o número
              não fechar mesmo assim, fale com a gente em{' '}
              <a
                className="text-clay underline underline-offset-2"
                href="mailto:contato@bikebeach.com.br"
              >
                contato@bikebeach.com.br
              </a>
              .
            </p>
          </A>
        ),
      },
    ],
  },
  {
    id: 'aula-cancelada',
    label: 'Quando o estúdio cancela',
    tagline: 'chuva, vento, mar alto',
    accent: 'clay-d',
    questions: [
      {
        id: 'cancela-quem',
        q: 'Quem pode cancelar uma aula inteira?',
        search:
          'quem cancela aula estudio instrutor professor admin clima decisao',
        a: (
          <A>
            <p>
              O <strong>instrutor</strong> é quem decide na maioria das vezes —
              ele está na areia e sente o clima, o vento e o mar na hora. O{' '}
              <strong>admin pode cancelar como reserva</strong>, por exemplo se
              o instrutor estiver sem sinal. Os dois produzem o mesmo efeito
              pra você.
            </p>
          </A>
        ),
      },
      {
        id: 'cancela-motivos',
        q: 'Por quais motivos uma aula é cancelada?',
        search:
          'motivos cancelamento aula chuva vento mar alto manutencao seguranca baixa adesao',
        a: (
          <A>
            <p>O motivo é sempre registrado, escolhido de uma lista:</p>
            <ul className="ml-1 space-y-1">
              <li>chuva</li>
              <li>vento</li>
              <li>mar alto</li>
              <li>manutenção</li>
              <li>segurança</li>
              <li>baixa adesão (só 1 ou 2 pessoas apareceram)</li>
              <li>outro (com uma explicação escrita)</li>
            </ul>
            <p>
              Sim, <strong>baixa adesão é motivo válido</strong>: se quase
              ninguém veio, o instrutor pode cancelar e todo mundo recebe o
              crédito de volta. O custo do instrutor já era — preferimos
              preservar a sua confiança.
            </p>
          </A>
        ),
      },
      {
        id: 'cancela-durante',
        q: 'A aula pode ser cancelada no meio dela?',
        search:
          'cancelar durante aula meio comecou raio tempestade vento emergencia ao vivo',
        a: (
          <A>
            <p>
              Pode. Na praia o tempo vira em minutos — começou a aula e caiu um
              temporal, o instrutor encerra ali mesmo. No histórico isso fica
              registrado como{' '}
              <em>cancelada durante</em> (diferente de{' '}
              <em>cancelada antes</em>), pra ficar transparente.
            </p>
          </A>
        ),
      },
      {
        id: 'cancela-credito',
        q: 'A aula foi cancelada pelo estúdio. E o meu crédito?',
        search:
          'aula cancelada estudio credito volta integral reembolso nao conta no-show',
        a: (
          <A>
            <p>
              Quando o cancelamento parte do estúdio,{' '}
              <strong>todo mundo recebe o crédito de volta, integral</strong>.
              Não importa se foi antes ou durante a aula.
            </p>
            <p>
              Além disso: a aula <strong>não conta como no-show</strong> pra
              ninguém, e ela sai das métricas de ocupação e receita. Cancelou
              porque choveu? A culpa não é sua, e o sistema trata assim.
            </p>
          </A>
        ),
      },
    ],
  },
  {
    id: 'pagamento',
    label: 'Pagamento',
    tagline: 'Pix, crédito, débito',
    accent: 'sea',
    questions: [
      {
        id: 'pagamento-formas',
        q: 'Quais formas de pagamento vocês aceitam?',
        search:
          'pagamento formas pix cartao credito debito boleto aceita meios',
        a: (
          <A>
            <p>
              Pix, cartão de crédito e cartão de débito. O Pix já está redondo
              e é confirmado em segundos; o fluxo completo de cartão está
              chegando logo. Sem fidelidade e sem letrinha miúda em qualquer um
              deles.
            </p>
          </A>
        ),
      },
      {
        id: 'pagamento-pix',
        q: 'Tem desconto pra pagar no Pix?',
        search: 'pix desconto 5 porcento off mais barato vantagem',
        a: (
          <A>
            <p>
              Tem: <strong>5% de desconto</strong> pagando no Pix, aplicado
              direto no checkout — o valor já aparece abatido antes de você
              confirmar.
            </p>
          </A>
        ),
      },
      {
        id: 'pagamento-recorrencia',
        q: 'Como funciona a cobrança do plano mensal?',
        search:
          'plano mensal cobranca recorrente recorrencia automatica pix assinatura',
        a: (
          <A>
            <p>
              O mensal é uma cobrança recorrente via Pix: a cada ciclo o
              pagamento é renovado e seus créditos do mês são liberados. Sem
              fidelidade — você cancela a renovação quando quiser, pelo painel.
            </p>
          </A>
        ),
      },
      {
        id: 'pagamento-reembolso',
        q: 'Comprei um pacote e quero estorno. Dá?',
        search: 'estorno reembolso devolucao dinheiro pacote comprei arrependi',
        a: (
          <A>
            <p>
              Crédito que você ainda não usou pode ser conversado — manda um
              e-mail pra{' '}
              <a
                className="text-clay underline underline-offset-2"
                href="mailto:contato@bikebeach.com.br"
              >
                contato@bikebeach.com.br
              </a>{' '}
              com o pedido. As condições e prazos estão detalhados nos{' '}
              <a
                className="text-clay underline underline-offset-2"
                href="/termos"
              >
                Termos de Uso
              </a>
              .
            </p>
          </A>
        ),
      },
    ],
  },
  {
    id: 'saude',
    label: 'Saúde e segurança',
    tagline: 'PAR-Q e termo de risco',
    accent: 'clay',
    questions: [
      {
        id: 'saude-parq',
        q: 'O que é esse PAR-Q e o termo de responsabilidade?',
        search:
          'parq par-q termo responsabilidade saude questionario consentimento risco liability',
        a: (
          <A>
            <p>São dois documentos diferentes, com prazos diferentes:</p>
            <ul className="ml-1 space-y-1">
              <li>
                <strong>Termo de responsabilidade</strong> — o reconhecimento
                legal de que atividade física tem risco. Reaceite{' '}
                <strong>mensal</strong>, num modal de 1 clique (uns 3
                segundos).
              </li>
              <li>
                <strong>PAR-Q</strong> — um questionário curto de saúde (5 a 7
                perguntas). Reaceite a cada <strong>3 meses</strong>, com suas
                respostas anteriores já pré-preenchidas — você só ajusta o que
                mudou.
              </li>
            </ul>
          </A>
        ),
      },
      {
        id: 'saude-bloqueia',
        q: 'Não consigo reservar e aparece um aviso de saúde. Por quê?',
        search:
          'nao consigo reservar bloqueado aviso saude parq termo vencido expirado modal',
        a: (
          <A>
            <p>
              Seu termo de responsabilidade ou seu PAR-Q venceu. Enquanto um
              dos dois estiver expirado, <strong>novas reservas ficam
              bloqueadas</strong> e o app abre o modal pra você renovar na
              hora.
            </p>
            <p>
              Importante: suas <strong>reservas que já existiam continuam
              valendo</strong> — o bloqueio é só pra criar reservas novas. É
              rápido: o termo é um clique, o PAR-Q vem pré-preenchido.
            </p>
          </A>
        ),
      },
      {
        id: 'saude-dados',
        q: 'O que vocês fazem com os meus dados de saúde?',
        search:
          'dados saude lgpd privacidade sensivel consentimento parq tratamento',
        a: (
          <A>
            <p>
              Dados de saúde são tratados como{' '}
              <strong>sensíveis pela LGPD</strong>. O consentimento pra
              processá-los é granular e separado do consentimento geral do
              cadastro — você decide com clareza.
            </p>
            <p>
              Tudo o que coletamos, por quê, por quanto tempo e como pedir
              exclusão está na{' '}
              <a
                className="text-clay underline underline-offset-2"
                href="/privacidade"
              >
                Política de Privacidade
              </a>
              .
            </p>
          </A>
        ),
      },
    ],
  },
  {
    id: 'conta',
    label: 'Conta e avisos',
    tagline: 'cadastro, senha, e-mails',
    accent: 'sea-d',
    questions: [
      {
        id: 'conta-cadastro',
        q: 'Como crio minha conta?',
        search: 'criar conta cadastro cadastrar registro email senha rapido',
        a: (
          <A>
            <p>
              E-mail, senha, e pronto — cadastro em menos de um minuto, sem
              firula. Os dados de perfil mais detalhados ficam pra depois; o que
              importa pra começar é entrar e reservar.
            </p>
          </A>
        ),
      },
      {
        id: 'conta-senha',
        q: 'Esqueci minha senha. E agora?',
        search:
          'esqueci senha recuperar redefinir reset password trocar nova senha login',
        a: (
          <A>
            <p>
              Na tela de login tem o link{' '}
              <strong>&quot;esqueci a senha&quot;</strong>. Você informa o
              e-mail, recebe um link de redefinição e cria uma senha nova. Sem
              precisar falar com ninguém.
            </p>
          </A>
        ),
      },
      {
        id: 'conta-notificacoes',
        q: 'Que e-mails a bikebeach vai me mandar?',
        search:
          'email notificacao aviso lembrete whatsapp comunicacao receber mensagem',
        a: (
          <A>
            <p>Por enquanto a comunicação é só por e-mail. Você recebe:</p>
            <ul className="ml-1 space-y-1">
              <li>confirmação de cadastro;</li>
              <li>confirmação de cada reserva;</li>
              <li>lembrete 2 horas antes da aula;</li>
              <li>aviso quando o estúdio cancela uma aula;</li>
              <li>recibo de pagamento;</li>
              <li>aviso de promoção da lista de espera.</li>
            </ul>
            <p>
              WhatsApp está nos planos pra mais pra frente — por ora, fica de
              olho na caixa de entrada.
            </p>
          </A>
        ),
      },
    ],
  },
];

/// Quick-jump chips in the hero — phrased as the user's situation, not as a
/// topic. Each one scrolls to and opens the most relevant answer.
export const SITUATIONS: Situation[] = [
  { id: 's-cancelar', label: 'vou cancelar minha aula', target: 'janela-8h' },
  {
    id: 's-espera',
    label: 'fiquei na lista de espera',
    target: 'espera-promo',
  },
  { id: 's-credito', label: 'meu crédito sumiu', target: 'creditos-sumiu' },
  {
    id: 's-reservar',
    label: 'não consigo reservar',
    target: 'saude-bloqueia',
  },
  {
    id: 's-ocupada',
    label: 'deu "bike já reservada"',
    target: 'bike-ocupada',
  },
  {
    id: 's-chuva',
    label: 'choveu e a aula caiu',
    target: 'cancela-credito',
  },
];
