/**
 * Fotos vor dem Hochladen im Browser vorbereiten – gilt für News, Redaktion, KEEP UP und Mein Profil:
 * höchstens 2400 px an der langen Seite und immer neu gespeichert. Dabei fallen die Metadaten der Kamera weg,
 * vor allem der Aufnahmeort (GPS) von Handyfotos, der sonst im öffentlichen Bucket mitläge.
 * PNG bleibt PNG (Transparenz von Logos), außer es wäre dann noch sehr groß (Foto als PNG); sonst JPEG.
 */
const MAX_PX = 2400;
const PNG_MAX = 3_000_000;

const blobAus = (c: HTMLCanvasElement, typ: string) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Das Foto ließ sich nicht verkleinern.'))), typ, 0.86));

/** Foto verkleinern, Metadaten entfernen, optional um `drehen` Grad (90, 180, 270) im Uhrzeigersinn drehen */
export async function verkleinern(file: Blob, drehen = 0): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('Das Foto lässt sich nicht lesen. Bitte als JPG, PNG oder WebP speichern und noch einmal wählen.');
  const scale = Math.min(1, MAX_PX / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const quer = drehen % 180 !== 0;
  const c = document.createElement('canvas');
  c.width = quer ? h : w;
  c.height = quer ? w : h;
  const g = c.getContext('2d')!;
  g.translate(c.width / 2, c.height / 2);
  g.rotate((drehen * Math.PI) / 180);
  g.drawImage(bmp, -w / 2, -h / 2, w, h);
  bmp.close();
  if (file.type === 'image/png') {
    const png = await blobAus(c, 'image/png');
    if (png.size <= PNG_MAX) return png;
  }
  return blobAus(c, 'image/jpeg');
}

/** Dateiendung zum vorbereiteten Foto */
export const endung = (b: Blob) => (b.type === 'image/png' ? 'png' : 'jpg');
