import { useEffect, useRef, useState } from 'react';
import {
  useDeleteStaffPhoto,
  useUploadStaffPhoto,
  type AdminStaff,
} from '@/api/admin';
import { assetUrl } from '@/api/client';
import { Btn } from '@/components/admin/ui';
import {
  InstructorPortrait,
  toneFromColorToken,
} from '@/components/common/instructor-portrait';

interface Props {
  instructor: AdminStaff;
}

const INSTRUCTIONS =
  'Foto do rosto até 8MB. PNG ou JPG. Caminho recomendado: deixar o sistema remover o fundo automaticamente. Se subir a foto direto (sem PNG transparente), ela sai do padrão visual — fica como retângulo, sem o fundo gradient.';

/// Admin-only widget that handles the full portrait pipeline:
/// pick file → strip background in the browser via `@imgly/background-removal`
/// → preview transparent PNG over a checker pattern → upload.
///
/// The ONNX model the lib ships is ~10MB. It's loaded lazily the first time
/// "remover fundo" runs, then cached by the browser. Admin only — never
/// rendered for end users.
export function InstructorPhotoUpload({ instructor }: Props) {
  const uploadMut = useUploadStaffPhoto();
  const deleteMut = useDeleteStaffPhoto();

  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [stripping, setStripping] = useState(false);
  const [stripError, setStripError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount so we don't leak memory after many edits.
  useEffect(() => {
    return () => {
      if (originalPreview) URL.revokeObjectURL(originalPreview);
      if (processedPreview) URL.revokeObjectURL(processedPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetLocal = () => {
    if (originalPreview) URL.revokeObjectURL(originalPreview);
    if (processedPreview) URL.revokeObjectURL(processedPreview);
    setOriginalPreview(null);
    setProcessedBlob(null);
    setProcessedPreview(null);
    setStripError(null);
    uploadMut.reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setStripError('Arquivo maior que 8MB — escolha uma imagem menor.');
      return;
    }
    if (originalPreview) URL.revokeObjectURL(originalPreview);
    if (processedPreview) URL.revokeObjectURL(processedPreview);
    setOriginalPreview(URL.createObjectURL(file));
    setProcessedBlob(null);
    setProcessedPreview(null);
    setStripError(null);
  };

  const removeBackground = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setStripping(true);
    setStripError(null);
    try {
      // Dynamic import so the heavy ONNX runtime + 10MB model isn't shipped
      // to every page — only the admin photo flow pays the cost.
      // - `publicPath` points to imgly's CDN where the matched model + WASM
      //   live. Without this the runtime tries to resolve the assets relative
      //   to our bundle and dies with "_OrtGetInputOutputMetadata is not a
      //   function" because the JS/WASM versions don't match.
      // - `device: 'cpu'` skips the WebGPU code path so we don't depend on
      //   `onnxruntime-web/webgpu` being resolvable in the bundle.
      // - `model: 'isnet_quint8'` is the smallest variant (~10MB) — quality
      //   is good enough for face cutouts on plain backgrounds.
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(file, {
        publicPath:
          'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
        device: 'cpu',
        model: 'isnet_quint8',
      });
      if (processedPreview) URL.revokeObjectURL(processedPreview);
      setProcessedBlob(blob);
      setProcessedPreview(URL.createObjectURL(blob));
    } catch (err) {
      console.error('background-removal failed', err);
      setStripError(
        'Não rolou processar essa imagem. Tente uma foto com fundo mais simples.',
      );
    } finally {
      setStripping(false);
    }
  };

  const save = async () => {
    if (!processedBlob) return;
    try {
      await uploadMut.mutateAsync({
        id: instructor.id,
        blob: processedBlob,
        mimeType: 'image/png',
      });
      resetLocal();
    } catch {
      // mutation surfaces the error via uploadMut.error below
    }
  };

  /// Bypass the background-removal step and upload the original file as-is.
  /// Useful when the admin already has a transparent PNG produced elsewhere
  /// (Photoshop, remove.bg, Figma) — or accepts the rectangular look of a
  /// raw JPG. Frontend warns about the visual impact in the instructions.
  const saveDirect = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const isJpg = file.type === 'image/jpeg';
    if (isJpg) {
      const ok = window.confirm(
        'Subindo a foto direto sem processar. JPG não tem fundo transparente — a foto vai aparecer como retângulo, fora do padrão visual. Continuar?',
      );
      if (!ok) return;
    }
    try {
      await uploadMut.mutateAsync({
        id: instructor.id,
        blob: file,
        mimeType: file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png',
      });
      resetLocal();
    } catch {
      // surfaced via uploadMut.error
    }
  };

  const remove = async () => {
    if (!instructor.photoUrl) return;
    if (!window.confirm('Tirar a foto atual desse professor?')) return;
    try {
      await deleteMut.mutateAsync(instructor.id);
    } catch {
      /* surfaced via deleteMut.error */
    }
  };

  const tone = toneFromColorToken(instructor.primaryClassKind?.colorToken);
  const currentUrl = assetUrl(instructor.photoUrl);

  return (
    <div className="flex flex-col gap-3 rounded-xs border border-sand bg-cream-2 p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-2">
            foto do professor
          </div>
          <p className="mt-1 max-w-[460px] text-[12px] leading-snug text-ink-2">
            {INSTRUCTIONS}
          </p>
        </div>
        <div className="shrink-0">
          <InstructorPortrait
            photoUrl={instructor.photoUrl}
            name={instructor.name}
            tone={tone}
            size="md"
          />
        </div>
      </div>

      {/* Picker + preview */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={onPick}
          className="block w-full cursor-pointer rounded-xs border border-dashed border-sand-2 bg-cream px-3 py-2 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-clay file:px-3 file:py-1 file:text-[11px] file:font-semibold file:text-cream"
        />

        {originalPreview && (
          <div className="grid gap-2 md:grid-cols-2">
            <div className="overflow-hidden rounded-xs border border-sand">
              <div className="bg-ink/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-2">
                original
              </div>
              <img
                src={originalPreview}
                alt="original"
                className="block max-h-[180px] w-full object-contain"
              />
            </div>
            <div
              className="overflow-hidden rounded-xs border border-sand"
              style={{
                // Checker pattern shows transparency — same convention as
                // every image editor on earth.
                backgroundImage:
                  'linear-gradient(45deg, #e5e0d4 25%, transparent 25%, transparent 75%, #e5e0d4 75%), linear-gradient(45deg, #e5e0d4 25%, transparent 25%, transparent 75%, #e5e0d4 75%)',
                backgroundSize: '14px 14px',
                backgroundPosition: '0 0, 7px 7px',
                backgroundColor: 'var(--color-cream)',
              }}
            >
              <div className="bg-ink/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-2">
                sem fundo
              </div>
              {processedPreview ? (
                <img
                  src={processedPreview}
                  alt="sem fundo"
                  className="block max-h-[180px] w-full object-contain"
                />
              ) : (
                <div className="flex h-[180px] items-center justify-center text-center text-[12px] text-ink-2">
                  {stripping
                    ? 'processando — 1ª vez baixa um modelo de ~10MB (cacheado depois).'
                    : 'clique em "remover fundo" pra ver aqui.'}
                </div>
              )}
            </div>
          </div>
        )}

        {stripError && (
          <div className="rounded-xs bg-clay-d/10 px-3 py-2 text-[12px] text-clay-d">
            {stripError}
          </div>
        )}
        {uploadMut.isError && (
          <div className="rounded-xs bg-clay-d/10 px-3 py-2 text-[12px] text-clay-d">
            Falha ao subir a foto. Tente novamente.
          </div>
        )}
        {deleteMut.isError && (
          <div className="rounded-xs bg-clay-d/10 px-3 py-2 text-[12px] text-clay-d">
            Falha ao remover a foto. Tente novamente.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {originalPreview && !processedPreview && (
            <>
              <Btn
                tone="clay"
                onClick={removeBackground}
                disabled={stripping || uploadMut.isPending}
              >
                {stripping ? 'processando…' : 'remover fundo (recomendado) →'}
              </Btn>
              <Btn
                ghost
                onClick={saveDirect}
                disabled={stripping || uploadMut.isPending}
              >
                {uploadMut.isPending ? 'enviando…' : 'subir como está'}
              </Btn>
            </>
          )}
          {processedPreview && (
            <>
              <Btn
                tone="clay"
                onClick={save}
                disabled={uploadMut.isPending}
              >
                {uploadMut.isPending ? 'salvando…' : 'salvar foto'}
              </Btn>
              <Btn ghost onClick={removeBackground} disabled={stripping}>
                tentar de novo
              </Btn>
            </>
          )}
          {originalPreview && (
            <Btn ghost onClick={resetLocal} disabled={stripping || uploadMut.isPending}>
              descartar
            </Btn>
          )}
          {currentUrl && !originalPreview && (
            <Btn ghost onClick={remove} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'removendo…' : 'remover foto atual'}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
