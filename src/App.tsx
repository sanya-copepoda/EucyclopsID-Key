// Source: Google Maps Platform Code Assist
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Mail } from 'lucide-react';
import { DEFAULT_EUCYCLOPS_CSV } from './data/rawCsvData';
import {
  KeyConfig,
  SpeciesCandidateEvaluation,
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
import { translateRegion, useLanguage } from './utils/i18n';
import { PolyclaveKeyWorkspace } from './components/PolyclaveKeyWorkspace';
import { DifferentialMatrixView } from './components/DifferentialMatrixView';
import { AboutKeyView } from './components/AboutKeyView';
import { SpeciesDetailModal } from './components/SpeciesDetailModal';
import { TraitInspectorModal } from './components/TraitInspectorModal';
import { AddSpecimenModal } from './components/AddSpecimenModal';

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

  const [selectedSpeciesModal, setSelectedSpeciesModal] = useState<{
    species: SpeciesProfile;
    evaluation?: SpeciesCandidateEvaluation;
  } | null>(null);

  const [inspectedTrait, setInspectedTrait] = useState<TraitDefinition | null>(null);
  const [isAddSpecimenModalOpen, setIsAddSpecimenModalOpen] = useState<boolean>(false);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const annotationsImportRef = useRef<HTMLInputElement | null>(null);

  // Sync with /assets/aistudio/Eucyclops___________4f462c5a if available
  useEffect(() => {
    fetch('/assets/aistudio/Eucyclops___________4f462c5a')
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

  const remainingCandidates = useMemo(
    () => evaluations.filter((e) => e.isCandidate).map((e) => e.species),
    [evaluations]
  );

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

  const handleExportAnnotationsJson = () => {
    const blob = new Blob([JSON.stringify(traitAnnotations, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eucyclops_traits_annotations.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAnnotationsJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          setTraitAnnotations(parsed);
          saveTraitAnnotations(parsed);
        }
      } catch {
        // ignore invalid json
      }
    };
    reader.readAsText(file, 'utf-8');
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
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
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

        {/* Zone 3: Language Switcher (EN / RU) + Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
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
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isEn ? 'Upload CSV Matrix' : 'Загрузить CSV матрицу'}
          </button>
        </div>
      </header>

      {/* Main Content Container (1440px max-w) */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        {activeTab === 'key' && (
          <PolyclaveKeyWorkspace
            traits={dataset.traits}
            traitMap={dataset.traitMap}
            traitAnnotations={traitAnnotations}
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
              {isEn ? '+ Add Specimens to Database' : '+ Добавить особей в базу'}
            </button>
            <span>·</span>
            <button
              onClick={handleExportFullCsv}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              {isEn
                ? `Download CSV Matrix (${dataset.specimens.length} spec.)`
                : `Скачать CSV матрицу (${dataset.specimens.length} экз.)`}
            </button>
            <span>·</span>
            <button
              onClick={handleExportAnnotationsJson}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              {isEn ? 'Export Annotations (.json)' : 'Экспорт описаний (.json)'}
            </button>
            <span>·</span>
            <button
              onClick={() => annotationsImportRef.current?.click()}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              {isEn ? 'Import Annotations (.json)' : 'Импорт описаний (.json)'}
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
          config={config}
          activeFilters={activeFilters}
          onClose={() => setSelectedSpeciesModal(null)}
          onOpenTraitInspector={(trait) => setInspectedTrait(trait)}
          onLoadSpecimenIntoKey={handleLoadSpecimenIntoKey}
        />
      )}

      {/* Trait Inspector Modal (Image, Human-Language Description, and Comment) */}
      {inspectedTrait && (
        <TraitInspectorModal
          trait={inspectedTrait}
          annotation={traitAnnotations[inspectedTrait.code]}
          onSaveAnnotation={handleSaveTraitAnnotation}
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
    </div>
  );
}

