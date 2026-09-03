import { useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  Repeat2,
  Wallet,
  Dumbbell,
  LockKeyhole,
  Sparkles,
  LoaderCircle,
  Mail,
  Eye,
  EyeOff,
} from "lucide-react";
import { Brand, Badge, Button } from "../components/ui";
import { getOidc, startDemo, startPersonal } from "../api";
import type { Config } from "../types";
export default function Login({
  config,
  onLogin,
}: {
  config: Config;
  onLogin: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const localLogin = config.app_mode === "personal" && !config.oidc_authority;
  async function enter() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (config.app_mode === "demo") {
        await startDemo();
        onLogin();
      } else if (localLogin) {
        await startPersonal(email, password);
        setPassword("");
        onLogin();
      } else await (await getOidc()).signinRedirect();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-box">
        <section className="login-story">
          <div className="orbital-art">
            <i />
          </div>
          <div className="between">
            <Brand />
            <Badge tone="teal">Personal Hub</Badge>
          </div>
          <div>
            <h1>
              Tudo o que importa,
              <br />
              em uma única órbita.
            </h1>
            <p>
              Centralize suas tarefas, rotinas de hábitos, finanças e treinos em
              um só lugar. Mais clareza para o seu dia.
            </p>
            <div className="login-features">
              {[
                [CircleCheck, "Tarefas", "Foco & Priorização"],
                [Repeat2, "Hábitos", "Sequências & Consistência"],
                [Wallet, "Finanças", "Contas & Planejamento"],
                [Dumbbell, "Treinos", "Rotinas & Evolução"],
              ].map(([Icon, title, subtitle]) => {
                const I = Icon as typeof CircleCheck;
                return (
                  <div key={String(title)}>
                    <strong>
                      <I />
                      {String(title)}
                    </strong>
                    <small>{String(subtitle)}</small>
                  </div>
                );
              })}
            </div>
          </div>
          <small className="mono" style={{ marginTop: 28 }}>
            Seu espaço. Seu ritmo. Sua órbita.
          </small>
        </section>
        <section className="login-form">
          <div className="between">
            <span className="caps teal">● Acesso ao Orbit</span>
            <LockKeyhole size={18} className="muted" />
          </div>
          <h1>
            {config.app_mode === "demo"
              ? "Conheça sua nova órbita"
              : "Bem-vindo de volta"}
          </h1>
          <p>
            {config.app_mode === "demo"
              ? "Experimente o Orbit com dados fictícios. Seu espaço de demonstração é exclusivo e você pode explorar à vontade."
              : "Entre com sua conta para acessar sua central pessoal, no computador ou no celular."}
          </p>
          <form
            className="login-credentials"
            onSubmit={(event) => {
              event.preventDefault();
              void enter();
            }}
          >
            {localLogin && (
              <>
                <div className="field">
                  <label htmlFor="login-email">
                    E-mail profissional ou pessoal
                  </label>
                  <div className="login-input">
                    <Mail size={18} aria-hidden="true" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="username"
                      maxLength={254}
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="seu@email.com"
                      disabled={busy}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="login-password">Senha</label>
                  <div className="login-input">
                    <LockKeyhole size={18} aria-hidden="true" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      maxLength={128}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? (
                <LoaderCircle size={18} className="spin" />
              ) : config.app_mode === "demo" ? (
                <Sparkles size={18} />
              ) : (
                <LockKeyhole size={18} />
              )}{" "}
              {busy
                ? "Preparando sua órbita…"
                : config.app_mode === "demo"
                  ? "Experimentar demonstração"
                  : "Entrar no Orbit"}
              {!busy && <ArrowRight size={18} />}
            </Button>
          </form>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="login-separator">
            {config.app_mode === "demo"
              ? "PRONTO PARA EXPLORAR"
              : "ACESSO PESSOAL"}
          </div>
          <div className="form-help">
            <strong className="teal">
              {config.app_mode === "demo"
                ? "Uma experiência completa, sem cadastro."
                : "Seus dados acompanham você."}
            </strong>
            <p style={{ marginTop: 8 }}>
              {config.app_mode === "demo"
                ? "Crie uma tarefa, acompanhe hábitos, simule uma compra parcelada e registre seu treino. A demonstração expira em 24 horas."
                : localLogin
                  ? "Sua sessão fica conectada por até 7 dias. Use Sair quando terminar em um dispositivo compartilhado."
                  : "Você será direcionado ao provedor de identidade para entrar com segurança. Depois, volta automaticamente para o Orbit."}
            </p>
          </div>
          <div className="login-footer">
            {config.app_mode === "demo"
              ? "DADOS FICTÍCIOS · ESPAÇO ISOLADO · SEM COBRANÇA"
              : "CONEXÃO SEGURA · ACESSO INDIVIDUAL"}
          </div>
        </section>
      </div>
    </main>
  );
}
