import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Pin } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Map, Satellite } from 'lucide-react';

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
}

export default function SimpleMap({ pins, onMapClick, onPinClick, userLocation }: SimpleMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapView, setMapView] = useState<'standard' | 'satellite'>('standard');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const center: [number, number] = userLocation || [37.7749, -122.4194];
    const map = L.map(containerRef.current).setView(center, 13);

    // Add initial tile layer
    const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    tileLayerRef.current = standardLayer;
    mapRef.current = map;

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

  // Update user location marker only
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Only manage user location marker
    if (userLocation && !currentMarkers['user-location']) {
      const userMarker = L.marker(userLocation)
        .addTo(map)
        .bindPopup('<p class="text-sm font-medium">You are here</p>');
      currentMarkers['user-location'] = userMarker;
    } else if (!userLocation && currentMarkers['user-location']) {
      currentMarkers['user-location']?.remove();
      delete currentMarkers['user-location'];
    } else if (userLocation && currentMarkers['user-location']) {
      currentMarkers['user-location']?.setLatLng(userLocation);
    }
  }, [userLocation]);

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
        className="map-controls absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3 z-[1000] backdrop-blur-xl bg-white/15 dark:bg-black/20 rounded-[25px] px-4 py-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.2)]"
      >
        <Button
          onClick={() => setMapView('standard')}
          variant={mapView === 'standard' ? 'default' : 'secondary'}
          size="sm"
          className={`${mapView === 'standard' ? 'bg-gradient-primary text-white' : 'bg-white/20 text-foreground hover:bg-white/30'}`}
        >
          <Map className="w-4 h-4 mr-2" />
          Standard
        </Button>
        <Button
          onClick={() => setMapView('satellite')}
          variant={mapView === 'satellite' ? 'default' : 'secondary'}
          size="sm"
          className={`${mapView === 'satellite' ? 'bg-gradient-primary text-white' : 'bg-white/20 text-foreground hover:bg-white/30'}`}
        >
          <Satellite className="w-4 h-4 mr-2" />
          Satellite
        </Button>
      </motion.div>
    </motion.div>
  );
}
