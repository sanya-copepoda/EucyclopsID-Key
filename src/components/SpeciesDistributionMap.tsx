import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import { SpeciesProfile, SpecimenRecord } from '../types/taxonomy';
import { formatTraitNumber } from '../utils/matrixEngine';
import { translateRegion, useLanguage } from '../utils/i18n';

interface SpeciesDistributionMapProps {
  species: SpeciesProfile;
  allSpecies?: SpeciesProfile[];
  selectedSpecimenNum?: number | null;
  onSelectSpecimen?: (specimen: SpecimenRecord | null) => void;
  onLoadSpecimenIntoKey?: (specimen: SpecimenRecord, mode: 'all' | 'diagnostic8') => void;
}

const TILE_URLS: Record<
  'terrain' | 'hybrid' | 'roadmap',
  { url: string; attribution: string }
> = {
  roadmap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap &middot; OpenTopoMap',
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
  },
};

export const SpeciesDistributionMap: React.FC<SpeciesDistributionMapProps> = ({
  species,
  allSpecies = [],
  selectedSpecimenNum,
  onSelectSpecimen,
  onLoadSpecimenIntoKey,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const [mapScope, setMapScope] = useState<'species' | 'group' | 'all'>('species');
  const [mapTypeId, setMapTypeId] = useState<'terrain' | 'hybrid' | 'roadmap'>('roadmap');
  const [activeSpecimen, setActiveSpecimen] = useState<SpecimenRecord | null>(null);
  const [fitTrigger, setFitTrigger] = useState<number>(0);

  // Refs for multi-marker Leaflet map (OpenStreetMap)
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletTileRef = useRef<L.TileLayer | null>(null);
  const leafletMarkersRef = useRef<L.LayerGroup | null>(null);

  // Sync external specimen selection from table
  useEffect(() => {
    if (selectedSpecimenNum !== undefined && selectedSpecimenNum !== null) {
      const found = species.specimens.find((s) => s.num === selectedSpecimenNum);
      if (found && found.lat !== null && found.lon !== null) {
        setActiveSpecimen(found);
      }
    }
  }, [selectedSpecimenNum, species.specimens]);

  // Reset active specimen when species changes
  useEffect(() => {
    setActiveSpecimen(null);
  }, [species.sp]);

  const primaryGeocodedSpecimens = useMemo(() => {
    return species.specimens.filter(
      (s): s is SpecimenRecord & { lat: number; lon: number } =>
        s.lat !== null &&
        s.lon !== null &&
        Number.isFinite(s.lat) &&
        Number.isFinite(s.lon)
    );
  }, [species.specimens]);

  const backgroundSpecimens = useMemo(() => {
    if (mapScope === 'species' || allSpecies.length === 0) return [];
    const list: (SpecimenRecord & { lat: number; lon: number })[] = [];
    for (const sp of allSpecies) {
      if (sp.sp === species.sp || sp.sp === '?') continue;
      if (mapScope === 'group' && sp.group !== species.group) continue;
      for (const spec of sp.specimens) {
        if (
          spec.lat !== null &&
          spec.lon !== null &&
          Number.isFinite(spec.lat) &&
          Number.isFinite(spec.lon)
        ) {
          list.push(spec as SpecimenRecord & { lat: number; lon: number });
        }
      }
    }
    return list;
  }, [mapScope, allSpecies, species.sp, species.group]);

  // When several specimens share identical coordinates (e.g. Lena Delta 73.3829, 126.5938),
  // apply a tiny deterministic spiral offset so every single specimen marker is visible & clickable!
  const displaySpecimensWithOffsets = useMemo(() => {
    const coordCounts: Record<string, number> = {};
    return primaryGeocodedSpecimens.map((spec) => {
      const key = `${spec.lat.toFixed(4)}_${spec.lon.toFixed(4)}`;
      const idx = coordCounts[key] || 0;
      coordCounts[key] = idx + 1;
      if (idx === 0) {
        return { spec, displayLat: spec.lat, displayLon: spec.lon };
      }
      const angle = idx * 1.15;
      const radius = 0.012 * Math.sqrt(idx);
      return {
        spec,
        displayLat: spec.lat + radius * Math.cos(angle),
        displayLon: spec.lon + radius * Math.sin(angle) * 1.5,
      };
    });
  }, [primaryGeocodedSpecimens]);

  const pointsForBounds = useMemo(() => {
    const combined =
      mapScope === 'species'
        ? primaryGeocodedSpecimens
        : [...primaryGeocodedSpecimens, ...backgroundSpecimens];
    return combined.map((s) => ({ lat: s.lat, lng: s.lon }));
  }, [mapScope, primaryGeocodedSpecimens, backgroundSpecimens]);

  const defaultCenter = useMemo(() => {
    if (primaryGeocodedSpecimens.length > 0) {
      const sumLat = primaryGeocodedSpecimens.reduce((acc, s) => acc + s.lat, 0);
      const sumLon = primaryGeocodedSpecimens.reduce((acc, s) => acc + s.lon, 0);
      return {
        lat: sumLat / primaryGeocodedSpecimens.length,
        lng: sumLon / primaryGeocodedSpecimens.length,
      };
    }
    return { lat: 58.0, lng: 65.0 };
  }, [primaryGeocodedSpecimens]);

  const focusedPoint = useMemo(() => {
    if (
      activeSpecimen &&
      activeSpecimen.lat !== null &&
      activeSpecimen.lon !== null
    ) {
      const found = displaySpecimensWithOffsets.find(
        (d) => d.spec.num === activeSpecimen.num
      );
      if (found) {
        return { lat: found.displayLat, lng: found.displayLon };
      }
      return { lat: activeSpecimen.lat, lng: activeSpecimen.lon };
    }
    return null;
  }, [activeSpecimen, displaySpecimensWithOffsets]);

  // Initialize & update multi-marker Leaflet map
  useEffect(() => {
    if (!leafletContainerRef.current) return;
    if (primaryGeocodedSpecimens.length === 0 && backgroundSpecimens.length === 0) return;

    if (!leafletMapRef.current) {
      const map = L.map(leafletContainerRef.current, {
        center: [defaultCenter.lat, defaultCenter.lng],
        zoom: 4,
        scrollWheelZoom: true,
      });
      const tileCfg = TILE_URLS[mapTypeId];
      leafletTileRef.current = L.tileLayer(tileCfg.url, {
        attribution: tileCfg.attribution,
        maxZoom: 18,
      }).addTo(map);
      leafletMarkersRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        leafletTileRef.current = null;
        leafletMarkersRef.current = null;
      }
    };
  }, [species.sp, primaryGeocodedSpecimens.length, backgroundSpecimens.length]);

  // Update tile layer when mapTypeId changes in Leaflet
  useEffect(() => {
    if (!leafletMapRef.current) return;
    if (leafletTileRef.current) {
      leafletTileRef.current.remove();
    }
    const tileCfg = TILE_URLS[mapTypeId];
    leafletTileRef.current = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: 18,
    }).addTo(leafletMapRef.current);
  }, [mapTypeId]);

  // Render ALL markers simultaneously in Leaflet
  useEffect(() => {
    if (!leafletMapRef.current || !leafletMarkersRef.current) return;
    const group = leafletMarkersRef.current;
    group.clearLayers();

    // 1. Background specimens (other species in group or database)
    for (const bg of backgroundSpecimens) {
      const isSelected = activeSpecimen?.num === bg.num;
      const icon = L.divIcon({
        className: 'custom-specimen-pin',
        html: `<div style="
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: ${isSelected ? '#0284c7' : '#94a3b8'};
          border: 2px solid #334155;
          color: #fff;
          font-family: ui-monospace, monospace;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        ">${bg.num}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([bg.lat, bg.lon], {
        icon,
        zIndexOffset: isSelected ? 900 : 100,
      });
      marker.bindTooltip(
        `#${bg.num} <i>${bg.sp}</i> — ${translateRegion(bg.region, lang)}${
          bg.waterbody ? `, ${bg.waterbody}` : ''
        }`,
        { direction: 'top', offset: [0, -8] }
      );
      marker.on('click', () => {
        setActiveSpecimen(bg);
        onSelectSpecimen?.(bg);
      });
      marker.addTo(group);
    }

    // 2. All specimens of the primary species (with spiral micro-offsets for identical coordinates)
    for (const { spec, displayLat, displayLon } of displaySpecimensWithOffsets) {
      const isSelected = activeSpecimen?.num === spec.num;
      const size = isSelected ? 30 : 25;
      const icon = L.divIcon({
        className: 'custom-specimen-pin-primary',
        html: `<div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 9999px;
          background: ${isSelected ? '#0284c7' : '#e11d48'};
          border: 2.5px solid ${isSelected ? '#0f172a' : '#ffffff'};
          color: #ffffff;
          font-family: ui-monospace, monospace;
          font-size: ${isSelected ? '11px' : '10px'};
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(15,23,42,0.45);
          cursor: pointer;
        ">#${spec.num}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([displayLat, displayLon], {
        icon,
        zIndexOffset: isSelected ? 1000 : 500,
      });
      marker.bindTooltip(
        `<b>#${spec.num}</b> <i>${spec.sp}</i> — ${translateRegion(spec.region, lang)}${
          spec.waterbody ? ` (${spec.waterbody})` : ''
        }`,
        { direction: 'top', offset: [0, -10] }
      );
      marker.on('click', () => {
        setActiveSpecimen(spec);
        onSelectSpecimen?.(spec);
      });
      marker.addTo(group);
    }
  }, [
    displaySpecimensWithOffsets,
    backgroundSpecimens,
    activeSpecimen,
    lang,
    onSelectSpecimen,
  ]);

  // Fit bounds to all points when species/scope/fitTrigger changes in Leaflet
  useEffect(() => {
    if (!leafletMapRef.current || pointsForBounds.length === 0) return;
    const map = leafletMapRef.current;
    if (pointsForBounds.length === 1) {
      map.setView([pointsForBounds[0].lat, pointsForBounds[0].lng], 7);
      return;
    }
    const latLngs = pointsForBounds.map((p) => [p.lat, p.lng] as [number, number]);
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [38, 38], maxZoom: 10 });
  }, [pointsForBounds, fitTrigger]);

  // Pan to focused specimen in Leaflet when clicked
  useEffect(() => {
    if (!leafletMapRef.current || !focusedPoint) return;
    const map = leafletMapRef.current;
    map.panTo([focusedPoint.lat, focusedPoint.lng], { animate: true });
  }, [focusedPoint]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Map Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-sky-700" />
            {isEn ? (
              <>
                Sampling Localities Map for <em className="italic">{species.sp}</em> (OpenStreetMap)
              </>
            ) : (
              <>
                Карта мест сбора <em className="italic">{species.sp}</em> (OpenStreetMap)
              </>
            )}
          </span>
          <span className="rounded-md bg-sky-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-900">
            {isEn
              ? `${primaryGeocodedSpecimens.length} of ${species.specimenCount} spec. geocoded`
              : `${primaryGeocodedSpecimens.length} из ${species.specimenCount} экз. с координатами`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Layer selector: only this species vs group vs all */}
          {allSpecies.length > 1 && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-200/75 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setMapScope('species')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  mapScope === 'species'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isEn
                  ? `Only ${species.sp} (${primaryGeocodedSpecimens.length})`
                  : `Только ${species.sp} (${primaryGeocodedSpecimens.length})`}
              </button>
              <button
                type="button"
                onClick={() => setMapScope('group')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  mapScope === 'group'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isEn ? `+ Group ${species.group}` : `+ Группа ${species.group}`}
              </button>
              <button
                type="button"
                onClick={() => setMapScope('all')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  mapScope === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isEn ? '+ All Species' : '+ Все виды базы'}
              </button>
            </div>
          )}

          {/* Map Type selector */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/75 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setMapTypeId('roadmap')}
              className={`rounded-md px-2 py-1 font-medium transition-colors cursor-pointer ${
                mapTypeId === 'roadmap'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? 'Map' : 'Схема'}
            </button>
            <button
              type="button"
              onClick={() => setMapTypeId('terrain')}
              className={`rounded-md px-2 py-1 font-medium transition-colors cursor-pointer ${
                mapTypeId === 'terrain'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? 'Terrain' : 'Рельеф'}
            </button>
            <button
              type="button"
              onClick={() => setMapTypeId('hybrid')}
              className={`rounded-md px-2 py-1 font-medium transition-colors cursor-pointer ${
                mapTypeId === 'hybrid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? 'Satellite' : 'Спутник'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveSpecimen(null);
              setFitTrigger((n) => n + 1);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title={
              isEn
                ? 'Fit all specimen localities in view'
                : 'Показать все точки в пределах видимости'
            }
          >
            <Navigation className="h-3 w-3 text-sky-700" />
            {isEn ? 'Fit all points' : 'Вписать все точки'}
          </button>
        </div>
      </div>

      {/* Specimen chips bar above map so all specimens can be seen & clicked */}
      {primaryGeocodedSpecimens.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2">
          <span className="text-[11px] font-medium text-slate-500 mr-1">
            {isEn ? 'Specimen points:' : 'Точки особей:'}
          </span>
          {primaryGeocodedSpecimens.map((spec) => {
            const isSel = activeSpecimen?.num === spec.num;
            return (
              <button
                key={spec.num}
                type="button"
                onClick={() => {
                  setActiveSpecimen(spec);
                  onSelectSpecimen?.(spec);
                }}
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] transition-colors cursor-pointer ${
                  isSel
                    ? 'bg-sky-700 text-white font-semibold shadow-2xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-sky-50 hover:border-sky-300'
                }`}
              >
                #{spec.num} ({translateRegion(spec.region, lang)})
              </button>
            );
          })}
        </div>
      )}

      {/* Map Canvas Container */}
      {primaryGeocodedSpecimens.length === 0 && backgroundSpecimens.length === 0 ? (
        <div className="flex h-60 items-center justify-center bg-slate-50 p-6 text-center text-xs text-slate-500">
          {isEn ? (
            <>
              No geographical coordinates (N / E) are recorded in the table for specimens of{' '}
              <strong className="mx-1 italic">{species.sp}</strong>.
            </>
          ) : (
            <>
              У особей вида <strong className="mx-1 italic">{species.sp}</strong> в таблице не указаны географические координаты (N / E).
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left 8 cols: Multi-marker Leaflet Map showing ALL specimens at once */}
          <div className="lg:col-span-8 h-[380px] w-full bg-slate-100 relative z-0">
            <div ref={leafletContainerRef} className="h-full w-full" />
          </div>

          {/* Right 4 cols: Selected Specimen Details or All-Specimens Summary */}
          <div className="lg:col-span-4 p-4 bg-slate-50/60 flex flex-col justify-between space-y-3 text-xs">
            {activeSpecimen ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold italic text-sm text-slate-900">
                    {activeSpecimen.sp}
                  </span>
                  <span className="rounded bg-sky-700 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
                    {isEn ? `Slide #${activeSpecimen.num}` : `Препарат #${activeSpecimen.num}`}
                  </span>
                </div>
                <div className="space-y-1 text-slate-700">
                  <div>
                    <strong>{isEn ? 'Region:' : 'Регион:'}</strong>{' '}
                    {translateRegion(activeSpecimen.region, lang)}
                    {activeSpecimen.district && activeSpecimen.district !== '-'
                      ? ` (${activeSpecimen.district})`
                      : ''}
                  </div>
                  <div>
                    <strong>{isEn ? 'Waterbody:' : 'Водоём:'}</strong>{' '}
                    {activeSpecimen.waterbody || '—'}
                    {activeSpecimen.inVivoColor ? ` (${activeSpecimen.inVivoColor})` : ''}
                  </div>
                  <div>
                    <strong>{isEn ? 'Coordinates:' : 'Координаты:'}</strong>{' '}
                    <span className="font-mono">
                      {activeSpecimen.lat?.toFixed(4)}° N, {activeSpecimen.lon?.toFixed(4)}° E
                    </span>
                  </div>
                  <div>
                    <strong>{isEn ? 'Date & Collector:' : 'Дата и сборщик:'}</strong>{' '}
                    {activeSpecimen.date} · leg. {activeSpecimen.collector}
                  </div>
                </div>
                <div className="rounded bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-700 border border-slate-200">
                  cr/cs: {formatTraitNumber(activeSpecimen.traits['cr/cs'], 2)} · xa/x:{' '}
                  {formatTraitNumber(activeSpecimen.traits['xa/x'], 2)} · A1ser:{' '}
                  {formatTraitNumber(activeSpecimen.traits['A1ser'], 0)}
                </div>
                {onLoadSpecimenIntoKey && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadSpecimenIntoKey(activeSpecimen, 'diagnostic8')}
                      className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      {isEn ? '8 traits' : '8 признаков'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onLoadSpecimenIntoKey(activeSpecimen, 'all')}
                      className="flex-1 rounded bg-sky-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-800 cursor-pointer"
                    >
                      {isEn ? 'Load into Key' : 'В определитель'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="font-bold text-slate-900">
                  {isEn
                    ? `All ${primaryGeocodedSpecimens.length} specimens of ${species.sp} are shown on the map`
                    : `На карте отображены все ${primaryGeocodedSpecimens.length} экз. вида ${species.sp}`}
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {isEn
                    ? 'Click any red numbered marker on the map or any #num button above to inspect that specimen’s coordinates, waterbody, and morphometric indices.'
                    : 'Нажмите на любой красный маркер с номером на карте или на кнопку #num выше, чтобы посмотреть точные координаты, водоём и индексы конкретной особи.'}
                </p>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                  {primaryGeocodedSpecimens.map((s) => (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => {
                        setActiveSpecimen(s);
                        onSelectSpecimen?.(s);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-sky-50 transition-colors cursor-pointer"
                    >
                      <span className="font-mono font-semibold text-rose-700">#{s.num}</span>
                      <span className="truncate mx-2 text-slate-700 flex-1">
                        {translateRegion(s.region, lang)}
                        {s.waterbody && s.waterbody !== '-' ? ` · ${s.waterbody}` : ''}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {s.lat.toFixed(2)}, {s.lon.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-2">
              {isEn
                ? 'Note: Specimens collected at the exact same coordinates are slightly offset in a circle so every marker remains visible.'
                : 'Примечание: особи из одной и той же точки сбора слегка разнесены по кругу, чтобы каждый маркер был виден отдельно.'}
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600 border border-rose-900" />
            <span>
              {isEn ? (
                <>
                  Specimens of <strong className="italic">{species.sp}</strong> (click any marker for slide details)
                </>
              ) : (
                <>
                  Особи <strong className="italic">{species.sp}</strong> (нажмите на маркер для деталей препарата)
                </>
              )}
            </span>
          </span>
          {mapScope !== 'species' && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400 border border-slate-600" />
              <span>
                {mapScope === 'group'
                  ? isEn
                    ? `Other species of group ${species.group} (${backgroundSpecimens.length} spec.)`
                    : `Другие виды группы ${species.group} (${backgroundSpecimens.length} экз.)`
                  : isEn
                  ? `Other database species (${backgroundSpecimens.length} spec.)`
                  : `Остальные виды базы (${backgroundSpecimens.length} экз.)`}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
