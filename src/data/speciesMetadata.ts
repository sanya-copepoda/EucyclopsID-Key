import { SpeciesMedia } from '../types/taxonomy';

export interface SpeciesTaxonomicMeta {
  sp: string;
  /** Author and year of description, e.g. "Alekseev, 1990" or "(Fischer, 1851)" */
  authority?: string;
  /** Taxonomic note / synonymy from the author's reference list, e.g. "=E. arcanus arcticus" or "Form A sensu Alekseev et al., 2006" */
  taxonomicNote?: string;
}

/**
 * Official authority and taxonomic notes for valid and reference species of Eucyclops
 * provided by Aleksandr A. Novikov.
 */
export const SPECIES_TAXONOMIC_METADATA: Record<string, SpeciesTaxonomicMeta> = {
  'E. arcanus': {
    sp: 'E. arcanus',
    authority: 'Alekseev, 1990',
  },
  'E. arcticus': {
    sp: 'E. arcticus',
    authority: 'Alekseev, 2022',
    taxonomicNote: '=E. arcanus arcticus',
  },
  'E. delongi': {
    sp: 'E. delongi',
    authority: 'Alekseev, Abramova & Chaban, 2019',
  },
  'E. baicalocorrepus': {
    sp: 'E. baicalocorrepus',
    authority: 'Mazepova, 1955',
    taxonomicNote: '=E. serrulatus baicalocorrepus, E. macrurus baicalocorrepus',
  },
  'E. chilensis': {
    sp: 'E. chilensis',
    authority: 'Löffler, 1961',
  },
  'E. denticulatus': {
    sp: 'E. denticulatus',
    authority: '(Graeter, 1903)',
  },
  'E. macruroides': {
    sp: 'E. macruroides',
    authority: '(Lilljeborg, 1901)',
  },
  'E. elegans': {
    sp: 'E. elegans',
    authority: '(Herrick, 1884)',
  },
  'E. macrurus': {
    sp: 'E. macrurus',
    authority: '(Sars, 1863)',
  },
  'E. roseus': {
    sp: 'E. roseus',
    authority: 'Ishida, 1997',
    taxonomicNote: '=E. agiloides roseus sensu Alekseev',
  },
  'E. serrulatus': {
    sp: 'E. serrulatus',
    authority: '(Fischer, 1851)',
    taxonomicNote: 'Form A sensu Alekseev et al., 2006',
  },
  'E. sibiricus': {
    sp: 'E. sibiricus',
    authority: 'Novikov, Sharafutdinova, Abramova, Mayor & Chertoprud, 2025',
  },
  'E. speratus': {
    sp: 'E. speratus',
    authority: '(Lilljeborg, 1901)',
  },
  'E. paraserrulatus': {
    sp: 'E. paraserrulatus',
    taxonomicNote: 'Form B sensu Alekseev et al., 2006',
  },
};

export function getSpeciesTaxonomicMeta(sp: string): SpeciesTaxonomicMeta | undefined {
  return SPECIES_TAXONOMIC_METADATA[sp.trim()];
}

const SPECIES_MEDIA_STORAGE_KEY = 'eucyclops_species_media_v1';

/**
 * Built-in repository photographs of female (♀) and male (♂) habitus
 * stored in public/assets/aistudio/ (compressed for web & GitHub repository).
 */
export const BUILTIN_SPECIES_MEDIA: Record<string, SpeciesMedia> = {
  'E. arcanus': {
    sp: 'E. arcanus',
    femaleImageUrl: 'assets/aistudio/arcanus_F_9711fdc3.jpg',
  },
  'E. caridinus': {
    sp: 'E. caridinus',
    femaleImageUrl: 'assets/aistudio/cardinus_F_5ac34301.png',
  },
  'E. chilensis': {
    sp: 'E. chilensis',
    femaleImageUrl: 'assets/aistudio/chilensis_F_65d42e9c.png',
  },
  'E. sibiricus': {
    sp: 'E. sibiricus',
    femaleImageUrl: 'assets/aistudio/sibiricus_F_123be230.jpg',
    maleImageUrl: 'assets/aistudio/sibiricus_M_400f2760.jpg',
  },
  'E. speratus': {
    sp: 'E. speratus',
    femaleImageUrl: 'assets/aistudio/speratus_F_19dcc1f4.jpg',
  },
};

