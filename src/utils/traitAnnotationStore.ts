import { TraitAnnotation } from '../types/taxonomy';

const STORAGE_KEY = 'eucyclops_trait_annotations_v1';

/**
 * Qualitative state labels for discrete traits (0, 1, 2, 3) from the author's reference table.
 */
export const QUALITATIVE_STATE_LABELS: Record<string, Record<number, string>> = {
  A2N1g2: { 0: 'нет', 1: 'есть' },
  Mx1Bsr: { 0: 'нет', 1: 'есть' },
  P2X3_bsp: { 0: 'нет', 1: 'да' },
  P1X1os: { 0: 'нет', 1: 'есть' },
  P1X2os: { 0: 'нет', 1: 'есть' },
  P2X1os: { 0: 'нет', 1: 'есть' },
  P2X2os: { 0: 'нет', 1: 'есть' },
  P3X1os: { 0: 'нет', 1: 'есть' },
  P3X2os: { 0: 'нет', 1: 'есть' },
  P4X1os: { 0: 'нет', 1: 'есть' },
  P4X2os: { 0: 'нет', 1: 'есть' },
  P4X3os: { 0: 'нет', 1: 'есть' },
  P4IS_dr: { 0: 'короткий', 1: 'средний', 2: 'длинный' },
  P4IS_dr2: { 0: 'нет', 1: 'есть' },
  P4_CS_osp: { 0: 'нет', 1: 'есть' },
  P4_CS_osp3: { 0: 'нет', 1: 'есть' },
  'P4N2/N3': { 0: 'ширина < 2', 1: 'ширина > 2' },
  P4X3_pore: { 0: 'нет', 1: 'есть' },
  P4X3_as2: {
    0: 'обычная щетинка',
    1: 'с гиалиновой пл. и сетулами',
    2: 'лопатовидная с голым осн.',
  },
  'GS_m pore': { 0: 'нет', 1: 'есть' },
  Proct: { 0: 'нет', 1: 'есть' },
  Proct2: {
    0: 'нет',
    1: 'мелкие, мало',
    2: 'длинные, мало',
    3: 'мощные, много',
  },
  AnS_dsp: { 0: 'нет', 1: 'мелкие', 2: 'нормальные' },
  CRdp: { 0: 'нет', 1: 'есть' },
  CRoS_os: { 0: 'нет', 1: 'шипики', 2: 'сетулы' },
  CRoS_is: {
    0: 'нет',
    1: 'мелкие сетулы',
    2: 'длинные сетулы',
    3: 'шипики',
  },
};

export function formatQualitativeStateLabel(traitCode: string, stateVal: number): string {
  const map = QUALITATIVE_STATE_LABELS[traitCode];
  if (map && map[stateVal] !== undefined) {
    return `${stateVal} — ${map[stateVal]}`;
  }
  return String(stateVal);
}

