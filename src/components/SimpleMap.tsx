import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Pin } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Map, Satellite, Share2, LocateFixed } from 'lucide-react';

// Fix default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface SimpleMapProps {
  pins: Pin[];
  onMapClick: (lat: number, lng: number) => void;
  onPinClick: (pin: Pin) => void;
  userLocation: [number, number] | null;
  onShareLocation?: (lat: number, lng: number, zoom: number, pinId?: string) => void;
  onMapReady?: (map: L.Map) => void;
}

export default function SimpleMap({ pins, onMapClick, onPinClick, userLocation, onShareLocation, onMapReady }: SimpleMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const [mapView, setMapView] = useState<'standard' | 'satellite'>('standard');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Check for URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const zoom = urlParams.get('zoom');

    // Initialize map with URL params or default location
    let center: [number, number];
    let initialZoom = 13;

    if (lat && lng) {
      center = [parseFloat(lat), parseFloat(lng)];
      if (zoom) {
        initialZoom = parseInt(zoom);
      }
    } else {
      center = userLocation || [37.7749, -122.4194];
    }

    const map = L.map(containerRef.current).setView(center, initialZoom);

    // Add initial tile layer
    const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    tileLayerRef.current = standardLayer;
    mapRef.current = map;

    // Notify parent that map is ready
    if (onMapReady) {
      onMapReady(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map center when user location changes
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView(userLocation, 13);
    }
  }, [userLocation]);

  // Handle map tile layer changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    const map = mapRef.current;
    
    // Remove current tile layer
    tileLayerRef.current.remove();

    // Add new tile layer based on view type
    if (mapView === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
        }
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
    }
  }, [mapView]);

  // Handle all map clicks and delegate proximity logic to parent
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    
    // Remove old click handler if exists
    map.off('click');
    
    // Add new click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;
      onMapClick(clickLat, clickLng);
    });
  }, [onMapClick]);

  // Update pins and user location markers
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Clear existing pin markers
    Object.keys(currentMarkers).forEach(key => {
      if (key !== 'user-location') {
        currentMarkers[key]?.remove();
        delete currentMarkers[key];
      }
    });

    // Add pin markers with proper icons
    pins.forEach((pin) => {
      const isPublic = pin.isPublic;
      const icon = L.divIcon({
        html: `
          <div class="pin-marker ${isPublic ? 'public' : 'private'}" style="
            width: 32px;
            height: 32px;
            background: ${isPublic ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)'};
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="
              transform: rotate(45deg);
              color: white;
              font-size: 14px;
              font-weight: bold;
              text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            ">
              ${isPublic ? '🌐' : '🔒'}
            </div>
          </div>
        `,
        className: 'custom-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      // Generate share link for this pin
      const baseUrl = window.location.origin;
      const shareLink = `${baseUrl}?lat=${pin.lat.toFixed(6)}&lng=${pin.lng.toFixed(6)}&zoom=15&pinId=${pin.id}`;

      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div class="pin-popup">
            <h3 class="font-semibold text-sm mb-1">${pin.name}</h3>
            <p class="text-xs text-muted-foreground mb-2">${isPublic ? 'Public memory' : 'Private memory'}</p>
            <p class="text-xs text-muted-foreground mb-3">Tap to unlock</p>
            
            <div class="share-section">
              <p class="text-xs text-muted-foreground mb-2">Share this pin:</p>
              <div class="share-link-container">
                <input type="text" value="${shareLink}" readonly class="share-link-input" onclick="this.select()" />
                <button onclick="copyShareLink('${shareLink}')" class="copy-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `)
        .on('click', () => onPinClick(pin));
      
      currentMarkers[pin.id] = marker;
    });

    // Manage user location marker
    if (userLocation && !currentMarkers['user-location']) {
      const userIcon = L.divIcon({
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #ef4444;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>
        `,
        className: 'user-location-pin',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      const userMarker = L.marker(userLocation, { icon: userIcon })
        .addTo(map)
        .bindPopup('<p class="text-sm font-medium">You are here</p>');
      currentMarkers['user-location'] = userMarker;
    } else if (!userLocation && currentMarkers['user-location']) {
      currentMarkers['user-location']?.remove();
      delete currentMarkers['user-location'];
    } else if (userLocation && currentMarkers['user-location']) {
      currentMarkers['user-location']?.setLatLng(userLocation);
    }
  }, [pins, userLocation, onPinClick]);

  // Add global functions for sharing location from popup
  useEffect(() => {
    (window as any).shareLocation = (lat: number, lng: number, pinId?: string) => {
      if (onShareLocation && mapRef.current) {
        const zoom = mapRef.current.getZoom();
        onShareLocation(lat, lng, zoom, pinId);
      }
    };

    (window as any).copyShareLink = (link: string) => {
      navigator.clipboard.writeText(link).then(() => {
        // Show a simple toast-like notification
        const toast = document.createElement('div');
        toast.textContent = 'Link copied to clipboard! 📋';
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.remove();
        }, 3000);
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
    };
  }, [onShareLocation]);

  const handleShareCurrentView = () => {
    if (mapRef.current && onShareLocation) {
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      onShareLocation(center.lat, center.lng, zoom);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-full w-full"
    >
      {/* Map Container with spacing from header */}
      <div className="map-container w-full h-full md:h-full aspect-[3/4] md:aspect-auto rounded-3xl overflow-hidden shadow-elevated mt-[14px] mb-[14px]">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* Map View Toggle Buttons - center bottom, glass style */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', damping: 20 }}
        className="map-controls absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-[1000] backdrop-blur-xl bg-white/15 dark:bg-black/20 rounded-[25px] px-3 md:px-4 py-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.2)] border border-white/20"
      >
        <Button
          onClick={() => setMapView('standard')}
          variant="ghost"
          size="sm"
          className={`transition-all ${mapView === 'standard' ? 'bg-gradient-primary text-white' : 'text-foreground/70 hover:bg-white/10'}`}
        >
          <Map className="w-4 h-4 mr-2" />
          Standard
        </Button>
         <Button
           onClick={() => setMapView('satellite')}
           variant="ghost"
           size="sm"
           className={`transition-all ${mapView === 'satellite' ? 'bg-gradient-primary text-white' : 'text-foreground/70 hover:bg-white/10'}`}
         >
           <Satellite className="w-4 h-4 mr-2" />
           Satellite
         </Button>
         {onShareLocation && (
           <Button
             onClick={handleShareCurrentView}
             variant="ghost"
             size="sm"
             className="text-foreground/70 hover:bg-white/10 transition-all"
           >
             <Share2 className="w-4 h-4 mr-2" />
             Share
           </Button>
         )}
       </motion.div>
    </motion.div>
  );
}
