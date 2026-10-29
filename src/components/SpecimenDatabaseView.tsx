import React, { useMemo, useState } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { SpecimenRecord, TraitDefinition } from '../types/taxonomy';
import { formatTraitNumber } from '../utils/matrixEngine';
import { translateRegion, useLanguage } from '../utils/i18n';

interface SpecimenDatabaseViewProps {
  specimens: SpecimenRecord[];
  extraSpecimens: SpecimenRecord[];
  traits: TraitDefinition[];
  onLoadSpecimenIntoKey: (specimen: SpecimenRecord, mode: 'all' | 'diagnostic8') => void;
  onOpenAddSpecimenModal: () => void;
  onRemoveExtraSpecimen: (num: number) => void;
  onExportFullCsv: () => void;
}

export const SpecimenDatabaseView: React.FC<SpecimenDatabaseViewProps> = ({
  specimens,
  extraSpecimens,
  traits,
  onLoadSpecimenIntoKey,
  onOpenAddSpecimenModal,
  onRemoveExtraSpecimen,
  onExportFullCsv,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const extraNumsSet = useMemo(
    () => new Set(extraSpecimens.map((s) => s.num)),
    [extraSpecimens]
  );

  const regions = useMemo(() => {
    return Array.from(new Set(specimens.map((s) => s.region).filter(Boolean))).sort();
  }, [specimens]);

  const groups = useMemo(() => {
    return Array.from(new Set(specimens.map((s) => s.group).filter(Boolean))).sort();
  }, [specimens]);

  const filteredSpecimens = useMemo(() => {
    return specimens.filter((s) => {
      if (selectedRegion !== 'all' && s.region !== selectedRegion) return false;
      if (selectedGroup !== 'all' && s.group !== selectedGroup) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const regionEn = translateRegion(s.region, 'en');
        const text = `${s.num} ${s.sp} ${s.region} ${regionEn} ${s.district} ${s.waterbody} ${s.collector} ${s.inVivoColor}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [specimens, selectedRegion, selectedGroup, searchQuery]);

  // Unknown specimen #169 highlight
  const unknownSpecimen = useMemo(
    () => specimens.find((s) => s.sp === '?'),
    [specimens]
  );

  return (
    <div className="space-y-6">
      {/* Header & Unknown Specimen Callout */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEn
                ? `Specimen Matrix (${specimens.length} spec.${
                    extraSpecimens.length > 0 ? `, including ${extraSpecimens.length} custom added` : ''
                  })`
                : `Матрица особей (${specimens.length} экз.${
                    extraSpecimens.length > 0 ? `, из них ${extraSpecimens.length} добавлено вами` : ''
                  })`}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {isEn
                ? 'Complete database of individual specimen measurements. You can add new specimens from Excel/CSV — the key automatically recalculates all ranges and pooled variances.'
                : 'Полная база промеров особей. Вы можете добавлять новые особи из таблицы Excel/CSV — ключ автоматически пересчитает все диапазоны и дисперсии.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenAddSpecimenModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              {isEn ? '+ Add Specimens (Excel / CSV)' : '+ Добавить особей (Excel / CSV)'}
            </button>

            <button
              onClick={onExportFullCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-sky-700" />
              {isEn ? 'Download Updated CSV' : 'Скачать обновлённый CSV'}
            </button>

            {unknownSpecimen && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-1.5">
                <div className="text-xs">
                  <div className="font-semibold text-amber-900">
                    {isEn
                      ? `Unidentified Specimen #${unknownSpecimen.num} (sp = ?)`
                      : `Неопределённая особь #${unknownSpecimen.num} (sp = ?)`}
                  </div>
                </div>
                <button
                  onClick={() => onLoadSpecimenIntoKey(unknownSpecimen, 'all')}
                  className="rounded-md bg-amber-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0"
                >
                  {isEn ? `Identify #${unknownSpecimen.num}` : `Определить #${unknownSpecimen.num}`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isEn
                ? 'Search by species, waterbody, ID, collector...'
                : 'Поиск по виду, водоему, номеру, сборщику...'
            }
            className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
          />

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">{isEn ? 'Region:' : 'Регион:'}</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
            >
              <option value="all">
                {isEn ? `All regions (${regions.length})` : `Все регионы (${regions.length})`}
              </option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {translateRegion(r, lang)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">{isEn ? 'Group:' : 'Группа:'}</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
            >
              <option value="all">
                {isEn ? `All groups (${groups.length})` : `Все группы (${groups.length})`}
              </option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <span className="ml-auto font-mono text-xs text-slate-500">
            {isEn
              ? `Showing: ${filteredSpecimens.length} of ${specimens.length}`
              : `Показано: ${filteredSpecimens.length} из ${specimens.length}`}
          </span>
        </div>
      </div>

      {/* Specimens Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="py-3 px-3 font-semibold">num</th>
              <th className="py-3 px-3 font-semibold">{isEn ? 'sp (Species)' : 'sp (Вид)'}</th>
              <th className="py-3 px-3 font-semibold">group</th>
              <th className="py-3 px-3 font-semibold">
                {isEn ? 'Region / District / Waterbody' : 'Регион / Район / Водоем'}
              </th>
              <th className="py-3 px-3 font-semibold">N, E</th>
              <th className="py-3 px-3 font-semibold">data / leg.</th>
              <th className="py-3 px-3 font-mono font-semibold">A1ser · P4IS_dr · cr/cs · xa/x</th>
              <th className="py-3 px-3 font-semibold text-right">
                {isEn ? 'Load into Key' : 'Подставить в ключ'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredSpecimens.map((spec) => {
              const isCustomAdded = extraNumsSet.has(spec.num);
              return (
                <tr
                  key={spec.num}
                  className={`hover:bg-slate-50 ${
                    isCustomAdded
                      ? 'bg-sky-50/40'
                      : spec.sp === '?'
                      ? 'bg-amber-50/40'
                      : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-slate-900">
                    #{spec.num}
                    {isCustomAdded && (
                      <span className="ml-1.5 rounded bg-sky-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-sky-800">
                        {isEn ? 'new' : 'новая'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-semibold italic text-slate-900 whitespace-nowrap">
                    {spec.sp}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{spec.group}</td>
                  <td className="py-2.5 px-3 text-slate-700">
                    <span className="font-medium text-slate-900">
                      {translateRegion(spec.region, lang)}
                    </span>
                    {spec.district && spec.district !== '-' ? ` · ${spec.district}` : ''} ·{' '}
                    {spec.waterbody}
                    {spec.inVivoColor ? ` (${spec.inVivoColor})` : ''}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {spec.lat !== null && spec.lon !== null
                      ? `${spec.lat.toFixed(3)}, ${spec.lon.toFixed(3)}`
                      : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    {spec.date} · {spec.collector}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {formatTraitNumber(spec.traits['A1ser'], 0)} ·{' '}
                    {formatTraitNumber(spec.traits['P4IS_dr'], 0)} ·{' '}
                    {formatTraitNumber(spec.traits['cr/cs'], 2)} ·{' '}
                    {formatTraitNumber(spec.traits['xa/x'], 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => onLoadSpecimenIntoKey(spec, 'diagnostic8')}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                      >
                        {isEn ? '8 traits' : '8 признаков'}
                      </button>
                      <button
                        onClick={() => onLoadSpecimenIntoKey(spec, 'all')}
                        className="rounded bg-sky-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
                      >
                        {isEn
                          ? `All (${traits.length - spec.missingCount})`
                          : `Все (${traits.length - spec.missingCount})`}
                      </button>
                      {isCustomAdded && (
                        <button
                          onClick={() => onRemoveExtraSpecimen(spec.num)}
                          title={isEn ? 'Delete added specimen' : 'Удалить добавленную особь'}
                          className="rounded border border-rose-200 bg-white p-1 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
