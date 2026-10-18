import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  Zap,
  Cpu,
  Database,
  Layers,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { UserSession } from '../types';
import './LoginScreen.css';

interface LoginScreenProps {
  onLogin: (session: UserSession) => void;
}

interface DemoAccount {
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: '',
    email: 'demo@graphgenie.ai',
    role: 'Staff SRE & Incident Commander',
    avatarColor: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  },
  {
    name: '',
    email: 'alex.rivera@enterprise.com',
    role: 'Staff SRE • NotificationGateway',
    avatarColor: 'linear-gradient(135deg, #10b981, #06b6d4)',
  },
  {
    name: '',
    email: 'sam.chen@enterprise.com',
    role: 'Lead Architect • AuthService',
    avatarColor: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  },
];

const DEFAULT_DEMO_EMAIL = 'demo@graphgenie.ai';
const DEFAULT_DEMO_PASS = 'demo1234';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<'email' | 'pass' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = (text: string, field: 'email' | 'pass') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleQuickFill = (acc?: DemoAccount) => {
    const targetEmail = acc ? acc.email : DEFAULT_DEMO_EMAIL;
    setEmail(targetEmail);
    setPassword(DEFAULT_DEMO_PASS);
    setError(null);
  };

  const handleExecuteLogin = (loginEmail: string, loginPass: string, accountMeta?: DemoAccount) => {
    if (!loginEmail.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!loginPass.trim()) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      // Find matching demo account or build customized user session
      const matched = accountMeta || DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === loginEmail.toLowerCase());
      const userName = matched?.name || loginEmail.split('@')[0] || 'Enterprise Operator';
      const userRole = matched?.role || 'Knowledge Engineer & Graph Operator';

      const session: UserSession = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: userName.charAt(0).toUpperCase() + userName.slice(1),
        email: loginEmail,
        role: userRole,
        loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      onLogin(session);
      setIsLoading(false);
    }, 450);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteLogin(email, password);
  };

  const handleInstantDemoLogin = (acc?: DemoAccount) => {
    const targetAcc = acc || DEMO_ACCOUNTS[0];
    setEmail(targetAcc.email);
    setPassword(DEFAULT_DEMO_PASS);
    handleExecuteLogin(targetAcc.email, DEFAULT_DEMO_PASS, targetAcc);
  };

  return (
    <div className="login-viewport">
      {/* Dynamic Ambient Background Elements */}
      <div className="login-bg-glow glow-1" />
      <div className="login-bg-glow glow-2" />
      <div className="login-bg-grid" />

      {/* Main Center Container */}
      <div className="login-modal-card">
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-logo-badge">
            <div className="login-logo-icon">
              <Bot size={28} />
              <Sparkles size={14} className="login-sparkle" />
            </div>
          </div>
          <h1 className="login-title">Falkor GraphGenie Enterprise</h1>
          <p className="login-subtitle">
            Autonomous Incident Reasoning & FalkorDB Knowledge Graph Engine
          </p>
          <div className="login-version-pill">
            <span className="live-status-dot" />
            <span>v2.4 Production • Multi-User Workspace</span>
          </div>
        </div>

        {/* DEMO CREDENTIALS BOX (Requested Highlight) */}
        <div className="demo-credentials-banner">
          <div className="demo-banner-top">
            <div className="demo-badge">
              <Zap size={13} />
              <span>DEMO CREDENTIALS</span>
            </div>
            <div className="demo-users-tag">
              <Users size={12} />
              <span>Unlimited Concurrent Users</span>
            </div>
          </div>

          <p className="demo-instruction">

          </p>

          <div className="demo-credential-row">
            <div className="demo-cred-item">
              <span className="demo-cred-label">Demo Email:</span>
              <code className="demo-cred-value">{DEFAULT_DEMO_EMAIL}</code>
              <button
                type="button"
                className="cred-copy-btn"
                onClick={() => handleCopy(DEFAULT_DEMO_EMAIL, 'email')}
                title="Copy demo email"
              >
                {copiedField === 'email' ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
              </button>
            </div>

            <div className="demo-cred-item">
              <span className="demo-cred-label">Password:</span>
              <code className="demo-cred-value">{DEFAULT_DEMO_PASS}</code>
              <button
                type="button"
                className="cred-copy-btn"
                onClick={() => handleCopy(DEFAULT_DEMO_PASS, 'pass')}
                title="Copy demo password"
              >
                {copiedField === 'pass' ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* 1-Click Fast Login Actions */}
          <div className="demo-quick-actions">
            <button
              type="button"
              className="quick-demo-btn primary"
              onClick={() => handleInstantDemoLogin(DEMO_ACCOUNTS[0])}
            >
              <Zap size={14} />
              <span>1-Click Instant Demo Login</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              className="quick-fill-btn"
              onClick={() => handleQuickFill(DEMO_ACCOUNTS[0])}
            >

            </button>
          </div>

          {/* Quick Persona Selectors */}
          <div className="demo-personas-section">
            <span className="demo-personas-label"></span>
            <div className="demo-persona-chips">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  className="demo-persona-chip"
                  onClick={() => handleInstantDemoLogin(acc)}
                  title={`Instant login as ${acc.name} (${acc.role})`}
                >
                  <span className="persona-avatar-dot" style={{ background: acc.avatarColor }} />
                  <span className="persona-chip-name">{acc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Traditional Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error-alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="user-email">
              Enterprise Email
            </label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="user-email"
                type="email"
                className="form-input"
                placeholder="name@enterprise.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="user-password">
                Password
              </label>
              <button
                type="button"
                className="form-link-btn"
                onClick={() => handleQuickFill()}
              >
                Use Demo Password
              </button>
            </div>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="user-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-spinner-content">
                <span className="spinner-icon" />
                <span>Authenticating Session...</span>
              </span>
            ) : (
              <>
                <ShieldCheck size={17} />
                <span>Sign In to Workspace</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Feature Badges Footer */}
        <div className="login-footer-badges">
          <div className="footer-feature-item">
            <Database size={13} />
            <span>FalkorDB Powered</span>
          </div>
          <div className="footer-feature-divider">•</div>
          <div className="footer-feature-item">
            <Cpu size={13} />
            <span>Multi-Agent Swarm</span>
          </div>
          <div className="footer-feature-divider">•</div>
          <div className="footer-feature-item">
            <Layers size={13} />
            <span>Sub-ms Offline GraphRAG</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
