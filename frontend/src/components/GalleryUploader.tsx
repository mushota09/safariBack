import React, { useState } from 'react';
import { Plus, X, GripVertical, Loader2 } from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';

export interface GalleryImage {
    id: string | number;
    url: string;
    legende?: string;
}

interface GalleryUploaderProps {
    images: GalleryImage[];
    onAdd: (file: File, legende?: string) => Promise<void>;
    onRemove: (id: string | number) => void;
    onReorder?: (images: GalleryImage[]) => void;
    maxImages?: number;
    disabled?: boolean;
}

export default function GalleryUploader({
    images,
    onAdd,
    onRemove,
    onReorder,
    maxImages = 10,
    disabled = false
}: GalleryUploaderProps) {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            await onAdd(file);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">
                    Galerie de photos ({images.length}/{maxImages})
                </label>
            </div>

            {onReorder ? (
                <Reorder.Group
                    axis="y"
                    values={images}
                    onReorder={onReorder}
                    className="space-y-3"
                >
                    {images.map((image) => (
                        <Reorder.Item key={image.id} value={image}>
                            <div className="flex items-center gap-4 p-4 bg-white/3 rounded-2xl border border-white/5 group hover:bg-white/5 transition-all">
                                {!disabled && (
                                    <button
                                        type="button"
                                        className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white transition-colors"
                                    >
                                        <GripVertical className="w-5 h-5" />
                                    </button>
                                )}
                                <img
                                    src={image.url.startsWith('http') ? image.url : `http://localhost:8000${image.url}`}
                                    alt={image.legende || 'Gallery image'}
                                    className="w-20 h-20 object-cover rounded-xl"
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white/60 truncate">
                                        {image.legende || 'Sans légende'}
                                    </p>
                                </div>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => onRemove(image.id)}
                                        className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            ) : (
                <div className="space-y-3">
                    {images.map((image) => (
                        <div key={image.id} className="flex items-center gap-4 p-4 bg-white/3 rounded-2xl border border-white/5 group hover:bg-white/5 transition-all">
                            <img
                                src={image.url.startsWith('http') ? image.url : `http://localhost:8000${image.url}`}
                                alt={image.legende || 'Gallery image'}
                                className="w-20 h-20 object-cover rounded-xl"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white/60 truncate">
                                    {image.legende || 'Sans légende'}
                                </p>
                            </div>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => onRemove(image.id)}
                                    className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {images.length < maxImages && !disabled && (
                <label className="block">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="hidden"
                    />
                    <div className="w-full h-24 rounded-2xl border-2 border-dashed border-white/10 hover:border-accent/40 bg-white/3 hover:bg-white/5 transition-all flex items-center justify-center gap-3 cursor-pointer group">
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 text-accent animate-spin" />
                                <span className="text-sm font-bold text-white/40">
                                    Upload en cours...
                                </span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-5 h-5 text-white/40 group-hover:text-accent transition-colors" />
                                <span className="text-sm font-bold text-white/40 group-hover:text-white transition-colors">
                                    Ajouter une photo
                                </span>
                            </>
                        )}
                    </div>
                </label>
            )}
        </div>
    );
}
