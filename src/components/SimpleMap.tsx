import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Pin } from '@/lib/db';

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
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const center: [number, number] = userLocation || [37.7749, -122.4194];
    const map = L.map(containerRef.current).setView(center, 13);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Handle map clicks
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

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

  // Handle map clicks to detect nearby pins
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    
    // Remove old click handler if exists
    map.off('click');
    
    // Add new click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;
      
      // Check if click is within 100m of any pin
      const nearbyPin = pins.find(pin => {
        const distance = map.distance([clickLat, clickLng], [pin.lat, pin.lng]);
        return distance <= 100; // 100 meters
      });
      
      if (nearbyPin) {
        // Found a nearby pin, trigger unlock
        onPinClick(nearbyPin);
      } else {
        // No nearby pin, create new memory
        onMapClick(clickLat, clickLng);
      }
    });
  }, [pins, onMapClick, onPinClick]);

  // Update user location marker only
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Only manage user location marker
    if (userLocation && !currentMarkers.has('user-location')) {
      const userMarker = L.marker(userLocation)
        .addTo(map)
        .bindPopup('<p class="text-sm font-medium">You are here</p>');
      currentMarkers.set('user-location', userMarker);
    } else if (!userLocation && currentMarkers.has('user-location')) {
      currentMarkers.get('user-location')?.remove();
      currentMarkers.delete('user-location');
    } else if (userLocation && currentMarkers.has('user-location')) {
      currentMarkers.get('user-location')?.setLatLng(userLocation);
    }
  }, [userLocation]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-full w-full rounded-2xl overflow-hidden shadow-elevated"
    >
      <div ref={containerRef} className="h-full w-full" />
    </motion.div>
  );
}
