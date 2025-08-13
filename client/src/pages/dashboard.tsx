import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ActivityPanel from "@/components/layout/activity-panel";
import KPICards from "@/components/dashboard/kpi-cards";
import WorkQueues from "@/components/dashboard/work-queues";

export default function Dashboard() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ["/api/kpis"],
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6" data-testid="dashboard-main">
            <div className="max-w-7xl mx-auto">
              {/* Page Title */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
                <p className="text-gray-600">Aperçu des éléments nécessitant votre attention</p>
              </div>

              {/* KPI Cards */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <KPICards kpis={kpis} />
              )}

              {/* Work Queues */}
              <WorkQueues />
            </div>
          </main>

          <ActivityPanel />
        </div>
      </div>
    </div>
  );
}
