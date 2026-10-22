// Default high-contrast professional club emblem SVG data URL
export const DEFAULT_CLUB_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="navy" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
  </defs>
  <!-- Outer Ring -->
  <circle cx="100" cy="100" r="94" fill="url(#navy)" stroke="url(#gold)" stroke-width="6" />
  <!-- Inner Ring -->
  <circle cx="100" cy="100" r="78" fill="#FFFFFF" stroke="url(#gold)" stroke-width="3" stroke-dasharray="4 2" />
  <!-- Center Emblem: Torch & Hands of Unity -->
  <!-- Tree / Leaves -->
  <path d="M100 45 C115 65 140 75 140 95 C140 115 120 125 100 125 C80 125 60 115 60 95 C60 75 85 65 100 45 Z" fill="#059669" opacity="0.9" />
  <!-- Golden Torch Flame -->
  <path d="M100 48 Q108 65 100 78 Q92 65 100 48 Z" fill="url(#gold)" />
  <circle cx="100" cy="65" r="4" fill="#EF4444" />
  <!-- Torch Base -->
  <path d="M96 78 L104 78 L101 105 L99 105 Z" fill="url(#gold)" />
  <!-- Ribbon Banner at Bottom -->
  <path d="M30 148 Q100 135 170 148 L160 168 Q100 155 40 168 Z" fill="url(#gold)" stroke="#B45309" stroke-width="1.5" />
  <text x="100" y="159" font-family="Arial, sans-serif" font-size="10" font-weight="900" fill="#0F172A" text-anchor="middle" letter-spacing="1.5">GRAMIN CLUB</text>
  <!-- Stars -->
  <polygon points="100,32 102,37 107,37 103,40 105,45 100,42 95,45 97,40 93,37 98,37" fill="url(#gold)" />
  <polygon points="70,39 71.5,43 75.5,43 72.5,45.5 74,49.5 70,47 66,49.5 67.5,45.5 64.5,43 68.5,43" fill="url(#gold)" />
  <polygon points="130,39 131.5,43 135.5,43 132.5,45.5 134,49.5 130,47 126,49.5 127.5,45.5 124.5,43 128.5,43" fill="url(#gold)" />
</svg>
`)}`;

/**
 * Resizes and compresses an uploaded image file into an optimized Base64 PNG/JPEG Data URL.
 * Max dimension: 360x360 for high quality yet compact storage.
 */
export async function processUploadedLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Uploaded file is not a valid image. Please select PNG, JPG, SVG, or WebP.'));
      return;
    }

    // If SVG, read as text data URL directly to preserve vector sharpness
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => reject(new Error('Failed to read SVG file.'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 360;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Smooth rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as optimized PNG to preserve alpha transparency
        const dataUrl = canvas.toDataURL('image/png', 0.92);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Failed to parse uploaded image.'));
      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
