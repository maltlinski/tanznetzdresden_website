/**
 * Gesichter und Personen im Foto finden – für den Zuschnitt-Vorschlag (zuschnitt.ts).
 * MediaPipe Tasks (WebAssembly) mit zwei kleinen Modellen aus src/assets/modelle/ (README dort). Alles liegt auf der
 * eigenen Website und wird erst beim ersten Vorschlag geladen; das Foto verlässt den Rechner nicht.
 * Klappt etwas nicht (alter Browser, Zeitüberschreitung), gibt es null – dann zählt nur der Bildinhalt.
 */
import wasmLoader from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js?url';
import wasmBinary from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm?url';
import gesichtModell from '../../assets/modelle/blaze_face_short_range.tflite?url';
import personModell from '../../assets/modelle/efficientdet_lite0.tflite?url';
import type { Kasten } from '../../lib/bild-zuschnitt';

type Erkenner = { detect(img: HTMLCanvasElement): { detections: { boundingBox?: { originX: number; originY: number; width: number; height: number }; categories: { score: number }[] }[] } };

let laden: Promise<{ gesicht: Erkenner; person: Erkenner }> | null = null;

function erkennerLaden() {
  laden ??= (async () => {
    const { FaceDetector, ObjectDetector } = await import('@mediapipe/tasks-vision');
    const fileset = { wasmLoaderPath: new URL(wasmLoader, location.href).href, wasmBinaryPath: new URL(wasmBinary, location.href).href };
    const [gesicht, person] = await Promise.all([
      FaceDetector.createFromOptions(fileset, { baseOptions: { modelAssetPath: gesichtModell, delegate: 'CPU' }, runningMode: 'IMAGE', minDetectionConfidence: 0.55 }),
      ObjectDetector.createFromOptions(fileset, { baseOptions: { modelAssetPath: personModell, delegate: 'CPU' }, runningMode: 'IMAGE', scoreThreshold: 0.4, categoryAllowlist: ['person'], maxResults: 12 }),
    ]);
    return { gesicht, person } as { gesicht: Erkenner; person: Erkenner };
  })();
  laden.catch(() => (laden = null));
  return laden;
}

const zeitlimit = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), ms))]);

/** Kästen in Pixeln des übergebenen Bildes (Canvas, höchstens ~640 px) */
export async function erkennen(bild: HTMLCanvasElement, ms = 15000): Promise<{ gesichter: Kasten[]; personen: Kasten[] } | null> {
  try {
    const e = await zeitlimit(erkennerLaden(), ms);
    if (!e) return null;
    const kaesten = (r: ReturnType<Erkenner['detect']>) =>
      r.detections.flatMap((d) => (d.boundingBox ? [{ x: d.boundingBox.originX, y: d.boundingBox.originY, w: d.boundingBox.width, h: d.boundingBox.height, score: d.categories[0]?.score ?? 0 }] : []));
    return { gesichter: kaesten(e.gesicht.detect(bild)), personen: kaesten(e.person.detect(bild)) };
  } catch {
    return null;
  }
}
