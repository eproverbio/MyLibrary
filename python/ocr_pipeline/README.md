# OCR pipeline

Questa cartella contiene la pipeline OCR lato Python, separata dalla UI React Native.

Oggi l'app Expo usa ancora un adapter mockato in TypeScript, perche Python non puo girare
direttamente dentro il runtime mobile. Il contratto dati pero e gia allineato:

1. La UI scatta una foto.
2. Expo salva temporaneamente l'immagine in cache e passa l'URI all'adapter OCR.
3. L'adapter inviera lo stesso payload JSON a questo servizio Python quando collegheremo il
   motore reale.
4. La risposta contiene una lista di copertine riconosciute con i campi da confrontare col Vault.

Esempio di esecuzione locale:

```bash
python python/ocr_pipeline/main.py < sample-request.json
```
