export default function NotFound() {
  return (
    <main className="min-h-screen bg-[--bg-base] px-5 py-16 text-center">
      <p className="text-sm uppercase tracking-[0.08em] text-[--text-secondary]">404</p>
      <h1 className="mt-3 text-2xl font-bold text-[--text-primary]">Page not found</h1>
      <p className="mt-2 text-sm text-[--text-secondary]">
        This route does not exist in Spotcoin.
      </p>
    </main>
  );
}
