import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Mail, FolderUp } from 'lucide-react';
import { DEFAULT_EUCYCLOPS_CSV } from './data/rawCsvData';
import {
  KeyConfig,
  MediaBundle,
  SpeciesCandidateEvaluation,
  SpeciesMedia,
  SpeciesProfile,
  SpecimenRecord,
  TraitAnnotation,
  TraitDefinition,
  UserTraitFilter,
} from './types/taxonomy';
import {
  evaluateSpeciesCandidates,
  exportDatasetToCsv,
  loadExtraSpecimens,
  parseEucyclopsMatrix,
  saveExtraSpecimens,
} from './utils/matrixEngine';
import {
  loadTraitAnnotations,
  saveTraitAnnotations,
} from './utils/traitAnnotationStore';
import {
  loadSpeciesMediaMap,
  saveSpeciesMediaMap,
} from './data/speciesMetadata';
import { translateRegion, useLanguage } from './utils/i18n';
import { PolyclaveKeyWorkspace } from './components/PolyclaveKeyWorkspace';
import { DifferentialMatrixView } from './components/DifferentialMatrixView';
import { AboutKeyView } from './components/AboutKeyView';
import { SpeciesDetailModal } from './components/SpeciesDetailModal';
import { TraitInspectorModal } from './components/TraitInspectorModal';
import { AddSpecimenModal } from './components/AddSpecimenModal';
import { MediaBatchModal } from './components/MediaBatchModal';

type WorkspaceTab = 'key' | 'differential' | 'about';

const DEFAULT_CONFIG: KeyConfig = {
  extrapolationMethod: 'bayesian_pooled',
  sigmaMultiplier: 2.0,
  percentBuffer: 12,
  priorWeight: 3,
  protectStrictZero: true,
  relaxQualitativeForTinyN: true,
  speciesScope: 'all',
  includeUnknownSp: false,
  retainOnMissingData: true,
};

