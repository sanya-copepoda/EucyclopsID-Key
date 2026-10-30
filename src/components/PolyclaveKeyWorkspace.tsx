import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Search,
  Eye,
  ArrowUpDown,
  Layers,
  Image as ImageIcon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Info,
  Scale,
} from 'lucide-react';
import {
  AnatomicalSection,
  ExtrapolationMethod,
  KeyConfig,
  SpeciesCandidateEvaluation,
  SpeciesProfile,
  TraitAnnotation,
  TraitDefinition,
  UserTraitFilter,
} from '../types/taxonomy';
import {
  ANATOMICAL_SECTION_LABELS,
  computeExtrapolatedRange,
  computeTraitSeparatingPower,
  formatTraitNumber,
  getSpeciesTaxonomicCategory,
} from '../utils/matrixEngine';
import {
  formatQualitativeStateLabel,
  getQualitativeStateMeaning,
  getTraitDisplayComment,
  getTraitDisplayDescription,
} from '../utils/traitAnnotationStore';
import { getAnatomicalSectionLabel, useLanguage } from '../utils/i18n';
import { InteractiveAnatomyMap } from './InteractiveAnatomyMap';

interface PolyclaveKeyWorkspaceProps {
  traits: TraitDefinition[];
  traitMap: Record<string, TraitDefinition>;
  traitAnnotations: Record<string, TraitAnnotation>;
  evaluations: SpeciesCandidateEvaluation[];
  activeFilters: Record<string, UserTraitFilter>;
  config: KeyConfig;
  loadedSpecimenLabel: string | null;
  totalSpecimensCount: number;
  extraSpecimensCount: number;
  onUpdateFilter: (traitCode: string, filter: UserTraitFilter | null) => void;
  onResetAllFilters: () => void;
  onChangeConfig: (updater: (prev: KeyConfig) => KeyConfig) => void;
  onSelectSpeciesDetail: (sp: SpeciesProfile, evalItem?: SpeciesCandidateEvaluation) => void;
  onOpenTraitInspector: (trait: TraitDefinition) => void;
  onOpenDifferentialCompare: () => void;
  onOpenAddSpecimenModal: () => void;
}

