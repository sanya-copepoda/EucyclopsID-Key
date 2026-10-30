import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, HelpCircle, MapPin, Image as ImageIcon } from 'lucide-react';
import {
  KeyConfig,
  SpeciesCandidateEvaluation,
  SpeciesProfile,
  SpecimenRecord,
  TraitAnnotation,
  TraitDefinition,
  UserTraitFilter,
} from '../types/taxonomy';
import {
  computeExtrapolatedRange,
  formatTraitNumber,
} from '../utils/matrixEngine';
import {
  formatQualitativeStateLabel,
  getTraitDisplayComment,
  getTraitDisplayDescription,
} from '../utils/traitAnnotationStore';
import { SpeciesDistributionMap } from './SpeciesDistributionMap';
import { getAnatomicalSectionLabel, translateRegion, useLanguage } from '../utils/i18n';

interface SpeciesDetailModalProps {
  species: SpeciesProfile;
  allSpecies?: SpeciesProfile[];
  evaluation?: SpeciesCandidateEvaluation;
  traits: TraitDefinition[];
  traitAnnotations: Record<string, TraitAnnotation>;
  config: KeyConfig;
  activeFilters: Record<string, UserTraitFilter>;
  onClose: () => void;
  onOpenTraitInspector: (trait: TraitDefinition) => void;
  onLoadSpecimenIntoKey: (specimen: SpecimenRecord, mode: 'all' | 'diagnostic8') => void;
}

