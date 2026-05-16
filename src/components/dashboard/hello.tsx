import { firstName, formatGreeting } from '@/lib/format';

interface Props {
  name: string | undefined;
}

export function Hello({ name }: Props) {
  const greet = formatGreeting();
  return (
    <section className="pb-2 pt-6">
      <div className="text-sm font-semibold text-clay">{greet},</div>
      <h1
        className="display-tight mt-1.5"
        style={{ fontSize: 'clamp(28px, 8vw, 88px)', lineHeight: 0.92 }}
      >
        {firstName(name) || 'ciclista'}.
        <br />
        <span className="font-normal italic text-ink-2">bora pedalar?</span>
      </h1>
    </section>
  );
}
