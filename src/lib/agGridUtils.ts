import { ColDef, PostProcessPopupParams } from "ag-grid-community";
import { format, isValid, parse, parseISO } from "date-fns";
import AgGridDatePicker from "@/components/AgGridDatePicker";

/**
 * Best-effort parsing for API date strings so AG Grid date filtering works reliably.
 * Supports:
 * - ISO strings (with/without timezone)
 * - "yyyy-MM-dd HH:mm:ss" (common API format)
 * - "dd-MM-yyyy hh:mm:ss a" (our display format)
 * - epoch millis (string/number)
 */
const parseToDate = (value: unknown): Date | null => {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  if (typeof value === "number") {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Epoch millis as a string
  if (/^\d{10,}$/.test(raw)) {
    const d = new Date(Number(raw));
    return isValid(d) ? d : null;
  }

  // ISO (most common)
  try {
    const d = parseISO(raw);
    if (isValid(d)) return d;
  } catch {
    // ignore
  }

  // Native Date parsing (covers many cases like RFC2822)
  const native = new Date(raw);
  if (isValid(native)) return native;

  // Common API string formats
  const candidates: Array<[string, boolean]> = [
    ["yyyy-MM-dd HH:mm:ss.SSS", false],
    ["yyyy-MM-dd HH:mm:ss", false],
    ["yyyy-MM-dd'T'HH:mm:ss.SSS", false],
    ["yyyy-MM-dd'T'HH:mm:ss", false],
    ["dd-MM-yyyy hh:mm:ss a", true],
    ["dd-MM-yyyy HH:mm:ss", false],
    ["dd-MM-yyyy", false],
  ];

  for (const [fmt, hasMeridiem] of candidates) {
    try {
      const d = parse(raw, fmt, new Date());
      if (isValid(d) && (!hasMeridiem || /\b(AM|PM)\b/i.test(raw))) return d;
    } catch {
      // ignore
    }
  }

  return null;
};

/**
 * Date filter comparator for AG Grid
 * Compares full date+time for accurate filtering operations
 */
export const dateFilterComparator = (filterLocalDateAtMidnight: Date, cellValue: unknown): number => {
  const cellDate = parseToDate(cellValue);
  if (!cellDate) return -1;

  // For date-only comparison, compare the date portion of the cell value
  // against the filter date (which is at midnight)
  const cellDateOnly = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
  const filterDateOnly = new Date(filterLocalDateAtMidnight.getFullYear(), filterLocalDateAtMidnight.getMonth(), filterLocalDateAtMidnight.getDate());

  const a = cellDateOnly.getTime();
  const b = filterDateOnly.getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return -1;

  if (a === b) return 0;
  if (a < b) return -1;
  return 1;
};

/**
 * Date+time filter comparator for AG Grid
 * Compares full datetime values for precise filtering
 */
export const dateTimeFilterComparator = (filterDate: Date, cellValue: unknown): number => {
  const cellDate = parseToDate(cellValue);
  if (!cellDate) return -1;

  const a = cellDate.getTime();
  const b = filterDate.getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return -1;

  if (a === b) return 0;
  if (a < b) return -1;
  return 1;
};

/**
 * Date filter params configuration for AG Grid
 * Configured for date filtering with proper date+time handling
 */
export const dateFilterParams = {
  comparator: dateFilterComparator,
  browserDatePicker: false,
  minValidYear: 2000,
  maxValidYear: 2100,
  inRangeFloatingFilterDateFormat: "dd-MM-yyyy",
  filterOptions: [
    "equals",
    "notEqual", 
    "lessThan",
    "greaterThan",
    "inRange",
    "blank",
    "notBlank",
  ],
  defaultOption: "equals",
  suppressAndOrCondition: false,
  buttons: ["apply", "reset", "cancel"],
};

export const formatDateTime12 = (value: unknown): string => {
  const d = parseToDate(value);
  if (!d) return value == null || value === "" ? "N/A" : String(value);
  try {
    return format(d, "dd-MM-yyyy hh:mm:ss a");
  } catch {
    return String(value);
  }
};

/**
 * Creates a date column definition with proper filtering
 */
export const createDateColumnDef = (field: string, headerName: string, options: Partial<ColDef> = {}): ColDef => ({
  field,
  headerName,
  sortable: true,
  filter: "agDateColumnFilter",
  filterParams: dateFilterParams,
  flex: 1.2,
  minWidth: 150,
  valueFormatter: (params) => formatDateTime12(params.value),
  ...options,
});

const createGridIcon = (svgBody: string) =>
  `<span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgBody}</svg></span>`;

const agGridCspSafeIcons: Record<string, string> = {
  menu: createGridIcon("<circle cx='12' cy='5' r='1.5' /><circle cx='12' cy='12' r='1.5' /><circle cx='12' cy='19' r='1.5' />"),
  filter: createGridIcon("<path d='M3 5h18l-7 8v5l-4 2v-7L3 5z' />"),
  columns: createGridIcon("<rect x='3' y='4' width='6' height='16' /><rect x='10.5' y='4' width='10.5' height='16' />"),
  sortAscending: createGridIcon("<path d='M8 17V7' /><path d='m4 11 4-4 4 4' /><path d='M14 17h6' /><path d='M14 13h4' /><path d='M14 9h2' />"),
  sortDescending: createGridIcon("<path d='M8 7v10' /><path d='m4 13 4 4 4-4' /><path d='M14 17h2' /><path d='M14 13h4' /><path d='M14 9h6' />"),
  sortUnSort: createGridIcon("<path d='m8 7-3 3h6z' /><path d='m8 17 3-3H5z' />"),
  first: createGridIcon("<path d='M19 6 9 12l10 6V6z' /><path d='M5 6v12' />"),
  last: createGridIcon("<path d='m5 6 10 6-10 6V6z' /><path d='M19 6v12' />"),
  previous: createGridIcon("<path d='m15 18-8-6 8-6v12z' />"),
  next: createGridIcon("<path d='m9 6 8 6-8 6V6z' />"),
  smallLeft: createGridIcon("<path d='m14 18-6-6 6-6' />"),
  smallRight: createGridIcon("<path d='m10 6 6 6-6 6' />"),
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

/**
 * Reposition popups so they:
 * - Open aligned to their event source (header menu/filter button)
 * - Never overflow the viewport (all resolutions)
 */
export const postProcessAgGridPopup = (params: PostProcessPopupParams) => {
  if (typeof window === "undefined") return;

  // Let AG Grid do its initial placement first
  window.requestAnimationFrame(() => {
    const popupEl = params.ePopup as HTMLElement | null;
    const sourceEl = params.eventSource as HTMLElement | null;
    if (!popupEl) return;

    const margin = 8;
    const popupRect = popupEl.getBoundingClientRect();

    // If we have a source element, anchor to it (this fixes "wrong position" issues)
    if (sourceEl?.getBoundingClientRect) {
      const sourceRect = sourceEl.getBoundingClientRect();

      // Default: open below, left-aligned with the source
      let left = sourceRect.left;
      let top = sourceRect.bottom;

      // Clamp horizontally
      left = clamp(left, margin, window.innerWidth - popupRect.width - margin);

      // Clamp vertically: if doesn't fit below, try above; otherwise clamp to viewport
      const bottomOverflow = top + popupRect.height > window.innerHeight - margin;
      if (bottomOverflow) {
        const aboveTop = sourceRect.top - popupRect.height;
        if (aboveTop >= margin) {
          top = aboveTop;
        }
      }
      top = clamp(top, margin, window.innerHeight - popupRect.height - margin);

      // popupParent is document.body in our defaults; use scroll offsets
      popupEl.style.left = `${left + window.scrollX}px`;
      popupEl.style.top = `${top + window.scrollY}px`;
      popupEl.style.right = "auto";
      popupEl.style.bottom = "auto";
      popupEl.style.transform = "none";
      return;
    }

    // Fallback: just clamp current position into the viewport
    const desiredLeft = clamp(popupRect.left, margin, window.innerWidth - popupRect.width - margin);
    const desiredTop = clamp(popupRect.top, margin, window.innerHeight - popupRect.height - margin);

    popupEl.style.left = `${desiredLeft + window.scrollX}px`;
    popupEl.style.top = `${desiredTop + window.scrollY}px`;
    popupEl.style.right = "auto";
    popupEl.style.bottom = "auto";
    popupEl.style.transform = "none";
  });
};

/**
 * Default AG Grid props to ensure popups work correctly
 */
export const getDefaultGridProps = () => ({
  theme: "legacy" as const,
  popupParent: typeof document !== "undefined" ? document.body : null,
  postProcessPopup: postProcessAgGridPopup,
  enableCellTextSelection: true,
  ensureDomOrder: true,
  suppressMenuHide: true,
  icons: agGridCspSafeIcons,
  components: {
    agDateInput: AgGridDatePicker,
  },
});

// Legacy export for backward compatibility
export const defaultGridProps = {
  enableCellTextSelection: true,
  ensureDomOrder: true,
  suppressMenuHide: true,
};

