// Barcode scanning: live camera (getUserMedia + ZXing) with a photo-capture fallback.

import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from './vendor/zxing.esm.js';

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
]);

let reader = null;

// Lazily create the shared ZXing reader with food-barcode formats.
function getReader() {
  if (!reader) reader = new BrowserMultiFormatReader(hints);
  return reader;
}

/** Whether live camera scanning is available (secure context + getUserMedia). */
export function isScanSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Start continuous scanning on a <video> element.
 * Returns a stop() function. Resolves once the camera stream starts.
 */
export async function startScanning(videoElement, onFound) {
  const r = getReader();
  let stopped = false;

  const callback = (result) => {
    if (stopped || !result || !result.getText()) return;
    stopped = true;
    try { r.reset(); } catch { /* ignore */ }
    onFound(result.getText().trim());
  };

  await r.decodeFromConstraints(
    { video: { facingMode: 'environment' } },
    videoElement,
    callback,
  );

  return () => {
    stopped = true;
    try { r.reset(); } catch { /* ignore */ }
  };
}

/** Decode a barcode from an image file (photo-capture fallback). */
export async function decodeFromFile(file) {
  const r = getReader();
  const url = URL.createObjectURL(file);
  try {
    const result = await r.decodeFromImageUrl(url);
    return result.getText().trim();
  } finally {
    URL.revokeObjectURL(url);
    try { r.reset(); } catch { /* ignore */ }
  }
}
