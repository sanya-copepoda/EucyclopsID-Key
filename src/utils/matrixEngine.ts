import {
  AnatomicalSection,
  KeyConfig,
  SpeciesCandidateEvaluation,
  SpeciesProfile,
  SpeciesSummaryMeta,
  SpeciesTraitStats,
  SpecimenRecord,
  TraitDefinition,
  TraitEvaluationDetail,
  TraitKind,
  UserTraitFilter,
} from '../types/taxonomy';

/**
 * Excluded traits: P5 traits are completely removed as requested by the user.
 */
const EXCLUDED_TRAIT_CODES = new Set<string>(['P5os', 'P5is', 'P5Sos', 'P5Sis']);

/**
 * Exact set of qualitative (discrete state 0, 1, 2, 3) trait codes in the CSV matrix
 * according to the author's reference table.
 */
const QUALITATIVE_TRAIT_CODES = new Set<string>([
  'A2N1g2',
  'Mx1Bsr',
  'P2X3_bsp',
  'P1X1os',
  'P1X2os',
  'P2X1os',
  'P2X2os',
  'P3X1os',
  'P3X2os',
  'P4X1os',
  'P4X2os',
  'P4X3os',
  'P4IS_dr',
  'P4IS_dr2',
  'P4_CS_osp',
  'P4_CS_osp3',
  'P4N2/N3',
  'P4X3_pore',
  'P4X3_as2',
  'GS_m pore',
  'Proct',
  'Proct2',
  'AnS_dsp',
  'CRdp',
  'CRoS_os',
  'CRoS_is',
]);

/**
 * Morphometric continuous ratio indices in the CSV matrix.
 */
const MORPHOMETRIC_RATIO_CODES = new Set<string>([
  'xa/x',
  'xas/x',
  'xas/xa',
  'n/ns',
  'no/n',
  'nai/nao',
  'nai/n',
  'cr/cs',
  'crr/cr',
  'cri/cro',
  'cri/cr',
  'cro/cs',
  'x/n',
]);

/**
 * Normalizes species names according to taxonomic decisions:
 * E. suturus is merged with E. paraserrulatus under the name E. paraserrulatus.
 */
export function normalizeSpeciesName(rawSp: string): string {
  const trimmed = rawSp.trim();
  if (trimmed === 'E. suturus' || trimmed === 'Eucyclops suturus' || trimmed === 'suturus') {
    return 'E. paraserrulatus';
  }
  return trimmed || '?';
}

export type TaxonomicCategory = 'valid' | 'candidate' | 'doubtful';

export function getSpeciesTaxonomicCategory(status: string): TaxonomicCategory {
  const s = (status || '').trim().toLowerCase();
  if (s === 'valid') return 'valid';
  if (s === 'n. sp.' || s === 'n.sp.' || s === 'sp. nov.') return 'candidate';
  return 'doubtful';
}

export function getAnatomicalSection(code: string): AnatomicalSection {
  if (code.startsWith('A2')) return 'A2';
  if (code === 'A1ser' || code === 'Mx1Bsr') return 'A1_Mx1';
  if (code.startsWith('P1') || code.startsWith('P2') || code.startsWith('P3')) return 'P1_P3';
  if (code.startsWith('P4')) return 'P4';
  if (code === 'GS_m pore' || code.startsWith('Proct') || code === 'AnS_dsp') return 'Somites';
  if (code.startsWith('CR') || code.startsWith('sIV') || code.startsWith('sV') || code === 'Crser') {
    return 'CR_Setae';
  }
  return 'Ratios';
}

export const ANATOMICAL_SECTION_LABELS: Record<AnatomicalSection, string> = {
  A2: 'A2 (A2g1 – A2N1g2)',
  A1_Mx1: 'A1, Mx1 (A1ser, Mx1Bsr)',
  P1_P3: 'P1 – P3 (P2X3_bsp – P3X2os)',
  P4: 'P4 (P4X1os – P4X3_isd)',
  Somites: 'GS, Proct, AnS (GS_m pore – AnS_dsp)',
  CR_Setae: 'CR, sIV, sV (CRdp – Crser)',
  Ratios: 'Индексы (xa/x – x/n)',
};

/**
 * Parses a single CSV or TSV line respecting quoted strings that contain commas.
 */
