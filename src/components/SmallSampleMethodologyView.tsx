import React, { useMemo, useState } from 'react';
import {
  ExtrapolationMethod,
  KeyConfig,
  SpeciesProfile,
  TraitDefinition,
} from '../types/taxonomy';
import {
  computeExtrapolatedRange,
  formatTraitNumber,
  getHartleyD2,
} from '../utils/matrixEngine';

interface SmallSampleMethodologyViewProps {
  speciesList: SpeciesProfile[];
  traits: TraitDefinition[];
  config: KeyConfig;
  onChangeConfig: (updater: (prev: KeyConfig) => KeyConfig) => void;
  onSelectSpeciesDetail: (sp: SpeciesProfile) => void;
}

export const SmallSampleMethodologyView: React.FC<SmallSampleMethodologyViewProps> = ({
  speciesList,
  traits,
  config,
  onChangeConfig,
  onSelectSpeciesDetail,
}) => {
  const quantitativeTraits = useMemo(
    () => traits.filter((t) => t.kind !== 'qualitative'),
    [traits]
  );
  const qualitativeTraits = useMemo(
    () => traits.filter((t) => t.kind === 'qualitative'),
    [traits]
  );

  const [selectedTraitCode, setSelectedTraitCode] = useState<string>('cr/cs');
  const [selectedQualTraitCode, setSelectedQualTraitCode] = useState<string>('AnS_dsp');

  const activeTrait = useMemo(
    () => quantitativeTraits.find((t) => t.code === selectedTraitCode) || quantitativeTraits[0],
    [quantitativeTraits, selectedTraitCode]
  );

  const activeQualTrait = useMemo(
    () => qualitativeTraits.find((t) => t.code === selectedQualTraitCode) || qualitativeTraits[0],
    [qualitativeTraits, selectedQualTraitCode]
  );

  // Order species by sample size n ascending so the user immediately sees n=1, n=2, ..., n=22
  const sortedSpeciesForChart = useMemo(() => {
    return speciesList
      .filter((s) => s.sp !== '?')
      .map((sp) => {
        const st = sp.traitStats[activeTrait.code];
        const { extMin, extMax } = computeExtrapolatedRange(
          st,
          activeTrait,
          sp.group,
          config
        );
        return {
          sp,
          st,
          extMin,
          extMax,
        };
      })
      .filter((item) => item.st && item.st.n > 0)
      .sort((a, b) => a.st.n - b.st.n || a.sp.sp.localeCompare(b.sp.sp));
  }, [speciesList, activeTrait, config]);

  // Compute global chart scale including extrapolated bounds
  const chartBounds = useMemo(() => {
    let minVal = activeTrait.globalMin;
    let maxVal = activeTrait.globalMax;
    for (const item of sortedSpeciesForChart) {
      if (item.extMin !== null && item.extMin < minVal) minVal = item.extMin;
      if (item.extMax !== null && item.extMax > maxVal) maxVal = item.extMax;
    }
    const span = Math.max(0.01, maxVal - minVal);
    return { minVal, maxVal, span };
  }, [activeTrait, sortedSpeciesForChart]);

  // Polymorphic qualitative summary for the chosen qualitative trait
  const polymorphicSpeciesForQual = useMemo(() => {
    return speciesList
      .filter((s) => s.sp !== '?' && s.traitStats[activeQualTrait.code]?.n > 0)
      .sort(
        (a, b) =>
          (b.traitStats[activeQualTrait.code]?.stateSet.length || 0) -
            (a.traitStats[activeQualTrait.code]?.stateSet.length || 0) ||
          b.specimenCount - a.specimenCount
      );
  }, [speciesList, activeQualTrait]);

  return (
    <div className="space-y-8">
      {/* Section 1: Problem & Solution Explanation + Live Calibration Controls */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h2 className="text-lg font-bold text-slate-900">
            Как решена проблема видов с малой выборкой (n = 1…4) и заниженных табличных диапазонов
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            В исходной матрице (182 особи, 33 вида) объём выборки сильно различается: от{' '}
            <span className="font-mono font-semibold text-slate-900">n = 22</span> у{' '}
            <em className="font-medium">E. sibiricus</em> и{' '}
            <span className="font-mono font-semibold text-slate-900">n = 15</span> у{' '}
            <em className="font-medium">E. delongi</em> до{' '}
            <span className="font-mono font-semibold text-slate-900">n = 1–3</span> у редких и новых видов (
            <em>E. colchicus</em>, <em>E. nudus</em>, <em>E. pacatus</em>, <em>E. arenosus</em>,{' '}
            <em>E. macrurus</em>, <em>E. major</em>, <em>E. digitatus</em>, <em>E. turbidus</em>).
          </p>

          <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="font-semibold text-slate-900">
                1. Почему нельзя брать просто табличный [Min, Max] при малых n:
              </div>
              <p className="mt-1">
                По статистике порядковых статистик (коэффициент Хартли{' '}
                <span className="font-mono">d₂(n) = E[(X_max − X_min)/σ]</span>), при{' '}
                <span className="font-mono">n = 1</span> наблюдаемый размах равен{' '}
                <span className="font-mono">0</span> (теряется 100% внутривидовой изменчивости), при{' '}
                <span className="font-mono">n = 2</span> выборка улавливает в среднем лишь{' '}
                <span className="font-mono">28%</span> реального 95%-го диапазона вида (±2σ), при{' '}
                <span className="font-mono">n = 3</span> — около <span className="font-mono">42%</span>, и только при{' '}
                <span className="font-mono">n ≥ 15–20</span> эмпирический размах приближается к <span className="font-mono">3.5–3.8σ</span> (~90–95% истинного размаха).
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="font-semibold text-slate-900">
                2. Предложенное решение: Байесовское заимствование внутривидовой дисперсии (Pooled SD + Shrinkage):
              </div>
              <p className="mt-1">
                Внутривидовая вариабельность одноимённых морфометрических индексов (например,{' '}
                <span className="font-mono">cr/cs</span>, <span className="font-mono">xa/x</span>) и меристических промеров у близких видов рода <em>Eucyclops</em> имеет схожий масштаб. Для каждого из 72 признаков вычисляется объединённое внутривидовое стандартное отклонение{' '}
                <span className="font-mono">σ_pooled</span> (по видам с <span className="font-mono">n ≥ 3</span>) и групповое{' '}
                <span className="font-mono">σ_group</span> (внутри групп <em>arcanus</em>, <em>denticulatus</em>, <em>serrulatus</em>, <em>speratus</em>).
              </p>
              <p className="mt-1.5 font-mono text-[11px] text-slate-800">
                σ_est(S) = ((n − 1)·s_S + m·σ_prior) / (n − 1 + m), &nbsp; Δ_pad = k · σ_est(S) · (1 − d₂(n) / 4.0)
              </p>
              <p className="mt-1">
                Чем меньше <span className="font-mono">n</span> у вида в таблице, тем сильнее определитель расширяет допуск вокруг наблюдаемых точек. А для хорошо изученных видов (<span className="font-mono">n = 15–22</span>) допуск почти совпадает с реальным табличным <span className="font-mono">[Min, Max]</span>.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="font-semibold text-slate-900">
                3. Учёт полиморфных качественных признаков (0, 1, 2, 3):
              </div>
              <p className="mt-1">
                Для всех дискретных качественных признаков вид хранит <strong>множество всех зафиксированных у его особей состояний</strong> и их частоты. Если у вида в матрице встречаются и <span className="font-mono font-semibold">1</span>, и <span className="font-mono font-semibold">2</span>, то в определителе этот вид остаётся в кандидатах как при нажатии на <span className="font-mono font-semibold">1</span>, так и при нажатии на <span className="font-mono font-semibold">2</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Calibration Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h3 className="text-base font-bold text-slate-900">
            Настройка математической модели ключа
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Изменения мгновенно применяются к определителю и графикам ниже.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800">
                Модель расчёта диапазонов количественных признаков:
              </label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {(
                  [
                    {
                      id: 'bayesian_pooled',
                      title: 'Адаптивная Байесовская (Pooled SD + d₂ Хартли) — Рекомендуется',
                      desc: 'Расширяет диапазон обратно пропорционально корню и фактору Хартли d₂(n) на основе внутривидовой σ рода/группы.',
                    },
                    {
                      id: 'student_t',
                      title: 'Предиктивный интервал Стьюдента (Mean ± k·σ·√(1 + 1/n))',
                      desc: 'Строит доверительный интервал вокруг выборочного среднего с учётом поправки √(1+1/n) для новой особи.',
                    },
                    {
                      id: 'cv_buffer',
                      title: 'Процентный буфер (± % от среднего с весом на малый n)',
                      desc: 'Добавляет фиксированный процентный допуск по краям [Min, Max], увеличенный в 1.35–1.65 раза при n ≤ 2.',
                    },
                    {
                      id: 'strict_raw',
                      title: 'Строгий табличный [Min, Max] (Без экстраполяции)',
                      desc: 'Использует исключительно минимальное и максимальное значение из CSV (опасно для видов с n = 1–3).',
                    },
                  ] as { id: ExtrapolationMethod; title: string; desc: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() =>
                      onChangeConfig((prev) => ({ ...prev, extrapolationMethod: m.id }))
                    }
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      config.extrapolationMethod === m.id
                        ? 'border-sky-600 bg-sky-50/60 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-semibold">{m.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {config.extrapolationMethod !== 'strict_raw' && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                {config.extrapolationMethod === 'cv_buffer' ? (
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">Базовый процентный допуск:</span>
                      <span className="font-mono font-semibold text-sky-700">
                        ±{config.percentBuffer}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={30}
                      step={1}
                      value={config.percentBuffer}
                      onChange={(e) =>
                        onChangeConfig((prev) => ({
                          ...prev,
                          percentBuffer: Number(e.target.value),
                        }))
                      }
                      className="mt-1.5 w-full accent-sky-600"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">
                        Коэффициент ширины интервала (k · σ):
                      </span>
                      <span className="font-mono font-semibold text-sky-700">
                        {config.sigmaMultiplier.toFixed(1)} σ (≈{' '}
                        {config.sigmaMultiplier <= 1.5
                          ? '87%'
                          : config.sigmaMultiplier <= 2.0
                          ? '95%'
                          : config.sigmaMultiplier <= 2.5
                          ? '98.8%'
                          : '99.7%'}{' '}
                        популяции)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={3.5}
                      step={0.1}
                      value={config.sigmaMultiplier}
                      onChange={(e) =>
                        onChangeConfig((prev) => ({
                          ...prev,
                          sigmaMultiplier: Number(e.target.value),
                        }))
                      }
                      className="mt-1.5 w-full accent-sky-600"
                    />
                  </div>
                )}

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.protectStrictZero}
                    onChange={(e) =>
                      onChangeConfig((prev) => ({
                        ...prev,
                        protectStrictZero: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    <strong>Сохранять строгий ноль (0) для счётных признаков:</strong> если у всех особей вида (при n ≥ 3 или по всей видовой группе) значение равно 0 (полное отсутствие группы шипиков, напр. A2g1 = 0), не размывать 0 в область положительных чисел.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.relaxQualitativeForTinyN}
                    onChange={(e) =>
                      onChangeConfig((prev) => ({
                        ...prev,
                        relaxQualitativeForTinyN: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    <strong>Допуск ±1 состояние для многоградационных качественных признаков (0, 1, 2, 3) при n ≤ 2:</strong> если вид представлен всего 1–2 особями, учитывать соседнее состояние как возможный полиморфизм.
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Interactive Range Extrapolation Chart across all 33 species */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Визуализация табличных [Min–Max] и экстраполированных диапазонов по видам (от n = 1 до n = 22)
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Тёмно-синяя полоса — фактический размах в таблице CSV; голубая область — расширенный допуск с учётом малой выборки; точки — конкретные особи.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700">Признак:</label>
            <select
              value={selectedTraitCode}
              onChange={(e) => setSelectedTraitCode(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 focus:border-sky-600 focus:outline-none"
            >
              {quantitativeTraits.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} ({t.kind === 'morphometric' ? 'индекс' : 'счётный'}, σ_pooled ={' '}
                  {t.pooledSd.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trait Statistical Telemetry Bar */}
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-4">
          <div>
            <span className="text-slate-500">Выбранный признак:</span>
            <div className="font-mono text-sm font-bold text-slate-900">{activeTrait.code}</div>
          </div>
          <div>
            <span className="text-slate-500">Глобальный размах (182 экз.):</span>
            <div className="font-mono text-sm font-semibold tabular-nums text-slate-900">
              {formatTraitNumber(activeTrait.globalMin, activeTrait.decimals)} –{' '}
              {formatTraitNumber(activeTrait.globalMax, activeTrait.decimals)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Объединённое внутривидовое σ_pooled:</span>
            <div className="font-mono text-sm font-semibold tabular-nums text-sky-800">
              ±{activeTrait.pooledSd.toFixed(2)} (CV = {(activeTrait.pooledCv * 100).toFixed(1)}%)
            </div>
          </div>
          <div>
            <span className="text-slate-500">Дефицит размаха при n=1 / n=2 / n=5:</span>
            <div className="font-mono text-sm font-semibold tabular-nums text-amber-800">
              100% / {Math.round((1 - getHartleyD2(2) / 4) * 100)}% /{' '}
              {Math.round((1 - getHartleyD2(5) / 4) * 100)}%
            </div>
          </div>
        </div>

        {/* Forest plot rows */}
        <div className="mt-5 space-y-2">
          {sortedSpeciesForChart.map(({ sp, st, extMin, extMax }) => {
            if (st.rawMin === null || st.rawMax === null || extMin === null || extMax === null) {
              return null;
            }
            const rawLeftPct = Math.max(
              0,
              Math.min(100, ((st.rawMin - chartBounds.minVal) / chartBounds.span) * 100)
            );
            const rawWidthPct = Math.max(
              0.8,
              Math.min(100 - rawLeftPct, ((st.rawMax - st.rawMin) / chartBounds.span) * 100)
            );

            const extLeftPct = Math.max(
              0,
              Math.min(100, ((extMin - chartBounds.minVal) / chartBounds.span) * 100)
            );
            const extWidthPct = Math.max(
              0.8,
              Math.min(100 - extLeftPct, ((extMax - extMin) / chartBounds.span) * 100)
            );

            const isSmallN = st.n <= 3;

            return (
              <div
                key={sp.sp}
                className="grid grid-cols-12 items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
              >
                <div className="col-span-3 sm:col-span-2 flex items-baseline justify-between gap-2">
                  <button
                    onClick={() => onSelectSpeciesDetail(sp)}
                    className="truncate text-left text-xs font-semibold italic text-slate-900 hover:text-sky-700"
                  >
                    {sp.sp}
                  </button>
                  <span
                    className={`font-mono text-[11px] tabular-nums shrink-0 ${
                      isSmallN ? 'font-semibold text-amber-700' : 'text-slate-500'
                    }`}
                  >
                    n={st.n}
                  </span>
                </div>

                {/* Bar track */}
                <div className="col-span-6 sm:col-span-7 relative h-5 rounded bg-slate-100">
                  {/* Extrapolated tolerance interval */}
                  <div
                    className="absolute top-1 bottom-1 rounded bg-sky-200/90 border border-sky-400/70"
                    style={{
                      left: `${extLeftPct}%`,
                      width: `${extWidthPct}%`,
                    }}
                    title={`Расчётный диапазон: ${formatTraitNumber(
                      extMin,
                      activeTrait.decimals
                    )}–${formatTraitNumber(extMax, activeTrait.decimals)}`}
                  />
                  {/* Raw empirical [min, max] bar */}
                  <div
                    className="absolute top-1.5 bottom-1.5 rounded bg-slate-800"
                    style={{
                      left: `${rawLeftPct}%`,
                      width: `${rawWidthPct}%`,
                    }}
                    title={`Табличный Min–Max: ${formatTraitNumber(
                      st.rawMin,
                      activeTrait.decimals
                    )}–${formatTraitNumber(st.rawMax, activeTrait.decimals)}`}
                  />
                  {/* Individual specimen dots */}
                  {st.values.map((v, idx) => {
                    const dotPct = Math.max(
                      0,
                      Math.min(100, ((v - chartBounds.minVal) / chartBounds.span) * 100)
                    );
                    return (
                      <div
                        key={idx}
                        className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border border-slate-900"
                        style={{ left: `${dotPct}%` }}
                      />
                    );
                  })}
                </div>

                {/* Numeric readout */}
                <div className="col-span-3 font-mono text-[11px] tabular-nums text-right text-slate-700 whitespace-nowrap">
                  <span className="font-semibold text-slate-900">
                    {st.rawMin === st.rawMax
                      ? formatTraitNumber(st.rawMin, activeTrait.decimals)
                      : `${formatTraitNumber(st.rawMin, activeTrait.decimals)}–${formatTraitNumber(
                          st.rawMax,
                          activeTrait.decimals
                        )}`}
                  </span>
                  <span className="ml-1.5 text-sky-700">
                    [{formatTraitNumber(extMin, activeTrait.decimals)}–
                    {formatTraitNumber(extMax, activeTrait.decimals)}]
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Polymorphic Qualitative Traits Inspector */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Матрица внутривидового полиморфизма качественных признаков (0, 1, 2, 3)
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Если у особей одного вида встречаются разные дискретные состояния (например, и 1, и 2), вид сохраняется в списке кандидатов при выборе любого из этих состояний.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700">Качественный признак:</label>
            <select
              value={selectedQualTraitCode}
              onChange={(e) => setSelectedQualTraitCode(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 focus:border-sky-600 focus:outline-none"
            >
              {qualitativeTraits.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} (состояния: {t.discreteStates.join(', ')})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {polymorphicSpeciesForQual.map((sp) => {
            const st = sp.traitStats[activeQualTrait.code];
            const isPoly = st.stateSet.length > 1;
            return (
              <div
                key={sp.sp}
                className={`rounded-lg border p-3 ${
                  isPoly ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <button
                    onClick={() => onSelectSpeciesDetail(sp)}
                    className="text-xs font-bold italic text-slate-900 hover:text-sky-700"
                  >
                    {sp.sp}
                  </button>
                  <span className="font-mono text-[11px] text-slate-500">
                    n = {st.n} · {isPoly ? 'Полиморфный' : 'Константный'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-xs">
                  {activeQualTrait.discreteStates.map((stateVal) => {
                    const count = st.stateCounts[stateVal] || 0;
                    const active = count > 0;
                    const pct = st.n > 0 ? Math.round((count / st.n) * 100) : 0;
                    return (
                      <div
                        key={stateVal}
                        className={`rounded px-2 py-0.5 text-[11px] tabular-nums ${
                          active
                            ? 'bg-slate-900 font-semibold text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {stateVal}: {count} экз. ({pct}%)
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
