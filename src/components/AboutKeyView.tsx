import React, { useMemo, useState } from 'react';
import { Plus, Download, Mail, User, Building2 } from 'lucide-react';
import {
  KeyConfig,
  SpeciesProfile,
  SpecimenRecord,
  TraitDefinition,
} from '../types/taxonomy';
import { translateRegion, useLanguage } from '../utils/i18n';
import { SmallSampleMethodologyView } from './SmallSampleMethodologyView';
import { SpecimenDatabaseView } from './SpecimenDatabaseView';

interface AboutKeyViewProps {
  speciesList: SpeciesProfile[];
  specimens: SpecimenRecord[];
  extraSpecimens: SpecimenRecord[];
  traits: TraitDefinition[];
  config: KeyConfig;
  onChangeConfig: (updater: (prev: KeyConfig) => KeyConfig) => void;
  onSelectSpeciesDetail: (sp: SpeciesProfile) => void;
  onLoadSpecimenIntoKey: (specimen: SpecimenRecord, mode: 'all' | 'diagnostic8') => void;
  onOpenAddSpecimenModal: () => void;
  onRemoveExtraSpecimen: (num: number) => void;
  onExportFullCsv: () => void;
}

export const AboutKeyView: React.FC<AboutKeyViewProps> = ({
  speciesList,
  specimens,
  extraSpecimens,
  traits,
  config,
  onChangeConfig,
  onSelectSpeciesDetail,
  onLoadSpecimenIntoKey,
  onOpenAddSpecimenModal,
  onRemoveExtraSpecimen,
  onExportFullCsv,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [subTab, setSubTab] = useState<'overview' | 'methodology' | 'specimens'>('overview');

  const namedSpecies = useMemo(
    () => speciesList.filter((s) => s.sp !== '?'),
    [speciesList]
  );

  // Categorize species by exact status from the CSV summary table
  const validSpecies = useMemo(
    () => namedSpecies.filter((s) => s.status === 'valid'),
    [namedSpecies]
  );

  const candidateNewSpecies = useMemo(
    () => namedSpecies.filter((s) => s.status === 'n. sp.'),
    [namedSpecies]
  );

  const doubtfulSpecies = useMemo(
    () =>
      namedSpecies.filter(
        (s) => s.status !== 'valid' && s.status !== 'n. sp.'
      ),
    [namedSpecies]
  );

  const regionsList = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sp of specimens) {
      if (sp.region && sp.region !== '-' && sp.region !== '?') {
        counts[sp.region] = (counts[sp.region] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [specimens]);

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar inside "About & Database" */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {isEn
              ? 'About the Key, Taxonomic Database & Reference Materials'
              : 'Информация о ключе и справочные материалы'}
          </h1>
          <p className="text-xs text-slate-500">
            {isEn
              ? 'Slide database overview, taxonomic composition, small-sample statistical model, contact details, and dynamic specimen import.'
              : 'Описание базы препаратов, таксономический состав, математическая модель малых выборок, контакты и динамическое пополнение матрицы особей.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddSpecimenModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            {isEn ? 'Add Specimens to Database' : 'Добавить особей в базу'}
          </button>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setSubTab('overview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn
                ? `Overview & Species (${namedSpecies.length})`
                : `О ключе и видах (${namedSpecies.length})`}
            </button>
            <button
              onClick={() => setSubTab('methodology')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'methodology'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? 'Small-Sample Model (n)' : 'Модель малых выборок (n)'}
            </button>
            <button
              onClick={() => setSubTab('specimens')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'specimens'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn
                ? `Specimen Database (${specimens.length})`
                : `База особей (${specimens.length})`}
            </button>
          </div>
        </div>
      </div>

      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Primary Author, Database & Contact Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              <div className="lg:col-span-8 space-y-3">
                <div className="text-xs font-semibold tracking-wide text-sky-800">
                  {isEn
                    ? 'Kazan Federal University · Copepoda Taxonomic Database'
                    : 'Казанский федеральный университет · Таксономическая база данных Copepoda'}
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isEn ? (
                    <>
                      Interactive Multi-Access Key to the Genus <em>Eucyclops</em> Based on the Slide Database of Aleksandr A. Novikov
                    </>
                  ) : (
                    <>
                      Интерактивный определитель рода <em>Eucyclops</em> на основе базы препаратов Новикова Александра Алексеевича
                    </>
                  )}
                </h2>
                <p className="text-sm leading-relaxed text-slate-700">
                  {isEn ? (
                    <>
                      This multi-access (polyclave) interactive key is built upon the original morphometric and meristic slide database of{' '}
                      <strong>Aleksandr Alekseevich Novikov (Kazan Federal University)</strong>. The key is derived from detailed microscopic examination of{' '}
                      <strong className="font-mono tabular-nums">{specimens.length} specimens</strong>
                      {extraSpecimens.length > 0
                        ? ` (182 baseline + ${extraSpecimens.length} user-added)`
                        : ''}
                      , collected primarily across waterbodies of Russia and adjacent regions (Siberia, the Arctic, Russian Far East, European Russia, Caucasus), and covers{' '}
                      <strong className="font-mono tabular-nums">{traits.length} diagnostic traits</strong> of the antennules, antennae, mouthparts, swimming legs P1–P4, genital and anal somites, and caudal rami. For all paired quantitative structures, the database records the mean value between the right and left sides of a single specimen.
                    </>
                  ) : (
                    <>
                      Данный многовходовый (поликлавишный) определитель разработан на основе оригинальной морфометрической и меристической базы препаратов{' '}
                      <strong>Новикова Александра Алексеевича (Казанский федеральный университет)</strong>. Ключ построен по результатам детального микроскопического анализа{' '}
                      <strong className="font-mono tabular-nums">{specimens.length} особей</strong>
                      {extraSpecimens.length > 0
                        ? ` (182 базовых + ${extraSpecimens.length} добавленных пользователем)`
                        : ''}
                      , собранных преимущественно в водоёмах России (Сибирь, Арктика, Дальний Восток, Европейская часть, Кавказ), и охватывает{' '}
                      <strong className="font-mono tabular-nums">{traits.length} диагностических признаков</strong> вооружения антенн, ротовых конечностей, торакальных ног P1–P4, генитального и анального сомитов, а также каудальных ветвей. Для всех парных количественных признаков в базе приведены средние значения между правой и левой стороной тела одной особи.
                    </>
                  )}
                </p>
                <p className="text-sm leading-relaxed text-slate-700">
                  {isEn ? (
                    <>
                      In total, the matrix comprises{' '}
                      <strong className="font-mono tabular-nums">{namedSpecies.length} species-level taxa</strong> (with <em>E. suturus</em> and <em>E. paraserrulatus</em> united under <em>E. paraserrulatus</em>): including{' '}
                      <strong className="font-mono tabular-nums text-emerald-800">
                        {validSpecies.length} valid species
                      </strong>
                      ,{' '}
                      <strong className="font-mono tabular-nums text-sky-800">
                        {candidateNewSpecies.length} candidate new species (n. sp.)
                      </strong>
                      , and{' '}
                      <strong className="font-mono tabular-nums text-amber-800">
                        {doubtfulSpecies.length} doubtful taxa/forms
                      </strong>{' '}
                      requiring further taxonomic verification.
                    </>
                  ) : (
                    <>
                      Всего в матрицу включено{' '}
                      <strong className="font-mono tabular-nums">{namedSpecies.length} таксона видового ранга</strong> (с учётом объединения <em>E. suturus</em> и <em>E. paraserrulatus</em> под единым названием <em>E. paraserrulatus</em>): в том числе{' '}
                      <strong className="font-mono tabular-nums text-emerald-800">
                        {validSpecies.length} валидных видов
                      </strong>
                      ,{' '}
                      <strong className="font-mono tabular-nums text-sky-800">
                        {candidateNewSpecies.length} видов-кандидатов (n. sp.)
                      </strong>{' '}
                      и{' '}
                      <strong className="font-mono tabular-nums text-amber-800">
                        {doubtfulSpecies.length} сомнительных видов и форм
                      </strong>
                      , требующих дальнейшего таксономического подтверждения.
                    </>
                  )}
                </p>
              </div>

              {/* Contact Information Card */}
              <div className="lg:col-span-4 rounded-xl border border-sky-200 bg-sky-50/60 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-900">
                  <Mail className="h-4 w-4 text-sky-700" />
                  <span>{isEn ? 'Contact Information' : 'Информация для связи'}</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">
                        {isEn ? 'Aleksandr Alekseevich Novikov' : 'Новиков Александр Алексеевич'}
                      </div>
                      <div className="text-slate-600">
                        {isEn
                          ? 'Author of the database and taxonomic key'
                          : 'Автор базы препаратов и определительного ключа'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                    <div className="text-slate-700">
                      {isEn
                        ? 'Kazan Federal University (KFU)'
                        : 'Казанский (Приволжский) федеральный университет (КФУ)'}
                    </div>
                  </div>
                  <div className="pt-1">
                    <div className="text-[11px] font-medium text-slate-500 mb-1">
                      {isEn
                        ? 'For questions, specimen verification, or new data:'
                        : 'По вопросам определения, проверки особей и сотрудничества:'}
                    </div>
                    <a
                      href="mailto:aleksandr-novikov-2011@list.ru"
                      className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-white px-3 py-2 font-mono text-xs font-semibold text-sky-900 hover:bg-sky-100 transition-colors shadow-2xs break-all"
                    >
                      <Mail className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                      aleksandr-novikov-2011@list.ru
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Quantitative Telemetry Strip */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-5">
              <div>
                <div className="text-xs text-slate-500">
                  {isEn ? 'Examined Specimens' : 'Исследованных особей'}
                </div>
                <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
                  {specimens.length}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isEn ? 'slides in matrix' : 'препаратов в матрице'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {isEn ? 'Valid Species' : 'Валидных видов'}
                </div>
                <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-emerald-700">
                  {validSpecies.length}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isEn ? 'status: valid' : 'статус: valid'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {isEn ? 'Candidate Species' : 'Видов-кандидатов'}
                </div>
                <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-sky-700">
                  {candidateNewSpecies.length}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isEn ? 'status: n. sp.' : 'статус: n. sp.'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {isEn ? 'Doubtful Species' : 'Сомнительных видов'}
                </div>
                <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-amber-700">
                  {doubtfulSpecies.length}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isEn ? 'require confirmation' : 'требуют подтверждения'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {isEn ? 'Traits in Key' : 'Признаков в ключе'}
                </div>
                <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
                  {traits.length}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isEn ? 'qualitative & quantitative' : 'качественных и количественных'}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Matrix Updating Guide */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-3xl space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {isEn
                    ? 'How to dynamically add new specimens to the key?'
                    : 'Как динамически добавлять новых особей в ключ?'}
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {isEn ? (
                    <>
                      The key recalculates all <span className="font-mono">[Min–Max]</span> ranges, qualitative state frequencies, pooled within-species standard deviations (<span className="font-mono">Pooled SD</span>), and small-sample adjustments (<span className="font-mono">n</span>) in real time directly from the specimen records. You can expand the matrix by: (1) copying new rows from Excel/CSV and pasting them in the “Add Specimens to Database” modal; or (2) downloading the updated full CSV matrix or uploading your own CSV file in the top header.
                    </>
                  ) : (
                    <>
                      Ключ рассчитывает все диапазоны <span className="font-mono">[Min–Max]</span>, частоты качественных состояний, внутригрупповые дисперсии (<span className="font-mono">Pooled SD</span>) и поправки на малую выборку (<span className="font-mono">n</span>) в реальном времени напрямую по списку особей. Вы можете пополнять базу двумя способами: (1) скопировать новые строки из Excel и вставить их в окне «Добавить особей в базу»; (2) скачать обновлённую полную CSV-матрицу или загрузить свой CSV-файл в шапке сайта.
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAddSpecimenModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isEn ? 'Add Specimens' : 'Добавить особей'}
                </button>
                <button
                  onClick={onExportFullCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-sky-700" />
                  {isEn
                    ? `Download CSV (${specimens.length} spec.)`
                    : `Скачать CSV (${specimens.length} экз.)`}
                </button>
              </div>
            </div>
          </div>

          {/* Three-Column Taxonomic Breakdown: Valid, Candidate (n. sp.), and Doubtful Species */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Column 1: Valid Species */}
            <div className="rounded-xl border border-emerald-200 bg-white p-5 border-t-4 border-t-emerald-600">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-emerald-950">
                  {isEn
                    ? `1. Valid Species (${validSpecies.length})`
                    : `1. Валидные виды (${validSpecies.length})`}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isEn
                    ? 'Described species with confirmed taxonomic status (valid).'
                    : 'Описанные виды с подтверждённым таксономическим статусом (valid).'}
                </p>
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {validSpecies.map((sp) => (
                  <div
                    key={sp.sp}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <button
                      onClick={() => onSelectSpeciesDetail(sp)}
                      className="font-bold italic text-emerald-900 hover:text-emerald-700 text-left cursor-pointer"
                    >
                      {sp.sp}
                    </button>
                    <span className="font-mono text-[11px] tabular-nums text-slate-500">
                      {isEn ? 'gr.' : 'гр.'} {sp.group} · n = {sp.specimenCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Candidate Species (n. sp.) */}
            <div className="rounded-xl border border-sky-200 bg-white p-5 border-t-4 border-t-sky-600">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-sky-950">
                  {isEn
                    ? `2. Candidate Species (${candidateNewSpecies.length})`
                    : `2. Виды-кандидаты (${candidateNewSpecies.length})`}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isEn
                    ? 'Putative new species to science (n. sp.) delimited by morphological analysis.'
                    : 'Новые для науки виды (n. sp.), выделенные на основе морфологического анализа.'}
                </p>
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {candidateNewSpecies.map((sp) => (
                  <div
                    key={sp.sp}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <button
                      onClick={() => onSelectSpeciesDetail(sp)}
                      className="font-bold italic text-sky-900 hover:text-sky-700 text-left cursor-pointer"
                    >
                      {sp.sp}
                    </button>
                    <span className="font-mono text-[11px] tabular-nums text-slate-500">
                      {isEn ? 'gr.' : 'гр.'} {sp.group} · n = {sp.specimenCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Doubtful / Needs Confirmation Species */}
            <div className="rounded-xl border border-amber-200 bg-white p-5 border-t-4 border-t-amber-500">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-amber-950">
                  {isEn
                    ? `3. Doubtful Species Requiring Confirmation (${doubtfulSpecies.length})`
                    : `3. Сомнительные виды, требующие подтверждения (${doubtfulSpecies.length})`}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isEn
                    ? 'Questionable taxa (?), potential junior synonyms, or single-specimen records.'
                    : 'Таксоны под вопросом (?), возможные младшие синонимы или единичные находки.'}
                </p>
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {doubtfulSpecies.map((sp) => (
                  <div
                    key={sp.sp}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div>
                      <button
                        onClick={() => onSelectSpeciesDetail(sp)}
                        className="font-bold italic text-amber-900 hover:text-amber-700 text-left cursor-pointer"
                      >
                        {sp.sp}
                      </button>
                      <span className="ml-2 font-mono text-[11px] text-amber-800">
                        ({sp.status})
                      </span>
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-slate-500">
                      {isEn ? 'gr.' : 'гр.'} {sp.group} · n = {sp.specimenCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Geographic Coverage Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900">
              {isEn
                ? `Geographic Distribution of Examined Specimens (${regionsList.length} regions)`
                : `География сборов препаратов в матрице (${regionsList.length} регионов)`}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-700">
              {regionsList.map(([region, count]) => (
                <div key={region} className="font-mono tabular-nums">
                  <span className="font-sans font-medium text-slate-900">
                    {translateRegion(region, lang)}
                  </span>
                  : {count} {isEn ? 'spec.' : 'экз.'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'methodology' && (
        <SmallSampleMethodologyView
          speciesList={speciesList}
          traits={traits}
          config={config}
          onChangeConfig={onChangeConfig}
          onSelectSpeciesDetail={onSelectSpeciesDetail}
        />
      )}

      {subTab === 'specimens' && (
        <SpecimenDatabaseView
          specimens={specimens}
          extraSpecimens={extraSpecimens}
          traits={traits}
          onLoadSpecimenIntoKey={onLoadSpecimenIntoKey}
          onOpenAddSpecimenModal={onOpenAddSpecimenModal}
          onRemoveExtraSpecimen={onRemoveExtraSpecimen}
          onExportFullCsv={onExportFullCsv}
        />
      )}
    </div>
  );
};