export function parseCsvLine(line: string, delimiter: ',' | '\t' = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseNumericCell(raw: string | undefined): number | null {
  if (!raw || raw === '?' || raw === '-' || raw === '') return null;
  const normalized = raw.replace(',', '.').trim();
  const val = Number(normalized);
  return Number.isFinite(val) ? val : null;
}

/**
 * Hartley's expected range factor d2(n) = E[(X_(n) - X_(1)) / sigma] for a normal sample of size n.
 */
export function getHartleyD2(n: number): number {
  if (n <= 1) return 0.0;
  const table: Record<number, number> = {
    2: 1.128,
    3: 1.693,
    4: 2.059,
    5: 2.326,
    6: 2.534,
    7: 2.704,
    8: 2.847,
    9: 2.97,
    10: 3.078,
    11: 3.173,
    12: 3.258,
    13: 3.336,
    14: 3.407,
    15: 3.472,
    16: 3.532,
    17: 3.588,
    18: 3.64,
    19: 3.689,
    20: 3.735,
    21: 3.778,
    22: 3.819,
  };
  if (table[n] !== undefined) return table[n];
  return Math.min(4.2, 3.819 + 0.03 * (n - 22));
}

export interface ParsedMatrixDataset {
  traits: TraitDefinition[];
  traitMap: Record<string, TraitDefinition>;
  specimens: SpecimenRecord[];
  speciesList: SpeciesProfile[];
  speciesSummaryMap: Record<string, SpeciesSummaryMeta>;
}

/**
 * Builds the complete dataset (TraitDefinitions + SpeciesProfiles + Pooled SDs)
 * from a list of SpecimenRecords, rawTraitCodes, and speciesSummaryMap.
 * This allows instantaneous dynamic recalculation whenever specimens are added, edited, or deleted.
 */
export function buildDatasetFromSpecimens(
  rawTraitCodes: { code: string; colIndex: number }[],
  specimens: SpecimenRecord[],
  speciesSummaryMap: Record<string, SpeciesSummaryMeta>
): ParsedMatrixDataset {
  // Group specimens by normalized species name
  const specimensBySp: Record<string, SpecimenRecord[]> = {};
  for (const spec of specimens) {
    const spKey = normalizeSpeciesName(spec.sp);
    if (!specimensBySp[spKey]) {
      specimensBySp[spKey] = [];
    }
    specimensBySp[spKey].push({ ...spec, sp: spKey });
  }

  const traits: TraitDefinition[] = [];
  const traitMap: Record<string, TraitDefinition> = {};

  for (const { code, colIndex } of rawTraitCodes) {
    // Allow numerical values pasted by user to dynamically expand discreteStates if qualitative
    const kind: TraitKind = QUALITATIVE_TRAIT_CODES.has(code)
      ? 'qualitative'
      : MORPHOMETRIC_RATIO_CODES.has(code)
      ? 'morphometric'
      : 'meristic';

    const allVals: number[] = [];
    for (const s of specimens) {
      const v = s.traits[code];
      if (v !== null && v !== undefined) {
        allVals.push(v);
      }
    }

    const globalMin = allVals.length > 0 ? Math.min(...allVals) : 0;
    const globalMax = allVals.length > 0 ? Math.max(...allVals) : 1;
    const globalMean =
      allVals.length > 0 ? allVals.reduce((a, b) => a + b, 0) / allVals.length : 0;

    const discreteStates =
      kind === 'qualitative'
        ? Array.from(new Set(allVals)).sort((a, b) => a - b)
        : [];

    // Compute pooled within-species SD across species with n >= 3
    let totalDf = 0;
    let sumSqDev = 0;
    const cvList: number[] = [];
    const groupDf: Record<string, number> = {};
    const groupSumSq: Record<string, number> = {};

    for (const [spName, spSpecimens] of Object.entries(specimensBySp)) {
      if (spName === '?') continue;
      const vals = spSpecimens
        .map((r) => r.traits[code])
        .filter((v): v is number => v !== null && v !== undefined);

      if (vals.length >= 2) {
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const ss = vals.reduce((acc, v) => acc + (v - mean) * (v - mean), 0);
        const df = vals.length - 1;

        if (vals.length >= 3) {
          totalDf += df;
          sumSqDev += ss;
          const sd = Math.sqrt(ss / df);
          if (mean > 0.001) {
            cvList.push(sd / mean);
          }
        }

        const grp =
          speciesSummaryMap[spName]?.group ||
          spSpecimens.find((x) => x.group && x.group !== '?')?.group ||
          'unknown';
        groupDf[grp] = (groupDf[grp] || 0) + df;
        groupSumSq[grp] = (groupSumSq[grp] || 0) + ss;
      }
    }

    const pooledSd =
      totalDf > 0
        ? Math.sqrt(sumSqDev / totalDf)
        : (globalMax - globalMin) * 0.12;

    const pooledCv =
      cvList.length > 0
        ? cvList.reduce((a, b) => a + b, 0) / cvList.length
        : globalMean > 0
        ? pooledSd / globalMean
        : 0.1;

    const groupPooledSd: Record<string, number> = {};
    for (const grp of Object.keys(groupDf)) {
      if (groupDf[grp] >= 2) {
        groupPooledSd[grp] = Math.sqrt(groupSumSq[grp] / groupDf[grp]);
      } else {
        groupPooledSd[grp] = pooledSd;
      }
    }

    const def: TraitDefinition = {
      code,
      colIndex,
      kind,
      section: getAnatomicalSection(code),
      discreteStates,
      globalMin,
      globalMax,
      globalMean,
      pooledSd,
      pooledCv,
      groupPooledSd,
      decimals: kind === 'morphometric' ? 2 : 0,
    };

    traits.push(def);
    traitMap[code] = def;
  }

  // Build SpeciesProfile for each species
  const speciesList: SpeciesProfile[] = [];

  for (const [spName, spSpecimens] of Object.entries(specimensBySp)) {
    const summaryMeta = speciesSummaryMap[spName];
    const group =
      summaryMeta?.group && summaryMeta.group !== '?'
        ? summaryMeta.group
        : spSpecimens.find((s) => s.group && s.group !== '?')?.group || '?';
    const status = summaryMeta?.status || (spName === '?' ? 'indet.' : 'n. sp.');
    const inKey = summaryMeta ? summaryMeta.inKey : spName !== '?';
    const color = spSpecimens.find((s) => s.color)?.color || 'Slate';
    const sym = spSpecimens.find((s) => s.sym)?.sym || 'Dot';

    const regions = Array.from(
      new Set(spSpecimens.map((s) => s.region).filter((r) => r && r !== '-' && r !== '?'))
    );
    const waterbodies = Array.from(
      new Set(spSpecimens.map((s) => s.waterbody).filter((w) => w && w !== '-' && w !== '?'))
    );
    const inVivoColors = Array.from(
      new Set(spSpecimens.map((s) => s.inVivoColor).filter((c) => Boolean(c)))
    );

    const traitStats: Record<string, SpeciesTraitStats> = {};

    for (const trait of traits) {
      const vals = spSpecimens
        .map((s) => s.traits[trait.code])
        .filter((v): v is number => v !== null && v !== undefined)
        .sort((a, b) => a - b);

      const n = vals.length;
      const stateCounts: Record<number, number> = {};
      for (const v of vals) {
        stateCounts[v] = (stateCounts[v] || 0) + 1;
      }
      const stateSet = Object.keys(stateCounts)
        .map(Number)
        .sort((a, b) => a - b);

      let rawMin: number | null = null;
      let rawMax: number | null = null;
      let mean: number | null = null;
      let median: number | null = null;
      let sampleSd: number | null = null;
      let estimatedSd: number | null = null;

      if (n > 0) {
        rawMin = vals[0];
        rawMax = vals[n - 1];
        mean = vals.reduce((a, b) => a + b, 0) / n;
        const mid = Math.floor(n / 2);
        median = n % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;

        if (n >= 2) {
          const ss = vals.reduce((acc, v) => acc + (v - mean!) * (v - mean!), 0);
          sampleSd = Math.sqrt(ss / (n - 1));
        }

        const groupSd = trait.groupPooledSd[group] ?? trait.pooledSd;
        const priorSd = 0.6 * groupSd + 0.4 * trait.pooledSd;
        const priorWeight = 3;
        if (n >= 2 && sampleSd !== null) {
          estimatedSd = ((n - 1) * sampleSd + priorWeight * priorSd) / (n - 1 + priorWeight);
        } else {
          estimatedSd = priorSd;
        }
      }

      traitStats[trait.code] = {
        traitCode: trait.code,
        kind: trait.kind,
        n,
        values: vals,
        stateSet,
        stateCounts,
        rawMin,
        rawMax,
        mean,
        median,
        sampleSd,
        estimatedSd,
      };
    }

    speciesList.push({
      sp: spName,
      group,
      status,
      inKey,
      color,
      sym,
      specimenCount: spSpecimens.length,
      specimens: spSpecimens,
      regions,
      waterbodies,
      inVivoColors,
      traitStats,
    });
  }

  speciesList.sort((a, b) => {
    if (a.sp === '?') return 1;
    if (b.sp === '?') return -1;
    return a.sp.localeCompare(b.sp);
  });

  return {
    traits,
    traitMap,
    specimens: specimens.map((s) => ({ ...s, sp: normalizeSpeciesName(s.sp) })),
    speciesList,
    speciesSummaryMap,
  };
}

/**
 * Parses the full Eucyclops CSV matrix, extracts all 68 trait definitions (excluding P5),
 * merges E. suturus into E. paraserrulatus, and computes pooled within-species variance parameters.
 */
export function parseEucyclopsMatrix(
  csvText: string,
  extraSpecimens: SpecimenRecord[] = []
): ParsedMatrixDataset {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  const headerCells = parseCsvLine(lines[0]);
  const traitStartCol = 13;
  const traitEndCol = 84;

  const rawTraitCodes: { code: string; colIndex: number }[] = [];
  for (let col = traitStartCol; col <= traitEndCol; col++) {
    const code = headerCells[col];
    if (code && !EXCLUDED_TRAIT_CODES.has(code) && !code.startsWith('P5')) {
      rawTraitCodes.push({ code, colIndex: col });
    }
  }

  const specimens: SpecimenRecord[] = [];
  const speciesSummaryMap: Record<string, SpeciesSummaryMeta> = {};

  let inSummarySection = false;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 5) continue;

    if (cells[1] === 'gr' && cells[2] === 'sp' && cells[3] === 'num') {
      inSummarySection = true;
      continue;
    }

    if (inSummarySection) {
      const gr = cells[1] || '';
      const rawSpName = cells[2] || '';
      const spName = normalizeSpeciesName(rawSpName);
      const numVal = parseNumericCell(cells[3]);
      const stat = cells[4] || '';
      const keyFlag = cells[5] || '';

      // Skip E. suturus summary row since it is merged into E. paraserrulatus
      if (rawSpName.trim() === 'E. suturus') {
        continue;
      }

      if (spName && spName !== '34' && gr !== 'Итог') {
        speciesSummaryMap[spName] = {
          group: gr,
          sp: spName,
          numSpecimens: numVal ?? 0,
          status: stat || '?',
          inKey: keyFlag === '+',
        };
      }
      continue;
    }

    const rowNum = parseNumericCell(cells[0]);
    if (rowNum === null) continue;

    const traitsMap: Record<string, number | null> = {};
    for (const { code, colIndex } of rawTraitCodes) {
      traitsMap[code] = parseNumericCell(cells[colIndex]);
    }

    const spRaw = normalizeSpeciesName(cells[12] || '?');
    specimens.push({
      num: rowNum,
      region: cells[1] || '-',
      district: cells[2] || '-',
      waterbody: cells[3] || '-',
      lat: parseNumericCell(cells[4]),
      lon: parseNumericCell(cells[5]),
      date: cells[6] || '?',
      collector: cells[7] || '?',
      group: cells[8] || '?',
      color: spRaw === 'E. paraserrulatus' ? 'Blue' : cells[9] || '',
      sym: cells[10] || '',
      nn: parseNumericCell(cells[11]) ?? rowNum,
      sp: spRaw,
      missingCount: parseNumericCell(cells[85]) ?? 0,
      inVivoColor: cells[86] || '',
      spCountMeta: parseNumericCell(cells[87]),
      traits: traitsMap,
    });
  }

  const combinedSpecimens = [...specimens, ...extraSpecimens];
  return buildDatasetFromSpecimens(rawTraitCodes, combinedSpecimens, speciesSummaryMap);
}

