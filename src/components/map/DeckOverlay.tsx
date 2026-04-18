/**
 * DeckOverlay.tsx
 * 
 * GPU-powered 3D visualization layers using deck.gl
 * This is the "never-been-done-before" layer that makes this project insane.
 * 
 * Features:
 * - 3D Hexagonal columns rising from the map (population/activity density)
 * - Curved arc connections between major landmarks
 * - Animated trip paths with trailing glow
 * - Scattered data particles with size/color encoding
 */

import { useEffect, useRef, useCallback } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import type { Layer } from '@deck.gl/core';
import type maplibregl from 'maplibre-gl';

interface ActivityPoint {
  position: [number, number];
  weight: number;
}

interface ArcConnection {
  source: [number, number];
  target: [number, number];
  color: [number, number, number];
}

interface TripData {
  path: [number, number][];
  timestamps: number[];
  color: [number, number, number];
}

// ═══ MUMBAI DATA GENERATION ═══

// Generate realistic scatter data around Mumbai landmarks
function generateMumbaiActivityData(count: number): ActivityPoint[] {
  const hotspots = [
    { lng: 72.8347, lat: 18.9220, weight: 9 },  // Gateway of India
    { lng: 72.8296, lat: 18.9437, weight: 8 },  // Marine Drive
    { lng: 72.8183, lat: 19.0176, weight: 7 },  // Bandra-Worli Sea Link
    { lng: 72.8355, lat: 18.9398, weight: 8 },  // CST
    { lng: 72.8090, lat: 19.0596, weight: 6 },  // Juhu Beach
    { lng: 72.8197, lat: 18.9827, weight: 7 },  // Haji Ali
    { lng: 72.8777, lat: 19.0760, weight: 9 },  // Powai Lake
    { lng: 72.8311, lat: 18.9256, weight: 6 },  // Colaba
    { lng: 72.8565, lat: 19.1136, weight: 5 },  // Andheri
    { lng: 72.8375, lat: 18.9538, weight: 7 },  // Girgaon Chowpatty
  ];

  const points: ActivityPoint[] = [];
  for (let i = 0; i < count; i++) {
    const hotspot = hotspots[Math.floor(Math.random() * hotspots.length)];
    const jitter = 0.015;
    points.push({
      position: [
        hotspot.lng + (Math.random() - 0.5) * jitter * hotspot.weight,
        hotspot.lat + (Math.random() - 0.5) * jitter * hotspot.weight
      ],
      weight: hotspot.weight * (0.5 + Math.random() * 0.5)
    });
  }
  return points;
}

// Arc connections between Mumbai landmarks
const MUMBAI_ARCS: ArcConnection[] = [
  { source: [72.8347, 18.9220], target: [72.8296, 18.9437], color: [66, 133, 244] },   // Gateway → Marine Drive
  { source: [72.8296, 18.9437], target: [72.8183, 19.0176], color: [234, 67, 53] },    // Marine Drive → Bandra
  { source: [72.8183, 19.0176], target: [72.8090, 19.0596], color: [251, 188, 4] },    // Bandra → Juhu
  { source: [72.8347, 18.9220], target: [72.8355, 18.9398], color: [52, 168, 83] },    // Gateway → CST
  { source: [72.8355, 18.9398], target: [72.8197, 18.9827], color: [156, 39, 176] },   // CST → Haji Ali
  { source: [72.8197, 18.9827], target: [72.8777, 19.0760], color: [0, 188, 212] },    // Haji Ali → Powai
  { source: [72.8090, 19.0596], target: [72.8565, 19.1136], color: [255, 87, 34] },    // Juhu → Andheri
  { source: [72.8311, 18.9256], target: [72.8375, 18.9538], color: [96, 125, 139] },   // Colaba → Girgaon
];

// Generate animated trip data (simulated taxi/auto routes)
function generateTripData(): TripData[] {
  const trips: TripData[] = [];
  const routes: Array<{ waypoints: [number, number][]; color: [number, number, number] }> = [
    // Route 1: Gateway → CST → Dadar
    { waypoints: [[72.8347, 18.9220], [72.8350, 18.9300], [72.8355, 18.9398], [72.8340, 18.9500], [72.8330, 18.9600], [72.8310, 18.9720]], color: [255, 200, 0] },
    // Route 2: Bandra → Worli → Haji Ali
    { waypoints: [[72.8183, 19.0176], [72.8180, 19.0050], [72.8185, 18.9950], [72.8190, 18.9880], [72.8197, 18.9827]], color: [0, 229, 255] },
    // Route 3: Juhu → Andheri → Powai
    { waypoints: [[72.8090, 19.0596], [72.8200, 19.0600], [72.8350, 19.0650], [72.8500, 19.0700], [72.8650, 19.0750], [72.8777, 19.0760]], color: [255, 64, 129] },
    // Route 4: Colaba → Fort → CSMT
    { waypoints: [[72.8311, 18.9256], [72.8320, 18.9280], [72.8330, 18.9310], [72.8340, 18.9350], [72.8355, 18.9398]], color: [118, 255, 3] },
  ];

  routes.forEach((route) => {
    const timestamps: number[] = [];
    route.waypoints.forEach((_, i) => {
      timestamps.push(i * 200);
    });
    trips.push({
      path: route.waypoints,
      timestamps,
      color: route.color
    });
  });

  return trips;
}

