import { getMockUser } from "../../lib/auth";
import { canAccess } from "../../lib/roles";
import { mockCounts, mockPerformance } from "../../lib/utils";

type ManagerPageProps = {
  searchParams?: Promise<{ as?: string }>;
};

export default async function ManagerPage({ searchParams }: ManagerPageProps) {
  const params = (await searchParams) ?? {};
  const user = getMockUser(params.as);

  if (!canAccess(user.role, "/manager")) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold">Acesso negado</h1>
        <p className="mt-2 text-gray-600">
          Esta tela é restrita ao gerente ou admin.
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Desempenho por operador</h1>
        <p className="text-gray-600">
          Usuário mockado: {user.name} | badge {user.badgeId} | perfil {user.role}
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border p-4">
          <p className="text-sm text-gray-500">Operadores monitorados</p>
          <p className="text-3xl font-bold">{mockPerformance.length}</p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="text-sm text-gray-500">Total de contagens</p>
          <p className="text-3xl font-bold">
            {mockPerformance.reduce((sum, item) => sum + item.counts, 0)}
          </p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="text-sm text-gray-500">Divergências</p>
          <p className="text-3xl font-bold">
            {mockPerformance.reduce((sum, item) => sum + item.divergences, 0)}
          </p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="text-sm text-gray-500">Itens com badge visível</p>
          <p className="text-3xl font-bold">
            {mockCounts.filter((x) => x.counterBadge).length}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3">Operador</th>
              <th className="px-4 py-3">Badge</th>
              <th className="px-4 py-3">Contagens</th>
              <th className="px-4 py-3">Divergências</th>
              <th className="px-4 py-3">Acurácia</th>
              <th className="px-4 py-3">Tempo médio</th>
            </tr>
          </thead>
          <tbody>
            {mockPerformance.map((item) => (
              <tr key={item.badgeId} className="border-t">
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.badgeId}</td>
                <td className="px-4 py-3">{item.counts}</td>
                <td className="px-4 py-3">{item.divergences}</td>
                <td className="px-4 py-3">{item.accuracy}%</td>
                <td className="px-4 py-3">{item.averageTimeMinutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

