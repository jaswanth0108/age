// Replaceable AI age estimation service
// In production, replace this with call to AWS Rekognition, Azure Face, or custom model
// Current implementation: deterministic pseudo-AI based on image buffer hash + lightweight analysis

const crypto = require('crypto');

function pseudoRandomFromBuffer(buffer) {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  // take first 8 hex chars as int
  const intVal = parseInt(hash.slice(0, 8), 16);
  return { intVal, hash };
}

// Optional lightweight brightness/quality check using sharp if available
async function analyzeImage(buffer) {
  try {
    const sharp = require('sharp');
    const { data, info } = await sharp(buffer).resize(100, 100).grayscale().raw().toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avgBrightness = sum / data.length; // 0-255
    return { avgBrightness, width: info.width, height: info.height };
  } catch {
    return { avgBrightness: 120, width: 0, height: 0 };
  }
}

async function estimateAge(buffer /*, options */) {
  const { intVal } = pseudoRandomFromBuffer(buffer);
  const analysis = await analyzeImage(buffer);

  // Generate pseudo age 5-75 with distribution favoring 18-45
  // Use intVal to generate reproducible result per image
  let base = 18 + (intVal % 45); // 18-62
  // add some variance
  const jitter = ((intVal >> 8) % 7) - 3; // -3..3
  let age = Math.max(5, Math.min(78, base + jitter));

  // If brightness very low, we could adjust confidence down but not age
  let confidence = 78 + (intVal % 20); // 78-97
  if (analysis.avgBrightness < 40) confidence = Math.max(45, confidence - 20);
  else if (analysis.avgBrightness < 70) confidence = Math.max(60, confidence - 10);

  const rangeSpread = confidence > 90 ? 2 : confidence > 80 ? 3 : 5;
  const low = Math.max(1, age - rangeSpread);
  const high = Math.min(85, age + rangeSpread);

  // Simulate model latency 300-700ms
  await new Promise(r => setTimeout(r, 200 + (intVal % 400)));

  return {
    age,
    range: [low, high],
    confidence,
    model: 'AgeLens-Mock-v1 (replaceable)',
    metadata: { brightness: Math.round(analysis.avgBrightness) }
  };
}

// For future: validate face count via AI model
// Mock: we assume 1 face if image passes heuristic, but backend also does extra check
async function validateFaces(buffer) {
  const { intVal } = pseudoRandomFromBuffer(buffer);
  // 95% chance single face, 2% no face, 3% multiple
  // For demo we always return 1 to not block, but if query param test forces
  const r = intVal % 100;
  if (r < 2) return { count: 0, valid: false, reason: 'no_face' };
  if (r < 5) return { count: 2, valid: false, reason: 'multiple_faces' };
  return { count: 1, valid: true };
}

module.exports = { estimateAge, validateFaces, pseudoRandomFromBuffer };
