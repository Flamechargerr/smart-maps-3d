import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation, ArrowLeft, Car, Bike, Footprints, CornerDownRight } from 'lucide-react';

interface Props {
  onClose: () => void;
  onRoute: (origin: [number, number], dest: [number, number], profile: string) => void;
}

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function DirectionsPanel({ onClose, onRoute }: Props) {
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [profile, setProfile] = useState('driving');
  const [originResult, setOriginResult] = useState<GeoResult | null>(null);
  const [destResult, setDestResult] = useState<GeoResult | null>(null);
  const [originResults, setOriginResults] = useState<GeoResult[]>([]);
  const [destResults, setDestResults] = useState<GeoResult[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string; steps: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const geocode = async (q: string): Promise<GeoResult[]> => {
    if (q.length < 3) return [];
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      );
      return await res.json();
    } catch { return []; }
  };

  const fetchRoute = async () => {
    if (!originResult || !destResult) return;
    setLoading(true);
    const osrmProfile = profile === 'driving' ? 'car' : profile === 'cycling' ? 'bike' : 'foot';
    try {
      const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${originResult.lon},${originResult.lat};${destResult.lon},${destResult.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const km = (route.distance / 1000).toFixed(1);
        const mins = Math.round(route.duration / 60);
        const hrs = Math.floor(mins / 60);
        const duration = hrs > 0 ? `${hrs} hr ${mins % 60} min` : `${mins} min`;
        const steps = route.legs[0].steps
          .filter((s: any) => s.maneuver?.instruction)
          .map((s: any) => s.maneuver.instruction)
          .slice(0, 8);
        setRouteInfo({ distance: `${km} km`, duration, steps });
        const coords = route.geometry.coordinates;
        onRoute(
          [parseFloat(originResult.lon), parseFloat(originResult.lat)],
          [parseFloat(destResult.lon), parseFloat(destResult.lat)],
          profile
        );
        // Use a custom event to pass route coords and endpoints to map
        window.dispatchEvent(new CustomEvent('drawRoute', {
          detail: {
            coords,
            origin: [parseFloat(originResult.lon), parseFloat(originResult.lat)],
            dest: [parseFloat(destResult.lon), parseFloat(destResult.lat)]
          }
        }));
      }
    } catch (e) {
      console.error('Routing error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="directions-panel glass-panel"
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
    >
      <div className="dir-header">
        <button className="icon-btn" onClick={onClose}><ArrowLeft size={20} /></button>
        <span className="dir-title">Directions</span>
      </div>

      <div className="dir-profiles">
        {[
          { id: 'driving', icon: Car, label: 'Drive' },
          { id: 'cycling', icon: Bike, label: 'Bike' },
          { id: 'walking', icon: Footprints, label: 'Walk' }
        ].map(p => (
          <button
            key={p.id}
            className={`profile-btn ${profile === p.id ? 'active' : ''}`}
            onClick={() => setProfile(p.id)}
          >
            <p.icon size={18} />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <div className="dir-inputs">
        <div className="dir-input-row">
          <div className="dir-dot origin" />
          <div className="dir-input-wrap">
            <input
              placeholder="Choose starting point"
              value={origin}
              onChange={async e => {
                setOrigin(e.target.value);
                setOriginResult(null);
                const r = await geocode(e.target.value);
                setOriginResults(r);
              }}
            />
            {originResults.length > 0 && !originResult && (
              <div className="dir-suggestions">
                {originResults.map((r, i) => (
                  <button key={i} onClick={() => { setOrigin(r.display_name.split(',')[0]); setOriginResult(r); setOriginResults([]); }}>
                    {r.display_name.split(',').slice(0, 2).join(',')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="dir-input-row">
          <div className="dir-dot dest" />
          <div className="dir-input-wrap">
            <input
              placeholder="Choose destination"
              value={dest}
              onChange={async e => {
                setDest(e.target.value);
                setDestResult(null);
                const r = await geocode(e.target.value);
                setDestResults(r);
              }}
            />
            {destResults.length > 0 && !destResult && (
              <div className="dir-suggestions">
                {destResults.map((r, i) => (
                  <button key={i} onClick={() => { setDest(r.display_name.split(',')[0]); setDestResult(r); setDestResults([]); }}>
                    {r.display_name.split(',').slice(0, 2).join(',')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        className="route-btn"
        disabled={!originResult || !destResult || loading}
        onClick={fetchRoute}
      >
        <Navigation size={18} />
        {loading ? 'Finding route...' : 'Get Directions'}
      </button>

      {routeInfo && (
        <motion.div
          className="route-info"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="route-summary">
            <span className="route-duration">{routeInfo.duration}</span>
            <span className="route-distance">{routeInfo.distance}</span>
          </div>
          <div className="route-steps">
            {routeInfo.steps.map((step, i) => (
              <div key={i} className="route-step">
                <CornerDownRight size={14} />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