export function loadSpeciesMediaMap(): Record<string, SpeciesMedia> {
  const merged: Record<string, SpeciesMedia> = { ...BUILTIN_SPECIES_MEDIA };
  try {
    const raw = localStorage.getItem(SPECIES_MEDIA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [sp, media] of Object.entries(parsed as Record<string, SpeciesMedia>)) {
          const builtin = BUILTIN_SPECIES_MEDIA[sp];
          merged[sp] = {
            sp,
            femaleImageUrl: media.femaleImageUrl || builtin?.femaleImageUrl,
            femaleCaption: media.femaleCaption || builtin?.femaleCaption,
            maleImageUrl: media.maleImageUrl || builtin?.maleImageUrl,
            maleCaption: media.maleCaption || builtin?.maleCaption,
            photoSource: media.photoSource || builtin?.photoSource,
          };
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return merged;
}

export function saveSpeciesMediaMap(mediaMap: Record<string, SpeciesMedia>): void {
  try {
    localStorage.setItem(SPECIES_MEDIA_STORAGE_KEY, JSON.stringify(mediaMap));
  } catch (err) {
    console.error('Failed to save species media to localStorage:', err);
  }
}

/**
 * Converts a species name (e.g. "E. arcanus", "E. sp. 1") into a clean file slug ("arcanus", "sp_1").
 */
export function getSpeciesFileSlug(sp: string): string {
  return sp
    .replace(/^E\.\s*/i, '')
    .replace(/^Eucyclops\s+/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Converts a trait code (e.g. "P4N2/N3", "GS_m pore", "cr/cs") into a clean file slug ("P4N2_N3", "GS_m_pore", "cr_cs").
 */
export function getTraitFileSlug(traitCode: string): string {
  return traitCode.trim().replace(/[/\s]+/g, '_');
}

const EPITHET_FILENAME_ALIASES: Record<string, string[]> = {
  caridinus: ['cardinus'],
};

/**
 * Automatically guesses which species and sex (female / male) an image filename corresponds to.
 * Examples:
 * - "arcanus_f.jpg", "E. arcanus female.tif", "arcanus_самка.png" -> { sp: "E. arcanus", sex: "female" }
 * - "sibiricus_m.jpg", "E. sibiricus male.png", "sibiricus_самец.jpg" -> { sp: "E. sibiricus", sex: "male" }
 */
export function matchSpeciesAndSexFromFilename(
  filename: string,
  allSpeciesNames: string[]
): { sp: string | null; sex: 'female' | 'male' } {
  const baseName = filename.replace(/\.[^.]+$/, '').trim();
  const lower = baseName.toLowerCase();

  // Detect sex from tokens
  let sex: 'female' | 'male' = 'female';
  if (
    /(?:^|[\s_\-.])(male|m|самец|сам|mal|♂)(?:$|[\s_\-.])/i.test(lower) ||
    lower.endsWith('_m') ||
    lower.endsWith('-m')
  ) {
    sex = 'male';
  } else if (
    /(?:^|[\s_\-.])(female|f|самка|самк|fem|♀)(?:$|[\s_\-.])/i.test(lower) ||
    lower.endsWith('_f') ||
    lower.endsWith('-f')
  ) {
    sex = 'female';
  }

  // Sort species names by length descending so longer specific epithets match first (e.g. "macruroides" before "macrurus", "paraserrulatus" before "serrulatus")
  const sortedSpecies = [...allSpeciesNames]
    .filter((s) => s !== '?')
    .sort((a, b) => b.length - a.length);

  const normalizedFile = lower.replace(/[^a-z0-9а-яё]+/gi, '');

  for (const sp of sortedSpecies) {
    const epithet = sp
      .replace(/^E\.\s*/i, '')
      .trim()
      .toLowerCase();
    const cleanEpithet = epithet.replace(/[^a-z0-9а-яё]+/gi, '');
    if (cleanEpithet && normalizedFile.includes(cleanEpithet)) {
      return { sp, sex };
    }
    const aliases = EPITHET_FILENAME_ALIASES[cleanEpithet];
    if (aliases && aliases.some((al) => normalizedFile.includes(al))) {
      return { sp, sex };
    }
  }

  return { sp: null, sex };
}

/**
 * Explicit mapping for author's figure filenames that cover multiple traits or use alternative names.
 */
const AUTHOR_TRAIT_FILENAME_ALIASES: Record<string, string[]> = {
  a2coxobasis: ['A2g1', 'A2g2', 'A2g3', 'A2g8', 'A2g9'],
  metric: [
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
  ],
  'p1-p3enp1-2os': ['P1X1os', 'P1X2os', 'P2X1os', 'P2X2os', 'P3X1os', 'P3X2os'],
  'p1_p3enp1_2os': ['P1X1os', 'P1X2os', 'P2X1os', 'P2X2os', 'P3X1os', 'P3X2os'],
  'p1-p3exp1-2os': ['P1X1os', 'P1X2os', 'P2X1os', 'P2X2os', 'P3X1os', 'P3X2os'],
  a2ser: ['A1ser'],
  'a1 ser': ['A1ser'],
  a1_ser: ['A1ser'],
  a1ser: ['A1ser'],
  p4n2n3: ['P4N2/N3'],
  p4n2_n3: ['P4N2/N3'],
  p4x3as2: ['P4X3_as2'],
  p4x3_as2: ['P4X3_as2'],
  crdp: ['CRdp'],
  crser: ['Crser'],
  cros_os: ['CRoS_os'],
  cros_is: ['CRoS_is'],
  cros_osn: ['CRoS_osn'],
  cros_isn: ['CRoS_isn'],
  cris_oset: ['CRIS_oset'],
  cris_iset: ['CRIS_iset'],
  p4_cs_osp3: ['P4_CS_osp3'],
  p4_cs_osp2: ['P4_CS_osp2'],
  'gs_m pore': ['GS_m pore'],
  gs_m_pore: ['GS_m pore'],
  proct: ['Proct', 'Proct2'],
};

/**
 * Automatically matches an image filename to one or more trait codes.
 * E.g. "A2Coxobasis.png" -> ["A2g1", "A2g2", "A2g3", "A2g8", "A2g9"],
 * "P1-P3ENp1-2os.png" -> ["P1X1os", "P1X2os", "P2X1os", "P2X2os", "P3X1os", "P3X2os"],
 * "A2ser.png" -> ["A1ser"], "P4N2N3.png" -> ["P4N2/N3"].
 */
export function matchTraitsFromFilename(
  filename: string,
  allTraitCodes: string[]
): string[] {
  const baseName = filename.replace(/\.[^.]+$/, '').trim();
  // Also strip trailing 8-char AI Studio hash if present (e.g. "A2N1g_5c0fbba3" -> "A2N1g")
  const strippedHashBase = baseName.replace(/_[0-9a-f]{8}$/i, '').trim();

  for (const candidate of [strippedHashBase, baseName]) {
    const lowerCand = candidate.toLowerCase();
    if (AUTHOR_TRAIT_FILENAME_ALIASES[lowerCand]) {
      return AUTHOR_TRAIT_FILENAME_ALIASES[lowerCand];
    }
    const cleanAlphaNum = lowerCand.replace(/[\s_-]+/g, '');
    for (const [aliasKey, mappedTraits] of Object.entries(AUTHOR_TRAIT_FILENAME_ALIASES)) {
      if (aliasKey.replace(/[\s_-]+/g, '') === cleanAlphaNum) {
        return mappedTraits;
      }
    }
  }

  const lowerBase = strippedHashBase.toLowerCase();

  // 1. Check exact match with code or slug
  for (const code of allTraitCodes) {
    const slug = getTraitFileSlug(code).toLowerCase();
    if (
      lowerBase === code.toLowerCase() ||
      lowerBase === slug ||
      lowerBase.replace(/[\s_/-]+/g, '') === code.toLowerCase().replace(/[\s_/-]+/g, '')
    ) {
      return [code];
    }
  }

  // 2. Check if filename starts with or contains multiple trait codes separated by delimiters
  const matched: string[] = [];
  const sortedCodes = [...allTraitCodes].sort((a, b) => b.length - a.length);
  for (const code of sortedCodes) {
    const slug = getTraitFileSlug(code).toLowerCase();
    const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s_\\-.,;+])(${escapedSlug})(?:$|[\\s_\\-.,;+])`, 'i');
    if (regex.test(lowerBase)) {
      matched.push(code);
    }
  }

  return matched;
}
