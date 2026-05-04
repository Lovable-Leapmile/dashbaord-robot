import { useEffect, useState, useRef, useCallback, memo } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { getApiUrl, authenticatedFetch } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import noRecordsImg from "@/assets/no_records.png";

interface StatusMessage {
  msg?: string;
  UPTIME?: string;
  "GOTO OPS"?: string;
  ROBOT_ID?: string;
  "PLC READS"?: string;
  "STORE OPS"?: string;
  device_id?: string;
  "PLC ERRORS"?: string;
  "PLC WRITES"?: string;
  "NUM HOMINGS"?: string;
  "RETRIEVE OPS"?: string;
  "RECOVERIES MAGNET"?: string;
  "SUPERVISOR STATUS"?: string;
  "RECOVERIES HORZVERT"?: string;
  "RECOVERIES PUSHPULL"?: string;
  "SUPERVISOR START TIME"?: string;
  [key: string]: string | undefined;
}

// Convert any key (e.g. "SUPERVISOR START TIME", "device_id") into a friendly label
const toLabel = (key: string): string => {
  if (key === "UPDATED_AT") return "Updated At";
  return key
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Detect ISO/datetime-like values dynamically (no hardcoded keys)
const isDateLike = (v: string): boolean =>
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v);

interface StatusCardProps {
  fieldKey: string;
  label: string;
  value: string | undefined;
  isHighlight?: boolean;
}

const formatValue = (key: string, value: string | undefined): string => {
  if (value === undefined || value === null || value === "") return "N/A";
  const str = String(value);

  // Auto-format any datetime-like value, regardless of key
  if (isDateLike(str)) {
    try {
      const date = new Date(str.replace(" ", "T"));
      if (!isNaN(date.getTime())) return format(date, "dd MMM yyyy, hh:mm:ss a");
    } catch { /* fall through */ }
  }

  return str;
};

const StatusCard = memo(({ fieldKey, label, value, isHighlight }: StatusCardProps) => {
  const formattedValue = formatValue(fieldKey, value);

  return (
    <div className={`bg-card border border-border rounded-xl p-4 sm:p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md ${isHighlight ? 'border-l-4 border-l-primary' : ''}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className="text-base sm:text-lg font-semibold text-foreground break-words" title={formattedValue}>
        {formattedValue}
      </p>
    </div>
  );
});

StatusCard.displayName = "StatusCard";

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6">
    {Array.from({ length: 17 }).map((_, i) => (
      <div key={i} className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-6 w-32" />
      </div>
    ))}
  </div>
);

const Monitor = () => {
  useAuthSession();
  const [statusData, setStatusData] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousDataRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const token = getStoredAuthToken();
      if (!token) return;
      const response = await authenticatedFetch(
        getApiUrl(`/pubsub/subscribe?topic=STATUSMONITOR_EVENTS&num_records=1`),
        {
          signal: abortControllerRef.current.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data?.records?.[0]?.message) {
        const record = data.records[0];
        const messageWithUpdatedAt = {
          ...record.message,
          UPDATED_AT: record.updated_at,
        };
        const newDataString = JSON.stringify(messageWithUpdatedAt);

        // Only update state if data actually changed
        if (newDataString !== previousDataRef.current) {
          previousDataRef.current = newDataString;
          setStatusData(messageWithUpdatedAt);
        }
      }

      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore abort errors
      }
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    const intervalId = setInterval(fetchStatus, 2000);

    return () => {
      clearInterval(intervalId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStatus]);

  const renderStatusCards = () => {
    if (!statusData) return null;

    const PREFERRED_ORDER = [
      "ROBOT_ID",
      "SUPERVISOR START TIME",
      "UPDATED_AT",
      "UPTIME",
      "GOTO OPS",
      "STORE OPS",
      "RETRIEVE OPS",
      "NUM HOMINGS",
      "PLC READS",
      "PLC WRITES",
      "PLC RETRIES",
      "PLC ERRORS",
      "RECOVERIES MAGNET",
      "PLC READ RETRIES",
      "PLC WRITE RETRIES",
      "PLC TOTAL RETRIES",
      "RECOVERIES HORZVERT",
      "RECOVERIES PUSHPULL",
      "msg",
      "SUPERVISOR STATUS",
    ];

    const availableKeys = Object.keys(statusData).filter(
      (k) => statusData[k] !== undefined && statusData[k] !== null && String(statusData[k]) !== ""
    );

    const orderedKeys = [
      ...PREFERRED_ORDER.filter((k) => availableKeys.includes(k)),
      ...availableKeys.filter((k) => !PREFERRED_ORDER.includes(k)),
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6">
        {orderedKeys.map((key) => (
          <StatusCard
            key={key}
            fieldKey={key}
            label={toLabel(key)}
            value={statusData[key]}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader selectedTab="" isMonitorPage={true} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6">
          {/* Error state */}
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && <LoadingSkeleton />}

          {/* Status cards */}
          {!isLoading && !error && renderStatusCards()}

          {/* Empty state */}
          {!isLoading && !error && !statusData && (
            <div className="flex items-center justify-center" style={{ height: "100dvh" }}>
              <img src={noRecordsImg} alt="No records" className="w-48 sm:w-[340px]" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Monitor;
