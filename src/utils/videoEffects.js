export function calculateZoomLerp(startScale, endScale, currentFrame, totalFrames) {
  // Pastikan frame saat ini tidak melebihi total frame
  const frame = Math.min(Math.max(0, currentFrame), totalFrames);
  
  // Hitung progress (0.0 sampai 1.0)
  const progress = totalFrames > 0 ? frame / totalFrames : 1;
  
  // Interpolasi Linear (Lerp) untuk skala (zoom)
  // Rumus: start + (end - start) * progress
  const currentScale = startScale + (endScale - startScale) * progress;
  
  return currentScale;
}

export function calculateCenterAnchorTranslation(currentScale, videoWidth, videoHeight) {
  // Untuk membuat zoom fokus tepat di tengah layar (bukan di sudut 0,0),
  // kita perlu menggeser (translate) posisi (x, y) sebesar setengah resolusi
  // yang telah disesuaikan dengan skala.
  
  // Titik tengah asli
  const centerX = videoWidth / 2;
  const centerY = videoHeight / 2;
  
  // Titik tengah setelah di-scale
  const scaledCenterX = centerX * currentScale;
  const scaledCenterY = centerY * currentScale;
  
  // Jarak pergeseran (offset) yang harus diterapkan agar tetap di tengah
  const translateX = centerX - scaledCenterX;
  const translateY = centerY - scaledCenterY;
  
  return {
    translateX,
    translateY,
    scale: currentScale
  };
}

/**
 * Fungsi utama untuk menerapkan animasi Zoom (In/Out) pada frame video
 * 
 * @param {number} startScale - Skala awal (contoh: 1.0)
 * @param {number} endScale - Skala akhir (contoh: 1.5 untuk zoom in, 0.5 untuk zoom out)
 * @param {number} currentFrame - Frame video saat ini
 * @param {number} totalFrames - Total durasi animasi dalam bentuk frame
 * @param {number} videoWidth - Lebar resolusi video asli (contoh: 1920)
 * @param {number} videoHeight - Tinggi resolusi video asli (contoh: 1080)
 * @returns {Object} - Objek berisi nilai { scale, translateX, translateY }
 */
export function applyZoomEffect(startScale, endScale, currentFrame, totalFrames, videoWidth, videoHeight) {
  // 1. Dapatkan skala saat ini berdasarkan frame (Lerp)
  const currentScale = calculateZoomLerp(startScale, endScale, currentFrame, totalFrames);
  
  // 2. Dapatkan pergeseran posisi agar Anchor Point tepat di tengah video
  const transformation = calculateCenterAnchorTranslation(currentScale, videoWidth, videoHeight);
  
  return transformation;
}
