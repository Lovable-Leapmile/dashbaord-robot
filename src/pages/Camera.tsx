import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, Clock, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getApiUrl, authenticatedFetch } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import noRecordsImg from "@/assets/no_records.png";
import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";

const formatLastUpdated = (value?: string): string => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "N/A";
  if (isToday(d)) return format(d, "hh:mm a");
  // if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM yyyy");
};

const formatRelative = (value?: string): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  // if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDistanceToNowStrict(d, { addSuffix: true });
};
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortOption = "latest" | "task_asc" | "task_desc";

interface Task {
  task_id: string;
  last_updated?: string;
}

const FILTER_STORAGE_KEY = "camera_filter_preference";

const Camera = () => {
  useAuthSession(); // Session validation
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    return (saved as SortOption) || "latest";
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    // Filter to only show valid task IDs (exclude null/undefined)
    let validTasks = tasks.filter((task) => task.task_id);

    // Apply search filter
    if (searchQuery.trim() !== "") {
      validTasks = validTasks.filter((task) => task.task_id.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Apply date range filter (on last_updated)
    if (dateRange?.from || dateRange?.to) {
      validTasks = validTasks.filter((task) => {
        if (!task.last_updated) return false;
        const d = new Date(task.last_updated);
        if (isNaN(d.getTime())) return false;
        if (dateRange.from) {
          const from = new Date(dateRange.from);
          from.setHours(0, 0, 0, 0);
          if (d < from) return false;
        }
        if (dateRange.to) {
          const to = new Date(dateRange.to);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
        return true;
      });
    }

    // Apply sorting
    const sortedTasks = [...validTasks].sort((a, b) => {
      switch (sortOption) {
        case "task_asc":
          return a.task_id.localeCompare(b.task_id);
        case "task_desc":
          return b.task_id.localeCompare(a.task_id);
        case "latest":
        default:
          const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
          const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
          return dateB - dateA;
      }
    });

    setFilteredTasks(sortedTasks);
  }, [searchQuery, tasks, sortOption, dateRange]);

  const handleSortChange = (value: string) => {
    const newSort = value as SortOption;
    setSortOption(newSort);
    localStorage.setItem(FILTER_STORAGE_KEY, newSort);
  };

  const fetchTasks = async () => {
    try {
      const token = getStoredAuthToken();
      if (!token) return;
      const response = await authenticatedFetch(getApiUrl(`/cameramanager/camera_events/tasks`), {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.records) {
        setTasks(data.records);
        setFilteredTasks(data.records);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/camera/${taskId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader selectedTab="" isCameraPage={true} />
      <main className="flex-1 p-2 sm:p-4">
        <div className="max-w-9xl mx-auto">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-[90%]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by Task ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-card border-border"
              />
            </div>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 justify-start text-left font-normal gap-2",
                      !dateRange && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <span className="text-xs sm:text-sm whitespace-nowrap">
                          {format(dateRange.from, "d/M/yyyy")} - {format(dateRange.to, "d/M/yyyy")}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm whitespace-nowrap">
                          {format(dateRange.from, "d/M/yyyy")}
                        </span>
                      )
                    ) : (
                      <span className="text-xs sm:text-sm whitespace-nowrap">Filter by date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {dateRange && (
                <button
                  onClick={() => setDateRange(undefined)}
                  className="p-1 rounded-full hover:bg-accent transition-colors"
                  title="Clear date filter"
                >
                  <X className="h-4 w-4 text-foreground" />
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="h-10 w-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0"
                  style={{ backgroundColor: "rgba(53, 28, 117, 0.15)" }}
                  aria-label="Toggle filters"
                >
                  <SlidersHorizontal className="h-[18px] w-[18px]" style={{ color: "#351C75" }} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                  <DropdownMenuRadioGroup value={sortOption} onValueChange={handleSortChange}>
                    <DropdownMenuRadioItem value="latest" className="cursor-pointer">
                      Latest Task
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="task_asc" className="cursor-pointer">
                      Task (ASC)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="task_desc" className="cursor-pointer">
                      Task (DESC)
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="h-10 flex items-center justify-center px-3">
                <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                  Total: <span className="text-foreground font-semibold">{filteredTasks.length}</span>
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: "100dvh" }}>
              <img src={noRecordsImg} alt="No records" className="w-48 sm:w-[340px]" />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 bg-muted/40 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-5">Task ID</div>
                <div className="col-span-4">Last Updated</div>
                <div className="col-span-3">When</div>
              </div>
              <ul className="divide-y divide-border">
                {filteredTasks.map((task) => (
                  <li
                    key={task.task_id}
                    onClick={() => handleTaskClick(task.task_id)}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors items-center"
                  >
                    <div className="sm:col-span-5 font-medium text-foreground truncate">{task.task_id}</div>
                    <div className="sm:col-span-4 text-sm text-muted-foreground">
                      {formatLastUpdated(task.last_updated)}
                    </div>
                    <div className="sm:col-span-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        <Clock className="h-3 w-3" />
                        {formatRelative(task.last_updated)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Camera;
