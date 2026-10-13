// Decimal MB: every returned file is at most 1,000,000 bytes.
export const MAX_STORED_IMAGE_BYTES = 1_000_000;

export async function compressArtworkImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size) {
    throw new Error('JPG, PNG, WebP 사진을 선택해 주세요.');
  }
  if (file.size <= MAX_STORED_IMAGE_BYTES) return file;
  const url = URL.createObjectURL(file);
  const canvas = document.createElement('canvas');
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('사진을 읽지 못했습니다. 다른 사진을 선택해 주세요.'));
      image.src = url;
    });
    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    for (let attempt = 0; attempt < 10; attempt++) {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이 브라우저에서 사진 압축을 지원하지 않습니다.');
      // JPEG has no alpha channel: preserve transparent artwork on white paper.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      for (const quality of [0.9, 0.8, 0.7]) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob) throw new Error('사진 압축에 실패했습니다. 다시 선택해 주세요.');
        if (blob.size > 0 && blob.size <= MAX_STORED_IMAGE_BYTES) {
          return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: blob.type });
        }
      }
      width = Math.max(1, Math.floor(width * 0.8));
      height = Math.max(1, Math.floor(height * 0.8));
    }
    throw new Error('사진을 1MB 이하로 줄이지 못했습니다. 더 작은 사진을 선택해 주세요.');
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 0;
  }
}
