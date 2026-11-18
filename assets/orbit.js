/* Offline geographic turntable. Angles are radians inside the projection. */
const MapOrbit = (() => {
  const width = 636;
  const height = 354;
  const pitch = .57;
  const tau = Math.PI * 2;
  const viewpoints = 48;
  const perSheet = 4;
  const step = tau / viewpoints;
  const wrap = (value, count) => (value % count + count) % count;
  const angularDistance = (a, b) => wrap(a - b + Math.PI, tau) - Math.PI;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  function camera(scene, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [east, north] = scene.extent;
    const across = east * Math.abs(cos) + north * Math.abs(sin);
    const deep = east * Math.abs(sin) + north * Math.abs(cos);
    return {angle, cos, sin, scale: Math.min((width - 26) / across, (height - 55) / (pitch * deep))};
  }
  function project(point, view) {
    const [east, north, up] = point;
    return [
      width / 2 + view.scale * (east * view.cos + north * view.sin),
      height * .535 + view.scale * ((east * view.sin - north * view.cos) * pitch - up),
    ];
  }
  function image(file) {
    const bitmap = new Image();
    bitmap.src = 'assets/' + file;
    return bitmap.decode().then(() => bitmap);
  }
  function canvas2d(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const context = c.getContext('2d');
    context.imageSmoothingEnabled = false;
    return context;
  }

  class Renderer {
    constructor(canvas, notify) {
      this.context = canvas.getContext('2d');
      this.notify = notify;
      this.sheets = new Map();
      this.requests = new Map();
      this.retryAfter = new Map();
      this.bearings = {city: 0, campus: 0};
      this.active = 'city';
      this.facing = null;
      if (!this.context) return;
      this.context.imageSmoothingEnabled = false;
      this.background = canvas2d(width, height);
      this.shadow = canvas2d(74, 74);
      this.carTables = circuitData.campus.spriteTables.map(encoded => {
        const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
        return new DataView(bytes.buffer);
      });
      image('orbit/airplane.png').then(plane => {
        this.plane = plane;
        this.notify();
      }).catch(() => {});
    }
    switchTo(key) {
      this.active = key;
      this.facing = null;
      this.cacheKey = '';
      this.ensureView();
    }
    ensureView() {
      if (!this.context) return;
      const key = this.active;
      const scene = circuitData[key];
      const base = scene.initialAngle * Math.PI / 180;
      const wanted = wrap(Math.round(this.bearings[key] / step), viewpoints);
      const group = Math.floor(wanted / perSheet);
      this.loadGroup(key, group);
      // Only adjacent sheets are warmed. A first visit does not fetch an entire revolution.
      if (this.sheets.has(key + group)) {
        const neighbor = wanted % perSheet < perSheet / 2 ? -1 : 1;
        this.loadGroup(key, wrap(group + neighbor, viewpoints / perSheet));
      }
      let nearest = wanted;
      if (!this.sheets.has(key + group)) {
        let distance = Infinity;
        nearest = null;
        for (let i = 0; i < viewpoints; i++) {
          if (!this.sheets.has(key + Math.floor(i / perSheet))) continue;
          const d = Math.abs(angularDistance(this.bearings[key], i * step));
          if (d < distance) { distance = d; nearest = i; }
        }
        if (nearest === null) return;
      }
      const exact = base + nearest * step;
      const offset = clamp(angularDistance(base + this.bearings[key], exact), -step, step);
      this.facing = {index: nearest, baked: camera(scene, exact), view: camera(scene, exact + offset)};
    }
    loadGroup(key, group) {
      const id = key + group;
      if (this.sheets.has(id) || this.requests.has(id) || Date.now() < (this.retryAfter.get(id) || 0)) return;
      const files = [image('orbit/' + key + '-' + group + '.webp')];
      if (key === 'campus') files.push(image('orbit/car-' + group + '.png'));
      this.requests.set(id, Promise.all(files).then(([map, car]) => {
        this.sheets.set(id, {map, car});
        // Bound decoded texture memory when visitors rotate through both maps.
        if (this.sheets.size > 8) {
          const current = this.active + Math.floor(wrap(Math.round(this.bearings[this.active] / step), viewpoints) / perSheet);
          const displayed = this.facing && this.active + Math.floor(this.facing.index / perSheet);
          const oldest = [...this.sheets.keys()].find(stored => stored !== current && stored !== displayed && stored !== id);
          this.sheets.delete(oldest);
        }
        if (key === this.active) {
          this.ensureView();
          this.notify();
        }
      }).catch(() => this.retryAfter.set(id, Date.now() + 10000)).finally(() => this.requests.delete(id)));
    }
    turnTo(radians) {
      this.bearings[this.active] = wrap(radians, tau);
      this.ensureView();
    }
    get ready() {
      return Boolean(this.facing && (this.active === 'campus' || this.plane));
    }
    landmark(point) {
      const scene = circuitData[this.active];
      const view = this.facing?.view || camera(scene, scene.initialAngle * Math.PI / 180);
      return project(point, view);
    }
    paintBackground() {
      const {index, baked, view} = this.facing;
      const key = this.active + ':' + index + ':' + view.angle;
      if (key === this.cacheKey) return;
      this.cacheKey = key;
      const group = Math.floor(index / perSheet);
      const {map} = this.sheets.get(this.active + group);
      const slot = index % perSheet;
      const ctx = this.background;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      // Reproject the ground plane between neighboring depth-sorted renders.
      const delta = view.angle - baked.angle;
      const k = view.scale / baked.scale;
      ctx.translate(width / 2, height * .535);
      ctx.transform(k * Math.cos(delta), k * pitch * Math.sin(delta),
                    -k * Math.sin(delta) / pitch, k * Math.cos(delta), 0, 0);
      ctx.translate(-width / 2, -height * .535);
      ctx.drawImage(map, (slot % 2) * width, Math.floor(slot / 2) * height, width, height, 0, 0, width, height);
      ctx.restore();
    }
    drawFlight(progress) {
      const view = this.facing.view;
      const t = progress * tau;
      const east = -90 + 836 * Math.cos(t);
      const north = 35 + 340 * Math.sin(t) + 77 * Math.sin(2 * t - .4);
      const up = 183 + 14 * Math.sin(t - .8);
      const de = -836 * Math.sin(t);
      const dn = 340 * Math.cos(t) + 154 * Math.cos(2 * t - .4);
      const dx = de * view.cos + dn * view.sin;
      const depth = de * view.sin - dn * view.cos;
      const heading = wrap(Math.round(Math.atan2(depth, dx) / tau * 64), 64);
      const curve = de * (-340 * Math.sin(t) - 308 * Math.sin(2 * t - .4)) + dn * 836 * Math.cos(t);
      const curvature = curve / Math.pow(de * de + dn * dn, 1.5);
      const bank = curvature > .0008 ? 2 : curvature < -.0008 ? 0 : 1;
      const phase = Math.floor(progress * 360) % 3;
      const sprite = (bank * 3 + phase) * 64 + heading;
      const sx = sprite % 16 * 74;
      const sy = Math.floor(sprite / 16) * 74;
      const ctx = this.context;
      const ground = project([east + 28, north - 18, 5], view);
      const position = project([east, north, up], view);
      const shadow = this.shadow;
      if (this.lastShadow !== sprite) {
        shadow.clearRect(0, 0, 74, 74);
        shadow.drawImage(this.plane, sx, sy, 74, 74, 0, 0, 74, 74);
        shadow.globalCompositeOperation = 'source-in';
        shadow.fillStyle = '#38483d';
        shadow.fillRect(0, 0, 74, 74);
        shadow.globalCompositeOperation = 'source-over';
        this.lastShadow = sprite;
      }
      ctx.save();
      ctx.globalAlpha = .24;
      ctx.drawImage(shadow.canvas, Math.round(ground[0] - 29), Math.round(ground[1] - 19), 58, 38);
      ctx.restore();
      ctx.drawImage(this.plane, sx, sy, 74, 74, Math.round(position[0]) - 37, Math.round(position[1]) - 37, 74, 74);
    }
    drawCampus(progress) {
      const {index, view} = this.facing;
      const scene = circuitData.campus;
      const steps = scene.route.length;
      const position = progress * (steps - 1);
      const i = Math.min(steps - 2, Math.floor(position));
      const f = position - i;
      const a = scene.route[i], b = scene.route[i + 1];
      const p = project(a.map((v, axis) => v + (b[axis] - v) * f), view);
      const group = Math.floor(index / perSheet);
      const slot = index % perSheet;
      const sprite = this.carTables[group].getUint16(2 * (slot * steps + Math.round(position)), true);
      const car = this.sheets.get('campus' + group).car;
      this.context.drawImage(car, sprite % 32 * 34, Math.floor(sprite / 32) * 24, 34, 24,
                             Math.round(p[0]) - 17, Math.round(p[1]) - 14, 34, 24);
    }
    draw(progress) {
      if (!this.ready) return;
      this.paintBackground();
      this.context.clearRect(0, 0, width, height);
      this.context.drawImage(this.background.canvas, 0, 0);
      if (this.active === 'city') this.drawFlight(progress);
      else this.drawCampus(progress);
    }
  }
  return Renderer;
})();
