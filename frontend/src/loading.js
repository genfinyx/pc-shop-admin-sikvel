export function startLoading({ totalTime, stages, onFinish }) {
  const stepTime = 100;
  const stepsCount = totalTime / stepTime;

  const progressEl = document.getElementById('progress');
  const percentEl = document.getElementById('percent');
  const textEl = document.getElementById('loading-text');
  const loadingScreen = document.getElementById('loading-screen');

  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    const percent = Math.min(Math.round((currentStep / stepsCount) * 100), 100);

    progressEl.style.width = percent + '%';
    percentEl.innerText = percent + '%';

    const stageIndex = Math.min(Math.floor(percent / (100 / stages.length)), stages.length - 1);
    textEl.innerText = stages[stageIndex];

    if (percent >= 100) {
      clearInterval(interval);
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        onFinish();
      }, 600);
    }
  }, stepTime);
}