import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Pin } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Map, Satellite, Share2, LocateFixed, Navigation } from 'lucide-react';

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
    
    // Remove current tile layer and labels
    tileLayerRef.current.remove();
    if (labelsLayerRef.current) {
      labelsLayerRef.current.remove();
      labelsLayerRef.current = null;
    }

    // Add new tile layer based on view type
    if (mapView === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
        }
      ).addTo(map);
      
      // Add labels layer for satellite view
      labelsLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
        {
          attribution: '&copy; CARTO',
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

    // Pins are invisible - no markers rendered, only click detection works

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

  const handleLocateUser = () => {
    if (!mapRef.current) return;
    
    if (userLocation) {
      mapRef.current.setView(userLocation, 15, { animate: true });
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          mapRef.current?.setView(coords, 15, { animate: true });
        },
        () => {
          alert('Unable to retrieve your location');
        }
      );
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

      {/* Map Controls - bottom right, circular glass buttons */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2"
      >
        <Button
          variant="secondary"
          size="icon"
          onClick={handleLocateUser}
          className="rounded-full w-12 h-12 shadow-lg backdrop-blur-xl bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 border border-white/20"
          title="My Location"
        >
          <Navigation className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setMapView(mapView === 'standard' ? 'satellite' : 'standard')}
          className="rounded-full w-12 h-12 shadow-lg backdrop-blur-xl bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 border border-white/20"
          title={mapView === 'standard' ? 'Satellite View' : 'Standard View'}
        >
          {mapView === 'standard' ? (
            <Satellite className="w-5 h-5" />
          ) : (
            <Map className="w-5 h-5" />
          )}
        </Button>
        {onShareLocation && (
          <Button
            variant="secondary"
            size="icon"
            onClick={handleShareCurrentView}
            className="rounded-full w-12 h-12 shadow-lg backdrop-blur-xl bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 border border-white/20"
            title="Share Location"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
