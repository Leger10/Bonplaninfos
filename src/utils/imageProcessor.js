// src/utils/imageProcessor.js
import imageCompression from 'browser-image-compression';

/**
 * Convert an image file to a supported format (JPEG or PNG)
 */
export const convertImageToSupportedFormat = async (file, options = {}) => {
  const {
    targetFormat = 'jpeg',
    quality = 0.85,
    maxWidth,
    maxHeight
  } = options;

  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (supportedFormats.includes(file.type.toLowerCase())) {
    return file;
  }

  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (maxWidth && width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (maxHeight && height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          
          if (targetFormat === 'jpeg') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas toBlob failed'));
                return;
              }
              
              const originalName = file.name;
              const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
              const newFileName = `${nameWithoutExt}.${targetFormat}`;
              const mimeType = targetFormat === 'png' ? 'image/png' : 'image/jpeg';
              
              const convertedFile = new File([blob], newFileName, {
                type: mimeType,
                lastModified: Date.now(),
              });
              
              resolve(convertedFile);
            },
            targetFormat === 'png' ? 'image/png' : 'image/jpeg',
            targetFormat === 'png' ? 1 : quality
          );
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image for conversion'));
        };
        
        img.src = event.target.result;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Image conversion error:', error);
    throw error;
  }
};

/**
 * Compress image file
 */
export const compressImage = async (file, options = {}) => {
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: file.type.includes('png') ? 'image/png' : 'image/jpeg',
    initialQuality: 0.8,
    alwaysKeepResolution: true
  };

  const compressionOptions = { ...defaultOptions, ...options };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    
    const originalSizeMB = file.size / 1024 / 1024;
    const compressedSizeMB = compressedFile.size / 1024 / 1024;
    
    if (originalSizeMB > 1 && originalSizeMB - compressedSizeMB > 0.5) {
      console.log(`Image compressée de ${originalSizeMB.toFixed(1)}MB à ${compressedSizeMB.toFixed(1)}MB`);
    }
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression error:', error);
    return file;
  }
};

/**
 * Process image: convert if needed, then compress
 */
export const processImage = async (file, options = {}) => {
  let processedFile = file;
  
  // Check if conversion is needed
  const needsImageConversion = (file) => {
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    return !supportedFormats.includes(file.type.toLowerCase());
  };
  
  const getRecommendedFormat = (file) => {
    const type = file.type.toLowerCase();
    if (type === 'image/webp') {
      return 'png';
    }
    return 'jpeg';
  };
  
  if (needsImageConversion(file)) {
    const targetFormat = getRecommendedFormat(file);
    processedFile = await convertImageToSupportedFormat(file, {
      ...options,
      targetFormat,
    });
  }
  
  // Always compress the image
  processedFile = await compressImage(processedFile, options);
  
  return processedFile;
};

/**
 * Validate image file
 */
export const validateImage = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      message: `Format non supporté: ${file.type}. Formats acceptés: JPEG, PNG, WebP, HEIC.`
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      message: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 5MB.`
    };
  }
  
  return { isValid: true, message: '' };
};