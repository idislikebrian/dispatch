export const metadata = {
  title: 'Dispatch',
  description: 'AI-native dispatch system',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <nav className="nav">
          <a href="/tasks" className="nav-link">Tasks</a>
          <a href="/content" className="nav-link">Content</a>
          <a href="/memory" className="nav-link">Memory</a>
          <a href="/team" className="nav-link">Team</a>
          <a href="/office" className="nav-link">Office</a>
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