export const SpeciesDetailModal: React.FC<SpeciesDetailModalProps> = ({
  species,
  allSpecies = [],
  evaluation,
  traits,
  traitAnnotations,
  config,
  activeFilters,
  onClose,
  onOpenTraitInspector,
  onLoadSpecimenIntoKey,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const [activeTab, setActiveTab] = useState<'traits' | 'specimens'>('traits');
  const [showMapInProfile, setShowMapInProfile] = useState<boolean>(true);
  const [selectedSpecimenNum, setSelectedSpecimenNum] = useState<number | null>(null);
  const [traitFilter, setTraitFilter] = useState<'all' | 'active' | 'polymorphic' | 'quantitative'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const geocodedCount = species.specimens.filter(
    (s) => s.lat !== null && s.lon !== null
  ).length;

  const filteredTraits = traits.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const desc = getTraitDisplayDescription(t.code, traitAnnotations, lang);
      const comment = getTraitDisplayComment(t.code, traitAnnotations, lang);
      const text = `${t.code} ${desc} ${comment}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    const st = species.traitStats[t.code];
    if (traitFilter === 'active') {
      return Boolean(activeFilters[t.code]);
    }
    if (traitFilter === 'polymorphic') {
      return t.kind === 'qualitative' && st && st.stateSet.length > 1;
    }
    if (traitFilter === 'quantitative') {
      return t.kind !== 'qualitative';
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-xl font-bold italic text-slate-900">{species.sp}</h2>
              {evaluation && Object.keys(activeFilters).length > 0 && (
                <span className="rounded bg-sky-700 px-2 py-0.5 font-mono text-xs font-bold text-white">
                  {isEn ? 'Similarity:' : 'Сходство:'} {evaluation.quantitativeSimilarity}% · Δ=
                  {evaluation.rmsSigmaDistance.toFixed(2)}σ
                </span>
              )}
              <span className="text-xs text-slate-500">
                {isEn
                  ? `group ${species.group} · status: ${species.status} · sample n = ${species.specimenCount} spec. · key: ${species.inKey ? '+' : '−'}`
                  : `группа ${species.group} · статус: ${species.status} · выборка n = ${species.specimenCount} экз. · key: ${species.inKey ? '+' : '−'}`}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {isEn ? 'Regions' : 'Регионы'} ({species.regions.length}):{' '}
              {species.regions.map((r) => translateRegion(r, lang)).join(', ') || '—'}
              {species.inVivoColors.length > 0 &&
                ` · ${isEn ? 'In vivo color' : 'Прижизненная окраска'}: ${species.inVivoColors.join(', ')}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            aria-label={isEn ? 'Close' : 'Закрыть'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-navigation bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setActiveTab('traits')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'traits'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isEn ? `Profile of ${traits.length} Traits` : `Профиль ${traits.length} признаков`}
              </button>
              <button
                onClick={() => setActiveTab('specimens')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'specimens'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-sky-700" />
                {isEn
                  ? `Distribution Map & Specimens (${species.specimenCount})`
                  : `Карта ареала и особи (${species.specimenCount})`}
              </button>
            </div>

            {activeTab === 'traits' && (
              <button
                type="button"
                onClick={() => setShowMapInProfile((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  showMapInProfile
                    ? 'border-sky-300 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-sky-700" />
                {showMapInProfile
                  ? isEn
                    ? `Hide map (${geocodedCount} pts)`
                    : `Скрыть карту (${geocodedCount} точек)`
                  : isEn
                  ? `Show map (${geocodedCount} pts)`
                  : `Показать карту (${geocodedCount} точек)`}
              </button>
            )}
          </div>

          {activeTab === 'traits' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => setTraitFilter('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    traitFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn ? `All (${traits.length})` : `Все (${traits.length})`}
                </button>
                <button
                  onClick={() => setTraitFilter('active')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    traitFilter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn
                    ? `Entered in Key (${Object.keys(activeFilters).length})`
                    : `Введённые в ключе (${Object.keys(activeFilters).length})`}
                </button>
                <button
                  onClick={() => setTraitFilter('polymorphic')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    traitFilter === 'polymorphic' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn ? 'Polymorphic Qualitative' : 'Изменчивые качественные'}
                </button>
                <button
                  onClick={() => setTraitFilter('quantitative')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    traitFilter === 'quantitative' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn ? 'Quantitative & Indices' : 'Количественные и индексы'}
                </button>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? 'Search trait...' : 'Поиск признака...'}
                className="w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-sky-600 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'traits' && showMapInProfile && (
            <SpeciesDistributionMap
              species={species}
              allSpecies={allSpecies}
              selectedSpecimenNum={selectedSpecimenNum}
              onSelectSpecimen={(spec) => setSelectedSpecimenNum(spec?.num ?? null)}
              onLoadSpecimenIntoKey={(spec, mode) => {
                onLoadSpecimenIntoKey(spec, mode);
                onClose();
              }}
            />
          )}

          {activeTab === 'traits' ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">
                      {isEn ? 'Trait & Description' : 'Признак и расшифровка'}
                    </th>
                    <th className="py-2.5 px-3 font-semibold">
                      {isEn ? 'Section / Type' : 'Отдел / Тип'}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">n</th>
                    <th className="py-2.5 px-3 font-semibold">
                      {isEn ? 'Empirical Values (Min–Max / States)' : 'Табличные значения (Min–Max / Состояния)'}
                    </th>
                    <th className="py-2.5 px-3 font-semibold">
                      {isEn ? 'Mean ± SD' : 'Среднее ± SD'}
                    </th>
                    <th className="py-2.5 px-3 font-semibold">
                      {isEn
                        ? `Extrapolated Tolerance (n=${species.specimenCount})`
                        : `Расчётный допуск (с учётом n=${species.specimenCount})`}
                    </th>
                    <th className="py-2.5 px-3 font-semibold">
                      {isEn ? 'Key Status' : 'Статус в ключе'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTraits.map((trait) => {
                    const st = species.traitStats[trait.code];
                    const evalDetail = evaluation?.details[trait.code];
                    const ann = traitAnnotations[trait.code];
                    const desc = getTraitDisplayDescription(trait.code, traitAnnotations, lang);
                    const comment = getTraitDisplayComment(trait.code, traitAnnotations, lang);
                    const { extMin, extMax } = computeExtrapolatedRange(
                      st,
                      trait,
                      species.group,
                      config
                    );

                    const isPolymorphic =
                      trait.kind === 'qualitative' && st && st.stateSet.length > 1;

                    return (
                      <tr
                        key={trait.code}
                        className={`hover:bg-slate-50/80 ${
                          evalDetail?.status === 'mismatch'
                            ? 'bg-rose-50/50'
                            : evalDetail?.status === 'extrapolated_match'
                            ? 'bg-amber-50/40'
                            : evalDetail?.status === 'exact_match'
                            ? 'bg-emerald-50/30'
                            : ''
                        }`}
                      >
                        <td className="py-2 px-3">
                          <button
                            onClick={() => onOpenTraitInspector(trait)}
                            className="text-left group"
                          >
                            <div className="text-xs font-semibold text-slate-900 group-hover:text-sky-700 leading-snug">
                              {desc}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                                {trait.code}
                              </span>
                              {ann?.imageUrl && <ImageIcon className="h-3 w-3 text-sky-600" />}
                              {comment && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[220px]">
                                  · {comment}
                                </span>
                              )}
                            </div>
                          </button>
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          <div>{getAnatomicalSectionLabel(trait.section, lang).split(' ')[0]}</div>
                          <div className="text-[10px] text-slate-400">
                            {trait.kind === 'qualitative'
                              ? isEn
                                ? 'Qualitative'
                                : 'Качественный'
                              : trait.kind === 'meristic'
                              ? isEn
                                ? 'Meristic'
                                : 'Счётный'
                              : isEn
                              ? 'Index'
                              : 'Индекс'}
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-right text-slate-600">
                          {st?.n ?? 0}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-900">
                          {!st || st.n === 0 ? (
                            <span className="text-slate-400">
                              {isEn ? '? (no data)' : '? (нет данных)'}
                            </span>
                          ) : trait.kind === 'qualitative' ? (
                            <div>
                              <span className="font-semibold">
                                {st.stateSet
                                  .map((val) => formatQualitativeStateLabel(trait.code, val, lang))
                                  .join(' / ')}
                              </span>
                              {isPolymorphic && (
                                <span className="ml-2 text-slate-500">
                                  [{isEn ? 'polymorphic' : 'полиморфный'}:{' '}
                                  {st.stateSet
                                    .map((val) => `${val} (${st.stateCounts[val]}/${st.n})`)
                                    .join(', ')}
                                  ]
                                </span>
                              )}
                            </div>
                          ) : st.rawMin === st.rawMax ? (
                            <span>{formatTraitNumber(st.rawMin, trait.decimals)}</span>
                          ) : (
                            <span>
                              {formatTraitNumber(st.rawMin, trait.decimals)} –{' '}
                              {formatTraitNumber(st.rawMax, trait.decimals)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {!st || st.n === 0 || trait.kind === 'qualitative' ? (
                            '—'
                          ) : (
                            <>
                              {formatTraitNumber(st.mean, 2)}
                              {st.sampleSd !== null
                                ? ` ± ${st.sampleSd.toFixed(2)}`
                                : isEn
                                ? ' (pooled SD)'
                                : ' (SD родовая)'}
                            </>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                          {!st || st.n === 0 ? (
                            '—'
                          ) : trait.kind === 'qualitative' ? (
                            <span>
                              {isEn ? 'Matches states:' : 'Учитывается при выборе:'}{' '}
                              {st.stateSet.join(isEn ? ' or ' : ' или ')}
                            </span>
                          ) : extMin === extMax ? (
                            <span>{formatTraitNumber(extMin, trait.decimals)}</span>
                          ) : (
                            <span className="font-medium text-sky-900">
                              {formatTraitNumber(extMin, trait.decimals)} –{' '}
                              {formatTraitNumber(extMax, trait.decimals)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {!evalDetail ? (
                            <span className="text-slate-400">{isEn ? 'Not set' : 'Не задан'}</span>
                          ) : evalDetail.status === 'exact_match' ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />{' '}
                              {isEn ? 'Within empirical range' : 'В табличном диапазоне'} (
                              {evalDetail.userInputSummary})
                            </span>
                          ) : evalDetail.status === 'extrapolated_match' ? (
                            <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                              <AlertTriangle className="h-3.5 w-3.5" />{' '}
                              {isEn ? 'Within extrapolated range' : 'В расширенном диапазоне'} (
                              {evalDetail.userInputSummary})
                            </span>
                          ) : evalDetail.status === 'missing_data' ? (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <HelpCircle className="h-3.5 w-3.5" />{' '}
                              {isEn ? 'Missing data for species' : 'Нет данных у вида'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                              ✕ {isEn ? 'Mismatch (entered:' : 'Не совпадает (введено:'}{' '}
                              {evalDetail.userInputSummary}, +{evalDetail.sigmaGapFromTolerance.toFixed(2)}σ,{' '}
                              {evalDetail.traitSimilarity}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              <SpeciesDistributionMap
                species={species}
                allSpecies={allSpecies}
                selectedSpecimenNum={selectedSpecimenNum}
                onSelectSpecimen={(spec) => setSelectedSpecimenNum(spec?.num ?? null)}
                onLoadSpecimenIntoKey={(spec, mode) => {
                  onLoadSpecimenIntoKey(spec, mode);
                  onClose();
                }}
              />

              <p className="text-xs text-slate-600">
                {isEn ? (
                  <>
                    Below are all specimens of <strong className="italic">{species.sp}</strong> from
                    the reference matrix. Click any specimen&apos;s coordinates to highlight its pin
                    on the map above, or load its measurements into the key.
                  </>
                ) : (
                  <>
                    Ниже перечислены все особи вида <strong className="italic">{species.sp}</strong>{' '}
                    из исходной матрицы. Нажмите на координаты особи, чтобы сфокусировать её точку на
                    карте выше, или подставьте промеры особи в определитель.
                  </>
                )}
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="py-2.5 px-3 font-semibold">num / NN</th>
                      <th className="py-2.5 px-3 font-semibold">
                        {isEn ? 'Region / District' : 'Регион / Район'}
                      </th>
                      <th className="py-2.5 px-3 font-semibold">
                        {isEn ? 'Waterbody' : 'Водоем'}
                      </th>
                      <th className="py-2.5 px-3 font-semibold">
                        {isEn ? 'Coordinates (N, E)' : 'Координаты (N, E)'}
                      </th>
                      <th className="py-2.5 px-3 font-semibold">
                        {isEn ? 'Date / Collector (leg.)' : 'Дата / Сборщик (leg.)'}
                      </th>
                      <th className="py-2.5 px-3 font-semibold">
                        {isEn
                          ? 'Key Indices (cr/cs · xa/x · A1ser)'
                          : 'Ключевые индексы (cr/cs · xa/x · A1ser)'}
                      </th>
                      <th className="py-2.5 px-3 font-semibold text-right">
                        {isEn ? 'Test in Key' : 'Тест в определителе'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {species.specimens.map((spec) => {
                      const isSelectedOnMap = selectedSpecimenNum === spec.num;
                      return (
                        <tr
                          key={spec.num}
                          className={`transition-colors ${
                            isSelectedOnMap ? 'bg-sky-50/90' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-slate-900">
                            #{spec.num}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {translateRegion(spec.region, lang)}
                            {spec.district && spec.district !== '-' ? ` · ${spec.district}` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {spec.waterbody}
                            {spec.inVivoColor ? ` (${spec.inVivoColor})` : ''}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            {spec.lat !== null && spec.lon !== null ? (
                              <button
                                type="button"
                                onClick={() => setSelectedSpecimenNum(spec.num)}
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                                title={
                                  isEn
                                    ? 'Focus this specimen on the map'
                                    : 'Показать эту особь на карте'
                                }
                              >
                                <MapPin className="h-3 w-3 text-sky-700" />
                                {spec.lat.toFixed(4)}, {spec.lon.toFixed(4)}
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {spec.date} · {spec.collector}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            cr/cs: {formatTraitNumber(spec.traits['cr/cs'], 2)} · xa/x:{' '}
                            {formatTraitNumber(spec.traits['xa/x'], 2)} · A1ser:{' '}
                            {formatTraitNumber(spec.traits['A1ser'], 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  onLoadSpecimenIntoKey(spec, 'diagnostic8');
                                  onClose();
                                }}
                                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                              >
                                {isEn ? '8 traits' : '8 признаков'}
                              </button>
                              <button
                                onClick={() => {
                                  onLoadSpecimenIntoKey(spec, 'all');
                                  onClose();
                                }}
                                className="rounded bg-sky-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
                              >
                                {isEn ? 'All specimen traits' : 'Все промеры особи'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
