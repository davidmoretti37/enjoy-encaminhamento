import { useSchoolContext } from "@/contexts/SchoolContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Building2, Globe } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

export default function SchoolFilterHeader() {
  const { user } = useAuth();
  const { currentSchool, availableSchools, isLoading, setCurrentSchool } =
    useSchoolContext();
  const [open, setOpen] = useState(false);

  // Only show for affiliate users
  if (user?.role !== "affiliate") return null;

  // Don't render until we have schools data
  if (isLoading) return null;

  const isAllSchoolsMode = currentSchool === null;

  const handleSelect = (value: string | null) => {
    setCurrentSchool(value);
    setOpen(false);
  };

  return (
    <div className="fixed top-4 left-4 z-[110]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_-2px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.16)] hover:scale-105 transition-all duration-200 ring-1 ring-black/[0.04]"
            aria-label="Selecionar escola"
          >
            {isAllSchoolsMode ? (
              <div className="p-1.5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full">
                <Globe className="h-4 w-4 text-white" />
              </div>
            ) : (
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 max-h-[320px] overflow-y-auto p-1.5 rounded-xl shadow-xl border-0 ring-1 ring-black/[0.08]"
          align="start"
          sideOffset={8}
        >
          {/* All Schools Option */}
          <button
            onClick={() => handleSelect(null)}
            className={`w-full py-2.5 px-2.5 rounded-lg cursor-pointer flex items-center gap-2.5 transition-colors ${
              isAllSchoolsMode ? "bg-slate-100" : "hover:bg-slate-50"
            }`}
          >
            <div className="p-1.5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg">
              <Globe className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-700">Todas as Escolas</span>
          </button>

          {availableSchools.length > 0 && (
            <div className="my-1.5 h-px bg-slate-200" />
          )}

          {/* Individual Schools */}
          {availableSchools.map((school) => (
            <button
              key={school.id}
              onClick={() => handleSelect(school.id)}
              className={`w-full py-2 px-2.5 rounded-lg cursor-pointer flex items-center gap-2.5 transition-colors ${
                currentSchool?.id === school.id ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
            >
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                <Building2 className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium text-slate-700">{school.name}</span>
                {school.city && (
                  <span className="text-[11px] text-slate-500">
                    {school.city}
                  </span>
                )}
              </div>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
