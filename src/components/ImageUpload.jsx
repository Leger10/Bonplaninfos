import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const ImageUpload = ({ 
  onImageUploaded, 
  existingImage,
  folder = 'event-covers',
  maxSizeMB = 2,
  aspectRatio = '16/9',
  className = '',
  bucket = 'media',
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(existingImage || '');
  const [compressionSaved, setCompressionSaved] = useState(0);
  const fileInputRef = useRef(null);

  // Conversion complète vers JPEG (un format universellement supporté)
  const convertToSupportedFormat = async (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Dimensions optimisées
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dessiner l'image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir en JPEG avec compression
        canvas.toBlob(
          (blob) => {
            const originalSize = file.size;
            const compressedSize = blob.size;
            const savedPercent = ((originalSize - compressedSize) / originalSize * 100).toFixed(0);
            setCompressionSaved(savedPercent);
            
            // Créer un fichier JPEG
            const convertedFile = new File(
              [blob], 
              file.name.replace(/\.[^/.]+$/, '.jpg'), 
              { type: 'image/jpeg' }
            );
            resolve(convertedFile);
          },
          'image/jpeg',
          0.75 // 75% qualité
        );
      };
      
      img.onerror = () => reject(new Error('Impossible de charger l\'image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier taille
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: `La taille maximale est de ${maxSizeMB}MB.`,
        variant: "destructive",
      });
      return;
    }

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Format non supporté",
        description: "Veuillez sélectionner une image.",
        variant: "destructive",
      });
      return;
    }

    // Créer un aperçu immédiat
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    // Upload avec conversion automatique
    await uploadFile(file);
  };

  const uploadFile = async (originalFile) => {
    setUploading(true);
    setCompressionSaved(0);
    
    try {
      let fileToUpload = originalFile;
      let conversionMessage = '';
      
      // TOUJOURS convertir en JPEG pour éviter les erreurs mime
      // Même si c'est déjà un JPEG, on recompresse pour réduire la taille
      conversionMessage = `Conversion et compression en cours...`;
      
      try {
        // Convertir en JPEG (format universel)
        fileToUpload = await convertToSupportedFormat(originalFile);
        conversionMessage = `✅ Image convertie en JPEG et compressée (${compressionSaved}% économisés)`;
      } catch (conversionError) {
        console.error('Conversion error:', conversionError);
        // Fallback: essayer d'uploader l'original
        console.log('Fallback: upload du fichier original');
        conversionMessage = `⚠️ Upload du format original`;
      }

      // Générer un nom de fichier unique
      const fileExt = 'jpg'; // Forcer l'extension jpg
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      // Upload vers Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileToUpload, {
          cacheControl: '31536000', // 1 an
          upsert: false,
          contentType: 'image/jpeg', // Forcer le bon mime type
        });

      if (uploadError) {
        throw uploadError;
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Nettoyer l'URL temporaire
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      // Mettre à jour l'aperçu
      setPreviewUrl(publicUrl);

      // Callback avec l'URL uploadée
      if (onImageUploaded) {
        onImageUploaded(publicUrl);
      }

      // Message de succès
      toast({
        title: "✅ Image téléchargée avec succès",
        description: conversionMessage || `Upload réussi (${compressionSaved}% économisés)`,
        duration: 4000,
      });

      // Supprimer l'ancienne image si elle existe
      if (existingImage && existingImage.includes('supabase.co') && existingImage !== publicUrl) {
        try {
          const oldPathMatch = existingImage.match(/\/([^\/]+\.(jpg|jpeg|png|webp))$/);
          if (oldPathMatch) {
            const oldFileName = oldPathMatch[1];
            await supabase.storage.from(bucket).remove([`${folder}/${oldFileName}`]);
            console.log('Ancienne image supprimée:', oldFileName);
          }
        } catch (deleteError) {
          console.error('Erreur suppression ancienne image:', deleteError);
        }
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      // Nettoyer l'URL temporaire
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      
      toast({
        title: "❌ Erreur de téléchargement",
        description: error.message || "Impossible de télécharger l'image. Veuillez réessayer.",
        variant: "destructive",
      });
      
      // Réinitialiser l'aperçu
      setPreviewUrl(existingImage || '');
    } finally {
      setUploading(false);
      
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setCompressionSaved(0);
    if (onImageUploaded) {
      onImageUploaded('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: { files: dataTransfer.files } });
      }
    }
  };

  // Nettoyage
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        id="image-upload"
      />
      
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${previewUrl 
            ? 'border-primary/50 bg-background' 
            : 'border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-900/50'
          }
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        {previewUrl ? (
          <div className="relative group">
            <div 
              className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900"
              style={{ aspectRatio }}
            >
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  console.error('Image load error');
                  e.target.onerror = null;
                  e.target.src = '/photoequipe.jpg';
                }}
              />
              
              {uploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-3" />
                    <p className="text-white text-sm font-medium">
                      Conversion et upload...
                    </p>
                    {compressionSaved > 0 && (
                      <p className="text-green-400 text-xs mt-2 font-medium">
                        ✨ {compressionSaved}% économisés
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="absolute top-3 right-3 flex gap-2">
              {!uploading && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-all bg-white/90 hover:bg-white shadow-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-400" />
              )}
            </div>
            
            <div className="space-y-2">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {uploading ? 'Conversion en cours...' : 'Cliquez pour télécharger une image'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tous formats acceptés (PNG, WEBP, JPG, HEIC) • Max {maxSizeMB}MB
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✨ Conversion automatique en JPEG optimisé
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-300">
            <p className="font-medium mb-1">✨ Optimisations automatiques :</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Conversion automatique en JPEG (100% compatible)</li>
              <li>Compression jusqu'à 70% d'économies</li>
              <li>Redimensionnement 800x600 max</li>
              <li>Cache CDN 1 an</li>
              <li>Réduction de l'utilisation Supabase</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;