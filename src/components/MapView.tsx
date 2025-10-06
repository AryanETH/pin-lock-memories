// @ts-nocheck
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Pin } from '@/lib/db';
import { MapPin } from 'lucide-react';

// Fix Leaflet default icon issue
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapViewProps {
  pins: Pin[];
  onMapClick: (lat: number, lng: number) => void;
  onPinClick: (pin: Pin) => void;
  userLocation: [number, number] | null;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function PinMarkers({ pins, onPinClick }: { pins: Pin[]; onPinClick: (pin: Pin) => void }) {
  return (
    <>
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={defaultIcon}
          eventHandlers={{
            click: () => onPinClick(pin),
          }}
        >
          <Popup>
            <div className="text-center p-2">
              <MapPin className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Memory Locked</p>
              <p className="text-xs text-muted-foreground mt-1">
                {pin.photos.length} photo{pin.photos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function UserLocationMarker({ position }: { position: [number, number] }) {
  return (
    <Marker position={position} icon={defaultIcon}>
      <Popup>
        <p className="text-sm font-medium">You are here</p>
      </Popup>
    </Marker>
  );
}

export default function MapView({ pins, onMapClick, onPinClick, userLocation }: MapViewProps) {
  const defaultCenter: [number, number] = [37.7749, -122.4194]; // SF default
  const [mapCenter, setMapCenter] = useState<[number, number]>(userLocation || defaultCenter);

  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  }, [userLocation]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-full w-full rounded-2xl overflow-hidden shadow-elevated"
    >
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onClick={onMapClick} />
        <PinMarkers pins={pins} onPinClick={onPinClick} />
        {userLocation ? <UserLocationMarker position={userLocation} /> : null}
      </MapContainer>
    </motion.div>
  );
}
