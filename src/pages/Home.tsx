import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { RobotStateTimeline } from "@/components/RobotStateTimeline";
import { DashboardCards } from "@/components/DashboardCards";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useShuttlePubSub } from "@/hooks/useShuttlePubSub";
import { getStoredAuthToken } from "@/lib/auth";
import { getApiUrl, authenticatedFetch } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import esLeft from "@/assets/es-left.png";
import esRight from "@/assets/es-right.png";

// Action history item type
interface ActionHistoryItem {
  action: string;
  timestamp: Date;
  trayId: string | null;
  row: number | null;
  rack: number | null;
  slot: number | null;
  depth: number | null;
}

// Constants for shuttle animation
const SLOT_HEIGHT = 25; // px
const SLOT_GAP = 10; // px

const Home = () => {
  useAuthSession();
  const [userName, setUserName] = useState("");
  const [robotNumRacks, setRobotNumRacks] = useState(0);
  const [robotNumDepths, setRobotNumDepths] = useState(0);
  const [robotNumRows, setRobotNumRows] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);
  const navigate = useNavigate();

  // Use the PubSub hook for real-time shuttle tracking
  const { shuttleState } = useShuttlePubSub();

  // Track previous rack position for animation
  const prevRackRef = useRef<number | null>(null);
  const [animatedRackPosition, setAnimatedRackPosition] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shuttleSpeed, setShuttleSpeed] = useState(0); // racks per second
  const [totalDistance, setTotalDistance] = useState(0); // total racks traveled
  const [speedHistory, setSpeedHistory] = useState<number[]>([]); // for calculating average
  const shuttleRef = useRef<HTMLDivElement>(null);
  const rackContainerRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<{ rack: number; time: number } | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  

  // Calculate Y position for a given rack index
  const calculateYPosition = (rackIndex: number): number => {
    return rackIndex * (SLOT_HEIGHT + SLOT_GAP);
  };

  // Track last scroll time to prevent jitter
  const lastScrollTimeRef = useRef<number>(0);

  // Auto-scroll container to keep active rack in view during movement - smooth and jitter-free
  const scrollToActiveRack = (rackIndex: number, force: boolean = false) => {
    if (!rackContainerRef.current) return;
    
    // Throttle scroll calls to prevent jitter (min 50ms between calls)
    const now = Date.now();
    if (!force && now - lastScrollTimeRef.current < 50) return;
    lastScrollTimeRef.current = now;
    
    const container = rackContainerRef.current;
    const rackPosition = calculateYPosition(rackIndex);
    const containerHeight = container.clientHeight;
    const padding = 60;
    
    // Calculate if the rack position is outside visible area
    const currentScroll = container.scrollTop;
    const visibleTop = currentScroll + padding;
    const visibleBottom = currentScroll + containerHeight - padding;
    
    if (rackPosition < visibleTop || rackPosition > visibleBottom) {
      // Center the active rack in the viewport
      const targetScrollTop = rackPosition - containerHeight / 2 + SLOT_HEIGHT / 2;
      
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    }
  };

  // Animate shuttle when rack position changes with immediate real-time scrolling
  useEffect(() => {
    const currentRack = shuttleState.store_rack;
    
    // Skip if no valid rack
    if (currentRack === null || currentRack === undefined || currentRack < 0) {
      setShuttleSpeed(0);
      return;
    }

    const targetY = calculateYPosition(currentRack);
    const now = performance.now();

    // Calculate speed based on rack position change
    if (lastPositionRef.current !== null && lastPositionRef.current.rack !== currentRack) {
      const timeDelta = (now - lastPositionRef.current.time) / 1000; // seconds
      const racksDelta = Math.abs(currentRack - lastPositionRef.current.rack);
      if (timeDelta > 0) {
        const speed = racksDelta / timeDelta;
        setShuttleSpeed(Math.min(speed, 10)); // Cap at 10 racks/sec for display
        setTotalDistance(prev => prev + racksDelta);
        setSpeedHistory(prev => [...prev.slice(-19), speed]); // Keep last 20 speeds
      }
    }
    lastPositionRef.current = { rack: currentRack, time: now };

    // Initialize position on first valid rack
    if (prevRackRef.current === null) {
      prevRackRef.current = currentRack;
      setAnimatedRackPosition(targetY);
      scrollToActiveRack(currentRack, true);
      return;
    }

    // Handle position change with immediate scroll response
    if (prevRackRef.current !== currentRack) {
      setIsAnimating(true);
      setAnimatedRackPosition(targetY);
      prevRackRef.current = currentRack;

      // Immediate scroll - don't wait
      scrollToActiveRack(currentRack, true);
      
      // Continuous tracking during CSS animation using interpolation
      let animationFrameId: number;
      const startTime = performance.now();
      const animationDuration = 1500;
      const startY = animatedRackPosition;
      const deltaY = targetY - startY;
      
      const trackShuttle = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Cubic easing for smooth scroll tracking
        const eased = 1 - Math.pow(1 - progress, 3);
        const interpolatedRack = Math.round((startY + deltaY * eased) / (SLOT_HEIGHT + SLOT_GAP));
        
        if (progress < 1) {
          scrollToActiveRack(interpolatedRack);
          animationFrameId = requestAnimationFrame(trackShuttle);
        } else {
          setIsAnimating(false);
          setShuttleSpeed(0); // Reset speed when animation ends
          scrollToActiveRack(currentRack, true);
        }
      };
      
      animationFrameId = requestAnimationFrame(trackShuttle);

      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [shuttleState.store_rack, shuttleState.shuttle_action, animatedRackPosition]);

  // Track action history
  useEffect(() => {
    if (shuttleState.shuttle_action && shuttleState.shuttle_action !== "Ongoing") {
      setActionHistory((prev) => {
        const newItem: ActionHistoryItem = {
          action: shuttleState.shuttle_action!,
          timestamp: new Date(),
          trayId: shuttleState.shuttle_move_tray,
          row: shuttleState.store_row >= 0 ? shuttleState.store_row : shuttleState.shuttle_move_row,
          rack: shuttleState.store_rack ?? shuttleState.shuttle_move_rack,
          slot: shuttleState.store_slot ?? shuttleState.destination_name,
          depth: shuttleState.store_depth,
        };
        // Avoid duplicates for same action+position
        if (
          prev.length > 0 &&
          prev[0].action === newItem.action &&
          prev[0].row === newItem.row &&
          prev[0].rack === newItem.rack &&
          prev[0].slot === newItem.slot &&
          prev[0].depth === newItem.depth
        ) {
          return prev;
        }
        return [newItem, ...prev].slice(0, 5);
      });
    }
  }, [
    shuttleState.shuttle_action,
    shuttleState.shuttle_move_tray,
    shuttleState.store_row,
    shuttleState.store_rack,
    shuttleState.store_slot,
    shuttleState.store_depth,
    shuttleState.destination_name,
    shuttleState.shuttle_move_row,
    shuttleState.shuttle_move_rack,
  ]);

  const getStatusClass = (action: string | null) => {
    if (!action || action === "Ongoing") {
      return "status-idle";
    }
    if (action === "Stored" || action === "Retrieved") {
      return "status-complete";
    }
    if (action === "Storing" || action === "Retrieve") {
      return "status-progress";
    }
    return "status-idle";
  };

  useEffect(() => {
    const storedUserName = localStorage.getItem("user_name");
    const storedUserId = localStorage.getItem("user_id");

    if (!storedUserName || !storedUserId) {
      navigate("/");
      return;
    }

    setUserName(storedUserName);
    fetchRobotConfig();
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchRobotConfig = async () => {
    try {
      const token = getStoredAuthToken();
      if (!token) return;

      const response = await authenticatedFetch(getApiUrl(`/robotmanager/robots`), {
        method: "GET",
        headers: {
          Authorization: token,
"Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch robot configuration");
      }

      const data = await response.json();

      if (data.records && data.records.length > 0) {
        const robotConfig = data.records[0];
        setRobotNumRacks(robotConfig.robot_num_racks || 0);
        setRobotNumDepths(robotConfig.robot_num_depths || 0);
        setRobotNumRows(robotConfig.robot_num_rows || 2);
        
        // Store robot_name in localStorage for dynamic API calls
        if (robotConfig.robot_name) {
          localStorage.setItem("robotname", robotConfig.robot_name);
        }
      }
    } catch (error) {
      console.error("Error fetching robot configuration:", error);
    }
  };

  // Get shuttle image based on current row
  const getShuttleImage = (): string => {
    const { store_row } = shuttleState;
    // Row 0 shows es-right, Row 1 shows es-left
    return store_row === 0 ? esRight : esLeft;
  };

  // Check if shuttle should be visible
  const isShuttleVisible = (): boolean => {
    const { store_row, store_rack, shuttle_action } = shuttleState;

    if (shuttle_action === "backward" || shuttle_action === "forward") {
      return false;
    }

    if (store_rack === null || store_rack === undefined || store_rack < 0) {
      return false;
    }

    return store_row === 0 || store_row === 1;
  };

  // Check if a slot should be highlighted (active target)
  const isSlotHighlighted = (rowIndex: number, rackIndex: number, depthIndex: number): boolean => {
    const { store_row, store_rack, store_depth, shuttle_action } = shuttleState;
    
    // Only highlight during active operations
    if (!shuttle_action || shuttle_action === "backward" || shuttle_action === "forward") {
      return false;
    }

    // Check if this slot matches the target location
    return store_row === rowIndex && store_rack === rackIndex && store_depth === depthIndex;
  };

  const getSlotHighlightClass = (rowIndex: number, rackIndex: number, depthIndex: number) =>
    isSlotHighlighted(rowIndex, rackIndex, depthIndex) ? `slot-highlight ${getStatusClass(shuttleState.shuttle_action)}` : "slot-default";

  // Calculate total height for the shuttle track based on racks
  const getTrackHeight = () => {
    if (robotNumRacks === 0) return 0;
    // Each rack slot is 25px height + 10px gap (except first one)
    return robotNumRacks * 25 + (robotNumRacks - 1) * 10;
  };


  return (
    <div className="flex flex-col bg-[#fafafa]">
      <AppHeader selectedTab="Robot" />

      <main className="flex-1 px-2 sm:px-4 py-2">
        {/* Content row */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-3 lg:gap-4">
          {/* Rack visualization */}
          <div className="flex flex-col flex-shrink-0">
            {/* Scrollable rack container */}
            <div 
              ref={rackContainerRef}
              className="overflow-x-hidden scroll-smooth scrollbar-hide rounded-lg mx-auto lg:mx-0"
            >
              {/* Combined Row 1, Shuttle Movement, and Row 0 with borders */}
              <div className="inline-flex bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Row 1 Section - Only show if more than 1 row */}
                {robotNumRows > 1 && (
              <div className="flex flex-col items-center p-3 border-r border-gray-200">
                <div className="flex items-center gap-4 text-xs font-semibold text-center mb-2 text-[#351c75]">
                  {robotNumDepths > 1 && <span className="text-[10px] font-medium text-muted-foreground">Depth-1</span>}
                  <span>Row 1</span>
                  {robotNumDepths > 1 && <span className="text-[10px] font-medium text-muted-foreground">Depth-0</span>}
                </div>
                <div className="flex gap-2 sm:gap-[10px]">
                  {Array.from({ length: robotNumDepths }, (_, depthIdx) => (
                    <div key={`row1-depth${depthIdx}`} className="flex flex-col gap-2 sm:gap-[10px]">
                      {Array.from({ length: robotNumRacks }, (_, rackIdx) => (
                        <div
                          key={`row1-depth${depthIdx}-rack${rackIdx}`}
                          className={`flex items-center justify-center text-xs sm:text-sm font-medium w-[60px] h-[22px] sm:w-[75px] sm:h-[25px] rounded text-[#351c75] transition-colors duration-300 ${getSlotHighlightClass(1, rackIdx, depthIdx)} ${isSlotHighlighted(1, rackIdx, depthIdx) ? "animate-pulse-glow" : ""}`}
                        >
                          {rackIdx}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
                )}

              {/* Shuttle Movement Section - positioned BETWEEN Row 1 and Row 0 (or next to Row 0 if only 1 row) */}
              <div className={`flex flex-col items-center p-3 ${robotNumRows > 1 ? 'border-r border-gray-200' : ''} bg-gray-50/50`}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-center mb-2 cursor-help text-[#351c75]">
                        <span>Shuttle</span>
                        <span className="text-[9px] font-medium text-muted-foreground">
                          ({shuttleSpeed > 0 ? `${shuttleSpeed.toFixed(1)} r/s` : "Idle"})
                        </span>
                        {isAnimating && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className="bg-background border border-border shadow-lg p-3"
                    >
                      <div className="text-xs space-y-1.5 min-w-[140px]">
                        <div className="font-semibold text-primary border-b border-border pb-1 mb-1.5">
                          Speed Stats
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Current:</span>
                          <span className="font-medium text-foreground">
                            {shuttleSpeed > 0 ? `${shuttleSpeed.toFixed(2)} r/s` : "0 r/s"}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Avg Speed:</span>
                          <span className="font-medium text-foreground">
                            {speedHistory.length > 0 
                              ? `${(speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length).toFixed(2)} r/s`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Depth:</span>
                          <span className="font-medium text-foreground">
                            {shuttleState.store_depth !== null ? shuttleState.store_depth : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Distance:</span>
                          <span className="font-medium text-foreground">{totalDistance} racks</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Session:</span>
                          <span className="font-medium text-foreground">
                            {Math.floor((Date.now() - sessionStartRef.current) / 60000)}m
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className={`flex flex-col justify-start shuttle-track track-height-${robotNumRacks}`}>
                  {/* Vertical track line - spans same height as rows */}
                  <div className={`shuttle-track-line track-height-${robotNumRacks}`} />

                {/* Single animated shuttle */}
                {isShuttleVisible() ? (
                  <div
                    ref={shuttleRef}
                    className={`flex flex-col items-center justify-center shuttle-marker shuttle-rack-${Math.round(animatedRackPosition / (SLOT_HEIGHT + SLOT_GAP))}`}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <img
                            src={getShuttleImage()}
                            alt="shuttle"
                            className="cursor-pointer relative z-10 w-[60px] h-[25px] object-contain"
                          />
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="bg-background border border-border shadow-lg p-2"
                        >
                          <div className="text-xs space-y-1">
                            <div className="font-semibold text-primary">
                              {shuttleState.shuttle_action || "Idle"}
                            </div>
                            <div className="text-muted-foreground">
                              <span className="font-medium">Tray ID:</span>{" "}
                              {shuttleState.shuttle_move_tray || "N/A"}
                            </div>
                            <div className="text-muted-foreground">
                              <span className="font-medium">Destination:</span>{" "}
                              Slot {shuttleState.destination_name ?? "N/A"}
                            </div>
                            <div className="text-muted-foreground">
                              <span className="font-medium">Rack:</span> {shuttleState.store_rack ?? "N/A"} |{" "}
                              <span className="font-medium">Row:</span> {shuttleState.store_row === -1 ? "N/A" : shuttleState.store_row}
                            </div>
                            <div className="text-muted-foreground">
                              <span className="font-medium">Depth:</span>{" "}
                              {shuttleState.store_depth !== null ? shuttleState.store_depth : "N/A"}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {/* Status label with color indicator */}
                    <div 
                      className="absolute -bottom-4 flex items-center gap-1"
                    >
                      <span
                        className={`w-2 h-2 rounded-full status-dot ${getStatusClass(shuttleState.shuttle_action)}`}
                      />
                      {shuttleState.shuttle_action && (
                        <span
                          className="text-[8px] font-medium text-primary whitespace-nowrap shuttle-status-label"
                        >
                          {shuttleState.shuttle_action}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Fallback: Show es-left.png on first rack when API returns null/404 */
                  <div
                    className="flex flex-col items-center justify-center shuttle-marker shuttle-rack-0"
                  >
                    <img
                      src={esRight}
                      alt="shuttle"
                      className="relative z-10 w-[60px] h-[25px] object-contain"
                    />
                  </div>
                )}
                </div>
              </div>

              {/* Row 0 Section */}
              <div className="flex flex-col items-center p-3">
                <div className="flex items-center gap-4 text-xs font-semibold text-center mb-2 text-[#351c75]">
                  {robotNumDepths > 1 && <span className="text-[10px] font-medium text-muted-foreground">Depth-0</span>}
                  <span>Row 0</span>
                  {robotNumDepths > 1 && <span className="text-[10px] font-medium text-muted-foreground">Depth-1</span>}
                </div>
                <div className="flex gap-2 sm:gap-[10px]">
                  {Array.from({ length: robotNumDepths }, (_, depthIdx) => (
                    <div key={`row0-depth${depthIdx}`} className="flex flex-col gap-2 sm:gap-[10px]">
                      {Array.from({ length: robotNumRacks }, (_, rackIdx) => (
                        <div
                          key={`row0-depth${depthIdx}-rack${rackIdx}`}
                          className={`flex items-center justify-center text-xs sm:text-sm font-medium w-[60px] h-[22px] sm:w-[75px] sm:h-[25px] rounded text-[#351c75] transition-colors duration-300 ${getSlotHighlightClass(0, rackIdx, depthIdx)} ${isSlotHighlighted(0, rackIdx, depthIdx) ? "animate-pulse-glow" : ""}`}
                        >
                          {rackIdx}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Robot State Timeline with Dashboard Cards */}
          <div className="flex flex-col flex-1 lg:min-h-0 lg:overflow-hidden">
            {/* Timeline and Recent Actions in same row */}
            <div className="flex flex-col lg:flex-row gap-2 flex-shrink-0">
              <div className="flex-1">
                <RobotStateTimeline />
              </div>
              {/* Action History Log - narrower width */}
              <div className="w-full lg:w-[180px] p-2 bg-background rounded-lg border border-border">
                <h4 className="text-xs font-semibold text-primary mb-1.5">Recent Actions</h4>
                {actionHistory.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No actions recorded yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {actionHistory.slice(0, 3).map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-1.5 rounded bg-muted/40 border border-border/50"
                      >
                        <div className="flex items-center gap-1 text-[10px]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 status-dot-small ${getStatusClass(item.action)}`}
                          />
                          <span className="font-medium text-foreground">{item.action}</span>
                          <span className="text-muted-foreground ml-auto text-[9px]">
                            {item.timestamp.toLocaleTimeString("en-IN", { 
                              timeZone: "Asia/Kolkata",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5 pl-3 space-y-0.5">
                          <div>
                            Row: <span className="font-medium text-foreground">{item.row ?? "—"}</span>
                            {" · "}Rack: <span className="font-medium text-foreground">{item.rack ?? "—"}</span>
                          </div>
                          <div>
                            Slot: <span className="font-medium text-foreground">{item.slot ?? "—"}</span>
                            {" · "}Depth: <span className="font-medium text-foreground">{item.depth ?? "—"}</span>
                          </div>
                          {item.trayId && (
                            <div>Tray: <span className="font-medium text-foreground">{item.trayId}</span></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Dashboard Cards - fill remaining space */}
            <div className="flex-1 lg:min-h-0 lg:overflow-auto mt-2">
              <DashboardCards />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
