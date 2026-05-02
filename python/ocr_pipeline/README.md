# Python support

Questa cartella resta utile, ma non e piu il punto centrale della pipeline mobile.

Con l'architettura Android consigliata:

- nell'app girano `ML Kit Text Recognition` e un modello `YOLOv8n.tflite`
- Python serve fuori dall'app per training, dataset prep, export TFLite e test offline

Questi script quindi rappresentano il lato laboratorio/prototipazione, non il runtime finale
su telefono.

Esempio di esecuzione locale:

```bash
python python/ocr_pipeline/main.py < sample-request.json
```
