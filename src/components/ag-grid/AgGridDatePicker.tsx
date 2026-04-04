import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import type { IDateComp, IDateParams } from "ag-grid-community";
import { format, isValid } from "date-fns";

import { Calendar } from "@/components/ui/calendar";

const normalizeDate = (value: Date | null | undefined) => {
  if (!value || !isValid(value)) return null;
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
};

const AgGridDatePicker = forwardRef<IDateComp, IDateParams>((params, ref) => {
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      setSelectedDate(normalizeDate(date));
      params.onDateChanged();
    },
    [params]
  );

  useImperativeHandle(
    ref,
    () => ({
      getGui: () => calendarRef.current ?? document.createElement("div"),
      getDate: () => selectedDate,
      setDate: (date: Date | null) => {
        setSelectedDate(normalizeDate(date));
      },
      setDisabled: () => {
        // Calendar is display-only for picking; AG Grid controls filter button states.
      },
      setInputPlaceholder: () => {
        // Not needed for the calendar UI.
      },
      setInputAriaLabel: () => {
        // Calendar already exposes accessible day controls.
      },
      afterGuiAttached: () => {
        const focusTarget = calendarRef.current?.querySelector("button");
        if (focusTarget instanceof HTMLButtonElement) {
          focusTarget.focus();
        }
      },
      refresh: () => {
        // AG Grid will call setDate when the filter model changes.
      },
    }),
    [selectedDate]
  );

  return (
    <div ref={calendarRef} className="rounded-md border bg-popover p-2">
      <Calendar
        mode="single"
        selected={selectedDate ?? undefined}
        onSelect={handleSelect}
        initialFocus
        captionLayout="dropdown-buttons"
        fromYear={2000}
        toYear={2100}
        defaultMonth={selectedDate ?? new Date()}
        footer={
          <div className="px-2 pb-1 pt-2 text-center text-xs text-muted-foreground">
            {selectedDate ? `Selected: ${format(selectedDate, "dd-MM-yyyy")}` : "Select a date"}
          </div>
        }
      />
    </div>
  );
});

AgGridDatePicker.displayName = "AgGridDatePicker";

export default AgGridDatePicker;