(() => {
  const canvas = document.getElementById('bg-life');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const CELL = 16;
  const STEP_MS = 180;
  const RESEED_MS = 9000;
  const FILL = 'rgba(217, 70, 239, 0.18)';

  let cols, rows, grid, next, lastStep = 0;

  // Four glider orientations (moving SE, SW, NE, NW respectively)
  const GLIDERS = [
    [[0,1,0],[0,0,1],[1,1,1]],
    [[0,1,0],[1,0,0],[1,1,1]],
    [[1,1,1],[0,0,1],[0,1,0]],
    [[1,1,1],[1,0,0],[0,1,0]],
  ];

  const makeGrid = () =>
    Array.from({ length: rows }, () => new Uint8Array(cols));

  function placeGlider(g, r, c) {
    for (let i = 0; i < g.length; i++) {
      for (let j = 0; j < g[i].length; j++) {
        const rr = (r + i + rows) % rows;
        const cc = (c + j + cols) % cols;
        grid[rr][cc] = g[i][j];
      }
    }
  }

  function seed(count = 5) {
    for (let i = 0; i < count; i++) {
      const p = GLIDERS[Math.floor(Math.random() * GLIDERS.length)];
      placeGlider(p,
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
        next[r][c] = (alive ? (n === 2 || n === 3) : (n === 3)) ? 1 : 0;
      }
    }
    [grid, next] = [next, grid];
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = FILL;
    const size = CELL - 2;
    for (let r = 0; r < rows; r++) {
      const row = grid[r];
      const y = r * CELL;
      for (let c = 0; c < cols; c++) {
        if (row[c]) ctx.fillRect(c * CELL, y, size, size);
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

  // Keep the field lively: reseed if it's too sparse/dense, otherwise drop in a fresh glider.
  setInterval(() => {
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
      const p = GLIDERS[Math.floor(Math.random() * GLIDERS.length)];
      placeGlider(p,
        Math.floor(Math.random() * rows),
        Math.floor(Math.random() * cols));
    }
  }, RESEED_MS);

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
})();
