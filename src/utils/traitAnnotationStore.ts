import { TraitAnnotation } from '../types/taxonomy';
import { Language } from './i18n';

const STORAGE_KEY = 'eucyclops_trait_annotations_v1';

/**
 * Qualitative state labels in Russian (RU).
 */
export const QUALITATIVE_STATE_LABELS_RU: Record<string, Record<number, string>> = {
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
  'GS_m pore': { 0: 'нет', 1: 'есть', 2: 'удвоенная (две поры)' },
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

/**
 * Qualitative state labels in English (EN) — exact terminology from the author's reference table.
 */
export const QUALITATIVE_STATE_LABELS_EN: Record<string, Record<number, string>> = {
  A2N1g2: { 0: 'absent', 1: 'present' },
  Mx1Bsr: { 0: 'absent', 1: 'present' },
  P2X3_bsp: { 0: 'no', 1: 'yes' },
  P1X1os: { 0: 'absent', 1: 'present' },
  P1X2os: { 0: 'absent', 1: 'present' },
  P2X1os: { 0: 'absent', 1: 'present' },
  P2X2os: { 0: 'absent', 1: 'present' },
  P3X1os: { 0: 'absent', 1: 'present' },
  P3X2os: { 0: 'absent', 1: 'present' },
  P4X1os: { 0: 'absent', 1: 'present' },
  P4X2os: { 0: 'absent', 1: 'present' },
  P4X3os: { 0: 'absent', 1: 'present' },
  P4IS_dr: { 0: 'short', 1: 'medium', 2: 'long' },
  P4IS_dr2: { 0: 'absent', 1: 'present' },
  P4_CS_osp: { 0: 'absent', 1: 'present' },
  P4_CS_osp3: { 0: 'absent', 1: 'present' },
  'P4N2/N3': { 0: 'width < 2', 1: 'width > 2' },
  P4X3_pore: { 0: 'absent', 1: 'present' },
  P4X3_as2: {
    0: 'normal seta',
    1: 'with hyaline membrane & setules',
    2: 'spatulate with naked base',
  },
  'GS_m pore': { 0: 'absent', 1: 'present', 2: 'double (two pores)' },
  Proct: { 0: 'absent', 1: 'present' },
  Proct2: {
    0: 'absent',
    1: 'small, few',
    2: 'long, few',
    3: 'robust, many',
  },
  AnS_dsp: { 0: 'absent', 1: 'small', 2: 'normal' },
  CRdp: { 0: 'absent', 1: 'present' },
  CRoS_os: { 0: 'absent', 1: 'spinules', 2: 'setules' },
  CRoS_is: {
    0: 'absent',
    1: 'short setules',
    2: 'long setules',
    3: 'spinules',
  },
};

export const QUALITATIVE_STATE_LABELS = QUALITATIVE_STATE_LABELS_EN;

export function getQualitativeStateMeaning(
  traitCode: string,
  stateVal: number,
  lang: Language = 'en'
): string | undefined {
  const dict = lang === 'en' ? QUALITATIVE_STATE_LABELS_EN : QUALITATIVE_STATE_LABELS_RU;
  return dict[traitCode]?.[stateVal];
}

export function formatQualitativeStateLabel(
  traitCode: string,
  stateVal: number,
  lang: Language = 'en'
): string {
  const meaning = getQualitativeStateMeaning(traitCode, stateVal, lang);
  if (meaning !== undefined) {
    return `${stateVal} — ${meaning}`;
  }
  return String(stateVal);
}

const A2_COXOBASIS_IMAGE = 'assets/aistudio/A2Coxobasis_ced8250c.png';
const A2_COXOBASIS_CITATION =
  'Alekseev, V., Dumont, H. J., Pensaert, J., Baribwegure, D., & Vanfleteren, J. R. (2006). A redescription of Eucyclops serrulatus (Fischer, 1851) (Crustacea: Copepoda: Cyclopoida) and some related taxa, with a phylogeny of the E. serrulatus‐group. Zoologica Scripta, 35(2), 123-147.';
const A2_COXOBASIS_DOI = 'https://doi.org/10.1111/j.1463-6409.2006.00223.x';

const A2N1G_IMAGE = 'assets/aistudio/A2N1g_5c0fbba3.png';
const METRIC_IMAGE = 'assets/aistudio/Metric_92f86a59.png';
const NOVIKOV_2025_CITATION =
  'Novikov, A., Sharafutdinova, D., Abramova, E., Mayor, T., & Chertoprud, E. (2025). An integrative approach to the delimitation of pseudocryptic species in the Eucyclops speratus complex (Copepoda, Cyclopoida) with a description of a new species. ZooKeys, 1226, 217.';
const NOVIKOV_2025_DOI = 'https://doi.org/10.3897/zookeys.1226.138389';

/**
 * Built-in English trait descriptions and comments (exact terminology from the author's table).
 */
export const BUILTIN_TRAIT_ANNOTATIONS_EN: Record<string, TraitAnnotation> = {
  A2g1: {
    traitCode: 'A2g1',
    description: 'Spinule group 1 on the antennal (A2) coxobasis',
    comment: 'Number of spinules',
    imageUrl: A2_COXOBASIS_IMAGE,
    imageSource: A2_COXOBASIS_CITATION,
    imageSourceUrl: A2_COXOBASIS_DOI,
  },
  A2g2: {
    traitCode: 'A2g2',
    description: 'Spinule group 2 on the A2 coxobasis',
    comment: 'Number of spinules',
    imageUrl: A2_COXOBASIS_IMAGE,
    imageSource: A2_COXOBASIS_CITATION,
    imageSourceUrl: A2_COXOBASIS_DOI,
  },
  A2g3: {
    traitCode: 'A2g3',
    description: 'Spinule group 3 on the A2 coxobasis',
    comment: 'Number of spinules',
    imageUrl: A2_COXOBASIS_IMAGE,
    imageSource: A2_COXOBASIS_CITATION,
    imageSourceUrl: A2_COXOBASIS_DOI,
  },
  A2g8: {
    traitCode: 'A2g8',
    description: 'Spinule group 8 on the A2 coxobasis',
    comment: 'Number of spinules',
    imageUrl: A2_COXOBASIS_IMAGE,
    imageSource: A2_COXOBASIS_CITATION,
    imageSourceUrl: A2_COXOBASIS_DOI,
  },
  A2g9: {
    traitCode: 'A2g9',
    description: 'Spinule group 9 on the A2 coxobasis',
    comment: 'Number of spinules',
    imageUrl: A2_COXOBASIS_IMAGE,
    imageSource: A2_COXOBASIS_CITATION,
    imageSourceUrl: A2_COXOBASIS_DOI,
  },
  A2N1g: {
    traitCode: 'A2N1g',
    description: 'Group of spinules on the anterior side of A2 Enp1',
    comment: 'Number of spinules',
    imageUrl: A2N1G_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  A2N1g2: {
    traitCode: 'A2N1g2',
    description: 'Row of spinules/setules along the outer margin of A2 Enp1',
    comment: '0 — absent; 1 — present',
  },
  A1ser: {
    traitCode: 'A1ser',
    description: 'Hyaline membrane on the proximal part of the distal segment of antennule (A1)',
    comment: 'Number of denticles (100 = if denticles are too fine to count)',
  },
  Mx1Bsr: {
    traitCode: 'Mx1Bsr',
    description: 'Group of spinules on the maxillular basis',
    comment: '0 — absent; 1 — present',
  },
  P2X3_bsp: {
    traitCode: 'P2X3_bsp',
    description: 'Proximal spine on P2 Exp3 is twice as short as the next one',
    comment: '0 — no; 1 — yes',
  },
  P23_nak_sp: {
    traitCode: 'P23_nak_sp',
    description: 'Total number of naked (without ornamentation) spines on P2 Exp2 and Exp3',
    comment: '',
  },
  P1X1os: {
    traitCode: 'P1X1os',
    description: 'Setules on the outer side of P1 Exp1',
    comment: '0 — absent, 1 — present',
  },
  P1X2os: {
    traitCode: 'P1X2os',
    description: 'Setules on the outer side of P1 Exp2',
    comment: '0 — absent, 1 — present',
  },
  P2X1os: {
    traitCode: 'P2X1os',
    description: 'Setules on the outer side of P2 Exp1',
    comment: '0 — absent, 1 — present',
  },
  P2X2os: {
    traitCode: 'P2X2os',
    description: 'Setules on the outer side of P2 Exp2',
    comment: '0 — absent, 1 — present',
  },
  P3X1os: {
    traitCode: 'P3X1os',
    description: 'Setules on the outer side of P3 Exp1',
    comment: '0 — absent, 1 — present',
  },
  P3X2os: {
    traitCode: 'P3X2os',
    description: 'Setules on the outer side of P3 Exp2',
    comment: '0 — absent, 1 — present',
  },
  P4X1os: {
    traitCode: 'P4X1os',
    description: 'Setules on the outer side of P4 Exp1',
    comment: '0 — absent, 1 — present',
  },
  P4X2os: {
    traitCode: 'P4X2os',
    description: 'Setules on the outer side of P4 Exp2',
    comment: '0 — absent, 1 — present',
  },
  P4X3os: {
    traitCode: 'P4X3os',
    description: 'Setules on the outer side of P4 Exp3',
    comment: '0 — absent, 1 — present',
  },
  P4IS_dr: {
    traitCode: 'P4IS_dr',
    description: 'Distal row of the intercoxal sclerite of P4',
    comment: '0 — short; 1 — medium; 2 — long',
  },
  P4IS_dr2: {
    traitCode: 'P4IS_dr2',
    description: 'Spinules in the middle third of the distal row of the intercoxal sclerite of P4',
    comment: '0 — absent; 1 — present',
  },
  P4IS_drn: {
    traitCode: 'P4IS_drn',
    description: 'Total number of spinules in the distal row of the intercoxal sclerite of P4',
    comment: 'Without dividing by 2',
  },
  P4C_N: {
    traitCode: 'P4C_N',
    description: 'Total number of elements on all sides of the N1-N2 group (P4 coxa)',
    comment: 'These are groups that do not exist in standard numbering',
  },
  P4_CS_osp: {
    traitCode: 'P4_CS_osp',
    description: 'Gap in the ornamentation on the P4 coxal seta',
    comment: '0 — absent; 1 — present',
  },
  P4_CS_osp2: {
    traitCode: 'P4_CS_osp2',
    description: 'Number of OUTER elements on the P4 coxal seta',
    comment: '',
  },
  P4_CS_osp3: {
    traitCode: 'P4_CS_osp3',
    description: 'Tuft of setules at the base of the P4 coxal seta',
    comment: '0 — absent; 1 — present',
  },
  P4_B_sp: {
    traitCode: 'P4_B_sp',
    description: 'Spinules on the posterior (caudal) side of the P4 basis near the base of Exp',
    comment: '',
  },
  P4X1is: {
    traitCode: 'P4X1is',
    description: 'Elements on the inner side of P4 Exp1',
    comment: '',
  },
  P4X2is: {
    traitCode: 'P4X2is',
    description: 'Elements on the inner side of P4 Exp2',
    comment: '',
  },
  P4X1cs: {
    traitCode: 'P4X1cs',
    description: 'Posterior spinules on P4 Exp1',
    comment: '',
  },
  P4X2cs: {
    traitCode: 'P4X2cs',
    description: 'Posterior spinules on P4 Exp2',
    comment: '',
  },
  P4N1cs: {
    traitCode: 'P4N1cs',
    description: 'Posterior spinules on P4 Enp1',
    comment: '',
  },
  P4N2cs: {
    traitCode: 'P4N2cs',
    description: 'Posterior spinules on P4 Enp2',
    comment: '',
  },
  'P4N2/N3': {
    traitCode: 'P4N2/N3',
    description: 'Ratio of the width of P4 Enp segments (Enp2 to Enp3)',
    comment: '0 — width < 2; 1 — width > 2',
  },
  P4X3_pore: {
    traitCode: 'P4X3_pore',
    description: 'Basal pore located proximal to all spines on P4 Exp3',
    comment: '0 — absent; 1 — present',
  },
  P4X3_as2: {
    traitCode: 'P4X3_as2',
    description: 'Shape of the apical seta of P4 Exp3',
    comment: '0 — normal seta; 1 — with hyaline membrane and setules; 2 — spatulate with naked base',
  },
  P4X3_is: {
    traitCode: 'P4X3_is',
    description: 'Number of inner setae with hyaline membrane on P4 Exp3',
    comment: 'Up to 4',
  },
  P4X3_isd: {
    traitCode: 'P4X3_isd',
    description: 'Number of digitate blunt inner setae on P4 Exp3',
    comment: '',
  },
  'GS_m pore': {
    traitCode: 'GS_m pore',
    description: 'Medial pore in the anterior part of the genital double-somite',
    comment: '0 — absent; 1 — present; 2 — double (two pores)',
  },
  Proct: {
    traitCode: 'Proct',
    description: 'Proctodeum setules',
    comment: '0 — absent; 1 — present',
  },
  Proct2: {
    traitCode: 'Proct2',
    description: 'Second row of ornamentation at the distal margin of the proctodeum',
    comment: '0 — absent; 1 — small, few; 2 — long, few; 3 — robust, many',
  },
  AnS_dsp: {
    traitCode: 'AnS_dsp',
    description: 'Small posterior dorsal spinules on the anal somite near the base of the caudal ramus',
    comment: '0 — absent; 1 — small; 2 — normal',
  },
  CRdp: {
    traitCode: 'CRdp',
    description: 'Dorsal pore on the caudal rami',
    comment: '0 — absent; 1 — present',
  },
  CRIS_oset: {
    traitCode: 'CRIS_oset',
    description: 'Elements on the outer side of the inner seta (seta VI)',
    comment: '',
  },
  CRIS_iset: {
    traitCode: 'CRIS_iset',
    description: 'Ornamentation (setules) on the inner side of the inner seta (seta VI)',
    comment: '',
  },
  CRoS_os: {
    traitCode: 'CRoS_os',
    description: 'Ornamentation of the outer seta (seta III) (outer side)',
    comment: '0 — absent; 1 — spinules; 2 — setules',
  },
  CRoS_is: {
    traitCode: 'CRoS_is',
    description: 'Ornamentation of the outer seta (seta III) (inner side)',
    comment: '0 — absent; 1 — short setules; 2 — long setules; 3 — spinules',
  },
  CRoS_osn: {
    traitCode: 'CRoS_osn',
    description: 'Elements on the outer side of the outer seta (seta III)',
    comment: '',
  },
  CRoS_isn: {
    traitCode: 'CRoS_isn',
    description: 'Elements on the inner side of the outer seta (seta III)',
    comment: '',
  },
  sIVmo: {
    traitCode: 'sIVmo',
    description: 'Setules in the medial part of the outer side of the outer apical seta (seta IV)',
    comment: '',
  },
  sIVmi: {
    traitCode: 'sIVmi',
    description: 'Setules in the medial part of the inner side of the outer apical seta (seta IV)',
    comment: '',
  },
  sVmo: {
    traitCode: 'sVmo',
    description: 'Setules in the medial part of the outer side of the inner apical seta (seta V)',
    comment: '',
  },
  sVmi: {
    traitCode: 'sVmi',
    description: 'Setules in the medial part of the inner side of the inner apical seta (seta V)',
    comment: '',
  },
  Crser: {
    traitCode: 'Crser',
    description: 'Spinules on the serra (caudal rami)',
    comment: 'Exact number',
  },
  'xa/x': {
    traitCode: 'xa/x',
    description: 'Morphometric index xa/x (ratio of lengths of structures on P4 Exp3)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'xas/x': {
    traitCode: 'xas/x',
    description: 'Morphometric index xas/x (ratio of lengths of structures on P4 Exp3)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'xas/xa': {
    traitCode: 'xas/xa',
    description: 'Morphometric index xas/xa (ratio of lengths of structures on P4 Exp3)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'n/ns': {
    traitCode: 'n/ns',
    description: 'Morphometric index n/ns (ratio of lengths of structures on P4 Enp3)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'no/n': {
    traitCode: 'no/n',
    description: 'Morphometric index no/n (ratio of lengths of structures on P4 Enp3)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'nai/nao': {
    traitCode: 'nai/nao',
    description: 'Morphometric index nai/nao (ratio of apical spines on P4 Enp3)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'nai/n': {
    traitCode: 'nai/n',
    description: 'Morphometric index nai/n (ratio of inner apical spine to P4 Enp3 length)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'cr/cs': {
    traitCode: 'cr/cs',
    description: 'Morphometric index cr/cs (length-to-width ratio of caudal rami)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'crr/cr': {
    traitCode: 'crr/cr',
    description: 'Morphometric index crr/cr (relative length of serra on caudal rami)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'cri/cro': {
    traitCode: 'cri/cro',
    description: 'Morphometric index cri/cro (inner-to-outer seta ratio on caudal rami)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'cri/cr': {
    traitCode: 'cri/cr',
    description: 'Morphometric index cri/cr (inner seta to caudal ramus length ratio)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'cro/cs': {
    traitCode: 'cro/cs',
    description: 'Morphometric index cro/cs (outer spine to caudal ramus width ratio)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'x/n': {
    traitCode: 'x/n',
    description: 'Morphometric index x/n (ratio of P4 Exp3 length to P4 Enp3 length)',
    comment: 'Decimal fraction (morphometric indices block)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
};

/**
 * Built-in Russian trait descriptions and comments.
 */
export const BUILTIN_TRAIT_ANNOTATIONS_RU: Record<string, TraitAnnotation> = {
  A2g1: {
    traitCode: 'A2g1',
    description: 'Группа шипиков g1 на коксобазисе А2',
    comment: 'Число шипиков',
    imageUrl: A2_COXOBASIS_IMAGE,
    imageSource: A2_COXOBASIS_CITATION,
    imageSourceUrl: A2_COXOBASIS_DOI,
  },
  A2g2: {
    traitCode: 'A2g2',
    description: 'Группа шипиков g2 на коксобазисе А2',
    comment: 'Число шипиков',
    imageUrl: A2_COXOBASIS_IMAGE,
    imageSource: A2_COXOBASIS_CITATION,
    imageSourceUrl: A2_COXOBASIS_DOI,
  },
  A2g3: {
    traitCode: 'A2g3',
    description: 'Группа шипиков g3 на коксобазисе А2',
    comment: 'Число шипиков',
    imageUrl: A2_COXOBASIS_IMAGE,
    imageSource: A2_COXOBASIS_CITATION,
    imageSourceUrl: A2_COXOBASIS_DOI,
  },
  A2g8: {
    traitCode: 'A2g8',
    description: 'Группа шипиков g8 на коксобазисе А2',
    comment: 'Число шипиков',
    imageUrl: A2_COXOBASIS_IMAGE,
    imageSource: A2_COXOBASIS_CITATION,
    imageSourceUrl: A2_COXOBASIS_DOI,
  },
  A2g9: {
    traitCode: 'A2g9',
    description: 'Группа шипиков g9 на коксобазисе А2',
    comment: 'Число шипиков',
    imageUrl: A2_COXOBASIS_IMAGE,
    imageSource: A2_COXOBASIS_CITATION,
    imageSourceUrl: A2_COXOBASIS_DOI,
  },
  A2N1g: {
    traitCode: 'A2N1g',
    description: 'Группа шипиков на передней стороне Enp1 А2',
    comment: 'Число шипиков',
    imageUrl: A2N1G_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
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
    description: 'Количество ВНЕШНИНИХ элементов на коксальной щетинке P4',
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
    comment: '0 — нет; 1 — есть; 2 — удвоенная (две поры)',
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
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'xas/x': {
    traitCode: 'xas/x',
    description: 'Морфометрический индекс xas/x (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'xas/xa': {
    traitCode: 'xas/xa',
    description: 'Морфометрический индекс xas/xa (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'n/ns': {
    traitCode: 'n/ns',
    description: 'Морфометрический индекс n/ns (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'no/n': {
    traitCode: 'no/n',
    description: 'Морфометрический индекс no/n (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'nai/nao': {
    traitCode: 'nai/nao',
    description: 'Морфометрический индекс nai/nao (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'nai/n': {
    traitCode: 'nai/n',
    description: 'Морфометрический индекс nai/n (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'cr/cs': {
    traitCode: 'cr/cs',
    description: 'Морфометрический индекс cr/cs (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'crr/cr': {
    traitCode: 'crr/cr',
    description: 'Морфометрический индекс crr/cr (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'cri/cro': {
    traitCode: 'cri/cro',
    description: 'Морфометрический индекс cri/cro (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'cri/cr': {
    traitCode: 'cri/cr',
    description: 'Морфометрический индекс cri/cr (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'cro/cs': {
    traitCode: 'cro/cs',
    description: 'Морфометрический индекс cro/cs (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
  'x/n': {
    traitCode: 'x/n',
    description: 'Морфометрический индекс x/n (соотношение длин структур)',
    comment: 'Десятичные дроби (блок морфометрических индексов)',
    imageUrl: METRIC_IMAGE,
    imageSource: NOVIKOV_2025_CITATION,
    imageSourceUrl: NOVIKOV_2025_DOI,
  },
};

export const BUILTIN_TRAIT_ANNOTATIONS = BUILTIN_TRAIT_ANNOTATIONS_EN;

export function getDefaultPlaceholderDescription(
  traitCode: string,
  lang: Language = 'en'
): string {
  const dict = lang === 'en' ? BUILTIN_TRAIT_ANNOTATIONS_EN : BUILTIN_TRAIT_ANNOTATIONS_RU;
  if (dict[traitCode]?.description) {
    return dict[traitCode].description;
  }
  return lang === 'en' ? `Trait ${traitCode}` : `Признак ${traitCode}`;
}

export function getTraitDisplayDescription(
  traitCode: string,
  annotations?: Record<string, TraitAnnotation> | TraitAnnotation,
  lang: Language = 'en'
): string {
  const builtinEn = BUILTIN_TRAIT_ANNOTATIONS_EN[traitCode]?.description;
  const builtinRu = BUILTIN_TRAIT_ANNOTATIONS_RU[traitCode]?.description;

  const ann =
    annotations && 'traitCode' in annotations
      ? (annotations as TraitAnnotation)
      : (annotations as Record<string, TraitAnnotation> | undefined)?.[traitCode];

  const custom = ann?.description?.trim();
  // If user entered a custom description that differs from both default EN and RU, show user's custom description
  if (custom && custom !== builtinEn && custom !== builtinRu) {
    return custom;
  }

  return getDefaultPlaceholderDescription(traitCode, lang);
}

export function getTraitDisplayComment(
  traitCode: string,
  annotations?: Record<string, TraitAnnotation> | TraitAnnotation,
  lang: Language = 'en'
): string {
  const builtinEn = BUILTIN_TRAIT_ANNOTATIONS_EN[traitCode]?.comment || '';
  const builtinRu = BUILTIN_TRAIT_ANNOTATIONS_RU[traitCode]?.comment || '';

  const ann =
    annotations && 'traitCode' in annotations
      ? (annotations as TraitAnnotation)
      : (annotations as Record<string, TraitAnnotation> | undefined)?.[traitCode];

  const custom = ann?.comment?.trim();
  if (custom && custom !== builtinEn && custom !== builtinRu) {
    return custom;
  }

  return lang === 'en' ? builtinEn : builtinRu;
}

export function loadTraitAnnotations(): Record<string, TraitAnnotation> {
  const merged: Record<string, TraitAnnotation> = { ...BUILTIN_TRAIT_ANNOTATIONS_EN };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [code, ann] of Object.entries(parsed as Record<string, TraitAnnotation>)) {
          const builtin = BUILTIN_TRAIT_ANNOTATIONS_EN[code];
          merged[code] = {
            traitCode: code,
            description: ann.description?.trim() ? ann.description : builtin?.description || '',
            comment: ann.comment?.trim() ? ann.comment : builtin?.comment || '',
            imageUrl: ann.imageUrl || builtin?.imageUrl,
            imageSource: ann.imageSource || builtin?.imageSource,
            imageSourceUrl: ann.imageSourceUrl || builtin?.imageSourceUrl,
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
    console.error('Failed to save trait annotations to localStorage:', err);
  }
}

/**
 * High-efficiency client-side image compressor using URL.createObjectURL + Canvas WebP.
 * Handles 30+ MB microscope photographs without memory spikes, shrinking them to ~120-250 KB.
 */
export function compressImageFileToDataUrl(
  file: File | Blob,
  maxDimension = 1400,
  quality = 0.84
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image file'));
    };
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
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
        reject(new Error('Canvas context unavailable'));
        return;
      }
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
      } catch (err) {
        reject(err);
      }
    };
    img.src = objectUrl;
  });
}

/**
 * Estimates byte size of a DataURL string.
 */
export function estimateDataUrlByteSize(dataUrl: string): number {
  const base64Index = dataUrl.indexOf(',');
  if (base64Index === -1) return dataUrl.length;
  const base64Length = dataUrl.length - (base64Index + 1);
  return Math.round((base64Length * 3) / 4);
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
