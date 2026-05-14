import { Link } from 'react-router';
import {
  LegalList,
  LegalPage,
  type LegalSection,
} from '@/components/legal/legal-page';

/// Public /termos — Terms of Use. The clauses mirror the canonical product
/// rules in CLAUDE.md (8h cancel window, no-show, waitlist auto-promotion,
/// tiered credit expiry, studio cancellation). When a rule changes, this
/// page changes with it.
///
/// NOTE: this is a product-grounded draft, not legal advice — it should be
/// reviewed by a lawyer before launch (CNPJ, foro, refund windows).

const UPDATED = '14 de maio de 2026';

const SECTIONS: LegalSection[] = [
  {
    id: 'sobre',
    heading: 'Quem somos e o que você está aceitando',
    body: (
      <>
        <p>
          A <strong>bikebeach</strong> é um estúdio de spinning montado na
          faixa de areia, com sede em Balneário Camboriú, Santa Catarina
          (CNPJ a ser informado). Operamos um aplicativo web pelo qual você
          compra créditos de aula, reserva uma bike específica em um horário e
          comparece à aula na arena.
        </p>
        <p>
          Ao criar uma conta ou usar o aplicativo, você declara ter lido e
          concordado com estes Termos de Uso. Se não concordar com algum
          ponto, não utilize o serviço. Estes Termos convivem com a{' '}
          <Link
            className="font-semibold text-clay underline underline-offset-2"
            to="/privacidade"
          >
            Política de Privacidade
          </Link>
          , que explica como tratamos seus dados.
        </p>
      </>
    ),
  },
  {
    id: 'conta',
    heading: 'Sua conta',
    body: (
      <>
        <p>
          Para usar a bikebeach você cria uma conta com e-mail e senha. Você é
          responsável por manter a senha em segredo e por toda atividade
          realizada na sua conta. Avise-nos imediatamente se suspeitar de uso
          indevido.
        </p>
        <p>
          Você deve ter <strong>18 anos ou mais</strong> para manter uma conta
          própria. Os dados informados no cadastro devem ser verdadeiros e
          atualizados — especialmente o e-mail, que é o nosso único canal de
          aviso (confirmações, lembretes e cancelamentos).
        </p>
        <p>
          Podemos suspender ou encerrar contas que violem estes Termos, que
          apresentem dados fraudulentos ou que coloquem em risco a segurança de
          outros alunos ou da equipe.
        </p>
      </>
    ),
  },
  {
    id: 'planos',
    heading: 'Planos, pacotes e créditos',
    body: (
      <>
        <p>
          O acesso às aulas funciona por <strong>créditos</strong>. Cada
          crédito equivale a uma reserva de bike em uma aula. Você obtém
          créditos de duas formas:
        </p>
        <LegalList
          items={[
            <>
              <strong>Pacotes avulsos</strong> — você compra uma quantidade de
              créditos de uma vez e usa quando quiser, dentro do prazo de
              validade.
            </>,
            <>
              <strong>Plano mensal</strong> — uma assinatura recorrente que
              libera créditos a cada ciclo. Os créditos do plano mensal{' '}
              <strong>não acumulam</strong>: o que não for usado zera no fim do
              ciclo e o ciclo seguinte começa do zero.
            </>,
          ]}
        />
        <p>
          Os preços vigentes, o tamanho dos pacotes e os valores dos planos são
          os exibidos no aplicativo no momento da compra. Não há fidelidade: a
          renovação do plano mensal pode ser cancelada a qualquer momento pelo
          painel, e a cobrança simplesmente não se repete no ciclo seguinte.
        </p>
      </>
    ),
  },
  {
    id: 'validade',
    heading: 'Validade dos créditos',
    body: (
      <>
        <p>
          Créditos de pacotes avulsos têm prazo de validade contado a partir da
          compra, escalonado pelo tamanho do pacote:
        </p>
        <LegalList
          items={[
            <>
              <strong>1 aula (avulsa)</strong> — 30 dias
            </>,
            <>
              <strong>5 aulas</strong> — 60 dias
            </>,
            <>
              <strong>10 aulas</strong> — 90 dias
            </>,
            <>
              <strong>20 aulas ou mais</strong> — 120 dias
            </>,
          ]}
        />
        <p>
          Créditos não utilizados até a data de validade expiram e deixam de
          estar disponíveis na carteira, sem direito a reembolso ou prorrogação,
          salvo determinação legal em contrário. Você pode acompanhar o saldo e
          as datas de validade a qualquer momento na aba{' '}
          <em>meu plano</em> do painel.
        </p>
      </>
    ),
  },
  {
    id: 'reserva',
    heading: 'Reserva de bike',
    body: (
      <>
        <p>
          A presença na aula <strong>exige a reserva prévia de uma bike
          específica</strong>. A reserva consome 1 crédito no momento da
          confirmação e garante o seu lugar na arena.
        </p>
        <LegalList
          items={[
            <>
              Você pode reservar aulas com até <strong>7 dias de
              antecedência</strong>.
            </>,
            <>
              Cada bike comporta uma única reserva ativa por horário. Se duas
              pessoas tentarem a mesma bike simultaneamente, apenas a primeira
              confirmação é aceita; a outra não tem crédito consumido e pode
              escolher outra bike livre.
            </>,
            <>
              O <strong>check-in</strong> deve ser feito até{' '}
              <strong>5 minutos após o horário de início</strong> da aula
              (tolerância configurável por arena). Após esse prazo, a reserva é
              tratada como falta.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'cancelamento',
    heading: 'Cancelamento pelo aluno e falta',
    body: (
      <>
        <p>
          Você pode cancelar uma reserva pelo painel a qualquer momento. O
          efeito sobre o crédito depende de quando o cancelamento acontece:
        </p>
        <LegalList
          items={[
            <>
              <strong>Até 8 horas antes</strong> do início da aula — o crédito
              retorna integralmente à sua carteira, sem custo.
            </>,
            <>
              <strong>Dentro das 8 horas</strong> que antecedem a aula — o
              crédito é consumido, pois a bike ficou reservada em seu nome sem
              tempo hábil para reaproveitamento.
            </>,
            <>
              <strong>Falta (no-show)</strong> — se você não cancelar e não
              fizer check-in, o crédito é consumido automaticamente, sem
              revisão manual e sem cortesia mensal.
            </>,
          ]}
        />
        <p>
          Reservas originadas da lista de espera têm uma regra de cancelamento
          mais branda — veja a seção seguinte.
        </p>
      </>
    ),
  },
  {
    id: 'espera',
    heading: 'Lista de espera',
    body: (
      <>
        <p>
          Quando uma aula está lotada, você pode entrar na lista de espera, que
          funciona por ordem de chegada (FIFO). Entrar na lista não consome
          crédito.
        </p>
        <p>
          Ao abrir uma vaga, o sistema <strong>reserva automaticamente uma
          bike para o primeiro da fila e consome o crédito correspondente</strong>
          . Não há janela de confirmação: a fila avança sozinha e você é
          avisado por e-mail.
        </p>
        <p>
          Como a promoção pode ocorrer com pouca antecedência, reservas vindas
          da lista de espera têm uma <strong>janela protegida</strong>: podem
          ser canceladas até <strong>2 horas antes</strong> da aula{' '}
          <strong>sem perda do crédito</strong>, mesmo que isso já esteja
          dentro do prazo normal de 8 horas. Essa proteção vale exclusivamente
          para a reserva promovida.
        </p>
      </>
    ),
  },
  {
    id: 'cancelamento-estudio',
    heading: 'Cancelamento de aula pelo estúdio',
    body: (
      <>
        <p>
          A bikebeach acontece ao ar livre. O instrutor — que está na arena e
          avalia clima, vento e mar — é quem normalmente decide cancelar uma
          aula; a administração pode cancelar como alternativa. O cancelamento
          pode ocorrer <strong>antes ou durante</strong> a aula, com motivo
          registrado (chuva, vento, mar alto, manutenção, segurança, baixa
          adesão ou outro).
        </p>
        <p>
          Em qualquer caso de cancelamento pelo estúdio,{' '}
          <strong>o crédito é devolvido integralmente</strong> a todos os
          alunos reservados, a aula não é contabilizada como falta para
          ninguém e é excluída das métricas de ocupação. Não há indenização ou
          compensação adicional além da devolução do crédito.
        </p>
      </>
    ),
  },
  {
    id: 'pagamentos',
    heading: 'Pagamentos',
    body: (
      <>
        <p>
          Os pagamentos são processados por meio de um provedor de pagamentos
          terceirizado. Aceitamos Pix, cartão de crédito e cartão de débito,
          conforme as opções disponíveis no aplicativo. Pagamentos via Pix
          podem contar com desconto, exibido no checkout antes da confirmação.
        </p>
        <p>
          O plano mensal é cobrado de forma recorrente a cada ciclo. Não
          armazenamos os dados completos do seu cartão — eles são tratados
          diretamente pelo provedor de pagamentos.
        </p>
        <p>
          Pedidos de estorno de créditos não utilizados devem ser enviados para{' '}
          <a
            className="font-semibold text-clay underline underline-offset-2"
            href="mailto:contato@bikebeach.com.br"
          >
            contato@bikebeach.com.br
          </a>{' '}
          e serão analisados conforme a legislação aplicável, em especial o
          Código de Defesa do Consumidor.
        </p>
      </>
    ),
  },
  {
    id: 'saude',
    heading: 'Saúde, PAR-Q e termo de responsabilidade',
    body: (
      <>
        <p>
          Spinning é atividade física de intensidade elevada. Para reservar
          aulas, você precisa manter dois documentos em dia:
        </p>
        <LegalList
          items={[
            <>
              <strong>Termo de responsabilidade</strong> — reconhecimento dos
              riscos inerentes à atividade, com reaceite mensal.
            </>,
            <>
              <strong>PAR-Q</strong> — questionário de prontidão para atividade
              física, com reaceite a cada 3 meses.
            </>,
          ]}
        />
        <p>
          Se qualquer um dos dois estiver vencido,{' '}
          <strong>novas reservas ficam bloqueadas</strong> até a renovação
          (reservas já existentes não são canceladas). Você é responsável pela
          veracidade das informações de saúde prestadas e deve consultar um
          médico em caso de dúvida sobre sua aptidão. A bikebeach não substitui
          avaliação ou acompanhamento médico.
        </p>
      </>
    ),
  },
  {
    id: 'conduta',
    heading: 'Conduta na arena',
    body: (
      <>
        <p>
          Esperamos respeito mútuo entre alunos, instrutores e equipe. Você
          concorda em seguir as orientações de segurança da equipe, usar os
          equipamentos de forma adequada e não comparecer sob efeito de
          substâncias que comprometam sua segurança ou a dos demais.
        </p>
        <p>
          Danos causados intencionalmente ou por uso indevido dos equipamentos
          podem ser cobrados. Comportamentos abusivos, discriminatórios ou que
          ameacem a integridade de terceiros podem levar à suspensão imediata
          da conta, sem reembolso dos créditos remanescentes.
        </p>
      </>
    ),
  },
  {
    id: 'responsabilidade',
    heading: 'Limitação de responsabilidade',
    body: (
      <>
        <p>
          A bikebeach se compromete a manter a arena, os equipamentos e o
          aplicativo em condições adequadas de uso. Ainda assim, a prática de
          atividade física envolve riscos que você assume ao aceitar o termo de
          responsabilidade.
        </p>
        <p>
          Na máxima extensão permitida pela lei, a bikebeach não se
          responsabiliza por indisponibilidades temporárias do aplicativo, por
          eventos de força maior (clima, desastres naturais) ou por danos
          decorrentes do descumprimento, por parte do aluno, das orientações de
          segurança e das informações de saúde solicitadas.
        </p>
      </>
    ),
  },
  {
    id: 'alteracoes',
    heading: 'Alterações nestes Termos',
    body: (
      <>
        <p>
          Podemos atualizar estes Termos para refletir mudanças no serviço, em
          regras de negócio ou na legislação. A versão vigente é sempre a
          publicada nesta página, com a data de última atualização indicada no
          topo.
        </p>
        <p>
          Mudanças relevantes serão comunicadas por e-mail. O uso continuado do
          aplicativo após a atualização representa concordância com a nova
          versão.
        </p>
      </>
    ),
  },
  {
    id: 'foro',
    heading: 'Lei aplicável e foro',
    body: (
      <>
        <p>
          Estes Termos são regidos pelas leis da República Federativa do
          Brasil. Fica eleito o foro da comarca de Balneário Camboriú/SC para
          dirimir eventuais controvérsias, sem prejuízo do direito do
          consumidor de acionar o foro de seu domicílio.
        </p>
      </>
    ),
  },
];

export function TermosRoute() {
  return (
    <LegalPage
      eyebrow="termos de uso"
      title={
        <>
          As regras
          <br />
          <span className="font-normal italic text-clay">da areia.</span>
        </>
      }
      intro="O combinado entre você e a bikebeach: como funcionam as reservas, os créditos, os cancelamentos e as responsabilidades de cada lado. Sem letrinha miúda escondida."
      updated={UPDATED}
      sections={SECTIONS}
      sibling={{ label: 'Política de Privacidade', href: '/privacidade' }}
    />
  );
}