export default function App() {
  const { lang, setLang } = useLanguage();
  const isEn = lang === 'en';

  const [csvText, setCsvText] = useState<string>(DEFAULT_EUCYCLOPS_CSV);
  const [extraSpecimens, setExtraSpecimens] = useState<SpecimenRecord[]>(() =>
    loadExtraSpecimens()
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('key');
  const [config, setConfig] = useState<KeyConfig>(DEFAULT_CONFIG);
  const [activeFilters, setActiveFilters] = useState<Record<string, UserTraitFilter>>({});
  const [loadedSpecimenLabel, setLoadedSpecimenLabel] = useState<string | null>(null);
  const [traitAnnotations, setTraitAnnotations] = useState<Record<string, TraitAnnotation>>(() =>
    loadTraitAnnotations()
  );
  const [speciesMediaMap, setSpeciesMediaMap] = useState<Record<string, SpeciesMedia>>(() =>
    loadSpeciesMediaMap()
  );

  const [selectedSpeciesModal, setSelectedSpeciesModal] = useState<{
    species: SpeciesProfile;
    evaluation?: SpeciesCandidateEvaluation;
  } | null>(null);

  const [inspectedTrait, setInspectedTrait] = useState<TraitDefinition | null>(null);
  const [isAddSpecimenModalOpen, setIsAddSpecimenModalOpen] = useState<boolean>(false);
  const [isBatchMediaModalOpen, setIsBatchMediaModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const annotationsImportRef = useRef<HTMLInputElement | null>(null);

  // Sync with public/assets/aistudio/Eucyclops___________4f462c5a if available
  useEffect(() => {
    const csvUrl = `${import.meta.env.BASE_URL}assets/aistudio/Eucyclops___________4f462c5a`;
    fetch(csvUrl)
      .then((res) => {
        if (res.ok) return res.text();
        throw new Error('Fallback to embedded CSV');
      })
      .then((text) => {
        if (text && text.includes('A2g1')) {
          setCsvText(text);
        }
      })
      .catch(() => {
        // Embedded DEFAULT_EUCYCLOPS_CSV is already loaded synchronously
      });
  }, []);

  // Automatically load public/assets/media_bundle.json (if present in GitHub Pages repo)
  useEffect(() => {
    const bundleUrl = `${import.meta.env.BASE_URL}assets/media_bundle.json`;
    fetch(bundleUrl)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('No external media bundle');
      })
      .then((bundle: MediaBundle) => {
        if (bundle && typeof bundle === 'object') {
          if (bundle.traitAnnotations && Object.keys(bundle.traitAnnotations).length > 0) {
            setTraitAnnotations((prev) => {
              const merged = { ...prev };
              for (const [code, ann] of Object.entries(bundle.traitAnnotations!)) {
                merged[code] = {
                  ...merged[code],
                  ...ann,
                  // Prefer user's local overrides if they edited after bundle
                  imageUrl: merged[code]?.imageUrl || ann.imageUrl,
                  imageSource: merged[code]?.imageSource || ann.imageSource,
                  imageSourceUrl: merged[code]?.imageSourceUrl || ann.imageSourceUrl,
                };
              }
              return merged;
            });
          }
          if (bundle.speciesMedia && Object.keys(bundle.speciesMedia).length > 0) {
            setSpeciesMediaMap((prev) => {
              const merged = { ...prev };
              for (const [sp, media] of Object.entries(bundle.speciesMedia!)) {
                merged[sp] = {
                  ...merged[sp],
                  ...media,
                  femaleImageUrl: merged[sp]?.femaleImageUrl || media.femaleImageUrl,
                  maleImageUrl: merged[sp]?.maleImageUrl || media.maleImageUrl,
                };
              }
              return merged;
            });
          }
        }
      })
      .catch(() => {
        // Ignore if media_bundle.json is empty or not found
      });
  }, []);

  const dataset = useMemo(
    () => parseEucyclopsMatrix(csvText, extraSpecimens),
    [csvText, extraSpecimens]
  );

  const evaluations = useMemo(
    () =>
      evaluateSpeciesCandidates(
        dataset.speciesList,
        dataset.traitMap,
        activeFilters,
        config
      ),
    [dataset.speciesList, dataset.traitMap, activeFilters, config]
  );

  const remainingCandidates = useMemo(() => {
    const strictCands = evaluations.filter((e) => e.isCandidate).map((e) => e.species);
    if (strictCands.length > 0) return strictCands;
    return evaluations.slice(0, 6).map((e) => e.species);
  }, [evaluations]);

  const handleAddSpecimens = (newSpecs: SpecimenRecord[]) => {
    setExtraSpecimens((prev) => {
      const updated = [...prev, ...newSpecs];
      saveExtraSpecimens(updated);
      return updated;
    });
  };

  const handleRemoveExtraSpecimen = (num: number) => {
    setExtraSpecimens((prev) => {
      const updated = prev.filter((s) => s.num !== num);
      saveExtraSpecimens(updated);
      return updated;
    });
  };

  const handleClearAllExtraSpecimens = () => {
    setExtraSpecimens([]);
    saveExtraSpecimens([]);
  };

  const handleExportFullCsv = () => {
    const csvOut = exportDatasetToCsv(dataset);
    const blob = new Blob([csvOut], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Eucyclops_matrix_${dataset.specimens.length}_specimens.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveTraitAnnotation = (traitCode: string, nextAnn: TraitAnnotation) => {
    setTraitAnnotations((prev) => {
      const updated = { ...prev, [traitCode]: nextAnn };
      saveTraitAnnotations(updated);
      return updated;
    });
  };

  const handleUpdateTraitAnnotationsBatch = (nextMap: Record<string, TraitAnnotation>) => {
    setTraitAnnotations(nextMap);
    saveTraitAnnotations(nextMap);
  };

  const handleSaveSpeciesMedia = (sp: string, media: SpeciesMedia) => {
    setSpeciesMediaMap((prev) => {
      const updated = { ...prev, [sp]: media };
      saveSpeciesMediaMap(updated);
      return updated;
    });
  };

  const handleUpdateSpeciesMediaBatch = (nextMap: Record<string, SpeciesMedia>) => {
    setSpeciesMediaMap(nextMap);
    saveSpeciesMediaMap(nextMap);
  };

  const handleExportMediaBundle = () => {
    const bundle: MediaBundle = {
      version: 1,
      updatedAt: new Date().toISOString(),
      traitAnnotations,
      speciesMedia: speciesMediaMap,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'media_bundle.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportMediaBundleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          if ('traitAnnotations' in parsed || 'speciesMedia' in parsed) {
            const bundle = parsed as MediaBundle;
            if (bundle.traitAnnotations) {
              setTraitAnnotations(bundle.traitAnnotations);
              saveTraitAnnotations(bundle.traitAnnotations);
            }
            if (bundle.speciesMedia) {
              setSpeciesMediaMap(bundle.speciesMedia);
              saveSpeciesMediaMap(bundle.speciesMedia);
            }
          } else {
            // Backward compatibility with plain traitAnnotations JSON
            setTraitAnnotations(parsed as Record<string, TraitAnnotation>);
            saveTraitAnnotations(parsed as Record<string, TraitAnnotation>);
          }
        }
      } catch {
        // ignore invalid json
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportAnnotationsJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImportMediaBundleFile(file);
  };

  const handleUpdateFilter = (traitCode: string, filter: UserTraitFilter | null) => {
    setLoadedSpecimenLabel(null);
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (!filter) {
        delete next[traitCode];
      } else {
        next[traitCode] = filter;
      }
      return next;
    });
  };

  const handleResetAllFilters = () => {
    setLoadedSpecimenLabel(null);
    setActiveFilters({});
  };

  const handleLoadSpecimenIntoKey = (
    specimen: SpecimenRecord,
    mode: 'all' | 'diagnostic8'
  ) => {
    const diagnosticCodes = [
      'A1ser',
      'Mx1Bsr',
      'P4IS_dr',
      'P4_CS_osp3',
      'GS_m pore',
      'Proct',
      'cr/cs',
      'xa/x',
    ];
    const nextFilters: Record<string, UserTraitFilter> = {};
    const codesToUse =
      mode === 'diagnostic8'
        ? diagnosticCodes
        : dataset.traits.map((t) => t.code);

    for (const code of codesToUse) {
      const val = specimen.traits[code];
      const tr = dataset.traitMap[code];
      if (val === null || val === undefined || !tr) continue;

      if (tr.kind === 'qualitative') {
        nextFilters[code] = {
          traitCode: code,
          selectedStates: [val],
        };
      } else {
        nextFilters[code] = {
          traitCode: code,
          numericValue: val,
        };
      }
    }

    setActiveFilters(nextFilters);
    const regionLabel = translateRegion(specimen.region, lang);
    setLoadedSpecimenLabel(
      `#${specimen.num} (${specimen.sp}, ${regionLabel}, ${
        mode === 'diagnostic8'
          ? isEn
            ? '8 diagnostic traits'
            : '8 диагностических признаков'
          : isEn
          ? 'all measurements'
          : 'все промеры'
      })`
    );
    setActiveTab('key');
  };

  const handleCustomCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string' && content.includes('sp')) {
        setCsvText(content);
        setExtraSpecimens([]);
        saveExtraSpecimens([]);
        setActiveFilters({});
        setLoadedSpecimenLabel(
          isEn ? `Loaded file: ${file.name}` : `Загружен файл: ${file.name}`
        );
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 1 row, 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-6 border-b border-slate-200 bg-white px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#key"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('key');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          EucyclopsID: Interactive Key
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
          <a
            href="#key"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('key');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-0.5 ${
              activeTab === 'key'
                ? 'text-slate-900 font-semibold border-b-2 border-sky-700'
                : 'hover:text-slate-900'
            }`}
          >
            {isEn ? 'Interactive Key' : 'Определитель'}
          </a>
          <a
            href="#differential"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('differential');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-0.5 ${
              activeTab === 'differential'
                ? 'text-slate-900 font-semibold border-b-2 border-sky-700'
                : 'hover:text-slate-900'
            }`}
          >
            {isEn ? 'Differential Matrix' : 'Дифференциальная матрица'}
          </a>
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('about');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-0.5 ${
              activeTab === 'about'
                ? 'text-slate-900 font-semibold border-b-2 border-sky-700'
                : 'hover:text-slate-900'
            }`}
          >
            {isEn ? 'About & Database' : 'Информация о ключе'}
          </a>
        </nav>

        {/* Zone 3: Language Switcher + Batch Media + CSV Upload */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Language Switcher Pill */}
          <div
            className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs font-bold"
            role="group"
            aria-label="Language switcher"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                isEn
                  ? 'bg-sky-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Switch interface to English"
            >
              <Globe className="h-3 w-3" />
              <span>EN</span>
            </button>
            <button
              type="button"
              onClick={() => setLang('ru')}
              className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                !isEn
                  ? 'bg-sky-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Переключить интерфейс на русский язык"
            >
              <span>RU</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleCustomCsvUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isEn ? 'Upload CSV' : 'Загрузить CSV'}
          </button>
        </div>
      </header>

      {/* Main Content Container (1440px max-w) */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        {/* Geographical Scope & Limitations Notice */}
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-slate-700">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            {isEn ? (
              <>
                <span className="font-semibold text-slate-900">Geographical scope:</span>{' '}
                This key is primarily intended for <em>Eucyclops</em> of{' '}
                <span className="font-medium text-slate-900">Russia and adjacent territories</span>. It is very likely to work reliably in{' '}
                <span className="font-medium text-slate-900">European Russia</span> and{' '}
                <span className="font-medium text-slate-900">most of Siberia</span>. Apply with caution in the{' '}
                <span className="font-medium text-amber-900">Far East</span> (especially the southern Far East),{' '}
                <span className="font-semibold text-rose-700">do not apply in the Caspian Sea</span>, and apply with caution in the{' '}
                <span className="font-medium text-amber-900">Caucasus</span> (especially in samples from subterranean habitats).
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-900">Географический охват:</span>{' '}
                ключ предназначен прежде всего для эуциклопов (<em>Eucyclops</em>){' '}
                <span className="font-medium text-slate-900">России и ближайших территорий</span>. С большой вероятностью он будет работать в{' '}
                <span className="font-medium text-slate-900">европейской части России</span> и{' '}
                <span className="font-medium text-slate-900">большей части Сибири</span>. С осторожностью его надо применять на{' '}
                <span className="font-medium text-amber-900">Дальнем Востоке</span> (особенно на юге Дальнего Востока),{' '}
                <span className="font-semibold text-rose-700">не применять в Каспии</span> и с осторожностью применять на{' '}
                <span className="font-medium text-amber-900">Кавказе</span> (особенно в пробах из подземных биотопов).
              </>
            )}
          </div>
        </div>

        {activeTab === 'key' && (
          <PolyclaveKeyWorkspace
            traits={dataset.traits}
            traitMap={dataset.traitMap}
            traitAnnotations={traitAnnotations}
            speciesMediaMap={speciesMediaMap}
            evaluations={evaluations}
            activeFilters={activeFilters}
            config={config}
            loadedSpecimenLabel={loadedSpecimenLabel}
            totalSpecimensCount={dataset.specimens.length}
            extraSpecimensCount={extraSpecimens.length}
            onUpdateFilter={handleUpdateFilter}
            onResetAllFilters={handleResetAllFilters}
            onChangeConfig={setConfig}
            onSelectSpeciesDetail={(sp, evalItem) =>
              setSelectedSpeciesModal({ species: sp, evaluation: evalItem })
            }
            onOpenTraitInspector={(trait) => setInspectedTrait(trait)}
            onOpenDifferentialCompare={() => setActiveTab('differential')}
            onOpenAddSpecimenModal={() => setIsAddSpecimenModalOpen(true)}
          />
        )}

        {activeTab === 'differential' && (
          <DifferentialMatrixView
            speciesList={dataset.speciesList}
            remainingCandidates={remainingCandidates}
            traits={dataset.traits}
            traitAnnotations={traitAnnotations}
            config={config}
            activeFilters={activeFilters}
            onSelectSpeciesDetail={(sp) => {
              const ev = evaluations.find((e) => e.species.sp === sp.sp);
              setSelectedSpeciesModal({ species: sp, evaluation: ev });
            }}
            onOpenTraitInspector={(trait) => setInspectedTrait(trait)}
          />
        )}

        {activeTab === 'about' && (
          <AboutKeyView
            speciesList={dataset.speciesList}
            specimens={dataset.specimens}
            extraSpecimens={extraSpecimens}
            traits={dataset.traits}
            config={config}
            onChangeConfig={setConfig}
            onSelectSpeciesDetail={(sp) => {
              const ev = evaluations.find((e) => e.species.sp === sp.sp);
              setSelectedSpeciesModal({ species: sp, evaluation: ev });
            }}
            onLoadSpecimenIntoKey={handleLoadSpecimenIntoKey}
            onOpenAddSpecimenModal={() => setIsAddSpecimenModalOpen(true)}
            onRemoveExtraSpecimen={handleRemoveExtraSpecimen}
            onExportFullCsv={handleExportFullCsv}
          />
        )}
      </main>

      {/* Quiet Footer with JSON/CSV export, Contact email & credit */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {isEn ? (
                <>
                  Interactive Key to the Genus <em>Eucyclops</em> (Slide database of Aleksandr A. Novikov, Kazan Federal University) ·{' '}
                  {dataset.specimens.length} specimens ·{' '}
                  {dataset.speciesList.filter((s) => s.sp !== '?').length} species ·{' '}
                  {dataset.traits.length} traits
                </>
              ) : (
                <>
                  Интерактивный определитель рода <em>Eucyclops</em> (база препаратов А. А. Новикова, КФУ) ·{' '}
                  {dataset.specimens.length} особей ·{' '}
                  {dataset.speciesList.filter((s) => s.sp !== '?').length} видов ·{' '}
                  {dataset.traits.length} признаков
                </>
              )}
            </span>
            <span>·</span>
            <a
              href="mailto:aleksandr-novikov-2011@list.ru"
              className="inline-flex items-center gap-1 font-medium text-sky-800 hover:underline"
            >
              <Mail className="h-3 w-3" />
              aleksandr-novikov-2011@list.ru
            </a>
            <span>·</span>
            <span>
              {isEn ? 'All data are distributed under ' : 'Все данные распространяются как '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-700 hover:text-sky-800 hover:underline"
              >
                CC BY 4.0
              </a>
            </span>
            <span>·</span>
            <span>
              {isEn
                ? 'Last database update: September 10, 2026'
                : 'Последнее обновление базы: 10 сентября 2026 г.'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <input
              ref={annotationsImportRef}
              type="file"
              accept=".json"
              onChange={handleImportAnnotationsJson}
              className="hidden"
            />
            <button
              onClick={() => setIsAddSpecimenModalOpen(true)}
              className="hover:text-slate-900 underline font-medium text-sky-800 cursor-pointer"
            >
              {isEn ? '+ Add Specimens' : '+ Добавить особей'}
            </button>
            <span>·</span>
            <button
              onClick={handleExportFullCsv}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              {isEn
                ? `Download CSV (${dataset.specimens.length} spec.)`
                : `Скачать CSV (${dataset.specimens.length} экз.)`}
            </button>
            <span>·</span>
            <button
              onClick={() => setIsBatchMediaModalOpen(true)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
              title={
                isEn
                  ? 'Author tool: batch compress species photos & trait figures and export media_bundle.json'
                  : 'Инструмент автора базы: пакетное сжатие фото видов и рисунков признаков, экспорт media_bundle.json'
              }
            >
              {isEn ? '⚙ Author media tool' : '⚙ Медиа-база (для автора)'}
            </button>
          </div>
        </div>
      </footer>

      {/* Species & Specimens Detail Modal */}
      {selectedSpeciesModal && (
        <SpeciesDetailModal
          species={selectedSpeciesModal.species}
          allSpecies={dataset.speciesList}
          evaluation={selectedSpeciesModal.evaluation}
          traits={dataset.traits}
          traitAnnotations={traitAnnotations}
          speciesMedia={speciesMediaMap[selectedSpeciesModal.species.sp]}
          config={config}
          activeFilters={activeFilters}
          onSaveSpeciesMedia={handleSaveSpeciesMedia}
          onOpenBatchMediaModal={() => setIsBatchMediaModalOpen(true)}
          onClose={() => setSelectedSpeciesModal(null)}
          onOpenTraitInspector={(trait) => setInspectedTrait(trait)}
          onLoadSpecimenIntoKey={handleLoadSpecimenIntoKey}
        />
      )}

      {/* Trait Inspector Modal (Image, Article Citation, Description, and Comment) */}
      {inspectedTrait && (
        <TraitInspectorModal
          trait={inspectedTrait}
          annotation={traitAnnotations[inspectedTrait.code]}
          onSaveAnnotation={handleSaveTraitAnnotation}
          onOpenBatchMediaModal={() => setIsBatchMediaModalOpen(true)}
          onClose={() => setInspectedTrait(null)}
        />
      )}

      {/* Dynamic Add Specimen / Paste from Excel Modal */}
      {isAddSpecimenModalOpen && (
        <AddSpecimenModal
          speciesList={dataset.speciesList}
          specimens={dataset.specimens}
          extraSpecimens={extraSpecimens}
          traits={dataset.traits}
          activeFilters={activeFilters}
          onAddSpecimens={handleAddSpecimens}
          onRemoveExtraSpecimen={handleRemoveExtraSpecimen}
          onClearAllExtraSpecimens={handleClearAllExtraSpecimens}
          onExportFullCsv={handleExportFullCsv}
          onClose={() => setIsAddSpecimenModalOpen(false)}
        />
      )}

      {/* Batch Folder Upload & Heavy Photo Compressor Modal */}
      {isBatchMediaModalOpen && (
        <MediaBatchModal
          speciesList={dataset.speciesList}
          traits={dataset.traits}
          traitAnnotations={traitAnnotations}
          speciesMediaMap={speciesMediaMap}
          onUpdateTraitAnnotationsBatch={handleUpdateTraitAnnotationsBatch}
          onUpdateSpeciesMediaBatch={handleUpdateSpeciesMediaBatch}
          onExportMediaBundle={handleExportMediaBundle}
          onImportMediaBundleFile={handleImportMediaBundleFile}
          onClose={() => setIsBatchMediaModalOpen(false)}
        />
      )}
    </div>
  );
}
