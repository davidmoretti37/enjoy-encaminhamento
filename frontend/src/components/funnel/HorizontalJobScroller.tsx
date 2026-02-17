import { motion } from "framer-motion";
import { Plus, Briefcase } from "lucide-react";

interface Job {
  id: string;
  label: string;
  sublabel?: string;
}

interface HorizontalJobScrollerProps {
  jobs: Job[];
  selectedJobId?: string;
  onJobSelect?: (jobId: string) => void;
  onAddJob?: () => void;
}

export default function HorizontalJobScroller({
  jobs,
  selectedJobId,
  onJobSelect,
  onAddJob,
}: HorizontalJobScrollerProps) {
  return (
    <div className="relative">
      {/* Scrollable Container - Compact for header */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {/* Job Cards - Compact Minimal Design */}
        {jobs.map((job) => {
          const isSelected = job.id === selectedJobId;

          return (
            <motion.button
              key={job.id}
              onClick={() => onJobSelect?.(job.id)}
              className={`
                relative shrink-0 px-3 py-2 rounded-lg border-2 transition-all
                min-w-[180px] max-w-[220px]
                ${isSelected
                  ? 'border-[#FF6B35] bg-[#FF6B35]/5'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={isSelected ? {
                boxShadow: '0 2px 8px rgba(255, 107, 53, 0.15)'
              } : undefined}
            >
              <div className="flex items-center gap-2">
                {/* Icon */}
                <div className={`
                  w-7 h-7 rounded-md flex items-center justify-center shrink-0
                  ${isSelected ? 'bg-[#FF6B35]/20' : 'bg-slate-100'}
                `}>
                  <Briefcase className={`w-4 h-4 ${isSelected ? 'text-[#FF6B35]' : 'text-slate-600'}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <h4 className={`
                    font-semibold text-sm truncate
                    ${isSelected ? 'text-[#0A2342]' : 'text-slate-700'}
                  `}>
                    {job.label}
                  </h4>
                  {job.sublabel && (
                    <span className={`
                      text-[10px] inline-block font-medium
                      ${isSelected ? 'text-[#FF6B35]' : 'text-slate-500'}
                    `}>
                      {job.sublabel}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}

        {/* Add Job Button - Compact Minimal Design */}
        {onAddJob && (
          <motion.button
            onClick={onAddJob}
            className="
              shrink-0 px-3 py-2 rounded-lg border-2 border-dashed border-slate-300
              min-w-[120px] bg-white hover:border-[#0A2342] hover:bg-slate-50
              transition-all
            "
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#0A2342] flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">
                Nova Vaga
              </span>
            </div>
          </motion.button>
        )}
      </div>

      {/* Custom scrollbar styling */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
