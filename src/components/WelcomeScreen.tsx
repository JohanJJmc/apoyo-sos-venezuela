interface WelcomeScreenProps {
  onEnter: () => void;
}

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  return (
    <main className="flex min-h-dvh flex-col bg-white px-7 pb-7 pt-16 text-sos-ink">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <img src="/assets/functional-done.svg" alt="" className="h-[72px] w-[72px]" />
        <h1 className="mt-14 text-[22px] font-extrabold">¡Bienvenido a NEXO!</h1>
        <p className="mt-7 max-w-[360px] text-[17px] font-semibold leading-snug text-black">
          Tu cuenta ya está lista. Desde ahora puedes pedir ayuda, apoyar a otros y ser parte de una red que conecta solidaridad en tiempo real.
        </p>
      </div>

      <button
        type="button"
        onClick={onEnter}
        className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft"
      >
        Entrar
      </button>
    </main>
  );
}
