import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import SlotDetailsPanel from "@/components/SlotDetailsPanel";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getApiUrl, authenticatedFetch } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import blockImg from "@/assets/block.png";
import stationImg from "@/assets/station.png";
import trayImg from "@/assets/tray.png";
import shuttleImg from "@/assets/shuttle.png";

interface Slot {
  slot_id: string;
  slot_name: string;
  slot_status: string;
  tags: string[];
  tray_id: string | null;
}

interface SlotDetails extends Slot {
  slot_height: number;
  updated_at: string;
}

const Racks = () => {
  useAuthSession(); // Session validation
  const [userName, setUserName] = useState("");
  const [numRacks, setNumRacks] = useState(0);
  const [selectedRack, setSelectedRack] = useState<number | null>(null);
  const [row1Depth1Slots, setRow1Depth1Slots] = useState<Slot[]>([]);
  const [row1Depth0Slots, setRow1Depth0Slots] = useState<Slot[]>([]);
  const [row0Depth1Slots, setRow0Depth1Slots] = useState<Slot[]>([]);
  const [row0Depth0Slots, setRow0Depth0Slots] = useState<Slot[]>([]);
  const [robotNumDepths, setRobotNumDepths] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slotDetails, setSlotDetails] = useState<SlotDetails | null>(null);
  const [activeStationSlotIds, setActiveStationSlotIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserName = localStorage.getItem("user_name");
    const storedUserId = localStorage.getItem("user_id");

    if (!storedUserName || !storedUserId) {
      navigate("/");
      return;
    }

    setUserName(storedUserName);

    // Load selected rack from localStorage, default to 0
    const storedSelectedRack = localStorage.getItem("selected_rack");
    if (storedSelectedRack !== null) {
      setSelectedRack(parseInt(storedSelectedRack));
    } else {
      setSelectedRack(0);
      localStorage.setItem("selected_rack", "0");
    }

    fetchRobotConfig();
  }, [navigate]);

  useEffect(() => {
    if (selectedRack !== null) {
      fetchAllSlots(selectedRack);
      fetchActiveTasks();

      // Set up polling interval for 2 seconds
      const intervalId = setInterval(() => {
        fetchAllSlots(selectedRack);
        fetchActiveTasks();
      }, 2000);

      // Cleanup interval on unmount or when selectedRack changes
      return () => clearInterval(intervalId);
    }
  }, [selectedRack]);

  const fetchActiveTasks = async () => {
    try {
      const token = getStoredAuthToken();
      if (!token) return;
      const response = await authenticatedFetch(getApiUrl(`/robotmanager/task?task_status=inprogress`), {
        method: "GET",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.status === 404 || !data.records) {
        setActiveStationSlotIds(new Set());
        return;
      }

      const activeIds = new Set<string>(
        data.records.filter((task: any) => task.station_slot_id).map((task: any) => task.station_slot_id),
      );
      setActiveStationSlotIds(activeIds);
    } catch (error) {
      console.error("Error fetching active tasks:", error);
      setActiveStationSlotIds(new Set());
    }
  };

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

      // Store robot configuration globally
      if (data.records && data.records.length > 0) {
        const robotConfig = data.records[0];
        const numRacksValue = robotConfig.robot_num_racks || 0;
        const numDepthsValue = robotConfig.robot_num_depths || 0;

        localStorage.setItem("robot_num_rows", robotConfig.robot_num_rows?.toString() || "0");
        localStorage.setItem("robot_num_racks", numRacksValue.toString());
        localStorage.setItem("robot_num_slots", robotConfig.robot_num_slots?.toString() || "0");
        localStorage.setItem("robot_num_depths", numDepthsValue.toString());

        setNumRacks(numRacksValue);
        setRobotNumDepths(numDepthsValue);

        console.log("Robot configuration stored globally:", {
          robot_num_rows: robotConfig.robot_num_rows,
          robot_num_racks: numRacksValue,
          robot_num_slots: robotConfig.robot_num_slots,
          robot_num_depths: robotConfig.robot_num_depths,
        });
      }
    } catch (error) {
      console.error("Error fetching robot configuration:", error);
    }
  };

  // Generic sort function that handles all slot patterns
  // Pattern: S-{row}-{rack}-{slot}-{depth}
  // Sorts by slot number (X) in descending order (higher slot number on top)
  const sortSlotsByIdDescending = (slots: Slot[]) => {
    // Pattern to extract: S-{row}-{rack}-{slot}-{depth}
    const slotPattern = /^S-(\d+)-(\d+)-(\d+)-(\d+)$/;

    return [...slots].sort((a, b) => {
      const matchA = a.slot_id.match(slotPattern);
      const matchB = b.slot_id.match(slotPattern);

      if (matchA && matchB) {
        // Extract slot number (4th segment, index 3)
        const slotNumA = parseInt(matchA[3]);
        const slotNumB = parseInt(matchB[3]);
        // Higher slot number appears on top (descending order)
        return slotNumB - slotNumA;
      }

      // Fallback: sort by last characters if pattern doesn't match
      const aNum = parseInt(a.slot_id.slice(-2)) || 0;
      const bNum = parseInt(b.slot_id.slice(-2)) || 0;
      return bNum - aNum;
    });
  };

  const fetchAllSlots = async (rackValue: number) => {
    const token = getStoredAuthToken();
    if (!token) return;
    const robotManagerBase = "/robotmanager";

    try {
      const [res1, res2, res3, res4] = await Promise.all([
        fetch(`${robotManagerBase}/slots?row=1&depth=1&rack=${rackValue}`, {
          headers: { Authorization: token, "Content-Type": "application/json" },
        }),
        fetch(`${robotManagerBase}/slots?row=1&depth=0&rack=${rackValue}`, {
          headers: { Authorization: token, "Content-Type": "application/json" },
        }),
        fetch(`${robotManagerBase}/slots?row=0&depth=0&rack=${rackValue}`, {
          headers: { Authorization: token, "Content-Type": "application/json" },
        }),
        fetch(`${robotManagerBase}/slots?row=0&depth=1&rack=${rackValue}`, {
          headers: { Authorization: token, "Content-Type": "application/json" },
        }),
      ]);

      const [data1, data2, data3, data4] = await Promise.all([res1.json(), res2.json(), res3.json(), res4.json()]);

      setRow1Depth1Slots(sortSlotsByIdDescending(data1.records || []));
      setRow1Depth0Slots(sortSlotsByIdDescending(data2.records || []));
      setRow0Depth1Slots(sortSlotsByIdDescending(data3.records || []));
      setRow0Depth0Slots(sortSlotsByIdDescending(data4.records || []));
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  };

  const handleRackSelect = (index: number) => {
    setSelectedRack(index);
    localStorage.setItem("selected_rack", index.toString());
    setSelectedSlotId(null);
    setSlotDetails(null);
  };

  const fetchSlotDetails = async (slotId: string) => {
    const token = getStoredAuthToken();
    if (!token) return;

    try {
      const response = await authenticatedFetch(getApiUrl(`/robotmanager/slots?slot_id=${slotId}`), {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch slot details");
      }

      const data = await response.json();
      if (data.records && data.records.length > 0) {
        setSlotDetails(data.records[0]);
      }
    } catch (error) {
      console.error("Error fetching slot details:", error);
    }
  };

  const handleSlotClick = (slotId: string) => {
    setSelectedSlotId(slotId);
    fetchSlotDetails(slotId);
  };

  // Auto-refresh slot details every 2 seconds when a slot is selected
  useEffect(() => {
    if (selectedSlotId) {
      const intervalId = setInterval(() => {
        fetchSlotDetails(selectedSlotId);
      }, 2000);

      return () => clearInterval(intervalId);
    }
  }, [selectedSlotId]);

  const SlotBox = ({ slot }: { slot: Slot }) => {
    const isInactive = slot.slot_status === "inactive";
    const isSelected = selectedSlotId === slot.slot_id;
    const isStation = slot.tags?.includes("station");
    const isStationActive = isStation && activeStationSlotIds.has(slot.slot_id);

    return (
      <div
        onClick={() => handleSlotClick(slot.slot_id)}
        className="relative flex flex-col items-center justify-center border rounded transition-all cursor-pointer hover:shadow-md w-[120px] h-[45px] sm:w-[150px] sm:h-[50px]"
        style={{
          borderColor: isSelected ? "#351c75" : "#d1d5db",
          borderWidth: isSelected ? "2px" : "1px",
          backgroundColor: isSelected ? "#f3f0ff" : "white",
        }}
      >
        {isInactive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={blockImg} alt="Inactive" className="w-full h-full object-cover rounded" />
          </div>
        )}
        <div className="text-xs font-medium relative z-10" style={{ color: "#351c75" }}>
          {slot.slot_id}
        </div>
        {(!isInactive || slot.tray_id) && (
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-1" style={{ gap: "1px" }}>
            {slot.tray_id && <img src={trayImg} alt="Tray" className="w-[116px] h-[8px] sm:w-[146px] sm:h-[10px]" />}
            {!isInactive && isStation && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`relative flex items-center justify-center ${isStationActive ? "animate-pulse-station" : ""}`}
                      style={{
                        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                        border: "2px solid #f59e0b",
                        padding: "2px 4px",
                        boxShadow: isStationActive ? undefined : "0 2px 8px rgba(245, 158, 11, 0.3)",
                        borderRadius: "4px 4px 0 0",
                        marginBottom: 0,
                      }}
                    >
                      <img src={stationImg} alt="Station" className="w-[108px] h-[8px] sm:w-[138px] sm:h-[10px]" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-amber-50 border-amber-300 text-amber-900">
                    <div className="text-xs font-medium">
                      <p className="font-semibold">Picking Station</p>
                      <p className="text-amber-700">Slot: {slot.slot_id}</p>
                      {isStationActive && <p className="text-green-600 font-semibold">● Active Task</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa" }}>
      <AppHeader selectedTab="Racks" />

      <main className="p-2 sm:p-4">
        {/* Rack selector with better spacing */}
        <div className="flex justify-center mb-8">
          <div className="bg-card rounded-m border border-border p-3 shadow-md">
            <div className="flex flex-wrap gap-4 sm:gap-5 justify-center">
              {Array.from({ length: numRacks }, (_, index) => (
                <div
                  key={index}
                  onClick={() => handleRackSelect(index)}
                  className={`flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${
                    selectedRack === index
                      ? "bg-primary-foreground text-primary border-2 border-primary shadow-lg scale-110"
                      : "bg-primary text-primary-foreground hover:scale-105 hover:shadow-md"
                  }`}
                >
                  {index}
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedRack !== null && (
          <div className="flex flex-col lg:flex-row justify-center gap-6 overflow-x-auto">
            {/* Main Rack Visualization */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-0">
                {/* Row 1 Section */}
                <div className="flex flex-col items-center p-4 border-r border-gray-100">
                  <div className="text-sm font-bold mb-4" style={{ color: "#351c75" }}>
                    Row 1
                  </div>
                  <div className="flex gap-3">
                    {/* Depth 1 - Only show if more than 1 depth */}
                    {robotNumDepths > 1 && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex flex-col gap-2">
                          {row1Depth1Slots.map((slot, idx) => (
                            <div key={`r1d1-${idx}`}>
                              <SlotBox slot={slot} />
                            </div>
                          ))}
                        </div>
                        <div className="text-xs font-medium mt-3 text-gray-500">Depth 1</div>
                      </div>
                    )}
                    {/* Depth 0 */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex flex-col gap-2">
                        {row1Depth0Slots.map((slot, idx) => (
                          <div key={`r1d0-${idx}`}>
                            <SlotBox slot={slot} />
                          </div>
                        ))}
                      </div>
                      {robotNumDepths > 1 && <div className="text-xs font-medium mt-3 text-gray-500">Depth 0</div>}
                    </div>
                  </div>
                </div>

                {/* Shuttle Image between Row 1 and Row 0 */}
                <div className="flex items-center justify-center px-4 bg-gray-50/50 border-r border-gray-100">
                  <img
                    src={shuttleImg}
                    alt="Shuttle"
                    className="h-full object-contain"
                    style={{
                      opacity: 0.5,
                      height: `${Math.max(row1Depth1Slots.length, row0Depth1Slots.length) * 55}px`,
                    }}
                  />
                </div>

                {/* Row 0 Section */}
                <div className="flex flex-col items-center p-4">
                  <div className="text-sm font-bold mb-4" style={{ color: "#351c75" }}>
                    Row 0
                  </div>
                  <div className="flex gap-3">
                    {/* Depth 0 */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex flex-col gap-2">
                        {row0Depth1Slots.map((slot, idx) => (
                          <div key={`r0d1-${idx}`}>
                            <SlotBox slot={slot} />
                          </div>
                        ))}
                      </div>
                      {robotNumDepths > 1 && <div className="text-xs font-medium mt-3 text-gray-500">Depth 0</div>}
                    </div>
                    {/* Depth 1 - Only show if more than 1 depth */}
                    {robotNumDepths > 1 && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex flex-col gap-2">
                          {row0Depth0Slots.map((slot, idx) => (
                            <div key={`r0d0-${idx}`}>
                              <SlotBox slot={slot} />
                            </div>
                          ))}
                        </div>
                        <div className="text-xs font-medium mt-3 text-gray-500">Depth 1</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Slot Details Panel - Separate Container */}
            {selectedSlotId && (
              <div className="lg:w-[320px] border-l border-border pl-4">
                <SlotDetailsPanel slotDetails={slotDetails} isVisible={selectedSlotId !== null} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Racks;