// ═══ LAYER CONFIGURATIONS ═══

export type DeckLayerMode = 'hexagon' | 'arcs' | 'trips' | 'scatter' | 'all' | null;

interface Props {
  map: maplibregl.Map | null;
  mode: DeckLayerMode;
}

export default function DeckOverlay({ map, mode }: Props) {
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const activityData = useRef(generateMumbaiActivityData(1500));
  const tripData = useRef(generateTripData());

  const updateLayers = useCallback((currentTime: number) => {
    if (!overlayRef.current || !mode) return;

    const layers: Layer[] = [];

    // ═══ 3D HEXAGON HEATMAP ═══
    if (mode === 'hexagon' || mode === 'all') {
      layers.push(
        new HexagonLayer({
          id: 'hexagon-layer',
          data: activityData.current,
           getPosition: (d: ActivityPoint) => d.position,
           getElevationWeight: (d: ActivityPoint) => d.weight,
           getColorWeight: (d: ActivityPoint) => d.weight,
          elevationScale: 25,
          extruded: true,
          radius: 200,
          coverage: 0.92,
          upperPercentile: 90,
          colorRange: [
            [1, 152, 189],
            [73, 227, 206],
            [216, 254, 181],
            [254, 237, 177],
            [254, 173, 84],
            [209, 55, 78]
          ],
          elevationRange: [0, 300],
          material: {
            ambient: 0.64,
            diffuse: 0.6,
            shininess: 32,
            specularColor: [51, 51, 51]
          },
          opacity: 0.8,
          pickable: true,
          transitions: {
            elevationScale: { duration: 1000, easing: (t: number) => t * (2 - t) }
          }
        })
      );
    }

    // ═══ ARC CONNECTIONS ═══
    if (mode === 'arcs' || mode === 'all') {
      layers.push(
        new ArcLayer({
          id: 'arc-layer',
          data: MUMBAI_ARCS,
           getSourcePosition: (d: ArcConnection) => d.source,
           getTargetPosition: (d: ArcConnection) => d.target,
           getSourceColor: (d: ArcConnection) => [...d.color, 200] as [number,number,number,number],
           getTargetColor: (d: ArcConnection) => [...d.color, 200] as [number,number,number,number],
          getWidth: 4,
          getHeight: 0.35,
          greatCircle: false,
          pickable: true,
          transitions: {
            getWidth: { duration: 800 }
          }
        })
      );
    }

    // ═══ ANIMATED TRIPS ═══
    if (mode === 'trips' || mode === 'all') {
      layers.push(
        new TripsLayer({
          id: 'trips-layer',
          data: tripData.current,
           getPath: (d: TripData) => d.path,
           getTimestamps: (d: TripData) => d.timestamps,
           getColor: (d: TripData) => d.color,
          opacity: 0.9,
          widthMinPixels: 4,
          jointRounded: true,
          capRounded: true,
          trailLength: 180,
          currentTime: currentTime % 1200,
          shadowEnabled: false
        })
      );
    }

    // ═══ SCATTER PARTICLES ═══
    if (mode === 'scatter' || mode === 'all') {
      layers.push(
        new ScatterplotLayer({
          id: 'scatter-layer',
          data: activityData.current.slice(0, 300),
           getPosition: (d: ActivityPoint) => d.position,
           getRadius: (d: ActivityPoint) => d.weight * 8,
           getFillColor: (d: ActivityPoint) => {
            const t = d.weight / 10;
            return [
              Math.floor(66 + t * 180),
              Math.floor(133 - t * 70),
              Math.floor(244 - t * 100),
              Math.floor(120 + t * 80)
            ];
          },
          radiusScale: 3,
          radiusMinPixels: 2,
          radiusMaxPixels: 20,
          stroked: true,
          getLineColor: [255, 255, 255, 60],
          lineWidthMinPixels: 1,
          pickable: true,
          transitions: {
            getRadius: { duration: 500 }
          }
        })
      );
    }

    overlayRef.current.setProps({ layers });
  }, [mode]);

  // Initialize deck.gl overlay
  useEffect(() => {
    if (!map) return;

    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: []
    });

    map.addControl(overlay as unknown as maplibregl.IControl);
    overlayRef.current = overlay;

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      try {
        map.removeControl(overlay as unknown as maplibregl.IControl);
      } catch (error) {
        console.warn('Deck overlay removal skipped:', error);
      }
    };
  }, [map]);

  // Animation loop for trips
  useEffect(() => {
    if (!mode) {
      if (overlayRef.current) overlayRef.current.setProps({ layers: [] });
      return;
    }

    const animate = () => {
      timeRef.current += 2;
      updateLayers(timeRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    // Initial render then start animation if trips are active
    if (mode === 'trips' || mode === 'all') {
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      updateLayers(0);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mode, updateLayers]);

  return null; // This component controls the map overlay imperatively
}
