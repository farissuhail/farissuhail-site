/* ==========================================================================
   PETROLHEAD TECHNICA — four-stroke engine mechanics
   Ported to vanilla ES modules from the transmission-lab study project.
   Pure functions: one 720° cycle drives the model, the diagrams and the copy.
   ========================================================================== */

export const engines = {
  r32: {
    name: 'Golf Mk5 R32',
    year: 2006,
    manufacturer: 'VOLKSWAGEN',
    family: '3.2 VR6',
    subtitle: '3.2 L · 15° VR6 · 24 valves',
    subtitleBm: '3.2 L · VR6 15° · 24 injap',
    cylinders: 6,
    bankAngle: 15,
    bore: 84,
    stroke: 95.9,
    firingOrder: [1, 5, 3, 6, 2, 4],
    fuel: 'Petrol',
    induction: 'Naturally aspirated',
    inductionBm: 'Sedutan asli',
    head: 'One cylinder head · two overhead camshafts',
    headBm: 'Satu kepala silinder · dua aci sesondol atas',
    description:
      'Six cylinders in two closely staggered rows beneath one cylinder head. The narrow 15° layout is the defining feature of the VR6.',
    descriptionBm:
      'Enam silinder dalam dua baris berselang-seli rapat di bawah satu kepala silinder. Susunan sempit 15° itulah ciri utama VR6.',
    links: [
      {
        href: 'https://www.volkspage.net/technik/ssp/ssp/SSP_380.pdf',
        text: 'Audi / Volkswagen SSP 380 · 3.2 VR6 MPI (BUB), page 24',
      },
      {
        href: 'https://www.australiancar.reviews/_pdfs/Volkswagen_Golf-R32_Mk5_Specifications_200607.pdf',
        text: 'Volkswagen · July 2006 Golf R32 specifications (hosted copy)',
      },
    ],
  },
  sharan: {
    name: 'Sharan 7N',
    year: 2012,
    manufacturer: 'VOLKSWAGEN',
    family: '2.0 TSI',
    subtitle: '2.0 L · Inline-four · 16 valves',
    subtitleBm: '2.0 L · Empat sebaris · 16 injap',
    cylinders: 4,
    bankAngle: 0,
    bore: 82.5,
    stroke: 92.8,
    firingOrder: [1, 3, 4, 2],
    fuel: 'Petrol',
    induction: 'Turbocharged · direct injection',
    inductionBm: 'Turbo · suntikan terus',
    head: 'One cylinder head · two overhead camshafts',
    headBm: 'Satu kepala silinder · dua aci sesondol atas',
    description:
      'A turbocharged, direct-injection four-cylinder petrol engine. The four pistons share a straight cylinder row and a common crankshaft.',
    descriptionBm:
      'Enjin petrol empat silinder berturbo dengan suntikan terus. Empat omboh berkongsi satu baris silinder lurus dan satu aci engkol.',
    links: [
      {
        href: 'https://files.samantaz.fr/useful_knowledge/car_repair_manuals/VW/SSP%20445%20Le%20Sharan%202011.pdf',
        text: 'Volkswagen SSP 445 · Sharan 2.0 TSI, page 28 (hosted copy)',
      },
      {
        href: 'https://www.vaglinks.com/docs/ssp/VWUSA.COM_SSP_401_1.8L_TFSI_Engine_16V.pdf',
        text: 'Volkswagen SSP 401 · Chain-driven EA888 architecture (hosted copy)',
      },
    ],
  },
  bmw: {
    name: 'X4 F26 xDrive20i',
    year: 2016,
    manufacturer: 'BMW',
    family: '2.0 N20',
    subtitle: '2.0 L · Inline-four · 16 valves',
    subtitleBm: '2.0 L · Empat sebaris · 16 injap',
    cylinders: 4,
    bankAngle: 0,
    bore: 84,
    stroke: 90.1,
    firingOrder: [1, 3, 4, 2],
    fuel: 'Petrol',
    induction: 'Twin-scroll turbo · direct injection',
    inductionBm: 'Turbo dwi-skrol · suntikan terus',
    head: 'DOHC · Double VANOS · Valvetronic',
    headBm: 'DOHC · Double VANOS · Valvetronic',
    description:
      'The N20 four-cylinder petrol engine combines turbocharging, variable cam timing and variable intake-valve lift. The display demonstrates the basic four-stroke cycle.',
    descriptionBm:
      'Enjin petrol empat silinder N20 menggabungkan turbo, pemasaan sesondol boleh ubah dan angkatan injap masuk boleh ubah. Paparan ini menunjukkan kitaran empat lejang asas.',
    links: [
      {
        href: 'https://www.press.bmwgroup.com/global/article/attachment/T0169768EN/252711',
        text: 'BMW · X4 F26 xDrive20i specifications',
      },
      {
        href: 'https://bmwrepairguide.com/virtual-library/technical-training/ST1111%20N20%20Engine.pdf',
        text: 'BMW · N20 engine training (manufacturer-authored hosted copy)',
      },
    ],
  },
};

