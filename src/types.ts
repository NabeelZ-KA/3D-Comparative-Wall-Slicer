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

export interface WallSegment {
  id: string;
  name: string;
  location: string;
  coordinates: string;
  description: string;
  historicalPeriod: string;
  lengthMeters: number;
  sliceStepMeters: number; // e.g. 1.0m, 0.5m
  slices: WallSlice[];
  avgOriginalHeight: number;
  avgOriginalWidth: number;
}

export interface AnalysisResponse {
  success: boolean;
  analysis: string; // Markdown text from Gemini
  error?: string;
}
