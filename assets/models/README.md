# Models

Metti qui il modello TFLite di test per YOLO.

Percorso consigliato:

- `assets/models/yolo_test.tflite`

Dopo aver aggiunto il file, aggiorna `getYoloTestModelSource()` in:

- `src/services/ocr/yolo/modelConfig.ts`

Per usare i moduli nativi su Android non basta `Expo Go`.
Usa una development build:

```bash
npm run prebuild:android
npm run android:dev
```
