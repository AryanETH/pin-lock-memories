import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Moon, Sun, Eye, Lock, Share2, Globe, Shield } from 'lucide-react';
import SimpleMap from '@/components/SimpleMap';
import CreatePinModal from '@/components/CreatePinModal';
import UnlockPinModal from '@/components/UnlockPinModal';
import FileViewer from '@/components/FileViewer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';
import { Pin, savePin, getAllPins, updatePin, getPinByShareToken, logAccess, getOrCreateDeviceId } from '@/lib/db';
import { calculateDistance } from '@/lib/geo';
import { getCurrentPosition } from '@/lib/geo';
import { toast } from 'sonner';

export default function Index() {
  const { theme, toggleTheme } = useTheme();
  const [pins, setPins] = useState<Pin[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [retapModalOpen, setRetapModalOpen] = useState(false);
  const [retapTargetPin, setRetapTargetPin] = useState<Pin | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

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
    const existing = pins.find((p) => calculateDistance(lat, lng, p.lat, p.lng) <= 100);
    if (existing) {
      setRetapTargetPin(existing);
      setRetapModalOpen(true);
      return;
    }
    setPendingLocation({ lat, lng });
    setCreateModalOpen(true);
  };

  const handlePinClick = (pin: Pin) => {
    // Marker tap unlock
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
    logAccess(pin.id, 'pin');
  };

  const handleAppendToExisting = () => {
    if (!retapTargetPin || !pendingLocation) return;
    setCreateModalOpen(true);
  };

  const handleShareClick = () => {
    if (!retapTargetPin) return;
    setShareModalOpen(true);
  };

  const handleGenerateShare = async (pin: Pin) => {
    const token = crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).slice(2, 10);
    await updatePin(pin.id, { shareToken: token });
    await loadPins();
  };

  const handleRevokeShare = async (pin: Pin) => {
    await updatePin(pin.id, { shareToken: null });
    await loadPins();
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
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
      <div className="absolute inset-0 pt-20 pb-6 px-6 flex items-center justify-center">
        <SimpleMap
          pins={pins}
          onMapClick={handleMapClick}
          onPinClick={handlePinClick}
          userLocation={userLocation}
        />
      </div>

      {/* Modals */}
      <CreatePinModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        lat={pendingLocation?.lat || 0}
        lng={pendingLocation?.lng || 0}
        onSave={handleSavePin}
        presetPinHash={retapTargetPin ? retapTargetPin.pinHash : undefined}
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

      {/* Re-tap modal */}
      {retapModalOpen && retapTargetPin && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setRetapModalOpen(false)}>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 18 }} className="glass-card w-full max-w-md p-5 rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-gradient-primary"><MapPin className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="text-xl font-semibold">This location already holds your memories</h3>
                <p className="text-xs text-muted-foreground">{retapTargetPin.name || 'Saved Memory'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Button size="lg" className="w-full bg-gradient-primary text-white" onClick={() => { setSelectedPin(retapTargetPin); setUnlockModalOpen(true); setRetapModalOpen(false); }}>
                <Eye className="w-5 h-5 mr-2" /> View Memory
              </Button>
              <Button size="lg" variant="secondary" className="w-full" onClick={() => { setPendingLocation({ lat: retapTargetPin.lat, lng: retapTargetPin.lng }); setCreateModalOpen(true); setRetapModalOpen(false); }}>
                <Lock className="w-5 h-5 mr-2" /> Lock a Memory
              </Button>
              {retapTargetPin.ownerUserId === getOrCreateDeviceId() && (
                <Button size="lg" variant="outline" className="w-full" onClick={() => { setShareModalOpen(true); }}>
                  <Share2 className="w-5 h-5 mr-2" /> Share My Space
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Share modal */}
      {shareModalOpen && retapTargetPin && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShareModalOpen(false)}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: 'spring', damping: 18 }} className="glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-2">Share your space link</h3>
            <p className="text-sm text-muted-foreground mb-4">Anyone with this link can view it—no PIN required.</p>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 mb-3">
              <div>
                <p className="text-sm font-medium">Make memory public</p>
                <p className="text-xs text-muted-foreground">Discoverable at this spot with PIN</p>
              </div>
              <Switch checked={!!retapTargetPin.isPublic} onCheckedChange={async (checked) => {
                await updatePin(retapTargetPin.id, { isPublic: checked });
                setRetapTargetPin({ ...retapTargetPin, isPublic: checked });
                await loadPins();
                toast.success(checked ? 'Memory is now public' : 'Memory set to private');
              }} />
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-muted/40 break-all text-sm">
                {retapTargetPin.shareToken ? `${location.origin}/memory/${retapTargetPin.shareToken}` : 'No link yet'}
              </div>
              <div className="flex gap-2">
                {!retapTargetPin.shareToken ? (
                  <Button onClick={async () => { await handleGenerateShare(retapTargetPin); toast.success('Shareable link created'); }} className="bg-gradient-primary text-white">Create Link</Button>
                ) : (
                  <>
                    <Button onClick={() => { navigator.clipboard.writeText(`${location.origin}/memory/${retapTargetPin.shareToken}`); toast.success('Link copied'); }} className="bg-gradient-primary text-white">Copy Link</Button>
                    <Button variant="secondary" onClick={async () => { await handleGenerateShare(retapTargetPin); toast.success('Link regenerated'); }}>Regenerate</Button>
                    <Button variant="destructive" onClick={async () => { await handleRevokeShare(retapTargetPin); toast.success('Link revoked'); }}>Revoke</Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
