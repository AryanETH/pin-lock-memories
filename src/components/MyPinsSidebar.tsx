import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pin } from '@/lib/db';
import { toast } from 'sonner';

interface MyPinsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pins: Pin[];
  onViewPin: (pin: Pin) => void;
  onDeletePin: (id: string) => void;
}

export default function MyPinsSidebar({
  isOpen,
  onClose,
  pins,
  onViewPin,
  onDeletePin,
}: MyPinsSidebarProps) {
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this memory?')) {
      onDeletePin(id);
      toast.success('Memory deleted');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 bottom-0 z-[9999] w-full max-w-md glass-card rounded-l-2xl p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">My Pins</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pins.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No memories locked yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Tap on the map to create your first memory
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pins.map((pin) => (
                  <motion.div
                    key={pin.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pin.photos.length} photo{pin.photos.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(pin.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {pin.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {pin.photos.slice(0, 3).map((photo) => (
                          <div
                            key={photo.id}
                            className="aspect-square rounded-lg overflow-hidden"
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

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onViewPin(pin);
                          onClose();
                        }}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pin.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
