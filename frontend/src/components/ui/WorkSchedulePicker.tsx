import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DAYS = [
  { key: "Seg", label: "S" },
  { key: "Ter", label: "T" },
  { key: "Qua", label: "Q" },
  { key: "Qui", label: "Q" },
  { key: "Sex", label: "S" },
  { key: "Sab", label: "S" },
  { key: "Dom", label: "D" },
];

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00",
];

interface WorkSchedulePickerProps {
  value: string;
  onChange: (value: string) => void;
}

function parseSchedule(value: string): { selectedDays: Set<string>; startTime: string; endTime: string } {
  if (!value) return { selectedDays: new Set(), startTime: "", endTime: "" };

  // Parse days from the string
  const selectedDays = new Set<string>();
  const dayKeys = DAYS.map(d => d.key);
  for (const key of dayKeys) {
    if (value.includes(key)) {
      selectedDays.add(key);
    }
  }

  // Try "HH:MM as HH:MM" first
  const twoTimeMatch = value.match(/(\d{2}:\d{2})\s*[aà]s?\s*(\d{2}:\d{2})/);
  if (twoTimeMatch) {
    return { selectedDays, startTime: twoTimeMatch[1], endTime: twoTimeMatch[2] };
  }

  // Fall back to finding individual times separated by " | "
  const pipeMatch = value.match(/(\d{2}:\d{2})\s*\|\s*(\d{2}:\d{2})/);
  if (pipeMatch) {
    return { selectedDays, startTime: pipeMatch[1], endTime: pipeMatch[2] };
  }

  // Find all HH:MM occurrences that are NOT part of a day key
  const allTimes = Array.from(value.matchAll(/(?<!\w)(\d{2}:\d{2})(?!\w)/g)).map(m => m[1]);
  const startTime = allTimes[0] || "";
  const endTime = allTimes[1] || "";

  return { selectedDays, startTime, endTime };
}

function composeSchedule(selectedDays: Set<string>, startTime: string, endTime: string): string {
  const orderedDays = DAYS.filter(d => selectedDays.has(d.key)).map(d => d.key);
  const parts: string[] = [];
  if (orderedDays.length > 0) parts.push(orderedDays.join(", "));
  if (startTime && endTime) parts.push(`${startTime} as ${endTime}`);
  else if (startTime) parts.push(`${startTime} | `);
  else if (endTime) parts.push(` | ${endTime}`);
  return parts.join(", ");
}

export function WorkSchedulePicker({ value, onChange }: WorkSchedulePickerProps) {
  const parsed = useMemo(() => parseSchedule(value), [value]);

  const toggleDay = (dayKey: string) => {
    const next = new Set(parsed.selectedDays);
    if (next.has(dayKey)) {
      next.delete(dayKey);
    } else {
      next.add(dayKey);
    }
    onChange(composeSchedule(next, parsed.startTime, parsed.endTime));
  };

  const handleTimeChange = (field: "startTime" | "endTime", newVal: string) => {
    const updated = { ...parsed, [field]: newVal };
    onChange(composeSchedule(parsed.selectedDays, updated.startTime, updated.endTime));
  };

  return (
    <div className="space-y-2">
      {/* Day toggles */}
      <div className="flex gap-1">
        {DAYS.map((day, i) => {
          const isSelected = parsed.selectedDays.has(day.key);
          return (
            <button
              key={day.key + i}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={cn(
                "flex-1 h-8 rounded-md text-xs font-medium transition-colors border",
                isSelected
                  ? "bg-[#0A2342] text-white border-[#0A2342]"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              )}
              title={day.key}
            >
              {day.key}
            </button>
          );
        })}
      </div>

      {/* Time selects */}
      <div className="flex gap-2">
        <Select value={parsed.startTime} onValueChange={(v) => handleTimeChange("startTime", v)}>
          <SelectTrigger className="h-9 text-sm flex-1">
            <SelectValue placeholder="Inicio" />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="self-center text-sm text-slate-400">as</span>

        <Select value={parsed.endTime} onValueChange={(v) => handleTimeChange("endTime", v)}>
          <SelectTrigger className="h-9 text-sm flex-1">
            <SelectValue placeholder="Fim" />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
