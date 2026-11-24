export function formatRwf(amount: number): string {
  return `${new Intl.NumberFormat('en-RW').format(Math.round(amount))} RWF`;
}

export async function compressImageFile(file: File, maxDimension = 1100): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image.');
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read the selected image file.'));
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image canvas is unavailable.');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.84);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
