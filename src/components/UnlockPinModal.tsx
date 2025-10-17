import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Unlock, Lock, Trash2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyPin } from '@/lib/crypto';
import { Pin, recordFailedAttempt, clearFailedAttempts, deletePin } from '@/lib/db';
import { toast } from 'sonner';

interface UnlockPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  pin: Pin | null;
  onUnlock: (pin: Pin) => void;
  onDelete?: (pin: Pin) => void;
}

export default function UnlockPinModal({ isOpen, onClose, pin, onUnlock, onDelete }: UnlockPinModalProps) {
  const [inputPin, setInputPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleSubmit = async () => {
    if (!pin || inputPin.length < 4 || inputPin.length > 8) return;

    setLoading(true);
    try {
      if (pin.lockUntil && Date.now() < pin.lockUntil) {
        const wait = Math.ceil((pin.lockUntil - Date.now()) / 1000);
        toast.error(`Too many attempts. Try again in ${wait}s`);
        return;
      }
      const isValid = await verifyPin(inputPin, pin.pinHash);
      if (isValid) {
        await clearFailedAttempts(pin.id);
        setShowActions(true);
        toast.success('PIN verified! 🔓');
      } else {
        setShake(true);
        const attempt = await recordFailedAttempt(pin.id);
        if (attempt?.lockedUntil) {
          const wait = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
          toast.error(`Too many attempts. Locked for ${wait}s`);
        } else {
          toast.error('Invalid PIN');
        }
        setTimeout(() => setShake(false), 400);
      }
    } catch (error) {
      toast.error('Failed to verify PIN');
    } finally {
      setLoading(false);
      setInputPin('');
    }
  };

  const handleClose = () => {
    setInputPin('');
    setShowActions(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!pin || !onDelete) return;
    try {
      await deletePin(pin.id);
      onDelete(pin);
      toast.success('Memory deleted successfully');
      handleClose();
    } catch (error) {
      toast.error('Failed to delete memory');
    }
  };

  const handleShare = () => {
    if (!pin) return;
    const shareLink = `${window.location.origin}?lat=${pin.lat.toFixed(6)}&lng=${pin.lng.toFixed(6)}&zoom=15&pinId=${pin.id}`;
    navigator.clipboard.writeText(shareLink);
    toast.success('Share link copied! 📋');
  };

  const handleView = () => {
    if (!pin) return;
    onUnlock(pin);
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && pin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              x: shake ? [0, -10, 10, -10, 10, 0] : 0 
            }}
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
                <h2 className="text-2xl font-bold">Unlock Memory</h2>
                <p className="text-sm text-muted-foreground">
                  {pin.isPublic ? 'This spot holds a public memory. Enter the PIN to unlock.' : 'Private memory. Enter your PIN to unlock.'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pin.files.length} file{pin.files.length !== 1 ? 's' : ''} • {pin.name}
                </p>
              </div>
            </div>

            {!showActions ? (
              <div className="space-y-4">
                <div>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter PIN"
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || inputPin.length < 4 || inputPin.length > 8}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity text-white font-semibold"
                  size="lg"
                >
                  <Unlock className="w-5 h-5 mr-2" />
                  {loading ? 'Unlocking...' : 'Unlock'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleView}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity text-white font-semibold"
                  size="lg"
                >
                  <Unlock className="w-5 h-5 mr-2" />
                  View Memory
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleShare}
                    variant="secondary"
                    size="lg"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="destructive"
                    size="lg"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
