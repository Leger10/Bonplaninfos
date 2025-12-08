import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const ImageUpload = ({ onImageUploaded, existingImage }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(existingImage || null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast({ title: "Format invalide", description: "Veuillez sélectionner une image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({ title: "Image trop lourde", description: "La taille maximum est de 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    
    // Create local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `event-covers/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      console.log("Image uploaded:", publicUrl);
      onImageUploaded(publicUrl);
      toast({ title: "Image téléchargée", description: "L'image de couverture a été ajoutée avec succès." });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: "Erreur", description: "Impossible de télécharger l'image.", variant: "destructive" });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageUploaded(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full space-y-4">
      <div 
        className={`
          relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all
          ${preview ? 'border-primary/50 bg-background' : 'border-muted-foreground/20 bg-muted/5 hover:bg-muted/10 cursor-pointer'}
        `}
        onClick={() => !preview && fileInputRef.current?.click()}
      >
        {preview ? (
          <div className="relative w-full h-full group overflow-hidden rounded-xl">
            <img src={preview} alt="Cover preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleRemove(); }}>
                <X className="w-4 h-4 mr-2" /> Supprimer
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 p-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {uploading ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <ImageIcon className="w-6 h-6 text-primary" />}
            </div>
            <div className="text-sm font-medium">
              <span className="text-primary">Cliquez pour ajouter</span> ou glissez une image ici
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (max 5MB)</p>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>
    </div>
  );
};

export default ImageUpload;