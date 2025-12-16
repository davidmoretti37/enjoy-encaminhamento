import { useSchoolContext } from "@/contexts/SchoolContext";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export default function SchoolSwitcher() {
  const { user } = useAuth();
  const { currentSchool, availableSchools, isLoading, setCurrentSchool } =
    useSchoolContext();

  // Only show for affiliate (admin)
  const isAdmin = user?.role === "affiliate";
  if (!isAdmin) return null;

  // Don't show if no schools available
  if (!isLoading && availableSchools.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentSchool?.id || ""}
        onValueChange={(value) => setCurrentSchool(value || null)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px] h-8 text-sm">
          <SelectValue placeholder={isLoading ? "Carregando..." : "Selecionar escola"} />
        </SelectTrigger>
        <SelectContent>
          {availableSchools.map((school) => (
            <SelectItem key={school.id} value={school.id}>
              <div className="flex flex-col">
                <span>{school.name}</span>
                {school.city && (
                  <span className="text-xs text-muted-foreground">{school.city}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
