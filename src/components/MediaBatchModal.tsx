import React, { useRef, useState } from 'react';
import {
  X,
  FolderUp,
  Image as ImageIcon,
  Camera,
  Check,
  Download,
  Upload,
  BookOpen,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  MediaBundle,
  SpeciesMedia,
  SpeciesProfile,
  TraitAnnotation,
  TraitDefinition,
} from '../types/taxonomy';
import {
  matchSpeciesAndSexFromFilename,
  matchTraitsFromFilename,
} from '../data/speciesMetadata';
import {
  BUILTIN_TRAIT_ANNOTATIONS_EN,
  compressImageFileToDataUrl,
  estimateDataUrlByteSize,
  formatByteSize,
  getTraitDisplayDescription,
} from '../utils/traitAnnotationStore';
import { useLanguage } from '../utils/i18n';

interface MediaBatchModalProps {
  speciesList: SpeciesProfile[];
  traits: TraitDefinition[];
  traitAnnotations: Record<string, TraitAnnotation>;
  speciesMediaMap: Record<string, SpeciesMedia>;
  onUpdateTraitAnnotationsBatch: (nextMap: Record<string, TraitAnnotation>) => void;
  onUpdateSpeciesMediaBatch: (nextMap: Record<string, SpeciesMedia>) => void;
  onExportMediaBundle: () => void;
  onImportMediaBundleFile: (file: File) => void;
  onClose: () => void;
}

interface PendingSpeciesPhotoItem {
  id: string;
  fileName: string;
  originalBytes: number;
  compressedBytes: number;
  dataUrl: string;
  matchedSp: string;
  sex: 'female' | 'male';
  caption: string;
}

interface PendingTraitDrawingItem {
  id: string;
  fileName: string;
  originalBytes: number;
  compressedBytes: number;
  dataUrl: string;
  matchedTraitCodes: string[];
  imageSource: string;
  imageSourceUrl: string;
}