export const BUILTIN_TRAIT_ANNOTATIONS: Record<string, TraitAnnotation> = {
  A2g1: {
    traitCode: 'A2g1',
    description: 'Группа шипиков g1 на коксобазисе А2',
    comment: 'Число шипиков',
  },
  A2g2: {
    traitCode: 'A2g2',
    description: 'Группа шипиков g2 на коксобазисе А2',
    comment: 'Число шипиков',
  },
  A2g3: {
    traitCode: 'A2g3',
    description: 'Группа шипиков g3 на коксобазисе А2',
    comment: 'Число шипиков',
  },
  A2g8: {
    traitCode: 'A2g8',
    description: 'Группа шипиков g8 на коксобазисе А2',
    comment: 'Число шипиков',
  },
  A2g9: {
    traitCode: 'A2g9',
    description: 'Группа шипиков g9 на коксобазисе А2',
    comment: 'Число шипиков',
  },
  A2N1g: {
    traitCode: 'A2N1g',
    description: 'Группа шипиков на передней стороне Enp1 А2',
    comment: 'Число шипиков',
  },
  A2N1g2: {
    traitCode: 'A2N1g2',
    description: 'Ряд шипиков/сетул по внешнему краю Enp1 А2',
    comment: '0 — нет; 1 — есть',
  },
  A1ser: {
    traitCode: 'A1ser',
    description: 'Гиалиновая пластинка на проксимальной части дистального сегмента А1',
    comment: 'Число зубцов (100 = если зубцы слишком мелкие для счета)',
  },
  Mx1Bsr: {
    traitCode: 'Mx1Bsr',
    description: 'Группа шипиков на базисе максиллулы',
    comment: '0 — нет; 1 — есть',
  },
  P2X3_bsp: {
    traitCode: 'P2X3_bsp',
    description: 'Проксимальный шип на P2 Exp3 в 2 раза короче следующего',
    comment: '0 — нет; 1 — да',
  },
  P23_nak_sp: {
    traitCode: 'P23_nak_sp',
    description: 'Общее число голых (без орнаментации) шипов на P2 Exp2 и Exp3',
    comment: '',
  },
  P1X1os: {
    traitCode: 'P1X1os',
    description: 'Сетулы на внешней стороне P1 Exp1',
    comment: '0 — нет, 1 — есть',
  },
  P1X2os: {
    traitCode: 'P1X2os',
    description: 'Сетулы на внешней стороне P1 Exp2',
    comment: '0 — нет, 1 — есть',
  },
  P2X1os: {
    traitCode: 'P2X1os',
    description: 'Сетулы на внешней стороне P2 Exp1',
    comment: '0 — нет, 1 — есть',
  },
  P2X2os: {
    traitCode: 'P2X2os',
    description: 'Сетулы на внешней стороне P2 Exp2',
    comment: '0 — нет, 1 — есть',
  },
  P3X1os: {
    traitCode: 'P3X1os',
    description: 'Сетулы на внешней стороне P3 Exp1',
    comment: '0 — нет, 1 — есть',
  },
  P3X2os: {
    traitCode: 'P3X2os',
    description: 'Сетулы на внешней стороне P3 Exp2',
    comment: '0 — нет, 1 — есть',
  },
  P4X1os: {
    traitCode: 'P4X1os',
    description: 'Сетулы на внешней стороне P4 Exp1',
    comment: '0 — нет, 1 — есть',
  },
  P4X2os: {
    traitCode: 'P4X2os',
    description: 'Сетулы на внешней стороне P4 Exp2',
    comment: '0 — нет, 1 — есть',
  },
  P4X3os: {
    traitCode: 'P4X3os',
    description: 'Сетулы на внешней стороне P4 Exp3',
    comment: '0 — нет, 1 — есть',
  },
  P4IS_dr: {
    traitCode: 'P4IS_dr',
    description: 'Дистальный ряд интеркоксального склерита P4',
    comment: '0 — короткий; 1 — средний; 2 — длинный',
  },
  P4IS_dr2: {
    traitCode: 'P4IS_dr2',
    description: 'Шипики в средней трети дистального ряда интеркоксального склерита P4',
    comment: '0 — нет; 1 — есть',
  },
  P4IS_drn: {
    traitCode: 'P4IS_drn',
    description: 'Общее число шипиков в дистальном ряду интеркоксального склерита P4',
    comment: 'Без деления на 2',
  },
  P4C_N: {
    traitCode: 'P4C_N',
    description: 'Суммарное число элементов на всех сторонах группы N1-N2 (кокса P4)',
    comment: 'Это группы, которых в стандартной нумерации вообще нет',
  },
  P4_CS_osp: {
    traitCode: 'P4_CS_osp',
    description: 'Разрыв (gap) в орнаментации на коксальной щетинке P4',
    comment: '0 — нет; 1 — есть',
  },
  P4_CS_osp2: {
    traitCode: 'P4_CS_osp2',
    description: 'Количество ВНЕШНИХ элементов на коксальной щетинке P4',
    comment: '',
  },
  P4_CS_osp3: {
    traitCode: 'P4_CS_osp3',
    description: 'Пучок сетул у основания коксальной щетинки P4',
    comment: '0 — нет; 1 — есть',
  },
  P4_B_sp: {
    traitCode: 'P4_B_sp',
    description: 'Шипики на каудальной стороне базиса P4 возле основания Exp',
    comment: '',
  },
  P4X1is: {
    traitCode: 'P4X1is',
    description: 'Элементы на внутренней стороне P4 Exp1',
    comment: '',
  },
  P4X2is: {
    traitCode: 'P4X2is',
    description: 'Элементы на внутренней стороне P4 Exp2',
    comment: '',
  },
  P4X1cs: {
    traitCode: 'P4X1cs',
    description: 'Задние шипики на P4 Exp1',
    comment: '',
  },
  P4X2cs: {
    traitCode: 'P4X2cs',
    description: 'Задние шипики на P4 Exp2',
    comment: '',
  },
  P4N1cs: {
    traitCode: 'P4N1cs',
    description: 'Задние шипики на P4 Enp1',
    comment: '',
  },
  P4N2cs: {
    traitCode: 'P4N2cs',
    description: 'Задние шипики на P4 Enp2',
    comment: '',
  },
  'P4N2/N3': {
    traitCode: 'P4N2/N3',
    description: 'Отношение ширины сегментов P4 Enp (Enp2 к Enp3)',
    comment: '0 — ширина < 2; 1 — ширина > 2',
  },
  P4X3_pore: {
    traitCode: 'P4X3_pore',
    description: 'Базальная пора проксимальнее всех шипов на P4 Exp3',
    comment: '0 — нет; 1 — есть',
  },
  P4X3_as2: {
    traitCode: 'P4X3_as2',
    description: 'Форма апикальной щетинки P4 Exp3',
    comment: '0 — обычная щетинка; 1 — с гиалиновой пластинкой и сетулами; 2 — лопатовидная с голым основанием',
  },
  P4X3_is: {
    traitCode: 'P4X3_is',
    description: 'Число внутренних щетинок с гиалиновой пластинкой на P4 Exp3',
    comment: 'До 4 штук',
  },
  P4X3_isd: {
    traitCode: 'P4X3_isd',
    description: 'Число пальцевидных щетинок с тупым концом на P4 Exp3',
    comment: '',
  },
  'GS_m pore': {
    traitCode: 'GS_m pore',
    description: 'Медиальная пора в передней части генитального сомита',
    comment: '0 — нет; 1 — есть',
  },
  Proct: {
    traitCode: 'Proct',
    description: 'Волоски проктодеума',
    comment: '0 — нет; 1 — есть',
  },
  Proct2: {
    traitCode: 'Proct2',
    description: 'Второй ряд орнаментации у дистального края проктодеума',
    comment: '0 — нет; 1 — мелкие, мало; 2 — длинные, мало; 3 — мощные, много',
  },
  AnS_dsp: {
    traitCode: 'AnS_dsp',
    description: 'Мелкие задние дорсальные шипики на анальном сомите у основания каудальной ветви',
    comment: '0 — нет; 1 — мелкие; 2 — нормальные',
  },
  CRdp: {
    traitCode: 'CRdp',
    description: 'Дорсальная пора на каудальных ветвях',
    comment: '0 — нет; 1 — есть',
  },
  CRIS_oset: {
    traitCode: 'CRIS_oset',
    description: 'Элементы на внешней стороне внутренней щетинки (sVI)',
    comment: '',
  },
  CRIS_iset: {
    traitCode: 'CRIS_iset',
    description: 'Орнаментация (сетулы) на внутренней стороне внутренней щетинки (sVI)',
    comment: '',
  },
  CRoS_os: {
    traitCode: 'CRoS_os',
    description: 'Орнаментация внешней щетинки (sIII) (внешняя сторона)',
    comment: '0 — нет; 1 — шипики; 2 — сетулы',
  },
  CRoS_is: {
    traitCode: 'CRoS_is',
    description: 'Орнаментация внешней щетинки (sIII) (внутренняя сторона)',
    comment: '0 — нет; 1 — мелкие сетулы; 2 — длинные сетулы; 3 — шипики',
  },
  CRoS_osn: {
    traitCode: 'CRoS_osn',
    description: 'Элементы на внешней стороне внешней щетинки (sIII)',
    comment: '',
  },
  CRoS_isn: {
    traitCode: 'CRoS_isn',
    description: 'Элементы на внутренней стороне внешней щетинки (sIII)',
    comment: '',
  },
  sIVmo: {
    traitCode: 'sIVmo',
    description: 'Сетулы в медиальной части внешней стороны внешней апикальной щетинки (sIV)',
    comment: '',
  },
  sIVmi: {
    traitCode: 'sIVmi',
    description: 'Сетулы в медиальной части внутренней стороны внешней апикальной щетинки (sIV)',
    comment: '',
  },
  sVmo: {
    traitCode: 'sVmo',
    description: 'Сетулы в медиальной части внешней стороны внутренней апикальной щетинки (sV)',
    comment: '',
  },
  sVmi: {
    traitCode: 'sVmi',
    description: 'Сетулы в медиальной части внутренней стороны внутренней апикальной щетинки (sV)',
    comment: '',
  },
  Crser: {
    traitCode: 'Crser',
    description: 'Шипики на серре (каудальные ветви)',
    comment: 'Точное число',
  },
  'xa/x': {
    traitCode: 'xa/x',
    description: 'Морфометрический индекс xa/x (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'xas/x': {
    traitCode: 'xas/x',
    description: 'Морфометрический индекс xas/x (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'xas/xa': {
    traitCode: 'xas/xa',
    description: 'Морфометрический индекс xas/xa (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'n/ns': {
    traitCode: 'n/ns',
    description: 'Морфометрический индекс n/ns (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'no/n': {
    traitCode: 'no/n',
    description: 'Морфометрический индекс no/n (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'nai/nao': {
    traitCode: 'nai/nao',
    description: 'Морфометрический индекс nai/nao (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'nai/n': {
    traitCode: 'nai/n',
    description: 'Морфометрический индекс nai/n (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'cr/cs': {
    traitCode: 'cr/cs',
    description: 'Морфометрический индекс cr/cs (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'crr/cr': {
    traitCode: 'crr/cr',
    description: 'Морфометрический индекс crr/cr (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'cri/cro': {
    traitCode: 'cri/cro',
    description: 'Морфометрический индекс cri/cro (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'cri/cr': {
    traitCode: 'cri/cr',
    description: 'Морфометрический индекс cri/cr (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'cro/cs': {
    traitCode: 'cro/cs',
    description: 'Морфометрический индекс cro/cs (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
  'x/n': {
    traitCode: 'x/n',
    description: 'Морфометрический индекс x/n (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
  },
};

export function getDefaultPlaceholderDescription(traitCode: string): string {
  if (BUILTIN_TRAIT_ANNOTATIONS[traitCode]?.description) {
    return BUILTIN_TRAIT_ANNOTATIONS[traitCode].description;
  }
  return `Признак ${traitCode}`;
}

export function getTraitDisplayDescription(
  traitCode: string,
  annotations?: Record<string, TraitAnnotation>
): string {
  const custom = annotations?.[traitCode]?.description?.trim();
  if (custom) return custom;
  return getDefaultPlaceholderDescription(traitCode);
}

export function loadTraitAnnotations(): Record<string, TraitAnnotation> {
  const merged: Record<string, TraitAnnotation> = { ...BUILTIN_TRAIT_ANNOTATIONS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [code, ann] of Object.entries(parsed as Record<string, TraitAnnotation>)) {
          const builtin = BUILTIN_TRAIT_ANNOTATIONS[code];
          merged[code] = {
            traitCode: code,
            description: ann.description?.trim() ? ann.description : builtin?.description || '',
            comment: ann.comment?.trim() ? ann.comment : builtin?.comment || '',
            imageUrl: ann.imageUrl,
            imageCaption: ann.imageCaption,
          };
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return merged;
}

export function saveTraitAnnotations(annotations: Record<string, TraitAnnotation>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch (err) {
    console.error('Не удалось сохранить иллюстрации/описания в localStorage:', err);
  }
}

/**
 * Compresses an uploaded or pasted image File/Blob into a compact DataURL
 * (max 1100px dimension) so dozens of trait illustrations fit comfortably in localStorage.
 */
export function compressImageFileToDataUrl(
  file: File | Blob,
  maxDimension = 1100,
  quality = 0.84
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Ошибка чтения файла изображения'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        // Fill white background in case of transparent PNG diagrams
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const compressed = canvas.toDataURL('image/webp', quality);
          if (compressed && compressed.startsWith('data:image/')) {
            resolve(compressed);
          } else {
            resolve(canvas.toDataURL('image/jpeg', quality));
          }
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
