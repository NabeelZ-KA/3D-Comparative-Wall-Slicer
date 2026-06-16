export interface WallSlice {
  sliceIndex: number;
  positionX: number; // position along the 150 km wall or test segment (in meters)
  originalHeight: number; // simulated height in meters of the rock pile
  transgressedHeight: number; // height after transgression
  originalWidth: number; // width in meters
  transgressedWidth: number;
  originalVolume: number; // estimated slice volume V = dx * height * width
  transgressedVolume: number;
  volumeDifference: number; // original - transgressed
  percentageLoss: number; // (orig - trans) / orig
  isTransgressed: boolean; // flag if difference exceeds threshold
  isBoundary?: boolean; // flag if scan ends or tapers here
  boundaryReason?: string; // explanation of scan boundaries
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface AlignmentDelta {
  dx: number;
  dy: number;
  dz: number;
  distance: number;
}

export interface AdvancedMetrics {
  chamferDistance: number;
  hausdorffDistance: number;
  jaccardIoU: number;
  erosionPercentage: number;
  slumpingPercentage: number;
  roughnessBefore: number;
  roughnessAfter: number;
  alignmentDistance: number;
  beforeTrimmedCount: number;
  afterTrimmedCount: number;
}

export interface MeshStats {
  count: number;
  filteredCount: number;
  xSize: number;
  ySize: number;
  zSize: number;
  totalVol: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export interface AnomalyZone {
  startIndex: number;
  endIndex: number;
  startDist: number;
  endDist: number;
  avgLoss: number;
  maxLoss: number;
  volLost: number;
  classification: string;
  confidence: number;
  description: string;
  causeDiagnostics: Array<{
    id: string;
    label: string;
    score: number;
    color: string;
    icon: string;
  }>;
}

/**
 * Parses raw text from an standard OBJ file in the browser,
 * extracting only the vertex coordinates: "v X Y Z".
 */
export function parseOBJText(text: string): Point3D[] {
  const vertices: Point3D[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("v ")) {
      const parts = line.split(/\s+/);
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        vertices.push({ x, y, z });
      }
    }
  }
  return vertices;
}

/**
 * Calculates a highly accurate cross-sectional area of a point cloud bucket 
 * using a multi-column Riemann sum with boundary interpolation.
 * 
 * Works by breaking the depth width of the slice bucket into 'numBins' columns.
 * In each column, it finds the representative height (using the top-most percentiles to resist noise).
 * It then integrates the heights via a trapezoidal-like sum.
 */
