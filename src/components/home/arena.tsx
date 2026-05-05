import { useDefaultUnit } from '@/api/public';

/// "Onde fica" section. Right side is a stylized illustrated map (no real
/// map tile yet). Pin pulses; ocean lines are deterministic on render.
const WAVE_OFFSETS = [0.62, 0.81, 0.55, 0.94, 0.7];

export function Arena() {
  const { unit } = useDefaultUnit();
  const bikeCount = unit?.operationalBikeCount;
  const fleetLine = bikeCount
    ? `${bikeCount} bikes em deque`
    : 'Frota completa em deque';

  return (
    <section
      id="arena"
      className="bg-ink px-7 pb-[120px] pt-[140px] text-cream"
    >
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <h2
            className="display-tight"
            style={{ fontSize: 'clamp(56px,8vw,128px)', lineHeight: 0.92 }}
          >
            A nossa
            <br />
            <span
              className="font-normal italic"
              style={{ color: 'var(--color-sun)' }}
            >
              arena
            </span>{' '}
            fica
            <br />
            no centro.
          </h2>
          <p className="mt-7 max-w-[520px] text-lg leading-relaxed text-cream/80">
            Entre os postos 4 e 5 da Praia Central de Balneário Camboriú,
            na altura da Avenida Atlântica 1.500. {fleetLine} de madeira
            reciclada, sombrite cor areia, som direcionado pra dentro.
          </p>
          <a
            href="#"
            className="mt-9 inline-flex items-center gap-2.5 rounded-full bg-clay px-7 py-4 text-[15px] font-semibold text-cream transition-colors hover:bg-clay-d"
          >
            Como chegar →
          </a>
        </div>

        {/* Stylized arena pin */}
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-lg"
          style={{ background: '#0F1410' }}
        >
          {/* Ocean (top 45%) */}
          <div
            className="absolute inset-x-0 top-0"
            style={{
              height: '45%',
              background:
                'linear-gradient(180deg, var(--color-sea) 0%, #1a4a4a 100%)',
            }}
          >
            {WAVE_OFFSETS.map((scale, i) => (
              <div
                key={i}
                className="absolute inset-x-0 h-px bg-cream/20"
                style={{
                  top: `${20 + i * 16}%`,
                  transform: `scaleX(${scale})`,
                }}
              />
            ))}
          </div>
          {/* Sand (bottom 55%) */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              top: '45%',
              background:
                'linear-gradient(180deg, var(--color-sand) 0%, var(--color-cream-2) 100%)',
            }}
          />
          {/* Arena pin */}
          <div
            className="absolute flex flex-col items-center gap-2"
            style={{ top: '58%', left: '44%' }}
          >
            <div
              className="bb-pulse h-[22px] w-[22px] rounded-full"
              style={{
                background: 'var(--color-clay)',
                boxShadow:
                  '0 0 0 6px rgba(216,93,52,.3), 0 0 0 16px rgba(216,93,52,.15)',
              }}
            />
            <div
              className="display-tight rounded-full bg-cream px-2.5 py-1 text-base text-ink"
              style={{ fontSize: 16 }}
            >
              bikebeach
            </div>
          </div>
          {/* Labels */}
          <div
            className="display-tight absolute left-1/2 -translate-x-1/2 font-normal italic text-cream/75"
            style={{ top: '15%', fontSize: 24 }}
          >
            oceano
          </div>
          <div
            className="absolute text-xs font-semibold text-ink-2"
            style={{ bottom: '10%', right: '8%' }}
          >
            av. atlântica
          </div>
        </div>
      </div>
    </section>
  );
}
