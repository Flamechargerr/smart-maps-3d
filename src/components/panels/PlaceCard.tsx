import { motion } from 'framer-motion';
import { X, Navigation, Share2, MapPin, Star, Phone, Globe, Clock } from 'lucide-react';

interface PlaceInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: string;
}

interface Props {
  place: PlaceInfo;
  onClose: () => void;
  onDirections: () => void;
}

function makeStableNumber(seed: string, min: number, max: number, decimals = 0) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 10000) / 10000;
  const value = min + (max - min) * normalized;
  return decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toString();
}

export default function PlaceCard({ place, onClose, onDirections }: Props) {
  const seed = `${place.name}-${place.lat}-${place.lng}`;
  const rating = makeStableNumber(seed, 3.5, 5, 1);
  const reviews = makeStableNumber(`${seed}-reviews`, 100, 1000);
  const phoneSuffix = makeStableNumber(`${seed}-phone`, 1000, 10000);
  
  return (
    <motion.div
      className="place-card glass-panel"
      initial={{ y: 200, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 200, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', bounce: 0.18, duration: 0.6 }}
    >
      {/* Drag handle */}
      <div className="place-drag-handle"><div className="drag-bar" /></div>

      <div className="place-card-header">
        <div className="place-header-text">
          <h3 className="place-name">{place.name}</h3>
          <div className="place-rating">
            <span className="rating-number">{rating}</span>
            <div className="rating-stars">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={12}
                  fill={i <= Math.round(parseFloat(rating)) ? '#fbbc04' : 'none'}
                  color={i <= Math.round(parseFloat(rating)) ? '#fbbc04' : '#dadce0'}
                />
              ))}
            </div>
            <span className="rating-count">({reviews})</span>
          </div>
          <p className="place-type">{place.type || 'Place'}</p>
        </div>
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
      </div>

      {/* Info rows */}
      <div className="place-info-rows">
        <div className="place-info-row">
          <MapPin size={16} />
          <span>{place.address.split(',').slice(0, 3).join(',')}</span>
        </div>
        <div className="place-info-row">
          <Clock size={16} />
          <span className="open-status">Open</span>
          <span className="open-hours">· Closes 10 PM</span>
        </div>
        <div className="place-info-row">
          <Phone size={16} />
          <span>+91 22 2284 {phoneSuffix}</span>
        </div>
        <div className="place-info-row">
          <Globe size={16} />
          <span className="link-text">{place.name.toLowerCase().replace(/\s/g, '')}.com</span>
        </div>
      </div>

      <div className="place-coords-tag">
        {place.lat.toFixed(5)}°N, {place.lng.toFixed(5)}°E
      </div>

      {/* Action buttons */}
      <div className="place-actions">
        <motion.button
          className="place-action-btn primary"
          onClick={onDirections}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Navigation size={16} />
          <span>Directions</span>
        </motion.button>
        <motion.button
          className="place-action-btn"
          onClick={() => navigator.clipboard?.writeText(`${place.lat}, ${place.lng}`)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Share2 size={16} />
          <span>Share</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
