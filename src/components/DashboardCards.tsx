import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bot, Package, Layers, Zap, RefreshCw } from "lucide-react";
import { getApiUrl, authenticatedFetch } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";

interface RobotInfo {
  robot_name: string;
  robot_num_rows: number;
  robot_num_racks: number;
  robot_num_slots: number;
  robot_num_depths: number;
  updated_at: string;
}

interface SlotInfo {
  totalSlots: number;
  occupiedSlots: number;
  freeSlots: number;
  occupiedPercent: number;
  updatedAt: Date;
}

interface TrayInfo {
  totalTrays: number;
  occupiedTrays: number;
  freeTrays: number;
  occupiedPercent: number;
  updatedAt: Date;
}

interface PowerInfo {
  voltage: string;
  current: string;
  power: string;
  energy: string;
  updatedAt: string | null;
}

export const DashboardCards = () => {
  const [robotInfo, setRobotInfo] = useState<RobotInfo | null>(null);
  const [robotNumDepths, setRobotNumDepths] = useState(0);
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
  const [trayInfo, setTrayInfo] = useState<TrayInfo | null>(null);
  const [powerInfo, setPowerInfo] = useState<PowerInfo | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getTimeAgo = useCallback((date: Date | null): string => {
    if (!date) return "Never";
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, []);

  const [timeAgoDisplay, setTimeAgoDisplay] = useState("Never");

  const formatDateTime = (date: Date | string | null): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  };

  const fetchRobotInfo = async () => {
    try {
      const token = getStoredAuthToken();
      if (!token) return;
      const response = await authenticatedFetch(getApiUrl(`/robotmanager/robots`), {
        headers: { "Authorization": token, "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.records && data.records.length > 0) {
        setRobotInfo(data.records[0]);
        setRobotNumDepths(data.records[0].robot_num_depths || 0);
      }
    } catch (error) {
      console.error("Error fetching robot info:", error);
    }
  };

  const fetchSlotInfo = async () => {
    try {
      const token = getStoredAuthToken();
      if (!token) return;
      const [slotsResponse, traysResponse] = await Promise.all([
        authenticatedFetch(getApiUrl(`/robotmanager/slots_count?slot_status=active`), {
          headers: { "Authorization": token, "Content-Type": "application/json" }
        }),
        authenticatedFetch(getApiUrl(`/robotmanager/trays?tray_status=active`), {
          headers: { "Authorization": token, "Content-Type": "application/json" }
        })
      ]);

      const slotsData = await slotsResponse.json();
      const traysData = await traysResponse.json();

      const totalSlots = slotsData.records?.[0]?.total_count || 0;
      const occupiedSlots = traysData.records ? traysData.records.length : 0;
      const freeSlots = totalSlots - occupiedSlots;
      const occupiedPercent = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

      setSlotInfo({ totalSlots, occupiedSlots, freeSlots, occupiedPercent, updatedAt: new Date() });
    } catch (error) {
      console.error("Error fetching slot info:", error);
    }
  };

  const fetchTrayInfo = async () => {
    try {
      const token = getStoredAuthToken();
      if (!token) return;
      const [occupiedResponse, freeResponse] = await Promise.all([
        authenticatedFetch(getApiUrl(`/nanostore/occupied_trays?occupied=true`), {
          headers: { "Authorization": token, "Content-Type": "application/json" }
        }),
        authenticatedFetch(getApiUrl(`/nanostore/occupied_trays?occupied=false`), {
          headers: { "Authorization": token, "Content-Type": "application/json" }
        })
      ]);

      const occupiedData = await occupiedResponse.json();
      const freeData = await freeResponse.json();

      const occupiedTrays = occupiedData.records?.[0]?.count || 0;
      const freeTrays = freeData.records?.[0]?.count || 0;
      const totalTrays = occupiedTrays + freeTrays;
      const occupiedPercent = totalTrays > 0 ? (occupiedTrays / totalTrays) * 100 : 0;

      setTrayInfo({ totalTrays, occupiedTrays, freeTrays, occupiedPercent, updatedAt: new Date() });
    } catch (error) {
      console.error("Error fetching tray info:", error);
    }
  };

  const fetchPowerInfo = async () => {
    try {
      const token = getStoredAuthToken();
      if (!token) return;
      // First try to fetch today's data
      let response = await authenticatedFetch(getApiUrl(`/robotmanager/robot_power?today=true&num_records=1`), {
        headers: { "Authorization": token, "Content-Type": "application/json" }
      });
      let data = await response.json();
      
      // If today's data is not available, fetch the most recent data regardless of date
      if (data.status !== "success" || !data.records || data.records.length === 0) {
        response = await authenticatedFetch(getApiUrl(`/robotmanager/robot_power?num_records=1`), {
          headers: { "Authorization": token, "Content-Type": "application/json" }
        });
        data = await response.json();
      }
      
      if (data.status === "success" && data.records && data.records.length > 0) {
        const record = data.records[0];
        setPowerInfo({
          voltage: `${record.voltage ?? 'N/A'} V`,
          current: `${record.current ?? 'N/A'} A`,
          power: `${record.max_demand_active_power ?? 'N/A'} kW`,
          energy: `${record.total_active_energy_kwh ?? 'N/A'} kWh`,
          updatedAt: record.updated_at || null
        });
      } else {
        // No data available at all
        setPowerInfo({
          voltage: "N/A",
          current: "N/A",
          power: "N/A",
          energy: "N/A",
          updatedAt: null
        });
      }
    } catch (error) {
      console.error("Error fetching power info:", error);
      setPowerInfo({
        voltage: "N/A",
        current: "N/A",
        power: "N/A",
        energy: "N/A",
        updatedAt: null
      });
    }
  };

  const fetchAllData = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchRobotInfo(),
      fetchSlotInfo(),
      fetchTrayInfo(),
      fetchPowerInfo()
    ]);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Update time ago display every second
  useEffect(() => {
    const updateTimeAgo = () => setTimeAgoDisplay(getTimeAgo(lastUpdated));
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated, getTimeAgo]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-full">
      {/* Real-time Update Indicator */}
      <div className="col-span-full flex items-center justify-end gap-2 px-1 -mb-1">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
          <span>{isRefreshing ? 'Refreshing...' : `Updated ${timeAgoDisplay}`}</span>
        </div>
        <button 
          onClick={fetchAllData}
          disabled={isRefreshing}
          className="p-1 rounded hover:bg-muted/50 transition-colors disabled:opacity-50"
          title="Refresh now"
        >
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Robot Information Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 flex flex-col overflow-hidden">
        <CardHeader className="pb-0 pt-2 px-3">
          <CardTitle className="text-xs font-bold text-primary flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            Robot Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3 flex-1 flex flex-col justify-center">
          {robotInfo ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center bg-primary/10 rounded-lg py-2 px-3">
                <span className="text-lg font-bold text-primary tracking-wide">{robotInfo.robot_name}</span>
              </div>
              <div className={`grid ${robotNumDepths > 1 ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
                <div className="text-center py-2 bg-background/80 rounded-lg border border-border/50 shadow-sm">
                  <div className="text-lg font-bold text-foreground">{robotInfo.robot_num_rows}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Rows</div>
                </div>
                <div className="text-center py-2 bg-background/80 rounded-lg border border-border/50 shadow-sm">
                  <div className="text-lg font-bold text-foreground">{robotInfo.robot_num_racks}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Racks</div>
                </div>
                <div className="text-center py-2 bg-background/80 rounded-lg border border-border/50 shadow-sm">
                  <div className="text-lg font-bold text-foreground">{robotInfo.robot_num_slots}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Slots</div>
                </div>
                {robotNumDepths > 1 && (
                  <div className="text-center py-2 bg-background/80 rounded-lg border border-border/50 shadow-sm">
                    <div className="text-lg font-bold text-foreground">{robotInfo.robot_num_depths}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">Depths</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-4 text-xs">Loading...</div>
          )}
        </CardContent>
      </Card>

      {/* Power Information Card */}
      <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20 flex flex-col overflow-hidden">
        <CardHeader className="pb-0 pt-2 px-3">
          <CardTitle className="text-xs font-bold text-amber-600 flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Power Information
            </span>
            {powerInfo?.updatedAt && (
              <span className="text-[9px] font-normal text-muted-foreground">
                {formatDateTime(powerInfo.updatedAt)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3 flex-1 flex flex-col justify-center">
          {powerInfo ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background/80 rounded-lg p-2.5 text-center border border-border/50 shadow-sm">
                <div className="text-lg font-bold text-foreground">{powerInfo.voltage}</div>
                <div className="text-[10px] text-muted-foreground font-medium">Voltage</div>
              </div>
              <div className="bg-background/80 rounded-lg p-2.5 text-center border border-border/50 shadow-sm">
                <div className="text-lg font-bold text-foreground">{powerInfo.current}</div>
                <div className="text-[10px] text-muted-foreground font-medium">Current</div>
              </div>
              <div className="bg-amber-500/15 rounded-lg p-2.5 border border-amber-500/30 shadow-sm text-center">
                <div className="text-lg font-bold text-amber-600">{powerInfo.power}</div>
                <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Power</div>
              </div>
              <div className="bg-green-500/15 rounded-lg p-2.5 border border-green-500/30 shadow-sm text-center">
                <div className="text-lg font-bold text-green-600">{powerInfo.energy}</div>
                <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Energy</div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-4 text-xs">Loading...</div>
          )}
        </CardContent>
      </Card>

      {/* Slot Information Card */}
      <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20 flex flex-col overflow-hidden">
        <CardHeader className="pb-0 pt-2 px-3">
          <CardTitle className="text-xs font-bold text-blue-600 flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Slot Information
            </span>
            {slotInfo?.updatedAt && (
              <span className="text-[9px] font-normal text-muted-foreground">
                {formatDateTime(slotInfo.updatedAt)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3 flex-1 flex flex-col justify-center">
          {slotInfo ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 bg-background/80 rounded-lg p-2 text-center border border-border/50 shadow-sm">
                  <div className="text-2xl font-bold text-foreground">{slotInfo.totalSlots}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Total Slots</div>
                </div>
                <div className="flex-1 bg-blue-500/15 rounded-lg p-2 text-center border border-blue-500/30 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">{slotInfo.occupiedSlots}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Occupied</div>
                </div>
                <div className="flex-1 bg-green-500/15 rounded-lg p-2 text-center border border-green-500/30 shadow-sm">
                  <div className="text-2xl font-bold text-green-600">{slotInfo.freeSlots}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Free</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-background/60 rounded-lg px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">Occupancy</span>
                <Progress value={slotInfo.occupiedPercent} className="h-2 flex-1" />
                <span className="text-xs font-bold text-blue-600">{slotInfo.occupiedPercent.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-4 text-xs">Loading...</div>
          )}
        </CardContent>
      </Card>

      {/* Tray Information Card */}
      <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20 flex flex-col overflow-hidden">
        <CardHeader className="pb-0 pt-2 px-3">
          <CardTitle className="text-xs font-bold text-purple-600 flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Tray Information
            </span>
            {trayInfo?.updatedAt && (
              <span className="text-[9px] font-normal text-muted-foreground">
                {formatDateTime(trayInfo.updatedAt)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 px-3 pb-3 flex-1 flex flex-col justify-center">
          {trayInfo ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 bg-background/80 rounded-lg p-2 text-center border border-border/50 shadow-sm">
                  <div className="text-2xl font-bold text-foreground">{trayInfo.totalTrays}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Total Trays</div>
                </div>
                <div className="flex-1 bg-purple-500/15 rounded-lg p-2 text-center border border-purple-500/30 shadow-sm">
                  <div className="text-2xl font-bold text-purple-600">{trayInfo.occupiedTrays}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Occupied</div>
                </div>
                <div className="flex-1 bg-green-500/15 rounded-lg p-2 text-center border border-green-500/30 shadow-sm">
                  <div className="text-2xl font-bold text-green-600">{trayInfo.freeTrays}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Free</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-background/60 rounded-lg px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">Occupancy</span>
                <Progress value={trayInfo.occupiedPercent} className="h-2 flex-1" />
                <span className="text-xs font-bold text-purple-600">{trayInfo.occupiedPercent.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-4 text-xs">Loading...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
