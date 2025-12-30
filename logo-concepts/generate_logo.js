function getHexagonPath(cx, cy, r, cornerRadius) {
  // Hexagon vertices, starting from top (angle -90), going clockwise
  const angles = [-90, -30, 30, 90, 150, 210].map((a) => (a * Math.PI) / 180);
  const vertices = angles.map((a) => ({
    x: cx + r * Math.cos(a),
    y: cy + r * Math.sin(a),
  }));

  const offset = cornerRadius;

  let path = '';

  for (let i = 0; i < 6; i++) {
    const current = vertices[i];
    const prev = vertices[(i + 5) % 6];
    const next = vertices[(i + 1) % 6];

    // Vector to prev
    const dx_prev = prev.x - current.x;
    const dy_prev = prev.y - current.y;
    const len_prev = Math.sqrt(dx_prev * dx_prev + dy_prev * dy_prev);
    const u_prev = { x: dx_prev / len_prev, y: dy_prev / len_prev };

    // Vector to next
    const dx_next = next.x - current.x;
    const dy_next = next.y - current.y;
    const len_next = Math.sqrt(dx_next * dx_next + dy_next * dy_next);
    const u_next = { x: dx_next / len_next, y: dy_next / len_next };

    // Start of curve (on the side coming from prev)
    const start = {
      x: current.x + u_prev.x * offset,
      y: current.y + u_prev.y * offset,
    };

    // End of curve (on the side going to next)
    const end = {
      x: current.x + u_next.x * offset,
      y: current.y + u_next.y * offset,
    };

    if (i === 0) {
      path += `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} `;
    } else {
      path += `L ${start.x.toFixed(2)} ${start.y.toFixed(2)} `;
    }

    path += `Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)} `;
  }
  path += 'Z';
  return path;
}

// Config
const cx = 256;
const cy = 256;
const strokeWidth = 12; // Back to 12 as requested

// Colors
const colors = {
  bg: '#1A1625', // Darker purple-black background
  l1: '#3E3252', // Deep purple
  l2: '#58427C', // Medium purple
  l3: '#7555A8', // Bright purple
  dot: '#FFFFFF',
  stroke: '#E5DEFF', // Very light lavender
};

// Adjust radii and offsets
const p1 = getHexagonPath(cx, cy, 200, 40);
const p2 = getHexagonPath(cx, cy, 130, 25);
const p3 = getHexagonPath(cx, cy, 60, 12);

const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${colors.bg}"/>
  <path d="${p1}" fill="${colors.l1}" stroke="${colors.stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${p2}" fill="${colors.l2}" stroke="${colors.stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${p3}" fill="${colors.l3}" stroke="${colors.stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="256" cy="256" r="12" fill="${colors.dot}"/>
</svg>`;

console.log(svgContent);
