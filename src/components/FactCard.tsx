import { motion } from 'framer-motion';
import { Heart, Share2, Bookmark, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export interface LocationFact {
  fact: string;
  placeName: string;
  distance: number;
  imageUrl?: string;
  coordinates: { lat: number; lng: number };
}

interface FactCardProps {
  fact: LocationFact;
  onClose: () => void;
  onSave: (fact: LocationFact) => void;
}

export default function FactCard({ fact, onClose, onSave }: FactCardProps) {
  const handleShare = () => {
    const shareText = `${fact.placeName}: ${fact.fact}`;
    if (navigator.share) {
      navigator.share({
        title: `Fact about ${fact.placeName}`,
        text: shareText,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Fact copied to clipboard!');
    }
  };

  const handleLike = () => {
    toast.success('Thanks for liking this fact! ❤️');
  };

  const handleSave = () => {
    onSave(fact);
    toast.success('Fact saved! 🔖');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4"
    >
      <Card className="relative shadow-2xl border-2 border-white/20 backdrop-blur-xl bg-white/95 dark:bg-black/95">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted/50 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>
        
        <CardContent className="p-0">
          {fact.imageUrl && (
            <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
              <img
                src={fact.imageUrl}
                alt={fact.placeName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-6">
            <div className="flex items-start gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {fact.placeName}
                </h3>
                {fact.distance > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {fact.distance.toFixed(1)} km from this place
                  </p>
                )}
              </div>
            </div>
            
            <p className="text-sm text-foreground leading-relaxed mb-4">
              {fact.fact}
            </p>
            
            <div className="flex items-center gap-2 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className="flex-1"
              >
                <Heart className="w-4 h-4 mr-2" />
                Like
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                className="flex-1"
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
        
        {/* Pointing arrow */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-white dark:border-t-black" />
      </Card>
    </motion.div>
  );
}
