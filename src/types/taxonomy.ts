export type TraitKind = 'qualitative' | 'meristic' | 'morphometric';

export type AnatomicalSection =
  | 'A2'
  | 'A1_Mx1'
  | 'P1_P3'
  | 'P4'
  | 'Somites'
  | 'CR_Setae'
  | 'Ratios';

export interface TraitAnnotation {
  traitCode: string;
  /** Расшифровка признака на нормальном языке (плейсхолдер по умолчанию, редактируется пользователем) */
  description: string;
  /** Комментарий / методическое примечание к признаку или его состояниям */
  comment: string;
  /** Картинка (одна на все состояния признака) в формате DataURL или URL */
  imageUrl?: string;
  /** Ссылка на источник / статью, откуда взят рисунок (например: "Alekseev et al., 2006, Fig. 2" или "Novikov et al., 2025") */
  imageSource?: string;
  /** Опциональная прямая веб-ссылка (DOI / URL) на статью-источник */
  imageSourceUrl?: string;
}

export interface SpeciesMedia {
  sp: string;
  /** Сжатое фото самки (♀ Female) в формате WebP DataURL или пути к файлу */
  femaleImageUrl?: string;
  /** Подпись / номер препарата для фото самки */
  femaleCaption?: string;
  /** Сжатое фото самца (♂ Male) в формате WebP DataURL или пути к файлу */
  maleImageUrl?: string;
  /** Подпись / номер препарата для фото самца */
  maleCaption?: string;
  /** Ссылка на статью или автора фотографий вида */
  photoSource?: string;
}

export interface MediaBundle {
  version: number;
  updatedAt: string;
  traitAnnotations?: Record<string, TraitAnnotation>;
  speciesMedia?: Record<string, SpeciesMedia>;
}

export interface TraitDefinition {
  /** Exact column name from the CSV header — NEVER altered */
  code: string;
  /** Column index in the CSV (13..80, excluding P5) */
  colIndex: number;
  /** Trait data type */
  kind: TraitKind;
  /** Anatomical grouping for optional navigation */
  section: AnatomicalSection;
  /** Global observed discrete values (for qualitative traits) */
  discreteStates: number[];
  /** Global minimum across all 182 specimens */
  globalMin: number;
  /** Global maximum across all 182 specimens */
  globalMax: number;
  /** Global mean across all 182 specimens */
  globalMean: number;
  /** Pooled within-species standard deviation (from species with n >= 3) */
  pooledSd: number;
  /** Pooled within-species coefficient of variation (SD / Mean) */
  pooledCv: number;
  /** Group-specific pooled SDs (e.g., within 'arcanus', 'denticulatus', 'serrulatus', 'speratus') */
  groupPooledSd: Record<string, number>;
  /** Number of decimal places in raw data (0 for integers, 2 for ratios) */
  decimals: number;
}

export interface SpecimenRecord {
  num: number;
  region: string;
  district: string;
  waterbody: string;
  lat: number | null;
  lon: number | null;
  date: string;
  collector: string;
  group: string;
  color: string;
  sym: string;
  nn: number;
  sp: string;
  missingCount: number;
  inVivoColor: string;
  spCountMeta: number | null;
  /** Raw parsed numeric value for each trait code, or null if '?' */
  traits: Record<string, number | null>;
}

export interface SpeciesTraitStats {
  traitCode: string;
  kind: TraitKind;
  /** Number of specimens with non-missing values for this trait */
  n: number;
  /** All observed numeric values among specimens of this species */
  values: number[];
  /** Distinct observed discrete states (for qualitative traits, e.g., [1, 2]) */
  stateSet: number[];
  /** Frequency map of each discrete state: state -> count of specimens */
  stateCounts: Record<number, number>;
  /** Empirical minimum from the matrix */
  rawMin: number | null;
  /** Empirical maximum from the matrix */
  rawMax: number | null;
  /** Arithmetic mean */
  mean: number | null;
  /** Median */
  median: number | null;
  /** Empirical sample standard deviation (null if n < 2) */
  sampleSd: number | null;
  /** Shrinkage-estimated standard deviation (combining sampleSd and pooled prior) */
  estimatedSd: number | null;
}

export interface SpeciesSummaryMeta {
  group: string;
  sp: string;
  numSpecimens: number;
  status: string; // e.g., 'valid', 'n. sp.', '?', '=macruroides?'
  inKey: boolean; // '+' -> true, '-' -> false
}

export interface SpeciesProfile {
  /** Species name from column `sp` (e.g. "E. sibiricus") */
  sp: string;
  /** Author and year of description for valid species (e.g. "Alekseev, 1990" or "(Fischer, 1851)") */
  authority?: string;
  /** Taxonomic note or synonymy (e.g. "=E. arcanus arcticus" or "Form A sensu Alekseev et al., 2006") */
  taxonomicNote?: string;
  /** Species group (e.g. "speratus", "arcanus", "denticulatus", "serrulatus") */
  group: string;
  /** Taxonomic status from bottom summary table */
  status: string;
  /** Whether marked '+' in the 'key' column of the summary table */
  inKey: boolean;
  /** Color code from CSV */
  color: string;
  /** Symbol from CSV */
  sym: string;
  /** Total number of specimens in the matrix */
  specimenCount: number;
  /** Specimen records belonging to this species */
  specimens: SpecimenRecord[];
  /** Distinct regions where collected */
  regions: string[];
  /** Distinct waterbodies */
  waterbodies: string[];
  /** In-vivo color notes if any */
  inVivoColors: string[];
  /** Aggregated statistics per trait code */
  traitStats: Record<string, SpeciesTraitStats>;
}

