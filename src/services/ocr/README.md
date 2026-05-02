# OCR architecture

Struttura pensata per Android on-device:

1. `CameraView` scatta la foto e la salva in cache temporanea.
2. `yolo/` contiene lo scaffold del detector:
   - runtime `react-native-fast-tflite`
   - sorgente modello `.tflite`
   - API `imagePath -> bounding boxes`
3. `mockOnDeviceProvider.ts` rappresenta il blocco OCR sopra il detector:
   - OCR per crop (`ML Kit Text Recognition`)
4. `parser.ts` trasforma le righe OCR con bounding box in campi applicativi:
   - `title`
   - `author`
   - `edition`
5. `matcher.ts` confronta i campi col Vault.

Contratti chiave:

- `OcrDetectedCover`: una copertina trovata con bounding box e linee OCR.
- `OcrTextLine`: una riga OCR con coordinate.
- `OcrParsedFields`: risultato del parser.
- `OcrCandidate`: entita finale mostrata in UI.

Integrazione futura Android:

- detector TFLite: completare `src/services/ocr/yolo/`
- OCR ML Kit: popolare `cover.lines`
- parser: resta in TypeScript oppure puo essere spostato in Kotlin

Con Expo managed puro non puoi richiamare direttamente ML Kit/TFLite personalizzati.
Per questa architettura servono almeno:

- Expo development build con moduli nativi compatibili
oppure
- React Native bare

Questa cartella e gia pronta per quel passaggio.
