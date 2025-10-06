import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Moon, Sun, List } from 'lucide-react';
import SimpleMap from '@/components/SimpleMap';
import CreatePinModal from '@/components/CreatePinModal';
import UnlockPinModal from '@/components/UnlockPinModal';
import FileViewer from '@/components/FileViewer';
import MyPinsSidebar from '@/components/MyPinsSidebar';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { Pin, savePin, getAllPins, deletePin } from '@/lib/db';
import { getCurrentPosition, isWithinRadius } from '@/lib/geo';
import { toast } from 'sonner';

export default function Index() {
  const { theme, toggleTheme } = useTheme();
  const [pins, setPins] = useState<Pin[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadPins();
    getUserLocation();
  }, []);

  const loadPins = async () => {
    try {
      const allPins = await getAllPins();
      setPins(allPins);
    } catch (error) {
      toast.error('Failed to load pins');
    }
  };

  const getUserLocation = async () => {
    try {
      const position = await getCurrentPosition();
      setUserLocation([position.coords.latitude, position.coords.longitude]);
    } catch (error) {
      console.warn('Geolocation not available');
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setPendingLocation({ lat, lng });
    setCreateModalOpen(true);
  };

  const handlePinClick = (pin: Pin) => {
    // Tap-based unlock - no location check needed
    setSelectedPin(pin);
    setUnlockModalOpen(true);
  };

  const handleSavePin = async (pin: Pin) => {
    try {
      await savePin(pin);
      await loadPins();
    } catch (error) {
      toast.error('Failed to save pin');
    }
  };

  const handleUnlock = (pin: Pin) => {
    setSelectedPin(pin);
    setGalleryOpen(true);
  };

  const handleDeletePin = async (id: string) => {
    try {
      await deletePin(id);
      await loadPins();
    } catch (error) {
      toast.error('Failed to delete pin');
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Header Bar */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute top-0 left-0 right-0 z-10 p-4"
      >
        <div className="glass-card px-6 py-3 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <MapPin className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-gradient">GeoVault</h1>
          </motion.div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Map */}
      <div className="absolute inset-0 pt-20 pb-6 px-6">
        <SimpleMap
          pins={pins}
          onMapClick={handleMapClick}
          onPinClick={handlePinClick}
          userLocation={userLocation}
        />
      </div>

      {/* Floating My Pins Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.3 }}
        className="absolute bottom-8 right-8 z-10"
      >
        <Button
          onClick={() => setSidebarOpen(true)}
          size="lg"
          className="rounded-full shadow-elevated bg-gradient-primary hover:opacity-90 text-white font-semibold"
        >
          <List className="w-5 h-5 mr-2" />
          My Pins
        </Button>
      </motion.div>

      {/* Modals */}
      <CreatePinModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        lat={pendingLocation?.lat || 0}
        lng={pendingLocation?.lng || 0}
        onSave={handleSavePin}
      />

      <UnlockPinModal
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        pin={selectedPin}
        onUnlock={handleUnlock}
      />

      <FileViewer
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        files={selectedPin?.files || []}
      />

      <MyPinsSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pins={pins}
        onViewPin={(pin) => {
          setSelectedPin(pin);
          setGalleryOpen(true);
        }}
        onDeletePin={handleDeletePin}
      />
    </div>
  );
}
