const fs = require('fs');
const https = require('https');
const path = require('path');

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const destDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

models.forEach(model => {
  const dest = path.join(destDir, model);
  const file = fs.createWriteStream(dest);
  https.get(baseUrl + model, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      console.log('Downloaded ' + model);
    });
  }).on('error', function(err) {
    fs.unlink(dest, () => {});
    console.error('Error downloading ' + model + ': ' + err.message);
  });
});
