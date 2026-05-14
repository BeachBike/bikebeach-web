import { Link } from 'react-router';
import {
  LegalList,
  LegalPage,
  type LegalSection,
} from '@/components/legal/legal-page';

/// Public /privacidade — Privacy Policy, written against the LGPD (Lei
/// 13.709/2018). Reflects what the product actually collects: account data,
/// payment data handled by the provider, and LGPD-sensitive health data
/// (PAR-Q answers + liability consent) with a separate, granular consent.
///
/// NOTE: product-grounded draft, not legal advice — review with a lawyer
/// before launch (controller CNPJ, DPO appointment, retention periods).

const UPDATED = '14 de maio de 2026';

const SECTIONS: LegalSection[] = [
  {
    id: 'controlador',
    heading: 'Quem é o controlador dos seus dados',
    body: (
      <>
        <p>
          O controlador dos dados pessoais tratados no aplicativo é a{' '}
          <strong>bikebeach</strong>, estúdio de spinning sediado em Balneário
          Camboriú, Santa Catarina (CNPJ a ser informado).
        </p>
        <p>
          Esta Política explica, de forma transparente, quais dados coletamos,
          por que coletamos, com quem compartilhamos e quais são os seus
          direitos sob a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 —
          LGPD). Ela complementa os{' '}
          <Link
            className="font-semibold text-clay underline underline-offset-2"
            to="/termos"
          >
            Termos de Uso
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: 'dados',
    heading: 'Quais dados coletamos',
    body: (
      <>
        <p>Coletamos apenas o necessário para operar o serviço:</p>
        <LegalList
          items={[
            <>
              <strong>Dados de cadastro</strong> — nome, e-mail e senha
              (armazenada de forma criptografada).
            </>,
            <>
              <strong>Dados de uso</strong> — reservas, check-ins,
              cancelamentos, histórico de aulas, saldo e validade de créditos.
            </>,
            <>
              <strong>Dados de pagamento</strong> — informações de transação
              (valor, forma, status). Os dados completos do cartão são tratados
              diretamente pelo provedor de pagamentos e não trafegam nem ficam
              armazenados em nossos servidores.
            </>,
            <>
              <strong>Dados de saúde</strong> — respostas do PAR-Q e o registro
              de aceite do termo de responsabilidade. Tratados com proteção
              reforçada (veja a seção seguinte).
            </>,
            <>
              <strong>Dados técnicos</strong> — informações básicas de acesso
              necessárias ao funcionamento e à segurança do aplicativo.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'saude',
    heading: 'Dados sensíveis de saúde',
    body: (
      <>
        <p>
          As respostas do PAR-Q são <strong>dados pessoais sensíveis</strong>{' '}
          nos termos da LGPD. Por isso recebem tratamento distinto dos demais
          dados:
        </p>
        <LegalList
          items={[
            <>
              O <strong>consentimento</strong> para tratá-los é coletado de
              forma <strong>granular e separada</strong> do consentimento geral
              do cadastro — você decide especificamente sobre eles.
            </>,
            <>
              São usados com uma única finalidade: avaliar a sua prontidão para
              a atividade física e a sua segurança na arena.
            </>,
            <>
              Não são compartilhados para fins de marketing nem com terceiros
              sem relação com a prestação do serviço.
            </>,
            <>
              O termo de responsabilidade é reaceito mensalmente e o PAR-Q a
              cada 3 meses; as respostas anteriores são reaproveitadas para que
              você só atualize o que mudou.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'finalidades',
    heading: 'Para que usamos seus dados',
    body: (
      <>
        <p>
          Cada tratamento tem uma finalidade definida e uma base legal da LGPD:
        </p>
        <LegalList
          items={[
            <>
              <strong>Executar o serviço</strong> — criar conta, processar
              reservas, check-ins, créditos e pagamentos.{' '}
              <em>Base: execução de contrato.</em>
            </>,
            <>
              <strong>Comunicar-se com você</strong> — confirmações, lembretes
              de aula, avisos de cancelamento e de promoção da lista de espera,
              recibos. <em>Base: execução de contrato.</em>
            </>,
            <>
              <strong>Avaliar prontidão física</strong> — uso das respostas do
              PAR-Q e do termo de responsabilidade.{' '}
              <em>Base: consentimento específico.</em>
            </>,
            <>
              <strong>Segurança e prevenção a fraude</strong> — proteger contas
              e transações. <em>Base: legítimo interesse / obrigação legal.</em>
            </>,
            <>
              <strong>Cumprir obrigações legais e fiscais</strong> — guarda de
              registros exigida por lei.{' '}
              <em>Base: cumprimento de obrigação legal.</em>
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'compartilhamento',
    heading: 'Com quem compartilhamos',
    body: (
      <>
        <p>
          Não vendemos seus dados. Compartilhamos o mínimo necessário, apenas
          com:
        </p>
        <LegalList
          items={[
            <>
              <strong>Provedor de pagamentos</strong> — para processar compras
              e a cobrança recorrente do plano mensal.
            </>,
            <>
              <strong>Provedor de e-mail transacional</strong> — para enviar as
              comunicações do serviço.
            </>,
            <>
              <strong>Provedores de infraestrutura</strong> — hospedagem e
              banco de dados que sustentam o aplicativo.
            </>,
            <>
              <strong>Autoridades</strong> — quando houver requisição legal ou
              ordem judicial.
            </>,
          ]}
        />
        <p>
          Todos os operadores são contratualmente obrigados a tratar os dados
          apenas conforme as nossas instruções e a manter padrões de segurança
          compatíveis com a LGPD.
        </p>
      </>
    ),
  },
  {
    id: 'retencao',
    heading: 'Por quanto tempo guardamos',
    body: (
      <>
        <p>
          Mantemos seus dados pelo tempo necessário às finalidades acima.
          Enquanto sua conta estiver ativa, guardamos os dados de cadastro e de
          uso. Encerrada a conta, eliminamos ou anonimizamos os dados, exceto
          aqueles que precisamos reter por obrigação legal ou fiscal, ou para o
          exercício regular de direitos em processo.
        </p>
        <p>
          Dados de saúde são mantidos somente enquanto necessários à avaliação
          de prontidão e eliminados quando essa finalidade se encerra ou quando
          o consentimento é revogado, salvo retenção exigida por lei.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    heading: 'Cookies e armazenamento local',
    body: (
      <>
        <p>
          Usamos armazenamento local e cookies estritamente necessários para
          manter você autenticado, lembrar a arena selecionada e garantir o
          funcionamento e a segurança do aplicativo. Não utilizamos cookies de
          publicidade de terceiros. Bloquear os cookies necessários pode
          impedir o uso do serviço.
        </p>
      </>
    ),
  },
  {
    id: 'direitos',
    heading: 'Seus direitos',
    body: (
      <>
        <p>
          A LGPD garante a você, a qualquer momento e sem custo, o direito de:
        </p>
        <LegalList
          items={[
            'confirmar a existência de tratamento dos seus dados;',
            'acessar os dados que mantemos sobre você;',
            'corrigir dados incompletos, inexatos ou desatualizados;',
            'solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;',
            'solicitar a portabilidade dos dados a outro fornecedor;',
            'revogar o consentimento, em especial o consentimento específico dos dados de saúde;',
            'obter informação sobre com quem compartilhamos seus dados.',
          ]}
        />
        <p>
          Para exercer qualquer um desses direitos, escreva para{' '}
          <a
            className="font-semibold text-clay underline underline-offset-2"
            href="mailto:privacidade@bikebeach.com.br"
          >
            privacidade@bikebeach.com.br
          </a>
          . Responderemos no menor prazo possível. Lembre-se de que revogar o
          consentimento dos dados de saúde impede a criação de novas reservas,
          já que o PAR-Q é exigido para isso.
        </p>
      </>
    ),
  },
  {
    id: 'seguranca',
    heading: 'Segurança da informação',
    body: (
      <>
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados:
          senhas armazenadas de forma criptografada, tráfego cifrado, controle
          de acesso por função (aluno, instrutor, administrador) e segregação
          dos dados sensíveis de saúde.
        </p>
        <p>
          Nenhum sistema é completamente imune a incidentes. Caso ocorra um
          incidente de segurança que possa acarretar risco relevante aos seus
          direitos, comunicaremos você e a Autoridade Nacional de Proteção de
          Dados (ANPD) nos termos da LGPD.
        </p>
      </>
    ),
  },
  {
    id: 'comunicacoes',
    heading: 'Comunicações e e-mails',
    body: (
      <>
        <p>
          No momento, a comunicação com você é feita exclusivamente por e-mail
          e se limita a mensagens transacionais necessárias ao serviço:
          confirmação de cadastro, confirmação de reserva, lembrete 2 horas
          antes da aula, aviso de cancelamento pelo estúdio, recibo de
          pagamento e aviso de promoção da lista de espera.
        </p>
        <p>
          Como essas mensagens são essenciais ao funcionamento do serviço, não
          há descadastramento individual delas enquanto a conta estiver ativa.
          Caso passemos a enviar comunicações de marketing, elas terão consentimento
          próprio e opção de cancelamento.
        </p>
      </>
    ),
  },
  {
    id: 'menores',
    heading: 'Crianças e adolescentes',
    body: (
      <>
        <p>
          O aplicativo é destinado a maiores de 18 anos. Não coletamos
          intencionalmente dados de menores de idade. Se identificarmos um
          cadastro nessas condições, a conta será encerrada e os dados
          eliminados.
        </p>
      </>
    ),
  },
  {
    id: 'alteracoes',
    heading: 'Alterações nesta Política',
    body: (
      <>
        <p>
          Podemos atualizar esta Política para refletir mudanças no serviço ou
          na legislação. A versão vigente é sempre a publicada nesta página,
          com a data de última atualização no topo. Mudanças relevantes serão
          comunicadas por e-mail.
        </p>
      </>
    ),
  },
  {
    id: 'contato',
    heading: 'Como falar com a gente',
    body: (
      <>
        <p>
          Para dúvidas, solicitações sobre seus dados ou contato com o
          Encarregado pelo Tratamento de Dados Pessoais (DPO), escreva para{' '}
          <a
            className="font-semibold text-clay underline underline-offset-2"
            href="mailto:privacidade@bikebeach.com.br"
          >
            privacidade@bikebeach.com.br
          </a>
          .
        </p>
        <p>
          Você também pode apresentar reclamação à Autoridade Nacional de
          Proteção de Dados (ANPD) caso entenda que seus direitos não foram
          atendidos.
        </p>
      </>
    ),
  },
];

export function PrivacidadeRoute() {
  return (
    <LegalPage
      eyebrow="política de privacidade"
      title={
        <>
          Seus dados,
          <br />
          <span className="font-normal italic text-clay">na transparência.</span>
        </>
      }
      intro="O que a bikebeach coleta, por que coleta, com quem compartilha e como você controla tudo isso — escrito para a LGPD e em português de gente."
      updated={UPDATED}
      sections={SECTIONS}
      sibling={{ label: 'Termos de Uso', href: '/termos' }}
    />
  );
}
