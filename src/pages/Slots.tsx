import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef, ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { useToast } from "@/hooks/use-toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getRobotManagerBase } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import noRecordsImage from "@/assets/no_records.png";
import { createDateColumnDef, getDefaultGridProps } from "@/lib/agGridUtils";
import { Search, X } from "lucide-react";

// Register AG Grid Community modules (required in v34+)
ModuleRegistry.registerModules([AllCommunityModule]);

interface SlotData {
  slot_id: string;
  tray_id: string;
  slot_name: string;
  tags: string[] | null;
  slot_height: number;
  slot_status: string;
  updated_at: string;
  comment: string;
}

const mapTags = (records: any[]) =>
  records.map((r: any) => ({
    ...r,
    tags: Array.isArray(r.tags)
      ? r.tags
      : typeof r.tags === "string"
        ? r.tags.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
  }));

const Slots = () => {
  useAuthSession();
  const [rowData, setRowData] = useState<SlotData[]>([]);
  const [allData, setAllData] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotSearch, setSlotSearch] = useState("");
  const [traySearch, setTraySearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const gridApiRef = useRef<any>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const traySearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const columnDefs: ColDef<SlotData>[] = [
    {
      field: "slot_id",
      headerName: "Slot ID",
      sortable: true,
      filter: true,
      flex: 1,
      valueFormatter: (params) => params.value ?? "N/A",
    },
    {
      field: "tray_id",
      headerName: "Tray ID",
      sortable: true,
      filter: true,
      flex: 1,
      valueFormatter: (params) => params.value ?? "N/A",
    },
    {
      field: "slot_name",
      headerName: "Friendly Name",
      sortable: true,
      filter: true,
      flex: 1,
      valueFormatter: (params) => params.value ?? "N/A",
    },
    {
      field: "tags",
      headerName: "Tags",
      sortable: true,
      filter: true,
      flex: 1.5,
      valueFormatter: (params) => {
        if (!params.value || params.value.length === 0) return "N/A";
        return params.value.join(", ");
      },
    },
    {
      field: "slot_height",
      headerName: "Height (mm)",
      sortable: true,
      filter: true,
      flex: 1,
      valueFormatter: (params) => params.value ?? "N/A",
    },
    {
      field: "slot_status",
      headerName: "Status",
      sortable: true,
      filter: true,
      flex: 1,
      valueFormatter: (params) => params.value ?? "N/A",
    },
    createDateColumnDef("updated_at", "Updated At", { flex: 1.5 }),
    {
      field: "comment",
      headerName: "Comment",
      sortable: true,
      filter: true,
      flex: 1.5,
      valueFormatter: (params) => params.value ?? "N/A",
    },
  ];

  useEffect(() => {
    const storedUserName = localStorage.getItem("user_name");
    const storedUserId = localStorage.getItem("user_id");

    if (!storedUserName || !storedUserId) {
      navigate("/");
      return;
    }

    fetchSlotsData();
  }, [navigate]);

  const fetchSlotsData = async () => {
    try {
      setLoading(true);
      const token = getStoredAuthToken();
      if (!token) return;
      const response = await fetch(`${getRobotManagerBase()}/slots?order_by_field=updated_at&order_by_type=DESC`, {
        method: "GET",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) {
        setRowData([]);
        setAllData([]);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch slots data");
      }

      const data = await response.json();
      console.log("Fetched slots:", data?.records?.length);
      const mapped = mapTags(data.records || []);
      setAllData(mapped);
      setRowData(mapped);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load slots data",
        variant: "destructive",
      });
      console.error("Error fetching slots:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchSlotById = useCallback(async (slotId: string) => {
    if (!slotId.trim()) {
      setRowData(allData);
      return;
    }

    try {
      setSearching(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const response = await fetch(
        `${getRobotManagerBase()}/slots?slot_id=${encodeURIComponent(slotId.trim())}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const records = data.records || [];
        if (records.length > 0) {
          setRowData(mapTags(records));
          return;
        }
      }

      // API returned no results — fall back to client-side filter
      const filtered = allData.filter((row) =>
        row.slot_id?.toLowerCase().includes(slotId.trim().toLowerCase())
      );
      setRowData(filtered);
    } catch {
      // On error, fall back to client-side filter
      const filtered = allData.filter((row) =>
        row.slot_id?.toLowerCase().includes(slotId.trim().toLowerCase())
      );
      setRowData(filtered);
    } finally {
      setSearching(false);
    }
  }, [allData]);

  const handleSlotSearchChange = (value: string) => {
    setSlotSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!value.trim()) {
      setRowData(allData);
      return;
    }

    // Debounce API call by 500ms
    searchTimeoutRef.current = setTimeout(() => {
      searchSlotById(value);
    }, 500);
  };

  const clearSearch = () => {
    setSlotSearch("");
    setRowData(allData);
  };

  const searchByTrayId = useCallback(async (trayId: string) => {
    if (!trayId.trim()) {
      setRowData(allData);
      return;
    }

    try {
      setSearching(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const response = await fetch(
        `${getRobotManagerBase()}/slots?tray_id=${encodeURIComponent(trayId.trim())}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const records = data.records || [];
        if (records.length > 0) {
          setRowData(mapTags(records));
          return;
        }
      }

      const filtered = allData.filter((row) =>
        row.tray_id?.toLowerCase().includes(trayId.trim().toLowerCase())
      );
      setRowData(filtered);
    } catch {
      const filtered = allData.filter((row) =>
        row.tray_id?.toLowerCase().includes(trayId.trim().toLowerCase())
      );
      setRowData(filtered);
    } finally {
      setSearching(false);
    }
  }, [allData]);

  const handleTraySearchChange = (value: string) => {
    setTraySearch(value);
    if (traySearchTimeoutRef.current) clearTimeout(traySearchTimeoutRef.current);

    if (!value.trim()) {
      setRowData(allData);
      return;
    }

    traySearchTimeoutRef.current = setTimeout(() => {
      searchByTrayId(value);
    }, 500);
  };

  const clearTraySearch = () => {
    setTraySearch("");
    setRowData(allData);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa" }}>
      <AppHeader selectedTab="Slots" />

      <main className="p-2 sm:p-4">
        {/* Search Bars */}
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Slot ID..."
              value={slotSearch}
              onChange={(e) => { handleSlotSearchChange(e.target.value); setTraySearch(""); }}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {slotSearch && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Tray ID..."
              value={traySearch}
              onChange={(e) => { handleTraySearchChange(e.target.value); setSlotSearch(""); }}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {traySearch && (
              <button
                onClick={clearTraySearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searching && (
            <span className="text-xs text-muted-foreground animate-pulse">Searching...</span>
          )}
        </div>

        {!loading && rowData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: "calc(100vh - 200px)" }}>
            <img src={noRecordsImage} alt="No records found" className="w-48 sm:w-[340px]" />
          </div>
        ) : (
          <div className="ag-theme-quartz w-full" style={{ height: "calc(100vh - 180px)" }}>
            <AgGridReact
              theme="legacy"
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{
                resizable: true,
                minWidth: 100,
                sortable: true,
                filter: true,
              }}
              {...getDefaultGridProps()}
              pagination={true}
              paginationPageSize={100000}
              paginationPageSizeSelector={false}
              rowHeight={35}
              onGridReady={(params) => {
                gridApiRef.current = params.api;
                params.api.setGridOption("quickFilterText", quickFilter);
                params.api.sizeColumnsToFit();
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Slots;
