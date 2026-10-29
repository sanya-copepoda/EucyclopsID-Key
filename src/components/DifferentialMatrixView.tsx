import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, BarChart3, Plus, X, Sparkles } from 'lucide-react';
import {
  KeyConfig,
  SpeciesProfile,
  TraitAnnotation,
  TraitDefinition,
  UserTraitFilter,
} from '../types/taxonomy';
import {
  computeExtrapolatedRange,
  computeTraitSeparatingPower,
  formatTraitNumber,
} from '../utils/matrixEngine';
import {
  formatQualitativeStateLabel,
  getTraitDisplayDescription,
} from '../utils/traitAnnotationStore';

interface DifferentialMatrixViewProps {
  speciesList: SpeciesProfile[];
  remainingCandidates: SpeciesProfile[];
  traits: TraitDefinition[];
  traitAnnotations: Record<string, TraitAnnotation>;
  config: KeyConfig;
  activeFilters: Record<string, UserTraitFilter>;
  onSelectSpeciesDetail: (sp: SpeciesProfile) => void;
  onOpenTraitInspector: (trait: TraitDefinition) => void;
}

/**
 * Helper to compute quartiles (Q1, median, Q3) from a sorted numeric array.
 */
function computeQuartiles(sortedVals: number[]): {
  q1: number;
  median: number;
  q3: number;
} {
  const n = sortedVals.length;
  if (n === 0) return { q1: 0, median: 0, q3: 0 };
  if (n === 1) return { q1: sortedVals[0], median: sortedVals[0], q3: sortedVals[0] };

  const quantile = (p: number) => {
    const pos = (n - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedVals[base + 1] !== undefined) {
      return sortedVals[base] + rest * (sortedVals[base + 1] - sortedVals[base]);
    }
    return sortedVals[base];
  };

  return {
    q1: quantile(0.25),
    median: quantile(0.5),
    q3: quantile(0.75),
  };
}

