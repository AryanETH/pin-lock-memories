import { motion } from 'framer-motion';
import { Heart, Share2, Bookmark, MapPin, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export interface LocationFact {
  fact: string;
  placeName: string;
  distance: number;
  imageUrls?: string[];
  coordinates: { lat: number; lng: number };
}

interface FactCardProps {
  fact: LocationFact | null;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (fact: LocationFact) => void;
}

export default function FactCard({ fact, isLoading, onClose, onSave }: FactCardProps) {
  const [stats, setStats] = useState({ likes: 0, shares: 0, saves: 0 });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!fact) return;

    const fetchStats = async () => {
      const { data } = await supabase
        .from('location_stats')
        .select('*')
        .eq('lat', fact.coordinates.lat)
        .eq('lng', fact.coordinates.lng)
        .single();

      if (data) {
        setStats({ likes: data.likes, shares: data.shares, saves: data.saves });
      }
    };

    fetchStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`location_stats:${fact.coordinates.lat}:${fact.coordinates.lng}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_stats',
          filter: `lat=eq.${fact.coordinates.lat}`
        },
        (payload: any) => {
          if (payload.new) {
            setStats({ 
              likes: payload.new.likes, 
              shares: payload.new.shares, 
              saves: payload.new.saves 
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fact]);

  const updateStats = async (field: 'likes' | 'shares' | 'saves') => {
    if (!fact) return;

    const { data: existing } = await supabase
      .from('location_stats')
      .select('*')
      .eq('lat', fact.coordinates.lat)
      .eq('lng', fact.coordinates.lng)
      .single();

    if (existing) {
      await supabase
        .from('location_stats')
        .update({ [field]: existing[field] + 1 })
        .eq('lat', fact.coordinates.lat)
        .eq('lng', fact.coordinates.lng);
    } else {
      await supabase
        .from('location_stats')
        .insert({
          lat: fact.coordinates.lat,
          lng: fact.coordinates.lng,
          place_name: fact.placeName,
          [field]: 1
        });
    }
  };

  const handleShare = async () => {
    if (!fact) return;
    
    await updateStats('shares');
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

  const handleLike = async () => {
    await updateStats('likes');
    toast.success('Thanks for liking this fact! ❤️');
  };

  const handleSave = async () => {
    if (!fact) return;
    
    await updateStats('saves');
    onSave(fact);
    toast.success('Fact saved! 🔖');
  };

  const handleKnowMore = () => {
    if (!fact) return;
    const query = encodeURIComponent(`Information about ${fact.placeName}`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  const nextImage = () => {
    if (fact?.imageUrls) {
      setCurrentImageIndex((prev) => (prev + 1) % fact.imageUrls!.length);
    }
  };

  const prevImage = () => {
    if (fact?.imageUrls) {
      setCurrentImageIndex((prev) => (prev - 1 + fact.imageUrls!.length) % fact.imageUrls!.length);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4"
      >
        <Card className="relative shadow-2xl border-2 border-white/20 backdrop-blur-xl bg-white/95 dark:bg-black/95">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!fact) return null;

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
          {fact.imageUrls && fact.imageUrls.length > 0 && (
            <div className="relative w-full h-48 overflow-hidden rounded-t-lg group">
              <img
                src={fact.imageUrls[currentImageIndex]}
                alt={fact.placeName}
                className="w-full h-full object-cover"
              />
              {fact.imageUrls.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {fact.imageUrls.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="p-6">
            <div className="flex items-start gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
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

            <Button
              onClick={handleKnowMore}
              variant="outline"
              size="sm"
              className="w-full mb-4"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Know More
            </Button>
            
            <div className="flex items-center gap-2 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className="flex-1 flex-col h-auto py-2"
              >
                <Heart className="w-4 h-4 mb-1" />
                <span className="text-xs">{stats.likes}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex-1 flex-col h-auto py-2"
              >
                <Share2 className="w-4 h-4 mb-1" />
                <span className="text-xs">{stats.shares}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                className="flex-1 flex-col h-auto py-2"
              >
                <Bookmark className="w-4 h-4 mb-1" />
                <span className="text-xs">{stats.saves}</span>
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
