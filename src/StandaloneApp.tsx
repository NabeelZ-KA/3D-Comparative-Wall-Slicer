import React, { useState, useEffect } from "react";
import { BareBonesSlicer } from "./components/BareBonesSlicer";
import { Milestone, Wifi, HardHat, ShieldAlert, Cpu } from "lucide-react";
import myLogo from "/logo/logo.svg";

export default function StandaloneApp() {
  const [backendStatus, setBackendStatus] = useState<string>("Verifying pipeline handshake...");
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const pingServer = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        setBackendStatus("LiDAR cloud synchronization node active");
        setIsConnected(true);
      } catch (err) {
        setBackendStatus("Standalone browser client running (Local API limited)");
        setIsConnected(false);
      }
    };
    pingServer();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAEBD7] text-[#402F22] font-sans flex flex-col p-4 md:p-8" id="standalone-app-outer">
      
      <header className="max-w-7xl w-full mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#FCDAB9] border border-[#FEC89A] p-4 rounded-none" id="standalone-header">
        
        <div className="flex items-center gap-3 text">
          <div>
            <img 
            src={myLogo}
            alt="Unearthed Logo" 
            className="h-12 w-12 shrink-0 aspect-square object-contain rounded"
            />
          </div>
          <div>
            <h1 className="font-sans text-base font-bold text-[#402F22] tracking-tight">
              3D Comparative Wall Slicer
            </h1>
          </div>
        </div>        
        
      </header>

      <main className="max-w-7xl w-full mx-auto" id="standalone-main-content">
        <BareBonesSlicer />
      </main>

      <footer className="max-w-7xl w-full mx-auto mt-12 border-t border-[#402F22] pt-6 pb-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left text-xs text-[#402F22] font-mono" id="standalone-footer">
        <div className="flex items-center gap-2">
          <span>RoboKings</span>
          <span className="text-[#402F22]">|</span>
          <span className="text-[#402F22] font-bold">Ancient Wall LiDAR & Photogrammetry Slicing Suite</span>
        </div>
      </footer>

    </div>
  );
}