/**
 * Parses one or more rows pasted from Excel (TSV) or CSV and converts them into SpecimenRecord objects.
 */
export function parsePastedSpecimenRows(
  rawText: string,
  traits: TraitDefinition[],
  startingNum: number
): SpecimenRecord[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  const added: SpecimenRecord[] = [];
  let nextNum = startingNum;

  for (const line of lines) {
    const delimiter: ',' | '\t' = line.includes('\t') ? '\t' : ',';
    const cells = parseCsvLine(line, delimiter);
    if (cells.length < 13) continue;
    // Skip header line if user copied the header too
    if (cells[0] === 'num' || cells[12] === 'sp') continue;

    const traitsMap: Record<string, number | null> = {};
    let missingCount = 0;
    for (const t of traits) {
      const val = parseNumericCell(cells[t.colIndex]);
      traitsMap[t.code] = val;
      if (val === null) missingCount++;
    }

    const parsedNum = parseNumericCell(cells[0]);
    const finalNum = parsedNum !== null ? parsedNum : nextNum++;
    const spNormalized = normalizeSpeciesName(cells[12] || '?');

    added.push({
      num: finalNum,
      region: cells[1] || '-',
      district: cells[2] || '-',
      waterbody: cells[3] || '-',
      lat: parseNumericCell(cells[4]),
      lon: parseNumericCell(cells[5]),
      date: cells[6] || '?',
      collector: cells[7] || '?',
      group: cells[8] || '?',
      color: cells[9] || 'Blue',
      sym: cells[10] || 'Dot',
      nn: parseNumericCell(cells[11]) ?? finalNum,
      sp: spNormalized,
      missingCount,
      inVivoColor: cells[86] || '',
      spCountMeta: null,
      traits: traitsMap,
    });
  }

  return added;
}

