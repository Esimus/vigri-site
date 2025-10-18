// app/dashboard/page.tsx
import DashboardOverview from '../../components/DashboardOverview';

export default function DashboardPage() {
  // Guard уже на layout; здесь просто рендерим клиентский блок
  return <DashboardOverview />;
}
