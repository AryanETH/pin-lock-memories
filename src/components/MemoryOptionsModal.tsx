import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Plus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pin } from '@/lib/db';

interface MemoryOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPin: Pin;
  onViewMemory: () => void;
  onLockMemory: () => void;
  onShare: () => void;
  isOwner: boolean;
}

export default function MemoryOptionsModal({
  isOpen,
  onClose,
  existingPin,
  onViewMemory,
  onLockMemory,
  onShare,
  isOwner,
}: MemoryOptionsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="glass-card w-full max-w-md p-6 relative animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">
                {existingPin.isPublic ? '🌐' : '🔒'} Memory Found
              </h2>
              <p className="text-sm text-muted-foreground">
                This location already holds {isOwner ? 'your' : 'a'} memory. What would you like to do?
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={onViewMemory}
                className="w-full glass-button bg-gradient-primary text-white font-semibold h-14 text-lg"
                size="lg"
              >
                <Lock className="w-5 h-5 mr-2" />
                View Memory
              </Button>

              {isOwner && (
                <>
                  <Button
                    onClick={onLockMemory}
                    variant="secondary"
                    className="w-full glass-button h-14 text-lg"
                    size="lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Lock a Memory
                  </Button>

                  <Button
                    onClick={onShare}
                    variant="outline"
                    className="w-full glass-button h-14 text-lg"
                    size="lg"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share My Space
                  </Button>
                </>
              )}

              {!isOwner && existingPin.isPublic && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  This is a public memory. Enter the PIN to unlock.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
