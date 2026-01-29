/**
 * Utility for automatic image format conversion
 * Converts unsupported formats (webp, heic, etc.) to jpg/png
 */

/**
 * Convert an image file to a supported format (JPEG or PNG)
 * @param {File} file - The original image file
 * @param {Object} options - Conversion options
 * @param {string} options.targetFormat - 'jpeg' or 'png' (default: 'jpeg')
 * @param {number} options.quality - Quality for JPEG (0-1, default: 0.85)
 * @param {number} options.maxWidth - Maximum width in pixels (optional)
 * @param {number} options.maxHeight - Maximum height in pixels (optional)
 * @returns {Promise<File>} - Converted file
 */
export const convertImageToSupportedFormat = async (file, options = {}) => {
  const {
    targetFormat = 'jpeg',
    quality = 0.85,
    maxWidth,
    maxHeight
  } = options;

  // List of supported formats that don't need conversion
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
  
  // If already in supported format, return as is
  if (supportedFormats.includes(file.type.toLowerCase())) {
    return file;
  }

  // Show conversion message for unsupported formats
  const showConversionMessage = (originalFormat, targetFormat) => {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast({
        title: "Conversion d'image",
        description: `Votre image .${originalFormat.split('/')[1] || originalFormat} a été convertie automatiquement en ${targetFormat.toUpperCase()} pour être compatible.`,
        duration: 3000,
      });
    } else {
      console.log(`Image convertie de ${originalFormat} vers ${targetFormat}`);
    }
  };

  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        
        img.onload = () => {
          // Create canvas for conversion
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Apply max dimensions if specified
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
          
          // Fill with white background for transparent images converted to JPEG
          if (targetFormat === 'jpeg') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
          }
          
          // Draw the image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas toBlob failed'));
                return;
              }
              
              // Create new file with correct name and type
              const originalName = file.name;
              const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
              const newFileName = `${nameWithoutExt}.${targetFormat}`;
              const mimeType = targetFormat === 'png' ? 'image/png' : 'image/jpeg';
              
              const convertedFile = new File([blob], newFileName, {
                type: mimeType,
                lastModified: Date.now(),
              });
              
              // Show conversion message
              showConversionMessage(file.type, targetFormat);
              
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
 * Check if a file needs conversion
 * @param {File} file - The file to check
 * @returns {boolean} - True if conversion is needed
 */
export const needsImageConversion = (file) => {
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
  return !supportedFormats.includes(file.type.toLowerCase());
};

/**
 * Get recommended format for conversion based on file type
 * @param {File} file - The original file
 * @returns {'jpeg'|'png'} - Recommended target format
 */
export const getRecommendedFormat = (file) => {
  const type = file.type.toLowerCase();
  
  // For webp with transparency, convert to png
  if (type === 'image/webp') {
    return 'png';
  }
  
  // Default to jpeg for most conversions
  return 'jpeg';
};

/**
 * Process and upload image with automatic conversion
 * @param {File} file - Original image file
 * @param {Function} uploadFn - Upload function that accepts a File
 * @param {Object} options - Conversion options
 * @returns {Promise<any>} - Upload result
 */
export const uploadImageWithConversion = async (file, uploadFn, options = {}) => {
  let fileToUpload = file;
  
  // Check if conversion is needed
  if (needsImageConversion(file)) {
    const targetFormat = getRecommendedFormat(file);
    fileToUpload = await convertImageToSupportedFormat(file, {
      ...options,
      targetFormat,
    });
  }
  
  // Call the upload function with the (possibly converted) file
  return uploadFn(fileToUpload);
};