import React, { useState, useMemo, ChangeEvent } from "react";
import { 
  parseOBJText, 
  runFullAnalyticalPipeline, 
  Point3D, 
  AnomalyZone, 
  AdvancedMetrics, 
  MeshStats,
  WallSlice
} from "../utils/slicerEngine";
import { 
  Terminal, 
  Play, 
  Upload, 
  Info, 
  Ruler, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Sparkles, 
  Bookmark, 
  FileSpreadsheet, 
  Compass, 
  Cpu, 
  TrendingUp, 
  ChevronRight,
  RefreshCw,
  Eye
} from "lucide-react";

export function BareBonesSlicer() {
  const [beforeVerts, setBeforeVerts] = useState<Point3D[]>([]);
  const [afterVerts, setAfterVerts] = useState<Point3D[]>([]);
  
  const [beforeFileName, setBeforeFileName] = useState<string>("");
  const [afterFileName, setAfterFileName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorLog, setErrorLog] = useState<string>("");
  const [infoLog, setInfoLog] = useState<string>("");

  const [beforeZTrim, setBeforeZTrim] = useState<number>(0.0); 
  const [afterZTrim, setAfterZTrim] = useState<number>(0.0);   
  const [xOffset, setXOffset] = useState<number>(0.0);         
  const [yOffset, setYOffset] = useState<number>(0.0);         
  const [zOffset, setZOffset] = useState<number>(0.0);         

  
  const [sliceCount, setSliceCount] = useState<number>(30);

  const [lossThreshold, setLossThreshold] = useState<number>(15.0);  
  const [valVolumeThreshold, setValVolumeThreshold] = useState<number>(0.0004); 
  const [dsiSensitivity, setDsiSensitivity] = useState<number>(1.0); 


  const [slicingAxis, setSlicingAxis] = useState<"X" | "Y">("X");
  const [heightEstimationPct, setHeightEstimationPct] = useState<number>(90); 
  const [voidHandling, setVoidHandling] = useState<"strict" | "interpolate">("strict");


  const [selectedSliceIndex, setSelectedSliceIndex] = useState<number | null>(0);


  const [analysisType, setAnalysisType] = useState<"classification" | "blocks" | "rebuild">("classification");
  const [geminiReport, setGeminiReport] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const processOBJ = (file: File, target: "before" | "after") => {
    if (!file) return;
    setLoading(true);
    setErrorLog("");
    setInfoLog("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseOBJText(text);

        if (parsed.length === 0) {
          throw new Error("No vertex data ('v x y z') detected in this file. Please upload a standard archaeological Wavefront OBJ file.");
        }

        if (target === "before") {
          setBeforeVerts(parsed);
          setBeforeFileName(file.name);
          setSelectedSliceIndex(0);
          setInfoLog(`Successfully loaded baseline scan "${file.name}" with ${parsed.length} raw vertices.`);
        } else {
          setAfterVerts(parsed);
          setAfterFileName(file.name);
          setInfoLog(`Successfully loaded comparative scan "${file.name}" with ${parsed.length} raw vertices.`);
        }
      } catch (err: any) {
        setErrorLog(`Verification Error: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorLog("Could not execute stream-fetch over file data.");
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, target: "before" | "after") => {
    const file = e.target.files?.[0];
    if (file) {
      processOBJ(file, target);
    }
  };

  const analyticalData = useMemo(() => {
    if (beforeVerts.length === 0 || afterVerts.length === 0) {
      return null;
    }

    try {
      return runFullAnalyticalPipeline({
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
      });
    } catch (err: any) {
      console.error(err);
      return null;
    }
  }, [
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
  ]);

  const slices: WallSlice[] = analyticalData?.slices || [];
  const statsBefore: MeshStats | null = analyticalData?.statsBefore || null;
  const statsAfter: MeshStats | null = analyticalData?.statsAfter || null;
  const metrics: AdvancedMetrics | null = analyticalData?.advancedMetrics || null;
  const anomalies: AnomalyZone[] = analyticalData?.anomalies || [];
  const lengthMeters: number = analyticalData?.lengthMeters || 0;
  const sliceStep: number = analyticalData?.sliceStep || 0;

  const chosenSlice: WallSlice | null = 
    selectedSliceIndex !== null && slices[selectedSliceIndex] 
      ? slices[selectedSliceIndex] 
      : null;

  React.useEffect(() => {
  }, [selectedSliceIndex, anomalies]);

  const loadMockGeometricRig = () => {
    const mockBefore: Point3D[] = [];
    const mockAfter: Point3D[] = [];

    const segmentsCount = 1000;
    for (let i = 0; i < segmentsCount; i++) {
      const x = (i / segmentsCount) * 16.0; 
      const yWidth = 1.4;
      
      for (let j = 0; j < 15; j++) {
        const y = (j / 15) * yWidth - yWidth / 2;
        
        const zBase = 1.25 + Math.sin(x * 0.35) * 0.12 + Math.cos(y * 1.8) * 0.04;
        mockBefore.push({ x, y, z: zBase });
        mockBefore.push({ x: x + 0.003, y: y + 0.002, z: zBase - 0.08 });

        let zAfter = zBase;
        if (x >= 3.5 && x <= 6.0) {
          const factorX = Math.sin(((x - 3.5) / 2.5) * Math.PI);
          zAfter = zBase - (0.65 * factorX);
        } else if (x >= 11.0 && x <= 13.0) {
          const factorX = Math.sin(((x - 11.0) / 2.0) * Math.PI);
          zAfter = zBase - (0.28 * factorX);
        }

        mockAfter.push({ x, y, z: zAfter });
        mockAfter.push({ x: x + 0.003, y: y + 0.002, z: zAfter - 0.08 });
      }
    }

    setBeforeVerts(mockBefore);
    setAfterVerts(mockAfter);
    setBeforeFileName("Jordan_MainWall_Baseline.obj");
    setAfterFileName("Jordan_MainWall_PostIncident.obj");
    setSelectedSliceIndex(12);
    setErrorLog("");
    setInfoLog("Loaded high-density 16-meter Great Wall of Jordan physical simulator rig.");
  };

  const samplePointsForAlign = (pts: Point3D[], maxN = 120): Point3D[] => {
    if (pts.length <= maxN) return pts;
    const step = Math.floor(pts.length / maxN);
    const result: Point3D[] = [];
    for (let i = 0; i < pts.length && result.length < maxN; i += step) {
      result.push(pts[i]);
    }
    return result;
  };

  const handleAutoAlign = () => {
    if (beforeVerts.length === 0 || afterVerts.length === 0) {
      setErrorLog("Auto-align failed: Please upload or load files first.");
      return;
    }
    setErrorLog("");
    setInfoLog("Computing ideal spatial overlapping alignment matrix. Please stand by...");

    const fBefore = beforeVerts.filter(v => v.z >= beforeZTrim);
    const fAfter = afterVerts.filter(v => v.z >= afterZTrim);

    if (fBefore.length === 0 || fAfter.length === 0) {
      setErrorLog("Alignment failed: No points remain after applying Z-trim crops.");
      return;
    }

    let bSumX = 0, bSumY = 0, bSumZ = 0;
    fBefore.forEach(p => { bSumX += p.x; bSumY += p.y; bSumZ += p.z; });
    const bCentroid = {
      x: bSumX / fBefore.length,
      y: bSumY / fBefore.length,
      z: bSumZ / fBefore.length
    };

    let aSumX = 0, aSumY = 0, aSumZ = 0;
    fAfter.forEach(p => { aSumX += p.x; aSumY += p.y; aSumZ += p.z; });
    const aCentroid = {
      x: aSumX / fAfter.length,
      y: aSumY / fAfter.length,
      z: aSumZ / fAfter.length
    };

    const initX = bCentroid.x - aCentroid.x;
    const initY = bCentroid.y - aCentroid.y;
    const initZ = bCentroid.z - aCentroid.z;

    const subBefore = samplePointsForAlign(fBefore, 100);
    const subAfter = samplePointsForAlign(fAfter, 100);

    const getScore = (ox: number, oy: number, oz: number) => {
      let sumD = 0;
      subBefore.forEach(p => {
        let minDistSq = Infinity;
        subAfter.forEach(q => {
          const dx = p.x - (q.x + ox);
          const dy = p.y - (q.y + oy);
          const dz = p.z - (q.z + oz);
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < minDistSq) minDistSq = dSq;
        });
        sumD += Math.sqrt(minDistSq);
      });
      return sumD / subBefore.length;
    };

    let bestX = initX;
    let bestY = initY;
    let bestZ = initZ;
    let bestScore = getScore(bestX, bestY, bestZ);

    const stepSizes = [0.1, 0.04, 0.01, 0.002];
    for (const step of stepSizes) {
      for (const offset of [-step, step]) {
        const score = getScore(bestX + offset, bestY, bestZ);
        if (score < bestScore) {
          bestScore = score;
          bestX += offset;
        }
      }
      for (const offset of [-step, step]) {
        const score = getScore(bestX, bestY + offset, bestZ);
        if (score < bestScore) {
          bestScore = score;
          bestY += offset;
        }
      }
      for (const offset of [-step, step]) {
        const score = getScore(bestX, bestY, bestZ + offset);
        if (score < bestScore) {
          bestScore = score;
          bestZ += offset;
        }
      }
    }

    setXOffset(parseFloat(bestX.toFixed(4)));
    setYOffset(parseFloat(bestY.toFixed(4)));
    setZOffset(parseFloat(bestZ.toFixed(4)));

    setInfoLog(`Auto-Align Matrix Solved! Centroids translated. Applied translations: dx: ${bestX.toFixed(4)}m, dy: ${bestY.toFixed(4)}m, dz: ${bestZ.toFixed(4)}m. Minimized spatial drift deviation: ${bestScore.toFixed(5)}m.`);
  };

  const handleExportCSV = () => {
    if (slices.length === 0) return;
    
    let csv = "Index,X Position (m),Original Volume (m3),Transgressed Volume (m3),Difference Net (m3),Loss Percentage (%),Breach Status,Boundary Reason\r\n";
    
    slices.forEach((s) => {
      csv += `${s.sliceIndex},${s.positionX.toFixed(3)},${s.originalVolume.toFixed(4)},${s.transgressedVolume.toFixed(4)},${s.volumeDifference.toFixed(4)},${s.percentageLoss.toFixed(1)},${s.isTransgressed ? "ACTIVE BREACH" : "NOMINAL"},${s.boundaryReason || "None"}\r\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Jordan_Wall_Preservation_Report_${sliceCount}_subdivisions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRequestGeminiReport = async () => {
    if (!analyticalData) {
      setErrorLog("Cannot generate report: Make sure baseline and transgressed scans are loaded and aligned.");
      return;
    }
    setIsAnalyzing(true);
    setErrorLog("");
    setGeminiReport("");

    const condensedSlices = slices.slice(0, 15).map(s => 
      `Index:${s.sliceIndex}|X:${s.positionX.toFixed(2)}m|OrigV:${s.originalVolume.toFixed(3)}|TransV:${s.transgressedVolume.toFixed(3)}|Loss:${s.percentageLoss}%`
    ).join("\n");

    const mappedAnomalies = anomalies.map((a, i) => ({
      classification: a.classification,
      range: `${a.startDist.toFixed(1)}m - ${a.endDist.toFixed(1)}m`,
      volLost: a.volLost,
      confidence: a.confidence,
      description: a.description
    }));

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType,
          wallSection: "Great Wall of Jordan Sector Sandbox",
          originalVolume: statsBefore ? statsBefore.totalVol.toFixed(3) : "0.0",
          transgressedVolume: statsAfter ? statsAfter.totalVol.toFixed(3) : "0.0",
          csvData: condensedSlices,
          lossThreshold,
          valVolumeThreshold,
          detectedZones: mappedAnomalies,
          meshMetrics: metrics ? {
            jaccardIoU: metrics.jaccardIoU,
            chamferDistance: metrics.chamferDistance,
            hausdorffDistance: metrics.hausdorffDistance,
            erosionPercentage: metrics.erosionPercentage,
            slumpingPercentage: metrics.slumpingPercentage,
            roughnessBefore: metrics.roughnessBefore,
            roughnessAfter: metrics.roughnessAfter,
            alignmentDistance: metrics.alignmentDistance
          } : undefined
        })
      });

      const res = await response.json();
      if (res.error) {
        throw new Error(res.error);
      }
      setGeminiReport(res.analysis);
    } catch (err: any) {
      setErrorLog(`Gemini preservation API returned: ${err.message || err}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderCustomMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, ix) => {
      if (line.startsWith("### ")) {
        return <h4 key={ix} className="text-[#e27551] font-mono text-xs font-bold mt-4 mb-2 tracking-tight uppercase flex items-center {ix === 0 ? 'mt-1' : ''}"><ChevronRight className="w-4 h-4 mr-1 text-[#e27551] shrink-0" />{line.replace("### ", "")}</h4>;
      }
      if (line.startsWith("## ") || line.startsWith("# ")) {
        return <h3 key={ix} className="text-[#faf3e8] font-sans text-sm font-bold mt-5 mb-2 border-l-2 border-[#b25d43] pl-2">{line.replace("## ", "").replace("# ", "")}</h3>;
      }
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const itemText = line.trim().replace(/^[-*]\s+/, "");
        return (
          <li key={ix} className="text-[#cdc3b0] font-sans text-[12.5px] leading-relaxed ml-4 my-1 list-disc">
            {parseInlineBold(itemText)}
          </li>
        );
      }
      if (line.trim().length > 0) {
        return <p key={ix} className="text-[#cdc3b0] font-sans text-xs leading-relaxed my-2">{parseInlineBold(line)}</p>;
      }
      return <div key={ix} className="h-1"></div>;
    });
  };

  const parseInlineBold = (txt: string) => {
    const parts = txt.split("**");
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-[#e27551] font-bold">{part}</strong> : part);
  };

  return (
    <div className="w-full flex flex-col bg-[#13110f] text-[#cdc3b0] antialiased font-sans" id="barebones-slicer-view">
      <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="font-sans text-sm font-bold text-[#faf3e8] mb-1">
            Load a Pre-Generated Dataset to Test Out Our Website!
          </span>
        </div>
        
        <button
          onClick={loadMockGeometricRig}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#b25d43] hover:bg-[#c8694c] text-white text-xs font-mono font-bold rounded-none border border-[#b25d43] transition cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-white" />
          <span>Load Simulated 16m Dataset</span>
        </button>
      </div>


      {errorLog && (
        <div className="bg-[#2a1b18] text-[#f87171] border-l-4 border-[#e27551] p-3 rounded-none mb-6 flex gap-3 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#e27551]" />
          <div>
            <strong className="block font-bold">Registration Fault:</strong>
            <span>{errorLog}</span>
          </div>
        </div>
      )}

      {infoLog && (
        <div ></div>
      )}

      <div className="flex flex-col gap-4 mb-6">
        <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <span className="text-[10px] font-mono tracking-wider font-bold text-[#e27551] uppercase">Phase I</span>
            <h3 className="font-sans text-sm font-bold text-[#faf3e8] mb-1">Upload Baseline Mesh:</h3>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center justify-center gap-2 cursor-pointer bg-[#25201d] hover:bg-[#342a25] border border-[#3e342f] text-[#cdc3b0] text-xs font-mono py-1.5 px-4 rounded-none transition w-full text-center shadow-sm">
              <Upload className="w-3.5 h-3.5 text-[#e27551] shrink-0" />
              <span>{beforeFileName ? "Replace OBJ File" : "Select Baseline OBJ..."}</span>
              <input type="file" accept=".obj" className="hidden" onChange={(e) => handleFileChange(e, "before")} />
            </label>
            {beforeFileName && (
              <span className="text-[11px] font-mono whitespace-nowrap text-emerald-400 font-bold">
                ✓ {beforeVerts.length} Points
              </span>
            )}
          </div>
          {beforeFileName && (
            <div className="text-[11.5px] font-mono text-[#bdae9e] border-t md:border-t-0 md:border-l border-[#3e342f] pt-2 md:pt-0 md:pl-3 truncate shrink-0 max-w-xs">
              File: <strong className="text-[#faf3e8]">{beforeFileName}</strong>
            </div>
          )}
        </div>

        <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <span className="text-[10px] font-mono tracking-wider font-bold text-[#e27551] uppercase">Phase II</span>
            <h3 className="font-sans text-sm font-bold text-[#faf3e8] mb-1">Upload Transgressed Mesh:</h3>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center justify-center gap-2 cursor-pointer bg-[#25201d] hover:bg-[#342a25] border border-[#3e342f] text-[#cdc3b0] text-xs font-mono py-1.5 px-4 rounded-none transition w-full text-center shadow-sm">
              <Upload className="w-3.5 h-3.5 text-[#e27551] shrink-0" />
              <span>{afterFileName ? "Replace OBJ File" : "Select Comparative OBJ..."}</span>
              <input type="file" accept=".obj" className="hidden" onChange={(e) => handleFileChange(e, "after")} />
            </label>
            {afterFileName && (
              <span className="text-[11px] font-mono whitespace-nowrap text-emerald-400 font-bold">
                ✓ {afterVerts.length} Points
              </span>
            )}
          </div>
          {afterFileName && (
            <div className="text-[11.5px] font-mono text-[#bdae9e] border-t md:border-t-0 md:border-l border-[#3e342f] pt-2 md:pt-0 md:pl-3 truncate shrink-0 max-w-xs">
              File: <strong className="text-[#faf3e8]">{afterFileName}</strong>
            </div>
          )}
        </div>
      </div>

      {beforeVerts.length === 0 || afterVerts.length === 0 ? (
        <div >
        </div>
      ) : (
        <div className="space-y-6">
          
          <div className="space-y-4">
            
            <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none">
              <div className="flex justify-between items-center border-b border-[#3e342f] pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#e27551] shrink-0" />
                  <h3 className="font-mono text-xs font-bold text-[#faf3e8] uppercase tracking-wider">
                    II. SUBDIVISION & PRECISION CALIBRATION
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#faf3e8] bg-[#3a1d15] border border-[#b25d43]/40 px-2.5 py-0.5 rounded-none shadow-sm">
                  {sliceCount} SLICES
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-[#cdc3b0]">Cross-sectional subdivision density:</span>
                    <strong className="text-[#e27551] font-bold">{sliceCount} intervals</strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={sliceCount}
                    onChange={(e) => setSliceCount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#25201d] rounded-none appearance-none cursor-pointer accent-[#e27551]"
                  />
                  <span className="text-[10px] text-[#bdae9e] block mt-1 leading-relaxed">
                    Splits baseline mesh into cross-sectional slices. Higher steps yield continuous integrals. Original standard: 10-100 in steps of 5.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-[#cdc3b0]">Percentage Area depletion floor:</span>
                    <strong className="text-[#e27551] font-bold">{lossThreshold.toFixed(1)}% loss</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="35.0"
                    step="0.5"
                    value={lossThreshold}
                    onChange={(e) => setLossThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#25201d] rounded-none appearance-none cursor-pointer accent-[#e27551]"
                  />
                  <span className="text-[10px] text-[#bdae9e] block mt-1 leading-relaxed">
                    Required slice volume decrease to evaluate an element as &quot;actively breached&quot;. Original standard: 0.5% - 35.0%.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-[#cdc3b0]">Metric volume deficit limit:</span>
                    <strong className="text-[#e27551] font-bold">{valVolumeThreshold.toFixed(4)} m³</strong>
                  </div>
                  <input
                    type="range"
                    min="0.0001"
                    max="0.0150"
                    step="0.0001"
                    value={valVolumeThreshold}
                    onChange={(e) => setValVolumeThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#25201d] rounded-none appearance-none cursor-pointer accent-[#e27551]"
                  />
                  <span className="text-[10px] text-[#bdae9e] block mt-1 leading-relaxed">
                    Ignores micro-gaps (e.g., stone crevices, dust index) during contiguous fail grouping. Original standard: 0.0001 - 0.0150 m³.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-[#cdc3b0]">Deficit Severity Index (DSI) scaling:</span>
                    <strong className="text-[#e27551] font-bold">{dsiSensitivity.toFixed(2)}x</strong>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.05"
                    value={dsiSensitivity}
                    onChange={(e) => setDsiSensitivity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#25201d] rounded-none appearance-none cursor-pointer accent-[#e27551]"
                  />
                  <span className="text-[10px] text-[#bdae9e] block mt-1 leading-relaxed">
                    Scalar multiplier to gauge architectural risk relative to baseline volume layers. Original standard: 0.10x - 3.00x.
                  </span>
                </div>

                <div className="border-t border-[#3e342f] pt-3">
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[#cdc3b0]">Scan Slicing Axis:</span>
                    <strong className="text-[#e27551] font-mono">{slicingAxis}-Axis</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSlicingAxis("X")}
                      className={`px-3 py-1.5 rounded-none text-[11px] font-mono font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          slicingAxis === "X"
                            ? "bg-[#b25d43] text-white border-[#b25d43] shadow-sm"
                            : "bg-[#25201d] hover:bg-[#342a25] text-[#cdc3b0] border-[#3e342f]"
                      }`}
                    >
                      <span>X-Axis (Long)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlicingAxis("Y")}
                      className={`px-3 py-1.5 rounded-none text-[11px] font-mono font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          slicingAxis === "Y"
                            ? "bg-[#b25d43] text-white border-[#b25d43] shadow-sm"
                            : "bg-[#25201d] hover:bg-[#342a25] text-[#cdc3b0] border-[#3e342f]"
                      }`}
                    >
                      <span>Y-Axis (Cross)</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#3e342f] pt-3">
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[#cdc3b0]">Height Filtering (Outlier Noise):</span>
                    <strong className="text-[#e27551] font-mono">
                      {heightEstimationPct === 100 ? "No Filter (Max Z)" : `${heightEstimationPct}% Percentile`}
                    </strong>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "Max Z", val: 100, desc: "No filter" },
                      { label: "90% Pct", val: 90, desc: "Clean noise" },
                      { label: "75% Pct", val: 75, desc: "Robust noise" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setHeightEstimationPct(opt.val)}
                        className={`px-1 py-1.5 rounded-none text-[11px] font-mono font-bold border transition flex items-center justify-center cursor-pointer ${
                          heightEstimationPct === opt.val
                            ? "bg-[#b25d43] text-white border-[#b25d43] shadow-sm"
                            : "bg-[#25201d] hover:bg-[#342a25] text-[#cdc3b0] border-[#3e342f]"
                        }`}
                        title={opt.desc}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#3e342f] pt-3">
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[#cdc3b0]">Void Shadow Interpolation:</span>
                    <strong className="text-[#e27551] font-mono">
                      {voidHandling === "strict" ? "Strict Void" : "Interpolate"}
                    </strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVoidHandling("strict")}
                      className={`px-3 py-1.5 rounded-none text-[11px] font-mono font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          voidHandling === "strict"
                            ? "bg-[#b25d43] text-white border-[#b25d43] shadow-sm"
                            : "bg-[#25201d] hover:bg-[#342a25] text-[#cdc3b0] border-[#3e342f]"
                      }`}
                    >
                      <span>Strict Void (0 Area)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoidHandling("interpolate")}
                      className={`px-3 py-1.5 rounded-none text-[11px] font-mono font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          voidHandling === "interpolate"
                            ? "bg-[#b25d43] text-white border-[#b25d43] shadow-sm"
                            : "bg-[#25201d] hover:bg-[#342a25] text-[#cdc3b0] border-[#3e342f]"
                      }`}
                    >
                      <span>Smooth Gap (Averaged)</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-[#3e342f] pb-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#e27551] shrink-0" />
                    <h3 className="font-mono text-xs font-bold text-[#faf3e8] uppercase tracking-wider">
                      III. CO-REGISTRATION MESH ALIGNMENT
                    </h3>
                  </div>
                  <button
                    onClick={handleAutoAlign}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#25201d] hover:bg-[#342a25] border border-[#3e342f] text-[#e27551] font-mono text-[10.5px] font-bold tracking-wide rounded-none shadow-sm transition shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-[#e27551] shrink-0" />
                    <span>Auto-Align Coordinates</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-[#cdc3b0]">Baseline Trim (Z-Crop Height):</span>
                      <strong className="text-[#faf3e8]">{beforeZTrim.toFixed(3)} m</strong>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.4"
                      step="0.01"
                      value={beforeZTrim}
                      onChange={(e) => setBeforeZTrim(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#25201d] rounded-none appearance-none cursor-pointer accent-[#e27551]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-[#cdc3b0]">Comparison Trim (Z-Crop Height):</span>
                      <strong className="text-[#faf3e8]">{afterZTrim.toFixed(3)} m</strong>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.4"
                      step="0.01"
                      value={afterZTrim}
                      onChange={(e) => setAfterZTrim(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#25201d] rounded-none appearance-none cursor-pointer accent-[#e27551]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-[#3e342f] pt-3 mt-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-[#bdae9e] font-bold text-xs">X Offset:</span>
                      </div>
                      <input
                        type="range"
                        min="-2.0"
                        max="2.0"
                        step="0.01"
                        value={xOffset}
                        onChange={(e) => setXOffset(parseFloat(e.target.value))}
                        className="w-full h-1 bg-[#25201d] rounded-none appearance-none cursor-pointer accent-[#e27551]"
                      />
                      <span className="text-[11px] font-mono text-[#faf3e8] block text-center mt-1 font-semibold">
                        {xOffset >= 0 ? `+${xOffset.toFixed(2)}` : xOffset.toFixed(2)}m
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-[#bdae9e] font-bold text-xs">Y Offset:</span>
                      </div>
                      <input
                        type="range"
                        min="-2.0"
                        max="2.0"
                        step="0.01"
                        value={yOffset}
                        onChange={(e) => setYOffset(parseFloat(e.target.value))}
                        className="w-full h-1 bg-[#25201d] rounded-none appearance-none cursor-pointer accent-[#e27551]"
                      />
                      <span className="text-[11px] font-mono text-[#faf3e8] block text-center mt-1 font-semibold">
                        {yOffset >= 0 ? `+${yOffset.toFixed(2)}` : yOffset.toFixed(2)}m
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-[#bdae9e] font-bold text-xs">Z Offset:</span>
                      </div>
                      <input
                        type="range"
                        min="-1.0"
                        max="1.0"
                        step="0.01"
                        value={zOffset}
                        onChange={(e) => setZOffset(parseFloat(e.target.value))}
                        className="w-full h-1 bg-[#25201d] rounded-none appearance-none cursor-pointer accent-[#e27551]"
                      />
                      <span className="text-[11px] font-mono text-[#faf3e8] block text-center mt-1 font-semibold">
                        {zOffset >= 0 ? `+${zOffset.toFixed(2)}` : zOffset.toFixed(2)}m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="flex flex-col gap-6 my-6">
            
            <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-mono text-xs font-bold text-[#faf3e8] uppercase tracking-wider">
                    Graph A: Superimposed Volume Profile
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-[#25201d] border border-[#3e342f] text-[#faf3e8] font-semibold shadow-sm">
                    Volume (m³)
                  </span>
                </div>
                <p className="text-[11px] text-[#bdae9e] leading-relaxed mb-4">
                  Baseline original volume (dashed border, soft fill) vs current comparative remaining volume (solid orange) plotted together.
                </p>
              </div>

              <div className="w-full relative bg-[#13110f] rounded-none p-2 border border-[#3e342f]">
                <svg viewBox="0 0 600 180" className="w-full h-44 overflow-visible">
                  <defs>
                    <linearGradient id="solidGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ea580c" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {slices.length > 0 && (() => {
                    const allVolumes = slices.flatMap(item => [item.originalVolume, item.transgressedVolume]);
                    const rawMinVol = Math.min(...allVolumes);
                    const rawMaxVol = Math.max(...allVolumes);
                    const volRange = rawMaxVol - rawMinVol;
                    
                    const valBuffer = volRange > 0 ? volRange * 0.15 : Math.max(0.00001, rawMaxVol * 0.15);
                    const minVolume = Math.max(0, rawMinVol - valBuffer);
                    const maxVolume = rawMaxVol + valBuffer;

                    const getX = (idx: number) => 65 + (idx / Math.max(1, slices.length - 1)) * 515;
                    const getY = (val: number) => 150 - ((val - minVolume) / Math.max(0.000001, maxVolume - minVolume)) * 135;

                    const volTicks: number[] = [];
                    const ticksCount = 4;
                    for (let t = 0; t < ticksCount; t++) {
                      volTicks.push(minVolume + (t / (ticksCount - 1)) * (maxVolume - minVolume));
                    }

                    return (
                      <>
                        {volTicks.map((val, tIdx) => {
                          const y = getY(val);
                          return (
                            <g key={tIdx}>
                              <line x1={65} y1={y} x2={580} y2={y} stroke="#2d2521" strokeWidth="1" strokeDasharray="3,3" />
                              <text x={58} y={y + 3} fontSize="9px" fontFamily="monospace" fill="#bdae9e" textAnchor="end">
                                {val.toFixed(4)}
                              </text>
                            </g>
                          );
                        })}

                        {anomalies.map((zone, zIdx) => {
                          const xStart = getX(zone.startIndex);
                          const xEnd = getX(zone.endIndex);
                          const widthBand = Math.max(6, xEnd - xStart);
                          const isSliceInZone = selectedSliceIndex !== null && selectedSliceIndex >= zone.startIndex && selectedSliceIndex <= zone.endIndex;
                          return (
                            <g key={zIdx}>
                              <rect
                                x={xStart}
                                y={15}
                                width={widthBand}
                                height={135}
                                fill="#ef4444"
                                fillOpacity={isSliceInZone ? "0.15" : "0.06"}
                                stroke="#f87171"
                                strokeWidth={isSliceInZone ? "1" : "0.5"}
                                strokeDasharray="2,2"
                              />
                            </g>
                          );
                        })}

                        <path
                          d={`M 65,150 ${slices.map((s, idx) => {
                            return `L ${getX(idx).toFixed(1)},${getY(s.originalVolume).toFixed(1)}`;
                          }).join(" ")} L 580,150 Z`}
                          fill="#5a4e45"
                          fillOpacity="0.12"
                          stroke="#cdc3b0"
                          strokeWidth="1.2"
                          strokeDasharray="3,3"
                        />

                        <path
                          d={`M 65,150 ${slices.map((s, idx) => {
                            return `L ${getX(idx).toFixed(1)},${getY(s.transgressedVolume).toFixed(1)}`;
                          }).join(" ")} L 580,150 Z`}
                          fill="url(#solidGrad)"
                          stroke="#e27551"
                          strokeWidth="2.2"
                        />

                        {slices.map((s, idx) => {
                          const colW = 515 / slices.length;
                          const x = getX(idx) - (colW / 2);
                          return (
                            <rect
                              key={idx}
                              x={x}
                              y={10}
                              width={colW}
                              height={140}
                              fill="transparent"
                              className="cursor-pointer hover:fill-[#e27551]/10"
                              onMouseEnter={() => setSelectedSliceIndex(idx)}
                              onClick={() => setSelectedSliceIndex(idx)}
                            />
                          );
                        })}

                        {selectedSliceIndex !== null && slices[selectedSliceIndex] && (() => {
                          const selS = slices[selectedSliceIndex];
                          const xVal = getX(selectedSliceIndex);
                          return (
                            <g>
                              <line
                                x1={xVal}
                                y1={10}
                                x2={xVal}
                                y2={150}
                                stroke="#b25d43"
                                strokeWidth="1.5"
                                strokeDasharray="2,2"
                              />
                              <circle
                                cx={xVal}
                                cy={getY(selS.originalVolume)}
                                r="4"
                                fill="#cdc3b0"
                              />
                              <circle
                                cx={xVal}
                                cy={getY(selS.transgressedVolume)}
                                r="5.5"
                                fill="#e27551"
                                className="stroke-[#13110f] stroke-2"
                              />
                            </g>
                          );
                        })()}
                      </>
                    );
                  })()}
                  <line x1={65} y1={15} x2={65} y2={150} stroke="#5a4e45" strokeWidth="1.5" />
                  <line x1={65} y1={150} x2={580} y2={150} stroke="#5a4e45" strokeWidth="1.5" />
                </svg>
                <div className="flex justify-between text-[10px] font-mono text-[#bdae9e] mt-2 pl-14">
                  <span>0.00m (origin)</span>
                  <span className="text-[#faf3e8] font-bold">Volume envelope (baseline vs current)</span>
                  <span>{lengthMeters.toFixed(2)}m (bound)</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-mono text-xs font-bold text-[#faf3e8] uppercase tracking-wider">
                    Graph B: Volumetric Loss Percentage
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-[#25201d] border border-[#3e342f] text-[#e27551] font-semibold shadow-sm">
                    Loss (%)
                  </span>
                </div>
                <p className="text-[11px] text-[#bdae9e] leading-relaxed mb-4">
                  Real-time calculated cross-sectional percentage area depletion. Higher vertical bars represent severe active material collapse.
                </p>
              </div>

              <div className="w-full relative bg-[#13110f] rounded-none p-2 border border-[#3e342f]">
                <svg viewBox="0 0 600 180" className="w-full h-44 overflow-visible">
                  {slices.length > 0 && (() => {
                    const maxLoss = Math.max(...slices.map(item => item.percentageLoss), 5.0);
                    const getX = (idx: number) => 65 + (idx / Math.max(1, slices.length - 1)) * 515;
                    const getY = (val: number) => 150 - (val / maxLoss) * 135;

                    return (
                      <>
                        {[0, 0.5, 1.0].map((ratio) => {
                          const val = ratio * maxLoss;
                          const y = getY(val);
                          return (
                            <g key={ratio}>
                              <line x1={65} y1={y} x2={580} y2={y} stroke="#2d2521" strokeWidth="1" strokeDasharray="3,3" />
                              <text x={58} y={y + 3} fontSize="9px" fontFamily="monospace" fill="#bdae9e" textAnchor="end">
                                {val.toFixed(1)}%
                              </text>
                            </g>
                          );
                        })}

                        {anomalies.map((zone, zIdx) => {
                          const xStart = getX(zone.startIndex);
                          const xEnd = getX(zone.endIndex);
                          const widthBand = Math.max(6, xEnd - xStart);
                          const isSliceInZone = selectedSliceIndex !== null && selectedSliceIndex >= zone.startIndex && selectedSliceIndex <= zone.endIndex;
                          return (
                            <g key={zIdx}>
                              <rect
                                x={xStart}
                                y={15}
                                width={widthBand}
                                height={135}
                                fill="#ef4444"
                                fillOpacity={isSliceInZone ? "0.15" : "0.06"}
                                stroke="#f87171"
                                strokeWidth={isSliceInZone ? "1" : "0.5"}
                                strokeDasharray="2,2"
                              />
                            </g>
                          );
                        })}

                        {slices.map((s, idx) => {
                          const xVal = getX(idx);
                          const h = (s.percentageLoss / maxLoss) * 135;
                          const colW = Math.max(1.5, 515 / slices.length);
                          return (
                            <rect
                              key={idx}
                              x={xVal - colW / 2}
                              y={150 - h}
                              width={colW}
                              height={Math.max(0.5, h)}
                              fill={s.isTransgressed ? "#e27551" : "#5a4e45"}
                              fillOpacity={idx === selectedSliceIndex ? "1.0" : "0.6"}
                            />
                          );
                        })}

                        {slices.map((s, idx) => {
                          const colW = 515 / slices.length;
                          const x = getX(idx) - (colW / 2);
                          return (
                            <rect
                              key={idx}
                              x={x}
                              y={10}
                              width={colW}
                              height={140}
                              fill="transparent"
                              className="cursor-pointer hover:fill-[#e27551]/10"
                              onMouseEnter={() => setSelectedSliceIndex(idx)}
                              onClick={() => setSelectedSliceIndex(idx)}
                            />
                          );
                        })}

                        {selectedSliceIndex !== null && (
                          <line
                            x1={getX(selectedSliceIndex)}
                            y1={10}
                            x2={getX(selectedSliceIndex)}
                            y2={150}
                            stroke="#b25d43"
                            strokeWidth="1.5"
                            strokeDasharray="2,2"
                          />
                        )}
                      </>
                    );
                  })()}
                  <line x1={65} y1={15} x2={65} y2={150} stroke="#5a4e45" strokeWidth="1.5" />
                  <line x1={65} y1={150} x2={580} y2={150} stroke="#5a4e45" strokeWidth="1.5" />
                </svg>
                <div className="flex justify-between text-[10px] font-mono text-[#bdae9e] mt-2 pl-14">
                  <span>0.00m</span>
                  <span className="text-[#faf3e8] font-bold">Percentage Area collapse spectrum</span>
                  <span>{lengthMeters.toFixed(2)}m</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-mono text-xs font-bold text-[#faf3e8] uppercase tracking-wider">
                    Graph C: Severity Index (DSI)
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-[#25201d] border border-[#3e342f] text-emerald-400 font-semibold shadow-sm">
                    Coefficient
                  </span>
                </div>
                <p className="text-[11px] text-[#bdae9e] leading-relaxed mb-4">
                  Gauge structural collapse risk based on volume lost multiplied by scaling sensitivity. Peaks denote unstable hollow breaches.
                </p>
              </div>

              <div className="w-full relative bg-[#13110f] rounded-none p-2 border border-[#3e342f]">
                <svg viewBox="0 0 600 180" className="w-full h-44 overflow-visible">
                  {slices.length > 0 && (() => {
                    const getSeverity = (s: any) => s.percentageLoss * s.volumeDifference * dsiSensitivity;
                    const maxSeverity = Math.max(...slices.map(item => getSeverity(item)), 0.0001);
                    const getX = (idx: number) => 65 + (idx / Math.max(1, slices.length - 1)) * 515;
                    const getY = (val: number) => 150 - (val / maxSeverity) * 135;

                    return (
                      <>
                        {[0, 0.5, 1.0].map((ratio) => {
                          const val = ratio * maxSeverity;
                          const y = getY(val);
                          return (
                            <g key={ratio}>
                              <line x1={65} y1={y} x2={580} y2={y} stroke="#2d2521" strokeWidth="1" strokeDasharray="3,3" />
                              <text x={58} y={y + 3} fontSize="9px" fontFamily="monospace" fill="#bdae9e" textAnchor="end">
                                {val.toFixed(3)}
                              </text>
                            </g>
                          );
                        })}

                        {anomalies.map((zone, zIdx) => {
                          const xStart = getX(zone.startIndex);
                          const xEnd = getX(zone.endIndex);
                          const widthBand = Math.max(6, xEnd - xStart);
                          const isSliceInZone = selectedSliceIndex !== null && selectedSliceIndex >= zone.startIndex && selectedSliceIndex <= zone.endIndex;
                          return (
                            <g key={zIdx}>
                              <rect
                                x={xStart}
                                y={15}
                                width={widthBand}
                                height={135}
                                fill={isSliceInZone ? "#f87171" : "#f87171"}
                                fillOpacity={isSliceInZone ? "0.15" : "0.06"}
                                stroke="#f87171"
                                strokeWidth={isSliceInZone ? "1" : "0.5"}
                                strokeDasharray="2,2"
                              />
                            </g>
                          );
                        })}

                        <path
                          d={slices.map((s, idx) => {
                            const val = getSeverity(s);
                            return `${idx === 0 ? "M" : "L"} ${getX(idx).toFixed(1)},${getY(val).toFixed(1)}`;
                          }).join(" ")}
                          fill="none"
                          stroke="#b25d43"
                          strokeWidth="2"
                        />

                        {slices.map((s, idx) => {
                          const xVal = getX(idx);
                          const sValue = getSeverity(s);
                          const yVal = getY(sValue);
                          const isSelected = selectedSliceIndex === idx;

                          let ptColor = "#4da970"; 
                          if (s.isTransgressed) ptColor = "#e27551";
                          else if (s.percentageLoss > 5) ptColor = "#eab308";

                          return (
                            <circle
                              key={idx}
                              cx={xVal}
                              cy={yVal}
                              r={isSelected ? 5.5 : 2.5}
                              fill={isSelected ? "#ffd27a" : ptColor}
                              stroke={isSelected ? "#13110f" : "none"}
                              strokeWidth={isSelected ? 1 : 0}
                              className="cursor-pointer"
                              onMouseEnter={() => setSelectedSliceIndex(idx)}
                              onClick={() => setSelectedSliceIndex(idx)}
                            />
                          );
                        })}

                        {slices.map((s, idx) => {
                          const colW = 515 / slices.length;
                          const x = getX(idx) - (colW / 2);
                          return (
                            <rect
                              key={idx}
                              x={x}
                              y={10}
                              width={colW}
                              height={140}
                              fill="transparent"
                              className="cursor-pointer hover:fill-[#e27551]/10"
                              onMouseEnter={() => setSelectedSliceIndex(idx)}
                              onClick={() => setSelectedSliceIndex(idx)}
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                  <line x1={65} y1={15} x2={65} y2={150} stroke="#5a4e45" strokeWidth="1.5" />
                  <line x1={65} y1={150} x2={580} y2={150} stroke="#5a4e45" strokeWidth="1.5" />
                </svg>
                <div className="flex justify-between text-[10px] font-mono text-[#bdae9e] mt-2 pl-14">
                  <span>0.00m origin</span>
                  <span className="text-[#a4f4c8] font-bold">Stable (Green) ➔ Warning (Yellow) ➔ Collapse (Red)</span>
                  <span>{lengthMeters.toFixed(2)}m</span>
                </div>
              </div>
            </div>

          </div>

          <div className="flex flex-col gap-6">
            
            <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-[#3e342f] pb-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-[#e27551] shrink-0" />
                    <h3 className="font-mono text-xs font-bold text-[#faf3e8] uppercase tracking-wider">
                      IV. SYNCHRONIZED FOCUS MEASURING TAPE
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold border border-[#b25d43]/40 bg-[#3a1d15] text-[#faf3e8] px-2 py-0.5 rounded-none shadow-sm">
                    Slice #{selectedSliceIndex !== null ? selectedSliceIndex : "None"}
                  </span>
                </div>

                {chosenSlice ? (
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between py-1 border-b border-[#3e342f]/40">
                      <span className="text-[#bdae9e]">Longitudinal Location (X):</span>
                      <strong className="text-[#faf3e8]">{chosenSlice.positionX.toFixed(3)} m</strong>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#3e342f]/40">
                      <span className="text-[#bdae9e]">Nominal Original Height / Width:</span>
                      <strong className="text-[#faf3e8]">{chosenSlice.originalHeight.toFixed(3)}m / {chosenSlice.originalWidth.toFixed(3)}m</strong>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#3e342f]/40">
                      <span className="text-[#bdae9e]">Transgressed Height / Width:</span>
                      <strong className="text-[#faf3e8]">{chosenSlice.transgressedHeight.toFixed(3)}m / {chosenSlice.transgressedWidth.toFixed(3)}m</strong>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#3e342f]/40">
                      <span className="text-[#bdae9e]">Baseline original Volume segment:</span>
                      <strong className="text-[#faf3e8]">{chosenSlice.originalVolume.toFixed(4)} m³</strong>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#3e342f]/40">
                      <span className="text-[#bdae9e]">Remaining Volume segment (aligned):</span>
                      <strong className="text-[#faf3e8]">{chosenSlice.transgressedVolume.toFixed(4)} m³</strong>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#3e342f]/40">
                      <span className="text-[#e27551] font-bold">Cross-Sectional Area loss ratio %:</span>
                      <strong className="text-[#e27551]">-{chosenSlice.percentageLoss.toFixed(1)}%</strong>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#3e342f]/40">
                      <span className="text-[#e27551] font-bold">Stone displacement volume (dx):</span>
                      <strong className="text-[#e27551]">-{chosenSlice.volumeDifference.toFixed(4)} m³</strong>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#3e342f]/40">
                      <span className="text-[#bdae9e]">Pedestal alignment boundary:</span>
                      <strong className="text-[#e27551]">
                        {chosenSlice.isBoundary ? `Trimmed (${chosenSlice.boundaryReason})` : "Active core wall"}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[#bdae9e]">State safety alarm status:</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-none border ${
                          chosenSlice.isTransgressed 
                            ? "bg-[#2a1310] border-[#b25d43] text-[#e27551] shadow-sm"
                            : "bg-[#102a1d] border-emerald-800 text-emerald-400 shadow-sm"
                        }`}
                      >
                        {chosenSlice.isTransgressed ? "BREACH" : "NOMINAL"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#bdae9e] italic text-xs">
                    Hover or click on any of the interactive plots above to project precise voxel interaction details.
                  </div>
                )}
              </div>

              <div className="text-[10.5px] text-[#bdae9e] font-mono text-center pt-3 mt-4 border-t border-[#3e342f]">
                Values represent mathematical Riemann differentials calculated over slicing interval: <strong>{sliceStep.toFixed(3)}m</strong>
              </div>
            </div>

            <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-[#3e342f] pb-2 mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#e27551] shrink-0" />
                    <h3 className="font-mono text-xs font-bold text-[#faf3e8] uppercase tracking-wider">
                      V. DRIFT ANOMALY BOUNDARY CRASH ZONES
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#faf3e8] bg-[#3a1d15] border border-[#3e342f] px-2 py-0.5 rounded-none shadow-sm">
                    {anomalies.length} BLOCKS CLASSIFIED
                  </span>
                </div>

                {anomalies.length === 0 ? (
                  <div className="text-center py-12 text-[#bdae9e] italic text-xs leading-relaxed">
                    Passed. Under current alert parameters, there are no contiguous dry-stone wall sections classified as structural anomalies.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {anomalies.map((zone, idx) => {
                      const isSliceInZone = selectedSliceIndex !== null && selectedSliceIndex >= zone.startIndex && selectedSliceIndex <= zone.endIndex;
                      return (
                        <div
                          key={idx}
                          id={`anomaly-card-${idx}`}
                          onClick={() => setSelectedSliceIndex(Math.floor((zone.startIndex + zone.endIndex) / 2))}
                          className={`border p-3 rounded-none text-left transition-all duration-150 cursor-pointer ${
                            isSliceInZone
                              ? "bg-[#2c1d18] border-[#e27551] ring-1 ring-[#e27551]/30"
                              : "bg-[#13110f] border-[#3e342f] hover:border-[#5a4e45]"
                          }`}
                        >
                          <div className="flex justify-between items-center border-b border-[#3e342f] pb-1 mb-2">
                            <span className="text-[10px] font-mono font-bold text-[#e27551] uppercase flex items-center gap-1">
                              CRITICAL EXCURSION #{idx + 1}
                              {isSliceInZone && (
                                <span className="text-[9.5px] font-mono font-bold bg-[#b25d43] text-white px-1.5 py-0.2 rounded-sm ml-1 uppercase">
                                  ACTIVE SELECT
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-[#1c1917] border border-[#3e342f] text-[#faf3e8] px-1.5 py-0.2 rounded-none">
                              {zone.confidence}% Conf.
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 font-mono text-[10.5px] text-[#bdae9e]">
                            <div>
                              Coord Range: <strong className="text-[#faf3e8] block mt-0.5">{zone.startDist.toFixed(1)}m - {zone.endDist.toFixed(1)}m</strong>
                            </div>
                            <div>
                              Avg Section Loss: <strong className="text-[#e27551] block mt-0.5">-{zone.avgLoss.toFixed(1)}%</strong>
                            </div>
                            <div>
                              Volumetric Deficit: <strong className="text-[#e27551] block mt-0.5 font-bold">-{zone.volLost.toFixed(4)} m³</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-[#bdae9e] font-mono text-center pt-2 border-t border-[#3e342f]">
                Breach detection logic combines percentage area deflection with volumetric floor constants.
              </div>
            </div>

          </div>

          <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none mb-6">
            <div className="flex items-center gap-2 border-b border-[#3e342f] pb-2 mb-4">
              <Layers className="w-4 h-4 text-[#e27551] shrink-0" />
              <h3 className="font-mono text-xs font-bold text-[#faf3e8] uppercase tracking-wider">
                VI. FINE SPATIAL CORRELATION METRICS
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-[#13110f] border border-[#3e342f] p-3 rounded-none font-mono shadow-sm">
                <span className="text-[10px] text-[#bdae9e] uppercase block mb-1">Chamfer Registration Error:</span>
                <strong className="text-sm text-[#faf3e8] font-bold">
                  {metrics ? `${metrics.chamferDistance.toFixed(5)} m` : "N/A"}
                </strong>
                <span className="text-[9.5px] text-[#bdae9e] block mt-1 leading-relaxed">
                  Dual-sided nearest-neighbor spatial drift margin.
                </span>
              </div>

              <div className="bg-[#13110f] border border-[#3e342f] p-3 rounded-none font-mono shadow-sm">
                <span className="text-[10px] text-[#bdae9e] uppercase block mb-1">Max Hausdorff Gap limit:</span>
                <strong className="text-sm text-[#faf3e8] font-bold">
                  {metrics ? `${metrics.hausdorffDistance.toFixed(5)} m` : "N/A"}
                </strong>
                <span className="text-[9.5px] text-[#bdae9e] block mt-1 leading-relaxed">
                  Absolute localized maximum gap distance between scans.
                </span>
              </div>

              <div className="bg-[#13110f] border border-[#3e342f] p-3 rounded-none font-mono shadow-sm">
                <span className="text-[10px] text-[#bdae9e] uppercase block mb-1">Voxel Congruence Jaccard Score:</span>
                <strong className="text-sm text-emerald-400 font-bold">
                  {metrics ? `${(metrics.jaccardIoU * 100).toFixed(2)}%` : "N/A"}
                </strong>
                <span className="text-[9.5px] text-[#bdae9e] block mt-1 leading-relaxed">
                  Intersection-over-Union (IoU) of coordinate voxel maps.
                </span>
              </div>

              <div className="bg-[#13110f] border border-[#3e342f] p-3 rounded-none font-mono shadow-sm">
                <span className="text-[10px] text-[#bdae9e] uppercase block mb-1">RMS Roughness Coefficient:</span>
                <strong className="text-sm text-[#faf3e8] font-bold">
                  {metrics ? `${metrics.roughnessBefore.toFixed(3)}m ➔ ${metrics.roughnessAfter.toFixed(3)}m` : "N/A"}
                </strong>
                <span className="text-[9.5px] text-[#bdae9e] block mt-1 leading-relaxed">
                  Micro-roughness elevation variance dispersion values.
                </span>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 pt-4 border-t border-[#3e342f]">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#faf3e8] block mb-1">
                  Total integrated Volumetrics:
                </span>
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#bdae9e]">Total original calculated baseline Volume:</span>
                    <strong className="text-[#faf3e8]">{statsBefore ? `${statsBefore.totalVol.toFixed(3)} m³` : "N/A"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#bdae9e]">Total remaining calculated transgressed Volume:</span>
                    <strong className="text-[#faf3e8]">{statsAfter ? `${statsAfter.totalVol.toFixed(3)} m³` : "N/A"}</strong>
                  </div>
                  <div className="flex justify-between border-t border-[#3e342f] pt-1">
                    <span className="text-[#e27551] font-bold">Net integrated Material Deficit Volume Lost:</span>
                    <strong className="text-[#e27551]">{statsBefore && statsAfter ? `${Math.max(0, statsBefore.totalVol - statsAfter.totalVol).toFixed(4)} m³` : "N/A"}</strong>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#faf3e8] block mb-1">
                  Spatial overlap registration details:
                </span>
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#bdae9e]">Active baseline point count (trimmed):</span>
                    <strong className="text-[#faf3e8]">{metrics ? `${metrics.beforeTrimmedCount} vertices` : "N/A"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#bdae9e]">Active comparison point count (trimmed):</span>
                    <strong className="text-[#faf3e8]">{metrics ? `${metrics.afterTrimmedCount} vertices` : "N/A"}</strong>
                  </div>
                  <div className="flex justify-between border-t border-[#3e342f] pt-1">
                    <span className="text-[#bdae9e]">Calculated co-registration Shift Travel:</span>
                    <strong className="text-[#e27551] font-bold">{metrics ? `${metrics.alignmentDistance.toFixed(4)} meters` : "N/A"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1c1917] border border-[#3e342f] p-4 rounded-none">
            <div className="flex justify-between items-center border-b border-[#3e342f] pb-2 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#e27551] shrink-0" />
                <h3 className="font-mono text-xs font-bold text-[#faf3e8] uppercase tracking-wider">
                  VII. FULL SPATIAL INTERACTION SYSTEM SHEET LEDGER
                </h3>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25201d] hover:bg-[#342a25] border border-[#3e342f] text-[#cdc3b0] font-mono text-[11px] font-bold tracking-wide rounded-none shadow-sm transition cursor-pointer"
                title="Download CSV Spreadsheet file"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#e27551] shrink-0" />
                <span>Export ledger to CSV</span>
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto border border-[#3e342f] rounded-none">
              <table className="w-full text-left font-mono text-[11px] text-[#cdc3b0] border-collapse">
                <thead>
                  <tr className="bg-[#25201d] border-b border-[#3e342f] sticky top-0 text-[#faf3e8]">
                    <th className="p-2.5">Slice index</th>
                    <th className="p-2.5">Longitudinal Coord (m)</th>
                    <th className="p-2.5 text-right">Orig Volume (m³)</th>
                    <th className="p-2.5 text-right">Trans Volume (m³)</th>
                    <th className="p-2.5 text-right">Net Lost (m³)</th>
                    <th className="p-2.5 text-right">Damage Rate</th>
                    <th className="p-2.5 text-center">Alert levels</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e342f]">
                  {slices.map((slice) => {
                    const isSelected = selectedSliceIndex === slice.sliceIndex;
                    return (
                      <tr
                        key={slice.sliceIndex}
                        id={`slice-row-${slice.sliceIndex}`}
                        onClick={() => setSelectedSliceIndex(slice.sliceIndex)}
                        className={`hover:bg-[#e27551]/10 transition-colors cursor-pointer ${
                          isSelected ? "bg-[#2c1d18] font-medium text-[#faf3e8] border-l-2 border-[#e27551]" : "text-[#cdc3b0]"
                        }`}
                      >
                        <td className="p-2.5 text-[#faf3e8]">
                          <strong>#{slice.sliceIndex}</strong>
                        </td>
                        <td className="p-2.5">{slice.positionX.toFixed(3)}m</td>
                        <td className="p-2.5 text-right text-[#bdae9e]">{slice.originalVolume.toFixed(4)}</td>
                        <td className="p-2.5 text-right text-[#faf3e8]">{slice.transgressedVolume.toFixed(4)}</td>
                        <td className={`p-2.5 text-right font-bold ${slice.volumeDifference > 0.001 ? "text-[#e27551]" : ""}`}>
                          {slice.volumeDifference > 0.001 ? `-${slice.volumeDifference.toFixed(4)}` : "0.0000"}
                        </td>
                        <td className={`p-2.5 text-right font-bold ${slice.percentageLoss > 0.1 ? "text-[#e27551]" : ""}`}>
                          {slice.percentageLoss > 0.1 ? `-${slice.percentageLoss.toFixed(1)}%` : "0.0%"}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-none border shadow-sm ${
                              slice.isTransgressed
                                ? "bg-[#2a1310] text-[#e27551] border-[#b25d43]/40"
                                : "bg-[#102a1d] text-emerald-400 border-emerald-800/40"
                            }`}
                          >
                            {slice.isTransgressed ? "BREACH ALERT" : "NOMINAL"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
