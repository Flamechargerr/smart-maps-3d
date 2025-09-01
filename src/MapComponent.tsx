import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const STYLES: Record<string, string | object> = {
  default: 'https://tiles.openfreemap.org/styles/liberty',
  satellite: {
    version: 8,
    sources: {
      'esri-sat': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri'
      }
    },
    layers: [{ id: 'esri-sat-layer', type: 'raster', source: 'esri-sat' }]
  }
};

export interface MapHandle {
  flyTo: (opts: maplibregl.FlyToOptions) => void;
  addMarker: (lng: number, lat: number, color?: string, pulse?: boolean) => maplibregl.Marker;
  clearMarkers: () => void;
  drawRoute: (coords: [number, number][]) => void;
  clearRoute: () => void;
  getMap: () => maplibregl.Map | null;
  setStyle: (style: 'default' | 'satellite') => void;
  startOrbit: () => void;
  stopOrbit: () => void;
}

interface Props {
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onMapLoad?: () => void;
}

const MapComponent = forwardRef<MapHandle, Props>(({ onMapClick, onMapLoad }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const orbitRef = useRef<number | null>(null);
  const routeAnimRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    flyTo(opts) {
      mapRef.current?.flyTo({ speed: 1.2, curve: 1.42, essential: true, ...opts });
    },
    addMarker(lng, lat, color = '#4285F4', pulse = true) {
      const el = document.createElement('div');
      el.className = 'map-marker-container';
      el.innerHTML = `
        ${pulse ? '<div class="marker-pulse" style="--marker-color: ' + color + '"></div>' : ''}
        <div class="map-marker" style="--marker-color: ${color}">
          <svg width="32" height="44" viewBox="0 0 32 44" fill="none">
            <defs>
              <filter id="pin-shadow" x="-20%" y="-10%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
              </filter>
            </defs>
            <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 28 16 28s16-16 16-28C32 7.164 24.836 0 16 0z" fill="${color}" filter="url(#pin-shadow)"/>
            <circle cx="16" cy="16" r="7" fill="white"/>
          </svg>
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
      return marker;
    },
    clearMarkers() {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    },
    drawRoute(coords) {
      const map = mapRef.current;
      if (!map) return;
      this.clearRoute();

      // Animated route drawing — progressively reveal the line
      let progress = 0;
      const totalPoints = coords.length;

      map.addSource('route-line', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords.slice(0, 2) } }
      });
      // Shadow
      map.addLayer({
        id: 'route-shadow', type: 'line', source: 'route-line',
        paint: { 'line-color': 'rgba(26,115,232,0.15)', 'line-width': 16, 'line-blur': 12 },
        layout: { 'line-join': 'round', 'line-cap': 'round' }
      });
      // Casing
      map.addLayer({
        id: 'route-casing', type: 'line', source: 'route-line',
        paint: { 'line-color': '#1557b0', 'line-width': 8, 'line-gap-width': 0 },
        layout: { 'line-join': 'round', 'line-cap': 'round' }
      });
      // Main
      map.addLayer({
        id: 'route-main', type: 'line', source: 'route-line',
        paint: { 'line-color': '#4285F4', 'line-width': 5 },
        layout: { 'line-join': 'round', 'line-cap': 'round' }
      });
      // Animated dots overlay
      map.addLayer({
        id: 'route-dots', type: 'line', source: 'route-line',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-dasharray': [0, 2, 1]
        },
        layout: { 'line-join': 'round', 'line-cap': 'round' }
      });

      // Progressive reveal animation
      const animate = () => {
        progress = Math.min(progress + 3, totalPoints);
        const source = map.getSource('route-line') as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'Feature', properties: {},
            geometry: { type: 'LineString', coordinates: coords.slice(0, progress) }
          });
        }
        if (progress < totalPoints) {
          routeAnimRef.current = requestAnimationFrame(animate);
        }
      };
      routeAnimRef.current = requestAnimationFrame(animate);
    },
    clearRoute() {
      const map = mapRef.current;
      if (!map) return;
      if (routeAnimRef.current) cancelAnimationFrame(routeAnimRef.current);
      ['route-dots', 'route-main', 'route-casing', 'route-shadow'].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource('route-line')) map.removeSource('route-line');
    },
    getMap() { return mapRef.current; },
    setStyle(style) {
      mapRef.current?.setStyle(STYLES[style] as any);
    },
    startOrbit() {
      const map = mapRef.current;
      if (!map) return;
      let bearing = map.getBearing();
      const spin = () => {
        bearing += 0.15;
        map.rotateTo(bearing, { duration: 0, essential: true });
        orbitRef.current = requestAnimationFrame(spin);
      };
      orbitRef.current = requestAnimationFrame(spin);
    },
    stopOrbit() {
      if (orbitRef.current) {
        cancelAnimationFrame(orbitRef.current);
        orbitRef.current = null;
      }
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES.default as string,
      center: [72.8347, 18.9220],
      zoom: 2.5,        // Start zoomed out (dramatic)
      pitch: 0,
      bearing: 0,
      antialias: true,
      fadeDuration: 300
    });

    // Navigation
    map.addControl(new maplibregl.NavigationControl({
      showCompass: true, showZoom: true, visualizePitch: true
    }), 'bottom-right');

    // Geolocation
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showAccuracyCircle: true
    }), 'bottom-right');

    // Scale
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left');

    map.on('load', () => {
      setLoaded(true);
      onMapLoad?.();

      // ═══ CINEMATIC INTRO: Orbit from space to Mumbai ═══
      setTimeout(() => {
        map.flyTo({
          center: [72.8347, 18.9220],
          zoom: 16.5,
          pitch: 62,
          bearing: -30,
          speed: 0.6,
          curve: 1.8,
          essential: true,
          easing: (t: number) => {
            // Custom easing: slow start, smooth middle, gentle end
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          }
        });
      }, 400);

      // Start subtle orbit after intro completes
      setTimeout(() => {
        let bearing = -30;
        const spin = () => {
          bearing += 0.08;
          if (map.isMoving()) return;
          map.rotateTo(bearing, { duration: 0, essential: true });
          orbitRef.current = requestAnimationFrame(spin);
        };
        orbitRef.current = requestAnimationFrame(spin);
      }, 6500);
    });

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      // Stop orbit on interaction
      if (orbitRef.current) {
        cancelAnimationFrame(orbitRef.current);
        orbitRef.current = null;
      }
      onMapClick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    // Stop orbit on any user interaction
    const stopOrbitOnInteract = () => {
      if (orbitRef.current) {
        cancelAnimationFrame(orbitRef.current);
        orbitRef.current = null;
      }
    };
    map.on('mousedown', stopOrbitOnInteract);
    map.on('touchstart', stopOrbitOnInteract);

    mapRef.current = map;
    return () => {
      if (orbitRef.current) cancelAnimationFrame(orbitRef.current);
      if (routeAnimRef.current) cancelAnimationFrame(routeAnimRef.current);
      map.remove();
    };
  }, []);

  return (
    <div className="map-wrapper">
      {/* Atmospheric vignette overlay */}
      <div className="map-atmosphere" />
      
      {/* Loading shimmer */}
      {!loaded && (
        <div className="map-loading">
          <div className="loading-globe">
            <div className="globe-ring" />
            <div className="globe-ring delay" />
          </div>
          <span className="loading-text">Exploring Earth...</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="map-canvas"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
});

MapComponent.displayName = 'MapComponent';
export default MapComponent;
