import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  Eye,
  Filter,
} from 'lucide-react';
import {
  AnatomicalSection,
  TraitAnnotation,
  TraitDefinition,
  UserTraitFilter,
} from '../types/taxonomy';
import { formatTraitNumber } from '../utils/matrixEngine';
import {
  formatQualitativeStateLabel,
  getTraitDisplayDescription,
  QUALITATIVE_STATE_LABELS,
} from '../utils/traitAnnotationStore';

export type AnatomyPartId =
  | 'A1'
  | 'A2'
  | 'Mx1'
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4'
  | 'P4_IcS'
  | 'P4_Cox'
  | 'P4_Bas'
  | 'P4_Enp'
  | 'P4_Exp'
  | 'P5'
  | 'GS'
  | 'AnS'
  | 'CR';

interface AnatomyPartMeta {
  id: AnatomyPartId;
  shortLabel: string;
  title: string;
  bodyDivision: 'Просома (Цефалоторакс)' | 'Просома (Торакс)' | 'Уросома';
  description: string;
  sectionToFilter: AnatomicalSection | 'all';
  traitCodes: string[];
}

export const ANATOMY_PARTS: Record<AnatomyPartId, AnatomyPartMeta> = {
  A1: {
    id: 'A1',
    shortLabel: 'A1',
    title: 'Антеннулы (A1) — дистальный сегмент',
    bodyDivision: 'Просома (Цефалоторакс)',
    description:
      'Первая пара антенн (12-члениковые у самок). В ключе учитывается строение и число зубцов гиалиновой пластинки (серры) в проксимальной части дистального сегмента.',
    sectionToFilter: 'A1_Mx1',
    traitCodes: ['A1ser'],
  },
  A2: {
    id: 'A2',
    shortLabel: 'A2',
    title: 'Антенны (A2) — коксобазис и Enp1',
    bodyDivision: 'Просома (Цефалоторакс)',
    description:
      'Вторая пара антенн. Один из важнейших таксономических комплексов рода Eucyclops: микровооружение (группы шипиков g1, g2, g3, g8, g9) на фронтальной и каудальной сторонах коксобазиса и на первом членике эндоподита (Enp1).',
    sectionToFilter: 'A2',
    traitCodes: ['A2g1', 'A2g2', 'A2g3', 'A2g8', 'A2g9', 'A2N1g', 'A2N1g2'],
  },
  Mx1: {
    id: 'Mx1',
    shortLabel: 'Mx1 (Md–Mxp)',
    title: 'Максиллула (Mx1) и ротовой комплекс',
    bodyDivision: 'Просома (Цефалоторакс)',
    description:
      'Ротовые конечности цефалоторакса (мандибула Md, максиллула Mx1, максилла Mx2, максиллипед Mxp). В определителе используется наличие группы шипиков на базисе максиллулы (Mx1Bsr).',
    sectionToFilter: 'A1_Mx1',
    traitCodes: ['Mx1Bsr'],
  },
  P1: {
    id: 'P1',
    shortLabel: 'P1',
    title: 'Первая пара плавательных ног (P1)',
    bodyDivision: 'Просома (Цефалоторакс)',
    description:
      'Расположена в задней части цефалоторакса. Учитывается наличие сетул на внешней стороне первого и второго члеников экзоподита (P1 Exp1 и P1 Exp2).',
    sectionToFilter: 'P1_P3',
    traitCodes: ['P1X1os', 'P1X2os'],
  },
  P2: {
    id: 'P2',
    shortLabel: 'P2',
    title: 'Вторая пара плавательных ног (P2) и II торакальный сомит',
    bodyDivision: 'Просома (Торакс)',
    description:
      'Учитывается относительная длина проксимального шипа на P2 Exp3, число голых шипов на Exp2–Exp3 и сетулы на внешнем крае Exp1–Exp2.',
    sectionToFilter: 'P1_P3',
    traitCodes: ['P2X3_bsp', 'P23_nak_sp', 'P2X1os', 'P2X2os'],
  },
  P3: {
    id: 'P3',
    shortLabel: 'P3',
    title: 'Третья пара плавательных ног (P3) и III торакальный сомит',
    bodyDivision: 'Просома (Торакс)',
    description:
      'Учитываются сетулы на внешней стороне первого и второго члеников экзоподита (P3 Exp1 и P3 Exp2), а также общее число голых шипов.',
    sectionToFilter: 'P1_P3',
    traitCodes: ['P3X1os', 'P3X2os', 'P23_nak_sp'],
  },
  P4: {
    id: 'P4',
    shortLabel: 'P4 (вся ножка)',
    title: 'Четвёртая пара ног (P4): IcS, Cox, Bas, Enp1–3, Exp1–3 и индексы',
    bodyDivision: 'Просома (Торакс)',
    description:
      'Ключевая конечность для диагностики видов Eucyclops (препарируется каудальной стороной вверх). Нажмите на отдельные элементы P4 на схеме (IcS, Cox, Bas, En1–3, Ex1–3) или выберите подуровень ниже.',
    sectionToFilter: 'P4',
    traitCodes: [
      'P4IS_dr',
      'P4IS_dr2',
      'P4IS_drn',
      'P4C_N',
      'P4_CS_osp',
      'P4_CS_osp2',
      'P4_CS_osp3',
      'P4_B_sp',
      'P4X1os',
      'P4X2os',
      'P4X3os',
      'P4X1is',
      'P4X2is',
      'P4X1cs',
      'P4X2cs',
      'P4N1cs',
      'P4N2cs',
      'P4N2/N3',
      'P4X3_pore',
      'P4X3_as2',
      'P4X3_is',
      'P4X3_isd',
      'xa/x',
      'xas/x',
      'xas/xa',
      'n/ns',
      'no/n',
      'nai/nao',
      'nai/n',
      'x/n',
    ],
  },
  P4_IcS: {
    id: 'P4_IcS',
    shortLabel: 'P4: IcS (склерит)',
    title: 'Интеркоксальный склерит P4 (IcS)',
    bodyDivision: 'Просома (Торакс)',
    description:
      'Межкоксальная пластинка P4. Оценивается длина волосков/шипиков дистального ряда (I ряд), наличие элементов в его средней трети и общее число шипиков.',
    sectionToFilter: 'P4',
    traitCodes: ['P4IS_dr', 'P4IS_dr2', 'P4IS_drn'],
  },
  P4_Cox: {
    id: 'P4_Cox',
    shortLabel: 'P4: Cox (кокса)',
    title: 'Кокса P4 (Cox) и коксальная щетинка',
    bodyDivision: 'Просома (Торакс)',
    description:
      'Коксоподит P4 и его внутренняя щетинка. Оценивается группа шипиков N1–N2, наличие разрыва (gap) в опушении коксальной щетинки, число внешних элементов и пучок сетул у основания.',
    sectionToFilter: 'P4',
    traitCodes: ['P4C_N', 'P4_CS_osp', 'P4_CS_osp2', 'P4_CS_osp3'],
  },
  P4_Bas: {
    id: 'P4_Bas',
    shortLabel: 'P4: Bas (базис)',
    title: 'Базис P4 (Bas)',
    bodyDivision: 'Просома (Торакс)',
    description:
      'Базиподит P4. Учитывается число шипиков на каудальной стороне базиса возле основания экзоподита.',
    sectionToFilter: 'P4',
    traitCodes: ['P4_B_sp'],
  },
  P4_Enp: {
    id: 'P4_Enp',
    shortLabel: 'P4: En1–En3 (эндоподит)',
    title: 'Эндоподит P4 (En1, En2, En3) и его морфометрические индексы',
    bodyDivision: 'Просома (Торакс)',
    description:
      'Внутренняя 3-члениковая ветвь P4. Учитываются задние шипики на Enp1 и Enp2, отношение ширины Enp2/Enp3 и индексы дистального членика Enp3 (n/ns, no/n, nai/nao, nai/n, x/n).',
    sectionToFilter: 'P4',
    traitCodes: ['P4N1cs', 'P4N2cs', 'P4N2/N3', 'n/ns', 'no/n', 'nai/nao', 'nai/n', 'x/n'],
  },
  P4_Exp: {
    id: 'P4_Exp',
    shortLabel: 'P4: Ex1–Ex3 (экзоподит)',
    title: 'Экзоподит P4 (Ex1, Ex2, Ex3) и его морфометрические индексы',
    bodyDivision: 'Просома (Торакс)',
    description:
      'Внешняя 3-члениковая ветвь P4. Учитываются сетулы и шипики на Exp1–Exp3, базальная пора Exp3, форма апикальной и внутренних щетинок Exp3, а также индексы xa/x, xas/x, xas/xa, x/n.',
    sectionToFilter: 'P4',
    traitCodes: [
      'P4X1os',
      'P4X2os',
      'P4X3os',
      'P4X1is',
      'P4X2is',
      'P4X1cs',
      'P4X2cs',
      'P4X3_pore',
      'P4X3_as2',
      'P4X3_is',
      'P4X3_isd',
      'xa/x',
      'xas/x',
      'xas/xa',
      'x/n',
    ],
  },
  P5: {
    id: 'P5',
    shortLabel: 'P5 и V сомит',
    title: 'Пятый торакальный сомит (T5) и рудиментарная ножка P5',
    bodyDivision: 'Уросома',
    description:
      'При препарировании отделяется вместе с абдоменом (уросомой). Признаки вооружения P5 исключены из расчётной матрицы ключа по решению автора из-за низкой диагностической надёжности.',
    sectionToFilter: 'Somites',
    traitCodes: [],
  },
  GS: {
    id: 'GS',
    shortLabel: 'Генитальный сомит (и P6)',
    title: 'Генитальный двусомит и рудименты P6',
    bodyDivision: 'Уросома',
    description:
      'Передний крупный сегмент абдомена самки (образуется слиянием последнего торакального и первого абдоминального сегментов). В ключе учитывается наличие медиальной поры (GS_m pore).',
    sectionToFilter: 'Somites',
    traitCodes: ['GS_m pore'],
  },
  AnS: {
    id: 'AnS',
    shortLabel: 'Анальный сомит',
    title: 'Абдоминальные и анальный сомит (включая проктодеум)',
    bodyDivision: 'Уросома',
    description:
      'Задний сомит уросомы перед каудальными ветвями. Оценивается вооружение проктодеума (первый и второй ряд волосков/шипиков) и мелкие дорсальные шипики у основания фурки.',
    sectionToFilter: 'Somites',
    traitCodes: ['Proct', 'Proct2', 'AnS_dsp'],
  },
  CR: {
    id: 'CR',
    shortLabel: 'Каудальные ветви',
    title: 'Каудальные ветви (Фурка), щетинки sIII–sVI, серра и индексы',
    bodyDivision: 'Уросома',
    description:
      'Парные ветви фурки на конце уросомы. Включают дорсальную пору (CRdp), число шипиков латеральной серры (Crser), микровооружение щетинок sIII, sIV, sV, sVI и 5 важнейших морфометрических индексов (cr/cs, crr/cr, cri/cro, cri/cr, cro/cs).',
    sectionToFilter: 'CR_Setae',
    traitCodes: [
      'CRdp',
      'Crser',
      'CRIS_oset',
      'CRIS_iset',
      'CRoS_os',
      'CRoS_is',
      'CRoS_osn',
      'CRoS_isn',
      'sIVmo',
      'sIVmi',
      'sVmo',
      'sVmi',
      'cr/cs',
      'crr/cr',
      'cri/cro',
      'cri/cr',
      'cro/cs',
    ],
  },
};

