/* ==========================================================================
   PETROLHEAD TECHNICA — live engine diagrams
   Ported to vanilla ES modules from the transmission-lab study project.
   Each factory builds its SVG once and returns an update() for the frame loop.
   ========================================================================== */
import {
  engines,
  pistonPosition,
  cylinderPhase,
  normalizedVolume,
  relativePressure,
  valveLift,
  strokes,
  strokeAt,
} from './engine-mechanics.js';

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function svg(host, viewBox, label) {
  host.textContent = '';
  const root = el('svg', { viewBox, role: 'img', 'aria-label': label });
  host.appendChild(root);
  return root;
}

/* ---------- piston + connecting rod linkage ---------- */
export function createLinkageChart(host) {
  const root = svg(host, '0 0 200 155', 'Animated piston and connecting rod linkage');
  root.appendChild(el('path', { d: 'M34 15V91M72 15V91M30 16H76', fill: 'none', stroke: '#a8b0b5', 'stroke-width': 2 }));
  root.appendChild(el('circle', { cx: 53, cy: 124, r: 21, fill: 'none', stroke: '#b8bfc4', 'stroke-dasharray': '3 3' }));
  const linkage = el('path', { fill: 'none', stroke: '#202a31', 'stroke-width': 4, 'stroke-linecap': 'round' });
  const piston = el('rect', { x: 37, width: 32, height: 12, rx: 2, fill: '#bcc6cd', stroke: '#58656e' });
  const bigEnd = el('circle', { r: 4, fill: '#d61d3d' });
  const guides = el('path', { stroke: '#bdc4c8', 'stroke-dasharray': '3 3', fill: 'none' });
  const pct = el('text', { x: 109, y: 112, 'font-size': 13, fill: '#505d66' });
  const caption = el('text', { x: 94, y: 130, 'font-size': 10, fill: '#7a868d' });
  root.append(linkage, piston, bigEnd, el('circle', { cx: 53, cy: 124, r: 4, fill: '#d61d3d' }), guides, pct, caption);

  return {
    setLang(bm) { caption.textContent = bm ? 'DARI ATAS' : 'FROM TOP'; },
    update(phase) {
      const theta = (phase * Math.PI) / 180,
        scale = 36,
        x = 53 + 0.58 * scale * Math.sin(theta),
        y = 124 - 0.58 * scale * Math.cos(theta),
        top = 124 - pistonPosition(phase) * scale;
      linkage.setAttribute('d', `M53 124L${x} ${y}L53 ${top}`);
      piston.setAttribute('y', top - 6);
      bigEnd.setAttribute('cx', x);
      bigEnd.setAttribute('cy', y);
      guides.setAttribute('d', `M83 ${top}H153M91 17H153M140 17V${top}`);
      pct.textContent = `${Math.round(normalizedVolume(phase) * 100)}%`;
    },
  };
}

/* ---------- cylinder layout, clickable ---------- */
export function createCylinderLayout(host, car, onSelect) {
  const c = engines[car];
  const root = svg(host, '0 0 200 130', 'Cylinder layout');
  root.setAttribute('role', 'group');
  root.appendChild(el('rect', {
    x: c.cylinders === 6 ? 62 : 78, y: 7,
    width: c.cylinders === 6 ? 76 : 44, height: 114,
    rx: 13, fill: '#f1f3f4', stroke: '#d0d7db',
  }));

  const cells = [];
  for (let i = 0; i < c.cylinders; i++) {
    const cx = c.cylinders === 6 ? (i % 2 === 0 ? 81 : 119) : 100,
      cy = c.cylinders === 6 ? 24 + Math.floor(i / 2) * 33 + (i % 2) * 9 : 23 + i * 27;
    const g = el('g', { role: 'button', tabindex: 0, 'aria-label': `Select cylinder ${i + 1}`, class: 'layout-cylinder' });
    const circle = el('circle', { cx, cy, r: 11, fill: '#fff', stroke: '#8f9ca4', 'stroke-width': 1 });
    const text = el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#435059' });
    text.textContent = String(i + 1);
    g.append(circle, text);
    const pick = () => onSelect(i + 1);
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
    });
    root.appendChild(g);
    cells.push({ circle, text });
  }

  const front = el('text', { x: 11, y: 23, 'font-size': 10, fill: '#7b8990' });
  const rear = el('text', { x: 150, y: 111, 'font-size': 10, fill: '#7b8990' });
  root.append(
    front, el('path', { d: 'M45 22H62', stroke: '#a8b3ba', 'stroke-dasharray': '2 3' }),
    rear, el('path', { d: 'M136 108H149', stroke: '#a8b3ba', 'stroke-dasharray': '2 3' }),
  );

  return {
    setLang(bm) {
      front.textContent = bm ? 'DEPAN' : 'FRONT';
      rear.textContent = bm ? 'BELAKANG' : 'REAR';
    },
    update(selected, angle) {
      cells.forEach((cell, i) => {
        const active = strokeAt(cylinderPhase(car, i + 1, angle)) === 2;
        const on = selected === i + 1;
        cell.circle.setAttribute('fill', active ? '#f7d8de' : '#fff');
        cell.circle.setAttribute('stroke', on ? '#d51d3d' : '#8f9ca4');
        cell.circle.setAttribute('stroke-width', on ? 2 : 1);
        cell.text.setAttribute('fill', active ? '#c61937' : '#435059');
      });
    },
  };
}

