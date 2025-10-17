import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LocationFact } from './FactCard';

interface SavedFactsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  savedFacts: LocationFact[];
  onSelectFact: (fact: LocationFact) => void;
  onDeleteFact: (index: number) => void;
}

export default function SavedFactsMenu({ 
  isOpen, 
  onClose, 
  savedFacts, 
  onSelectFact,
  onDeleteFact 
}: SavedFactsMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-background border-r border-border shadow-2xl z-[9999]"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Saved Facts</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <ScrollArea className="h-[calc(100vh-73px)]">
              <div className="p-4 space-y-3">
                {savedFacts.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      No saved facts yet.
                      <br />
                      Tap "Save" on any fact card to add it here!
                    </p>
                  </div>
                ) : (
                  savedFacts.map((fact, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card p-4 rounded-xl hover:shadow-lg transition-shadow group"
                    >
                      {fact.imageUrls && fact.imageUrls.length > 0 && (
                        <img
                          src={fact.imageUrls[0]}
                          alt={fact.placeName}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-sm mb-1 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{fact.placeName}</span>
                      </h3>
                      {fact.distance > 0 && (
                        <p className="text-xs text-muted-foreground mb-2 ml-6">
                          {fact.distance.toFixed(1)} km away
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3 ml-6">
                        {fact.fact}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            onSelectFact(fact);
                            onClose();
                          }}
                          className="flex-1"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          View on Map
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteFact(index)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
