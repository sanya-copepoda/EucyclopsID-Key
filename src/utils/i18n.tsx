import React, { createContext, useContext, useState } from 'react';
import { AnatomicalSection } from '../types/taxonomy';

export type Language = 'en' | 'ru';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

const STORAGE_LANG_KEY = 'eucyclops_ui_lang_v1';

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved === 'en' || saved === 'ru') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, next);
    } catch {
      // ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'ru' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

export function getAnatomicalSectionLabel(
  section: AnatomicalSection,
  lang: Language
): string {
  if (lang === 'en') {
    const mapEn: Record<AnatomicalSection, string> = {
      A2: 'A2 (A2g1 – A2N1g2)',
      A1_Mx1: 'A1, Mx1 (A1ser, Mx1Bsr)',
      P1_P3: 'P1 – P3 (P2X3_bsp – P3X2os)',
      P4: 'P4 (P4X1os – P4X3_isd)',
      Somites: 'GS, Proct, AnS (GS_m pore – AnS_dsp)',
      CR_Setae: 'CR, sIV, sV (CRdp – Crser)',
      Ratios: 'Morphometric Indices (xa/x – x/n)',
    };
    return mapEn[section];
  }
  const mapRu: Record<AnatomicalSection, string> = {
    A2: 'A2 (A2g1 – A2N1g2)',
    A1_Mx1: 'A1, Mx1 (A1ser, Mx1Bsr)',
    P1_P3: 'P1 – P3 (P2X3_bsp – P3X2os)',
    P4: 'P4 (P4X1os – P4X3_isd)',
    Somites: 'GS, Proct, AnS (GS_m pore – AnS_dsp)',
    CR_Setae: 'CR, sIV, sV (CRdp – Crser)',
    Ratios: 'Индексы (xa/x – x/n)',
  };
  return mapRu[section];
}

const REGION_EN_MAP: Record<string, string> = {
  'Удмуртия': 'Udmurtia',
  'Дельта Лены': 'Lena River Delta',
  'Якутия': 'Yakutia',
  'Татарстан': 'Tatarstan',
  'Байкал': 'Lake Baikal',
  'Алтай': 'Altai',
  'Карелия': 'Karelia',
  'Мурманская обл.': 'Murmansk Oblast',
  'Архангельская обл.': 'Arkhangelsk Oblast',
  'Красноярский край': 'Krasnoyarsk Krai',
  'Таймыр': 'Taimyr Peninsula',
  'Чукотка': 'Chukotka',
  'Камчатка': 'Kamchatka',
  'Сахалин': 'Sakhalin',
  'Курилы': 'Kuril Islands',
  'Приморье': 'Primorsky Krai',
  'Хабаровский край': 'Khabarovsk Krai',
  'Магаданская обл.': 'Magadan Oblast',
  'Дагестан': 'Dagestan',
  'Кавказ': 'Caucasus',
  'Крым': 'Crimea',
  'Казахстан': 'Kazakhstan',
  'Монголия': 'Mongolia',
  'Ямал': 'Yamal Peninsula',
  'ХМАО': 'Khanty-Mansi AO',
  'Пермский край': 'Perm Krai',
  'Башкортостан': 'Bashkortostan',
  'Самарская обл.': 'Samara Oblast',
  'Ленинградская обл.': 'Leningrad Oblast',
  'Московская обл.': 'Moscow Oblast',
  'Тверская обл.': 'Tver Oblast',
  'Вологодская обл.': 'Vologda Oblast',
  'Коми': 'Komi Republic',
  'Бурятия': 'Buryatia',
  'Иркутская обл.': 'Irkutsk Oblast',
  'Забайкалье': 'Transbaikalia',
  'Тыва': 'Tuva',
  'Хакасия': 'Khakassia',
  'Томская обл.': 'Tomsk Oblast',
  'Новосибирская обл.': 'Novosibirsk Oblast',
  'Челябинская обл.': 'Chelyabinsk Oblast',
  'Свердловская обл.': 'Sverdlovsk Oblast',
  'Оренбургская обл.': 'Orenburg Oblast',
  'Астраханская обл.': 'Astrakhan Oblast',
  'Волгоградская обл.': 'Volgograd Oblast',
  'Ростовская обл.': 'Rostov Oblast',
  'Краснодарский край': 'Krasnodar Krai',
  'Карачаево-Черкесия': 'Karachay-Cherkessia',
  'Кабардино-Балкария': 'Kabardino-Balkaria',
  'Северная Осетия': 'North Ossetia',
  'Абхазия': 'Abkhazia',
  'Грузия': 'Georgia',
  'Армения': 'Armenia',
  'Азербайджан': 'Azerbaijan',
  'Турция': 'Turkey',
  'Иран': 'Iran',
  'Узбекистан': 'Uzbekistan',
  'Кыргызстан': 'Kyrgyzstan',
  'Таджикистан': 'Tajikistan',
  'Беларусь': 'Belarus',
  'Польша': 'Poland',
  'Норвегия': 'Norway',
  'Финляндия': 'Finland',
  'Швеция': 'Sweden',
};

export function translateRegion(raw: string, lang: Language): string {
  if (lang === 'ru' || !raw) return raw;
  const trimmed = raw.trim();
  if (REGION_EN_MAP[trimmed]) return REGION_EN_MAP[trimmed];
  return trimmed;
}
