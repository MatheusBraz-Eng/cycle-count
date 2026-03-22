export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Base inicial pronta. A partir daqui, você pode navegar para /count, /recount, /ic e /manager.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a className="rounded-xl bg-slate-900 px-4 py-2 text-white" href="/count?as=admin">
          Ir para Contagem
        </a>
        <a className="rounded-xl border px-4 py-2" href="/recount?as=ic">
          Ir para Recontagem
        </a>
        <a className="rounded-xl border px-4 py-2" href="/ic?as=ic">
          Ir para IC
        </a>
        <a className="rounded-xl border px-4 py-2" href="/manager?as=manager">
          Ir para Manager
        </a>
      </div>
    </main>
  );
}
