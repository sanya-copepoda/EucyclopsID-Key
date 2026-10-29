// Source: Google Maps Platform Code Assist
import React, { useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Layers, Sparkles } from 'lucide-react';
import { SpeciesProfile, SpecimenRecord } from '../types/taxonomy';
import { formatTraitNumber } from '../utils/matrixEngine';

interface SpeciesDistributionMapProps {
  species: SpeciesProfile;
  allSpecies?: SpeciesProfile[];
  selectedSpecimenNum?: number | null;
  onSelectSpecimen?: (specimen: SpecimenRecord | null) => void;
  onLoadSpecimenIntoKey?: (specimen: SpecimenRecord, mode: 'all' | 'diagnostic8') => void;
}

interface MapBoundsUpdaterProps {
  points: { lat: number; lng: number }[];
  focusedPoint: { lat: number; lng: number } | null;
  fitTrigger: number;
}

const MapBoundsUpdater: React.FC<MapBoundsUpdaterProps> = ({
  points,
  focusedPoint,
  fitTrigger,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(7);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const pt of points) {
      bounds.extend(pt);
    }
    map.fitBounds(bounds, 48);
  }, [map, points, fitTrigger]);

  useEffect(() => {
    if (!map || !focusedPoint) return;
    map.panTo(focusedPoint);
    const currentZoom = map.getZoom() ?? 5;
    if (currentZoom < 7) {
      map.setZoom(7);
    }
  }, [map, focusedPoint]);

  return null;
};

