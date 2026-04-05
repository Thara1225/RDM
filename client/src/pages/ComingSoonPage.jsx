export default function ComingSoonPage({ title }) {
  return (
    <div className="flex h-96 items-center justify-center rounded-xl bg-white shadow">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-600">Coming soon...</p>
      </div>
    </div>
  );
}