export const DifferentialMatrixView: React.FC<DifferentialMatrixViewProps> = ({
  speciesList,
  remainingCandidates,
  traits,
  traitAnnotations,
  config,
  activeFilters,
  onSelectSpeciesDetail,
  onOpenTraitInspector,
}) => {
  const [comparisonSource, setComparisonSource] = useState<'candidates' | 'group' | 'custom'>(
    remainingCandidates.length >= 2 && remainingCandidates.length <= 15 ? 'candidates' : 'group'
  );
  const [selectedGroup, setSelectedGroup] = useState<string>('arcanus');
  const [customSpNames, setCustomSpNames] = useState<string[]>([
    'E. arcanus',
    'E. arcticus',
    'E. delongi',
    'E. longipes',
    'E. digitatus',
  ]);
  const [showRangeMode, setShowRangeMode] = useState<'both' | 'raw' | 'extrapolated'>('both');
  const [onlySeparating, setOnlySeparating] = useState<boolean>(false);
  const [traitSearch, setTraitSearch] = useState<string>('');

  // Visual distribution plotter state: selected traits for Box-Plot / Histogram comparison
  const [plottedTraitCodes, setPlottedTraitCodes] = useState<string[]>(['cr/cs', 'xa/x']);
  const [chartType, setChartType] = useState<'boxplot' | 'histogram'>('boxplot');
  const [showExtrapolatedInPlot, setShowExtrapolatedInPlot] = useState<boolean>(true);

  const availableGroups = useMemo(() => {
    const grps = new Set<string>();
    for (const sp of speciesList) {
      if (sp.group && sp.group !== '?') grps.add(sp.group);
    }
    return Array.from(grps).sort();
  }, [speciesList]);

  const comparedSpecies = useMemo(() => {
    if (comparisonSource === 'candidates') {
      return remainingCandidates.slice(0, 16);
    }
    if (comparisonSource === 'group') {
      return speciesList.filter((s) => s.group === selectedGroup && s.sp !== '?');
    }
    return speciesList.filter((s) => customSpNames.includes(s.sp));
  }, [comparisonSource, remainingCandidates, speciesList, selectedGroup, customSpNames]);

  const separatingPower = useMemo(() => {
    return computeTraitSeparatingPower(comparedSpecies, traits, config);
  }, [comparedSpecies, traits, config]);

  // Top separating traits among the currently compared species
  const topSeparatingTraits = useMemo(() => {
    return [...traits]
      .sort((a, b) => (separatingPower[b.code] || 0) - (separatingPower[a.code] || 0))
      .slice(0, 8);
  }, [traits, separatingPower]);

  const filteredTraits = useMemo(() => {
    let list = traits.filter((t) => {
      if (traitSearch.trim()) {
        const q = traitSearch.trim().toLowerCase();
        const ann = traitAnnotations[t.code];
        const desc = getTraitDisplayDescription(t.code, ann);
        const text = `${t.code} ${desc} ${ann?.comment || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (onlySeparating && (separatingPower[t.code] || 0) < 35) {
        return false;
      }
      return true;
    });
    if (onlySeparating) {
      list = [...list].sort((a, b) => (separatingPower[b.code] || 0) - (separatingPower[a.code] || 0));
    }
    return list;
  }, [traits, traitSearch, onlySeparating, separatingPower, traitAnnotations]);

  const toggleCustomSpecies = (spName: string) => {
    setCustomSpNames((prev) =>
      prev.includes(spName) ? prev.filter((x) => x !== spName) : [...prev, spName]
    );
  };

  const togglePlottedTrait = (code: string) => {
    setPlottedTraitCodes((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  };

  const autoSelectBestTraitsForPlot = () => {
    const bestQuant = topSeparatingTraits
      .filter((t) => (separatingPower[t.code] || 0) > 0)
      .slice(0, 3)
      .map((t) => t.code);
    if (bestQuant.length > 0) {
      setPlottedTraitCodes(bestQuant);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Дифференциальная матрица и перекрытие диапазонов
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Визуальное сравнение распределений (Box-Plot и гистограммы) и таблица всех признаков между видами-кандидатами.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setComparisonSource('candidates')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  comparisonSource === 'candidates'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Оставшиеся кандидаты ({remainingCandidates.length})
              </button>
              <button
                onClick={() => setComparisonSource('group')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  comparisonSource === 'group'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                По видовой группе
              </button>
              <button
                onClick={() => setComparisonSource('custom')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  comparisonSource === 'custom'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Произвольный набор ({customSpNames.length})
              </button>
            </div>
          </div>
        </div>

        {/* Group or Custom selector */}
        {comparisonSource === 'group' && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="mr-2 text-xs font-medium text-slate-500">Группа видов:</span>
            {availableGroups.map((grp) => (
              <button
                key={grp}
                onClick={() => setSelectedGroup(grp)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedGroup === grp
                    ? 'bg-sky-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        )}

        {comparisonSource === 'custom' && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
            {speciesList
              .filter((s) => s.sp !== '?')
              .map((sp) => {
                const selected = customSpNames.includes(sp.sp);
                return (
                  <button
                    key={sp.sp}
                    onClick={() => toggleCustomSpecies(sp.sp)}
                    className={`px-2.5 py-1 text-xs italic rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-sky-700 text-white font-medium'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sp.sp} (n={sp.specimenCount})
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* NEW COMPONENT: Interactive Visual Distribution Comparison (Box-Plot & Histogram) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-700" />
              <h3 className="text-base font-bold text-slate-900">
                Визуальное сравнение перекрытия диапазонов (Box-Plot и Гистограммы)
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Сравнение квартилей (Q1–Медиана–Q3), эмпирического размаха [Min–Max], индивидуальных особей и расчётного допуска для выбранных признаков.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setChartType('boxplot')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  chartType === 'boxplot'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Box-Plot + Точки особей
              </button>
              <button
                onClick={() => setChartType('histogram')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  chartType === 'histogram'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Гистограмма частот
              </button>
            </div>

            {chartType === 'boxplot' && (
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={showExtrapolatedInPlot}
                  onChange={(e) => setShowExtrapolatedInPlot(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Показать поправку на малую выборку
              </label>
            )}
          </div>
        </div>

        {/* Trait Selector Bar for Plots */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700 mr-1">
              Признаки на графиках ({plottedTraitCodes.length}):
            </span>
            {plottedTraitCodes.map((code) => {
              const desc = getTraitDisplayDescription(code, traitAnnotations[code]);
              return (
                <button
                  key={code}
                  onClick={() => togglePlottedTrait(code)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 transition-colors whitespace-nowrap shrink-0"
                  title="Убрать признак с графика"
                >
                  <span className="truncate max-w-[200px]">{desc}</span>
                  <span className="font-mono text-[10px] text-slate-400">{code}</span>
                  <X className="h-3 w-3 text-slate-300" />
                </button>
              );
            })}

            {/* Dropdown to add any of the 68 traits */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !plottedTraitCodes.includes(e.target.value)) {
                  setPlottedTraitCodes((prev) => [...prev, e.target.value]);
                }
              }}
              className="max-w-xs rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-sky-600 focus:outline-none"
            >
              <option value="">+ Добавить признак на график...</option>
              {traits.map((t) => {
                const desc = getTraitDisplayDescription(t.code, traitAnnotations[t.code]);
                return (
                  <option key={t.code} value={t.code}>
                    {desc} [{t.code}] — разд. {separatingPower[t.code] || 0}%
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={autoSelectBestTraitsForPlot}
              className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              Топ-3 разделяющих признака
            </button>
          </div>
        </div>

        {/* Plotted Traits Grid */}
        {plottedTraitCodes.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Выберите один или несколько признаков выше (или нажмите «График» в таблице ниже), чтобы визуально сравнить перекрытие диапазонов.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {plottedTraitCodes.map((code) => {
              const trait = traits.find((t) => t.code === code);
              if (!trait) return null;
              const ann = traitAnnotations[trait.code];
              const sepScore = separatingPower[trait.code] || 0;
              const userEnteredVal = activeFilters[trait.code]?.numericValue;

              // Gather species data for this trait
              const speciesRows = comparedSpecies.map((sp) => {
                const st = sp.traitStats[trait.code];
                const { extMin, extMax } = computeExtrapolatedRange(
                  st,
                  trait,
                  sp.group,
                  config
                );
                const quartiles = computeQuartiles(st?.values || []);
                return {
                  sp,
                  st,
                  extMin,
                  extMax,
                  quartiles,
                };
              });

              // Compute axis min/max across compared species
              let plotMin = Infinity;
              let plotMax = -Infinity;
              for (const row of speciesRows) {
                if (!row.st || row.st.n === 0) continue;
                const lo =
                  showExtrapolatedInPlot && row.extMin !== null
                    ? Math.min(row.st.rawMin ?? 0, row.extMin)
                    : row.st.rawMin ?? 0;
                const hi =
                  showExtrapolatedInPlot && row.extMax !== null
                    ? Math.max(row.st.rawMax ?? 0, row.extMax)
                    : row.st.rawMax ?? 0;
                if (lo < plotMin) plotMin = lo;
                if (hi > plotMax) plotMax = hi;
              }
              if (userEnteredVal !== null && userEnteredVal !== undefined) {
                if (userEnteredVal < plotMin) plotMin = userEnteredVal;
                if (userEnteredVal > plotMax) plotMax = userEnteredVal;
              }
              if (!Number.isFinite(plotMin) || !Number.isFinite(plotMax)) {
                plotMin = trait.globalMin;
                plotMax = trait.globalMax;
              }
              if (plotMin === plotMax) {
                plotMin -= 1;
                plotMax += 1;
              }
              const plotSpan = Math.max(0.001, plotMax - plotMin);

              // Build histogram bins if chartType === 'histogram' and trait is quantitative
              const numBins = 8;
              const binWidth = plotSpan / numBins;

              return (
                <div
                  key={trait.code}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => onOpenTraitInspector(trait)}
                            className="text-left text-sm font-bold text-slate-900 hover:text-sky-700 transition-colors"
                          >
                            {getTraitDisplayDescription(trait.code, ann)}
                          </button>
                          <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                            {trait.code}
                          </span>
                          <span className="font-mono text-xs font-medium text-emerald-700">
                            · разделение: {sepScore}%
                          </span>
                        </div>
                        {ann?.comment?.trim() && (
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {ann.comment}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => togglePlottedTrait(trait.code)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        title="Закрыть график признака"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Scale Header */}
                    {trait.kind !== 'qualitative' && chartType === 'boxplot' && (
                      <div className="mt-2 flex items-center justify-between font-mono text-[10px] tabular-nums text-slate-400 px-1">
                        <span>Min шкалы: {formatTraitNumber(plotMin, trait.decimals)}</span>
                        <span>
                          Середина: {formatTraitNumber(plotMin + plotSpan / 2, trait.decimals)}
                        </span>
                        <span>Max шкалы: {formatTraitNumber(plotMax, trait.decimals)}</span>
                      </div>
                    )}

                    {/* Rows per species */}
                    <div className="mt-2.5 space-y-2">
                      {speciesRows.map(({ sp, st, extMin, extMax, quartiles }) => {
                        if (!st || st.n === 0) {
                          return (
                            <div
                              key={sp.sp}
                              className="grid grid-cols-12 items-center gap-2 text-xs py-1"
                            >
                              <div className="col-span-4 truncate italic text-slate-500">
                                {sp.sp} (n=0)
                              </div>
                              <div className="col-span-8 text-[11px] font-mono text-slate-400">
                                нет данных (?)
                              </div>
                            </div>
                          );
                        }

                        // Qualitative trait visualization (State Frequency Bar)
                        if (trait.kind === 'qualitative') {
                          return (
                            <div
                              key={sp.sp}
                              className="grid grid-cols-12 items-center gap-2 rounded bg-white px-2.5 py-1.5 border border-slate-200/70"
                            >
                              <div className="col-span-4 flex items-baseline justify-between gap-1 pr-1">
                                <button
                                  onClick={() => onSelectSpeciesDetail(sp)}
                                  className="truncate text-left text-xs font-semibold italic text-slate-900 hover:text-sky-700"
                                >
                                  {sp.sp}
                                </button>
                                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                  n={st.n}
                                </span>
                              </div>
                              <div className="col-span-8 flex items-center gap-1.5 font-mono text-[11px]">
                                {trait.discreteStates.map((sVal) => {
                                  const cnt = st.stateCounts[sVal] || 0;
                                  const pct = Math.round((cnt / st.n) * 100);
                                  return (
                                    <div
                                      key={sVal}
                                      className={`flex-1 rounded px-2 py-1 text-center tabular-nums border ${
                                        cnt > 0
                                          ? 'border-sky-600/40 bg-sky-100 text-sky-950 font-semibold'
                                          : 'border-slate-100 bg-slate-50 text-slate-300'
                                      }`}
                                    >
                                      {formatQualitativeStateLabel(trait.code, sVal)}: {pct}% ({cnt})
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        // Quantitative trait: Box-Plot vs Histogram
                        if (chartType === 'boxplot') {
                          const rMin = st.rawMin ?? 0;
                          const rMax = st.rawMax ?? 0;
                          const eMin = extMin ?? rMin;
                          const eMax = extMax ?? rMax;

                          const rawLeft = Math.max(
                            0,
                            Math.min(100, ((rMin - plotMin) / plotSpan) * 100)
                          );
                          const rawRight = Math.max(
                            0,
                            Math.min(100, ((rMax - plotMin) / plotSpan) * 100)
                          );
                          const rawWidth = Math.max(0.8, rawRight - rawLeft);

                          const q1Left = Math.max(
                            0,
                            Math.min(100, ((quartiles.q1 - plotMin) / plotSpan) * 100)
                          );
                          const q3Right = Math.max(
                            0,
                            Math.min(100, ((quartiles.q3 - plotMin) / plotSpan) * 100)
                          );
                          const boxWidth = Math.max(1.2, q3Right - q1Left);

                          const medPos = Math.max(
                            0,
                            Math.min(100, ((quartiles.median - plotMin) / plotSpan) * 100)
                          );

                          const extLeft = Math.max(
                            0,
                            Math.min(100, ((eMin - plotMin) / plotSpan) * 100)
                          );
                          const extRight = Math.max(
                            0,
                            Math.min(100, ((eMax - plotMin) / plotSpan) * 100)
                          );
                          const extWidth = Math.max(0.8, extRight - extLeft);

                          const userLinePos =
                            userEnteredVal !== null && userEnteredVal !== undefined
                              ? Math.max(
                                  0,
                                  Math.min(100, ((userEnteredVal - plotMin) / plotSpan) * 100)
                                )
                              : null;

                          return (
                            <div
                              key={sp.sp}
                              className="grid grid-cols-12 items-center gap-2 rounded bg-white px-2.5 py-1.5 border border-slate-200/70"
                            >
                              <div className="col-span-4 flex items-baseline justify-between gap-1 pr-1">
                                <button
                                  onClick={() => onSelectSpeciesDetail(sp)}
                                  className="truncate text-left text-xs font-semibold italic text-slate-900 hover:text-sky-700"
                                >
                                  {sp.sp}
                                </button>
                                <span
                                  className={`font-mono text-[10px] tabular-nums shrink-0 ${
                                    st.n <= 3 ? 'text-amber-700 font-semibold' : 'text-slate-400'
                                  }`}
                                >
                                  n={st.n}
                                </span>
                              </div>

                              {/* Box-Plot Canvas Track */}
                              <div className="col-span-5 relative h-6 rounded bg-slate-100 overflow-hidden">
                                {/* Extrapolated range band */}
                                {showExtrapolatedInPlot && (
                                  <div
                                    className="absolute top-1 bottom-1 rounded bg-sky-200/70 border border-dashed border-sky-400"
                                    style={{ left: `${extLeft}%`, width: `${extWidth}%` }}
                                    title={`Расчётный диапазон с поправкой (n=${st.n}): ${formatTraitNumber(
                                      eMin,
                                      trait.decimals
                                    )}–${formatTraitNumber(eMax, trait.decimals)}`}
                                  />
                                )}

                                {/* Whisker line [rawMin, rawMax] */}
                                <div
                                  className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-slate-700"
                                  style={{ left: `${rawLeft}%`, width: `${rawWidth}%` }}
                                />
                                {/* Whisker caps */}
                                <div
                                  className="absolute top-1.5 bottom-1.5 w-0.5 bg-slate-800"
                                  style={{ left: `${rawLeft}%` }}
                                />
                                <div
                                  className="absolute top-1.5 bottom-1.5 w-0.5 bg-slate-800"
                                  style={{ left: `${rawRight}%` }}
                                />

                                {/* IQR Box [Q1, Q3] */}
                                <div
                                  className="absolute top-1 bottom-1 rounded-xs bg-sky-600/85 border border-sky-900"
                                  style={{ left: `${q1Left}%`, width: `${boxWidth}%` }}
                                  title={`Q1: ${formatTraitNumber(
                                    quartiles.q1,
                                    trait.decimals
                                  )}, Медиана: ${formatTraitNumber(
                                    quartiles.median,
                                    trait.decimals
                                  )}, Q3: ${formatTraitNumber(quartiles.q3, trait.decimals)}`}
                                />

                                {/* Median line */}
                                <div
                                  className="absolute top-0.5 bottom-0.5 w-0.5 bg-amber-300 z-10"
                                  style={{ left: `${medPos}%` }}
                                />

                                {/* Individual specimen dots */}
                                {st.values.map((v, i) => {
                                  const pos = Math.max(
                                    0,
                                    Math.min(100, ((v - plotMin) / plotSpan) * 100)
                                  );
                                  return (
                                    <div
                                      key={i}
                                      className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border border-slate-900 z-10"
                                      style={{ left: `${pos}%` }}
                                      title={`Особь: ${formatTraitNumber(v, trait.decimals)}`}
                                    />
                                  );
                                })}

                                {/* User entered value vertical probe */}
                                {userLinePos !== null && (
                                  <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-rose-600 z-20"
                                    style={{ left: `${userLinePos}%` }}
                                    title={`Введено в ключе: ${userEnteredVal}`}
                                  />
                                )}
                              </div>

                              {/* Numeric Summary */}
                              <div className="col-span-3 font-mono text-[10px] tabular-nums text-right text-slate-700 whitespace-nowrap">
                                <span className="font-semibold text-slate-900">
                                  {rMin === rMax
                                    ? formatTraitNumber(rMin, trait.decimals)
                                    : `${formatTraitNumber(rMin, trait.decimals)}–${formatTraitNumber(
                                        rMax,
                                        trait.decimals
                                      )}`}
                                </span>
                                {showExtrapolatedInPlot && (eMin !== rMin || eMax !== rMax) && (
                                  <span className="block text-[9px] text-sky-700">
                                    [{formatTraitNumber(eMin, trait.decimals)}–
                                    {formatTraitNumber(eMax, trait.decimals)}]
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Quantitative Histogram mode (8 bins across plotMin..plotMax)
                        const binCounts = new Array(numBins).fill(0);
                        for (const v of st.values) {
                          const idx = Math.min(
                            numBins - 1,
                            Math.max(0, Math.floor((v - plotMin) / binWidth))
                          );
                          binCounts[idx]++;
                        }
                        const maxBinCount = Math.max(1, ...binCounts);

                        return (
                          <div
                            key={sp.sp}
                            className="grid grid-cols-12 items-center gap-2 rounded bg-white px-2.5 py-1.5 border border-slate-200/70"
                          >
                            <div className="col-span-4 flex items-baseline justify-between gap-1 pr-1">
                              <button
                                onClick={() => onSelectSpeciesDetail(sp)}
                                className="truncate text-left text-xs font-semibold italic text-slate-900 hover:text-sky-700"
                              >
                                {sp.sp}
                              </button>
                              <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                n={st.n}
                              </span>
                            </div>

                            <div className="col-span-5 grid grid-cols-8 items-end gap-0.5 h-7 bg-slate-100 p-0.5 rounded">
                              {binCounts.map((cnt, bIdx) => {
                                const heightPct = cnt > 0 ? Math.max(22, Math.round((cnt / maxBinCount) * 100)) : 0;
                                const bStart = plotMin + bIdx * binWidth;
                                const bEnd = bStart + binWidth;
                                return (
                                  <div
                                    key={bIdx}
                                    className="h-full flex items-end justify-center bg-white/50"
                                    title={`Интервал ${formatTraitNumber(
                                      bStart,
                                      trait.decimals
                                    )}–${formatTraitNumber(bEnd, trait.decimals)}: ${cnt} экз.`}
                                  >
                                    {cnt > 0 && (
                                      <div
                                        className="w-full bg-sky-600 rounded-t-xs"
                                        style={{ height: `${heightPct}%` }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="col-span-3 font-mono text-[10px] tabular-nums text-right text-slate-600">
                              ср. {formatTraitNumber(st.mean, 2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend footer */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-2 text-[10px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-2.5 w-3 rounded-xs bg-sky-600 border border-sky-900" />
                        Q1–Q3 (медиана жёлтая)
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-0.5 w-3 bg-slate-800" />
                        Min–Max
                      </span>
                      {showExtrapolatedInPlot && (
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-2.5 w-3 rounded-xs bg-sky-200 border border-dashed border-sky-400" />
                          Допуск на малую выборку
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Matrix Table Controls & Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlySeparating}
                onChange={(e) => setOnlySeparating(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Показать только разделяющие признаки и сортировать по силе разделения
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
              <button
                onClick={() => setShowRangeMode('both')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  showRangeMode === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Табличный + Расчётный
              </button>
              <button
                onClick={() => setShowRangeMode('raw')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  showRangeMode === 'raw' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Только табличный Min–Max
              </button>
              <button
                onClick={() => setShowRangeMode('extrapolated')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  showRangeMode === 'extrapolated' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Только с поправкой на n
              </button>
            </div>
            <input
              type="text"
              value={traitSearch}
              onChange={(e) => setTraitSearch(e.target.value)}
              placeholder="Фильтр признака..."
              className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-sky-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 py-3 px-4 font-semibold text-slate-900 border-r border-slate-200 min-w-[250px]">
                  Признак и расшифровка
                </th>
                <th className="py-3 px-3 font-semibold text-slate-600 border-r border-slate-200 whitespace-nowrap">
                  Сила разделения / График
                </th>
                {comparedSpecies.map((sp) => (
                  <th
                    key={sp.sp}
                    className="py-3 px-3.5 font-semibold text-slate-900 border-r border-slate-100 min-w-[140px]"
                  >
                    <button
                      onClick={() => onSelectSpeciesDetail(sp)}
                      className="text-left hover:text-sky-700 transition-colors"
                    >
                      <div className="italic font-bold whitespace-nowrap">{sp.sp}</div>
                      <div className="mt-0.5 font-normal text-[11px] text-slate-500 font-mono tabular-nums whitespace-nowrap">
                        n={sp.specimenCount} · {sp.group}
                      </div>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTraits.map((trait) => {
                const sepScore = separatingPower[trait.code] || 0;
                const isHighDiagnostic = sepScore >= 55;
                const isActiveInKey = Boolean(activeFilters[trait.code]);
                const isPlotted = plottedTraitCodes.includes(trait.code);
                const ann = traitAnnotations[trait.code];

                return (
                  <tr
                    key={trait.code}
                    className={`hover:bg-slate-50/80 ${
                      isActiveInKey ? 'bg-sky-50/40' : isHighDiagnostic ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-white py-2.5 px-4 border-r border-slate-200 max-w-[320px]">
                      <button
                        onClick={() => onOpenTraitInspector(trait)}
                        className="w-full text-left group"
                      >
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-sky-700 leading-snug">
                          {getTraitDisplayDescription(trait.code, ann)}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                            {trait.code}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-normal text-slate-400">
                            {ann?.imageUrl && <ImageIcon className="h-3 w-3 text-sky-600" />}
                            {trait.kind === 'qualitative'
                              ? 'качеств.'
                              : trait.kind === 'meristic'
                              ? 'счёт'
                              : 'индекс'}
                          </span>
                        </div>
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums border-r border-slate-200 whitespace-nowrap">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full ${
                                sepScore >= 60
                                  ? 'bg-emerald-600'
                                  : sepScore >= 30
                                  ? 'bg-sky-600'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${sepScore}%` }}
                            />
                          </div>
                          <span
                            className={
                              sepScore >= 60
                                ? 'font-semibold text-emerald-700'
                                : 'text-slate-500'
                            }
                          >
                            {sepScore}%
                          </span>
                        </div>
                        <button
                          onClick={() => togglePlottedTrait(trait.code)}
                          className={`rounded px-2 py-0.5 font-sans text-[11px] font-medium transition-colors ${
                            isPlotted
                              ? 'bg-sky-700 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isPlotted ? 'На графике' : '+ График'}
                        </button>
                      </div>
                    </td>
                    {comparedSpecies.map((sp) => {
                      const st = sp.traitStats[trait.code];
                      if (!st || st.n === 0) {
                        return (
                          <td
                            key={sp.sp}
                            className="py-2.5 px-3.5 font-mono text-slate-300 border-r border-slate-100"
                          >
                            ?
                          </td>
                        );
                      }

                      if (trait.kind === 'qualitative') {
                        const isPoly = st.stateSet.length > 1;
                        return (
                          <td
                            key={sp.sp}
                            className="py-2.5 px-3.5 font-mono tabular-nums text-slate-900 border-r border-slate-100"
                          >
                            <span className="font-semibold">{st.stateSet.join(' / ')}</span>
                            {isPoly && (
                              <div className="text-[10px] text-amber-700">
                                изменчив ({st.stateSet.map((s) => `${s}:${st.stateCounts[s]}`).join(', ')})
                              </div>
                            )}
                          </td>
                        );
                      }

                      const { extMin, extMax } = computeExtrapolatedRange(
                        st,
                        trait,
                        sp.group,
                        config
                      );
                      const rawStr =
                        st.rawMin === st.rawMax
                          ? formatTraitNumber(st.rawMin, trait.decimals)
                          : `${formatTraitNumber(st.rawMin, trait.decimals)}–${formatTraitNumber(
                              st.rawMax,
                              trait.decimals
                            )}`;
                      const extStr =
                        extMin === extMax
                          ? formatTraitNumber(extMin, trait.decimals)
                          : `${formatTraitNumber(extMin, trait.decimals)}–${formatTraitNumber(
                              extMax,
                              trait.decimals
                            )}`;

                      return (
                        <td
                          key={sp.sp}
                          className="py-2.5 px-3.5 font-mono tabular-nums border-r border-slate-100 whitespace-nowrap"
                        >
                          {showRangeMode === 'raw' && (
                            <span className="text-slate-900">{rawStr}</span>
                          )}
                          {showRangeMode === 'extrapolated' && (
                            <span className="font-medium text-sky-900">{extStr}</span>
                          )}
                          {showRangeMode === 'both' && (
                            <div>
                              <div className="font-medium text-slate-900">{rawStr}</div>
                              {rawStr !== extStr && (
                                <div className="text-[10px] text-sky-700">
                                  допуск: [{extStr}]
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
