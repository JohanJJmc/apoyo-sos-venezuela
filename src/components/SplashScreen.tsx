export function SplashScreen() {
  return (
    <main className="sos-gradient flex min-h-dvh flex-col items-center justify-center px-8 text-white">
      <img src="/assets/nexo-text.svg" alt="NEXO" className="h-auto w-[126px]" />
      <p className="mt-7 flex items-baseline text-[16px] font-extrabold" aria-label="Cargando">
        <span>Cargando</span>
        <span className="ml-1 inline-flex w-5 justify-start">
          <span className="sos-loading-dot">.</span>
          <span className="sos-loading-dot">.</span>
          <span className="sos-loading-dot">.</span>
        </span>
      </p>
    </main>
  );
}
