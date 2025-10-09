import { useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Lock, FileIcon, Image, Video, Music, FileText, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { hashPin } from '@/lib/crypto';
import { uploadFileToStorage, getFileType, ALL_ACCEPTED_TYPES } from '@/lib/files';
import { Pin, MemoryFile, getOrCreateDeviceId } from '@/lib/db';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface CreatePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  onSave: (pin: Pin) => void;
  presetPinHash?: string; // when re-tapping, use existing PIN
}

const FILE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
};

export default function CreatePinModal({ isOpen, onClose, lat, lng, onSave, presetPinHash }: CreatePinModalProps) {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState<number>(100); // Default 100m
  const [isPublic, setIsPublic] = useState<boolean>(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    // Just store files temporarily - we'll upload them when saving
    const newFiles: MemoryFile[] = Array.from(selectedFiles).map(file => ({
      id: crypto.randomUUID(),
      url: '', // Will be set after upload
      storagePath: '', // Will be set after upload
      type: getFileType(file.type),
      mimeType: file.type,
      name: file.name,
      timestamp: Date.now(),
      _file: file, // Store original file temporarily
    }));
    
    setFiles((prev) => [...prev, ...newFiles as any]);
    toast.success(`Added ${newFiles.length} file(s)`);
  };

  const handleSubmit = async () => {
    if (!presetPinHash) {
      if (pin.length < 4 || pin.length > 8 || !/^\d{4,8}$/.test(pin)) {
        toast.error('PIN must be 4–8 digits');
        return;
      }
    }

    if (files.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }

    if (name.trim().length === 0) {
      toast.error('Please enter a memory name');
      return;
    }

    setLoading(true);
    try {
      const pinHash = presetPinHash ? presetPinHash : await hashPin(pin);
      const pinId = crypto.randomUUID();
      const now = Date.now();

      // Upload all files to Supabase Storage
      const uploadedFiles: MemoryFile[] = [];
      for (const file of files) {
        const originalFile = (file as any)._file as File;
        const { storagePath, publicUrl } = await uploadFileToStorage(originalFile, pinId);
        
        uploadedFiles.push({
          id: file.id,
          url: publicUrl,
          storagePath,
          type: file.type,
          mimeType: file.mimeType,
          name: file.name,
          timestamp: now,
        });
      }

      const newPin: Pin = {
        id: pinId,
        lat,
        lng,
        name: name.trim(),
        pinHash,
        isPublic,
        shareToken: null,
        ownerUserId: getOrCreateDeviceId(),
        files: uploadedFiles,
        createdAt: now,
        updatedAt: now,
        radius: radius,
      };

      await onSave(newPin);
      toast.success('Memory locked successfully! 🔒');
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save memory');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setFiles([]);
    setRadius(100);
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
                <p className="text-xs text-muted-foreground mt-1">
                  Set a 4–8-digit PIN to protect your memory. Choose whether to keep it private or make it public.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Memory name</Label>
                <Input
                  id="name"
                  type="text"
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sunset at Ocean Beach"
                  className="mt-1.5"
                />
              </div>

              {!presetPinHash ? (
                <div>
                  <Label htmlFor="pin" className="text-sm font-medium">
                    Set 4–8-digit PIN
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="mt-1.5 text-center text-2xl tracking-widest"
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Using existing PIN for this location
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                <div className="flex items-center gap-3">
                  {isPublic ? <Globe className="w-5 h-5 text-primary" /> : <Shield className="w-5 h-5 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">Make memory public</p>
                    <p className="text-xs text-muted-foreground">Accessible to anyone on this spot with PIN</p>
                  </div>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <div>
                <Label htmlFor="radius" className="text-sm font-medium">
                  Discovery Radius: {radius}m
                </Label>
                <div className="mt-3">
                  <Slider
                    id="radius"
                    min={100}
                    max={1000}
                    step={50}
                    value={[radius]}
                    onValueChange={(values) => setRadius(values[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>100m</span>
                    <span>1km</span>
                  </div>
                </div>
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
                disabled={loading || (!presetPinHash && (pin.length < 4 || pin.length > 8)) || files.length === 0 || name.trim().length === 0}
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
