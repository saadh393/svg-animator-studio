import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','defs','clipPath','mask','linearGradient','radialGradient','stop','pattern','image','use'
];

const allowedAttributes = {
  '*': ['id','class','transform','style','fill','stroke','stroke-width','stroke-linejoin','stroke-linecap','opacity','fill-opacity','stroke-opacity','clip-path','clip-rule','mask','filter','x','y','cx','cy','r','rx','ry','x1','x2','y1','y2','width','height','viewBox','d','points','href','xlink:href','preserveAspectRatio','text-anchor','dominant-baseline','font-family','font-size','font-weight','vector-effect']
};

export function sanitizeSvg(svgString) {
  const clean = sanitizeHtml(svgString, {
    allowedTags,
    allowedAttributes,
    allowVulnerableTags: false,
    parser: { lowerCaseAttributeNames: false },
    transformTags: {
      'script': () => ({ tagName: 'noscript' }),
      'foreignObject': () => ({ tagName: 'g' })
    }
  });
  const nodeCount = (clean.match(/<\w+/g) || []).length;
  return { svg: clean, nodeCount };
}