export type ExtrapolationMethod =
  | 'bayesian_pooled'
  | 'student_t'
  | 'cv_buffer'
  | 'strict_raw';

export interface KeyConfig {
  /** Range extrapolation method for quantitative traits */
  extrapolationMethod: ExtrapolationMethod;
  /** Multiplier k for SD/tolerance expansion (default 2.0, range 0.5 - 3.5) */
  sigmaMultiplier: number;
  /** Percentage buffer for cv_buffer mode (default 12%) */
  percentBuffer: number;
  /** Prior weight (pseudo-sample size m, default 3) for borrowing genus/group SD */
  priorWeight: number;
  /** Keep strict 0 when all specimens of a species have 0 for a meristic count trait */
  protectStrictZero: boolean;
  /** Whether to allow adjacent +-1 tolerance on qualitative states when n <= 2 */
  relaxQualitativeForTinyN: boolean;
  /** Filter species scope: 'all' (33 species) or 'key_only' (28 species with key='+') */
  speciesScope: 'all' | 'key_only';
  /** Include the unidentified specimen '?' (#169) as a separate candidate entry */
  includeUnknownSp: boolean;
  /** How to treat missing data ('?') for a trait in a species: true = do not eliminate species */
  retainOnMissingData: boolean;
}

export interface UserTraitFilter {
  traitCode: string;
  /** For qualitative traits: selected state(s). A species matches if ANY of its observed states is in selectedStates */
  selectedStates?: number[];
  /** For quantitative traits: observed numeric value entered by user (or min..max interval if user enters range) */
  numericValue?: number | null;
  numericMin?: number | null;
  numericMax?: number | null;
}

export type TraitMatchStatus =
  | 'exact_match'       // Within raw [min, max] or exact qualitative state present
  | 'extrapolated_match'// Outside raw [min, max], but within small-sample extrapolated range [extMin, extMax]
  | 'missing_data'      // Species has no data ('?') for this trait
  | 'mismatch';         // Outside allowed range / state not present

export type MismatchSeverity = 'none' | 'marginal' | 'moderate' | 'severe';

export interface TraitEvaluationDetail {
  traitCode: string;
  status: TraitMatchStatus;
  userInputSummary: string;
  speciesRawSummary: string;
  speciesExtrapolatedSummary: string;
  rawMin: number | null;
  rawMax: number | null;
  extMin: number | null;
  extMax: number | null;
  /** Normalized distance from raw range (0 if inside raw range, <=1 if inside extrapolated range, >1 if outside) */
  normalizedDistance: number;
  /** Continuous trait similarity score (0 to 100%) based on Gaussian/Cauchy kernel of standardized distance */
  traitSimilarity: number;
  /** Standardized distance from species mean/centroid in units of intraspecific SD (sigma) */
  sigmaDeviation: number;
  /** Standardized gap outside the extrapolated tolerance interval in units of SD (0 if inside tolerance) */
  sigmaGapFromTolerance: number;
  /** Raw numeric gap outside the extrapolated tolerance interval in original trait units (0 if inside) */
  rawGapFromTolerance: number;
  /** Classification of mismatch magnitude */
  mismatchSeverity: MismatchSeverity;
}

export interface SpeciesCandidateEvaluation {
  species: SpeciesProfile;
  /** True if species has 0 mismatches across all active user trait filters */
  isCandidate: boolean;
  /** True if all matches are strictly within raw [min, max] */
  isStrictRawCandidate: boolean;
  /** Number of active traits where species matched strictly within raw [min, max] */
  exactMatchesCount: number;
  /** Number of active traits where species matched only via small-sample extrapolation */
  extrapolatedMatchesCount: number;
  /** Number of active traits where species has missing data '?' */
  missingDataCount: number;
  /** Number of active traits where species was eliminated (mismatch) */
  mismatchesCount: number;
  /** Number of mismatches that are only marginal boundary misses (<= 0.75 sigma) */
  marginalMismatchesCount: number;
  /** Overall similarity / compatibility score (0 to 100) */
  compatibilityScore: number;
  /** Continuous quantitative morphological similarity index (0 to 100%) combining kernel proximity and RMS sigma distance */
  quantitativeSimilarity: number;
  /** Root-mean-square standardized deviation across all active comparable traits (in sigma units) */
  rmsSigmaDistance: number;
  /** Mean Z-score / distance across active traits (lower = closer to species centroid) */
  centroidDistance: number;
  /** Nearest individual specimen of this species in the database to the entered traits */
  nearestSpecimenNum: number | null;
  /** Per-trait evaluation breakdown for all active traits */
  details: Record<string, TraitEvaluationDetail>;
  /** List of mismatching trait evaluations (reasons for elimination), sorted from most severe to least severe */
  mismatchReasons: TraitEvaluationDetail[];
}

