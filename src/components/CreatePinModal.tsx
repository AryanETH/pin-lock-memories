import { useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hashPin } from '@/lib/crypto';
import { compressImage } from '@/lib/image';
import { Pin, Photo } from '@/lib/db';
import { toast } from 'sonner';

interface CreatePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  onSave: (pin: Pin) => void;
}

export default function CreatePinModal({ isOpen, onClose, lat, lng, onSave }: CreatePinModalProps) {
  const [pin, setPin] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setLoading(true);
    try {
      const newPhotos: Photo[] = [];
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        newPhotos.push({
          id: crypto.randomUUID(),
          data: compressed,
          timestamp: Date.now(),
        });
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
      toast.success(`Added ${newPhotos.length} photo(s)`);
    } catch (error) {
      toast.error('Failed to process images');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    if (photos.length === 0) {
      toast.error('Please upload at least one photo');
      return;
    }

    setLoading(true);
    try {
      const pinHash = await hashPin(pin);
      const newPin: Pin = {
        id: crypto.randomUUID(),
        lat,
        lng,
        pinHash,
        photos,
        createdAt: Date.now(),
      };

      await onSave(newPin);
      toast.success('Memory locked successfully! 🔒');
      handleClose();
    } catch (error) {
      toast.error('Failed to save memory');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setPhotos([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="glass-card w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-gradient-primary">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Lock a Memory</h2>
                <p className="text-sm text-muted-foreground">
                  {lat.toFixed(4)}, {lng.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="pin" className="text-sm font-medium">
                  Set 4-digit PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="mt-1.5 text-center text-2xl tracking-widest"
                />
              </div>

              <div>
                <Label htmlFor="photos" className="text-sm font-medium">
                  Upload Photos
                </Label>
                <label
                  htmlFor="photos"
                  className="mt-1.5 flex items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-xl hover:border-primary/50 cursor-pointer transition-colors"
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {photos.length > 0 ? `${photos.length} photo(s) selected` : 'Choose photos'}
                  </span>
                </label>
                <input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={photo.data}
                        alt="Memory"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || pin.length !== 4 || photos.length === 0}
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity text-white font-semibold"
                size="lg"
              >
                {loading ? 'Saving...' : 'Save Memory'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
