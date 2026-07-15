
interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unlockedCluesCount: number;
  isLauncher?: boolean;
}

export default function Sidebar({ activeTab, onTabChange, unlockedCluesCount, isLauncher = false }: SidebarProps) {
  const tabs = isLauncher
    ? [
        { id: 'menu', label: 'HEADQUARTERS', icon: '🏢' },
        { id: 'archives', label: 'CABINET', icon: '🗄️' },
        { id: 'leaderboard', label: 'TOP RATED', icon: '🌟' },
        { id: 'profile', label: 'PROFILE', icon: '🕵️' },
        { id: 'settings', label: 'SETTINGS', icon: '⚙️' }
      ]
    : [
        { id: 'office', label: 'OFFICE', icon: '🏢' },
        { id: 'clues', label: `DOSSIER (${unlockedCluesCount})`, icon: '📜' },
        { id: 'forensics', label: 'FORENSICS', icon: '🧬' },
        { id: 'profile', label: 'PROFILE', icon: '🕵️' },
        { id: 'leaderboard', label: 'TOP RATED', icon: '🌟' },
        { id: 'archives', label: 'ARCHIVES', icon: '📁' }
      ];

  return (
    <div className="sidebar-hud">
      <div className="sidebar-logo font-mono text-cyan">
        {isLauncher ? 'CRIMEGUESS' : 'D.DAILY'}
      </div>
      <div className="sidebar-menu">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-item font-mono ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="sidebar-item-icon">{tab.icon}</span>
            <span className="sidebar-item-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