/**
 * Exports the full dataset (including any newly added specimens) back to the original CSV structure.
 */
export function exportDatasetToCsv(dataset: ParsedMatrixDataset): string {
  const header = [
    'num',
    'Регион',
    'Район',
    'Водоем',
    'N',
    'E',
    'data',
    'leg.',
    'group',
    'color',
    'sym',
    'NN',
    'sp',
    ...dataset.traits.map((t) => t.code),
    '?',
    'color2',
    'sp2',
  ].join(',');

  const rows = dataset.specimens.map((s) => {
    const latStr = s.lat !== null ? `"${String(s.lat).replace('.', ',')}"` : '?';
    const lonStr = s.lon !== null ? `"${String(s.lon).replace('.', ',')}"` : '?';
    const collectorStr = s.collector.includes(',') ? `"${s.collector}"` : s.collector;

    const traitCells = dataset.traits.map((t) => {
      const v = s.traits[t.code];
      if (v === null || v === undefined) return '?';
      if (t.decimals > 0) {
        return `"${v.toFixed(t.decimals).replace('.', ',')}"`;
      }
      return String(Math.round(v));
    });

    const spProfile = dataset.speciesList.find((sp) => sp.sp === s.sp);

    return [
      s.num,
      s.region,
      s.district,
      s.waterbody,
      latStr,
      lonStr,
      s.date,
      collectorStr,
      s.group,
      s.color,
      s.sym,
      s.nn,
      s.sp,
      ...traitCells,
      s.missingCount,
      s.inVivoColor || '',
      spProfile?.specimenCount ?? 1,
    ].join(',');
  });

  const summaryRows = [
    '',
    ',gr,sp,num,stat,key',
    ...dataset.speciesList.map(
      (sp) =>
        `,${sp.group},${sp.sp},${sp.specimenCount},${sp.status},${sp.inKey ? '+' : '-'}`
    ),
  ];

  return [header, ...rows, ...summaryRows].join('\n');
}

