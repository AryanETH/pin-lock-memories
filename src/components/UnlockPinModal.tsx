import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Unlock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyPin } from '@/lib/crypto';
import { Pin } from '@/lib/db';
import { toast } from 'sonner';

interface UnlockPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  pin: Pin | null;
  onUnlock: (pin: Pin) => void;
}

export default function UnlockPinModal({ isOpen, onClose, pin, onUnlock }: UnlockPinModalProps) {
  const [inputPin, setInputPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async () => {
    if (!pin || inputPin.length !== 4) return;

    setLoading(true);
    try {
      const isValid = await verifyPin(inputPin, pin.pinHash);
      if (isValid) {
        onUnlock(pin);
        toast.success('Memory unlocked! 🔓');
        handleClose();
      } else {
        setShake(true);
        toast.error('Invalid PIN');
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
    onClose();
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
                  {pin.photos.length} photo{pin.photos.length !== 1 ? 's' : ''} locked here
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter PIN"
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading || inputPin.length !== 4}
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity text-white font-semibold"
                size="lg"
              >
                <Unlock className="w-5 h-5 mr-2" />
                {loading ? 'Unlocking...' : 'Unlock'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
