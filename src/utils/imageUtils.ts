export const compressImage = (dataUrl: string, maxWidth = 1024, maxHeight = 1024, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If it's not an image (e.g. PDF), just return the original
    if (!dataUrl.startsWith('data:image')) {
      return resolve(dataUrl);
    }
    
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(dataUrl); // Fallback to original if canvas is not supported
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compress the image
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = (err) => {
      console.error("Error loading image for compression", err);
      resolve(dataUrl); // Fallback to original
    };
  });
};
