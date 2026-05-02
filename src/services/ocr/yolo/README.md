# YOLO Step 1

Obiettivo attuale:

- caricare il runtime `react-native-fast-tflite`
- predisporre un punto unico per il modello `.tflite`
- esporre una funzione che riceve `imagePath` e restituisce bounding box

API principale:

- `detectBookBoundingBoxesFromImagePath()`
- `detectBookBoundingBoxesFromCapturedImage()`

Stato attuale:

1. Se il modello non e ancora configurato, la funzione restituisce bounding box di fallback.
2. Se il modello e configurato e il runtime nativo e disponibile, il codice prova a caricare ed eseguire il `.tflite`.
3. Finche non colleghiamo preprocessing immagine -> tensore RGB, l'inferenza gira su un tensore di smoke test a zeri.

Per collegare il modello reale:

1. Aggiungi `assets/models/yolo_test.tflite`
2. Aggiorna `getYoloTestModelSource()` in `modelConfig.ts`
3. Avvia una Android development build, non `Expo Go`

Comando utili:

```bash
npm run prebuild:android
npm run android:dev
npm run start:dev-client
```