export const SpeciesDistributionMap: React.FC<SpeciesDistributionMapProps> = ({
  species,
  allSpecies = [],
  selectedSpecimenNum,
  onSelectSpecimen,
  onLoadSpecimenIntoKey,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [mapScope, setMapScope] = useState<'species' | 'group' | 'all'>('species');
  const [mapTypeId, setMapTypeId] = useState<'terrain' | 'hybrid' | 'roadmap'>('terrain');
  const [activeSpecimen, setActiveSpecimen] = useState<SpecimenRecord | null>(null);
  const [fitTrigger, setFitTrigger] = useState<number>(0);

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
    // Default center over Eurasia / Russia
    return { lat: 58.0, lng: 65.0 };
  }, [primaryGeocodedSpecimens]);

  const focusedPoint = useMemo(() => {
    if (
      activeSpecimen &&
      activeSpecimen.lat !== null &&
      activeSpecimen.lon !== null
    ) {
      return { lat: activeSpecimen.lat, lng: activeSpecimen.lon };
    }
    return null;
  }, [activeSpecimen]);

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
        Ключ Google Maps API не найден в переменных окружения (
        <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code>).
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Map Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-sky-700" />
            Карта мест сбора <em className="italic">{species.sp}</em>
          </span>
          <span className="rounded-md bg-sky-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-900">
            {primaryGeocodedSpecimens.length} из {species.specimenCount} экз. с координатами
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Layer selector: only this species vs group vs all */}
          {allSpecies.length > 1 && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-200/75 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setMapScope('species')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap ${
                  mapScope === 'species'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Только {species.sp} ({primaryGeocodedSpecimens.length})
              </button>
              <button
                type="button"
                onClick={() => setMapScope('group')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap ${
                  mapScope === 'group'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Группа {species.group}
              </button>
              <button
                type="button"
                onClick={() => setMapScope('all')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap ${
                  mapScope === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Все виды базы
              </button>
            </div>
          )}

          {/* Map Type selector */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/75 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setMapTypeId('terrain')}
              className={`rounded-md px-2 py-1 font-medium transition-colors ${
                mapTypeId === 'terrain'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Рельеф
            </button>
            <button
              type="button"
              onClick={() => setMapTypeId('hybrid')}
              className={`rounded-md px-2 py-1 font-medium transition-colors ${
                mapTypeId === 'hybrid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Спутник
            </button>
            <button
              type="button"
              onClick={() => setMapTypeId('roadmap')}
              className={`rounded-md px-2 py-1 font-medium transition-colors ${
                mapTypeId === 'roadmap'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Схема
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveSpecimen(null);
              setFitTrigger((n) => n + 1);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            title="Показать все точки в пределах видимости"
          >
            <Navigation className="h-3 w-3 text-sky-700" />
            Вписать все точки
          </button>
        </div>
      </div>

      {/* Map Canvas Container with explicit height (CF2 compliance) */}
      {primaryGeocodedSpecimens.length === 0 && backgroundSpecimens.length === 0 ? (
        <div className="flex h-60 items-center justify-center bg-slate-50 p-6 text-center text-xs text-slate-500">
          У особей вида <strong className="mx-1 italic">{species.sp}</strong> в таблице не указаны географические координаты (N / E).
        </div>
      ) : (
        <div className="relative h-[380px] w-full">
          <APIProvider apiKey={apiKey} language="ru" region="RU">
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={defaultCenter}
              defaultZoom={4}
              mapTypeId={mapTypeId}
              gestureHandling="greedy"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="h-full w-full"
            >
              <MapBoundsUpdater
                points={pointsForBounds}
                focusedPoint={focusedPoint}
                fitTrigger={fitTrigger}
              />

              {/* Background comparison markers (other species in group or database) */}
              {backgroundSpecimens.map((spec) => (
                <AdvancedMarker
                  key={`bg-${spec.num}`}
                  position={{ lat: spec.lat, lng: spec.lon }}
                  title={`#${spec.num} ${spec.sp} — ${spec.region}, ${spec.waterbody}`}
                  onClick={() => {
                    setActiveSpecimen(spec);
                    onSelectSpecimen?.(spec);
                  }}
                >
                  <Pin
                    background="#94a3b8"
                    borderColor="#475569"
                    glyphColor="#ffffff"
                    scale={0.75}
                  />
                </AdvancedMarker>
              ))}

              {/* Primary species markers */}
              {primaryGeocodedSpecimens.map((spec) => {
                const isSelected = activeSpecimen?.num === spec.num;
                return (
                  <AdvancedMarker
                    key={`sp-${spec.num}`}
                    position={{ lat: spec.lat, lng: spec.lon }}
                    zIndex={isSelected ? 50 : 20}
                    title={`#${spec.num} ${spec.sp} — ${spec.region}, ${spec.waterbody}`}
                    onClick={() => {
                      setActiveSpecimen(spec);
                      onSelectSpecimen?.(spec);
                    }}
                  >
                    <Pin
                      background={isSelected ? '#0284c7' : '#e11d48'}
                      borderColor={isSelected ? '#0f172a' : '#881337'}
                      glyphColor="#ffffff"
                      glyphText={String(spec.num)}
                      scale={isSelected ? 1.25 : 1.05}
                    />
                  </AdvancedMarker>
                );
              })}

              {/* InfoWindow for clicked specimen */}
              {activeSpecimen &&
                activeSpecimen.lat !== null &&
                activeSpecimen.lon !== null && (
                  <InfoWindow
                    position={{ lat: activeSpecimen.lat, lng: activeSpecimen.lon }}
                    pixelOffset={[0, -34]}
                    maxWidth={320}
                    onCloseClick={() => {
                      setActiveSpecimen(null);
                      onSelectSpecimen?.(null);
                    }}
                  >
                    <div className="space-y-1.5 p-1 text-xs text-slate-900">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                        <span className="font-bold italic text-sm text-slate-900">
                          {activeSpecimen.sp}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          Препарат #{activeSpecimen.num} (NN {activeSpecimen.nn})
                        </span>
                      </div>

                      <div className="space-y-0.5 text-[11px] text-slate-700">
                        <div>
                          <span className="font-semibold text-slate-900">Регион:</span>{' '}
                          {activeSpecimen.region}
                          {activeSpecimen.district && activeSpecimen.district !== '-'
                            ? ` (${activeSpecimen.district})`
                            : ''}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Водоём:</span>{' '}
                          {activeSpecimen.waterbody || '—'}
                          {activeSpecimen.inVivoColor
                            ? ` · окраска: ${activeSpecimen.inVivoColor}`
                            : ''}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Координаты:</span>{' '}
                          <span className="font-mono">
                            {activeSpecimen.lat.toFixed(4)}° N, {activeSpecimen.lon.toFixed(4)}° E
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Сбор:</span>{' '}
                          {activeSpecimen.date} · leg. {activeSpecimen.collector}
                        </div>
                      </div>

                      <div className="rounded bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-600 border border-slate-200">
                        cr/cs: {formatTraitNumber(activeSpecimen.traits['cr/cs'], 2)} · xa/x:{' '}
                        {formatTraitNumber(activeSpecimen.traits['xa/x'], 2)} · A1ser:{' '}
                        {formatTraitNumber(activeSpecimen.traits['A1ser'], 0)}
                      </div>

                      {onLoadSpecimenIntoKey && (
                        <div className="pt-1 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onLoadSpecimenIntoKey(activeSpecimen, 'diagnostic8')}
                            className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            8 признаков
                          </button>
                          <button
                            type="button"
                            onClick={() => onLoadSpecimenIntoKey(activeSpecimen, 'all')}
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-sky-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-800 transition-colors"
                          >
                            <Sparkles className="h-3 w-3" />В определитель
                          </button>
                        </div>
                      )}
                    </div>
                  </InfoWindow>
                )}
            </Map>
          </APIProvider>
        </div>
      )}

      {/* Map Legend & Quick Specimen Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600 border border-rose-900" />
            <span>
              Особи <strong className="italic">{species.sp}</strong> (нажмите на маркер для деталей препарата)
            </span>
          </span>
          {mapScope !== 'species' && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400 border border-slate-600" />
              <span>
                {mapScope === 'group'
                  ? `Другие виды группы ${species.group} (${backgroundSpecimens.length} экз.)`
                  : `Остальные виды базы (${backgroundSpecimens.length} экз.)`}
              </span>
            </span>
          )}
        </div>

        {primaryGeocodedSpecimens.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-slate-400 mr-1">Быстрый переход:</span>
            {primaryGeocodedSpecimens.map((spec) => (
              <button
                key={spec.num}
                type="button"
                onClick={() => {
                  setActiveSpecimen(spec);
                  onSelectSpecimen?.(spec);
                }}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                  activeSpecimen?.num === spec.num
                    ? 'bg-sky-700 text-white font-semibold'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title={`${spec.region}, ${spec.waterbody} (${spec.lat.toFixed(3)}, ${spec.lon.toFixed(3)})`}
              >
                #{spec.num}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
