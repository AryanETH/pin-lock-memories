import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Moon, Sun } from 'lucide-react';
import SimpleMap from '@/components/SimpleMap';
import CreatePinModal from '@/components/CreatePinModal';
import UnlockPinModal from '@/components/UnlockPinModal';
import FileViewer from '@/components/FileViewer';
import MemoryOptionsModal from '@/components/MemoryOptionsModal';
import ShareModal from '@/components/ShareModal';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { Pin, savePin, getAllPins, getPinById } from '@/lib/db';
import { getCurrentPosition, calculateDistance } from '@/lib/geo';
import { toast } from 'sonner';

export default function Index() {
  const { theme, toggleTheme } = useTheme();
  const [pins, setPins] = useState<Pin[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [memoryOptionsOpen, setMemoryOptionsOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadPins();
    getUserLocation();
    checkSharedMemory();
  }, []);

  const checkSharedMemory = async () => {
    const path = window.location.pathname;
    const match = path.match(/^\/memory\/(.+)$/);
    if (match) {
      const shareToken = match[1];
      const allPins = await getAllPins();
      const sharedPin = allPins.find(p => p.shareToken === shareToken);
      if (sharedPin) {
        setSelectedPin(sharedPin);
        setGalleryOpen(true);
        toast.success('Shared memory loaded!');
      } else {
        toast.error('Shared memory not found');
      }
    }
  };

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
    setSelectedPin(pin);
    setMemoryOptionsOpen(true);
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
    setMemoryOptionsOpen(false);
    setGalleryOpen(true);
  };

  const handleViewMemory = () => {
    setMemoryOptionsOpen(false);
    setUnlockModalOpen(true);
  };

  const handleLockNewMemory = () => {
    setMemoryOptionsOpen(false);
    setCreateModalOpen(true);
  };

  const handleShareMemory = () => {
    setMemoryOptionsOpen(false);
    setShareModalOpen(true);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Bar */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute top-0 left-0 right-0 z-10 p-4 pb-0"
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
      <div className="absolute inset-0 pt-20 pb-6 px-6 flex items-center justify-center">
        <SimpleMap
          pins={pins}
          onMapClick={handleMapClick}
          onPinClick={handlePinClick}
          userLocation={userLocation}
        />
      </div>

      {/* Modals */}
      <MemoryOptionsModal
        isOpen={memoryOptionsOpen}
        onClose={() => setMemoryOptionsOpen(false)}
        existingPin={selectedPin!}
        onViewMemory={handleViewMemory}
        onLockMemory={handleLockNewMemory}
        onShare={handleShareMemory}
        isOwner={true}
      />

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

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        pin={selectedPin!}
      />

      <FileViewer
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        files={selectedPin?.files || []}
      />
    </div>
  );
}
