import React, { useMemo, useState } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { SpecimenRecord, TraitDefinition } from '../types/taxonomy';
import { formatTraitNumber } from '../utils/matrixEngine';

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
        const text = `${s.num} ${s.sp} ${s.region} ${s.district} ${s.waterbody} ${s.collector} ${s.inVivoColor}`.toLowerCase();
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
              Матрица особей ({specimens.length} экз.
              {extraSpecimens.length > 0 ? `, из них ${extraSpecimens.length} добавлено вами` : ''})
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Полная база промеров особей. Вы можете добавлять новые особи (из Excel или вручную) — ключ автоматически пересчитает все диапазоны и дисперсии.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenAddSpecimenModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              + Добавить особей (Excel / форма)
            </button>

            <button
              onClick={onExportFullCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-sky-700" />
              Скачать обновлённый CSV
            </button>

            {unknownSpecimen && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-1.5">
                <div className="text-xs">
                  <div className="font-semibold text-amber-900">
                    Неопределённая особь #{unknownSpecimen.num} (sp = ?)
                  </div>
                </div>
                <button
                  onClick={() => onLoadSpecimenIntoKey(unknownSpecimen, 'all')}
                  className="rounded-md bg-amber-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Определить #{unknownSpecimen.num}
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
            placeholder="Поиск по виду, водоему, номеру, сборщику..."
            className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
          />

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">Регион:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
            >
              <option value="all">Все регионы ({regions.length})</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">Группа:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
            >
              <option value="all">Все группы ({groups.length})</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <span className="ml-auto font-mono text-xs text-slate-500">
            Показано: {filteredSpecimens.length} из {specimens.length}
          </span>
        </div>
      </div>

      {/* Specimens Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="py-3 px-3 font-semibold">num</th>
              <th className="py-3 px-3 font-semibold">sp (Вид)</th>
              <th className="py-3 px-3 font-semibold">group</th>
              <th className="py-3 px-3 font-semibold">Регион / Район / Водоем</th>
              <th className="py-3 px-3 font-semibold">N, E</th>
              <th className="py-3 px-3 font-semibold">data / leg.</th>
              <th className="py-3 px-3 font-mono font-semibold">A1ser · P4IS_dr · cr/cs · xa/x</th>
              <th className="py-3 px-3 font-semibold text-right">Подставить в ключ</th>
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
                        новая
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-semibold italic text-slate-900 whitespace-nowrap">
                    {spec.sp}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{spec.group}</td>
                  <td className="py-2.5 px-3 text-slate-700">
                    <span className="font-medium text-slate-900">{spec.region}</span>
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
                        8 признаков
                      </button>
                      <button
                        onClick={() => onLoadSpecimenIntoKey(spec, 'all')}
                        className="rounded bg-sky-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
                      >
                        Все ({traits.length - spec.missingCount})
                      </button>
                      {isCustomAdded && (
                        <button
                          onClick={() => onRemoveExtraSpecimen(spec.num)}
                          title="Удалить добавленную особь"
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

