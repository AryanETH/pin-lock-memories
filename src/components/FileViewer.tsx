import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { MemoryFile } from '@/lib/db';
import { Button } from '@/components/ui/button';

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  files: MemoryFile[];
}

export default function FileViewer({ isOpen, onClose, files }: FileViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? files.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === files.length - 1 ? 0 : prev + 1));
  };

  const handleDownload = () => {
    const file = files[currentIndex];
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    link.click();
  };

  const renderFile = (file: MemoryFile) => {
    switch (file.type) {
      case 'image':
        return (
          <img
            src={file.data}
            alt={file.name}
            className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
          />
        );
      case 'video':
        return (
          <video
            src={file.data}
            controls
            className="w-full h-auto max-h-[80vh] rounded-2xl"
          >
            Your browser does not support video playback.
          </video>
        );
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
            <div className="text-6xl mb-6">🎵</div>
            <p className="text-lg font-medium mb-6">{file.name}</p>
            <audio src={file.data} controls className="w-full max-w-md">
              Your browser does not support audio playback.
            </audio>
          </div>
        );
      case 'document':
        return (
          <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
            <div className="text-6xl mb-6">📄</div>
            <p className="text-lg font-medium mb-4">{file.name}</p>
            <p className="text-sm text-muted-foreground mb-6">
              Preview not available for documents
            </p>
            <Button onClick={handleDownload} className="bg-gradient-primary text-white">
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={handleDownload}
            className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <Download className="w-6 h-6 text-white" />
          </button>

          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {renderFile(files[currentIndex])}
            </motion.div>

            {files.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>

                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {files.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentIndex
                          ? 'bg-white w-8'
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
