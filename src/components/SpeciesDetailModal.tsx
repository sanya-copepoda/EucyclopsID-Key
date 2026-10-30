import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  MapPin,
  Image as ImageIcon,
  Camera,
  ZoomIn,
  BookOpen,
} from 'lucide-react';
import {
  KeyConfig,
  SpeciesCandidateEvaluation,
  SpeciesMedia,
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
  speciesMedia?: SpeciesMedia;
  config: KeyConfig;
  activeFilters: Record<string, UserTraitFilter>;
  onSaveSpeciesMedia?: (sp: string, media: SpeciesMedia) => void;
  onOpenBatchMediaModal?: () => void;
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
  speciesMedia,
  config,
  activeFilters,
  onClose,
  onOpenTraitInspector,
  onLoadSpecimenIntoKey,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const resolveAssetUrl = (rawUrl?: string): string | undefined => {
    if (!rawUrl) return undefined;
    if (
      rawUrl.startsWith('data:') ||
      rawUrl.startsWith('http://') ||
      rawUrl.startsWith('https://') ||
      rawUrl.startsWith('blob:')
    ) {
      return rawUrl;
    }
    const cleanRel = rawUrl.replace(/^\/+/, '');
    return `${import.meta.env.BASE_URL}${cleanRel}`;
  };

  const femalePhotoUrl = resolveAssetUrl(speciesMedia?.femaleImageUrl);
  const malePhotoUrl = resolveAssetUrl(speciesMedia?.maleImageUrl);
  const hasPhotos = Boolean(femalePhotoUrl || malePhotoUrl);

  const [activeTab, setActiveTab] = useState<'traits' | 'specimens'>('traits');
  const [showMapInProfile, setShowMapInProfile] = useState<boolean>(true);
  const [showPhotosPanel, setShowPhotosPanel] = useState<boolean>(true);
  const [selectedSpecimenNum, setSelectedSpecimenNum] = useState<number | null>(null);
  const [traitFilter, setTraitFilter] = useState<'all' | 'active' | 'polymorphic' | 'quantitative'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

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
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header with Species Name, Authority, and Taxonomic Note */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h2 className="text-xl font-bold italic text-slate-900">{species.sp}</h2>
              {species.authority && (
                <span className="text-sm font-semibold text-slate-700">
                  {species.authority}
                </span>
              )}
              {species.taxonomicNote && (
                <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-xs font-medium text-amber-950">
                  [{species.taxonomicNote}]
                </span>
              )}
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
            <p className="text-xs text-slate-600">
              {isEn ? 'Regions' : 'Регионы'} ({species.regions.length}):{' '}
              {species.regions.map((r) => translateRegion(r, lang)).join(', ') || '—'}
              {species.inVivoColors.length > 0 &&
                ` · ${isEn ? 'In vivo color' : 'Прижизненная окраска'}: ${species.inVivoColors.join(', ')}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
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
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'traits'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isEn ? `Profile of ${traits.length} Traits` : `Профиль ${traits.length} признаков`}
              </button>
              <button
                onClick={() => setActiveTab('specimens')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              <>
                {hasPhotos && (
                  <button
                    type="button"
                    onClick={() => setShowPhotosPanel((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      showPhotosPanel
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Camera className="h-3.5 w-3.5 text-emerald-700" />
                    {showPhotosPanel
                      ? isEn
                        ? 'Hide photos ♀/♂'
                        : 'Скрыть фото ♀/♂'
                      : isEn
                      ? 'Show photos ♀/♂'
                      : 'Показать фото ♀/♂'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowMapInProfile((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              </>
            )}
          </div>

          {activeTab === 'traits' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => setTraitFilter('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    traitFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn ? `All (${traits.length})` : `Все (${traits.length})`}
                </button>
                <button
                  onClick={() => setTraitFilter('active')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    traitFilter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn
                    ? `Entered in Key (${Object.keys(activeFilters).length})`
                    : `Введённые в ключе (${Object.keys(activeFilters).length})`}
                </button>
                <button
                  onClick={() => setTraitFilter('polymorphic')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    traitFilter === 'polymorphic' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn ? 'Polymorphic Qualitative' : 'Изменчивые качественные'}
                </button>
                <button
                  onClick={() => setTraitFilter('quantitative')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                className="w-44 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-sky-600 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Species Female (♀) & Male (♂) Photographs Panel (Read-Only, shown only if photos exist) */}
          {activeTab === 'traits' && hasPhotos && showPhotosPanel && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-sky-700" />
                <h3 className="text-xs font-bold text-slate-900">
                  {isEn ? (
                    <>
                      Photographs of <em>{species.sp}</em>
                    </>
                  ) : (
                    <>
                      Фотографии внешнего вида <em>{species.sp}</em>
                    </>
                  )}
                </h3>
              </div>

              <div
                className={`grid grid-cols-1 gap-4 ${
                  femalePhotoUrl && malePhotoUrl
                    ? 'sm:grid-cols-2'
                    : 'sm:grid-cols-1 max-w-xl'
                }`}
              >
                {/* Female ♀ Card */}
                {femalePhotoUrl && (
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-800 font-bold">
                          ♀
                        </span>
                        {isEn ? 'Female (♀)' : 'Самка (♀)'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div
                        onClick={() =>
                          setLightboxImage({
                            url: femalePhotoUrl,
                            title: `${species.sp} — ${isEn ? 'Female (♀)' : 'Самка (♀)'}`,
                            subtitle: speciesMedia?.femaleCaption || speciesMedia?.photoSource,
                          })
                        }
                        className="group relative flex h-64 cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-950/95"
                      >
                        <img
                          src={femalePhotoUrl}
                          alt={`${species.sp} female`}
                          className="max-h-full max-w-full object-contain transition-transform group-hover:scale-[1.02]"
                        />
                        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-slate-900/75 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <ZoomIn className="h-3 w-3" />
                          {isEn ? 'Enlarge' : 'Увеличить'}
                        </span>
                      </div>
                      {speciesMedia?.femaleCaption?.trim() && (
                        <p className="text-[11px] text-slate-600 px-1">
                          {speciesMedia.femaleCaption}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Male ♂ Card */}
                {malePhotoUrl && (
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold">
                          ♂
                        </span>
                        {isEn ? 'Male (♂)' : 'Самец (♂)'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div
                        onClick={() =>
                          setLightboxImage({
                            url: malePhotoUrl,
                            title: `${species.sp} — ${isEn ? 'Male (♂)' : 'Самец (♂)'}`,
                            subtitle: speciesMedia?.maleCaption || speciesMedia?.photoSource,
                          })
                        }
                        className="group relative flex h-64 cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-950/95"
                      >
                        <img
                          src={malePhotoUrl}
                          alt={`${species.sp} male`}
                          className="max-h-full max-w-full object-contain transition-transform group-hover:scale-[1.02]"
                        />
                        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-slate-900/75 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <ZoomIn className="h-3 w-3" />
                          {isEn ? 'Enlarge' : 'Увеличить'}
                        </span>
                      </div>
                      {speciesMedia?.maleCaption?.trim() && (
                        <p className="text-[11px] text-slate-600 px-1">
                          {speciesMedia.maleCaption}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {speciesMedia?.photoSource?.trim() && (
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                  <BookOpen className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                  <span>{speciesMedia.photoSource}</span>
                </div>
              )}
            </div>
          )}

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
                      {isEn ? 'Trait & Description' : 'Признак и описание'}
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
                            className="text-left group cursor-pointer"
                          >
                            <div className="text-xs font-semibold text-slate-900 group-hover:text-sky-700 leading-snug">
                              {desc}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
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
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
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
                                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                {isEn ? '8 traits' : '8 признаков'}
                              </button>
                              <button
                                onClick={() => {
                                  onLoadSpecimenIntoKey(spec, 'all');
                                  onClose();
                                }}
                                className="rounded bg-sky-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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

      {/* Fullscreen Image Lightbox */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] max-w-5xl flex-col items-center rounded-xl bg-white p-4 shadow-2xl"
          >
            <div className="mb-2 flex w-full items-center justify-between gap-4 border-b border-slate-200 pb-2">
              <div>
                <div className="text-sm font-bold text-slate-900">{lightboxImage.title}</div>
                {lightboxImage.subtitle && (
                  <div className="text-xs text-slate-500">{lightboxImage.subtitle}</div>
                )}
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-h-[78vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