export const PolyclaveKeyWorkspace: React.FC<PolyclaveKeyWorkspaceProps> = ({
  traits,
  traitMap,
  traitAnnotations,
  evaluations,
  activeFilters,
  config,
  loadedSpecimenLabel,
  onUpdateFilter,
  onResetAllFilters,
  onChangeConfig,
  onSelectSpeciesDetail,
  onOpenTraitInspector,
  onOpenDifferentialCompare,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<AnatomicalSection | 'all'>('all');
  const [selectedKind, setSelectedKind] = useState<
    'all' | 'qualitative' | 'meristic' | 'morphometric' | 'entered'
  >('all');
  const [sortBy, setSortBy] = useState<'matrix_order' | 'best_diagnostic'>('matrix_order');
  const [sinkRedundantTraits, setSinkRedundantTraits] = useState<boolean>(true);
  const [rightPanelTab, setRightPanelTab] = useState<'candidates' | 'discarded'>('candidates');
  const [discardedSortMode, setDiscardedSortMode] = useState<'similarity' | 'mismatches'>('similarity');
  const [isInstructionOpen, setIsInstructionOpen] = useState<boolean>(false);
  const [isAnatomyMapOpen, setIsAnatomyMapOpen] = useState<boolean>(true);

  const [numericDrafts, setNumericDrafts] = useState<Record<string, string>>({});

  const remainingCandidates = useMemo(
    () => evaluations.filter((e) => e.isCandidate),
    [evaluations]
  );

  const discardedEvaluations = useMemo(() => {
    const list = evaluations.filter((e) => !e.isCandidate);
    if (discardedSortMode === 'mismatches') {
      return [...list].sort((a, b) => {
        if (a.mismatchesCount !== b.mismatchesCount) {
          return a.mismatchesCount - b.mismatchesCount;
        }
        if (b.quantitativeSimilarity !== a.quantitativeSimilarity) {
          return b.quantitativeSimilarity - a.quantitativeSimilarity;
        }
        return a.rmsSigmaDistance - b.rmsSigmaDistance;
      });
    }
    return [...list].sort((a, b) => {
      if (b.quantitativeSimilarity !== a.quantitativeSimilarity) {
        return b.quantitativeSimilarity - a.quantitativeSimilarity;
      }
      if (Math.abs(a.rmsSigmaDistance - b.rmsSigmaDistance) > 0.02) {
        return a.rmsSigmaDistance - b.rmsSigmaDistance;
      }
      return a.mismatchesCount - b.mismatchesCount;
    });
  }, [evaluations, discardedSortMode]);

  const remainingSpeciesProfiles = useMemo(
    () => remainingCandidates.map((c) => c.species),
    [remainingCandidates]
  );

  const separatingPower = useMemo(
    () => computeTraitSeparatingPower(remainingSpeciesProfiles, traits, config),
    [remainingSpeciesProfiles, traits, config]
  );

  const isTraitEntered = (traitCode: string): boolean => {
    const f = activeFilters[traitCode];
    if (!f) return false;
    if (f.selectedStates && f.selectedStates.length > 0) return true;
    if (f.numericValue !== null && f.numericValue !== undefined) return true;
    if (
      (f.numericMin !== null && f.numericMin !== undefined) ||
      (f.numericMax !== null && f.numericMax !== undefined)
    ) {
      return true;
    }
    return false;
  };

  const activeFilterCount = useMemo(() => {
    return traits.filter((t) => isTraitEntered(t.code)).length;
  }, [activeFilters, traits]);

  const bestNextTraits = useMemo(() => {
    if (remainingCandidates.length <= 1) return [];
    return traits
      .filter((t) => !isTraitEntered(t.code) && (separatingPower[t.code] || 0) > 0)
      .sort((a, b) => (separatingPower[b.code] || 0) - (separatingPower[a.code] || 0))
      .slice(0, 6);
  }, [traits, activeFilters, separatingPower, remainingCandidates.length]);

  const displayedTraits = useMemo(() => {
    const filtered = traits.filter((t) => {
      if (selectedSection !== 'all' && t.section !== selectedSection) return false;
      if (selectedKind === 'qualitative' && t.kind !== 'qualitative') return false;
      if (selectedKind === 'meristic' && t.kind !== 'meristic') return false;
      if (selectedKind === 'morphometric' && t.kind !== 'morphometric') return false;
      if (selectedKind === 'entered' && !isTraitEntered(t.code)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const descEn = getTraitDisplayDescription(t.code, traitAnnotations, 'en');
        const descRu = getTraitDisplayDescription(t.code, traitAnnotations, 'ru');
        const commEn = getTraitDisplayComment(t.code, traitAnnotations, 'en');
        const commRu = getTraitDisplayComment(t.code, traitAnnotations, 'ru');
        const descText = `${t.code} ${descEn} ${descRu} ${commEn} ${commRu}`.toLowerCase();
        if (!descText.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'best_diagnostic') {
      return [...filtered].sort((a, b) => {
        const aEntered = isTraitEntered(a.code);
        const bEntered = isTraitEntered(b.code);
        if (aEntered !== bEntered) return aEntered ? -1 : 1;
        return (separatingPower[b.code] || 0) - (separatingPower[a.code] || 0);
      });
    }

    if (sinkRedundantTraits) {
      return [...filtered].sort((a, b) => {
        const aRedundant = !isTraitEntered(a.code) && (separatingPower[a.code] || 0) === 0;
        const bRedundant = !isTraitEntered(b.code) && (separatingPower[b.code] || 0) === 0;
        if (aRedundant !== bRedundant) return aRedundant ? 1 : -1;
        return a.colIndex - b.colIndex;
      });
    }

    return filtered;
  }, [
    traits,
    selectedSection,
    selectedKind,
    searchQuery,
    sortBy,
    sinkRedundantTraits,
    activeFilters,
    separatingPower,
    traitAnnotations,
  ]);

  const redundantDisplayedCount = useMemo(() => {
    return displayedTraits.filter(
      (t) => !isTraitEntered(t.code) && (separatingPower[t.code] || 0) === 0
    ).length;
  }, [displayedTraits, activeFilters, separatingPower]);

  const handleToggleQualitativeState = (traitCode: string, stateVal: number) => {
    const prevFilter = activeFilters[traitCode];
    const current = prevFilter?.selectedStates || [];
    let next: number[];
    if (current.includes(stateVal)) {
      next = current.filter((x) => x !== stateVal);
    } else {
      next = [...current, stateVal].sort((a, b) => a - b);
    }

    const hasNumeric =
      (prevFilter?.numericValue !== null && prevFilter?.numericValue !== undefined) ||
      (prevFilter?.numericMin !== null && prevFilter?.numericMin !== undefined) ||
      (prevFilter?.numericMax !== null && prevFilter?.numericMax !== undefined);

    if (next.length === 0 && !hasNumeric) {
      onUpdateFilter(traitCode, null);
    } else {
      onUpdateFilter(traitCode, {
        ...prevFilter,
        traitCode,
        selectedStates: next,
      });
    }
  };

  const handleQuantitativeChange = (traitCode: string, rawText: string) => {
    setNumericDrafts((prev) => ({ ...prev, [traitCode]: rawText }));
    const prevFilter = activeFilters[traitCode];
    const existingStates = prevFilter?.selectedStates || [];
    const trimmed = rawText.trim();

    if (trimmed === '') {
      if (existingStates.length > 0) {
        onUpdateFilter(traitCode, {
          traitCode,
          selectedStates: existingStates,
          numericValue: null,
          numericMin: null,
          numericMax: null,
        });
      } else {
        onUpdateFilter(traitCode, null);
      }
      return;
    }

    const normalized = trimmed.replace(/,/g, '.');
    const rangeMatch = normalized.match(
      /^(\d+(?:\.\d+)?)\s*(?:[-–—]|\.\.)\s*(\d+(?:\.\d+)?)$/
    );
    if (rangeMatch) {
      const v1 = Number(rangeMatch[1]);
      const v2 = Number(rangeMatch[2]);
      if (Number.isFinite(v1) && Number.isFinite(v2)) {
        onUpdateFilter(traitCode, {
          traitCode,
          selectedStates: existingStates.length > 0 ? existingStates : undefined,
          numericValue: null,
          numericMin: Math.min(v1, v2),
          numericMax: Math.max(v1, v2),
        });
      }
      return;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      onUpdateFilter(traitCode, {
        traitCode,
        selectedStates: existingStates.length > 0 ? existingStates : undefined,
        numericValue: parsed,
        numericMin: null,
        numericMax: null,
      });
    }
  };

  const clearSingleTrait = (traitCode: string) => {
    setNumericDrafts((prev) => {
      const copy = { ...prev };
      delete copy[traitCode];
      return copy;
    });
    onUpdateFilter(traitCode, null);
  };

  const getTaxonVisualStyle = (status: string) => {
    const category = getSpeciesTaxonomicCategory(status);
    if (category === 'valid') {
      return {
        borderLeft: 'border-l-4 border-l-emerald-600',
        nameColor: 'text-emerald-900 hover:text-emerald-700',
        badgeClass: 'bg-emerald-100/90 text-emerald-900 border border-emerald-300',
        badgeLabel: isEn ? 'Valid species (valid)' : 'Валидный вид (valid)',
      };
    }
    if (category === 'candidate') {
      return {
        borderLeft: 'border-l-4 border-l-sky-600',
        nameColor: 'text-sky-900 hover:text-sky-700',
        badgeClass: 'bg-sky-100/90 text-sky-900 border border-sky-300',
        badgeLabel: isEn ? 'Candidate species (n. sp.)' : 'Вид-кандидат (n. sp.)',
      };
    }
    return {
      borderLeft: 'border-l-4 border-l-amber-500',
      nameColor: 'text-amber-900 hover:text-amber-700',
      badgeClass: 'bg-amber-100/90 text-amber-900 border border-amber-300',
      badgeLabel: isEn ? `Doubtful (${status})` : `Сомнительный (${status})`,
    };
  };

  return (
    <div className="space-y-4">
      {/* Top Instruction Button & Excluded Species Note */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsInstructionOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors shadow-xs cursor-pointer ${
                isInstructionOpen
                  ? 'bg-sky-800 text-white'
                  : 'bg-sky-700 text-white hover:bg-sky-800'
              }`}
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              <span>
                {isEn
                  ? 'Slide Preparation & How to Use the Key'
                  : 'Инструкция по изготовлению препарата и работе с ключом'}
              </span>
              {isInstructionOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsAnatomyMapOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                isAnatomyMapOpen
                  ? 'border-rose-300 bg-rose-50 text-rose-900'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Layers className="h-4 w-4 text-rose-600 shrink-0" />
              <span>
                {isAnatomyMapOpen
                  ? isEn
                    ? 'Hide Interactive Anatomy Diagram'
                    : 'Скрыть интерактивную схему рачка'
                  : isEn
                  ? 'Interactive Anatomy Diagram (select by appendage)'
                  : 'Интерактивная схема рачка (выбор по конечностям)'}
              </span>
            </button>

            <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-1.5 text-xs font-medium text-sky-950">
              <Scale className="h-3.5 w-3.5 text-sky-700 shrink-0" />
              <span>
                {isEn ? (
                  <>
                    Quantitative data: enter the <strong>mean between right and left sides</strong> of a single specimen
                  </>
                ) : (
                  <>
                    Количественные данные: вводите <strong>среднее между правой и левой стороной</strong> одной особи
                  </>
                )}
              </span>
            </span>
          </div>

          <div className="flex items-start gap-1.5 text-xs text-slate-600">
            <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {isEn ? (
                <>
                  <strong>Note:</strong> Not included:{' '}
                  <em className="italic">
                    E. persistens, E. maritimus, E. orthostylis, E. euacanthus, E. dumonti
                  </em>{' '}
                  (and possibly some others unknown to the author).
                </>
              ) : (
                <>
                  <strong>Примечание:</strong> не включены{' '}
                  <em className="italic">
                    E. persistens, E. maritimus, E. orthostylis, E. euacanthus, E. dumonti
                  </em>{' '}
                  (возможно, о чём-то я не знаю).
                </>
              )}
            </span>
          </div>
        </div>

        {/* Expandable Comprehensive Instruction Block */}
        {isInstructionOpen && (
          <div className="mt-4 border-t border-slate-200 pt-5 space-y-5">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Left 7 cols: Slide preparation + How to use the key */}
              <div className="lg:col-span-7 space-y-4 text-xs text-slate-700 leading-relaxed">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEn
                      ? '1. Microscopic Slide Preparation (Cyclopoida)'
                      : '1. Изготовление микропрепарата (Cyclopoida)'}
                  </h3>
                  {isEn ? (
                    <>
                      <p>
                        <strong>Cyclopoida</strong> (for the identification of most genera, only{' '}
                        <strong>adult females</strong> are suitable). The key diagnostic characters are the ornamentation of the antennal coxobasis (
                        <span className="font-mono font-semibold">A2</span>), the coxa of the fourth swimming legs (
                        <span className="font-mono font-semibold">P4</span>), and the structure of the caudal rami.
                      </p>
                      <p>
                        To prepare a slide without damaging the specimen, first detach the thoracic somite bearing{' '}
                        <span className="font-mono">P5</span> together with the abdomen (the entire urosoma); next, detach the fourth pair of legs (<span className="font-mono">P4</span>), ideally without the somite, and both left and right antennae (<span className="font-mono">A2</span>).
                      </p>
                      <p>
                        <strong>The final slide includes:</strong> both <span className="font-mono">A2</span> mounted parallel to each other (one with the frontal/anterior side up, the other with the caudal/posterior side up so spinules on both sides are clearly visible); <span className="font-mono">P4</span> (caudal/posterior side up); abdomen with <span className="font-mono">P5</span> (urosoma); and the remaining body (<span className="font-mono">Ceph+T2-T3</span>, ventral side up).
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>Cyclopoida</strong> (для идентификации большинства родов подходят только{' '}
                        <strong>самки</strong>). Ключевые признаки – вооружение коксобазиса антенн (
                        <span className="font-mono font-semibold">A2</span>), коксы четвёртой пары ног (
                        <span className="font-mono font-semibold">P4</span>) и строение каудальных ветвей.
                      </p>
                      <p>
                        Для препарата, не повреждая рачка, нужно отделить торакальный сомит, несущий{' '}
                        <span className="font-mono">P5</span> вместе с абдоменом (вся уросома), дальше отделить четвёртую пару ног, в идеале без сомита, и левую и правую{' '}
                        <span className="font-mono">A2</span>.
                      </p>
                      <p>
                        <strong>Препарат включает:</strong> обе <span className="font-mono">A2</span>, расположенные параллельно (одна – фронтальной, другая – каудальной стороной вверх, чтобы видеть шипики с обеих сторон); <span className="font-mono">P4</span> (задней стороной вверх); абдомен с <span className="font-mono">P5</span> (уросома); остальное тело (вентральной стороной вверх).
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEn
                      ? '2. Rule for Bilateral Averaging (Right & Left Sides)'
                      : '2. Правило расчёта средних значений (справа и слева)'}
                  </h3>
                  <p className="text-slate-800">
                    {isEn ? (
                      <>
                        For all quantitative traits of paired structures (spinule counts in groups on{' '}
                        <span className="font-mono">A2</span> and the coxa of <span className="font-mono">P4</span>, number of denticles on the serra, and morphometric measurements/indices of the caudal rami and{' '}
                        <span className="font-mono">P4 Enp3</span>), always enter the{' '}
                        <strong className="underline decoration-sky-600/60 underline-offset-2 text-sky-950">
                          mean value between the right and left sides of the same individual
                        </strong>{' '}
                        (e.g., if there are 10 spinules on the left and 11 on the right, enter <span className="font-mono">10.5</span>).
                      </>
                    ) : (
                      <>
                        Для всех количественных признаков парных структур (число шипиков в группах на{' '}
                        <span className="font-mono">A2</span> и коксе <span className="font-mono">P4</span>, число зубцов серры, промеры и индексы каудальных ветвей и{' '}
                        <span className="font-mono">P4 Enp3</span>) необходимо приводить{' '}
                        <strong className="underline decoration-sky-600/60 underline-offset-2 text-sky-950">
                          среднее значение между правой и левой стороной тела одной особи
                        </strong>{' '}
                        (например, если слева 10 шипиков, а справа 11 — вводится <span className="font-mono">10.5</span>).
                      </>
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEn
                      ? '3. How to Use the Multi-Access Interactive Key'
                      : '3. Как пользоваться многовходовым определителем'}
                  </h3>
                  {isEn ? (
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                      <li>
                        <strong>Free-order trait entry (Lucid principle):</strong> You do not need to follow a fixed sequence. Pick any trait clearly visible on your slide and enter its state or value — non-matching species are immediately filtered out in the right column.
                      </li>
                      <li>
                        <strong>Interactive next-step recommendation:</strong> The{' '}
                        <em>“Most Informative Traits”</em> bar recalculates separating power (%) among the currently remaining candidate species and suggests which character to inspect next. Traits that no longer separate the remaining candidates (0%) automatically sink to the bottom of the list.
                      </li>
                      <li>
                        <strong>Entering qualitative & quantitative characters:</strong> For qualitative traits, click the state buttons (if uncertain, you may select multiple states; polymorphic species are retained if any of their known states is selected). For quantitative traits and indices, enter a single number (e.g. <span className="font-mono">4.8</span>) or a range with a hyphen (<span className="font-mono">14-18</span>).
                      </li>
                      <li>
                        <strong>Illustrations & notes:</strong> Click any trait name to open its card, where you can attach a reference drawing/micrograph and edit notes.
                      </li>
                      <li>
                        <strong>Color-coded taxonomic status:</strong>{' '}
                        <span className="font-semibold text-emerald-800">Green</span> indicates valid species, <span className="font-semibold text-sky-800">blue</span> indicates candidate new species (<span className="font-mono">n. sp.</span>), and{' '}
                        <span className="font-semibold text-amber-800">amber</span> indicates doubtful taxa requiring confirmation. Click any species to open its full profile and distribution map.
                      </li>
                    </ul>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                      <li>
                        <strong>Произвольный порядок признаков (Lucid-принцип):</strong> вам не нужно идти по порядку. Выберите любой отчётливо видимый на вашем препарате признак и укажите его значение — неподходящие виды сразу отфильтруются в правой колонке.
                      </li>
                      <li>
                        <strong>Автоматическая подсказка следующего шага:</strong> блок{' '}
                        <em>«Наиболее информативные признаки»</em> пересчитывает силу разделения (в %) среди оставшихся кандидатов и подсказывает, на какой признак лучше посмотреть дальше. Признаки, которые перестали разделять оставшиеся виды (0%), автоматически опускаются в самый низ списка.
                      </li>
                      <li>
                        <strong>Ввод качественных и количественных признаков:</strong> для качественных признаков нажимайте на кнопки состояний (при сомнении можно выбрать сразу два состояния; изменчивые виды учитываются при нажатии любого из свойственных им состояний). Для количественных признаков и индексов можно ввести одно число (например, <span className="font-mono">4.8</span>) или диапазон через дефис (<span className="font-mono">14-18</span>).
                      </li>
                      <li>
                        <strong>Иллюстрации и описания:</strong> при нажатии на название любого признака открывается его карточка, куда можно прикрепить эталонный рисунок/фотографию и отредактировать комментарий.
                      </li>
                      <li>
                        <strong>Цветовая маркировка видов в списке кандидатов:</strong>{' '}
                        <span className="font-semibold text-emerald-800">зелёным</span> отмечены валидные виды, <span className="font-semibold text-sky-800">синим</span> — виды-кандидаты (<span className="font-mono">n. sp.</span>),{' '}
                        <span className="font-semibold text-amber-800">янтарным</span> — сомнительные виды, требующие подтверждения. По клику на вид открывается его полный профиль и карта находок.
                      </li>
                    </ul>
                  )}
                </div>
              </div>

              {/* Right 5 cols: Slide layout photograph */}
              <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                <div className="text-xs font-bold text-slate-900">
                  {isEn
                    ? 'Layout of dissected copepod parts on a microscope slide:'
                    : 'Схема расположения частей рачка на предметном стекле:'}
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/aistudio/image_feb9e6e3.png`}
                    alt="Slide preparation layout for Eucyclops: Ceph+T2-T3, A2, Abd+T5, P4"
                    className="w-full h-auto object-contain rounded"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                  <div className="rounded bg-white px-2.5 py-1.5 border border-slate-200/80">
                    <strong className="font-mono text-rose-700">A2:</strong>{' '}
                    {isEn
                      ? 'both antennae mounted parallel (frontal & caudal sides up)'
                      : 'обе антенны параллельно (фронтально и каудально)'}
                  </div>
                  <div className="rounded bg-white px-2.5 py-1.5 border border-slate-200/80">
                    <strong className="font-mono text-rose-700">Abd+T5:</strong>{' '}
                    {isEn
                      ? 'urosoma (abdomen together with P5 somite)'
                      : 'уросома (абдомен вместе с сомитом P5)'}
                  </div>
                  <div className="rounded bg-white px-2.5 py-1.5 border border-slate-200/80">
                    <strong className="font-mono text-rose-700">P4:</strong>{' '}
                    {isEn
                      ? 'fourth swimming legs (posterior/caudal side up)'
                      : 'четвёртая пара ног (задней стороной вверх)'}
                  </div>
                  <div className="rounded bg-white px-2.5 py-1.5 border border-slate-200/80">
                    <strong className="font-mono text-rose-700">Ceph+T2-T3:</strong>{' '}
                    {isEn
                      ? 'cephalothorax & thoracic somites (ventral side up)'
                      : 'цефалоторакс и торакальные сомиты (вентрально)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Vector Anatomy Map */}
      {isAnatomyMapOpen && (
        <InteractiveAnatomyMap
          traits={traits}
          traitMap={traitMap}
          traitAnnotations={traitAnnotations}
          activeFilters={activeFilters}
          separatingPower={separatingPower}
          numericDrafts={numericDrafts}
          onToggleQualitativeState={handleToggleQualitativeState}
          onQuantitativeChange={handleQuantitativeChange}
          onClearTrait={clearSingleTrait}
          onOpenTraitInspector={onOpenTraitInspector}
          onFilterMainListBySection={(section) => {
            setSelectedSection(section);
            setSelectedKind('all');
            setSearchQuery('');
          }}
        />
      )}

      {/* Calibration & Method Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-sky-700" />
            <span className="text-xs font-semibold text-slate-800">
              {isEn ? 'Small-sample range model:' : 'Режим диапазонов для малых выборок:'}
            </span>
            <select
              value={config.extrapolationMethod}
              onChange={(e) =>
                onChangeConfig((prev) => ({
                  ...prev,
                  extrapolationMethod: e.target.value as ExtrapolationMethod,
                }))
              }
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-900 focus:border-sky-600 focus:outline-none"
            >
              <option value="bayesian_pooled">
                {isEn
                  ? 'Bayesian Adjustment (Pooled SD + Hartley d₂) — Recommended'
                  : 'Байесовская поправка (Pooled SD + d₂ Хартли) — Рекомендуется'}
              </option>
              <option value="student_t">
                {isEn
                  ? 'Student-t Predictive Interval (Mean ± k·σ·√(1+1/n))'
                  : 'Предиктивный интервал Стьюдента (Mean ± k·σ·√(1+1/n))'}
              </option>
              <option value="cv_buffer">
                {isEn
                  ? `Percentage Buffer (±${config.percentBuffer}% weighted for small n)`
                  : `Процентный буфер (±${config.percentBuffer}% с весом на малый n)`}
              </option>
              <option value="strict_raw">
                {isEn
                  ? 'Strict Observed [Min–Max] (no expansion for small n)'
                  : 'Строгий табличный [Min–Max] (без расширения для малых n)'}
              </option>
            </select>
          </div>

          {config.extrapolationMethod !== 'strict_raw' &&
            config.extrapolationMethod !== 'cv_buffer' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600">{isEn ? 'Tolerance:' : 'Допуск:'}</span>
                <input
                  type="range"
                  min={1.0}
                  max={3.0}
                  step={0.25}
                  value={config.sigmaMultiplier}
                  onChange={(e) =>
                    onChangeConfig((prev) => ({
                      ...prev,
                      sigmaMultiplier: Number(e.target.value),
                    }))
                  }
                  className="w-24 accent-sky-600"
                />
                <span className="font-mono font-semibold tabular-nums text-sky-800">
                  ±{config.sigmaMultiplier.toFixed(2)}σ
                </span>
              </div>
            )}

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4 text-xs">
            <span className="text-slate-600">{isEn ? 'Taxon scope:' : 'Охват таксонов:'}</span>
            <select
              value={config.speciesScope}
              onChange={(e) =>
                onChangeConfig((prev) => ({
                  ...prev,
                  speciesScope: e.target.value as 'all' | 'key_only',
                }))
              }
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-900 focus:border-sky-600 focus:outline-none"
            >
              <option value="all">
                {isEn ? 'All matrix species (32 species)' : 'Все виды из матрицы (32 вида)'}
              </option>
              <option value="key_only">
                {isEn ? 'Only status key: + (27 species)' : 'Только со статусом key: + (27 видов)'}
              </option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loadedSpecimenLabel && (
            <span className="text-xs font-medium text-sky-800">
              {isEn ? `Specimen test: ${loadedSpecimenLabel}` : `Тест особи: ${loadedSpecimenLabel}`}
            </span>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setNumericDrafts({});
                onResetAllFilters();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {isEn
                ? `Reset entered (${activeFilterCount})`
                : `Сбросить введённые (${activeFilterCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Summary Bar + Lucid "Best Next Traits" Assistant */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Best next diagnostic traits to check */}
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Sparkles className="h-4 w-4 text-sky-600" />
              <span>
                {isEn
                  ? `Most informative traits to separate remaining species (${remainingCandidates.length}):`
                  : `Наиболее информативные признаки для разделения оставшихся видов (${remainingCandidates.length}):`}
              </span>
            </div>
            <button
              onClick={() =>
                setSortBy((prev) =>
                  prev === 'best_diagnostic' ? 'matrix_order' : 'best_diagnostic'
                )
              }
              className={`inline-flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sortBy === 'best_diagnostic'
                  ? 'text-sky-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortBy === 'best_diagnostic'
                ? isEn
                  ? 'Sorted by: Diagnostic Power'
                  : 'Сортировка: По диагностической силе'
                : isEn
                ? 'Sort list by separating power'
                : 'Сортировать список по силе разделения'}
            </button>
          </div>

          {remainingCandidates.length <= 1 ? (
            <p className="mt-1.5 text-xs text-emerald-700 font-medium">
              {remainingCandidates.length === 1
                ? isEn
                  ? `Identification complete: 1 candidate species remaining (${remainingCandidates[0].species.sp}).`
                  : `Определение завершено: остался единственный вид-кандидат ${remainingCandidates[0].species.sp}.`
                : isEn
                ? 'No matching species remaining. Try relaxing or removing a conflicting trait.'
                : 'Не осталось подходящих видов. Попробуйте ослабить или удалить конфликтующий признак.'}
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {bestNextTraits.map((t) => {
                const desc = getTraitDisplayDescription(t.code, traitAnnotations, lang);
                return (
                  <button
                    key={t.code}
                    onClick={() => {
                      setSelectedSection('all');
                      setSelectedKind('all');
                      setSearchQuery(t.code);
                    }}
                    title={`${desc} (${t.code})`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800 hover:border-sky-400 hover:bg-sky-50 transition-colors max-w-full text-left cursor-pointer"
                  >
                    <span className="font-medium text-slate-900 truncate max-w-[260px]">
                      {desc}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      {t.code}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-sky-700 tabular-nums shrink-0">
                      {separatingPower[t.code]}%
                    </span>
                  </button>
                );
              })}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-sky-700 underline ml-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isEn ? `Show all ${traits.length} traits` : `Показать все ${traits.length} признаков`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Active traits quick bar */}
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 lg:col-span-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>
              {isEn
                ? `Entered traits (${activeFilterCount}):`
                : `Введённые пользователем признаки (${activeFilterCount}):`}
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={() =>
                  setSelectedKind((prev) => (prev === 'entered' ? 'all' : 'entered'))
                }
                className="text-xs font-medium text-sky-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                {selectedKind === 'entered'
                  ? isEn
                    ? 'Show all traits'
                    : 'Показать все признаки'
                  : isEn
                  ? 'Filter by entered'
                  : 'Фильтр по введённым'}
              </button>
            )}
          </div>
          {activeFilterCount === 0 ? (
            <p className="mt-1.5 text-xs text-slate-500">
              {isEn
                ? 'Click any trait on the left to inspect or attach an illustration, or enter an observed state/value directly.'
                : 'Щёлкните по любому признаку слева, чтобы добавить его картинку, расшифровку или комментарий, либо сразу введите наблюдаемое значение.'}
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 max-h-16 overflow-y-auto">
              {Object.values(activeFilters).map((f) => {
                const tr = traitMap[f.traitCode];
                if (!tr) return null;
                const parts: string[] = [];
                if (f.selectedStates && f.selectedStates.length > 0) {
                  parts.push(
                    f.selectedStates
                      .map((s) =>
                        f.traitCode === 'A1ser' && s === 0
                          ? isEn
                            ? 'Smooth (0)'
                            : 'Гладкая (0)'
                          : f.traitCode === 'A1ser' && s === 100
                          ? isEn
                            ? 'Many (100)'
                            : 'Много (100)'
                          : String(s)
                      )
                      .join('|')
                  );
                }
                if (f.numericValue !== null && f.numericValue !== undefined) {
                  parts.push(formatTraitNumber(f.numericValue, tr.decimals));
                } else if (
                  (f.numericMin !== null && f.numericMin !== undefined) ||
                  (f.numericMax !== null && f.numericMax !== undefined)
                ) {
                  parts.push(
                    `${formatTraitNumber(f.numericMin, tr.decimals)}–${formatTraitNumber(
                      f.numericMax,
                      tr.decimals
                    )}`
                  );
                }
                const valStr = parts.join(' | ');
                return (
                  <button
                    key={f.traitCode}
                    onClick={() => clearSingleTrait(f.traitCode)}
                    title={isEn ? 'Click to remove this trait filter' : 'Нажмите, чтобы убрать этот признак'}
                    className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 font-mono text-xs text-white hover:bg-rose-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>{f.traitCode}:</span>
                    <span className="font-semibold">{valStr}</span>
                    <span className="ml-0.5 text-slate-300">×</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Split Console: Left = 68 Traits Input Matrix, Right = Candidates & Discarded Species */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Traits Matrix */}
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-7 flex flex-col">
          {/* Trait Filter Controls */}
          <div className="border-b border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Search by code (A2g1, P4_CS_osp2, cr/cs) or description...'
                      : 'Поиск по коду (A2g1, P4_CS_osp2, cr/cs) или расшифровке...'
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 py-1.5 font-mono text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(
                  [
                    {
                      id: 'all',
                      label: isEn ? `All (${traits.length})` : `Все (${traits.length})`,
                    },
                    {
                      id: 'qualitative',
                      label: isEn ? 'Qualitative (0/1/2)' : 'Качественные (0/1/2)',
                    },
                    {
                      id: 'meristic',
                      label: isEn ? 'Counts' : 'Счётные',
                    },
                    {
                      id: 'morphometric',
                      label: isEn ? 'Indices' : 'Индексы',
                    },
                    {
                      id: 'entered',
                      label: isEn
                        ? `Entered (${activeFilterCount})`
                        : `Введённые (${activeFilterCount})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedKind(tab.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedKind === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Anatomical Section Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setSelectedSection('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedSection === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isEn ? 'All sections' : 'Все отделы'}
              </button>
              {(Object.keys(ANATOMICAL_SECTION_LABELS) as AnatomicalSection[]).map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSection(sec)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedSection === sec
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {getAnatomicalSectionLabel(sec, lang).split(' (')[0]}
                </button>
              ))}
            </div>

            {/* Auto-sink non-informative traits checkbox (enabled by default) */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={sinkRedundantTraits}
                  onChange={(e) => setSinkRedundantTraits(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-700"
                />
                <span className="font-medium text-slate-800">
                  {isEn
                    ? 'Move non-informative traits (0% separation at current step) to the bottom of the list'
                    : 'Переносить неинформативные на текущем шаге признаки в самый низ списка'}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  ({redundantDisplayedCount})
                </span>
              </label>
              <span className="text-[11px] text-slate-500">
                {isEn
                  ? 'Kept active in case of an unusual specimen or new species'
                  : 'Не отключаются полностью (доступны на случай находки нового вида)'}
              </span>
            </div>
          </div>

          {/* Scrollable Trait Rows */}
          <div className="divide-y divide-slate-200 max-h-[680px] overflow-y-auto">
            {displayedTraits.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isEn
                  ? 'No traits match your search. Reset the search filter.'
                  : 'По вашему запросу признаки не найдены. Сбросьте фильтр поиска.'}
              </div>
            ) : (
              displayedTraits.map((trait, idx) => {
                const activeFilter = activeFilters[trait.code];
                const isEntered = isTraitEntered(trait.code);
                const sepPower = separatingPower[trait.code] || 0;
                const isRedundant = !isEntered && sepPower === 0;

                const prevTrait = idx > 0 ? displayedTraits[idx - 1] : null;
                const prevWasRedundant = prevTrait
                  ? !isTraitEntered(prevTrait.code) &&
                    (separatingPower[prevTrait.code] || 0) === 0
                  : false;
                const showRedundantDivider =
                  (sinkRedundantTraits || sortBy === 'best_diagnostic') &&
                  isRedundant &&
                  !prevWasRedundant;

                const ann = traitAnnotations[trait.code];
                const displayDesc = getTraitDisplayDescription(trait.code, traitAnnotations, lang);
                const displayComment = getTraitDisplayComment(trait.code, traitAnnotations, lang);
                const hasImage = Boolean(ann?.imageUrl);

                // Compute summary among currently remaining candidate species
                let candidateMin: number | null = null;
                let candidateMax: number | null = null;
                const stateCandidateCounts: Record<number, number> = {};
                let a1serSmoothCount = 0;
                let a1serManyCount = 0;

                for (const cand of remainingCandidates) {
                  const st = cand.species.traitStats[trait.code];
                  if (!st || st.n === 0) continue;
                  if (trait.kind === 'qualitative') {
                    for (const sVal of st.stateSet) {
                      stateCandidateCounts[sVal] = (stateCandidateCounts[sVal] || 0) + 1;
                    }
                  } else {
                    if (trait.code === 'A1ser') {
                      if (st.values.includes(0)) a1serSmoothCount++;
                      if (st.values.includes(100)) a1serManyCount++;
                    }
                    const { extMin, extMax } = computeExtrapolatedRange(
                      st,
                      trait,
                      cand.species.group,
                      config
                    );
                    const lo = extMin ?? st.rawMin;
                    const hi = extMax ?? st.rawMax;
                    if (lo !== null && (candidateMin === null || lo < candidateMin)) {
                      candidateMin = lo;
                    }
                    if (hi !== null && (candidateMax === null || hi > candidateMax)) {
                      candidateMax = hi;
                    }
                  }
                }

                const draftVal =
                  numericDrafts[trait.code] !== undefined
                    ? numericDrafts[trait.code]
                    : activeFilter?.numericValue !== null &&
                      activeFilter?.numericValue !== undefined
                    ? String(activeFilter.numericValue)
                    : activeFilter?.numericMin !== null &&
                      activeFilter?.numericMin !== undefined &&
                      activeFilter?.numericMax !== null &&
                      activeFilter?.numericMax !== undefined
                    ? `${activeFilter.numericMin}-${activeFilter.numericMax}`
                    : '';

                return (
                  <React.Fragment key={trait.code}>
                    {showRedundantDivider && (
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 px-4 py-2 text-xs border-y border-slate-200">
                        <span className="font-semibold text-slate-700">
                          {isEn
                            ? `Non-informative traits at current step (${redundantDisplayedCount}) — do not separate remaining candidates`
                            : `Неинформативные на данном шаге признаки (${redundantDisplayedCount}) — не разделяют оставшихся кандидатов`}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {isEn
                            ? 'Remain active for input (to verify unusual specimens or new species)'
                            : 'Активны для ввода (для проверки необычных особей или новых видов)'}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 transition-colors ${
                        isEntered
                          ? 'bg-sky-50/60'
                          : isRedundant
                          ? 'bg-slate-50/60 opacity-80 hover:opacity-100'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Left: Prominent Description, Subdued Trait Code, Image/Comment Indicators & Range Metadata */}
                      <div className="min-w-[220px] flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenTraitInspector(trait)}
                            className="group text-left focus:outline-none cursor-pointer"
                            title={
                              isEn
                                ? 'Click to open/add trait illustration, description, and notes'
                                : 'Щёлкните, чтобы открыть/добавить картинку признака, расшифровку и комментарий'
                            }
                          >
                            <span className="text-sm font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">
                              {displayDesc}
                            </span>
                          </button>
                        </div>

                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onOpenTraitInspector(trait)}
                            className="group inline-flex items-center gap-1.5 text-left focus:outline-none cursor-pointer"
                          >
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-normal text-slate-400 group-hover:text-slate-700 transition-colors">
                              {trait.code}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                                hasImage
                                  ? 'bg-sky-100 text-sky-800 font-medium'
                                  : 'bg-slate-100/70 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-700'
                              }`}
                            >
                              <ImageIcon className="h-3 w-3" />
                              {hasImage
                                ? isEn
                                  ? 'Image'
                                  : 'Картинка'
                                : isEn
                                ? '+ photo'
                                : '+ фото'}
                            </span>
                          </button>

                          <span className="text-[11px] text-slate-400">
                            ·{' '}
                            {trait.code === 'A1ser'
                              ? isEn
                                ? 'quantitative (number / range or smooth / many)'
                                : 'количеств. (число / диапазон или гладкая / много)'
                              : trait.kind === 'qualitative'
                              ? isEn
                                ? 'qualitative'
                                : 'качеств.'
                              : trait.kind === 'meristic'
                              ? isEn
                                ? 'quantitative'
                                : 'количеств.'
                              : isEn
                              ? 'index'
                              : 'индекс'}
                          </span>
                          {sepPower >= 40 && !isEntered && (
                            <span
                              className="font-mono text-[11px] font-medium text-emerald-700"
                              title={
                                isEn
                                  ? 'Separating power among remaining candidate species'
                                  : 'Индекс разделительной способности среди оставшихся кандидатов'
                              }
                            >
                              · {isEn ? 'sep.' : 'разд.'} {sepPower}%
                            </span>
                          )}
                          {isRedundant && (
                            <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {isEn ? 'does not separate remaining' : 'не разделяет оставшиеся'}
                            </span>
                          )}
                        </div>

                        {/* Optional comment preview */}
                        {displayComment && (
                          <div
                            onClick={() => onOpenTraitInspector(trait)}
                            className="mt-1 cursor-pointer text-[11px] text-slate-500"
                          >
                            {displayComment}
                          </div>
                        )}

                        {/* Range / State telemetry */}
                        <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
                          {trait.kind === 'qualitative' ? (
                            <span>
                              {isEn ? 'States:' : 'Состояния:'}{' '}
                              {trait.discreteStates
                                .map((s) => formatQualitativeStateLabel(trait.code, s, lang))
                                .join(' · ')}
                            </span>
                          ) : (
                            <span>
                              {isEn ? 'Candidate range:' : 'Диапазон у кандидатов:'}{' '}
                              {candidateMin !== null && candidateMax !== null
                                ? `${formatTraitNumber(candidateMin, trait.decimals)} – ${formatTraitNumber(
                                    candidateMax,
                                    trait.decimals
                                  )}`
                                : `${formatTraitNumber(trait.globalMin, trait.decimals)} – ${formatTraitNumber(
                                    trait.globalMax,
                                    trait.decimals
                                  )}`}{' '}
                              ({isEn ? 'raw min–max:' : 'табл. min–max:'}{' '}
                              {formatTraitNumber(trait.globalMin, trait.decimals)}–
                              {formatTraitNumber(trait.globalMax, trait.decimals)})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Interactive Control */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {hasImage && (
                          <button
                            type="button"
                            onClick={() => onOpenTraitInspector(trait)}
                            className="h-9 w-9 overflow-hidden rounded-lg border border-slate-200 bg-white p-0.5 hover:border-sky-500 shrink-0 cursor-pointer"
                            title={isEn ? 'Open trait illustration' : 'Открыть иллюстрацию признака'}
                          >
                            <img
                              src={ann.imageUrl}
                              alt={trait.code}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover rounded"
                            />
                          </button>
                        )}

                        {trait.code === 'A1ser' ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleQualitativeState('A1ser', 0)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeFilter?.selectedStates?.includes(0)
                                  ? 'border-sky-700 bg-sky-700 text-white shadow-xs'
                                  : a1serSmoothCount > 0
                                  ? 'border-slate-300 bg-white text-slate-900 hover:border-sky-500 hover:bg-sky-50'
                                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                              }`}
                              title={
                                isEn
                                  ? 'Hyaline membrane is smooth (without denticles, value 0)'
                                  : 'Гиалиновая пластинка гладкая (без зубцов, значение 0)'
                              }
                            >
                              <span>{isEn ? 'Smooth (0)' : 'Гладкая (0)'}</span>
                              <span
                                className={`text-[10px] font-normal ${
                                  activeFilter?.selectedStates?.includes(0)
                                    ? 'text-sky-100'
                                    : 'text-slate-400'
                                }`}
                              >
                                ({a1serSmoothCount})
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleQualitativeState('A1ser', 100)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                activeFilter?.selectedStates?.includes(100)
                                  ? 'border-sky-700 bg-sky-700 text-white shadow-xs'
                                  : a1serManyCount > 0
                                  ? 'border-slate-300 bg-white text-slate-900 hover:border-sky-500 hover:bg-sky-50'
                                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                              }`}
                              title={
                                isEn
                                  ? 'Serra is very fine, denticles are too small to count directly (coded as 100)'
                                  : 'Серра очень мелкая, зубцы не поддаются прямому счёту (условное значение 100)'
                              }
                            >
                              <span>{isEn ? 'Many (100)' : 'Много (100)'}</span>
                              <span
                                className={`text-[10px] font-normal ${
                                  activeFilter?.selectedStates?.includes(100)
                                    ? 'text-sky-100'
                                    : 'text-slate-400'
                                }`}
                              >
                                ({a1serManyCount})
                              </span>
                            </button>

                            <input
                              type="text"
                              inputMode="text"
                              value={draftVal}
                              onChange={(e) => handleQuantitativeChange('A1ser', e.target.value)}
                              placeholder={isEn ? 'count or 12-18' : 'число или 12-18'}
                              title={
                                isEn
                                  ? 'Enter exact denticle count (e.g. 14) or a hyphenated range (e.g. 12-18)'
                                  : 'Введите точное число зубцов (например, 14) или диапазон через дефис (например, 12-18)'
                              }
                              className={`w-32 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums focus:outline-none ${
                                draftVal.trim() !== ''
                                  ? 'border-sky-600 bg-white text-sky-950 ring-2 ring-sky-500/20'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-sky-600'
                              }`}
                            />
                          </div>
                        ) : trait.kind === 'qualitative' ? (
                          <div className="flex flex-wrap items-center gap-1.5 justify-end">
                            {trait.discreteStates.map((stateVal) => {
                              const isSelected = Boolean(
                                activeFilter?.selectedStates?.includes(stateVal)
                              );
                              const matchingCands = stateCandidateCounts[stateVal] || 0;
                              const stateWord = getQualitativeStateMeaning(
                                trait.code,
                                stateVal,
                                lang
                              );

                              return (
                                <button
                                  key={stateVal}
                                  onClick={() => handleToggleQualitativeState(trait.code, stateVal)}
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                    isSelected
                                      ? 'border-sky-700 bg-sky-700 text-white shadow-xs'
                                      : matchingCands > 0
                                      ? 'border-slate-300 bg-white text-slate-900 hover:border-sky-500 hover:bg-sky-50'
                                      : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                                  }`}
                                  title={`${formatQualitativeStateLabel(
                                    trait.code,
                                    stateVal,
                                    lang
                                  )} (${matchingCands})`}
                                >
                                  <span className="font-mono">{stateVal}</span>
                                  {stateWord && (
                                    <span
                                      className={`font-sans font-normal ${
                                        isSelected ? 'text-white' : 'text-slate-600'
                                      }`}
                                    >
                                      {stateWord}
                                    </span>
                                  )}
                                  <span
                                    className={`font-mono text-[10px] font-normal ${
                                      isSelected ? 'text-sky-100' : 'text-slate-400'
                                    }`}
                                  >
                                    ({matchingCands})
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={draftVal}
                              onChange={(e) => handleQuantitativeChange(trait.code, e.target.value)}
                              placeholder={`${formatTraitNumber(
                                trait.globalMin,
                                trait.decimals
                              )} .. ${formatTraitNumber(trait.globalMax, trait.decimals)}`}
                              title={
                                isEn
                                  ? 'Enter a single number (mean of left & right sides) or a range with a hyphen'
                                  : 'Можно ввести одно число (среднее между левой и правой стороной) или диапазон через дефис'
                              }
                              className={`w-36 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold tabular-nums focus:outline-none ${
                                isEntered
                                  ? 'border-sky-600 bg-white text-sky-950 ring-2 ring-sky-500/20'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-sky-600'
                              }`}
                            />
                          </div>
                        )}

                        {isEntered && (
                          <button
                            onClick={() => clearSingleTrait(trait.code)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                            title={isEn ? 'Clear trait' : 'Сбросить признак'}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Candidate Species & Eliminated Species */}
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-5 flex flex-col">
          {/* Top Tabs: Candidates vs Discarded */}
          <div className="border-b border-slate-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => setRightPanelTab('candidates')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    rightPanelTab === 'candidates'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn
                    ? `Candidates (${remainingCandidates.length})`
                    : `Кандидаты (${remainingCandidates.length})`}
                </button>
                <button
                  onClick={() => setRightPanelTab('discarded')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    rightPanelTab === 'discarded'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn
                    ? `Eliminated (${discardedEvaluations.length})`
                    : `Отсеянные (${discardedEvaluations.length})`}
                </button>
              </div>

              {(remainingCandidates.length >= 2 ||
                (remainingCandidates.length === 0 && discardedEvaluations.length >= 2)) && (
                <button
                  onClick={onOpenDifferentialCompare}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5 text-sky-700" />
                  {remainingCandidates.length >= 2
                    ? isEn
                      ? `Compare (${remainingCandidates.length})`
                      : `Сравнить (${remainingCandidates.length})`
                    : isEn
                    ? 'Compare Top-6 Closest'
                    : 'Сравнить Топ-6 близких'}
                </button>
              )}
            </div>

            {/* Sort toggle when viewing Eliminated / Closest species */}
            {rightPanelTab === 'discarded' && discardedEvaluations.length > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200/80 bg-sky-50/60 px-3 py-2 text-[11px]">
                <span className="font-semibold text-sky-950">
                  {isEn ? 'Rank similar species by:' : 'Ранжирование похожих видов:'}
                </span>
                <div className="inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5 font-medium">
                  <button
                    type="button"
                    onClick={() => setDiscardedSortMode('similarity')}
                    className={`rounded px-2 py-0.5 text-[11px] transition-colors cursor-pointer ${
                      discardedSortMode === 'similarity'
                        ? 'bg-sky-700 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={
                      isEn
                        ? 'Ranks species by continuous quantitative similarity (Gaussian kernel + RMS σ-distance across all entered traits)'
                        : 'Учитывает величину отклонения в σ по каждому несовпавшему признаку и близость к среднему виду по совпавшим признакам'
                    }
                  >
                    {isEn ? 'Quantitative Similarity (%)' : 'Количественное сходство (%)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscardedSortMode('mismatches')}
                    className={`rounded px-2 py-0.5 text-[11px] transition-colors cursor-pointer ${
                      discardedSortMode === 'mismatches'
                        ? 'bg-sky-700 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isEn ? 'Mismatch Count' : 'Число расхождений'}
                  </button>
                </div>
              </div>
            )}

            {/* Color Legend for Taxonomic Status */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
              <span className="font-medium text-slate-500">
                {isEn ? 'Species status:' : 'Статус видов:'}
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-900">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600 inline-block" />
                {isEn ? 'Valid (valid)' : 'Валидные (valid)'}
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-sky-900">
                <span className="h-2.5 w-2.5 rounded-xs bg-sky-600 inline-block" />
                {isEn ? 'Candidate (n. sp.)' : 'Кандидаты (n. sp.)'}
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-900">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-500 inline-block" />
                {isEn ? 'Doubtful (?)' : 'Сомнительные (?)'}
              </span>
            </div>
          </div>

          {/* Single-Species Identification Banner when narrowed down to 1 */}
          {remainingCandidates.length === 1 && rightPanelTab === 'candidates' && (
            <div className="border-b border-emerald-200 bg-emerald-50/70 px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-emerald-800">
                    {isEn
                      ? 'Species identified (1 candidate remaining):'
                      : 'Вид определён (остался 1 кандидат):'}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold italic text-emerald-950">
                      {remainingCandidates[0].species.sp}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        getTaxonVisualStyle(remainingCandidates[0].species.status).badgeClass
                      }`}
                    >
                      {getTaxonVisualStyle(remainingCandidates[0].species.status).badgeLabel}
                    </span>
                    {activeFilterCount > 0 && (
                      <span className="rounded bg-emerald-700 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                        {isEn ? 'Similarity:' : 'Сходство:'}{' '}
                        {remainingCandidates[0].quantitativeSimilarity}% (Δ=
                        {remainingCandidates[0].rmsSigmaDistance.toFixed(2)}σ)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() =>
                    onSelectSpeciesDetail(
                      remainingCandidates[0].species,
                      remainingCandidates[0]
                    )
                  }
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isEn ? 'Species Profile' : 'Профиль вида'}
                </button>
              </div>
            </div>
          )}

          {/* List of Candidates or Discarded */}
          <div className="divide-y divide-slate-200 max-h-[680px] overflow-y-auto">
            {rightPanelTab === 'candidates' ? (
              remainingCandidates.length === 0 ? (
                <div className="p-5 space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                    <div className="text-sm font-bold text-slate-900">
                      {isEn
                        ? `No species strictly matched all ${activeFilterCount} traits simultaneously`
                        : `Ни один вид строго не уложился во все ${activeFilterCount} признаков одновременно`}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {isEn
                        ? 'Specimens from literature descriptions or distant populations often slightly exceed known trait boundaries. Below is the Quantitative Morphological Similarity ranking (combining Gaussian kernel proximity to species means and standardized σ-deviation on mismatched traits).'
                        : 'Особи из литературных описаний или удалённых популяций часто выходят за известные границы отдельных признаков. Ниже приведено ранжирование по количественному индексу морфологического сходства (учитывается близость к среднему вида по совпавшим признакам и величина промаха в единицах σ по несовпавшим).'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => setRightPanelTab('discarded')}
                        className="rounded-lg bg-sky-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 transition-colors cursor-pointer"
                      >
                        {isEn
                          ? `Open Full Quantitative Ranking (${discardedEvaluations.length} species)`
                          : `Открыть полный рейтинг похожих видов (${discardedEvaluations.length})`}
                      </button>
                      <button
                        onClick={onOpenDifferentialCompare}
                        className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-50 transition-colors cursor-pointer"
                      >
                        {isEn
                          ? 'Compare Top-6 Closest in Matrix'
                          : 'Сравнить Топ-6 близких в матрице'}
                      </button>
                    </div>
                  </div>

                  {/* Top-5 Closest Species by Quantitative Similarity Preview */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
                      <span>
                        {isEn
                          ? 'Top-5 Most Similar Species (Quantitative Assessment):'
                          : 'Топ-5 наиболее близких видов (количественная оценка сходства):'}
                      </span>
                      <span className="font-mono text-[11px] font-normal text-slate-500">
                        {isEn ? 'Sorted by % similarity & Δσ' : 'Сортировка по % сходства и Δσ'}
                      </span>
                    </div>

                    {discardedEvaluations.slice(0, 5).map((item, idx) => {
                      const { species, mismatchReasons } = item;
                      const taxonStyle = getTaxonVisualStyle(species.status);
                      const matchedCount = item.exactMatchesCount + item.extrapolatedMatchesCount;
                      const simColor =
                        item.quantitativeSimilarity >= 75
                          ? 'bg-emerald-600 text-white'
                          : item.quantitativeSimilarity >= 55
                          ? 'bg-sky-700 text-white'
                          : 'bg-amber-600 text-white';

                      return (
                        <div
                          key={species.sp}
                          className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:bg-slate-50 transition-colors ${taxonStyle.borderLeft}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-400">
                                  #{idx + 1}
                                </span>
                                <button
                                  onClick={() => onSelectSpeciesDetail(species, item)}
                                  className={`text-sm font-bold italic text-left cursor-pointer ${taxonStyle.nameColor}`}
                                >
                                  {species.sp}
                                </button>
                                <span
                                  className={`rounded px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${simColor}`}
                                >
                                  {isEn ? 'Similarity:' : 'Сходство:'} {item.quantitativeSimilarity}%
                                </span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                                  Δ = {item.rmsSigmaDistance.toFixed(2)}σ
                                </span>
                                <span className="font-mono text-[11px] text-slate-500">
                                  · {isEn ? 'matches:' : 'совпад.:'} {matchedCount}/{activeFilterCount}
                                  {item.nearestSpecimenNum !== null &&
                                    ` · ${isEn ? 'closest spec.' : 'ближ. экз.'} #${item.nearestSpecimenNum}`}
                                </span>
                              </div>

                              {/* Mismatches with quantitative sigma gap */}
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {mismatchReasons.map((m) => {
                                  const isMarginal = m.mismatchSeverity === 'marginal';
                                  const isSevere = m.mismatchSeverity === 'severe';
                                  return (
                                    <div
                                      key={m.traitCode}
                                      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] ${
                                        isMarginal
                                          ? 'border-amber-300 bg-amber-50 text-amber-950'
                                          : isSevere
                                          ? 'border-rose-300 bg-rose-50 text-rose-950'
                                          : 'border-orange-200 bg-orange-50/70 text-orange-950'
                                      }`}
                                    >
                                      <span className="font-bold">{m.traitCode}</span>:
                                      <span>{m.userInputSummary}</span>
                                      <span className="text-slate-500">
                                        ({isEn ? 'tol.' : 'доп.'} {m.speciesExtrapolatedSummary})
                                      </span>
                                      <span
                                        className={`rounded px-1 py-0.2 text-[10px] font-bold ${
                                          isMarginal
                                            ? 'bg-amber-200/80 text-amber-950'
                                            : isSevere
                                            ? 'bg-rose-200/80 text-rose-950'
                                            : 'bg-orange-200/80 text-orange-950'
                                        }`}
                                      >
                                        +{m.sigmaGapFromTolerance.toFixed(2)}σ
                                        {isMarginal
                                          ? isEn
                                            ? ' (near edge)'
                                            : ' (на границе)'
                                          : ''}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => clearSingleTrait(m.traitCode)}
                                        className="ml-0.5 text-slate-400 hover:text-rose-700 font-sans font-bold cursor-pointer"
                                        title={
                                          isEn
                                            ? `Remove filter ${m.traitCode} to test candidate`
                                            : `Убрать фильтр ${m.traitCode} для проверки вида`
                                        }
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <button
                              onClick={() => onSelectSpeciesDetail(species, item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {isEn ? 'Profile' : 'Профиль'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                remainingCandidates.map((item) => {
                  const { species } = item;
                  const hasExtrapolated = item.extrapolatedMatchesCount > 0;
                  const extrapolatedDetails = Object.values(item.details).filter(
                    (d) => d.status === 'extrapolated_match'
                  );
                  const taxonStyle = getTaxonVisualStyle(species.status);

                  return (
                    <div
                      key={species.sp}
                      className={`p-4 hover:bg-slate-50 transition-colors ${taxonStyle.borderLeft}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => onSelectSpeciesDetail(species, item)}
                              className={`text-sm font-bold italic text-left transition-colors cursor-pointer ${taxonStyle.nameColor}`}
                            >
                              {species.sp}
                            </button>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${taxonStyle.badgeClass}`}
                            >
                              {taxonStyle.badgeLabel}
                            </span>
                            {activeFilterCount > 0 && (
                              <span className="rounded bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-950 tabular-nums">
                                {isEn ? 'Similarity:' : 'Сходство:'} {item.quantitativeSimilarity}%
                                {' · '}Δ={item.rmsSigmaDistance.toFixed(2)}σ
                              </span>
                            )}
                            <span className="font-mono text-xs tabular-nums text-slate-500">
                              · n={species.specimenCount} · {isEn ? 'gr.' : 'гр.'} {species.group}
                              {activeFilterCount > 0 &&
                                item.nearestSpecimenNum !== null &&
                                ` · ${isEn ? 'closest' : 'ближ.'} #${item.nearestSpecimenNum}`}
                            </span>
                          </div>

                          {activeFilterCount > 0 && (
                            <div className="mt-1 text-xs">
                              {!hasExtrapolated ? (
                                <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {isEn
                                    ? `Exact match within observed range (${item.exactMatchesCount} of ${activeFilterCount})`
                                    : `Точное попадание в табличный диапазон (${item.exactMatchesCount} из ${activeFilterCount})`}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {isEn
                                    ? `Matched via small-sample tolerance (n=${species.specimenCount}) on ${item.extrapolatedMatchesCount} trait(s)`
                                    : `С учётом поправки на малую выборку (n=${species.specimenCount}) по ${item.extrapolatedMatchesCount} призн.`}
                                </span>
                              )}
                            </div>
                          )}

                          {extrapolatedDetails.length > 0 && (
                            <div className="mt-1.5 space-y-1 text-[11px] font-mono text-amber-900 bg-amber-50/70 rounded px-2.5 py-1.5 border border-amber-200/70">
                              {extrapolatedDetails.map((d) => (
                                <div key={d.traitCode}>
                                  <strong>{d.traitCode}</strong>:{' '}
                                  {isEn ? 'entered' : 'введено'} {d.userInputSummary} ·{' '}
                                  {isEn ? 'raw' : 'в таблице'} {d.speciesRawSummary} →{' '}
                                  {isEn ? 'adjusted' : 'с поправкой'} [{d.speciesExtrapolatedSummary}]
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-1.5 font-mono text-[11px] tabular-nums text-slate-500">
                            cr/cs:{' '}
                            {formatTraitNumber(species.traitStats['cr/cs']?.rawMin, 2)}–
                            {formatTraitNumber(species.traitStats['cr/cs']?.rawMax, 2)} · xa/x:{' '}
                            {formatTraitNumber(species.traitStats['xa/x']?.rawMin, 2)}–
                            {formatTraitNumber(species.traitStats['xa/x']?.rawMax, 2)} · A1ser:{' '}
                            {formatTraitNumber(species.traitStats['A1ser']?.rawMin, 0)}–
                            {formatTraitNumber(species.traitStats['A1ser']?.rawMax, 0)}
                          </div>
                        </div>

                        <button
                          onClick={() => onSelectSpeciesDetail(species, item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isEn ? 'Details' : 'Детали'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            ) : discardedEvaluations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isEn
                  ? 'No species eliminated yet. Enter observed trait states/values on the left.'
                  : 'Пока ни один вид не отсеян. Введите значения наблюдаемых признаков слева.'}
              </div>
            ) : (
              discardedEvaluations.map((item, idx) => {
                const { species, mismatchReasons } = item;
                const taxonStyle = getTaxonVisualStyle(species.status);
                const matchedCount = item.exactMatchesCount + item.extrapolatedMatchesCount;
                const simBadgeClass =
                  item.quantitativeSimilarity >= 75
                    ? 'bg-emerald-700 text-white'
                    : item.quantitativeSimilarity >= 55
                    ? 'bg-sky-700 text-white'
                    : item.quantitativeSimilarity >= 35
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-600 text-white';

                return (
                  <div
                    key={species.sp}
                    className={`p-4 hover:bg-slate-50 transition-colors ${taxonStyle.borderLeft}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <button
                            onClick={() => onSelectSpeciesDetail(species, item)}
                            className={`text-sm font-bold italic text-left cursor-pointer ${taxonStyle.nameColor}`}
                          >
                            {species.sp}
                          </button>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${taxonStyle.badgeClass}`}
                          >
                            {taxonStyle.badgeLabel}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${simBadgeClass}`}
                            title={
                              isEn
                                ? 'Quantitative morphological similarity index across all entered traits'
                                : 'Количественный индекс морфологического сходства по всем введённым признакам'
                            }
                          >
                            {isEn ? 'Similarity:' : 'Сходство:'} {item.quantitativeSimilarity}%
                          </span>
                          <span
                            className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 tabular-nums"
                            title={
                              isEn
                                ? 'Root-mean-square standardized distance in intraspecific SD (σ) units'
                                : 'Среднеквадратичное стандартизованное отклонение в единицах внутривидового σ'
                            }
                          >
                            Δ = {item.rmsSigmaDistance.toFixed(2)}σ
                          </span>
                          <span className="font-mono text-xs tabular-nums text-slate-400">
                            · n={species.specimenCount} · {isEn ? 'gr.' : 'гр.'} {species.group}
                            {item.nearestSpecimenNum !== null &&
                              ` · ${isEn ? 'closest spec.' : 'ближ. экз.'} #${item.nearestSpecimenNum}`}
                          </span>
                        </div>

                        {/* Quantitative Similarity Bar + Matches vs Mismatches Summary */}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full transition-all ${
                                  item.quantitativeSimilarity >= 75
                                    ? 'bg-emerald-600'
                                    : item.quantitativeSimilarity >= 55
                                    ? 'bg-sky-600'
                                    : item.quantitativeSimilarity >= 35
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${item.quantitativeSimilarity}%` }}
                              />
                            </div>
                          </div>
                          <span className="font-medium text-emerald-800">
                            {isEn
                              ? `Matched: ${matchedCount}/${activeFilterCount}`
                              : `Совпало: ${matchedCount}/${activeFilterCount}`}
                          </span>
                          <span className="font-medium text-rose-700 flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {isEn
                                ? `Mismatches: ${mismatchReasons.length}${
                                    item.marginalMismatchesCount > 0
                                      ? ` (${item.marginalMismatchesCount} marginal ≤0.75σ)`
                                      : ''
                                  }`
                                : `Расхождений: ${mismatchReasons.length}${
                                    item.marginalMismatchesCount > 0
                                      ? ` (из них ${item.marginalMismatchesCount} пограничн. ≤0.75σ)`
                                      : ''
                                  }`}
                            </span>
                          </span>
                        </div>

                        {/* Detailed Mismatch Cards with quantitative sigma distance */}
                        <div className="mt-2 space-y-1.5 font-mono text-[11px] text-slate-700">
                          {mismatchReasons.map((m) => {
                            const isMarginal = m.mismatchSeverity === 'marginal';
                            const isSevere = m.mismatchSeverity === 'severe';
                            const trDesc = getTraitDisplayDescription(
                              m.traitCode,
                              traitAnnotations,
                              lang
                            );

                            return (
                              <div
                                key={m.traitCode}
                                className={`rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 ${
                                  isMarginal
                                    ? 'border-amber-300/90 bg-amber-50/70'
                                    : isSevere
                                    ? 'border-rose-200/90 bg-rose-50/60'
                                    : 'border-orange-200/90 bg-orange-50/50'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-bold text-slate-900">{m.traitCode}</span>
                                    <span className="font-sans text-[11px] text-slate-600 truncate max-w-[220px]">
                                      ({trDesc})
                                    </span>
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                        isMarginal
                                          ? 'bg-amber-200/80 text-amber-950'
                                          : isSevere
                                          ? 'bg-rose-200/80 text-rose-950'
                                          : 'bg-orange-200/80 text-orange-950'
                                      }`}
                                    >
                                      +{m.sigmaGapFromTolerance.toFixed(2)}σ{' '}
                                      {isMarginal
                                        ? isEn
                                          ? '· marginal miss'
                                          : '· пограничное откл.'
                                        : isSevere
                                        ? isEn
                                          ? '· strong divergence'
                                          : '· сильное отличие'
                                        : isEn
                                        ? '· moderate dev.'
                                        : '· умеренное откл.'}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {isEn ? 'trait sim:' : 'сходство признака:'} {m.traitSimilarity}%
                                    </span>
                                  </div>
                                  <div className="mt-0.5 text-[11px]">
                                    {isEn ? 'entered:' : 'введено:'}{' '}
                                    <span className="font-bold text-rose-900">
                                      {m.userInputSummary}
                                    </span>{' '}
                                    · {isEn ? 'species raw:' : 'у вида табл.:'} {m.speciesRawSummary}
                                    {m.speciesExtrapolatedSummary !== m.speciesRawSummary
                                      ? ` (${isEn ? 'tol.:' : 'допуск:'} ${m.speciesExtrapolatedSummary})`
                                      : ''}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => clearSingleTrait(m.traitCode)}
                                  className="rounded border border-slate-300 bg-white px-2 py-0.5 font-sans text-[10px] font-medium text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 shrink-0 cursor-pointer"
                                  title={
                                    isEn
                                      ? 'Remove this trait filter to see if the species becomes a candidate'
                                      : 'Сбросить этот признак, чтобы проверить вид без него'
                                  }
                                >
                                  {isEn ? 'Relax ×' : 'Сбросить ×'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectSpeciesDetail(species, item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isEn ? 'Details' : 'Детали'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
