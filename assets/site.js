function configureProjectViews() {
  const group = document.getElementById('view-controls');
  const grid = document.getElementById('projects');
  const gridButton = document.getElementById('grid-view');
  const listButton = document.getElementById('list-view');
  function selectView(view) {
    const list = view !== 'grid';
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
  try { selectView(localStorage.getItem('tm-project-view')); } catch { selectView('list'); }
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
  const stage = canvas.parentElement;
  const controls = figure.querySelector('.controls');
  const views = [...figure.querySelectorAll('[data-scene]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const routes = {
    city: {
      name: 'Three Rivers flight', counter: 'Orbit', seconds: 34, vehicle: 'flight',
      alt: 'Pixel map of downtown Pittsburgh. A small high-wing propeller plane banks over the three rivers and the downtown skyline.',
      note: 'A high-wing touring plane makes a sightseeing loop over the Point, the North Shore, and the downtown skyline.',
    },
    campus: {
      name: 'CMU Buggy course', counter: 'Run', seconds: 22, vehicle: 'car',
      alt: 'Pixel map of Carnegie Mellon and Schenley Park. A miniature red Formula 1 car traces the Buggy course from Margaret Morrison and Tech around Flagstaff Hill to the finish on Frew.',
      note: 'The car traces the CMU Sweepstakes route. It starts on Tech Street, rounds Flagstaff Hill on Schenley Drive, finishes on Frew Street, then resets for the next run.',
    },
  };
  const state = {};
  for (const key of Object.keys(routes)) {
    state[key] = { progress: key === 'city' ? .545 : 10 / 479, count: 1, place: 0 };
  }
  let active = 'city';
  let multiplier = 1;
  let paused = motion.matches;
  let inView = true;
  let frameRequest = null;
  let previousTime = null;
  let turnFrame = null;
  const orbit = new MapOrbit(canvas, () => {
    positionPins();
    playback();
  });

  function positionPins() {
    const view = orbit.facing?.view;
    if (view) {
      const north = Math.atan2(view.sin, .57 * view.cos);
      figure.style.setProperty('--north-turn', north + 'rad');
    }
    if (pins.hidden) return;
    const places = circuitData[active].places;
    [...pins.children].forEach((pin, i) => {
      const p = orbit.landmark(places[i].position);
      pin.style.left = (p[0] / canvas.width * 100) + '%';
      pin.style.top = (p[1] / canvas.height * 100) + '%';
    });
  }
  function caption() {
    const label = routes[active].counter;
    lap.textContent = label + ' ' + String(state[active].count).padStart(2, '0');
    lap.title = 'Current ' + label.toLowerCase();
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
    orbit.draw(state[active].progress);
    frameRequest = requestAnimationFrame(tick);
  }
  function playback() {
    if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    frameRequest = null;
    previousTime = null;
    const ready = orbit.ready;
    canvas.hidden = !ready;
    still.hidden = ready;
    controls.hidden = !ready;
    const action = (paused ? 'Play ' : 'Pause ') + routes[active].vehicle + ' animation';
    play.dataset.paused = String(paused);
    play.setAttribute('aria-label', action);
    play.title = action;
    if (ready) {
      orbit.draw(state[active].progress);
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
    positionPins();
    guideToggle.setAttribute('aria-expanded', String(open));
    guideToggle.querySelector('span').textContent = open ? '−' : '+';
  }
  function selectArea(key) {
    active = key;
    const scene = circuitData[key];
    figure.dataset.area = key;
    views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === key)));
    stopTurn();
    orbit.switchTo(key);
    still.src = 'assets/' + scene.still;
    still.alt = routes[key].alt;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', routes[key].alt);
    canvas.removeAttribute('aria-hidden');
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
      pin.title = place.name;
      pin.setAttribute('aria-label', place.name);
      pin.addEventListener('click', () => showPlace(index));
      pins.append(pin);
    });
    showPlace(state[key].place);
    positionPins();
    caption();
    playback();
  }
  function stopTurn() {
    if (turnFrame !== null) cancelAnimationFrame(turnFrame);
    turnFrame = null;
  }
  function setBearing(radians) {
    stage.dataset.turned = '';
    orbit.turnTo(radians);
    positionPins();
    orbit.draw(state[active].progress);
  }
  function rotate(delta) {
    stopTurn();
    const start = orbit.bearings[active];
    if (motion.matches) {
      setBearing(start + delta);
      return;
    }
    const begin = performance.now();
    function advance(time) {
      const t = Math.min(1, (time - begin) / 240);
      setBearing(start + delta * (1 - Math.pow(1 - t, 3)));
      turnFrame = t < 1 ? requestAnimationFrame(advance) : null;
    }
    turnFrame = requestAnimationFrame(advance);
  }
  figure.querySelectorAll('[data-turn]').forEach(button => {
    button.addEventListener('click', () => rotate(Number(button.dataset.turn) * Math.PI / 4));
  });
  stage.addEventListener('keydown', event => {
    if (event.target !== stage) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      rotate((event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 4);
    } else if (event.key === 'Home') {
      event.preventDefault();
      stopTurn();
      setBearing(0);
    }
  });
  let drag = null;
  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary || event.target.closest('button')) return;
    stopTurn();
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, angle: orbit.bearings[active]};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (!stage.hasAttribute('data-dragging') && Math.abs(dx) < 5) return;
    stage.dataset.dragging = '';
    setBearing(drag.angle + dx * Math.PI * 2 / stage.clientWidth);
  });
  function endDrag() {
    drag = null;
    stage.removeAttribute('data-dragging');
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', endDrag);
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
  if (orbit.context) {
    stage.tabIndex = 0;
    stage.dataset.rotatable = '';
  } else {
    figure.querySelector('.turn-controls').hidden = true;
  }
  guideToggle.hidden = false;
  figure.querySelector('.map-toolbar').hidden = false;
  selectArea('city');
}
configureProjectViews();
runCircuit();
