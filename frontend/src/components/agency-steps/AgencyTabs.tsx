interface Tab {
  id: string;
  label: string;
}

interface AgencyTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function AgencyTabs({ tabs, activeTab, onTabChange }: AgencyTabsProps) {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-6 py-3 rounded-full font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-[#0A2342] text-white shadow-lg'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
