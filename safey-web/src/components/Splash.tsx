import logo from '@/assets/safey-mark-alpha.png';

export function Waves() {
  return (
    <svg className="waves" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="wave-a" x1="0" x2="1">
          <stop offset="0%" stopColor="#5E46A8" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#8E71E8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5E46A8" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="wave-b" x1="0" x2="1">
          <stop offset="0%" stopColor="#B9A3FF" stopOpacity="0" />
          <stop offset="60%" stopColor="#B9A3FF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#B9A3FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,220 C200,140 400,300 650,210 C850,140 1000,260 1300,190 L1300,400 L0,400 Z" fill="url(#wave-a)" />
      <path d="M0,260 C250,200 450,330 700,250 C900,190 1050,300 1300,240" fill="none" stroke="url(#wave-b)" strokeWidth="2" />
      <path d="M0,300 C220,250 480,360 720,290 C940,230 1080,330 1300,280 L1300,400 L0,400 Z" fill="#3A2A7A" opacity="0.45" />
    </svg>
  );
}

export function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div className={`splash ${leaving ? 'leaving' : ''}`} aria-label="Safey is loading">
      <img className="splash-logo" src={logo} alt="" />
      <h1>Safey</h1>
      <p>Your money. One step ahead.</p>
      <Waves />
    </div>
  );
}
