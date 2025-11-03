// Emotion Mirror script (client-side)
// Password check calls Netlify Function: /.netlify/functions/checkPassword
const loginScreen = document.getElementById('loginScreen');
const loginBtn = document.getElementById('loginBtn');
const passwordInput = document.getElementById('passwordInput');
const loginMsg = document.getElementById('loginMsg');
const app = document.getElementById('app');

const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const faceEmotion = document.getElementById('faceEmotion');
const voiceEmotion = document.getElementById('voiceEmotion');
const stressLevel = document.getElementById('stressLevel');
const notes = document.getElementById('notes');
const langSelect = document.getElementById('langSelect');
const startVoiceBtn = document.getElementById('startVoiceBtn');
const captureBtn = document.getElementById('captureBtn');
const recordBtn = document.getElementById('recordBtn');

const thirdPartyBtn = document.getElementById('thirdPartyBtn');
const selfCheckBtn = document.getElementById('selfCheckBtn');

let analyser, audioContext, voiceStream;
let currentMode = 'third';

const translations = {
  en: {face:'Face', voice:'Voice', stress:['Stable','Tense','Severe'], notes:{stable:'No visible stress', tense:'Signs of stress', severe:'High stress signs'}},
  ar: {face:'الوجه', voice:'الصوت', stress:['مستقر','متوتر','شديد التوتر'], notes:{stable:'حالة مستقرة', tense:'علامات توتر', severe:'توتر شديد'}},
  tr: {face:'Yüz', voice:'Ses', stress:['Dengeli','Gergin','Çok Gergin'], notes:{stable:'Dengeli', tense:'Gergin', severe:'Çok gergin'}},
  la: {face:'Facies', voice:'Vox', stress:['Stabilis','Tensus','Maxime Tensus'], notes:{stable:'Stabilis', tense:'Tensus', severe:'Maxime tensus'}},
  zh: {face:'面部', voice:'声音', stress:['稳定','紧张','高度紧张'], notes:{stable:'稳定', tense:'紧张', severe:'高度紧张'}}
};
function tFace(){ return translations[langSelect.value].face; }
function tVoice(){ return translations[langSelect.value].voice; }
function tStress(i){ return translations[langSelect.value].stress[i]; }

langSelect.addEventListener('change', ()=> updateLabels());
function updateLabels(){ /* labels update if needed */ }

// Password check via Netlify Function
async function checkPasswordRemote(password){
  try{
    const res = await fetch('/.netlify/functions/checkPassword', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({password})
    });
    return res.ok;
  }catch(e){
    console.error('password check failed', e);
    return false;
  }
}

loginBtn.onclick = async ()=>{
  const pw = passwordInput.value.trim();
  if(!pw){ loginMsg.textContent='Enter password'; return; }
  loginMsg.textContent='Checking...';
  const ok = await checkPasswordRemote(pw);
  if(ok){ loginScreen.classList.add('hidden'); app.classList.remove('hidden'); startAll(); }
  else { loginMsg.textContent='Invalid password'; }
};

// UI mode toggles
thirdPartyBtn.onclick = ()=> { currentMode='third'; thirdPartyBtn.classList.add('active'); selfCheckBtn.classList.remove('active'); };
selfCheckBtn.onclick = ()=> { currentMode='self'; selfCheckBtn.classList.add('active'); thirdPartyBtn.classList.remove('active'); };

// Start camera & face-api
async function startAll(){
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js/models')
  ]);

  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
    video.srcObject = stream;
    await video.play();
  }catch(e){
    console.error('Camera error', e);
    notes.textContent = 'Camera access denied or unavailable.';
    return;
  }

  const canvas = overlay;
  const displaySize = { width: video.videoWidth || 360, height: video.videoHeight || 270 };
  canvas.width = displaySize.width; canvas.height = displaySize.height;
  const ctx = canvas.getContext('2d');

  setInterval(async ()=>{
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(detections){
      const resized = faceapi.resizeResults(detections, displaySize);
      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceExpressions(canvas, resized);

      const exps = detections.expressions;
      const main = Object.keys(exps).reduce((a,b)=> exps[a]>exps[b]?a:b);
      faceEmotion.textContent = `${tFace()}: ${main}`;

      const lm = detections.landmarks;
      const leftEye = lm.getLeftEye(); const rightEye = lm.getRightEye();
      const eyeOpenness = (eyeOpennessRatio(leftEye) + eyeOpennessRatio(rightEye))/2;
      const stress = computeStressLevel(main, eyeOpenness);
      stressLevel.textContent = `Stress: ${tStress(stress)}`;
      notes.textContent = translations[langSelect.value].notes[ stress===0? 'stable' : stress===1? 'tense' : 'severe' ];
    } else {
      faceEmotion.textContent = `${tFace()}: —`;
      stressLevel.textContent = `Stress: —`;
      notes.textContent = 'No face detected';
    }
  }, 900);
}

