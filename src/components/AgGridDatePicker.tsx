import { forwardRef, useImperativeHandle, useState, useCallback, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AgGridDatePickerProps {
  onDateChanged: () => void;
}

const AgGridDatePicker = forwardRef((props: AgGridDatePickerProps, ref) => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const dateRef = useRef<Date | undefined>(undefined);

  const handleSelect = useCallback(
    (selected: Date | undefined) => {
      setDate(selected);
      dateRef.current = selected;
      props.onDateChanged();
    },
    [props]
  );

  useImperativeHandle(ref, () => ({
    getDate() {
      return dateRef.current ?? null;
    },
    setDate(newDate: Date | null) {
      const d = newDate ?? undefined;
      dateRef.current = d;
      setDate(d);
    },
  }));

  return (
    <div className="ag-custom-date-picker">
      <div className="text-xs text-center font-medium text-muted-foreground mb-1">
        {date ? format(date, "dd-MM-yyyy") : "Select a date"}
      </div>
      <Calendar
        mode="single"
        selected={date}
        onSelect={handleSelect}
        initialFocus
        className={cn("p-2 pointer-events-auto rounded-md border bg-background")}
      />
    </div>
  );
});

AgGridDatePicker.displayName = "AgGridDatePicker";

export default AgGridDatePicker;
