import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, Image as ImageIcon, Check } from 'lucide-react';
import { TraitAnnotation, TraitDefinition } from '../types/taxonomy';
import { formatTraitNumber } from '../utils/matrixEngine';
import {
  compressImageFileToDataUrl,
  getDefaultPlaceholderDescription,
} from '../utils/traitAnnotationStore';
import { getAnatomicalSectionLabel, useLanguage } from '../utils/i18n';

interface TraitInspectorModalProps {
  trait: TraitDefinition;
  annotation?: TraitAnnotation;
  onSaveAnnotation: (traitCode: string, next: TraitAnnotation) => void;
  onClose: () => void;
}

export const TraitInspectorModal: React.FC<TraitInspectorModalProps> = ({
  trait,
  annotation,
  onSaveAnnotation,
  onClose,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const [description, setDescription] = useState<string>(
    annotation?.description || ''
  );
  const [comment, setComment] = useState<string>(annotation?.comment || '');
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    annotation?.imageUrl
  );
  const [externalUrlInput, setExternalUrlInput] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync changes immediately so user never loses edits even if closing quickly
  const commitChanges = (
    nextDesc: string,
    nextComment: string,
    nextImage: string | undefined
  ) => {
    onSaveAnnotation(trait.code, {
      traitCode: trait.code,
      description: nextDesc,
      comment: nextComment,
      imageUrl: nextImage,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1200);
  };

  // Support Ctrl+V paste of image from clipboard anywhere while modal is open
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const dataUrl = await compressImageFileToDataUrl(blob);
            setImageUrl(dataUrl);
            commitChanges(description, comment, dataUrl);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [description, comment, trait.code]);

  const handleFileSelect = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await compressImageFileToDataUrl(file);
    setImageUrl(dataUrl);
    commitChanges(description, comment, dataUrl);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    await handleFileSelect(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <div className="flex items-baseline gap-3">
              <h2 className="font-mono text-xl font-bold text-slate-900">
                {trait.code}
              </h2>
              <span className="text-xs text-slate-500">
                {getAnatomicalSectionLabel(trait.section, lang)} ·{' '}
                {trait.kind === 'qualitative'
                  ? isEn
                    ? `Qualitative (states: ${trait.discreteStates.join(', ')})`
                    : `Качественный (состояния: ${trait.discreteStates.join(', ')})`
                  : trait.kind === 'meristic'
                  ? isEn
                    ? `Quantitative Meristic (range ${formatTraitNumber(
                        trait.globalMin,
                        0
                      )}–${formatTraitNumber(trait.globalMax, 0)})`
                    : `Количественный счётный (табл. ${formatTraitNumber(
                        trait.globalMin,
                        0
                      )}–${formatTraitNumber(trait.globalMax, 0)})`
                  : isEn
                  ? `Morphometric Index (range ${formatTraitNumber(
                      trait.globalMin,
                      2
                    )}–${formatTraitNumber(trait.globalMax, 2)})`
                  : `Морфометрический индекс (табл. ${formatTraitNumber(
                      trait.globalMin,
                      2
                    )}–${formatTraitNumber(trait.globalMax, 2)})`}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isEn
                ? 'Trait card: full morphological description, illustration (one diagram for all states), and methodological comment.'
                : 'Карточка признака: расшифровка названия, иллюстрация (одна на все состояния) и методический комментарий.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savedNotice && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" /> {isEn ? 'Saved' : 'Сохранено'}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              aria-label={isEn ? 'Close' : 'Закрыть'}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Human-language placeholder / decoding */}
          <div>
            <label className="block text-xs font-semibold text-slate-800">
              {isEn ? (
                <>
                  Trait description in plain language (displayed above code{' '}
                  <span className="font-mono">{trait.code}</span> in the key):
                </>
              ) : (
                <>
                  Расшифровка признака на нормальном языке (отображается над кодом{' '}
                  <span className="font-mono">{trait.code}</span> в определителе):
                </>
              )}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                commitChanges(e.target.value, comment, imageUrl);
              }}
              placeholder={getDefaultPlaceholderDescription(trait.code, lang)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
            />
          </div>

          {/* 2. Single Image for all states of the trait */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800">
                {isEn
                  ? 'Trait illustration (single diagram / photo for all states of the trait):'
                  : 'Иллюстрация признака (одна схема / фото на все состояния признака):'}
              </label>
              {imageUrl && (
                <button
                  onClick={() => {
                    setImageUrl(undefined);
                    commitChanges(description, comment, undefined);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />{' '}
                  {isEn ? 'Remove image' : 'Удалить картинку'}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
              className="hidden"
            />

            {imageUrl ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex justify-center bg-white rounded-lg border border-slate-100 p-2">
                  <img
                    src={imageUrl}
                    alt={`${isEn ? 'Trait illustration' : 'Иллюстрация признака'} ${trait.code}`}
                    referrerPolicy="no-referrer"
                    className="max-h-[380px] w-auto object-contain rounded"
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {isEn ? (
                      <>
                        You can replace the image by choosing another file or pressing{' '}
                        <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">
                          Ctrl+V
                        </kbd>
                      </>
                    ) : (
                      <>
                        Вы можете заменить картинку, выбрав другой файл или нажав{' '}
                        <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">
                          Ctrl+V
                        </kbd>
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {isEn ? 'Replace file' : 'Заменить файл'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-sky-600 bg-sky-50/70'
                    : 'border-slate-300 bg-slate-50/60 hover:border-sky-500 hover:bg-slate-50'
                }`}
              >
                <ImageIcon className="h-8 w-8 text-slate-400" />
                <div className="mt-2 text-xs font-semibold text-slate-800">
                  {isEn ? (
                    <>
                      Click to choose a file, drag &amp; drop an image here, or press{' '}
                      <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-900">
                        Ctrl+V
                      </kbd>
                    </>
                  ) : (
                    <>
                      Щёлкните, чтобы выбрать файл, перетащите картинку сюда или нажмите{' '}
                      <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-900">
                        Ctrl+V
                      </kbd>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {isEn
                    ? 'Paste figure screenshots directly from clipboard (PNG, JPG, WebP)'
                    : 'Удобно вставлять скриншоты рисунков прямо из буфера обмена (PNG, JPG, WebP)'}
                </p>
              </div>
            )}

            {/* Optional URL input */}
            {!imageUrl && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="url"
                  value={externalUrlInput}
                  onChange={(e) => setExternalUrlInput(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Or paste a direct image URL...'
                      : 'Или вставьте прямую ссылку (URL) на изображение...'
                  }
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-sky-600 focus:outline-none"
                />
                {externalUrlInput.trim() && (
                  <button
                    onClick={() => {
                      const trimmed = externalUrlInput.trim();
                      setImageUrl(trimmed);
                      commitChanges(description, comment, trimmed);
                      setExternalUrlInput('');
                    }}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 whitespace-nowrap shrink-0"
                  >
                    {isEn ? 'Attach URL' : 'Прикрепить URL'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. Comment / Methodological Notes under the trait */}
          <div>
            <label className="block text-xs font-semibold text-slate-800">
              {isEn
                ? 'Comment / notes on the trait and its states:'
                : 'Комментарий / пояснение к признаку и его состояниям:'}
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                commitChanges(description, e.target.value, imageUrl);
              }}
              placeholder={
                isEn
                  ? 'E.g.: How this trait is counted, what states 0, 1, 2 mean, or which segment to inspect...'
                  : 'Например: Как именно считается этот признак, что означают состояния 0, 1, 2 или на каком сегменте смотреть шипики...'
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <span className="text-[11px] text-slate-500">
            {isEn
              ? 'All edits are automatically saved in the browser (and can be exported to JSON).'
              : 'Все изменения автоматически сохраняются в браузере (и доступны для экспорта в JSON).'}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
          >
            {isEn ? 'Done' : 'Готово'}
          </button>
        </div>
      </div>
    </div>
  );
};
