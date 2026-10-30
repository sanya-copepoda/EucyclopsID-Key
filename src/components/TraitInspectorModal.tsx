import React, { useState } from 'react';
import { X, BookOpen, ExternalLink, ZoomIn } from 'lucide-react';
import { TraitAnnotation, TraitDefinition } from '../types/taxonomy';
import { formatTraitNumber } from '../utils/matrixEngine';
import {
  BUILTIN_TRAIT_ANNOTATIONS_EN,
  BUILTIN_TRAIT_ANNOTATIONS_RU,
  formatQualitativeStateLabel,
  getTraitDisplayComment,
  getTraitDisplayDescription,
} from '../utils/traitAnnotationStore';
import { getAnatomicalSectionLabel, useLanguage } from '../utils/i18n';

interface TraitInspectorModalProps {
  trait: TraitDefinition;
  annotation?: TraitAnnotation;
  onSaveAnnotation?: (traitCode: string, next: TraitAnnotation) => void;
  onOpenBatchMediaModal?: () => void;
  onClose: () => void;
}

export const TraitInspectorModal: React.FC<TraitInspectorModalProps> = ({
  trait,
  annotation,
  onClose,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [isZoomed, setIsZoomed] = useState(false);

  const builtinEn = BUILTIN_TRAIT_ANNOTATIONS_EN[trait.code];
  const builtinRu = BUILTIN_TRAIT_ANNOTATIONS_RU[trait.code];
  const builtin = isEn ? builtinEn : builtinRu || builtinEn;

  const displayDescription = getTraitDisplayDescription(trait.code, annotation, lang);
  const displayComment = getTraitDisplayComment(trait.code, annotation, lang);
  const rawImageUrl = annotation?.imageUrl || builtin?.imageUrl;
  const imageUrl = (() => {
    if (!rawImageUrl) return undefined;
    if (
      rawImageUrl.startsWith('data:') ||
      rawImageUrl.startsWith('http://') ||
      rawImageUrl.startsWith('https://') ||
      rawImageUrl.startsWith('blob:')
    ) {
      return rawImageUrl;
    }
    const cleanRel = rawImageUrl.replace(/^\/+/, '');
    return `${import.meta.env.BASE_URL}${cleanRel}`;
  })();

  const rawSource = (() => {
    const customSrc = (annotation?.imageSource || '').trim();
    if (
      customSrc &&
      customSrc !== (builtinEn?.imageSource || '').trim() &&
      customSrc !== (builtinRu?.imageSource || '').trim()
    ) {
      return customSrc;
    }
    return (builtin?.imageSource || customSrc || '').trim();
  })();

  const rawSourceUrl = (annotation?.imageSourceUrl || builtin?.imageSourceUrl || '').trim();

  const sourceEntries = (() => {
    if (!rawSource) return [];
    const parts = rawSource.split(/\s*\|\s*/).filter(Boolean);
    const urlParts = rawSourceUrl ? rawSourceUrl.split(/\s*\|\s*/) : [];
    return parts.map((text, idx) => {
      const rawHref = (urlParts[idx] !== undefined ? urlParts[idx] : urlParts[0] || '').trim();
      let href: string | undefined;
      if (rawHref && parts.length === 1) {
        href = rawHref.startsWith('http://') || rawHref.startsWith('https://')
          ? rawHref
          : rawHref.startsWith('10.')
          ? `https://doi.org/${rawHref}`
          : `https://${rawHref}`;
      } else if (rawHref && urlParts[idx]?.trim()) {
        const u = urlParts[idx].trim();
        href = u.startsWith('http://') || u.startsWith('https://')
          ? u
          : u.startsWith('10.')
          ? `https://doi.org/${u}`
          : `https://${u}`;
      }
      return { text, href };
    });
  })();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-mono text-xl font-bold text-slate-900">
                {trait.code}
              </h2>
              <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-700">
                {getAnatomicalSectionLabel(trait.section, lang)}
              </span>
              <span className="text-xs text-slate-500">
                {trait.kind === 'qualitative'
                  ? isEn
                    ? 'Qualitative trait'
                    : 'Качественный признак'
                  : trait.kind === 'meristic'
                  ? isEn
                    ? 'Quantitative (meristic) trait'
                    : 'Количественный (счётный) признак'
                  : isEn
                  ? 'Morphometric index'
                  : 'Морфометрический индекс'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label={isEn ? 'Close' : 'Закрыть'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Morphological Description */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isEn ? 'Morphological Description' : 'Морфологическое описание признака'}
            </div>
            <div className="mt-1.5 text-base font-bold text-slate-900 leading-snug">
              {displayDescription}
            </div>
            {displayComment && (
              <div className="mt-2 border-t border-slate-200/80 pt-2 text-xs text-slate-700">
                <span className="font-semibold text-slate-800">
                  {isEn ? 'Note: ' : 'Примечание: '}
                </span>
                {displayComment}
              </div>
            )}
          </div>

          {/* 2. Character States or Quantitative Range */}
          {trait.kind === 'qualitative' ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                {isEn ? 'Character States in the Key' : 'Состояния признака в определителе'}
              </div>
              <div className="flex flex-wrap gap-2">
                {trait.discreteStates.map((stVal) => (
                  <span
                    key={stVal}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-semibold text-slate-800"
                  >
                    {formatQualitativeStateLabel(trait.code, stVal, lang)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {isEn
                    ? 'Empirical Range Across All Species'
                    : 'Размах значений в базе препаратов'}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {isEn
                    ? 'For paired structures, enter the mean between right and left sides of one specimen.'
                    : 'Для парных структур вводится среднее значение между правой и левой стороной тела одной особи.'}
                </div>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 font-mono text-sm font-bold text-sky-950 tabular-nums">
                {formatTraitNumber(trait.globalMin, trait.decimals)} –{' '}
                {formatTraitNumber(trait.globalMax, trait.decimals)}
              </div>
            </div>
          )}

          {/* 3. Trait Illustration & Literature Citation (shown ONLY if an image exists) */}
          {imageUrl && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isEn ? 'Reference Illustration' : 'Иллюстрация признака'}
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div
                  onClick={() => setIsZoomed(true)}
                  className="group relative flex cursor-zoom-in justify-center rounded-lg border border-slate-100 bg-white p-2"
                >
                  <img
                    src={imageUrl}
                    alt={`${displayDescription} (${trait.code})`}
                    referrerPolicy="no-referrer"
                    className="max-h-[420px] w-auto object-contain rounded transition-transform group-hover:scale-[1.01]"
                  />
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-slate-900/75 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ZoomIn className="h-3 w-3" />
                    {isEn ? 'Enlarge' : 'Увеличить'}
                  </span>
                </div>

                {sourceEntries.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 rounded-lg border border-sky-200/80 bg-sky-50/70 px-3 py-2 text-xs text-slate-800">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                      <BookOpen className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                      <span>
                        {sourceEntries.length > 1
                          ? isEn
                            ? 'Sources:'
                            : 'Источники рисунка:'
                          : isEn
                          ? 'Source:'
                          : 'Источник рисунка:'}
                      </span>
                    </div>
                    <div className="space-y-1.5 pl-5">
                      {sourceEntries.map((entry, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-baseline justify-between gap-2"
                        >
                          <span className="italic text-slate-900 leading-snug">
                            {entry.text}
                          </span>
                          {entry.href && (
                            <a
                              href={entry.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline shrink-0"
                            >
                              <span>{isEn ? 'Open paper' : 'Открыть статью'}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isEn ? 'Close' : 'Закрыть'}
          </button>
        </div>
      </div>

      {/* Lightbox for Trait Illustration */}
      {isZoomed && imageUrl && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-slate-950/90 p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] max-w-5xl flex-col items-center rounded-xl bg-white p-4 shadow-2xl"
          >
            <div className="mb-2 flex w-full items-center justify-between gap-4 border-b border-slate-200 pb-2">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {trait.code} — {displayDescription}
                </div>
                {sourceEntries.length > 0 && (
                  <div className="text-xs italic text-slate-500">
                    {sourceEntries.map((s) => s.text).join(' • ')}
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsZoomed(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={imageUrl}
              alt={displayDescription}
              className="max-h-[78vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

