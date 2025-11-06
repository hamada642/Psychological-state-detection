// script.js — version with working camera and CDN models
const video = document.getElementById('video');
const passwordInput = document.getElementById('passwordInput');
const loginScreen = document.getElementById('loginScreen');
const app = document.getElementById('app');
const loginMsg = document.getElementById('loginMsg');
const startBtn = document.getElementById('startBtn');
const modeSelect = document.getElementById('modeSelect');

async function checkPasswordRemote(pw) {
  try {
    const res = await fetch('/.netlify/functions/checkPassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    return res.ok;
  } catch (err) {
    console.error(err);
    return false;
  }
}

document.getElementById('loginBtn').onclick = async () => {
  const pw = passwordInput.value.trim();
  if (!pw) { loginMsg.textContent = 'Enter password'; return; }
  loginMsg.textContent = 'Checking...';
  const ok = await checkPasswordRemote(pw);
  if (ok) {
    loginScreen.classList.add('hidden');
    app.classList.remove('hidden');
    startAll();
  } else {
    loginMsg.textContent = 'Invalid password';
  }
};

// === Camera & face detection ===
async function startAll() {
  try {
    // تحميل الموديلات من CDN بدل المجلد المحلي
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/models')
    ]);

    // تفعيل الكاميرا
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;

    video.addEventListener('play', () => {
      const canvas = faceapi.createCanvasFromMedia(video);
      document.body.append(canvas);
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);

      setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        const resized = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
        faceapi.draw.drawFaceExpressions(canvas, resized);
      }, 500);
    });
  } catch (err) {
    console.error('Camera error:', err);
    alert('⚠️ الكاميرا غير متاحة أو تم رفض الإذن.');
  }
}
