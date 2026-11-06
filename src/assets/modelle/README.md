# Modelle für den Zuschnitt-Vorschlag

Laufen im Browser über MediaPipe Tasks (`@mediapipe/tasks-vision`, Apache-2.0), geladen erst, wenn unter
„Mein Profil“ ein Ausschnitt vorgeschlagen wird (`src/scripts/intern/bild-erkennung.ts`). Kein externer Dienst:
Modelle und WebAssembly liegen auf der eigenen Website, das Foto verlässt den Rechner nicht.

| Datei | Zweck | Quelle (Apache-2.0) |
|---|---|---|
| `blaze_face_short_range.tflite` | Gesichter (Nahaufnahmen, Porträts) | storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/ |
| `efficientdet_lite0.tflite` | Personen (Bühnen- und Gruppenfotos), nur Kategorie „person“ | storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/latest/ |

Das Modell `blaze_face_full_range` passt nicht zu MediaPipe Tasks (andere Anker) – deshalb Personen statt
Gesichter für Fotos aus der Entfernung.