export function calculateAccurateCrossSectionArea(
  points: Point3D[],
  zFloor: number,
  numBins: number = 16,
  estimationPct: number = 90,
  voidHandlingMode: "strict" | "interpolate" = "strict",
  axis: "X" | "Y" = "X",
  fixedSweepBounds?: { min: number; max: number }
): number {
  if (points.length < 4) return 0;

  // Slices cut along X mean we sweep along Y to get the coordinates of the cross-section width.
  // Slices cut along Y mean we sweep along X.
  const sweepVals = points.map(v => (axis === "X" ? v.y : v.x));
  const minSweep = fixedSweepBounds ? fixedSweepBounds.min : Math.min(...sweepVals);
  const maxSweep = fixedSweepBounds ? fixedSweepBounds.max : Math.max(...sweepVals);
  const width = maxSweep - minSweep;

  if (width <= 0.01) return 0;

  const heights: number[] = Array(numBins).fill(-1);
  const binWidth = width / numBins;

  // Step 1: Populate heights for each bin column
  for (let j = 0; j < numBins; j++) {
    const bMin = minSweep + j * binWidth;
    const bMax = bMin + binWidth;
    const inBin = points.filter(p => {
      const valActual = axis === "X" ? p.y : p.x;
      return valActual >= bMin && valActual <= bMax;
    });

    if (inBin.length > 0) {
      const zVals = inBin.map(p => p.z);
      zVals.sort((a, b) => a - b);
      
      let repZ = zVals[zVals.length - 1]; // Max Z height by default
      if (estimationPct === 90 && zVals.length >= 5) {
        repZ = zVals[Math.floor(zVals.length * 0.90)];
      } else if (estimationPct === 75 && zVals.length >= 4) {
        repZ = zVals[Math.floor(zVals.length * 0.75)];
      } else if (estimationPct === 50) {
        repZ = zVals[Math.floor(zVals.length * 0.50)];
      } else if (estimationPct === 30 && zVals.length >= 3) {
        // Average of the top 30% of heights
        const count = Math.ceil(zVals.length * 0.3);
        const topZ = zVals.slice(-count);
        repZ = topZ.reduce((s, v) => s + v, 0) / count;
      }
      
      heights[j] = Math.max(0, repZ - zFloor);
    }
  }

  // Step 2: Void Representation (Empty Bins) Handling
  if (voidHandlingMode === "interpolate") {
    // Reconstruct missing points across cavities using linear boundary interpolation
    for (let j = 0; j < numBins; j++) {
      if (heights[j] === -1) {
        let leftIdx = -1;
        for (let k = j - 1; k >= 0; k--) {
          if (heights[k] !== -1) {
            leftIdx = k;
            break;
          }
        }
        let rightIdx = -1;
        for (let k = j + 1; k < numBins; k++) {
          if (heights[k] !== -1) {
            rightIdx = k;
            break;
          }
        }

        if (leftIdx !== -1 && rightIdx !== -1) {
          const wLeft = (rightIdx - j) / (rightIdx - leftIdx);
          const wRight = (j - leftIdx) / (rightIdx - leftIdx);
          heights[j] = wLeft * heights[leftIdx] + wRight * heights[rightIdx];
        } else if (leftIdx !== -1) {
          heights[j] = heights[leftIdx];
        } else if (rightIdx !== -1) {
          heights[j] = heights[rightIdx];
        } else {
          heights[j] = 0;
        }
      }
    }
  } else {
    // Strict mode: cavities are treated as empty air (0 height)
    for (let j = 0; j < numBins; j++) {
      if (heights[j] === -1) {
        heights[j] = 0;
      }
    }
  }

  // Step 3: Numerical Integration (Riemann column summation)
  const sumArea = heights.reduce((sum, h) => sum + h * binWidth, 0);
  return sumArea;
}

/**
 * Calculates a bounding box and an integrated Riemann volume estimation 
 * for a filtered point cloud, providing summary statistics.
 */
export function calculateMeshStats(
  vertices: Point3D[],
  zTrim: number = 0.0,
  slicingAxis: "X" | "Y" = "X",
  heightEstimationPct: number = 90,
  voidHandling: "strict" | "interpolate" = "strict"
): MeshStats | null {
  const filtered = vertices.filter((v) => v.z >= zTrim);
  if (filtered.length === 0) return null;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  filtered.forEach((v) => {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.z > maxZ) maxZ = v.z;
  });

  const xSize = maxX - minX;
  const ySize = maxY - minY;
  const zSize = maxZ - minZ;

  // Split mesh into 50 subdivisions along current slicing axis for fine-grained integrated volume estimation
  let totalVol = 0;
  const numSubdivisions = 50;
  const trackingSize = slicingAxis === "X" ? xSize : ySize;
  const subWidth = trackingSize / numSubdivisions;
  const minCoord = slicingAxis === "X" ? minX : minY;

  if (subWidth > 0 && filtered.length > 10) {
    for (let i = 0; i < numSubdivisions; i++) {
      const subMin = minCoord + i * subWidth;
      const subMax = subMin + subWidth;
      const subPoints = filtered.filter(p => {
        const coord = slicingAxis === "X" ? p.x : p.y;
        return coord >= subMin && coord <= subMax;
      });
      const subArea = calculateAccurateCrossSectionArea(
        subPoints,
        zTrim,
        16,
        heightEstimationPct,
        voidHandling,
        slicingAxis
      );
      totalVol += subArea * subWidth;
    }
  } else {
    // Fallback bounding estimator if points are sparse
    totalVol = xSize * ySize * zSize * 0.55;
  }

  return {
    count: vertices.length,
    filteredCount: filtered.length,
    xSize,
    ySize,
    zSize,
    totalVol,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ }
  };
}

/**
 * Attenuates relative points down to maxN for speedy matrix math in browser threads.
 */
export function samplePoints(pts: Point3D[], maxN = 300): Point3D[] {
  if (pts.length <= maxN) return pts;
  const step = Math.floor(pts.length / maxN);
  const result: Point3D[] = [];
  for (let i = 0; i < pts.length && result.length < maxN; i += step) {
    result.push(pts[i]);
  }
  return result;
}

