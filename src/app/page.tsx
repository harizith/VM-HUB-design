import Clock from "@/components/Clock";
import LoginForm from "@/components/LoginForm";

export default function Home() {
  return (
    <div className="login-page-container">
      {/* Left Pane - Branding & Clock */}
      <div className="login-left-pane">
        <div className="left-pane-content">
          <p className="portal-label">DEPARTMENT PORTAL</p>
          <h1 className="brand-title">Period.</h1>
          
          <div className="clock-wrapper">
            <Clock />
          </div>
          
          <div className="bottom-text">
            <p>Welcome to VM-HUB.</p>
            <p>Your academic life, organized.</p>
          </div>
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className="login-right-pane">
        <LoginForm />
      </div>
    </div>
  );
}
