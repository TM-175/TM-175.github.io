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

function runCircuit() {
  const figure = document.querySelector('.circuit');
  const host = figure.parentElement;
  const dialog = document.querySelector('.map-dialog');
  const expand = figure.querySelector('.map-expand');
  const guideToggle = figure.querySelector('.guide-toggle');
  const guide = document.getElementById('map-guide');
  const select = document.getElementById('map-landmark');
  const pins = document.getElementById('map-pins');
  const note = document.getElementById('place-note');
  const routeNote = document.getElementById('route-note');
  const routeName = document.getElementById('route-name');
  const lap = document.getElementById('lap');
  const play = document.getElementById('play');
  const speed = document.getElementById('speed');
  const still = document.getElementById('circuit-still');
  const canvas = document.getElementById('circuit-animation');
  const context = canvas.getContext('2d');
  const controls = figure.querySelector('.controls');
  const views = [...figure.querySelectorAll('[data-scene]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const routes = {
    city: {
      name: 'Three Sisters loop', counter: 'Lap', seconds: 18,
      alt: 'Pixel map of downtown Pittsburgh. A miniature red Formula 1 car follows a loop over the Allegheny between the Roberto Clemente and Rachel Carson bridges.',
      note: 'An imagined lap follows real streets across the Clemente Bridge, along the North Shore, and back across the Carson Bridge.',
    },
    campus: {
      name: 'CMU Buggy course', counter: 'Run', seconds: 22,
      alt: 'Pixel map of Carnegie Mellon and Schenley Park. A miniature red Formula 1 car traces the Buggy course from Margaret Morrison and Tech around Flagstaff Hill to the finish on Frew.',
      note: 'The car traces the CMU Sweepstakes route. It starts on Tech Street, rounds Flagstaff Hill on Schenley Drive, finishes on Frew Street, then resets for the next run.',
    },
  };
  const state = {};
  for (const [key, scene] of Object.entries(circuitData)) {
    state[key] = { progress: scene.initial / scene.frames.length, count: 1, place: 0 };
  }
  let active = 'city';
  let multiplier = 1;
  let paused = motion.matches;
  let inView = true;
  let frameRequest = null;
  let previousTime = null;
  let lastFrame = -1;
  let spriteAtlas = null;
  const backgrounds = new Map();

  function caption() {
    const label = routes[active].counter;
    lap.textContent = label + ' ' + String(state[active].count).padStart(2, '0');
    lap.title = 'Current ' + label.toLowerCase();
  }
  function drawCar() {
    const scene = circuitData[active];
    const index = Math.min(scene.frames.length - 1, Math.floor(state[active].progress * scene.frames.length));
    if (index === lastFrame) return;
    const [x, y, sprite] = scene.frames[index];
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(spriteAtlas, (sprite % 16) * 34, Math.floor(sprite / 16) * 24, 34, 24, x, y, 34, 24);
    lastFrame = index;
  }
  function tick(time) {
    if (previousTime !== null) {
      const current = state[active];
      current.progress += Math.min(time - previousTime, 100) / 1000 * multiplier / routes[active].seconds;
      if (current.progress >= 1) {
        current.progress %= 1;
        current.count++;
        caption();
      }
    }
    previousTime = time;
    drawCar();
    frameRequest = requestAnimationFrame(tick);
  }
  function playback() {
    if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    frameRequest = null;
    previousTime = null;
    const ready = Boolean(context && spriteAtlas && backgrounds.has(active));
    canvas.hidden = !ready;
    controls.hidden = !ready;
    const src = ready ? circuitData[active].ground : circuitData[active].still;
    if (still.getAttribute('src') !== 'assets/' + src) still.src = 'assets/' + src;
    const action = paused ? 'Play car animation' : 'Pause car animation';
    play.dataset.paused = String(paused);
    play.setAttribute('aria-label', action);
    play.title = action;
    if (ready) {
      drawCar();
      if (!paused && inView && !document.hidden) frameRequest = requestAnimationFrame(tick);
    }
  }
  function showPlace(index) {
    const place = circuitData[active].places[index];
    state[active].place = index;
    select.value = String(index);
    note.textContent = place.description;
    const zoom = active === 'campus' ? 18 : 17;
    document.getElementById('place-map-link').href = 'https://www.openstreetmap.org/?mlat=' + place.lat
      + '&mlon=' + place.lon + '#map=' + zoom + '/' + place.lat + '/' + place.lon;
    [...pins.children].forEach((pin, i) => pin.setAttribute('aria-pressed', String(i === index)));
  }
  function setGuide(open) {
    guide.hidden = !open;
    pins.hidden = !open;
    guideToggle.setAttribute('aria-expanded', String(open));
    guideToggle.querySelector('span').textContent = open ? '−' : '+';
  }
  function selectArea(key) {
    active = key;
    const scene = circuitData[key];
    figure.dataset.area = key;
    views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === key)));
    still.alt = routes[key].alt;
    routeName.textContent = routes[key].name;
    routeNote.textContent = routes[key].note + ' ';
    if (key === 'campus') {
      const source = document.createElement('a');
      source.href = 'https://cmubuggy.org/news/reference/course/';
      source.textContent = 'Course reference';
      routeNote.appendChild(source);
      const campusMap = document.createElement('a');
      campusMap.href = 'https://www.cmu.edu/sites/default/files/cmu-visit-site-files/2025-08/campus-map.pdf';
      campusMap.textContent = 'Campus map';
      routeNote.append(' · ', campusMap);
    }
    select.replaceChildren();
    pins.replaceChildren();
    scene.places.forEach((place, index) => {
      select.add(new Option(place.name, String(index)));
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'map-pin';
      pin.style.left = (place.x / canvas.width * 100) + '%';
      pin.style.top = (place.y / canvas.height * 100) + '%';
      pin.title = place.name;
      pin.setAttribute('aria-label', place.name);
      pin.addEventListener('click', () => showPlace(index));
      pins.append(pin);
    });
    showPlace(state[key].place);
    lastFrame = -1;
    caption();
    playback();
  }
  views.forEach(button => button.addEventListener('click', () => selectArea(button.dataset.scene)));
  select.addEventListener('change', () => showPlace(Number(select.value)));
  guideToggle.addEventListener('click', () => setGuide(guide.hidden));
  play.addEventListener('click', () => { paused = !paused; playback(); });
  speed.addEventListener('click', () => {
    multiplier = multiplier === 1 ? 2 : 1;
    speed.textContent = multiplier + '×';
    speed.setAttribute('aria-label', 'Change car speed, currently ' + multiplier + ' times');
  });
  let previousGuide = false;
  function expandLabel(open) {
    const label = open ? 'Close expanded map' : 'Enlarge map';
    expand.setAttribute('aria-label', label);
    expand.title = label;
  }
  if (typeof dialog.showModal === 'function') {
    expand.addEventListener('click', () => {
      if (dialog.open) {
        dialog.close();
        return;
      }
      previousGuide = !guide.hidden;
      host.style.minHeight = host.getBoundingClientRect().height + 'px';
      dialog.append(figure);
      dialog.showModal();
      setGuide(true);
      expandLabel(true);
      expand.focus({ preventScroll: true });
    });
    dialog.addEventListener('close', () => {
      host.append(figure);
      host.style.minHeight = '';
      setGuide(previousGuide);
      expandLabel(false);
      expand.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
  } else { expand.hidden = true; }
  motion.addEventListener('change', () => { paused = motion.matches; playback(); });
  document.addEventListener('visibilitychange', playback);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      playback();
    }).observe(canvas.parentElement);
  }
  guideToggle.hidden = false;
  figure.querySelector('.map-toolbar').hidden = false;
  selectArea('city');
  if (!context) return;
  context.imageSmoothingEnabled = false;
  async function bitmap(file) {
    const image = new Image();
    image.src = 'assets/' + file;
    await image.decode();
    return image;
  }
  bitmap('circuit-props.png').then(image => {
    spriteAtlas = image;
    playback();
  }).catch(() => { /* Retain both static scenes and their landmark guides. */ });
  for (const [key, scene] of Object.entries(circuitData)) {
    bitmap(scene.ground).then(image => {
      backgrounds.set(key, image);
      if (active === key) playback();
    }).catch(() => { /* The static route illustration remains available. */ });
  }
}
configureProjectViews();
runCircuit();
