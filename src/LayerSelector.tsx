import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Map, Satellite, Globe } from 'lucide-react';
import type { MapStyle } from './MapComponent';

interface Props {
  onStyleChange: (style: MapStyle) => void;
}

export default function LayerSelector({ onStyleChange }: Props) {
  const [open, setOpen] = useState(false);
  const [activeStyle, setActiveStyle] = useState<MapStyle>('default');

  const styles: { id: MapStyle; label: string; icon: typeof Map; desc: string }[] = [
    { id: 'default', label: 'Default', icon: Map, desc: '3D Buildings' },
    { id: 'satellite', label: 'Satellite', icon: Satellite, desc: 'Aerial view' },
    { id: 'hybrid', label: 'Hybrid', icon: Globe, desc: 'Satellite + labels' },
  ];

  return (
    <div className="layer-selector-container">
      <motion.button
        className="layer-toggle-btn glass-panel"
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Map layers"
      >
        <Layers size={20} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="layer-panel glass-panel"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <span className="layer-panel-title">Map type</span>
            <div className="layer-options">
              {styles.map(s => (
                <button
                  key={s.id}
                  className={`layer-option ${activeStyle === s.id ? 'active' : ''}`}
                  onClick={() => { setActiveStyle(s.id); onStyleChange(s.id); setOpen(false); }}
                >
                  <div className={`layer-preview ${s.id}`}>
                    <s.icon size={22} />
                  </div>
                  <span className="layer-label">{s.label}</span>
                  <span className="layer-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open && <div className="layer-overlay" onClick={() => setOpen(false)} />}
    </div>
  );
}
