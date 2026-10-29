import React, { useMemo, useState } from 'react';
import { X, FileSpreadsheet, Download, Trash2, CheckCircle2 } from 'lucide-react';
import {
  SpeciesProfile,
  SpecimenRecord,
  TraitDefinition,
  UserTraitFilter,
} from '../types/taxonomy';
import { parsePastedSpecimenRows } from '../utils/matrixEngine';
import { useLanguage } from '../utils/i18n';

interface AddSpecimenModalProps {
  speciesList: SpeciesProfile[];
  specimens: SpecimenRecord[];
  extraSpecimens: SpecimenRecord[];
  traits: TraitDefinition[];
  activeFilters?: Record<string, UserTraitFilter>;
  onAddSpecimens: (newSpecs: SpecimenRecord[]) => void;
  onRemoveExtraSpecimen: (num: number) => void;
  onClearAllExtraSpecimens: () => void;
  onExportFullCsv: () => void;
  onClose: () => void;
}

export const AddSpecimenModal: React.FC<AddSpecimenModalProps> = ({
  specimens,
  extraSpecimens,
  traits,
  onAddSpecimens,
  onRemoveExtraSpecimen,
  onClearAllExtraSpecimens,
  onExportFullCsv,
  onClose,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const [mode, setMode] = useState<'paste' | 'manage'>('paste');

  const nextAvailableNum = useMemo(() => {
    return specimens.reduce((max, s) => Math.max(max, s.num), 0) + 1;
  }, [specimens]);

  // Paste Excel/CSV state
  const [pastedText, setPastedText] = useState<string>('');
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    const parsed = parsePastedSpecimenRows(pastedText, traits, nextAvailableNum);
    if (parsed.length === 0) {
      setPasteFeedback(
        isEn
          ? 'Could not parse rows. Make sure each row contains columns matching the reference table (starting with specimen number or species name).'
          : 'Не удалось распознать строки. Убедитесь, что строка содержит колонки как в исходной таблице (начиная с номера или названия вида).'
      );
      return;
    }
    onAddSpecimens(parsed);
    setPastedText('');
    setPasteFeedback(
      isEn
        ? `Successfully added ${parsed.length} specimen(s) from table rows. All variability ranges and small-sample tolerances in the key have been dynamically updated.`
        : `Успешно добавлено особей из таблицы: ${parsed.length}. Все диапазоны изменчивости и поправки на малую выборку в ключе динамически обновлены.`
    );
    setMode('manage');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <div className="text-xs font-semibold text-sky-800">
              {isEn
                ? 'Dynamic Specimen Database Expansion from Tabular Data · Automatic Key Recalculation'
                : 'Динамическое пополнение базы препаратов из табличных данных · Автоматический пересчёт ключа'}
            </div>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">
              {isEn
                ? `Import Rows from Excel / CSV & Manage Matrix (${specimens.length} spec.)`
                : `Импорт строк из таблицы Excel / CSV и управление матрицей (${specimens.length} экз.)`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Tabs & Export Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('paste')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === 'paste'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {isEn ? 'Paste Rows from Excel / CSV' : 'Вставить строки из Excel / CSV'}
            </button>
            <button
              type="button"
              onClick={() => setMode('manage')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === 'manage'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn
                ? `Added Specimens (${extraSpecimens.length})`
                : `Добавленные особи (${extraSpecimens.length})`}
            </button>
          </div>

          <button
            type="button"
            onClick={onExportFullCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-sky-700" />
            {isEn ? 'Download Updated Matrix (.csv)' : 'Скачать обновлённую матрицу (.csv)'}
          </button>
        </div>

        {pasteFeedback && (
          <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-6 py-2.5 text-xs font-medium text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{pasteFeedback}</span>
            </div>
            <button
              onClick={() => setPasteFeedback(null)}
              className="text-emerald-700 hover:text-emerald-950"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'paste' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1.5">
                <div className="font-semibold text-slate-900">
                  {isEn
                    ? 'Adding specimens from an Excel or CSV table:'
                    : 'Добавление особей из таблицы Excel или CSV:'}
                </div>
                <p>
                  {isEn
                    ? 'Copy one or more specimen rows from your working Excel sheet (or CSV) and paste them into the box below. Column order must match the reference file (specimen metadata + morphological traits). You can also upload a complete updated CSV file using the "Upload CSV Matrix" button in the top bar.'
                    : 'Скопируйте одну или несколько строк особей в вашей рабочей таблице Excel (или CSV) и вставьте их в поле ниже. Порядок столбцов должен соответствовать исходному файлу (метаданные особи + признаки). Также вы можете загрузить обновлённый CSV-файл целиком кнопкой «Загрузить CSV матрицу» в верхней панели.'}
                </p>
              </div>

              <textarea
                rows={9}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={
                  isEn
                    ? 'Paste one or more rows copied from Excel (tab-separated) or CSV (comma-separated)...'
                    : 'Вставьте сюда одну или несколько строк, скопированных из Excel (разделитель табуляция) или CSV (разделитель запятая)...'
                }
                className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {isEn ? 'Close' : 'Закрыть'}
                </button>
                <button
                  type="button"
                  onClick={handlePasteSubmit}
                  disabled={!pastedText.trim()}
                  className="rounded-lg bg-sky-700 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-40"
                >
                  {isEn ? 'Parse & Add Rows to Database' : 'Распознать и добавить строки в базу'}
                </button>
              </div>
            </div>
          )}

          {mode === 'manage' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                  {isEn
                    ? 'Below are specimens added from tabular rows in addition to the 182 baseline specimens. They are saved in your browser and automatically included in all range and variance calculations.'
                    : 'Ниже перечислены особи, добавленные из табличных строк сверх исходных 182 препаратов. Они сохраняются в браузере и автоматически участвуют в расчёте всех диапазонов и статистик ключа.'}
                </p>
                {extraSpecimens.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAllExtraSpecimens}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isEn
                      ? `Delete All Added (${extraSpecimens.length})`
                      : `Удалить все добавленные (${extraSpecimens.length})`}
                  </button>
                )}
              </div>

              {extraSpecimens.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
                  {isEn
                    ? 'No extra specimens added yet. Use the "Paste Rows from Excel / CSV" tab or the "Upload CSV Matrix" button in the header.'
                    : 'Пока нет дополнительно добавленных особей. Используйте вкладку «Вставить строки из Excel / CSV» или кнопку «Загрузить CSV матрицу» в шапке.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="py-2.5 px-3 font-semibold">num</th>
                        <th className="py-2.5 px-3 font-semibold">
                          {isEn ? 'Species (sp)' : 'Вид (sp)'}
                        </th>
                        <th className="py-2.5 px-3 font-semibold">
                          {isEn ? 'Group' : 'Группа'}
                        </th>
                        <th className="py-2.5 px-3 font-semibold">
                          {isEn ? 'Locality' : 'Локалитет'}
                        </th>
                        <th className="py-2.5 px-3 font-semibold">
                          {isEn ? 'Traits Recorded' : 'Заполнено признаков'}
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-right">
                          {isEn ? 'Action' : 'Действие'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {extraSpecimens.map((sp) => (
                        <tr key={sp.num} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                            #{sp.num}
                          </td>
                          <td className="py-2 px-3 font-semibold italic text-slate-900">
                            {sp.sp}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{sp.group}</td>
                          <td className="py-2 px-3 text-slate-600">
                            {sp.region} · {sp.waterbody}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            {traits.length - sp.missingCount} / {traits.length}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onRemoveExtraSpecimen(sp.num)}
                              className="inline-flex items-center gap-1 rounded border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              {isEn ? 'Delete' : 'Удалить'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