interface InteractiveAnatomyMapProps {
  traits: TraitDefinition[];
  traitMap: Record<string, TraitDefinition>;
  traitAnnotations: Record<string, TraitAnnotation>;
  activeFilters: Record<string, UserTraitFilter>;
  separatingPower: Record<string, number>;
  numericDrafts: Record<string, string>;
  onToggleQualitativeState: (traitCode: string, stateVal: number) => void;
  onQuantitativeChange: (traitCode: string, rawText: string) => void;
  onClearTrait: (traitCode: string) => void;
  onOpenTraitInspector: (trait: TraitDefinition) => void;
  onFilterMainListBySection: (section: AnatomicalSection | 'all', searchHint?: string) => void;
}

export const InteractiveAnatomyMap: React.FC<InteractiveAnatomyMapProps> = ({
  traitMap,
  traitAnnotations,
  activeFilters,
  separatingPower,
  numericDrafts,
  onToggleQualitativeState,
  onQuantitativeChange,
  onClearTrait,
  onOpenTraitInspector,
  onFilterMainListBySection,
}) => {
  const [selectedPart, setSelectedPart] = useState<AnatomyPartId>('P4');
  const [hoveredPart, setHoveredPart] = useState<AnatomyPartId | null>(null);

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

  const getPartStats = (partId: AnatomyPartId) => {
    const codes = ANATOMY_PARTS[partId].traitCodes;
    let entered = 0;
    let maxSep = 0;
    for (const c of codes) {
      if (isTraitEntered(c)) entered++;
      const s = separatingPower[c] || 0;
      if (s > maxSep) maxSep = s;
    }
    return { total: codes.length, entered, maxSep };
  };

  const currentMeta = ANATOMY_PARTS[selectedPart];
  const currentTraits = useMemo(() => {
    return currentMeta.traitCodes
      .map((code) => traitMap[code])
      .filter((t): t is TraitDefinition => Boolean(t));
  }, [currentMeta, traitMap]);

  const isSelectedGroup = (id: AnatomyPartId) => {
    if (selectedPart === id) return true;
    if (id === 'P4' && selectedPart.startsWith('P4_')) return true;
    return false;
  };

  const isHoveredGroup = (id: AnatomyPartId) => {
    if (hoveredPart === id) return true;
    if (id === 'P4' && hoveredPart?.startsWith('P4_')) return true;
    return false;
  };

  // Helper styles for SVG appendage & somite shapes
  const getAppendageFill = (id: AnatomyPartId) => {
    if (selectedPart === id || (id === 'P4' && selectedPart === 'P4')) {
      return '#dc2626'; // bright red when selected
    }
    if (hoveredPart === id) {
      return '#fb7185'; // lighter coral on hover
    }
    return '#f04c41'; // exact coral red from user's diagram
  };

  const getSomiteFill = (id: AnatomyPartId) => {
    if (selectedPart === id) {
      return '#fde047'; // brighter gold when selected
    }
    if (hoveredPart === id) {
      return '#fef08a';
    }
    return '#f4e079'; // exact pale yellow from user's diagram
  };

  const getStrokeProps = (id: AnatomyPartId) => {
    const active = selectedPart === id;
    const hovered = hoveredPart === id;
    return {
      stroke: active ? '#0284c7' : hovered ? '#0369a1' : '#1e293b',
      strokeWidth: active ? 2.6 : hovered ? 2.2 : 1.4,
    };
  };

  // Generate A1 segments (12 segments left and right arcing outward as in the drawing)
  const a1SegmentsLeft = [
    { cx: 294, cy: 112, rx: 11, ry: 11, rot: -35 },
    { cx: 280, cy: 93, rx: 11, ry: 9, rot: -40 },
    { cx: 263, cy: 78, rx: 10, ry: 8, rot: -35 },
    { cx: 244, cy: 67, rx: 10, ry: 7.5, rot: -25 },
    { cx: 224, cy: 58, rx: 9.5, ry: 7, rot: -18 },
    { cx: 204, cy: 52, rx: 9.5, ry: 6.5, rot: -12 },
    { cx: 183, cy: 48, rx: 9.5, ry: 6, rot: -8 },
    { cx: 162, cy: 45, rx: 9.5, ry: 5.5, rot: -5 },
    { cx: 141, cy: 43, rx: 9.5, ry: 5, rot: -3 },
    { cx: 120, cy: 42, rx: 9.5, ry: 4.5, rot: -2 },
    { cx: 99, cy: 41, rx: 9.5, ry: 4, rot: 0 },
    { cx: 77, cy: 40, rx: 10.5, ry: 3.8, rot: 0 },
  ];

  const a1SegmentsRight = a1SegmentsLeft.map((s) => ({
    cx: 660 - s.cx,
    cy: s.cy,
    rx: s.rx,
    ry: s.ry,
    rot: -s.rot,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Интерактивная векторная схема строения самки <em>Eucyclops</em> (вентрально)
          </h3>
          <p className="text-xs text-slate-600">
            Нажмите на любую конечность (<span className="font-mono">A1, A2, Mx1, P1–P5</span>, включая отдельные членики{' '}
            <span className="font-mono">P4: IcS, Cox, Bas, En1–3, Ex1–3</span>) или сомит, чтобы увидеть и сразу ввести относящиеся к ним признаки.
          </p>
        </div>

        {/* Quick part selector pills */}
        <div className="flex flex-wrap items-center gap-1">
          {(
            ['A1', 'A2', 'Mx1', 'P1', 'P2', 'P3', 'P4', 'GS', 'AnS', 'CR'] as AnatomyPartId[]
          ).map((pid) => {
            const st = getPartStats(pid);
            const active = isSelectedGroup(pid);
            return (
              <button
                key={pid}
                type="button"
                onClick={() => setSelectedPart(pid)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-700 text-white shadow-2xs'
                    : st.entered > 0
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{ANATOMY_PARTS[pid].shortLabel}</span>
                <span
                  className={`font-mono text-[10px] ${
                    active ? 'text-sky-100' : 'text-slate-400'
                  }`}
                >
                  ({st.entered > 0 ? `${st.entered}/` : ''}
                  {st.total})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left 6 cols: Vector SVG Copepod Diagram modeled directly after user's image */}
        <div className="lg:col-span-6 flex flex-col items-center justify-between bg-white p-4">
          <div className="w-full max-w-[540px]">
            <svg
              viewBox="0 0 660 760"
              className="w-full h-auto select-none"
              role="img"
              aria-label="Интерактивная схема морфологии циклопа Eucyclops"
            >
              {/* ==================== LEFT & RIGHT ANATOMICAL BRACKETS ==================== */}
              {/* Left Bracket 1: Цефалоторакс */}
              <text
                x="182"
                y="162"
                textAnchor="middle"
                className="fill-slate-900 text-[15px] font-medium"
              >
                Цефалоторакс
              </text>

              {/* Left Bracket 2: Торакальные сомиты */}
              <line
                x1="168"
                y1="204"
                x2="168"
                y2="565"
                stroke="#262626"
                strokeWidth="4.5"
              />
              <text
                x="144"
                y="390"
                textAnchor="middle"
                transform="rotate(-90 144 390)"
                className="fill-slate-900 text-[15px] font-medium"
              >
                Торакальные сомиты
              </text>

              {/* Left Bracket 3: Абдоминальные сомиты */}
              <line
                x1="158"
                y1="572"
                x2="158"
                y2="704"
                stroke="#262626"
                strokeWidth="4.5"
              />
              <text
                x="118"
                y="638"
                textAnchor="middle"
                transform="rotate(-90 118 638)"
                className="fill-slate-900 text-[14px] font-medium"
              >
                Абдоминальные
              </text>
              <text
                x="136"
                y="638"
                textAnchor="middle"
                transform="rotate(-90 136 638)"
                className="fill-slate-900 text-[14px] font-medium"
              >
                сомиты
              </text>

              {/* Right Bracket 1: Просома */}
              <line
                x1="515"
                y1="262"
                x2="515"
                y2="452"
                stroke="#262626"
                strokeWidth="4.5"
              />
              <text
                x="542"
                y="357"
                textAnchor="middle"
                transform="rotate(-90 542 357)"
                className="fill-slate-900 text-[15px] font-medium"
              >
                Просома
              </text>

              {/* Right Bracket 2: Уросома */}
              <line
                x1="496"
                y1="458"
                x2="496"
                y2="704"
                stroke="#262626"
                strokeWidth="4.5"
              />
              <text
                x="524"
                y="582"
                textAnchor="middle"
                transform="rotate(-90 524 582)"
                className="fill-slate-900 text-[15px] font-medium"
              >
                Уросома
              </text>

              {/* ==================== 1. CEPHALOTHORAX SHIELD ==================== */}
              <g
                onClick={() => setSelectedPart('Mx1')}
                onMouseEnter={() => setHoveredPart('Mx1')}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer transition-opacity"
              >
                <path
                  d="M 312 104 Q 330 85 348 104 C 388 122 418 175 418 258 L 242 258 C 242 175 272 122 312 104 Z"
                  fill={getSomiteFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                {/* Inner cephalothorax rim lines */}
                <path
                  d="M 262 256 C 262 185 282 135 314 110"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="1.2"
                />
                <path
                  d="M 398 256 C 398 185 378 135 346 110"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="1.2"
                />
                {/* Rostrum R & Labrum Lr & Mouth */}
                <text x="330" y="109" textAnchor="middle" className="fill-slate-900 text-[13px] font-semibold">
                  R
                </text>
                <text x="330" y="141" textAnchor="middle" className="fill-slate-900 text-[12px] font-semibold">
                  Lr
                </text>
                <path
                  d="M 317 137 Q 330 151 343 137"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="1.3"
                />
                <circle cx="330" cy="158" r="7.5" fill="#18181b" />
                <text x="330" y="182" textAnchor="middle" className="fill-slate-900 text-[12px] font-semibold">
                  Pgn
                </text>
              </g>

              {/* ==================== 2. ANTENNULES (A1) ==================== */}
              <g
                onClick={() => setSelectedPart('A1')}
                onMouseEnter={() => setHoveredPart('A1')}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer"
              >
                {a1SegmentsLeft.map((seg, idx) => (
                  <ellipse
                    key={`a1-l-${idx}`}
                    cx={seg.cx}
                    cy={seg.cy}
                    rx={seg.rx}
                    ry={seg.ry}
                    transform={`rotate(${seg.rot} ${seg.cx} ${seg.cy})`}
                    fill={getAppendageFill('A1')}
                    {...getStrokeProps('A1')}
                  />
                ))}
                {a1SegmentsRight.map((seg, idx) => (
                  <ellipse
                    key={`a1-r-${idx}`}
                    cx={seg.cx}
                    cy={seg.cy}
                    rx={seg.rx}
                    ry={seg.ry}
                    transform={`rotate(${seg.rot} ${seg.cx} ${seg.cy})`}
                    fill={getAppendageFill('A1')}
                    {...getStrokeProps('A1')}
                  />
                ))}
                <text
                  x="432"
                  y="85"
                  className={`text-[16px] font-bold ${
                    selectedPart === 'A1' ? 'fill-sky-700' : 'fill-slate-900'
                  }`}
                >
                  A1
                </text>
              </g>

              {/* ==================== 3. ANTENNAE (A2) ==================== */}
              <g
                onClick={() => setSelectedPart('A2')}
                onMouseEnter={() => setHoveredPart('A2')}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer"
              >
                {/* Left A2 (Coxobasis + Enp1-3) */}
                <ellipse
                  cx="296"
                  cy="134"
                  rx="11"
                  ry="7.5"
                  transform="rotate(35 296 134)"
                  fill={getAppendageFill('A2')}
                  {...getStrokeProps('A2')}
                />
                <ellipse
                  cx="280"
                  cy="118"
                  rx="9.5"
                  ry="6"
                  transform="rotate(15 280 118)"
                  fill={getAppendageFill('A2')}
                  {...getStrokeProps('A2')}
                />
                <ellipse
                  cx="259"
                  cy="114"
                  rx="9.5"
                  ry="5.5"
                  transform="rotate(-5 259 114)"
                  fill={getAppendageFill('A2')}
                  {...getStrokeProps('A2')}
                />
                <ellipse
                  cx="238"
                  cy="117"
                  rx="10"
                  ry="5"
                  transform="rotate(-15 238 117)"
                  fill={getAppendageFill('A2')}
                  {...getStrokeProps('A2')}
                />

                {/* Right A2 */}
                <ellipse
                  cx="364"
                  cy="134"
                  rx="11"
                  ry="7.5"
                  transform="rotate(-35 364 134)"
                  fill={getAppendageFill('A2')}
                  {...getStrokeProps('A2')}
                />
                <ellipse
                  cx="380"
                  cy="118"
                  rx="9.5"
                  ry="6"
                  transform="rotate(-15 380 118)"
                  fill={getAppendageFill('A2')}
                  {...getStrokeProps('A2')}
                />
                <ellipse
                  cx="401"
                  cy="114"
                  rx="9.5"
                  ry="5.5"
                  transform="rotate(5 401 114)"
                  fill={getAppendageFill('A2')}
                  {...getStrokeProps('A2')}
                />
                <ellipse
                  cx="422"
                  cy="117"
                  rx="10"
                  ry="5"
                  transform="rotate(15 422 117)"
                  fill={getAppendageFill('A2')}
                  {...getStrokeProps('A2')}
                />

                <text
                  x="422"
                  y="142"
                  className={`text-[15px] font-bold ${
                    selectedPart === 'A2' ? 'fill-sky-700' : 'fill-slate-900'
                  }`}
                >
                  A2
                </text>
              </g>

              {/* ==================== 4. MOUTHPARTS (Md, Mx1, Mx2, Mxp) ==================== */}
              <g
                onClick={() => setSelectedPart('Mx1')}
                onMouseEnter={() => setHoveredPart('Mx1')}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer"
              >
                {/* Md left & right */}
                <ellipse
                  cx="301"
                  cy="158"
                  rx="15"
                  ry="5.5"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                <ellipse
                  cx="359"
                  cy="158"
                  rx="15"
                  ry="5.5"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                {/* Pgn lobes */}
                <ellipse
                  cx="314"
                  cy="169"
                  rx="7.5"
                  ry="5"
                  transform="rotate(-25 314 169)"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                <ellipse
                  cx="346"
                  cy="169"
                  rx="7.5"
                  ry="5"
                  transform="rotate(25 346 169)"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                {/* Mx1 left & right */}
                <ellipse
                  cx="299"
                  cy="176"
                  rx="14"
                  ry="6.5"
                  transform="rotate(-15 299 176)"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                <ellipse
                  cx="361"
                  cy="176"
                  rx="14"
                  ry="6.5"
                  transform="rotate(15 361 176)"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                {/* Mx2 left & right */}
                <ellipse
                  cx="286"
                  cy="195"
                  rx="11"
                  ry="8"
                  transform="rotate(25 286 195)"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                <ellipse
                  cx="305"
                  cy="205"
                  rx="11"
                  ry="7.5"
                  transform="rotate(20 305 205)"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                <ellipse
                  cx="374"
                  cy="195"
                  rx="11"
                  ry="8"
                  transform="rotate(-25 374 195)"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                <ellipse
                  cx="355"
                  cy="205"
                  rx="11"
                  ry="7.5"
                  transform="rotate(-20 355 205)"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                {/* Mxp left & right */}
                <ellipse
                  cx="284"
                  cy="220"
                  rx="13"
                  ry="7.5"
                  transform="rotate(60 284 220)"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />
                <ellipse
                  cx="376"
                  cy="220"
                  rx="13"
                  ry="7.5"
                  transform="rotate(-60 376 220)"
                  fill={getAppendageFill('Mx1')}
                  {...getStrokeProps('Mx1')}
                />

                <text x="425" y="162" className="fill-slate-800 text-[14px] font-medium">
                  Md
                </text>
                <text
                  x="430"
                  y="181"
                  className={`text-[14px] font-bold ${
                    selectedPart === 'Mx1' ? 'fill-sky-700' : 'fill-slate-900'
                  }`}
                >
                  Mx1
                </text>
                <text x="436" y="199" className="fill-slate-800 text-[14px] font-medium">
                  Mx2
                </text>
                <text x="441" y="217" className="fill-slate-800 text-[14px] font-medium">
                  Mxp
                </text>
              </g>

              {/* ==================== 5. LEG PAIR P1 ==================== */}
              <g
                onClick={() => setSelectedPart('P1')}
                onMouseEnter={() => setHoveredPart('P1')}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer"
              >
                {/* Coxae + Intercoxal sclerite bar of P1 */}
                <rect
                  x="270"
                  y="237"
                  width="52"
                  height="16"
                  rx="7"
                  fill={getAppendageFill('P1')}
                  {...getStrokeProps('P1')}
                />
                <rect
                  x="318"
                  y="239"
                  width="24"
                  height="12"
                  rx="4"
                  fill={getAppendageFill('P1')}
                  {...getStrokeProps('P1')}
                />
                <rect
                  x="338"
                  y="237"
                  width="52"
                  height="16"
                  rx="7"
                  fill={getAppendageFill('P1')}
                  {...getStrokeProps('P1')}
                />
                {/* Left Basis of P1 + Rami */}
                <rect
                  x="269"
                  y="254"
                  width="51"
                  height="17"
                  rx="7"
                  fill={getAppendageFill('P1')}
                  {...getStrokeProps('P1')}
                />
                {/* Exp1-3 (outer left) */}
                <ellipse cx="268" cy="278" rx="7.5" ry="9" transform="rotate(15 268 278)" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />
                <ellipse cx="263" cy="296" rx="7.5" ry="9" transform="rotate(15 263 296)" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />
                <ellipse cx="258" cy="314" rx="7.5" ry="9" transform="rotate(15 258 314)" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />
                {/* Enp1-3 (inner left) */}
                <ellipse cx="301" cy="280" rx="7.5" ry="9" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />
                <ellipse cx="301" cy="298" rx="7.5" ry="9" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />
                <ellipse cx="301" cy="316" rx="7.5" ry="9" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />

                <text
                  x="438"
                  y="251"
                  className={`text-[15px] font-bold ${
                    selectedPart === 'P1' ? 'fill-sky-700' : 'fill-slate-900'
                  }`}
                >
                  P1
                </text>
              </g>

              {/* ==================== 6. SOMITE & LEG PAIR P2 ==================== */}
              <g
                onClick={() => setSelectedPart('P2')}
                onMouseEnter={() => setHoveredPart('P2')}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer"
              >
                {/* Thoracic somite 2 (yellow) */}
                <path
                  d="M 251 268 L 409 268 C 417 282 419 306 413 319 L 247 319 C 241 306 243 282 251 268 Z"
                  fill={getSomiteFill('P2')}
                  {...getStrokeProps('P2')}
                />
                {/* Re-draw P1 rami overlapping P2 somite so layering matches the original figure */}
                <ellipse cx="268" cy="278" rx="7.5" ry="9" transform="rotate(15 268 278)" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />
                <ellipse cx="263" cy="296" rx="7.5" ry="9" transform="rotate(15 263 296)" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />
                <ellipse cx="258" cy="314" rx="7.5" ry="9" transform="rotate(15 258 314)" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />
                <ellipse cx="301" cy="280" rx="7.5" ry="9" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />
                <ellipse cx="301" cy="298" rx="7.5" ry="9" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />
                <ellipse cx="301" cy="316" rx="7.5" ry="9" fill={getAppendageFill('P1')} {...getStrokeProps('P1')} />

                {/* P2 Coxae + IcS + Right Basis */}
                <rect x="270" y="294" width="52" height="16" rx="7" fill={getAppendageFill('P2')} {...getStrokeProps('P2')} />
                <rect x="318" y="296" width="24" height="12" rx="4" fill={getAppendageFill('P2')} {...getStrokeProps('P2')} />
                <rect x="338" y="294" width="52" height="16" rx="7" fill={getAppendageFill('P2')} {...getStrokeProps('P2')} />
                <rect x="339" y="311" width="51" height="18" rx="7" fill={getAppendageFill('P2')} {...getStrokeProps('P2')} />

                <text
                  x="438"
                  y="302"
                  className={`text-[15px] font-bold ${
                    selectedPart === 'P2' ? 'fill-sky-700' : 'fill-slate-900'
                  }`}
                >
                  P2
                </text>
              </g>

              {/* ==================== 7. SOMITE & LEG PAIR P3 ==================== */}
              <g
                onClick={() => setSelectedPart('P3')}
                onMouseEnter={() => setHoveredPart('P3')}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer"
              >
                {/* Thoracic somite 3 (yellow) */}
                <path
                  d="M 253 331 L 407 331 C 415 346 417 372 410 385 L 250 385 C 243 372 245 346 253 331 Z"
                  fill={getSomiteFill('P3')}
                  {...getStrokeProps('P3')}
                />
                {/* P2 rami overlapping P3 somite (right side as in original diagram) */}
                <ellipse cx="358" cy="338" rx="7.5" ry="9" fill={getAppendageFill('P2')} {...getStrokeProps('P2')} />
                <ellipse cx="358" cy="356" rx="7.5" ry="9" fill={getAppendageFill('P2')} {...getStrokeProps('P2')} />
                <ellipse cx="358" cy="374" rx="7.5" ry="9" fill={getAppendageFill('P2')} {...getStrokeProps('P2')} />
                <ellipse cx="391" cy="336" rx="7.5" ry="9" transform="rotate(-15 391 336)" fill={getAppendageFill('P2')} {...getStrokeProps('P2')} />
                <ellipse cx="396" cy="354" rx="7.5" ry="9" transform="rotate(-15 396 354)" fill={getAppendageFill('P2')} {...getStrokeProps('P2')} />
                <ellipse cx="402" cy="372" rx="7.5" ry="9" transform="rotate(-15 402 372)" fill={getAppendageFill('P2')} {...getStrokeProps('P2')} />

                {/* P3 Coxae + IcS + Left Basis */}
                <rect x="272" y="361" width="50" height="16" rx="7" fill={getAppendageFill('P3')} {...getStrokeProps('P3')} />
                <rect x="318" y="363" width="24" height="12" rx="4" fill={getAppendageFill('P3')} {...getStrokeProps('P3')} />
                <rect x="338" y="361" width="50" height="16" rx="7" fill={getAppendageFill('P3')} {...getStrokeProps('P3')} />
                <rect x="272" y="378" width="50" height="17" rx="7" fill={getAppendageFill('P3')} {...getStrokeProps('P3')} />

                <text
                  x="438"
                  y="369"
                  className={`text-[15px] font-bold ${
                    selectedPart === 'P3' ? 'fill-sky-700' : 'fill-slate-900'
                  }`}
                >
                  P3
                </text>
              </g>

              {/* ==================== 8. SOMITE & LEG PAIR P4 (with clickable IcS, Cox, Bas, En1-3, Ex1-3) ==================== */}
              <g>
                {/* Thoracic somite 4 (yellow) — clicks whole P4 */}
                <path
                  d="M 260 397 L 400 397 C 408 410 410 432 403 445 L 257 445 C 250 432 252 410 260 397 Z"
                  fill={getSomiteFill('P4')}
                  {...getStrokeProps('P4')}
                  onClick={() => setSelectedPart('P4')}
                  onMouseEnter={() => setHoveredPart('P4')}
                  onMouseLeave={() => setHoveredPart(null)}
                  className="cursor-pointer"
                />

                {/* P3 rami overlapping left side of P4 somite (as in original diagram) */}
                <g
                  onClick={() => setSelectedPart('P3')}
                  onMouseEnter={() => setHoveredPart('P3')}
                  onMouseLeave={() => setHoveredPart(null)}
                  className="cursor-pointer"
                >
                  <ellipse cx="270" cy="402" rx="7.5" ry="9" transform="rotate(15 270 402)" fill={getAppendageFill('P3')} {...getStrokeProps('P3')} />
                  <ellipse cx="265" cy="420" rx="7.5" ry="9" transform="rotate(15 265 420)" fill={getAppendageFill('P3')} {...getStrokeProps('P3')} />
                  <ellipse cx="260" cy="438" rx="7.5" ry="9" transform="rotate(15 260 438)" fill={getAppendageFill('P3')} {...getStrokeProps('P3')} />
                  <ellipse cx="303" cy="404" rx="7.5" ry="9" fill={getAppendageFill('P3')} {...getStrokeProps('P3')} />
                  <ellipse cx="303" cy="422" rx="7.5" ry="9" fill={getAppendageFill('P3')} {...getStrokeProps('P3')} />
                  <ellipse cx="303" cy="440" rx="7.5" ry="9" fill={getAppendageFill('P3')} {...getStrokeProps('P3')} />
                </g>

                {/* P4 Left Coxa */}
                <rect
                  x="274"
                  y="418"
                  width="48"
                  height="17"
                  rx="7"
                  fill={getAppendageFill('P4_Cox')}
                  {...getStrokeProps('P4_Cox')}
                  onClick={() => setSelectedPart('P4_Cox')}
                  onMouseEnter={() => setHoveredPart('P4_Cox')}
                  onMouseLeave={() => setHoveredPart(null)}
                  className="cursor-pointer"
                />

                {/* P4 Intercoxal Sclerite (IcS) */}
                <g
                  onClick={() => setSelectedPart('P4_IcS')}
                  onMouseEnter={() => setHoveredPart('P4_IcS')}
                  onMouseLeave={() => setHoveredPart(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x="318"
                    y="419"
                    width="26"
                    height="15"
                    rx="5"
                    fill={getAppendageFill('P4_IcS')}
                    {...getStrokeProps('P4_IcS')}
                  />
                  <text x="331" y="430" textAnchor="middle" className="fill-slate-950 text-[10px] font-bold pointer-events-none">
                    IcS
                  </text>
                </g>

                {/* P4 Right Coxa (Cox) */}
                <g
                  onClick={() => setSelectedPart('P4_Cox')}
                  onMouseEnter={() => setHoveredPart('P4_Cox')}
                  onMouseLeave={() => setHoveredPart(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x="341"
                    y="418"
                    width="52"
                    height="17"
                    rx="7"
                    fill={getAppendageFill('P4_Cox')}
                    {...getStrokeProps('P4_Cox')}
                  />
                  <text x="367" y="430" textAnchor="middle" className="fill-slate-950 text-[10.5px] font-bold pointer-events-none">
                    Cox
                  </text>
                </g>

                {/* P4 Right Basis (Bas) */}
                <g
                  onClick={() => setSelectedPart('P4_Bas')}
                  onMouseEnter={() => setHoveredPart('P4_Bas')}
                  onMouseLeave={() => setHoveredPart(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x="342"
                    y="436"
                    width="51"
                    height="19"
                    rx="7"
                    fill={getAppendageFill('P4_Bas')}
                    {...getStrokeProps('P4_Bas')}
                  />
                  <text x="367" y="449" textAnchor="middle" className="fill-slate-950 text-[10.5px] font-bold pointer-events-none">
                    Bas
                  </text>
                </g>

                {/* P4 Label on Right */}
                <text
                  x="438"
                  y="428"
                  onClick={() => setSelectedPart('P4')}
                  className={`text-[15px] font-bold cursor-pointer ${
                    isSelectedGroup('P4') ? 'fill-sky-700' : 'fill-slate-900'
                  }`}
                >
                  P4
                </text>
              </g>

              {/* ==================== 9. SOMITE 5 (P5) + P4 RAMI (En1-3, Ex1-3) ==================== */}
              <g>
                {/* Thoracic somite 5 (T5 / P5, crescent-shaped yellow somite) */}
                <path
                  d="M 294 456 Q 330 448 366 456 C 387 466 398 486 388 501 Q 330 488 272 501 C 262 486 273 466 294 456 Z"
                  fill={getSomiteFill('P5')}
                  {...getStrokeProps('P5')}
                  onClick={() => setSelectedPart('P5')}
                  onMouseEnter={() => setHoveredPart('P5')}
                  onMouseLeave={() => setHoveredPart(null)}
                  className="cursor-pointer"
                />
                {/* Rudimentary P5 lobes */}
                <ellipse
                  cx="288"
                  cy="502"
                  rx="4.5"
                  ry="6.5"
                  fill={getAppendageFill('P5')}
                  {...getStrokeProps('P5')}
                  onClick={() => setSelectedPart('P5')}
                  className="cursor-pointer"
                />
                <ellipse
                  cx="372"
                  cy="502"
                  rx="4.5"
                  ry="6.5"
                  fill={getAppendageFill('P5')}
                  {...getStrokeProps('P5')}
                  onClick={() => setSelectedPart('P5')}
                  className="cursor-pointer"
                />
                <text
                  x="438"
                  y="505"
                  onClick={() => setSelectedPart('P5')}
                  className={`text-[15px] font-bold cursor-pointer ${
                    selectedPart === 'P5' ? 'fill-sky-700' : 'fill-slate-900'
                  }`}
                >
                  P5
                </text>

                {/* P4 Endopodite (En1, En2, En3) overlapping T5 */}
                <g
                  onClick={() => setSelectedPart('P4_Enp')}
                  onMouseEnter={() => setHoveredPart('P4_Enp')}
                  onMouseLeave={() => setHoveredPart(null)}
                  className="cursor-pointer"
                >
                  <ellipse cx="359" cy="464" rx="8.5" ry="9.5" fill={getAppendageFill('P4_Enp')} {...getStrokeProps('P4_Enp')} />
                  <text x="359" y="468" textAnchor="middle" className="fill-slate-950 text-[9.5px] font-bold pointer-events-none">
                    En1
                  </text>
                  <ellipse cx="359" cy="484" rx="8.5" ry="9.5" fill={getAppendageFill('P4_Enp')} {...getStrokeProps('P4_Enp')} />
                  <text x="359" y="488" textAnchor="middle" className="fill-slate-950 text-[9.5px] font-bold pointer-events-none">
                    En2
                  </text>
                  <ellipse cx="359" cy="504" rx="8.5" ry="9.5" fill={getAppendageFill('P4_Enp')} {...getStrokeProps('P4_Enp')} />
                  <text x="359" y="508" textAnchor="middle" className="fill-slate-950 text-[9.5px] font-bold pointer-events-none">
                    En3
                  </text>
                </g>

                {/* P4 Exopodite (Ex1, Ex2, Ex3) */}
                <g
                  onClick={() => setSelectedPart('P4_Exp')}
                  onMouseEnter={() => setHoveredPart('P4_Exp')}
                  onMouseLeave={() => setHoveredPart(null)}
                  className="cursor-pointer"
                >
                  <ellipse
                    cx="390"
                    cy="460"
                    rx="8.5"
                    ry="9.5"
                    transform="rotate(-15 390 460)"
                    fill={getAppendageFill('P4_Exp')}
                    {...getStrokeProps('P4_Exp')}
                  />
                  <text x="390" y="464" textAnchor="middle" className="fill-slate-950 text-[9.5px] font-bold pointer-events-none">
                    Ex1
                  </text>
                  <ellipse
                    cx="396"
                    cy="479"
                    rx="8.5"
                    ry="9.5"
                    transform="rotate(-15 396 479)"
                    fill={getAppendageFill('P4_Exp')}
                    {...getStrokeProps('P4_Exp')}
                  />
                  <text x="396" y="483" textAnchor="middle" className="fill-slate-950 text-[9.5px] font-bold pointer-events-none">
                    Ex2
                  </text>
                  <ellipse
                    cx="402"
                    cy="498"
                    rx="8.5"
                    ry="9.5"
                    transform="rotate(-15 402 498)"
                    fill={getAppendageFill('P4_Exp')}
                    {...getStrokeProps('P4_Exp')}
                  />
                  <text x="402" y="502" textAnchor="middle" className="fill-slate-950 text-[9.5px] font-bold pointer-events-none">
                    Ex3
                  </text>
                </g>
              </g>

              {/* ==================== 10. GENITAL SOMITE & P6 ==================== */}
              <g
                onClick={() => setSelectedPart('GS')}
                onMouseEnter={() => setHoveredPart('GS')}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer"
              >
                <path
                  d="M 304 506 Q 330 498 356 506 C 372 518 370 542 361 562 L 355 599 L 305 599 L 299 562 C 290 542 288 518 304 506 Z"
                  fill={getSomiteFill('GS')}
                  {...getStrokeProps('GS')}
                />
                {/* Dotted suture line across the middle of the genital double-somite */}
                <line
                  x1="301"
                  y1="561"
                  x2="359"
                  y2="561"
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeDasharray="2.5,3.5"
                />
                {/* P6 lateral plates (red) */}
                <ellipse
                  cx="295"
                  cy="534"
                  rx="6"
                  ry="10"
                  transform="rotate(-12 295 534)"
                  fill={getAppendageFill('GS')}
                  {...getStrokeProps('GS')}
                />
                <ellipse
                  cx="365"
                  cy="534"
                  rx="6"
                  ry="10"
                  transform="rotate(12 365 534)"
                  fill={getAppendageFill('GS')}
                  {...getStrokeProps('GS')}
                />
                {/* Medial dorsal pore indicator */}
                <circle
                  cx="330"
                  cy="522"
                  r="3"
                  fill={isTraitEntered('GS_m pore') ? '#0284c7' : '#475569'}
                />

                <text x="394" y="541" className="fill-slate-900 text-[15px] font-bold">
                  P6
                </text>
                <text
                  x="236"
                  y="561"
                  textAnchor="middle"
                  className={`text-[14px] font-semibold ${
                    selectedPart === 'GS' ? 'fill-sky-700 font-bold' : 'fill-slate-900'
                  }`}
                >
                  Генитальный
                </text>
                <text
                  x="236"
                  y="579"
                  textAnchor="middle"
                  className={`text-[14px] font-semibold ${
                    selectedPart === 'GS' ? 'fill-sky-700 font-bold' : 'fill-slate-900'
                  }`}
                >
                  сомит
                </text>
              </g>

              {/* ==================== 11. ABDOMINAL & ANAL SOMITES ==================== */}
              <g
                onClick={() => setSelectedPart('AnS')}
                onMouseEnter={() => setHoveredPart('AnS')}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer"
              >
                {/* Abdominal somite 2 */}
                <path
                  d="M 314 603 L 346 603 L 352 634 L 308 634 Z"
                  fill={getSomiteFill('AnS')}
                  {...getStrokeProps('AnS')}
                />
                {/* Abdominal somite 3 */}
                <path
                  d="M 314 638 L 346 638 L 351 669 L 309 669 Z"
                  fill={getSomiteFill('AnS')}
                  {...getStrokeProps('AnS')}
                />
                {/* Anal somite (AnS) with proctodeum notch */}
                <path
                  d="M 316 673 L 344 673 L 347 699 L 336 699 L 330 687 L 324 699 L 313 699 Z"
                  fill={getSomiteFill('AnS')}
                  {...getStrokeProps('AnS')}
                />
                <text
                  x="236"
                  y="694"
                  textAnchor="middle"
                  className={`text-[14px] font-semibold ${
                    selectedPart === 'AnS' ? 'fill-sky-700 font-bold' : 'fill-slate-900'
                  }`}
                >
                  Анальный сомит
                </text>
              </g>

              {/* ==================== 12. CAUDAL RAMI (FURCA) ==================== */}
              <g
                onClick={() => setSelectedPart('CR')}
                onMouseEnter={() => setHoveredPart('CR')}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer"
              >
                {/* Left Caudal Ramus */}
                <path
                  d="M 313 697 L 324 699 L 316 744 Q 310 746 306 742 Z"
                  fill={getSomiteFill('CR')}
                  {...getStrokeProps('CR')}
                />
                {/* Right Caudal Ramus */}
                <path
                  d="M 336 699 L 347 697 L 354 742 Q 350 746 344 744 Z"
                  fill={getSomiteFill('CR')}
                  {...getStrokeProps('CR')}
                />
                <text
                  x="430"
                  y="732"
                  textAnchor="middle"
                  className={`text-[14px] font-semibold ${
                    selectedPart === 'CR' ? 'fill-sky-700 font-bold' : 'fill-slate-900'
                  }`}
                >
                  Каудальные ветви
                </text>
              </g>
            </svg>
          </div>

          <div className="mt-1 text-center text-[11px] text-slate-500">
            Совет: на четвёртой паре ног (<span className="font-mono font-semibold">P4</span>) можно нажимать отдельно на{' '}
            <span className="font-mono">IcS, Cox, Bas, En1–3</span> и <span className="font-mono">Ex1–3</span>.
          </div>
        </div>

        {/* Right 6 cols: Traits Inspector & Direct Input Panel for Selected Anatomy Part */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-slate-50/50 p-5">
          <div className="space-y-4">
            {/* Selected Part Header */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="inline-block rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-900">
                    {currentMeta.bodyDivision}
                  </span>
                  <h4 className="mt-1 text-base font-bold text-slate-900">
                    {currentMeta.title}
                  </h4>
                </div>

                {currentTraits.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onFilterMainListBySection(currentMeta.sectionToFilter)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Показать отдел в общей таблице
                  </button>
                )}
              </div>

              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {currentMeta.description}
              </p>

              {/* Sub-navigation for P4 segments when any P4 part is active */}
              {isSelectedGroup('P4') && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">
                    Членики P4:
                  </span>
                  {(
                    [
                      'P4',
                      'P4_IcS',
                      'P4_Cox',
                      'P4_Bas',
                      'P4_Enp',
                      'P4_Exp',
                    ] as AnatomyPartId[]
                  ).map((subId) => {
                    const st = getPartStats(subId);
                    return (
                      <button
                        key={subId}
                        type="button"
                        onClick={() => setSelectedPart(subId)}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          selectedPart === subId
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {ANATOMY_PARTS[subId].shortLabel} ({st.total})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Traits List for Selected Part */}
            {currentTraits.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-xs text-amber-950 leading-relaxed">
                Для пятой пары ног (<span className="font-mono font-bold">P5</span>) признаки вооружения исключены из рабочей матрицы определителя по решению автора. Выберите любую другую конечность (<span className="font-mono">A1, A2, Mx1, P1–P4</span>) или сомит уросомы (<span className="font-mono">Генитальный, Анальный, Каудальные ветви</span>).
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {currentTraits.map((trait) => {
                  const entered = isTraitEntered(trait.code);
                  const currentFilter = activeFilters[trait.code];
                  const sepScore = separatingPower[trait.code] || 0;
                  const ann = traitAnnotations[trait.code];
                  const draftVal =
                    numericDrafts[trait.code] !== undefined
                      ? numericDrafts[trait.code]
                      : currentFilter?.numericValue !== null &&
                        currentFilter?.numericValue !== undefined
                      ? String(currentFilter.numericValue)
                      : currentFilter?.numericMin !== null &&
                        currentFilter?.numericMin !== undefined &&
                        currentFilter?.numericMax !== null &&
                        currentFilter?.numericMax !== undefined
                      ? `${currentFilter.numericMin}-${currentFilter.numericMax}`
                      : '';

                  return (
                    <div
                      key={trait.code}
                      className={`rounded-xl border p-3.5 transition-colors ${
                        entered
                          ? 'border-sky-300 bg-sky-50/70'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenTraitInspector(trait)}
                          className="text-left group flex-1"
                        >
                          <div className="text-xs font-bold text-slate-900 group-hover:text-sky-700 leading-snug">
                            {getTraitDisplayDescription(trait.code, traitAnnotations)}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                              {trait.code}
                            </span>
                            <span
                              className={`font-mono text-[10px] font-semibold ${
                                sepScore >= 50
                                  ? 'text-emerald-700'
                                  : sepScore > 0
                                  ? 'text-sky-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              · разделение: {sepScore}%
                            </span>
                            {ann?.imageUrl && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-sky-700">
                                <ImageIcon className="h-3 w-3" /> рис.
                              </span>
                            )}
                            {ann?.comment?.trim() && (
                              <span className="text-[11px] text-slate-500">
                                · {ann.comment}
                              </span>
                            )}
                          </div>
                        </button>

                        {entered && (
                          <button
                            type="button"
                            onClick={() => onClearTrait(trait.code)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            title="Сбросить признак"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Interactive Input Controls right inside the Anatomy panel */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                        {trait.kind === 'qualitative' ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {trait.discreteStates.map((stVal) => {
                              const selected =
                                currentFilter?.selectedStates?.includes(stVal) ??
                                false;
                              const stateMeaning =
                                QUALITATIVE_STATE_LABELS[trait.code]?.[stVal];
                              return (
                                <button
                                  key={stVal}
                                  type="button"
                                  onClick={() =>
                                    onToggleQualitativeState(trait.code, stVal)
                                  }
                                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                                    selected
                                      ? 'border-sky-700 bg-sky-700 text-white font-semibold shadow-2xs'
                                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="font-mono font-bold">{stVal}</span>
                                  {stateMeaning && (
                                    <span
                                      className={`ml-1 font-sans ${
                                        selected ? 'text-sky-100' : 'text-slate-600'
                                      }`}
                                    >
                                      — {stateMeaning}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : trait.code === 'A1ser' ? (
                          <div className="flex flex-wrap items-center gap-1.5 w-full">
                            {[
                              { val: 0, label: 'Гладкая (0)' },
                              { val: 100, label: 'Много (100)' },
                            ].map((preset) => {
                              const selected =
                                currentFilter?.selectedStates?.includes(preset.val) ??
                                false;
                              return (
                                <button
                                  key={preset.val}
                                  type="button"
                                  onClick={() =>
                                    onToggleQualitativeState(trait.code, preset.val)
                                  }
                                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                                    selected
                                      ? 'border-sky-700 bg-sky-700 text-white shadow-2xs'
                                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                            <input
                              type="text"
                              inputMode="decimal"
                              value={draftVal}
                              onChange={(e) =>
                                onQuantitativeChange(trait.code, e.target.value)
                              }
                              placeholder="Число или 12-18"
                              className={`w-36 rounded-lg border px-2.5 py-1 font-mono text-xs tabular-nums focus:outline-none ${
                                (currentFilter?.numericValue !== null &&
                                  currentFilter?.numericValue !== undefined) ||
                                (currentFilter?.numericMin !== null &&
                                  currentFilter?.numericMin !== undefined)
                                  ? 'border-sky-600 bg-white font-semibold text-sky-950 ring-2 ring-sky-500/20'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-sky-600'
                              }`}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="font-mono text-[11px] text-slate-500">
                              Размах в базе:{' '}
                              <strong className="text-slate-700">
                                {formatTraitNumber(trait.globalMin, trait.decimals)}–
                                {formatTraitNumber(trait.globalMax, trait.decimals)}
                              </strong>
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={draftVal}
                              onChange={(e) =>
                                onQuantitativeChange(trait.code, e.target.value)
                              }
                              placeholder={
                                trait.kind === 'meristic'
                                  ? 'Число или 10-14'
                                  : 'Значение (напр. 4.5)'
                              }
                              className={`w-40 rounded-lg border px-2.5 py-1 font-mono text-xs tabular-nums focus:outline-none ${
                                entered
                                  ? 'border-sky-600 bg-white font-semibold text-sky-950 ring-2 ring-sky-500/20'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-sky-600'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