/**
 * Computes the premium double-sided Chamfer point distance and worst-case Hausdorff bounds.
 */
export function computeChamferAndHausdorff(
  bPts: Point3D[],
  aPts: Point3D[]
): { chamfer: number; hausdorff: number } {
  // Sub-sample down to 300 points to ensure instant O(N * M) nearest-neighbor execution (~1-2ms)
  const subBefore = samplePoints(bPts, 300);
  const subAfter = samplePoints(aPts, 300);

  if (subBefore.length === 0 || subAfter.length === 0) {
    return { chamfer: 0, hausdorff: 0 };
  }

  let sumDistBtoA = 0;
  let maxDistBtoA = 0;

  subBefore.forEach((p) => {
    let minD2 = Infinity;
    subAfter.forEach((q) => {
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const dz = p.z - q.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < minD2) minD2 = d2;
    });
    const d = Math.sqrt(minD2);
    sumDistBtoA += d;
    if (d > maxDistBtoA) maxDistBtoA = d;
  });

  let sumDistAtoB = 0;
  let maxDistAtoB = 0;

  subAfter.forEach((q) => {
    let minD2 = Infinity;
    subBefore.forEach((p) => {
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const dz = p.z - q.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < minD2) minD2 = d2;
    });
    const d = Math.sqrt(minD2);
    sumDistAtoB += d;
    if (d > maxDistAtoB) maxDistAtoB = d;
  });

  const chamfer = (sumDistBtoA / subBefore.length + sumDistAtoB / subAfter.length) / 2;
  const hausdorff = Math.max(maxDistBtoA, maxDistAtoB);

  return { chamfer, hausdorff };
}

/**
 * Creates logical voxel occupancy meshes across shared bounding boxes 
 * to determine spatial coordinate overlapping Jaccard indices.
 */