export const strokes = [
  {
    name: 'Intake',
    nameBm: 'Sedutan',
    color: '#329bc8',
    description:
      'The piston moves down. The intake valves open to admit fresh charge.',
    descriptionBm:
      'Omboh bergerak ke bawah. Injap masuk terbuka untuk memasukkan cas segar.',
  },
  {
    name: 'Compression',
    nameBm: 'Mampatan',
    color: '#cf983d',
    description:
      'The piston rises with both valve pairs closed, compressing the charge.',
    descriptionBm:
      'Omboh naik dengan kedua-dua pasang injap tertutup, memampatkan cas.',
  },
  {
    name: 'Power',
    nameBm: 'Kuasa',
    color: '#d91e40',
    description:
      'Combustion pushes the piston down and turns the crankshaft through the connecting rod.',
    descriptionBm:
      'Pembakaran menolak omboh ke bawah dan memutarkan aci engkol melalui rod penyambung.',
  },
  {
    name: 'Exhaust',
    nameBm: 'Ekzos',
    color: '#737785',
    description:
      'The piston rises as the exhaust valves open and the burnt gases leave.',
    descriptionBm:
      'Omboh naik apabila injap ekzos terbuka dan gas terbakar keluar.',
  },
];

export const mod = (value, base) => ((value % base) + base) % base;

export function cylinderPhase(car, cylinder, angle) {
  const config = engines[car];
  const index = config.firingOrder.indexOf(cylinder);
  return mod(angle - (Math.max(index, 0) * 720) / config.cylinders + 360, 720);
}

export function strokeAt(phase) {
  return Math.min(3, Math.floor(mod(phase, 720) / 180));
}

export function valveLift(phase, intake) {
  const p = mod(phase, 720);
  const t = intake ? p : p - 540;
  return t > 0 && t < 180 ? Math.sin((t * Math.PI) / 180) : 0;
}

// Rod length is a display proportion, not a manufacturer specification.
export function pistonPosition(phase, radius = 0.58, rod = 1.78) {
  const a = (phase * Math.PI) / 180;
  return (
    radius * Math.cos(a) +
    Math.sqrt(rod * rod - radius * radius * Math.sin(a) ** 2)
  );
}

export function normalizedVolume(phase) {
  return (pistonPosition(0) - pistonPosition(phase)) / 1.16;
}

// Relative educational pressure; no measured cylinder pressure is implied.
export function relativePressure(phase) {
  const p = mod(phase, 720);
  const v = 0.12 + normalizedVolume(p);
  let value = 0.075;
  if (p >= 180 && p < 360) value = 0.065 * Math.pow(1.12 / v, 1.25);
  else if (p >= 360 && p < 540) value = 1.45 * Math.pow(0.12 / v, 1.15);
  else if (p >= 540) value = 0.105;
  return Math.min(1, value / 1.45);
}
