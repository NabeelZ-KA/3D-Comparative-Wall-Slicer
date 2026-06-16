export interface WallSlice {
  sliceIndex: number;
  positionX: number; 
  originalHeight: number; 
  transgressedHeight: number; 
  originalWidth: number; 
  transgressedWidth: number;
  originalVolume: number;
  transgressedVolume: number;
  volumeDifference: number; 
  percentageLoss: number; 
  isTransgressed: boolean;
  isBoundary?: boolean; 
  boundaryReason?: string;
}

export interface WallSegment {
  id: string;
  name: string;
  location: string;
  coordinates: string;
  description: string;
  historicalPeriod: string;
  lengthMeters: number;
  sliceStepMeters: number; 
  slices: WallSlice[];
  avgOriginalHeight: number;
  avgOriginalWidth: number;
}

export interface AnalysisResponse {
  success: boolean;
  analysis: string;
  error?: string;
}