export function computeVoxelMetrics(
  bPts: Point3D[],
  aPts: Point3D[]
): { jaccardIoU: number; erosionPercentage: number; slumpingPercentage: number } {
  if (bPts.length === 0 || aPts.length === 0) {
    return { jaccardIoU: 0, erosionPercentage: 0, slumpingPercentage: 0 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  const list = [...bPts, ...aPts];
  list.forEach((v) => {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.z > maxZ) maxZ = v.z;
  });

  const rx = Math.max(0.1, maxX - minX);
  const ry = Math.max(0.1, maxY - minY);
  const rz = Math.max(0.1, maxZ - minZ);

  // Voxel mesh bounds
  const gX = 15;
  const gY = 8;
  const gZ = 8;

  const beforeVoxelSet = new Set<string>();
  const afterVoxelSet = new Set<string>();

  bPts.forEach((p) => {
    const ix = Math.min(gX - 1, Math.max(0, Math.floor(((p.x - minX) / rx) * gX)));
    const iy = Math.min(gY - 1, Math.max(0, Math.floor(((p.y - minY) / ry) * gY)));
    const iz = Math.min(gZ - 1, Math.max(0, Math.floor(((p.z - minZ) / rz) * gZ)));
    beforeVoxelSet.add(`${ix},${iy},${iz}`);
  });

  aPts.forEach((p) => {
    const ix = Math.min(gX - 1, Math.max(0, Math.floor(((p.x - minX) / rx) * gX)));
    const iy = Math.min(gY - 1, Math.max(0, Math.floor(((p.y - minY) / ry) * gY)));
    const iz = Math.min(gZ - 1, Math.max(0, Math.floor(((p.z - minZ) / rz) * gZ)));
    afterVoxelSet.add(`${ix},${iy},${iz}`);
  });

  let intersectionCount = 0;
  let erosionCount = 0; 
  let slumpingCount = 0;  

  beforeVoxelSet.forEach((key) => {
    if (afterVoxelSet.has(key)) {
      intersectionCount++;
    } else {
      erosionCount++;
    }
  });

  afterVoxelSet.forEach((key) => {
    if (!beforeVoxelSet.has(key)) {
      slumpingCount++;
    }
  });

  const unionCount = beforeVoxelSet.size + afterVoxelSet.size - intersectionCount;
  const jaccardIoU = unionCount > 0 ? intersectionCount / unionCount : 0;
  const erosionPercentage = beforeVoxelSet.size > 0 ? (erosionCount / beforeVoxelSet.size) * 100 : 0;
  const slumpingPercentage = beforeVoxelSet.size > 0 ? (slumpingCount / beforeVoxelSet.size) * 100 : 0;

  return { jaccardIoU, erosionPercentage, slumpingPercentage };
}

/**
 * Computes RMS elevation dispersion to serve as index of micro-roughness.
 */
export function computeRoughnessIndex(pts: Point3D[], zBase: number): number {
  if (pts.length === 0) return 0;
  const heights = pts.map((v) => v.z - zBase);
  const mean = heights.reduce((sum, h) => sum + h, 0) / heights.length;
  const sqDiffs = heights.map((h) => {
    const diff = h - mean;
    return diff * diff;
  });
  const avgSqDiff = sqDiffs.reduce((sum, sd) => sum + sd, 0) / sqDiffs.length;
  return Math.sqrt(avgSqDiff);
}

/**
 * Regularizes Ratio Gaps via a smooth-factor buffer to avoid divide-by-zero boundary issues
 * when baseline volumes approach zero. Attenuates erratic boundary noise.
 */
export function getDsiValue(
  origVal: number, 
  transVal: number, 
  dsiSensitivity: number = 1.0, 
  epsilon: number = 0.008
): number {
  const diff = origVal - transVal;
  if (diff <= 0 || origVal <= 0.0001) return 0;
  
  const dsi = (diff / (origVal + epsilon)) * dsiSensitivity;
  return Math.max(0, Math.min(1.0, dsi));
}

/**
 * Slice alignment processor. Steps along the wall's major coordinates, sweeps point buckets, 
 * runs numerical integrals to find Cross-sectional Areas, calculates Sliced Volumes,
 * and determines transgression states with structural edge safeguards.
 */
export function computeSlices(options: {
  beforeVerts: Point3D[];
  afterVerts: Point3D[];
  beforeZTrim: number;
  afterZTrim: number;
  xOffset: number;
  yOffset: number;
  zOffset: number;
  sliceCount: number;
  lossThreshold: number;       // e.g. 15 (%)
  valVolumeThreshold: number;  // e.g. 0.05 (m3)
  slicingAxis: "X" | "Y";
  heightEstimationPct: number; // e.g. 90
  voidHandling: "strict" | "interpolate";
  dsiSensitivity: number;      // e.g. 1.0
}): { slices: WallSlice[]; lengthMeters: number; sliceStep: number } | null {
  const {
    beforeVerts,
    afterVerts,
    beforeZTrim,
    afterZTrim,
    xOffset,
    yOffset,
    zOffset,
    sliceCount,
    lossThreshold,
    valVolumeThreshold,
    slicingAxis,
    heightEstimationPct,
    voidHandling,
    dsiSensitivity
  } = options;

  if (beforeVerts.length === 0 || afterVerts.length === 0) {
    return null;
  }

  const filteredBefore = beforeVerts.filter(v => v.z >= beforeZTrim);
  const filteredAfter = afterVerts
    .map(v => ({
      x: v.x + xOffset,
      y: v.y + yOffset,
      z: v.z + zOffset
    }))
    .filter(v => v.z >= afterZTrim + zOffset);

  if (filteredBefore.length === 0 || filteredAfter.length === 0) {
    return null;
  }

  let minCoord = Infinity, maxCoord = -Infinity;
  filteredBefore.forEach(v => {
    const val = slicingAxis === "X" ? v.x : v.y;
    if (val < minCoord) minCoord = val;
    if (val > maxCoord) maxCoord = val;
  });
  filteredAfter.forEach(v => {
    const val = slicingAxis === "X" ? v.x : v.y;
    if (val < minCoord) minCoord = val;
    if (val > maxCoord) maxCoord = val;
  });

  const lengthMeters = maxCoord - minCoord;
  const sliceStep = lengthMeters / sliceCount;

  const slices: WallSlice[] = [];

  for (let i = 0; i < sliceCount; i++) {
    const cStart = minCoord + i * sliceStep;
    const cEnd = cStart + sliceStep;
    const positionX = cStart + sliceStep / 2;

    const beforeInBucket = filteredBefore.filter(v => {
      const val = slicingAxis === "X" ? v.x : v.y;
      return val >= cStart && val <= cEnd;
    });
    const afterInBucket = filteredAfter.filter(v => {
      const val = slicingAxis === "X" ? v.x : v.y;
      return val >= cStart && val <= cEnd;
    });

    const minPointThreshold = 8;
    const beforeHasPoints = beforeInBucket.length >= minPointThreshold;
    const afterHasPoints = afterInBucket.length >= minPointThreshold;
    const isBoundary = !beforeHasPoints || !afterHasPoints;
    const boundaryReason = isBoundary 
      ? (!beforeHasPoints && !afterHasPoints 
          ? "Both original and transgressed scans finished" 
          : !beforeHasPoints 
            ? "Original baseline scan finished" 
            : "Post-transgression scan finished")
      : undefined;

    let origH = 0.0;
    let origW = 0.0;
    if (beforeHasPoints) {
      const zVals = beforeInBucket.map(v => v.z);
      const sweepVals = beforeInBucket.map(v => (slicingAxis === "X" ? v.y : v.x));
      
      let repZBefore = Math.max(...zVals);
      if (heightEstimationPct === 90 && zVals.length >= 5) {
        zVals.sort((a, b) => a - b);
        repZBefore = zVals[Math.floor(zVals.length * 0.9)];
      } else if (heightEstimationPct === 75 && zVals.length >= 4) {
        zVals.sort((a, b) => a - b);
        repZBefore = zVals[Math.floor(zVals.length * 0.75)];
      } else if (heightEstimationPct === 50) {
        zVals.sort((a, b) => a - b);
        repZBefore = zVals[Math.floor(zVals.length * 0.5)];
      } else if (heightEstimationPct === 30 && zVals.length >= 3) {
        zVals.sort((a, b) => a - b);
        const count = Math.ceil(zVals.length * 0.3);
        repZBefore = zVals.slice(-count).reduce((s, v) => s + v, 0) / count;
      }

      origH = repZBefore - beforeZTrim;
      origW = Math.max(0.1, Math.max(...sweepVals) - Math.min(...sweepVals));
      if (origH <= 0.02) origH = 0.02;
      if (origW <= 0.02) origW = 0.1;
    }

    let transH = origH;
    let transW = origW;
    if (afterHasPoints) {
      const zVals = afterInBucket.map(v => v.z);
      const sweepVals = afterInBucket.map(v => (slicingAxis === "X" ? v.y : v.x));

      let repZAfter = Math.max(...zVals);
      if (heightEstimationPct === 90 && zVals.length >= 5) {
        zVals.sort((a, b) => a - b);
        repZAfter = zVals[Math.floor(zVals.length * 0.9)];
      } else if (heightEstimationPct === 75 && zVals.length >= 4) {
        zVals.sort((a, b) => a - b);
        repZAfter = zVals[Math.floor(zVals.length * 0.75)];
      } else if (heightEstimationPct === 50) {
        zVals.sort((a, b) => a - b);
        repZAfter = zVals[Math.floor(zVals.length * 0.5)];
      } else if (heightEstimationPct === 30 && zVals.length >= 3) {
        zVals.sort((a, b) => a - b);
        const count = Math.ceil(zVals.length * 0.3);
        repZAfter = zVals.slice(-count).reduce((s, v) => s + v, 0) / count;
      }

      transH = repZAfter - (afterZTrim + zOffset);
      transW = Math.max(0.1, Math.max(...sweepVals) - Math.min(...sweepVals));
      if (transH <= 0.02) transH = 0.02;
      if (transW <= 0.02) transW = 0.1;
    } else if (beforeHasPoints) {
      transH = origH;
      transW = origW;
    }

    let originalVolume = 0;
    let transgressedVolume = 0;
    let volumeDifference = 0;
    let percentageLoss = 0;
    let isTransgressed = false;

    const sweepValsBefore = beforeInBucket.map(v => (slicingAxis === "X" ? v.y : v.x));
    const fixedSweepBounds = sweepValsBefore.length > 0 ? {
      min: Math.min(...sweepValsBefore),
      max: Math.max(...sweepValsBefore)
    } : undefined;

    if (!isBoundary) {
      const areaBefore = calculateAccurateCrossSectionArea(
        beforeInBucket, 
        beforeZTrim, 
        16,
        heightEstimationPct,
        voidHandling,
        slicingAxis,
        fixedSweepBounds
      );
      const areaAfter = calculateAccurateCrossSectionArea(
        afterInBucket, 
        afterZTrim + zOffset, 
        16,
        heightEstimationPct,
        voidHandling,
        slicingAxis,
        fixedSweepBounds
      );
      originalVolume = areaBefore * sliceStep;
      transgressedVolume = areaAfter * sliceStep;
      volumeDifference = Math.max(0, originalVolume - transgressedVolume);
      percentageLoss = originalVolume > 0 ? (volumeDifference / originalVolume) * 100 : 0;
      const percentageLossClamped = Math.min(100, Math.max(0, percentageLoss));
      percentageLoss = parseFloat(percentageLossClamped.toFixed(1));
      
      const dsiVal = getDsiValue(originalVolume, transgressedVolume, dsiSensitivity);
      isTransgressed = (percentageLossClamped > lossThreshold && volumeDifference > valVolumeThreshold) || (dsiVal > 0.1);
    } else {
      const areaBefore = beforeHasPoints 
        ? calculateAccurateCrossSectionArea(
            beforeInBucket, 
            beforeZTrim, 
            16,
            heightEstimationPct,
            voidHandling,
            slicingAxis,
            fixedSweepBounds
          ) 
        : 0;
      const areaAfter = afterHasPoints 
        ? calculateAccurateCrossSectionArea(
            afterInBucket, 
            afterZTrim + zOffset, 
            16,
            heightEstimationPct,
            voidHandling,
            slicingAxis,
            fixedSweepBounds
          ) 
        : 0;
      originalVolume = areaBefore * sliceStep;
      transgressedVolume = areaAfter * sliceStep;
      volumeDifference = Math.max(0, originalVolume - transgressedVolume);
      percentageLoss = originalVolume > 0 ? (volumeDifference / originalVolume) * 100 : 0;
      const percentageLossClamped = Math.min(100, Math.max(0, percentageLoss));
      percentageLoss = parseFloat(percentageLossClamped.toFixed(1));
      
      const dsiVal = getDsiValue(originalVolume, transgressedVolume, dsiSensitivity);
      isTransgressed = (percentageLossClamped > lossThreshold && volumeDifference > valVolumeThreshold) || (dsiVal > 0.04);
    }

    slices.push({
      sliceIndex: i,
      positionX,
      originalHeight: parseFloat(origH.toFixed(3)),
      transgressedHeight: parseFloat(transH.toFixed(3)),
      originalWidth: parseFloat(origW.toFixed(3)),
      transgressedWidth: parseFloat(transW.toFixed(3)),
      originalVolume: parseFloat(originalVolume.toFixed(4)),
      transgressedVolume: parseFloat(transgressedVolume.toFixed(4)),
      volumeDifference: parseFloat(volumeDifference.toFixed(4)),
      percentageLoss,
      isTransgressed,
      isBoundary,
      boundaryReason,
    });
  }

  return { slices, lengthMeters, sliceStep };
}

/**
 * 4-Way Bayesian Causal Matcher for Archaeological Breaches.
 * Resolves probability values linking physical geometry states to causes.
 */
export function calculateCauseProbabilities(zone: {
  maxLoss: number;
  avgLoss: number;
  startDist: number;
  endDist: number;
  volLost: number;
}) {
  const span = Math.max(0.1, zone.endDist - zone.startDist);
  const maxLoss = zone.maxLoss;
  const avgLoss = zone.avgLoss;
  
  // 1. Vehicle impact ( bulldozer/tractors, narrow/medium width 1.5-3.5m, high vertical shear loss >15% )
  let vehicleScore = 0;
  if (maxLoss > 15) vehicleScore += 45;
  if (maxLoss > 25) vehicleScore += 20;
  if (span >= 1.5 && span <= 3.5) vehicleScore += 30;
  else if (span > 3.5) vehicleScore += Math.max(0, 25 - (span - 3.5) * 5);
  else vehicleScore += 10;
  vehicleScore = Math.min(98, Math.max(5, vehicleScore));

  // 2. Grazing animals ( trampling/crossovers, narrow < 1.8m, lower max loss 6-15%, V-shape crumble )
  let animalScore = 0;
  if (maxLoss >= 6 && maxLoss <= 16) animalScore += 40;
  else if (maxLoss > 16) animalScore += Math.max(5, 30 - (maxLoss - 16) * 2);
  if (span <= 2.0) animalScore += 45;
  else animalScore += Math.max(0, 15 - (span - 2.0) * 8);
  animalScore = Math.min(95, Math.max(4, animalScore));

  // 3. Stone harvesting ( Theft / Looting, broad span > 2.5m, steady sequential height loss 7-22% with neat borders )
  let theftScore = 0;
  if (span >= 2.5) theftScore += 45;
  if (avgLoss >= 7 && avgLoss <= 22) theftScore += 40;
  else if (avgLoss > 22) theftScore += 20;
  theftScore = Math.min(94, Math.max(3, theftScore));

  // 4. Natural Weathering & Soil Creep ( Erosion / Slump, widespread span > 4.0m, low max loss < 12% )
  let weatherScore = 0;
  if (span >= 4.0) weatherScore += 45;
  if (avgLoss < 12) weatherScore += 40;
  else weatherScore += Math.max(0, 20 - (avgLoss - 12) * 2);
  weatherScore = Math.min(92, Math.max(8, weatherScore));

  // Normalize scores to form actual robust probability weights totaling 100%
  const sum = vehicleScore + animalScore + theftScore + weatherScore;
  return [
    { id: "vehicle", label: "Vehicle Impact", score: Math.round((vehicleScore / sum) * 100), color: "bg-red-500", icon: "🚚" },
    { id: "animal", label: "Grazing Animal", score: Math.round((animalScore / sum) * 100), color: "bg-orange-400", icon: "🐐" },
    { id: "theft", label: "Stone Theft", score: Math.round((theftScore / sum) * 100), color: "bg-amber-600", icon: "🪨" },
    { id: "weather", label: "Weathering Index", score: Math.round((weatherScore / sum) * 100), color: "bg-blue-500", icon: "💨" },
  ].sort((a, b) => b.score - a.score);
}

/**
 * Groups contiguous transgressed slices together, and calculates physical causal attribution
 * metrics for each transgression region automatically.
 */
export function getTransgressionZones(slices: WallSlice[]): AnomalyZone[] {
  const zones: {
    startIndex: number;
    endIndex: number;
    startDist: number;
    endDist: number;
    losses: number[];
    volDifferences: number[];
  }[] = [];

  let currentZone: {
    startIndex: number;
    endIndex: number;
    startDist: number;
    endDist: number;
    losses: number[];
    volDifferences: number[];
  } | null = null;

  slices.forEach((slice, idx) => {
    if (slice.isTransgressed && !slice.isBoundary) {
      if (!currentZone) {
        currentZone = {
          startIndex: idx,
          endIndex: idx,
          startDist: slice.positionX,
          endDist: slice.positionX,
          losses: [slice.percentageLoss],
          volDifferences: [slice.volumeDifference],
        };
      } else {
        currentZone.endIndex = idx;
        currentZone.endDist = slice.positionX;
        currentZone.losses.push(slice.percentageLoss);
        currentZone.volDifferences.push(slice.volumeDifference);
      }
    } else {
      if (currentZone) {
        zones.push(currentZone);
        currentZone = null;
      }
    }
  });

  if (currentZone) {
    zones.push(currentZone);
  }

  return zones.map((zone) => {
    const avgLoss = zone.losses.reduce((s: number, l: number) => s + l, 0) / zone.losses.length;
    const maxLoss = Math.max(...zone.losses);
    const totalVolLost = zone.volDifferences.reduce((s: number, v: number) => s + v, 0);
    const widthRange = zone.endDist - zone.startDist;
    
    let classification = "Loose Slump / Soil Creep";
    let confidence = 75;
    let description = "Gradual dry-stone slump. Low-slat top reduction with matching width crawls.";

    if (maxLoss > 18) {
      classification = "Tractor / Bulldozer Excavation";
      confidence = 94;
      description = "Severe vertical slice truncation with sharp slopes. Wall completely breached; likely mechanical road-cut.";
    } else if (widthRange > 3.0 && avgLoss > 8) {
      classification = "Modern Stone Harvesting (Looting)";
      confidence = 88;
      description = "Broad volume decrease over a continuous area. Basalt stones gathered sequentially from ruins pile.";
    } else if (maxLoss > 10 && widthRange < 1.5) {
      classification = "Livestock Crossing Breach";
      confidence = 85;
      description = "Narrow localized depression. Collapsed by livestock packs crossover trampling.";
    }

    const causeDiagnostics = calculateCauseProbabilities({
      maxLoss,
      avgLoss,
      startDist: zone.startDist,
      endDist: zone.endDist,
      volLost: totalVolLost
    });

    return {
      startIndex: zone.startIndex,
      endIndex: zone.endIndex,
      startDist: zone.startDist,
      endDist: zone.endDist,
      avgLoss: parseFloat(avgLoss.toFixed(1)),
      maxLoss: parseFloat(maxLoss.toFixed(1)),
      volLost: parseFloat(totalVolLost.toFixed(4)),
      classification,
      confidence,
      description,
      causeDiagnostics
    };
  });
}

/**
 * Executes a full comparative analysis over two datasets, assembling cross-sectional areas,
 * bounding sizes, distance metrics, voxel co-occupancies, severity indices, and anomaly regions.
 */
export function runFullAnalyticalPipeline(params: {
  beforeVerts: Point3D[];
  afterVerts: Point3D[];
  beforeZTrim: number;
  afterZTrim: number;
  xOffset: number;
  yOffset: number;
  zOffset: number;
  sliceCount: number;
  lossThreshold: number;
  valVolumeThreshold: number;
  slicingAxis: "X" | "Y";
  heightEstimationPct: number;
  voidHandling: "strict" | "interpolate";
  dsiSensitivity: number;
}): {
  slices: WallSlice[];
  statsBefore: MeshStats | null;
  statsAfter: MeshStats | null;
  advancedMetrics: AdvancedMetrics | null;
  anomalies: AnomalyZone[];
  sliceStep: number;
  lengthMeters: number;
} | null {
  const sliceResult = computeSlices(params);
  if (!sliceResult) return null;

  const statsBefore = calculateMeshStats(
    params.beforeVerts,
    params.beforeZTrim,
    params.slicingAxis,
    params.heightEstimationPct,
    params.voidHandling
  );

  const alignedAfterVerts = params.afterVerts.map(v => ({
    x: v.x + params.xOffset,
    y: v.y + params.yOffset,
    z: v.z + params.zOffset
  }));

  const statsAfter = calculateMeshStats(
    alignedAfterVerts,
    params.afterZTrim + params.zOffset,
    params.slicingAxis,
    params.heightEstimationPct,
    params.voidHandling
  );

  // Filter vertices according to trim layers
  const bPtsFiltered = params.beforeVerts.filter(v => v.z >= params.beforeZTrim);
  const aPtsFiltered = alignedAfterVerts.filter(v => v.z >= params.afterZTrim + params.zOffset);

  let advancedMetrics: AdvancedMetrics | null = null;
  if (bPtsFiltered.length > 0 && aPtsFiltered.length > 0) {
    const { chamfer, hausdorff } = computeChamferAndHausdorff(bPtsFiltered, aPtsFiltered);
    const { jaccardIoU, erosionPercentage, slumpingPercentage } = computeVoxelMetrics(bPtsFiltered, aPtsFiltered);
    const roughnessBefore = computeRoughnessIndex(bPtsFiltered, params.beforeZTrim);
    const roughnessAfter = computeRoughnessIndex(aPtsFiltered, params.afterZTrim + params.zOffset);
    const alignmentDistance = Math.sqrt(
      params.xOffset * params.xOffset +
      params.yOffset * params.yOffset +
      params.zOffset * params.zOffset
    );

    advancedMetrics = {
      chamferDistance: chamfer,
      hausdorffDistance: hausdorff,
      jaccardIoU,
      erosionPercentage,
      slumpingPercentage,
      roughnessBefore,
      roughnessAfter,
      alignmentDistance,
      beforeTrimmedCount: bPtsFiltered.length,
      afterTrimmedCount: aPtsFiltered.length
    };
  }

  const anomalies = getTransgressionZones(sliceResult.slices);

  return {
    slices: sliceResult.slices,
    statsBefore,
    statsAfter,
    advancedMetrics,
    anomalies,
    sliceStep: sliceResult.sliceStep,
    lengthMeters: sliceResult.lengthMeters
  };
}
