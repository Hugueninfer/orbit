import { Select } from "../components/Select";
import { t, useLocale, setLocale, locales } from "../i18n";
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
  const locale = useLocale();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const localLogin = config.app_mode !== "demo" && !config.oidc_authority;
  async function enter(demo = config.app_mode === "demo") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (demo) {
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
            <Badge tone="teal">{t("Personal Hub")}</Badge>
          </div>
          <div>
            <h1>
              {t("Tudo o que importa,")}
              <br />
              {t("em uma única órbita.")}
            </h1>
            <p>
              {t(
                "Centralize suas tarefas, rotinas de hábitos, finanças e treinos em um só lugar. Mais clareza para o seu dia.",
              )}
            </p>
            <div className="login-features">
              {[
                [CircleCheck, t("Tarefas"), t("Foco & Priorização")],
                [Repeat2, t("Hábitos"), t("Sequências & Consistência")],
                [Wallet, t("Finanças"), t("Contas & Planejamento")],
                [Dumbbell, t("Treinos"), t("Rotinas & Evolução")],
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
            {t("Seu espaço. Seu ritmo. Sua órbita.")}
          </small>
        </section>
        <section className="login-form">
          <label className="field" style={{ marginBottom: 20 }}>
            <span>{t("Idioma")}</span>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {locales.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </label>
          <div className="between">
            <span className="caps teal">{t("● Acesso ao Orbit")}</span>
            <LockKeyhole size={18} className="muted" />
          </div>
          <h1>
            {config.app_mode === "demo"
              ? t("Conheça sua nova órbita")
              : t("Bem-vindo de volta")}
          </h1>
          <p>
            {config.app_mode === "demo"
              ? t(
                  "Experimente o Orbit com dados fictícios. Seu espaço de demonstração é exclusivo e você pode explorar à vontade.",
                )
              : t(
                  "Entre com sua conta para acessar sua central pessoal, no computador ou no celular.",
                )}
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
                    {t("E-mail profissional ou pessoal")}
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
                      placeholder={t("seu@email.com")}
                      disabled={busy}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="login-password">{t("Senha")}</label>
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
                        showPassword ? t("Ocultar senha") : t("Mostrar senha")
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
                ? t("Preparando sua órbita…")
                : config.app_mode === "demo"
                  ? t("Experimentar demonstração")
                  : t("Entrar no Orbit")}
              {!busy && <ArrowRight size={18} />}
            </Button>
          </form>
          {config.app_mode !== "personal" && config.app_mode !== "demo" && (
            <>
              <div className="login-separator">{t("OU CONHEÇA O ORBIT")}</div>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void enter(true)}
              >
                <Sparkles size={18} />
                {t("Experimentar demonstração")}
              </Button>
              <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                {t(
                  "Sem cadastro. Dados fictícios em um espaço exclusivo por 24 horas.",
                )}
              </p>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="login-separator">
            {config.app_mode === "demo"
              ? t("PRONTO PARA EXPLORAR")
              : t("ACESSO PESSOAL")}
          </div>
          <div className="form-help">
            <strong className="teal">
              {config.app_mode === "demo"
                ? t("Uma experiência completa, sem cadastro.")
                : t("Seus dados acompanham você.")}
            </strong>
            <p style={{ marginTop: 8 }}>
              {config.app_mode === "demo"
                ? t(
                    "Crie uma tarefa, acompanhe hábitos, simule uma compra parcelada e registre seu treino. A demonstração expira em 24 horas.",
                  )
                : localLogin
                  ? t(
                      "Sua sessão fica conectada por até 7 dias. Use Sair quando terminar em um dispositivo compartilhado.",
                    )
                  : t(
                      "Você será direcionado ao provedor de identidade para entrar com segurança. Depois, volta automaticamente para o Orbit.",
                    )}
            </p>
          </div>
          <div className="login-footer">
            {config.app_mode === "demo"
              ? t("DADOS FICTÍCIOS · ESPAÇO ISOLADO · SEM COBRANÇA")
              : t("CONEXÃO SEGURA · ACESSO INDIVIDUAL")}
          </div>
        </section>
      </div>
    </main>
  );
}
