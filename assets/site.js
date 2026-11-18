function configureProjectViews() {
  const group = document.getElementById('view-controls');
  const grid = document.getElementById('projects');
  const gridButton = document.getElementById('grid-view');
  const listButton = document.getElementById('list-view');
  function selectView(view) {
    const list = view === 'list';
    grid.classList.toggle('is-list', list);
    gridButton.setAttribute('aria-pressed', String(!list));
    listButton.setAttribute('aria-pressed', String(list));
  }
  for (const [button, view] of [[gridButton, 'grid'], [listButton, 'list']]) {
    button.addEventListener('click', () => {
      selectView(view);
      try { localStorage.setItem('tm-project-view', view); } catch { /* Preferences are optional. */ }
    });
  }
  try { selectView(localStorage.getItem('tm-project-view')); } catch { selectView('grid'); }
  group.hidden = false;
}

async function runCircuit() {
  const canvas = document.getElementById('circuit-animation');
  const context = canvas.getContext('2d');
  if (!context) return;
  const [ground, props, cars] = await Promise.all(['ground', 'props', 'car'].map(name => {
    const bitmap = new Image();
    bitmap.src = 'assets/circuit-' + name + '.png';
    return bitmap.decode().then(() => bitmap);
  }));
  const still = document.getElementById('circuit-still');
  const controls = document.querySelector('.circuit .controls');
  const play = document.getElementById('play');
  const speed = document.getElementById('speed');
  const lapLabel = document.getElementById('lap');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const path = circuitData.path.slice();
  // Put the lap boundary at the painted finish line on the home straight.
  const finish = path.findIndex(([x, y]) => Math.abs(x - 88) < .7 && Math.abs(y - 82) < .1);
  if (finish > 0) path.push(...path.splice(0, finish));
  path.push(path[0]);
  const distances = [0];
  for (let i = 1; i < path.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(path[i][0] - path[i-1][0], path[i][1] - path[i-1][1]));
  }
  const courseLength = distances[distances.length - 1];
  let distance = 10;
  let segment = 0;
  let lap = 1;
  let multiplier = 1;
  let paused = motion.matches;
  let visible = true;
  let frame = null;
  let previousTime = null;

  function render() {
    while (segment + 1 < distances.length - 1 && distances[segment + 1] <= distance) segment++;
    const [x1, y1] = path[segment];
    const [x2, y2] = path[segment + 1];
    const offset = (distance - distances[segment]) / (distances[segment + 1] - distances[segment] || 1);
    const x = x1 + (x2 - x1) * offset;
    const y = y1 + (y2 - y1) * offset;
    const angle = (Math.round(Math.atan2(y2 - y1, x2 - x1) * 48 / (2 * Math.PI)) + 48) % 48;
    const carX = Math.round(187 + (x - y) * 1.64) - 21;
    const carY = Math.round(38 + (x + y) * .77) - 17;
    function drawCar() {
      context.drawImage(cars, angle % 8 * 42, Math.floor(angle / 8) * 30, 42, 30, carX, carY, 42, 30);
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(ground, 0, 0);
    let carDrawn = false;
    for (const [depth, left, top, sx, sy, width, height] of circuitData.objects) {
      if (!carDrawn && depth > x + y) {
        drawCar();
        carDrawn = true;
      }
      context.drawImage(props, sx, sy, width, height, left, top, width, height);
    }
    if (!carDrawn) drawCar();
  }
  function tick(time) {
    frame = null;
    if (previousTime !== null) {
      distance += Math.min(100, time - previousTime) / 1000 * courseLength / 17 * multiplier;
      if (distance >= courseLength) {
        distance %= courseLength;
        segment = 0;
        lapLabel.textContent = 'Lap ' + String(++lap).padStart(2, '0');
      }
    }
    previousTime = time;
    render();
    frame = requestAnimationFrame(tick);
  }
  function updatePlayback() {
    if (frame !== null) cancelAnimationFrame(frame);
    previousTime = null;
    frame = null;
    const action = paused ? 'Play car animation' : 'Pause car animation';
    play.dataset.paused = String(paused);
    play.setAttribute('aria-label', action);
    play.title = action;
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => {
    paused = !paused;
    updatePlayback();
  });
  speed.addEventListener('click', () => {
    multiplier = multiplier === 1 ? 2 : 1;
    speed.textContent = multiplier + '×';
    speed.setAttribute('aria-label', 'Change car speed, currently ' + multiplier + ' times');
  });
  motion.addEventListener('change', () => {
    paused = motion.matches;
    updatePlayback();
  });
  document.addEventListener('visibilitychange', updatePlayback);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updatePlayback();
    }).observe(canvas.parentElement);
  }
  context.imageSmoothingEnabled = false;
  render();
  // Keep the artwork's descriptive alternative on the figure in animated mode.
  canvas.parentElement.setAttribute('role', 'img');
  canvas.parentElement.setAttribute('aria-label', still.alt);
  still.hidden = true;
  canvas.hidden = false;
  controls.hidden = false;
  updatePlayback();
}
configureProjectViews();
runCircuit().catch(() => { /* The illustrated still is the fallback when canvas assets cannot load. */ });
