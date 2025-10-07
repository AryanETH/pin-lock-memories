import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import FileViewer from '@/components/FileViewer';
import { getPinByShareToken, logAccess, Pin } from '@/lib/db';
import { toast } from 'sonner';

export default function SharedMemory() {
  const { token } = useParams<{ token: string }>();
  const [pin, setPin] = useState<Pin | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [viewsThisSession, setViewsThisSession] = useState(0);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const p = await getPinByShareToken(token);
      if (!p || !p.shareToken) {
        toast.error('This shared link is invalid or revoked');
        return;
      }
      setPin(p);
      setGalleryOpen(true);
      await logAccess(p.id, 'share');
      setViewsThisSession((v) => v + 1);
    })();
  }, [token]);

  if (!pin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{pin.name}</h1>
          <Link to="/">
            <Button variant="secondary">Back to map</Button>
          </Link>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-muted-foreground mb-4">Shared memory. Anyone with this link can view it—no PIN required.</p>
          <p className="text-xs text-muted-foreground mb-4">Views this session: {viewsThisSession}</p>
          <Button className="bg-gradient-primary text-white" onClick={() => setGalleryOpen(true)}>Open Gallery</Button>
          <Button variant="ghost" className="ml-2 text-destructive" onClick={() => toast.message('Thanks for the report. Our team will review.')}>Report memory</Button>
        </div>
      </div>

      <FileViewer isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} files={pin.files} />
    </div>
  );
}
