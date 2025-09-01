# Smart Maps 3D

> A revolutionary 3D mapping platform built with MapLibre GL JS, deck.gl GPU-powered visualization, and Apple-level UI design.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![MapLibre](https://img.shields.io/badge/MapLibre_GL-396CB2?style=flat-square&logo=maplibre&logoColor=white)
![deck.gl](https://img.shields.io/badge/deck.gl-FF6600?style=flat-square&logo=uber&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

## Features

### 🌍 3D Map Engine
- **OpenFreeMap Liberty** — free, realistic 3D buildings, no API key required
- **Cinematic orbital intro** from space, zooming into Mumbai with custom easing
- **Auto-orbit** around landmarks until user interacts
- **Satellite/Default** layer switching

### 🧊 GPU-Powered 3D Visualization (deck.gl)
- **HexagonLayer** — 3D hexagonal heatmap columns showing activity density
- **ArcLayer** — curved light arcs connecting Mumbai's major landmarks
- **TripsLayer** — animated vehicle trails flowing through city routes
- **ScatterplotLayer** — scattered data particles with color/size encoding
- All layers are GPU-accelerated for 60fps performance

### 🔍 Smart Search
- Real-time geocoding via **Nominatim** (OpenStreetMap)
- Debounced autocomplete with contextual emoji icons (🍽️ 🏨 🚉 🏛️)
- Reverse geocoding on map click

### 🧭 Real Directions
- Turn-by-turn routing via **OSRM** (Open Source Routing Machine)
- Drive / Bike / Walk profiles
- Animated route drawing with progressive reveal
- Step-by-step navigation instructions

### 🎨 Apple-Level Design
- Glassmorphic panels with `backdrop-filter` blur
- Framer Motion spring physics on every interaction
- Google Sans typography with tight tracking
- Bottom navigation bar (Explore / Go / Visualize / Saved)
- Explore chips (Restaurants, Hotels, Petrol, ATMs, Shopping, Attractions)
- Place cards with ratings, open hours, phone, website
- Custom marker drop animation with pulse rings
- Atmospheric vignette overlay
- Cinematic loading screen with globe spinner

## Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Map Engine | MapLibre GL JS | Free |
| Map Tiles | OpenFreeMap Liberty | Free, no key |
| 3D Viz | deck.gl (WebGL) | Free |
| Search | Nominatim | Free, no key |
| Routing | OSRM | Free, no key |
| UI | React + Framer Motion | Free |
| Build | Vite + TypeScript | Free |

**Total cost: $0**

## Quick Start

```bash
git clone https://github.com/Flamechargerr/smart-maps-3d.git
cd smart-maps-3d
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Architecture

```
src/
├── App.tsx              # Main app shell, routing, state management
├── MapComponent.tsx     # MapLibre GL JS with cinematic intro & orbit
├── DeckOverlay.tsx      # deck.gl GPU 3D visualization layers
├── SearchPanel.tsx      # Nominatim geocoding with autocomplete
├── DirectionsPanel.tsx  # OSRM routing with turn-by-turn
├── PlaceCard.tsx        # Place details bottom sheet
├── LayerSelector.tsx    # Map style switcher
├── index.css            # 700+ lines of premium CSS
└── main.tsx             # Entry point
```

## License

MIT
