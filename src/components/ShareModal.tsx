import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Pin, savePin } from '@/lib/db';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pin: Pin;
}

export default function ShareModal({ isOpen, onClose, pin }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = pin.shareToken 
    ? `${window.location.origin}/memory/${pin.shareToken}`
    : '';

  const generateShareLink = async () => {
    const token = crypto.randomUUID();
    const updatedPin = { ...pin, shareToken: token };
    await savePin(updatedPin);
    toast.success('Share link created!');
    window.location.reload(); // Refresh to show new token
  };

  const revokeShareLink = async () => {
    const updatedPin = { ...pin, shareToken: null };
    await savePin(updatedPin);
    toast.success('Share link revoked');
    onClose();
    window.location.reload();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="glass-card w-full max-w-md p-6 relative animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-gradient-primary">
                <Link2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Share My Space</h2>
                <p className="text-sm text-muted-foreground">
                  {pin.shareToken ? 'Your shareable link' : 'Create a shareable link'}
                </p>
              </div>
            </div>

            {!pin.shareToken ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate a unique link that anyone can use to view this memory—no PIN required.
                </p>
                <Button
                  onClick={generateShareLink}
                  className="w-full bg-gradient-primary text-white font-semibold"
                  size="lg"
                >
                  <Link2 className="w-5 h-5 mr-2" />
                  Generate Share Link
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    Anyone with this link can access your memory without a PIN.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={copyToClipboard}
                      size="icon"
                      variant="secondary"
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={revokeShareLink}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Revoke Share Link
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
