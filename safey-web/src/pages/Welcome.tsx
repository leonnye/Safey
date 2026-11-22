import { useNavigate } from 'react-router-dom';
import hero from '@/assets/welcome-hero.jpg';
import logo from '@/assets/safey-mark-alpha.png';
import { Button } from '@/components/ui';
import { useStore } from '@/store/store';

export function Welcome() {
  const navigate = useNavigate();
  const { startDemo } = useStore();
  return (
    <div className="welcome">
      <div className="welcome-hero">
        <div className="welcome-brand">
          <img src={logo} alt="" />
          Safey
        </div>
        <img src={hero} alt="" />
      </div>
      <div className="welcome-body">
        <h1>
          Smarter money <strong>decisions, brighter tomorrows.</strong>
        </h1>
        <p>A financial companion for irregular income that helps you understand your money, spot risks early and plan your future.</p>
        <Button block onClick={() => navigate('/onboarding')} style={{ marginTop: 12 }}>
          Get Started
        </Button>
        <Button
          variant="ghost"
          block
          onClick={() => {
            startDemo();
            navigate('/home');
          }}
        >
          Explore with sample data
        </Button>
        <p className="hint" style={{ textAlign: 'center' }}>
          No bank login, no PIN, no OTP. Your records stay in this browser.
        </p>
      </div>
    </div>
  );
}