/**
 * Computes the effective allowed range [extMin, extMax] for a quantitative trait of a species,
 * taking into account small sample size n and the user's chosen extrapolation model.
 */
export function computeExtrapolatedRange(
  stats: SpeciesTraitStats,
  trait: TraitDefinition,
  group: string,
  config: KeyConfig
): { extMin: number | null; extMax: number | null } {
  if (stats.n === 0 || stats.rawMin === null || stats.rawMax === null || stats.mean === null) {
    return { extMin: null, extMax: null };
  }

  const { rawMin, rawMax, mean, n, sampleSd } = stats;

  if (trait.code === 'A1ser') {
    if (rawMin === 100 && rawMax === 100) {
      return { extMin: 100, extMax: 100 };
    }
    if (rawMin === 0 && rawMax === 0) {
      return { extMin: 0, extMax: 0 };
    }
  }

  if (
    config.protectStrictZero &&
    trait.kind === 'meristic' &&
    rawMin === 0 &&
    rawMax === 0
  ) {
    const groupSd = trait.groupPooledSd[group] ?? trait.pooledSd;
    if (n >= 3 || groupSd < 0.25 || config.extrapolationMethod === 'strict_raw') {
      return { extMin: 0, extMax: 0 };
    }
  }

  if (config.extrapolationMethod === 'strict_raw') {
    return { extMin: rawMin, extMax: rawMax };
  }

  const groupSd = trait.groupPooledSd[group] ?? trait.pooledSd;
  const priorSd = 0.6 * groupSd + 0.4 * trait.pooledSd;
  const m = config.priorWeight;
  const estSd =
    n >= 2 && sampleSd !== null
      ? ((n - 1) * sampleSd + m * priorSd) / (n - 1 + m)
      : priorSd;

  let extMin = rawMin;
  let extMax = rawMax;

  if (config.extrapolationMethod === 'bayesian_pooled') {
    const d2 = getHartleyD2(n);
    const rangeDeficitRatio = Math.max(0.12, 1.0 - d2 / 4.0);
    const pad = config.sigmaMultiplier * estSd * rangeDeficitRatio;
    extMin = rawMin - pad;
    extMax = rawMax + pad;
  } else if (config.extrapolationMethod === 'student_t') {
    const predHalfWidth = config.sigmaMultiplier * estSd * Math.sqrt(1 + 1 / n);
    extMin = Math.min(rawMin, mean - predHalfWidth);
    extMax = Math.max(rawMax, mean + predHalfWidth);
  } else if (config.extrapolationMethod === 'cv_buffer') {
    const smallSampleBoost = n <= 1 ? 1.65 : n === 2 ? 1.35 : n <= 4 ? 1.15 : 1.0;
    const baseRef = Math.max(Math.abs(mean), (trait.globalMax - trait.globalMin) * 0.15);
    const pad = baseRef * (config.percentBuffer / 100) * smallSampleBoost;
    extMin = rawMin - pad;
    extMax = rawMax + pad;
  }

  if (trait.kind === 'meristic') {
    extMin = Math.max(0, Math.floor(extMin));
    extMax = Math.ceil(extMax);
    if (trait.code === 'A1ser') {
      if (rawMin > 0) extMin = Math.max(1, extMin);
      if (rawMax < 100) extMax = Math.min(85, extMax);
    }
  } else {
    extMin = Math.max(0, Number(extMin.toFixed(2)));
    extMax = Number(extMax.toFixed(2));
  }

  return { extMin, extMax };
}

export function formatTraitNumber(val: number | null | undefined, decimals: number): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '?';
  return decimals === 0 ? String(Math.round(val)) : val.toFixed(decimals);
}

/**
 * Evaluates all species in the dataset against the user's currently entered trait filters.
 */
