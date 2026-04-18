import { useRef, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type maplibregl from 'maplibre-gl';
import {
  Navigation as NavIcon, Compass, Coffee, Fuel, Building2,
  Hotel, ShoppingBag, Landmark, Heart, Clock, Box, Hexagon, Zap, Sparkles
} from 'lucide-react';
import './styles/index.css';
import MapComponent, { type MapHandle, type MapStyle } from './components/map/MapComponent';
import SearchPanel from './components/panels/SearchPanel';
import DirectionsPanel from './components/panels/DirectionsPanel';
import LayerSelector from './components/map/LayerSelector';
import PlaceCard from './components/panels/PlaceCard';
import DeckOverlay, { type DeckLayerMode } from './components/map/DeckOverlay';

interface PlaceInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: string;
}

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

interface ExploreResult {
  lat: string;
  lon: string;
}

const EXPLORE_CHIPS = [
  { id: 'restaurants', label: 'Restaurants', icon: Coffee, color: '#ea4335' },
  { id: 'hotels', label: 'Hotels', icon: Hotel, color: '#4285f4' },
  { id: 'gas', label: 'Petrol', icon: Fuel, color: '#fbbc04' },
  { id: 'atm', label: 'ATMs', icon: Building2, color: '#34a853' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#ea4335' },
  { id: 'attractions', label: 'Attractions', icon: Landmark, color: '#9c27b0' },
];

export default function App() {
  const mapRef = useRef<MapHandle>(null);
  const [mode, setMode] = useState<'explore' | 'search' | 'directions'>('explore');
  const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [deckMode, setDeckMode] = useState<DeckLayerMode>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [currentTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  // Hide intro after map loads
  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 3800);
    return () => clearTimeout(timer);
  }, []);

  // Search result → fly + marker
  const handleSearchResult = useCallback((result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    mapRef.current?.stopOrbit();
    mapRef.current?.clearMarkers();
    mapRef.current?.clearRoute();
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 17, pitch: 55, bearing: -20 });
    setTimeout(() => mapRef.current?.addMarker(lng, lat, '#ea4335', true), 1200);
    setSelectedPlace({
      name: result.display_name.split(',')[0],
      address: result.display_name,
      lat, lng,
      type: result.type?.replace(/_/g, ' ')
    });
    setMode('search');
  }, []);

  // Map click → reverse geocode
  const handleMapClick = useCallback(async (lngLat: { lng: number; lat: number }) => {
    if (mode === 'directions') return;
    mapRef.current?.stopOrbit();
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lngLat.lat}&lon=${lngLat.lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data?.display_name) {
        mapRef.current?.clearMarkers();
        mapRef.current?.addMarker(lngLat.lng, lngLat.lat, '#ea4335', true);
        setSelectedPlace({
          name: data.display_name.split(',')[0],
          address: data.display_name,
          lat: lngLat.lat, lng: lngLat.lng,
          type: data.type?.replace(/_/g, ' ')
        });
      }
    } catch (e) { console.error('Reverse geocode:', e); }
  }, [mode]);

  // Explore chip → search nearby POIs
  const handleExploreChip = useCallback(async (chipId: string) => {
    if (activeChip === chipId) { setActiveChip(null); mapRef.current?.clearMarkers(); return; }
    setActiveChip(chipId);
    mapRef.current?.stopOrbit();
    mapRef.current?.clearMarkers();
    
    const map = mapRef.current?.getMap();
    if (!map) return;
    const center = map.getCenter();

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(chipId)}&format=json&limit=8&viewbox=${center.lng-0.05},${center.lat+0.05},${center.lng+0.05},${center.lat-0.05}&bounded=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data: ExploreResult[] = await res.json();
      const chip = EXPLORE_CHIPS.find(c => c.id === chipId);
      data.forEach((r, i) => {
        setTimeout(() => {
          mapRef.current?.addMarker(parseFloat(r.lon), parseFloat(r.lat), chip?.color || '#4285f4', false);
        }, i * 120); // Staggered drop animation
      });
    } catch (e) { console.error('Explore error:', e); }
  }, [activeChip]);

  // Route events
  const handleRoute = useCallback(() => { setSelectedPlace(null); }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const coords: number[][] = detail.coords;
      const origin: [number, number] | undefined = detail.origin;
      const dest: [number, number] | undefined = detail.dest;

      mapRef.current?.clearMarkers();
      mapRef.current?.drawRoute(coords as [number, number][]);

      // Add origin (blue) and destination (red) markers
      if (origin) mapRef.current?.addMarker(origin[0], origin[1], '#4285F4', true);
      if (dest) mapRef.current?.addMarker(dest[0], dest[1], '#ea4335', true);

      if (coords.length > 0) {
        const lngs = coords.map((c: number[]) => c[0]);
        const lats = coords.map((c: number[]) => c[1]);
        mapRef.current?.getMap()?.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: { top: 80, bottom: 120, left: 80, right: 80 }, pitch: 52, bearing: -20, duration: 1200 }
        );
      }
    };
    window.addEventListener('drawRoute', handler);
    return () => window.removeEventListener('drawRoute', handler);
  }, []);

  const handleStyleChange = useCallback((style: MapStyle) => {
    mapRef.current?.setStyle(style);
  }, []);

  const handleMapLoad = useCallback(() => {
    setMapInstance(mapRef.current?.getMap() ?? null);
  }, []);

  return (
    <div className="app-root">
      {/* ═══ FULL-SCREEN MAP ═══ */}
      <div className="map-fill">
        <MapComponent
          ref={mapRef}
          onMapClick={handleMapClick}
          onMapLoad={handleMapLoad}
        />
        {/* GPU-powered 3D visualization overlay */}
        <DeckOverlay map={mapInstance} mode={deckMode} />
      </div>

      {/* ═══ CINEMATIC INTRO OVERLAY ═══ */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            className="intro-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          >
            <motion.div
              className="intro-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <div className="intro-logo">
                <Compass size={48} strokeWidth={1.5} />
              </div>
              <h1 className="intro-title">Smart Maps</h1>
              <p className="intro-subtitle">Exploring Mumbai, India</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ UI OVERLAY ═══ */}
      <div className="ui-overlay">
        {/* Top bar */}
        <div className="top-section">
          <AnimatePresence mode="wait">
            {mode !== 'directions' && (
              <motion.div className="top-panel" key="search-bar"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              >
                <SearchPanel
                  onSelectResult={handleSearchResult}
                  onFocus={() => { setMode('search'); mapRef.current?.stopOrbit(); }}
                />
                <motion.button
                  className="directions-fab"
                  onClick={() => { setMode('directions'); mapRef.current?.stopOrbit(); }}
                  title="Directions"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                >
                  <NavIcon size={20} />
                </motion.button>
              </motion.div>
            )}

            {mode === 'directions' && (
              <DirectionsPanel
                key="directions"
                onClose={() => { setMode('explore'); mapRef.current?.clearRoute(); mapRef.current?.clearMarkers(); }}
                onRoute={handleRoute}
              />
            )}
          </AnimatePresence>

          {/* Explore chips */}
          {mode !== 'directions' && (
            <motion.div
              className="explore-chips"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', bounce: 0.25 }}
            >
              {EXPLORE_CHIPS.map((chip, i) => (
                <motion.button
                  key={chip.id}
                  className={`explore-chip ${activeChip === chip.id ? 'active' : ''}`}
                  style={{ '--chip-color': chip.color } as React.CSSProperties}
                  onClick={() => handleExploreChip(chip.id)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * i, type: 'spring' }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <chip.icon size={15} />
                  <span>{chip.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Layer selector */}
        <div className="layer-control-position">
          <LayerSelector onStyleChange={handleStyleChange} />
        </div>

        {/* Weather/time pill */}
        <motion.div
          className="time-pill glass-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 4, type: 'spring' }}
        >
          <Clock size={14} />
          <span>{currentTime}</span>
          <span className="weather-temp">31°C</span>
        </motion.div>

        {/* ═══ 3D VISUALIZATION CONTROLS ═══ */}
        <AnimatePresence>
          {mode === 'explore' && (
            <motion.div
              className="viz-controls"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: 5, type: 'spring' }}
            >
              {[
                { id: 'hexagon' as DeckLayerMode, label: 'Density', icon: Hexagon, desc: '3D Hexagons' },
                { id: 'arcs' as DeckLayerMode, label: 'Connections', icon: Zap, desc: 'Arc Lines' },
                { id: 'trips' as DeckLayerMode, label: 'Traffic', icon: Sparkles, desc: 'Animated' },
                { id: 'all' as DeckLayerMode, label: 'All Layers', icon: Box, desc: 'Everything' },
              ].map((viz, i) => (
                <motion.button
                  key={viz.id}
                  className={`viz-btn glass-panel ${deckMode === viz.id ? 'active' : ''}`}
                  onClick={() => {
                    mapRef.current?.stopOrbit();
                    setDeckMode(deckMode === viz.id ? null : viz.id);
                    if (viz.id === 'hexagon' || viz.id === 'all') {
                      mapRef.current?.flyTo({ pitch: 60, zoom: 13, bearing: 30 });
                    }
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 5 + i * 0.1 }}
                  title={viz.desc}
                >
                  <viz.icon size={18} />
                  <span className="viz-label">{viz.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Place card */}
        <AnimatePresence>
          {selectedPlace && mode !== 'directions' && (
            <PlaceCard
              key="place"
              place={selectedPlace}
              onClose={() => { setSelectedPlace(null); mapRef.current?.clearMarkers(); }}
              onDirections={() => { setSelectedPlace(null); setMode('directions'); }}
            />
          )}
        </AnimatePresence>

        {/* Bottom navigation */}
        <motion.nav
          className="bottom-nav glass-panel"
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          transition={{ delay: 3.5, type: 'spring', bounce: 0.2 }}
        >
          {[
            { id: 'explore', label: 'Explore', icon: Compass },
            { id: 'directions', label: 'Go', icon: NavIcon },
            { id: 'visualize', label: 'Visualize', icon: Box },
            { id: 'saved', label: 'Saved', icon: Heart },
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${mode === item.id || (item.id === 'explore' && mode === 'search') ? 'active' : ''}`}
              onClick={() => {
                if (item.id === 'explore') { setMode('explore'); setDeckMode(null); mapRef.current?.clearRoute(); mapRef.current?.clearMarkers(); setSelectedPlace(null); }
                else if (item.id === 'directions') { setMode('directions'); setDeckMode(null); mapRef.current?.stopOrbit(); }
                else if (item.id === 'visualize') {
                  setMode('explore');
                  setDeckMode('all');
                  mapRef.current?.stopOrbit();
                  mapRef.current?.flyTo({ pitch: 60, zoom: 13, bearing: 30 });
                }
              }}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
            </button>
          ))}
        </motion.nav>
      </div>
    </div>
  );
}
