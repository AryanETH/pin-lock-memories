import { useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Lock, FileIcon, Image, Video, Music, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hashPin } from '@/lib/crypto';
import { processFile, getFileType, ALL_ACCEPTED_TYPES } from '@/lib/files';
import { Pin, MemoryFile } from '@/lib/db';
import { toast } from 'sonner';

interface CreatePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  onSave: (pin: Pin) => void;
}

const FILE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
};

export default function CreatePinModal({ isOpen, onClose, lat, lng, onSave }: CreatePinModalProps) {
  const [pin, setPin] = useState('');
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    setLoading(true);
    try {
      const newFiles: MemoryFile[] = [];
      for (const file of Array.from(selectedFiles)) {
        const processedData = await processFile(file);
        const fileType = getFileType(file.type);
        
        newFiles.push({
          id: crypto.randomUUID(),
          data: processedData,
          type: fileType,
          mimeType: file.type,
          name: file.name,
          timestamp: Date.now(),
        });
      }
      setFiles((prev) => [...prev, ...newFiles]);
      toast.success(`Added ${newFiles.length} file(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process files');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    if (files.length === 0) {
      toast.error('Please upload at least one file');
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
        files,
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
    setFiles([]);
    onClose();
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
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
            className="glass-card w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto"
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
                <Label htmlFor="files" className="text-sm font-medium">
                  Upload Files
                </Label>
                <label
                  htmlFor="files"
                  className="mt-1.5 flex items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-xl hover:border-primary/50 cursor-pointer transition-colors"
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {files.length > 0 ? `${files.length} file(s) selected` : 'Choose files'}
                  </span>
                </label>
                <input
                  id="files"
                  type="file"
                  accept={ALL_ACCEPTED_TYPES}
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Images, videos, audio, documents supported
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map((file) => {
                    const Icon = FILE_ICONS[file.type];
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <Icon className="w-5 h-5 text-primary" />
                        <span className="flex-1 text-sm truncate">{file.name}</span>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 hover:bg-muted rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || pin.length !== 4 || files.length === 0}
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