export const MediaBatchModal: React.FC<MediaBatchModalProps> = ({
  speciesList,
  traits,
  traitAnnotations,
  speciesMediaMap,
  onUpdateTraitAnnotationsBatch,
  onUpdateSpeciesMediaBatch,
  onExportMediaBundle,
  onImportMediaBundleFile,
  onClose,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const [activeTab, setActiveTab] = useState<'species_photos' | 'trait_drawings'>('trait_drawings');
  const [maxDimension, setMaxDimension] = useState<number>(1600);
  const [webpQuality, setWebpQuality] = useState<number>(0.85);

  // Batch default citation inputs
  const [defaultPhotoSource, setDefaultPhotoSource] = useState<string>('');
  const [defaultTraitSource, setDefaultTraitSource] = useState<string>('');
  const [defaultTraitSourceUrl, setDefaultTraitSourceUrl] = useState<string>('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressCurrent, setProgressCurrent] = useState<number>(0);
  const [progressTotal, setProgressTotal] = useState<number>(0);

  // Staged items
  const [stagedSpeciesPhotos, setStagedSpeciesPhotos] = useState<PendingSpeciesPhotoItem[]>([]);
  const [stagedTraitDrawings, setStagedTraitDrawings] = useState<PendingTraitDrawingItem[]>([]);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const speciesFolderInputRef = useRef<HTMLInputElement | null>(null);
  const speciesFilesInputRef = useRef<HTMLInputElement | null>(null);
  const traitsFolderInputRef = useRef<HTMLInputElement | null>(null);
  const traitsFilesInputRef = useRef<HTMLInputElement | null>(null);
  const bundleImportInputRef = useRef<HTMLInputElement | null>(null);

  const namedSpecies = speciesList.filter((s) => s.sp !== '?');
  const allSpeciesNames = namedSpecies.map((s) => s.sp);
  const allTraitCodes = traits.map((t) => t.code);

  // Process a list of files for Species Photos sequentially (memory-safe for 30MB+ files)
  const handleProcessSpeciesFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const imageFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(f.name)
    );
    if (imageFiles.length === 0) return;

    setIsProcessing(true);
    setProgressCurrent(0);
    setProgressTotal(imageFiles.length);

    const results: PendingSpeciesPhotoItem[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      setProgressCurrent(i + 1);
      try {
        const dataUrl = await compressImageFileToDataUrl(file, maxDimension, webpQuality);
        const compressedBytes = estimateDataUrlByteSize(dataUrl);
        const { sp, sex } = matchSpeciesAndSexFromFilename(file.name, allSpeciesNames);
        results.push({
          id: `${file.name}-${i}-${Date.now()}`,
          fileName: file.name,
          originalBytes: file.size,
          compressedBytes,
          dataUrl,
          matchedSp: sp || namedSpecies[0]?.sp || '',
          sex,
          caption: '',
        });
      } catch {
        // skip unreadable file
      }
    }

    setStagedSpeciesPhotos((prev) => [...prev, ...results]);
    setIsProcessing(false);
  };

  // Process a list of files for Trait Drawings sequentially
  const handleProcessTraitFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const imageFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif|svg)$/i.test(f.name)
    );
    if (imageFiles.length === 0) return;

    setIsProcessing(true);
    setProgressCurrent(0);
    setProgressTotal(imageFiles.length);

    const results: PendingTraitDrawingItem[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      setProgressCurrent(i + 1);
      try {
        const dataUrl = await compressImageFileToDataUrl(file, maxDimension, webpQuality);
        const compressedBytes = estimateDataUrlByteSize(dataUrl);
        const matchedCodes = matchTraitsFromFilename(file.name, allTraitCodes);
        const finalCodes = matchedCodes.length > 0 ? matchedCodes : [allTraitCodes[0]];
        const primaryCode = finalCodes[0];
        const builtinAnn = BUILTIN_TRAIT_ANNOTATIONS_EN[primaryCode];
        const existingAnn = traitAnnotations[primaryCode];
        results.push({
          id: `${file.name}-${i}-${Date.now()}`,
          fileName: file.name,
          originalBytes: file.size,
          compressedBytes,
          dataUrl,
          matchedTraitCodes: finalCodes,
          imageSource:
            defaultTraitSource ||
            existingAnn?.imageSource ||
            builtinAnn?.imageSource ||
            '',
          imageSourceUrl:
            defaultTraitSourceUrl ||
            existingAnn?.imageSourceUrl ||
            builtinAnn?.imageSourceUrl ||
            '',
        });
      } catch {
        // skip unreadable file
      }
    }

    setStagedTraitDrawings((prev) => [...prev, ...results]);
    setIsProcessing(false);
  };

  const handleApplyStagedSpeciesPhotos = async () => {
    if (stagedSpeciesPhotos.length === 0) return;
    const nextMap: Record<string, SpeciesMedia> = { ...speciesMediaMap };
    const repoFilesToWrite: Array<{ relPath: string; dataUrl: string }> = [];

    for (const item of stagedSpeciesPhotos) {
      if (!item.matchedSp) continue;
      const existing: SpeciesMedia = nextMap[item.matchedSp] || { sp: item.matchedSp };
      const cleanSp = item.matchedSp
        .replace(/^E\.\s*/i, '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '_');
      const sexSuffix = item.sex === 'female' ? 'F' : 'M';
      const relPath = `assets/species/${cleanSp}_${sexSuffix}.webp`;
      repoFilesToWrite.push({ relPath, dataUrl: item.dataUrl });

      const updated: SpeciesMedia = {
        ...existing,
        sp: item.matchedSp,
        photoSource: defaultPhotoSource.trim() || existing.photoSource,
      };
      if (item.sex === 'female') {
        updated.femaleImageUrl = item.dataUrl;
        if (item.caption.trim()) updated.femaleCaption = item.caption.trim();
      } else {
        updated.maleImageUrl = item.dataUrl;
        if (item.caption.trim()) updated.maleCaption = item.caption.trim();
      }
      nextMap[item.matchedSp] = updated;
    }

    let savedToRepo = false;
    try {
      const repoMap: Record<string, SpeciesMedia> = { ...nextMap };
      for (const item of stagedSpeciesPhotos) {
        if (!item.matchedSp) continue;
        const cleanSp = item.matchedSp
          .replace(/^E\.\s*/i, '')
          .trim()
          .replace(/[^a-zA-Z0-9_-]+/g, '_');
        const sexSuffix = item.sex === 'female' ? 'F' : 'M';
        const relPath = `assets/species/${cleanSp}_${sexSuffix}.webp`;
        if (item.sex === 'female') {
          repoMap[item.matchedSp] = { ...repoMap[item.matchedSp], femaleImageUrl: relPath };
        } else {
          repoMap[item.matchedSp] = { ...repoMap[item.matchedSp], maleImageUrl: relPath };
        }
      }
      const res = await fetch('/api/save-repo-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: repoFilesToWrite,
          mediaBundle: {
            version: 1,
            updatedAt: new Date().toISOString(),
            traitAnnotations,
            speciesMedia: repoMap,
          },
        }),
      });
      if (res.ok) {
        savedToRepo = true;
        for (const [spKey, val] of Object.entries(repoMap)) {
          nextMap[spKey] = val;
        }
      }
    } catch {
      // Fallback to localStorage dataUrls if static environment
    }

    onUpdateSpeciesMediaBatch(nextMap);
    setAppliedBanner(
      savedToRepo
        ? isEn
          ? `Saved ${stagedSpeciesPhotos.length} compressed species photo(s) directly to the repository (public/assets/species/ & media_bundle.json)!`
          : `Все ${stagedSpeciesPhotos.length} сжатых фото видов напрямую записаны в репозиторий (public/assets/species/ и public/assets/media_bundle.json)!`
        : isEn
        ? `Saved ${stagedSpeciesPhotos.length} compressed species photo(s) to database! Download media_bundle.json for GitHub.`
        : `В карточки видов сохранено ${stagedSpeciesPhotos.length} сжатых фото! Скачайте файл media_bundle.json внизу окна.`
    );
    setStagedSpeciesPhotos([]);
  };

  const handleApplyStagedTraitDrawings = async () => {
    if (stagedTraitDrawings.length === 0) return;
    const nextAnnotations: Record<string, TraitAnnotation> = { ...traitAnnotations };
    const repoFilesToWrite: Array<{ relPath: string; dataUrl: string }> = [];
    const fileRelPathByItemId: Record<string, string> = {};
    let countAssigned = 0;

    for (const item of stagedTraitDrawings) {
      const cleanBase = item.fileName
        .replace(/\.[^.]+$/, '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '_');
      const relPath = `assets/traits/${cleanBase}.webp`;
      repoFilesToWrite.push({ relPath, dataUrl: item.dataUrl });
      fileRelPathByItemId[item.id] = relPath;

      const src = item.imageSource.trim() || defaultTraitSource.trim() || undefined;
      const srcUrl = item.imageSourceUrl.trim() || defaultTraitSourceUrl.trim() || undefined;
      for (const code of item.matchedTraitCodes) {
        if (!code) continue;
        const builtinAnn = BUILTIN_TRAIT_ANNOTATIONS_EN[code];
        const existing = nextAnnotations[code] || {
          traitCode: code,
          description: builtinAnn?.description || '',
          comment: builtinAnn?.comment || '',
        };
        nextAnnotations[code] = {
          ...existing,
          traitCode: code,
          imageUrl: item.dataUrl,
          imageSource: src || existing.imageSource || builtinAnn?.imageSource,
          imageSourceUrl: srcUrl || existing.imageSourceUrl || builtinAnn?.imageSourceUrl,
        };
        countAssigned++;
      }
    }

    let savedToRepo = false;
    try {
      const repoAnnotations: Record<string, TraitAnnotation> = { ...nextAnnotations };
      for (const item of stagedTraitDrawings) {
        const relPath = fileRelPathByItemId[item.id];
        for (const code of item.matchedTraitCodes) {
          if (!code || !repoAnnotations[code]) continue;
          repoAnnotations[code] = {
            ...repoAnnotations[code],
            imageUrl: relPath,
          };
        }
      }
      const res = await fetch('/api/save-repo-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: repoFilesToWrite,
          mediaBundle: {
            version: 1,
            updatedAt: new Date().toISOString(),
            traitAnnotations: repoAnnotations,
            speciesMedia: speciesMediaMap,
          },
        }),
      });
      if (res.ok) {
        savedToRepo = true;
        for (const [code, ann] of Object.entries(repoAnnotations)) {
          nextAnnotations[code] = ann;
        }
      }
    } catch {
      // Fallback to localStorage dataUrl if static environment
    }

    onUpdateTraitAnnotationsBatch(nextAnnotations);
    setAppliedBanner(
      savedToRepo
        ? isEn
          ? `Saved ${stagedTraitDrawings.length} compressed files (${countAssigned} traits) with citations directly into the repository (public/assets/traits/ & public/assets/media_bundle.json)!`
          : `Все ${stagedTraitDrawings.length} сжатых рисунков (привязано ${countAssigned} признаков со ссылками на статьи и DOI) напрямую сохранены в репозиторий (public/assets/traits/ и public/assets/media_bundle.json)!`
        : isEn
        ? `Attached illustrations to ${countAssigned} trait(s)! Download media_bundle.json below to commit to GitHub.`
        : `Рисунки и ссылки прикреплены к ${countAssigned} признакам! Скачайте media_bundle.json внизу окна для загрузки в GitHub.`
    );
    setStagedTraitDrawings([]);
  };

  const totalSpeciesOrigBytes = stagedSpeciesPhotos.reduce((acc, x) => acc + x.originalBytes, 0);
  const totalSpeciesCompBytes = stagedSpeciesPhotos.reduce((acc, x) => acc + x.compressedBytes, 0);

  const totalTraitOrigBytes = stagedTraitDrawings.reduce((acc, x) => acc + x.originalBytes, 0);
  const totalTraitCompBytes = stagedTraitDrawings.reduce((acc, x) => acc + x.compressedBytes, 0);

  const existingSpeciesPhotosCount = Object.values(speciesMediaMap).reduce(
    (acc, m) => acc + (m.femaleImageUrl ? 1 : 0) + (m.maleImageUrl ? 1 : 0),
    0
  );
  const existingTraitImagesCount = Object.values(traitAnnotations).filter((a) =>
    Boolean(a.imageUrl)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-sky-700" />
              <h2 className="text-lg font-bold text-slate-900">
                {isEn
                  ? 'Batch Folder Upload & Heavy Photo Compressor (30 MB → ~160 KB WebP)'
                  : 'Пакетная загрузка и сжатие папок: Фото видов (♀/♂) и Рисунки признаков'}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {isEn
                ? 'Automatically compresses heavy 30 MB microscope photos by ~99% in the browser, matches filenames to species/traits, attaches article citations, and exports a single lightweight media_bundle.json for GitHub Pages.'
                : 'Автоматически сжимает тяжелые 30 МБ фотографии с микроскопа в ~150 раз прямо в браузере, сопоставляет имена файлов с видами и признаками, добавляет ссылки на статьи и формирует единый лёгкий файл media_bundle.json для GitHub Pages.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switcher + Compression Settings Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('species_photos')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'species_photos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="h-3.5 w-3.5 text-emerald-700" />
              {isEn
                ? `1. Species Photos ♀/♂ (${existingSpeciesPhotosCount} saved)`
                : `1. Фото видов ♀/♂ (в базе: ${existingSpeciesPhotosCount})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trait_drawings')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'trait_drawings'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5 text-sky-700" />
              {isEn
                ? `2. Trait Drawings & Citations (${existingTraitImagesCount}/${traits.length})`
                : `2. Рисунки признаков и ссылки (${existingTraitImagesCount}/${traits.length})`}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 font-medium text-slate-700">
              <span>{isEn ? 'Compression preset:' : 'Режим сжатия:'}</span>
              <select
                value={`${maxDimension}-${webpQuality}`}
                onChange={(e) => {
                  const [dim, qual] = e.target.value.split('-').map(Number);
                  setMaxDimension(dim);
                  setWebpQuality(qual);
                }}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-900 focus:border-sky-600 focus:outline-none"
              >
                <option value="1600-0.85">
                  {isEn
                    ? 'Optimal WebP 1600px (~160 KB per photo) — Recommended'
                    : 'Оптимальный WebP 1600px (~160 КБ на фото) — Рекомендуется'}
                </option>
                <option value="2048-0.88">
                  {isEn
                    ? 'High Detail WebP 2048px (~280 KB per photo)'
                    : 'Высокая детальность WebP 2048px (~280 КБ на фото)'}
                </option>
                <option value="1200-0.8">
                  {isEn
                    ? 'Ultra Compact WebP 1200px (~95 KB per photo)'
                    : 'Максимальное сжатие WebP 1200px (~95 КБ на фото)'}
                </option>
              </select>
            </label>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {appliedBanner && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-950">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>{appliedBanner}</span>
              </div>
              <button
                onClick={() => setAppliedBanner(null)}
                className="text-emerald-800 hover:underline ml-3 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                <span>
                  {isEn
                    ? `Compressing heavy images in browser... (${progressCurrent} of ${progressTotal})`
                    : `Сжатие тяжелых фотографий в браузере... (${progressCurrent} из ${progressTotal})`}
                </span>
                <span className="font-mono">
                  {Math.round((progressCurrent / Math.max(1, progressTotal)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-sky-200">
                <div
                  className="h-full bg-sky-700 transition-all"
                  style={{
                    width: `${(progressCurrent / Math.max(1, progressTotal)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'species_photos' ? (
            <div className="space-y-4">
              {/* Naming convention & Folder upload card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <h3 className="text-sm font-bold text-slate-900">
                      {isEn
                        ? 'Upload a Folder of Species Photos (Female ♀ and Male ♂)'
                        : 'Загрузка папки с фотографиями видов (Самка ♀ и Самец ♂)'}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {isEn ? (
                        <>
                          Name your files with the species epithet and sex, e.g.{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            arcanus_f.jpg
                          </code>{' '}
                          / <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">arcanus_female.tif</code> (for ♀) and{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            arcanus_m.jpg
                          </code>{' '}
                          / <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">arcanus_male.png</code> (for ♂). Even if files are 30 MB each, they will be compressed to ~160 KB on your computer before saving. You can also adjust the species and ♀/♂ in the table below after selecting the folder.
                        </>
                      ) : (
                        <>
                          Назовите файлы по видовому эпитету и полу, например:{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            arcanus_f.jpg
                          </code>{' '}
                          или <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">arcanus_самка.jpg</code> (для ♀) и{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            arcanus_m.jpg
                          </code>{' '}
                          или <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">arcanus_самец.jpg</code> (для ♂). Даже если исходные фото весят по 30 МБ, браузер сожмёт каждое до ~160 КБ за долю секунды. После выбора папки вы сможете проверить и поправить вид или пол в таблице ниже.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={speciesFolderInputRef}
                      type="file"
                      {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                      multiple
                      onChange={(e) => handleProcessSpeciesFiles(e.target.files)}
                      className="hidden"
                    />
                    <input
                      ref={speciesFilesInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleProcessSpeciesFiles(e.target.files)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => speciesFolderInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800 transition-colors cursor-pointer"
                    >
                      <FolderUp className="h-4 w-4" />
                      {isEn ? 'Select Folder with Photos' : 'Выбрать папку с фото видов'}
                    </button>
                    <button
                      type="button"
                      onClick={() => speciesFilesInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Upload className="h-4 w-4 text-slate-600" />
                      {isEn ? 'Select Multiple Files' : 'Выбрать несколько файлов'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                  <BookOpen className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    value={defaultPhotoSource}
                    onChange={(e) => setDefaultPhotoSource(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Optional common photo credit / article reference for this batch (e.g. Photos by A.A. Novikov)...'
                        : 'Общая подпись автора фото или ссылка на статью для загружаемой пачки (напр.: Фото А. А. Новикова)...'
                    }
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Staged Species Photos Review Table */}
              {stagedSpeciesPhotos.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-bold text-slate-900">
                      {isEn
                        ? `Ready to save (${stagedSpeciesPhotos.length} photos): `
                        : `Готово к сохранению (${stagedSpeciesPhotos.length} фото): `}
                      <span className="font-mono text-emerald-800">
                        {formatByteSize(totalSpeciesOrigBytes)} →{' '}
                        {formatByteSize(totalSpeciesCompBytes)} (
                        {totalSpeciesOrigBytes > 0
                          ? `-${(
                              (1 - totalSpeciesCompBytes / totalSpeciesOrigBytes) *
                              100
                            ).toFixed(1)}%`
                          : '0%'}
                        )
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStagedSpeciesPhotos([])}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        {isEn ? 'Clear list' : 'Очистить список'}
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyStagedSpeciesPhotos}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isEn
                          ? `Save All ${stagedSpeciesPhotos.length} Photos to Species Cards`
                          : `Сохранить все ${stagedSpeciesPhotos.length} фото в карточки видов`}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-200">
                    {stagedSpeciesPhotos.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.dataUrl}
                            alt={item.fileName}
                            className="h-12 w-16 rounded border border-slate-200 bg-slate-50 object-contain shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-semibold text-slate-900 truncate max-w-[220px]">
                              {item.fileName}
                            </div>
                            <div className="font-mono text-[11px] text-emerald-700">
                              {formatByteSize(item.originalBytes)} →{' '}
                              {formatByteSize(item.compressedBytes)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={item.matchedSp}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStagedSpeciesPhotos((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, matchedSp: val } : p
                                )
                              );
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold italic text-slate-900 focus:border-sky-600 focus:outline-none"
                          >
                            {namedSpecies.map((s) => (
                              <option key={s.sp} value={s.sp}>
                                {s.sp}
                              </option>
                            ))}
                          </select>

                          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setStagedSpeciesPhotos((prev) =>
                                  prev.map((p, i) =>
                                    i === idx ? { ...p, sex: 'female' } : p
                                  )
                                )
                              }
                              className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                                item.sex === 'female'
                                  ? 'bg-rose-600 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              ♀ {isEn ? 'Female' : 'Самка'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setStagedSpeciesPhotos((prev) =>
                                  prev.map((p, i) =>
                                    i === idx ? { ...p, sex: 'male' } : p
                                  )
                                )
                              }
                              className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                                item.sex === 'male'
                                  ? 'bg-sky-700 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              ♂ {isEn ? 'Male' : 'Самец'}
                            </button>
                          </div>

                          <input
                            type="text"
                            value={item.caption}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStagedSpeciesPhotos((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, caption: val } : p
                                )
                              );
                            }}
                            placeholder={isEn ? 'Slide # / note...' : '№ препарата / прим...'}
                            className="w-36 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-800"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setStagedSpeciesPhotos((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Trait Drawings Folder Upload Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <h3 className="text-sm font-bold text-slate-900">
                      {isEn
                        ? 'Upload a Folder of Trait Drawings + Article Reference'
                        : 'Загрузка папки с рисунками признаков + ссылка на статью'}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {isEn ? (
                        <>
                          Name your files after the trait code, e.g.{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            A1ser.png
                          </code>
                          ,{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            P4IS_dr.jpg
                          </code>
                          ,{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            GS_m_pore.png
                          </code>
                          , or multiple codes if one drawing covers several traits:{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            A2g1-A2g2-A2g3.png
                          </code>
                          . If the drawings come from an article, enter the reference below before or after selecting the folder!
                        </>
                      ) : (
                        <>
                          Назовите файлы по коду признака, например:{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            A1ser.png
                          </code>
                          ,{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            P4IS_dr.jpg
                          </code>
                          ,{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            GS_m_pore.png
                          </code>{' '}
                          (для дробей вроде <code className="font-mono">cr/cs</code> используйте подчёркивание <code className="font-mono">cr_cs.png</code>). Если один рисунок иллюстрирует сразу несколько признаков, перечислите их через дефис:{' '}
                          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 border border-slate-200">
                            A2g1-A2g2-A2g3.png
                          </code>
                          . Ниже можно сразу указать ссылку на статью-источник для всей папки или для каждого рисунка отдельно.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={traitsFolderInputRef}
                      type="file"
                      {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                      multiple
                      onChange={(e) => handleProcessTraitFiles(e.target.files)}
                      className="hidden"
                    />
                    <input
                      ref={traitsFilesInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleProcessTraitFiles(e.target.files)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => traitsFolderInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800 transition-colors cursor-pointer"
                    >
                      <FolderUp className="h-4 w-4" />
                      {isEn ? 'Select Folder of Drawings' : 'Выбрать папку с рисунками'}
                    </button>
                    <button
                      type="button"
                      onClick={() => traitsFilesInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Upload className="h-4 w-4 text-slate-600" />
                      {isEn ? 'Select Multiple Files' : 'Выбрать несколько файлов'}
                    </button>
                  </div>
                </div>

                {/* Common Article Citation Inputs for the Batch */}
                <div className="grid grid-cols-1 gap-3 pt-2 border-t border-slate-200/80 sm:grid-cols-12">
                  <div className="sm:col-span-7 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-sky-700 shrink-0" />
                    <input
                      type="text"
                      value={defaultTraitSource}
                      onChange={(e) => setDefaultTraitSource(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Article reference for uploaded figures (e.g. Alekseev et al., 2006; Novikov et al., 2025)...'
                          : 'Ссылка на статью для загружаемых рисунков (напр.: Alekseev et al., 2006; Novikov et al., 2025)...'
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={defaultTraitSourceUrl}
                      onChange={(e) => setDefaultTraitSourceUrl(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Optional DOI / URL (e.g. https://doi.org/10.11646/...)'
                          : 'DOI или веб-ссылка на статью (необязательно)'
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Staged Trait Drawings Review Table */}
              {stagedTraitDrawings.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-bold text-slate-900">
                      {isEn
                        ? `Ready to attach (${stagedTraitDrawings.length} files): `
                        : `Готово к прикреплению (${stagedTraitDrawings.length} файлов): `}
                      <span className="font-mono text-emerald-800">
                        {formatByteSize(totalTraitOrigBytes)} →{' '}
                        {formatByteSize(totalTraitCompBytes)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStagedTraitDrawings([])}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        {isEn ? 'Clear list' : 'Очистить список'}
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyStagedTraitDrawings}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isEn
                          ? `Attach All Drawings & Citations`
                          : `Прикрепить все рисунки и ссылки к признакам`}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-200">
                    {stagedTraitDrawings.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.dataUrl}
                            alt={item.fileName}
                            className="h-12 w-16 rounded border border-slate-200 bg-slate-50 object-contain shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-semibold text-slate-900 truncate max-w-[200px]">
                              {item.fileName}
                            </div>
                            <div className="font-mono text-[11px] text-emerald-700">
                              {formatByteSize(item.originalBytes)} →{' '}
                              {formatByteSize(item.compressedBytes)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {item.matchedTraitCodes.length > 1 ? (
                            <div
                              title={item.matchedTraitCodes.join(', ')}
                              className="max-w-[260px] truncate rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 font-mono text-xs font-bold text-sky-900"
                            >
                              {item.matchedTraitCodes.join(', ')} ({item.matchedTraitCodes.length})
                            </div>
                          ) : (
                            <select
                              value={item.matchedTraitCodes[0] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStagedTraitDrawings((prev) =>
                                  prev.map((p, i) =>
                                    i === idx ? { ...p, matchedTraitCodes: [val] } : p
                                  )
                                );
                              }}
                              className="max-w-[260px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:border-sky-600 focus:outline-none"
                            >
                              {traits.map((t) => (
                                <option key={t.code} value={t.code}>
                                  {t.code} — {getTraitDisplayDescription(t.code, traitAnnotations, lang)}
                                </option>
                              ))}
                            </select>
                          )}

                          <input
                            type="text"
                            value={item.imageSource}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStagedTraitDrawings((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, imageSource: val } : p
                                )
                              );
                            }}
                            placeholder={
                              defaultTraitSource ||
                              (isEn ? 'Article citation (e.g. Alekseev, 2006)...' : 'Ссылка на статью (напр. Alekseev, 2006)...')
                            }
                            className="w-56 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-800"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setStagedTraitDrawings((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Export / Import Single GitHub Media Bundle */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="max-w-xl text-[11px] text-slate-600 leading-relaxed">
            {isEn ? (
              <>
                <strong>For GitHub Pages deployment:</strong> After compressing and saving your species photos and trait drawings above, click{' '}
                <strong>“Download media_bundle.json”</strong> and place that single file in{' '}
                <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-900">
                  public/assets/media_bundle.json
                </code>{' '}
                in your GitHub repository. All visitors will automatically see all compressed photos, drawings, and article citations!
              </>
            ) : (
              <>
                <strong>Как перенести всё на GitHub Pages одним файлом:</strong> После того как вы сжали и сохранили фото видов и рисунки признаков, нажмите{' '}
                <strong>«Скачать единый файл media_bundle.json»</strong> и положите его в папку{' '}
                <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-900">
                  public/assets/media_bundle.json
                </code>{' '}
                вашего репозитория на GitHub. Сайт автоматически подгрузит все сжатые фото ♀/♂, рисунки и ссылки на статьи!
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={bundleImportInputRef}
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportMediaBundleFile(file);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bundleImportInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-slate-600" />
              {isEn ? 'Import media_bundle.json' : 'Импорт media_bundle.json'}
            </button>
            <button
              type="button"
              onClick={onExportMediaBundle}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-sky-400" />
              {isEn
                ? 'Download media_bundle.json (for GitHub)'
                : 'Скачать единый файл media_bundle.json'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