export function evaluateSpeciesCandidates(
  speciesList: SpeciesProfile[],
  traitMap: Record<string, TraitDefinition>,
  activeFilters: Record<string, UserTraitFilter>,
  config: KeyConfig
): SpeciesCandidateEvaluation[] {
  const filterEntries = Object.values(activeFilters).filter((f) => {
    if (f.selectedStates && f.selectedStates.length > 0) return true;
    if (f.numericValue !== null && f.numericValue !== undefined) return true;
    if (
      (f.numericMin !== null && f.numericMin !== undefined) ||
      (f.numericMax !== null && f.numericMax !== undefined)
    ) {
      return true;
    }
    return false;
  });

  const filteredSpecies = speciesList.filter((sp) => {
    if (sp.sp === '?' && !config.includeUnknownSp) return false;
    if (config.speciesScope === 'key_only' && sp.sp !== '?' && !sp.inKey) return false;
    return true;
  });

  const evaluations: SpeciesCandidateEvaluation[] = [];

  for (const sp of filteredSpecies) {
    let exactMatchesCount = 0;
    let extrapolatedMatchesCount = 0;
    let missingDataCount = 0;
    let mismatchesCount = 0;
    let totalDistance = 0;
    let comparableTraitsCount = 0;

    const details: Record<string, TraitEvaluationDetail> = {};
    const mismatchReasons: TraitEvaluationDetail[] = [];

    for (const filter of filterEntries) {
      const trait = traitMap[filter.traitCode];
      const stats = sp.traitStats[filter.traitCode];
      if (!trait || !stats) continue;

      if (trait.kind === 'qualitative') {
        const userStates = filter.selectedStates || [];
        const userInputSummary = userStates.join(' или ');

        if (stats.n === 0 || stats.stateSet.length === 0) {
          const status = config.retainOnMissingData ? 'missing_data' : 'mismatch';
          if (status === 'missing_data') missingDataCount++;
          else mismatchesCount++;

          const detail: TraitEvaluationDetail = {
            traitCode: trait.code,
            status,
            userInputSummary,
            speciesRawSummary: '? (нет данных)',
            speciesExtrapolatedSummary: '? (нет данных)',
            rawMin: null,
            rawMax: null,
            extMin: null,
            extMax: null,
            normalizedDistance: 0.5,
          };
          details[trait.code] = detail;
          if (status === 'mismatch') mismatchReasons.push(detail);
          continue;
        }

        const spStatesSummary = stats.stateSet
          .map((s) => {
            const cnt = stats.stateCounts[s] || 0;
            return stats.stateSet.length > 1 ? `${s} (${cnt}/${stats.n})` : `${s}`;
          })
          .join(', ');

        const hasExactState = userStates.some((uState) => stats.stateSet.includes(uState));

        const hasRelaxedState =
          !hasExactState &&
          config.relaxQualitativeForTinyN &&
          stats.n <= 2 &&
          trait.discreteStates.length >= 3 &&
          userStates.some((uState) =>
            stats.stateSet.some((sState) => Math.abs(sState - uState) <= 1)
          );

        if (hasExactState) {
          exactMatchesCount++;
          comparableTraitsCount++;
          const bestCount = Math.max(...userStates.map((u) => stats.stateCounts[u] || 0));
          const freqRatio = bestCount / stats.n;
          const dist = (1 - freqRatio) * 0.25;
          totalDistance += dist;

          details[trait.code] = {
            traitCode: trait.code,
            status: 'exact_match',
            userInputSummary,
            speciesRawSummary: spStatesSummary,
            speciesExtrapolatedSummary: spStatesSummary,
            rawMin: stats.rawMin,
            rawMax: stats.rawMax,
            extMin: stats.rawMin,
            extMax: stats.rawMax,
            normalizedDistance: dist,
          };
        } else if (hasRelaxedState) {
          extrapolatedMatchesCount++;
          comparableTraitsCount++;
          totalDistance += 0.65;

          details[trait.code] = {
            traitCode: trait.code,
            status: 'extrapolated_match',
            userInputSummary,
            speciesRawSummary: spStatesSummary,
            speciesExtrapolatedSummary: `${spStatesSummary} (±1 при n=${stats.n})`,
            rawMin: stats.rawMin,
            rawMax: stats.rawMax,
            extMin: (stats.rawMin ?? 0) - 1,
            extMax: (stats.rawMax ?? 0) + 1,
            normalizedDistance: 0.65,
          };
        } else {
          mismatchesCount++;
          comparableTraitsCount++;
          totalDistance += 2.0;

          const detail: TraitEvaluationDetail = {
            traitCode: trait.code,
            status: 'mismatch',
            userInputSummary,
            speciesRawSummary: spStatesSummary,
            speciesExtrapolatedSummary: spStatesSummary,
            rawMin: stats.rawMin,
            rawMax: stats.rawMax,
            extMin: stats.rawMin,
            extMax: stats.rawMax,
            normalizedDistance: 2.0,
          };
          details[trait.code] = detail;
          mismatchReasons.push(detail);
        }
      } else {
        // Quantitative trait (meristic or morphometric), including hybrid A1ser (0=smooth, 100=many, or numeric range)
        const hasStates = Boolean(filter.selectedStates && filter.selectedStates.length > 0);
        const hasNumVal = filter.numericValue !== null && filter.numericValue !== undefined;
        const hasNumBounds =
          (filter.numericMin !== null && filter.numericMin !== undefined) ||
          (filter.numericMax !== null && filter.numericMax !== undefined);
        const hasNumeric = hasNumVal || hasNumBounds;

        const uMin = hasNumVal
          ? (filter.numericValue as number)
          : filter.numericMin ?? filter.numericMax ?? 0;
        const uMax = hasNumVal
          ? (filter.numericValue as number)
          : filter.numericMax ?? filter.numericMin ?? 0;

        const summaryParts: string[] = [];
        if (hasStates && filter.selectedStates) {
          summaryParts.push(
            filter.selectedStates
              .map((s) =>
                trait.code === 'A1ser' && s === 0
                  ? '0 (гладкая)'
                  : trait.code === 'A1ser' && s === 100
                  ? '100 (много)'
                  : String(s)
              )
              .join(' | ')
          );
        }
        if (hasNumeric) {
          summaryParts.push(
            uMin === uMax
              ? formatTraitNumber(uMin, trait.decimals)
              : `${formatTraitNumber(uMin, trait.decimals)}–${formatTraitNumber(uMax, trait.decimals)}`
          );
        }
        const userInputSummary = summaryParts.join(' или ');

        if (stats.n === 0 || stats.rawMin === null || stats.rawMax === null) {
          const status = config.retainOnMissingData ? 'missing_data' : 'mismatch';
          if (status === 'missing_data') missingDataCount++;
          else mismatchesCount++;

          const detail: TraitEvaluationDetail = {
            traitCode: trait.code,
            status,
            userInputSummary,
            speciesRawSummary: '? (нет данных)',
            speciesExtrapolatedSummary: '? (нет данных)',
            rawMin: null,
            rawMax: null,
            extMin: null,
            extMax: null,
            normalizedDistance: 0.5,
          };
          details[trait.code] = detail;
          if (status === 'mismatch') mismatchReasons.push(detail);
          continue;
        }

        const { extMin, extMax } = computeExtrapolatedRange(stats, trait, sp.group, config);
        const rMin = stats.rawMin;
        const rMax = stats.rawMax;
        const eMin = extMin ?? rMin;
        const eMax = extMax ?? rMax;

        const speciesRawSummary =
          trait.code === 'A1ser' && rMin === 100 && rMax === 100
            ? `100 (много, n=${stats.n})`
            : trait.code === 'A1ser' && rMin === 0 && rMax === 0
            ? `0 (гладкая, n=${stats.n})`
            : rMin === rMax
            ? `${formatTraitNumber(rMin, trait.decimals)} (n=${stats.n})`
            : `${formatTraitNumber(rMin, trait.decimals)}–${formatTraitNumber(rMax, trait.decimals)}`;

        const speciesExtrapolatedSummary =
          trait.code === 'A1ser' && eMin === 100 && eMax === 100
            ? '100 (много)'
            : trait.code === 'A1ser' && eMin === 0 && eMax === 0
            ? '0 (гладкая)'
            : eMin === eMax
            ? formatTraitNumber(eMin, trait.decimals)
            : `${formatTraitNumber(eMin, trait.decimals)}–${formatTraitNumber(eMax, trait.decimals)}`;

        const eps = trait.decimals > 0 ? 0.005 : 0.001;
        const matchesSelectedStates =
          hasStates &&
          Boolean(filter.selectedStates?.some((sVal) => stats.values.includes(sVal)));
        const overlapsRaw =
          matchesSelectedStates ||
          (hasNumeric && uMax >= rMin - eps && uMin <= rMax + eps);
        const overlapsExt =
          matchesSelectedStates ||
          (hasNumeric && uMax >= eMin - eps && uMin <= eMax + eps);

        const uMid = hasNumeric
          ? (uMin + uMax) / 2
          : filter.selectedStates?.[0] ?? (stats.mean ?? rMin);
        const scale = Math.max(stats.estimatedSd || trait.pooledSd || 1, 0.01);
        const zScoreFromMean = Math.abs(uMid - (stats.mean ?? rMin)) / scale;

        if (overlapsRaw) {
          exactMatchesCount++;
          comparableTraitsCount++;
          const normDist = Math.min(0.45, zScoreFromMean * 0.15);
          totalDistance += normDist;

          details[trait.code] = {
            traitCode: trait.code,
            status: 'exact_match',
            userInputSummary,
            speciesRawSummary,
            speciesExtrapolatedSummary,
            rawMin: rMin,
            rawMax: rMax,
            extMin: eMin,
            extMax: eMax,
            normalizedDistance: normDist,
          };
        } else if (overlapsExt) {
          extrapolatedMatchesCount++;
          comparableTraitsCount++;
          const distFromRaw = uMid < rMin ? (rMin - uMid) / scale : (uMid - rMax) / scale;
          const normDist = Math.min(0.95, 0.5 + distFromRaw * 0.2);
          totalDistance += normDist;

          details[trait.code] = {
            traitCode: trait.code,
            status: 'extrapolated_match',
            userInputSummary,
            speciesRawSummary,
            speciesExtrapolatedSummary,
            rawMin: rMin,
            rawMax: rMax,
            extMin: eMin,
            extMax: eMax,
            normalizedDistance: normDist,
          };
        } else {
          mismatchesCount++;
          comparableTraitsCount++;
          const distFromExt = uMid < eMin ? (eMin - uMid) / scale : (uMid - eMax) / scale;
          const normDist = 1.2 + Math.min(3.0, distFromExt);
          totalDistance += normDist;

          const detail: TraitEvaluationDetail = {
            traitCode: trait.code,
            status: 'mismatch',
            userInputSummary,
            speciesRawSummary,
            speciesExtrapolatedSummary,
            rawMin: rMin,
            rawMax: rMax,
            extMin: eMin,
            extMax: eMax,
            normalizedDistance: normDist,
          };
          details[trait.code] = detail;
          mismatchReasons.push(detail);
        }
      }
    }

    const totalActive = filterEntries.length;
    const isCandidate = mismatchesCount === 0;
    const isStrictRawCandidate = mismatchesCount === 0 && extrapolatedMatchesCount === 0;
    const centroidDistance =
      comparableTraitsCount > 0 ? totalDistance / comparableTraitsCount : 0;

    let compatibilityScore = 100;
    if (totalActive > 0) {
      const matchWeighted =
        exactMatchesCount * 1.0 +
        extrapolatedMatchesCount * 0.82 +
        missingDataCount * 0.7;
      compatibilityScore = Math.max(
        0,
        Math.min(100, Math.round((matchWeighted / totalActive) * 100 - mismatchesCount * 22))
      );
    }

    evaluations.push({
      species: sp,
      isCandidate,
      isStrictRawCandidate,
      exactMatchesCount,
      extrapolatedMatchesCount,
      missingDataCount,
      mismatchesCount,
      compatibilityScore,
      centroidDistance,
      details,
      mismatchReasons,
    });
  }

  evaluations.sort((a, b) => {
    if (a.isCandidate !== b.isCandidate) {
      return a.isCandidate ? -1 : 1;
    }
    if (a.mismatchesCount !== b.mismatchesCount) {
      return a.mismatchesCount - b.mismatchesCount;
    }
    if (Math.abs(a.centroidDistance - b.centroidDistance) > 0.05) {
      return a.centroidDistance - b.centroidDistance;
    }
    return a.species.sp.localeCompare(b.species.sp);
  });

  return evaluations;
}

