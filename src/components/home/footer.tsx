import { Logo } from '@/components/brand/logo';

const COLUMNS = [
  ['aulas', ['aulas de hoje', 'aulas da semana', 'aula experimental', 'eventos especiais']],
  ['conta', ['entrar', 'cadastrar', 'minhas reservas', 'meus pacotes']],
  ['a casa', ['a arena', 'instrutores', 'trabalhe com a gente', 'fale com a gente']],
] as const;

export function Footer() {
  return (
    <footer className="bg-cream px-7 pb-8 pt-14">
      <div className="grid gap-8 pt-6 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-[320px] text-sm leading-relaxed text-ink-2">
            Spinning na faixa de areia.
            <br />
            Balneário Camboriú · Santa Catarina.
          </p>
        </div>
        {COLUMNS.map(([title, items]) => (
          <div key={title}>
            <div
              className="display-tight text-clay"
              style={{ fontSize: 18 }}
            >
              {title}
            </div>
            <ul className="mt-3.5 flex flex-col gap-2.5 list-none">
              {items.map((x) => (
                <li key={x} className="text-sm text-ink">
                  <a href="#">{x}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-3.5 border-t border-sand pt-5 text-[13px] text-ink-2">
        <span>© 2026 bikebeach</span>
        <span>feito onde a areia encontra o mar</span>
        <span>termos · privacidade</span>
      </div>
    </footer>
  );
}
