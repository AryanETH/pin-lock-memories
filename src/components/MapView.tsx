import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { motion } from 'framer-motion';
import { Icon as LeafletIcon, LatLngExpression } from 'leaflet';
import type { MarkerProps, TileLayerProps, MapContainerProps } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Pin } from '@/lib/db';
import { MapPin } from 'lucide-react';

// Fix Leaflet default icon issue
const defaultIcon = new LeafletIcon({
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

export default function MapView({ pins, onMapClick, onPinClick, userLocation }: MapViewProps) {
  const defaultCenter: LatLngExpression = userLocation || [37.7749, -122.4194]; // SF default
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(defaultCenter);

  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  }, [userLocation]);

  const mapContainerProps = {
    center: mapCenter,
    zoom: 13,
    style: { height: '100%', width: '100%' },
    zoomControl: true,
  } as MapContainerProps;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-full w-full rounded-2xl overflow-hidden shadow-elevated"
    >
      <MapContainer {...mapContainerProps}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        <MapClickHandler onClick={onMapClick} />

        {pins.map((pin) => {
          const markerProps = {
            position: [pin.lat, pin.lng] as [number, number],
            icon: defaultIcon,
            eventHandlers: {
              click: () => onPinClick(pin),
            },
          } as MarkerProps;
          
          return (
            <Marker key={pin.id} {...markerProps}>
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
          );
        })}

        {userLocation && (() => {
          const userMarkerProps = {
            position: userLocation as [number, number],
            icon: defaultIcon,
          } as MarkerProps;
          
          return (
            <Marker {...userMarkerProps}>
              <Popup>
                <p className="text-sm font-medium">You are here</p>
              </Popup>
            </Marker>
          );
        })()}
      </MapContainer>
    </motion.div>
  );
}
