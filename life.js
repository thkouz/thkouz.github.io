(() => {
  const canvas = document.getElementById('bg-life');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const CELL = 16;
  const STEP_MS = 180;
  const RESEED_MS = 9000;
  const RGB = '13, 148, 136';
  const ALIVE_ALPHA = 0.14;
  const NEWBORN_ALPHA = 0.3;
  const TRAIL_ALPHA = 0.08;
  const TRAIL_DECAY = 0.94;   // per frame
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cols, rows, grid, next, age, trail, lastStep = 0;

  // Four glider orientations (moving SE, SW, NE, NW respectively)
  const GLIDERS = [
    [[0,1,0],[0,0,1],[1,1,1]],
    [[0,1,0],[1,0,0],[1,1,1]],
    [[1,1,1],[0,0,1],[0,1,0]],
    [[1,1,1],[1,0,0],[0,1,0]],
  ];

  const makeGrid = () =>
    Array.from({ length: rows }, () => new Uint8Array(cols));
  const makeField = () =>
    Array.from({ length: rows }, () => new Float32Array(cols));

  function placeGlider(g, r, c) {
    for (let i = 0; i < g.length; i++) {
      for (let j = 0; j < g[i].length; j++) {
        const rr = (r + i + rows) % rows;
        const cc = (c + j + cols) % cols;
        grid[rr][cc] = g[i][j];
        if (g[i][j]) age[rr][cc] = 0;
      }
    }
  }

  const randomGlider = () => GLIDERS[Math.floor(Math.random() * GLIDERS.length)];

  function seed(count = 5) {
    for (let i = 0; i < count; i++) {
      placeGlider(randomGlider(),
        Math.floor(Math.random() * rows),
        Math.floor(Math.random() * cols));
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(window.innerWidth / CELL) + 2;
    rows = Math.ceil(window.innerHeight / CELL) + 2;
    grid = makeGrid();
    next = makeGrid();
    age = makeGrid();
    trail = makeField();
    seed(6);
  }

  function step() {
    for (let r = 0; r < rows; r++) {
      const rN = (r - 1 + rows) % rows;
      const rS = (r + 1) % rows;
      for (let c = 0; c < cols; c++) {
        const cW = (c - 1 + cols) % cols;
        const cE = (c + 1) % cols;
        const n =
          grid[rN][cW] + grid[rN][c] + grid[rN][cE] +
          grid[r][cW]              + grid[r][cE] +
          grid[rS][cW] + grid[rS][c] + grid[rS][cE];
        const alive = grid[r][c];
        const lives = alive ? (n === 2 || n === 3) : (n === 3);
        next[r][c] = lives ? 1 : 0;
        if (lives) age[r][c] = alive ? Math.min(age[r][c] + 1, 255) : 0;
        else if (alive) trail[r][c] = 1;   // just died: leave a fading ghost
      }
    }
    [grid, next] = [next, grid];
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const size = CELL - 2;
    for (let r = 0; r < rows; r++) {
      const row = grid[r], ages = age[r], tr = trail[r];
      const y = r * CELL;
      for (let c = 0; c < cols; c++) {
        let a;
        if (row[c]) {
          // newborn cells flash brighter, then settle
          a = ages[c] === 0 ? NEWBORN_ALPHA : ALIVE_ALPHA;
        } else if (tr[c] > 0.02) {
          a = tr[c] * TRAIL_ALPHA;
          tr[c] *= TRAIL_DECAY;
        } else {
          tr[c] = 0;
          continue;
        }
        ctx.fillStyle = `rgba(${RGB}, ${a})`;
        ctx.fillRect(c * CELL, y, size, size);
      }
    }
  }

  function loop(t) {
    if (t - lastStep > STEP_MS) {
      step();
      lastStep = t;
    }
    render();
    requestAnimationFrame(loop);
  }

  // Click anywhere (except links) to launch a glider from that spot.
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    const c = Math.floor(e.clientX / CELL) - 1;
    const r = Math.floor(e.clientY / CELL) - 1;
    // aim the glider away from the page centre
    const east = e.clientX > window.innerWidth / 2;
    const south = e.clientY > window.innerHeight / 2;
    const g = GLIDERS[(south ? 0 : 2) + (east ? 0 : 1)];
    placeGlider(g, r, c);
    if (reduceMotion) render();
  });

  // Moving the cursor gently sparks cells nearby.
  let lastSpark = 0;
  window.addEventListener('pointermove', (e) => {
    if (reduceMotion || e.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - lastSpark < 120) return;
    lastSpark = now;
    const r = (Math.floor(e.clientY / CELL) + rows) % rows;
    const c = (Math.floor(e.clientX / CELL) + cols) % cols;
    trail[r][c] = 1.6;
  });

  // Keep the field lively: reseed if it's too sparse/dense, otherwise drop in a fresh glider.
  setInterval(() => {
    if (reduceMotion || document.hidden) return;
    let count = 0;
    for (let r = 0; r < rows; r++) {
      const row = grid[r];
      for (let c = 0; c < cols; c++) count += row[c];
    }
    const total = rows * cols;
    if (count < total * 0.004 || count > total * 0.18) {
      grid = makeGrid();
      seed(6);
    } else {
      placeGlider(randomGlider(),
        Math.floor(Math.random() * rows),
        Math.floor(Math.random() * cols));
    }
  }, RESEED_MS);

  window.addEventListener('resize', () => { resize(); if (reduceMotion) render(); });
  resize();
  if (reduceMotion) render();
  else requestAnimationFrame(loop);
})();