function eyeOpennessRatio(eye){
  const top = eye[1]; const bottom = eye[5]; const left = eye[0]; const right = eye[3];
  const vert = Math.hypot(top.x-bottom.x, top.y-bottom.y);
  const hor = Math.hypot(left.x-right.x, left.y-right.y);
  return vert/hor;
}
function computeStressLevel(mainEmotion, eyeOpenness){
  let score = 0;
  if(['angry','fear','sad','disgust'].includes(mainEmotion)) score += 1;
  if(mainEmotion==='angry' || mainEmotion==='fear') score += 1;
  if(eyeOpenness < 0.18) score += 1;
  if(score<=1) return 0;
  if(score===2) return 1;
  return 2;
}

// Capture snapshot (single frame analysis)
captureBtn.onclick = async ()=>{
  if(!video.srcObject){ notes.textContent='Camera not ready'; return; }
  // draw current frame to canvas (overlay already used), capture and run one detection cycle
  const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
  if(detections){
    const exps = detections.expressions;
    const main = Object.keys(exps).reduce((a,b)=> exps[a]>exps[b]?a:b);
    faceEmotion.textContent = `${tFace()}: ${main}`;
    const lm = detections.landmarks;
    const eyeOpenness = (eyeOpennessRatio(lm.getLeftEye()) + eyeOpennessRatio(lm.getRightEye()))/2;
    const stress = computeStressLevel(main, eyeOpenness);
    stressLevel.textContent = `Stress: ${tStress(stress)}`;
    notes.textContent = 'Snapshot taken';
  } else {
    notes.textContent = 'No face detected in snapshot';
  }
};

// Record 5 seconds (self-check mode use)
recordBtn.onclick = async ()=>{
  if(!video.srcObject){ notes.textContent='Camera not ready'; return; }
  // temporary visual feedback
  notes.textContent = 'Recording 5 seconds...';
  // record a short clip by capturing frames during 5s and running detections, then aggregate
  const results = [];
  const start = performance.now();
  while(performance.now() - start < 5000){
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
    if(detections){
      const exps = detections.expressions;
      const main = Object.keys(exps).reduce((a,b)=> exps[a]>exps[b]?a:b);
      const lm = detections.landmarks;
      const eyeOpenness = (eyeOpennessRatio(lm.getLeftEye()) + eyeOpennessRatio(lm.getRightEye()))/2;
      results.push({main, eyeOpenness});
    }
    await new Promise(r=>setTimeout(r, 300));
  }
  if(results.length===0){ notes.textContent='No face detected during recording'; return; }
  // aggregate
  const emotionCount = {};
  let eyeSum = 0;
  results.forEach(r=>{ emotionCount[r.main] = (emotionCount[r.main]||0)+1; eyeSum += r.eyeOpenness; });
  const dominant = Object.keys(emotionCount).reduce((a,b)=> emotionCount[a]>emotionCount[b]?a:b);
  const avgEye = eyeSum / results.length;
  const stress = computeStressLevel(dominant, avgEye);
  faceEmotion.textContent = `${tFace()}: ${dominant}`;
  stressLevel.textContent = `Stress: ${tStress(stress)}`;
  notes.textContent = 'Recorded 5s analysis complete';
};

// Voice analysis (simple energy-based)
startVoiceBtn.onclick = async ()=>{
  if(voiceStream) return;
  try{
    voiceStream = await navigator.mediaDevices.getUserMedia({audio:true});
  }catch(e){
    voiceEmotion.textContent = 'Microphone not available';
    return;
  }
  audioContext = new (window.AudioContext||window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(voiceStream);
  analyser = audioContext.createAnalyser(); analyser.fftSize = 2048;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  function tick(){
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((a,b)=>a+b,0)/data.length;
    if(avg > 160) voiceEmotion.textContent = `${tVoice()}: Loud/Excited`;
    else if(avg > 90) voiceEmotion.textContent = `${tVoice()}: Normal`;
    else voiceEmotion.textContent = `${tVoice()}: Soft/Calm`;
    requestAnimationFrame(tick);
  }
  tick();
};