/**
 * Computes Lucid-style Separating Power (0..100) for each trait among the currently remaining candidate species.
 */
export function computeTraitSeparatingPower(
  remainingSpecies: SpeciesProfile[],
  traits: TraitDefinition[],
  config: KeyConfig
): Record<string, number> {
  const result: Record<string, number> = {};
  const k = remainingSpecies.length;

  if (k <= 1) {
    for (const t of traits) result[t.code] = 0;
    return result;
  }

  const totalPairs = (k * (k - 1)) / 2;

  for (const trait of traits) {
    let separatedPairs = 0;
    let validSpeciesCount = 0;

    for (const sp of remainingSpecies) {
      if (sp.traitStats[trait.code]?.n > 0) validSpeciesCount++;
    }

    if (validSpeciesCount < 2) {
      result[trait.code] = 0;
      continue;
    }

    if (trait.kind === 'qualitative') {
      for (let i = 0; i < k; i++) {
        const sA = remainingSpecies[i].traitStats[trait.code];
        if (!sA || sA.n === 0) continue;
        for (let j = i + 1; j < k; j++) {
          const sB = remainingSpecies[j]?.traitStats[trait.code];
          if (!sB || sB.n === 0) continue;

          const overlap = sA.stateSet.some((st) => sB.stateSet.includes(st));
          if (!overlap) {
            separatedPairs += 1.0;
          } else if (
            sA.stateSet.length !== sB.stateSet.length ||
            !sA.stateSet.every((st) => sB.stateSet.includes(st))
          ) {
            separatedPairs += 0.4;
          }
        }
      }
    } else {
      const ranges = remainingSpecies.map((sp) => {
        const st = sp.traitStats[trait.code];
        const { extMin, extMax } = computeExtrapolatedRange(st, trait, sp.group, config);
        return {
          n: st.n,
          rawMin: st.rawMin,
          rawMax: st.rawMax,
          extMin,
          extMax,
        };
      });

      for (let i = 0; i < k; i++) {
        const rA = ranges[i];
        if (rA.n === 0 || rA.extMin === null || rA.extMax === null) continue;
        for (let j = i + 1; j < k; j++) {
          const rB = ranges[j];
          if (rB.n === 0 || rB.extMin === null || rB.extMax === null) continue;

          if (rA.extMax < rB.extMin || rB.extMax < rA.extMin) {
            separatedPairs += 1.0;
          } else if (
            rA.rawMax !== null &&
            rB.rawMin !== null &&
            rB.rawMax !== null &&
            rA.rawMin !== null
          ) {
            if (rA.rawMax < rB.rawMin || rB.rawMax < rA.rawMin) {
              separatedPairs += 0.75;
            } else {
              const unionSpan = Math.max(rA.rawMax, rB.rawMax) - Math.min(rA.rawMin, rB.rawMin);
              const overlapSpan = Math.max(
                0,
                Math.min(rA.rawMax, rB.rawMax) - Math.max(rA.rawMin, rB.rawMin)
              );
              if (unionSpan > 0) {
                const nonOverlapRatio = (unionSpan - overlapSpan) / unionSpan;
                if (nonOverlapRatio > 0.15) {
                  separatedPairs += nonOverlapRatio * 0.5;
                }
              }
            }
          }
        }
      }
    }

    const coverageFactor = validSpeciesCount / k;
    const rawScore = (separatedPairs / totalPairs) * coverageFactor * 100;
    result[trait.code] =
      separatedPairs > 0 ? Math.max(1, Math.min(100, Math.round(rawScore))) : 0;
  }

  return result;
}

const EXTRA_SPECIMENS_STORAGE_KEY = 'eucyclops_extra_specimens_v1';

export function loadExtraSpecimens(): SpecimenRecord[] {
  try {
    const raw = localStorage.getItem(EXTRA_SPECIMENS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((sp: SpecimenRecord) => ({
        ...sp,
        sp: normalizeSpeciesName(sp.sp),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export function saveExtraSpecimens(specimens: SpecimenRecord[]): void {
  try {
    localStorage.setItem(EXTRA_SPECIMENS_STORAGE_KEY, JSON.stringify(specimens));
  } catch {
    // ignore storage quota errors
  }
}

