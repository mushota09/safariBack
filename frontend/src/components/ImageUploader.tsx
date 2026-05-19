import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageUploaderProps {
    label: string;
    currentImage?: string;
    onUpload: (file: File) => Promise<string>;
    onRemove?: () => void;
    accept?: string;
    maxSize?: number; // en MB
    disabled?: boolean;
}

export default function ImageUploader({
    label,
    currentImage,
    onUpload,
    onRemove,
    accept = "image/*",
    maxSize = 5,
    disabled = false
}: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (file.size > maxSize * 1024 * 1024) {
            setError(`La taille du fichier ne doit pas dépasser ${maxSize}MB`);
            return;
        }

        if (!file.type.startsWith('image/')) {
            setError('Le fichier doit être une image');
            return;
        }

        setError(null);
        setUploading(true);

        try {
            // Créer un aperçu local
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);

            // Upload
            const url = await onUpload(file);
            setPreview(url);
        } catch (err: any) {
            setError(err.message || 'Erreur lors de l\'upload');
            setPreview(currentImage || null);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onRemove?.();
    };

    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">
                {label}
            </label>

            <div className="relative">
                {preview ? (
                    <div className="relative group">
                        <img
                            src={preview.startsWith('http') ? preview : `http://localhost:8000${preview}`}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-2xl border border-white/10"
                        />
                        {!disabled && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all"
                                >
                                    <Upload className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    className="w-12 h-12 rounded-xl bg-red-500/20 backdrop-blur-sm flex items-center justify-center text-red-500 hover:bg-red-500/30 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || disabled}
                        className="w-full h-48 rounded-2xl border-2 border-dashed border-white/10 hover:border-accent/40 bg-white/3 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                                <p className="text-sm font-bold text-white/40">Upload en cours...</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-accent group-hover:text-primary transition-all">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-white/40 group-hover:text-white transition-colors">
                                        Cliquer pour uploader
                                    </p>
                                    <p className="text-xs text-white/20 mt-1">
                                        Max {maxSize}MB • JPG, PNG, WEBP
                                    </p>
                                </div>
                            </>
                        )}
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileSelect}
                    disabled={disabled}
                    className="hidden"
                />
            </div>

            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-xs text-red-500 font-bold px-2"
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
