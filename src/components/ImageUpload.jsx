import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { convertImageToSupportedFormat, needsImageConversion } from '@/utils/imageConverter';
import { toast } from '@/components/ui/use-toast';

const ImageUpload = ({ 
  onImageUploaded, 
  existingImage,
  folder = 'event-covers',
  maxSizeMB = 5,
  aspectRatio = '16/9',
  className = '',
  bucket = 'media', // Changed from 'images' to 'media' to match existing code
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(existingImage || '');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: `La taille maximale est de ${maxSizeMB}MB.`,
        variant: "destructive",
      });
      return;
    }

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Format non supporté",
        description: "Veuillez sélectionner une image (JPG, PNG, WEBP).",
        variant: "destructive",
      });
      return;
    }

    // Create immediate preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload the file
    await uploadFile(file);
  };

  const uploadFile = async (originalFile) => {
    setUploading(true);
    
    try {
      let fileToUpload = originalFile;
      let conversionMessage = '';
      
      // Check if conversion is needed
      if (needsImageConversion(originalFile)) {
        try {
          // Convert unsupported formats to JPEG
          fileToUpload = await convertImageToSupportedFormat(originalFile, {
            targetFormat: 'jpeg',
            quality: 0.85,
            maxWidth: 1920,
            maxHeight: 1080,
          });
          
          conversionMessage = `Votre image .${originalFile.name.split('.').pop()} a été convertie automatiquement en JPG pour être compatible.`;
          
        } catch (conversionError) {
          console.error('Image conversion failed:', conversionError);
          toast({
            title: "Erreur de conversion",
            description: "Impossible de convertir l'image. Veuillez utiliser un format JPG ou PNG.",
            variant: "destructive",
          });
          setUploading(false);
          setPreviewUrl(existingImage || '');
          return;
        }
      }

      // Generate unique filename
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileToUpload.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Clean up the temporary object URL
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      // Update preview with final URL
      setPreviewUrl(publicUrl);

      // Callback with the uploaded image URL
      if (onImageUploaded) {
        onImageUploaded(publicUrl);
      }

      // Show success messages
      toast({
        title: "Image téléchargée",
        description: "Votre image a été téléchargée avec succès.",
      });

      if (conversionMessage) {
        toast({
          title: "Conversion d'image",
          description: conversionMessage,
          duration: 4000,
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      // Clean up temporary URL on error
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      
      toast({
        title: "Erreur de téléchargement",
        description: error.message || "Impossible de télécharger l'image.",
        variant: "destructive",
      });
      
      // Reset preview on error
      setPreviewUrl(existingImage || '');
    } finally {
      setUploading(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    // Clean up temporary URL if exists
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setPreviewUrl('');
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

  // Clean up object URLs on unmount
  React.useEffect(() => {
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
                onError={(e) => {
                  console.error('Image load error:', e);
                  // Fallback to default image
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1501281668745-f6f2613e1e6f?auto=format&fit=crop&w=800&q=80';
                }}
              />
              
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                    <p className="text-white text-sm font-medium">
                      {previewUrl.startsWith('blob:') ? 'Conversion et téléchargement...' : 'Téléchargement...'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="absolute top-3 right-3 flex gap-2">
              {!uploading && (
                <>
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
                  
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-all bg-white/90 hover:bg-white shadow-lg"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </>
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
                {uploading ? 'Téléchargement en cours...' : 'Cliquez pour télécharger une image'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                JPG, PNG, WEBP, HEIC, HEIF • Max {maxSizeMB}MB
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Glissez-déposez une image ici
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>
          Les formats WEBP, HEIC et HEIF seront automatiquement convertis en JPG pour une compatibilité optimale.
        </span>
      </div>
    </div>
  );
};

export default ImageUpload;