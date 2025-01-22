const textEl = document.getElementById("text");
const speakEl = document.getElementById("speak");
const stopEl = document.getElementById("stop");
const voiceSelect = document.getElementById("voice-select");
const speedSelect = document.getElementById("speed-select");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

let voices = [];
let audioContext;
let analyser;
let animationId;

// Setup Audio Context
function setupAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
}

// Resize canvas function
function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
}

// Initialize canvas
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Soundwave visualizer function
function drawVisualizer() {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate visualization dimensions
  const totalBars = bufferLength;
  const barWidth = Math.ceil(canvas.width / totalBars);
  const centerY = canvas.height / 2;

  // Draw the waveform
  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";

  for (let i = 0; i < totalBars; i++) {
    const barHeight = (dataArray[i] / 255) * (canvas.height / 2);
    const x = i * barWidth;

    // Draw bar (both up and down from center)
    ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
  }

  // Optional: Add text overlay
  if (textEl.value) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "16px Arial";
    ctx.fillText(textEl.value.substring(0, 30), 20, canvas.height - 20);
  }

  animationId = requestAnimationFrame(drawVisualizer);
}

// Handle image upload
function handleImageUpload(file) {
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      imagePreview.style.display = "block";
      imagePreview.src = e.target.result;

      // Ensure the canvas is above the image
      canvas.style.zIndex = "2";
      imagePreview.style.zIndex = "1";
    };
    reader.readAsDataURL(file);
  }
}

imageInput.addEventListener("change", function (e) {
  handleImageUpload(this.files[0]);
});

// Speak function
function speak() {
  if (!audioContext) {
    setupAudio();
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  const text = textEl.value;
  if (text === "") {
    alert("Please enter text first!");
    return;
  }

  // Create audio oscillator for visualization
  const oscillator = audioContext.createOscillator();
  oscillator.connect(analyser);
  oscillator.start();
  drawVisualizer();

  // Create and configure utterance
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = voices[voiceSelect.value];
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.rate = parseFloat(speedSelect.value);

  utterance.onend = function () {
    oscillator.stop();
    cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  utterance.onerror = function (event) {
    console.error("An error occurred:", event.error);
    oscillator.stop();
    cancelAnimationFrame(animationId);
  };

  speechSynthesis.speak(utterance);
}

// Load voices function
function loadVoices() {
  voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = voices
    .map(
      (voice, index) =>
        `<option value="${index}">${voice.name} (${voice.lang})</option>`
    )
    .join("");
}

// Initialize voices
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

// Stop function
function stopSpeaking() {
  speechSynthesis.cancel();
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// Event listeners
speakEl.addEventListener("click", speak);
stopEl.addEventListener("click", stopSpeaking);

// Drag and drop functionality
const dropZone = document.querySelector(".file-upload label");

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    handleImageUpload(file);
  }
});