function pathFrom(fn) {
  return Array.from({ length: 145 }, (_, i) =>
    `${i ? 'L' : 'M'}${(12 + (i / 144) * 208).toFixed(2)} ${(92 - fn(i * 5) * 68).toFixed(2)}`,
  ).join(' ');
}

/* ---------- idealized valve lift over 720° ---------- */
export function createValveChart(host) {
  const root = svg(host, '0 0 232 120', 'Idealized intake and exhaust valve lift over 720 crank degrees');
  root.appendChild(el('path', { d: 'M12 17V93H222M12 58H222', fill: 'none', stroke: '#e0e4e7' }));
  root.appendChild(el('path', { d: pathFrom((p) => valveLift(p, true)), fill: 'none', stroke: '#329bc8', 'stroke-width': 2 }));
  root.appendChild(el('path', { d: pathFrom((p) => valveLift(p, false)), fill: 'none', stroke: '#737785', 'stroke-width': 2 }));
  root.appendChild(el('path', { d: pathFrom((p) => normalizedVolume(p) * 0.8), fill: 'none', stroke: '#bfc8ce', 'stroke-width': 1.5, 'stroke-dasharray': '3 4' }));
  const cursor = el('path', { stroke: '#d61d3d', 'stroke-width': 1.5 });
  root.appendChild(cursor);
  for (const [x, t] of [[10, '0°'], [107, '360°'], [201, '720°']]) {
    const label = el('text', { x, y: 112, 'font-size': 10, fill: '#87929a' });
    label.textContent = t;
    root.appendChild(label);
  }
  return {
    update(phase) {
      cursor.setAttribute('d', `M${12 + (phase / 720) * 208} 12V96`);
    },
  };
}

/* ---------- relative pressure against volume ---------- */
export function createPressureChart(host) {
  const root = svg(host, '0 0 232 120', 'Illustrative relative cylinder pressure versus volume');
  root.appendChild(el('path', { d: 'M15 10V94H221', stroke: '#d7dde1', fill: 'none' }));
  const loop = Array.from({ length: 181 }, (_, i) =>
    `${i ? 'L' : 'M'}${(15 + normalizedVolume(i * 4) * 202).toFixed(2)} ${(94 - relativePressure(i * 4) * 77).toFixed(2)}`,
  ).join(' ');
  root.appendChild(el('path', { d: loop, fill: 'none', stroke: '#34424b', 'stroke-width': 1.7 }));
  const dot = el('circle', { r: 4, stroke: 'white', 'stroke-width': 1.3 });
  const pressure = el('text', { x: 28, y: 20, 'font-size': 10, fill: '#87929a' });
  const volume = el('text', { x: 167, y: 113, 'font-size': 10, fill: '#87929a' });
  root.append(dot, pressure, volume);
  return {
    setLang(bm) {
      pressure.textContent = bm ? 'TEKANAN' : 'PRESSURE';
      volume.textContent = bm ? 'ISI PADU →' : 'VOLUME →';
    },
    update(phase) {
      dot.setAttribute('cx', 15 + normalizedVolume(phase) * 202);
      dot.setAttribute('cy', 94 - relativePressure(phase) * 77);
      dot.setAttribute('fill', strokes[strokeAt(phase)].color);
    },
  };
}
