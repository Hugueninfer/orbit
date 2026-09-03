import { lazy, Suspense, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  CircleCheck,
  Repeat2,
  Wallet,
  Dumbbell,
  Cable,
  Settings as SettingsIcon,
  Search,
  Plus,
  ArrowRight,
  UserRound,
} from "lucide-react";
import { getConfig, getOidc, restoreAuth, setToken, useApi } from "./api";
import type { Config, Dashboard as DashboardData } from "./types";
import {
  Badge,
  Brand,
  Button,
  Drawer,
  ErrorState,
  Loading,
} from "./components/ui";
import Login from "./pages/Login";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Habits = lazy(() => import("./pages/Habits"));
const Finance = lazy(() => import("./pages/Finance"));
const Workouts = lazy(() => import("./pages/Workouts"));
const WorkoutSession = lazy(() => import("./pages/WorkoutSession"));
const Settings = lazy(() => import("./pages/Settings"));
const Integrations = lazy(() =>
  import("./pages/Settings").then((m) => ({ default: m.Integrations })),
);
const nav = [
  { to: "/", label: "Visão geral", mobile: "Início", icon: LayoutDashboard },
  { to: "/tarefas", label: "Tarefas", mobile: "Tarefas", icon: CircleCheck },
  { to: "/habitos", label: "Hábitos", mobile: "Hábitos", icon: Repeat2 },
  { to: "/financas", label: "Finanças", mobile: "Finanças", icon: Wallet },
  { to: "/treinos", label: "Treinos", mobile: "Treinos", icon: Dumbbell },
];
let callbackPromise:
  | ReturnType<Awaited<ReturnType<typeof getOidc>>["signinRedirectCallback"]>
  | undefined;
export default function App() {
  const [config, setConfig] = useState<Config>();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [error, setError] = useState<Error>();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const cfg = await getConfig();
        if (mounted) setConfig(cfg);
        if (location.pathname === "/auth/callback") {
          const manager = await getOidc();
          callbackPromise ??= manager.signinRedirectCallback();
          const user = await callbackPromise;
          setToken(user.access_token);
          if (mounted) {
            setAuth(true);
            navigate("/", { replace: true });
          }
        } else {
          const restored = await restoreAuth();
          if (mounted) setAuth(restored);
        }
      } catch (e) {
        if (mounted) setError(e as Error);
      }
    }
    void init();
    const expire = () => setAuth(false);
    window.addEventListener("orbit:unauthorized", expire);
    return () => {
      mounted = false;
      window.removeEventListener("orbit:unauthorized", expire);
    };
  }, []);
  if (error)
    return (
      <main className="login-page">
        <ErrorState error={error} retry={() => window.location.reload()} />
      </main>
    );
  if (!config || auth === null)
    return (
      <main className="login-page">
        <Loading />
      </main>
    );
  if (!auth)
    return (
      <Login
        config={config}
        onLogin={() => {
          setAuth(true);
          navigate("/");
        }}
      />
    );
  return <Shell config={config} />;
}
function Shell({ config }: { config: Config }) {
  const location = useLocation();
  const d = useApi<DashboardData>("/dashboard");
  const [quick, setQuick] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const title = location.pathname.startsWith("/treinos/sessao")
    ? "Treino em andamento"
    : (nav.find((n) => n.to === location.pathname)?.label ??
      (location.pathname === "/configuracoes"
        ? "Configurações"
        : location.pathname === "/integracoes"
          ? "Integrações"
          : "Orbit"));
  useEffect(() => {
    document.title = `${title} · Orbit`;
    window.scrollTo({ top: 0 });
  }, [title]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const name = d.data?.profile.name ?? "Minha conta";
  const date = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: d.data?.profile.timezone ?? "America/Sao_Paulo",
  }).format(new Date());
  return (
    <>
      <a className="sr-only" href="#content">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Brand />
        <Button onClick={() => setQuick(true)}>
          <Plus size={18} />
          Adicionar
        </Button>
        <nav aria-label="Navegação principal">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              end={n.to === "/"}
              to={n.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <n.icon size={22} />
              <span>{n.label}</span>
              {n.to === "/tarefas" && d.data && (
                <Badge>
                  {
                    d.data.tasks.filter(
                      (t) => t.status !== "done" && t.status !== "cancelled",
                    ).length
                  }
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink
            to="/integracoes"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Cable size={20} />
            Telegram Áudio
          </NavLink>
          <NavLink
            to="/configuracoes"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <SettingsIcon size={20} />
            Configurações
          </NavLink>
          <Link to="/configuracoes" className="user-link">
            <span className="avatar">
              {name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{name}</strong>
              <small>
                {config.app_mode === "demo"
                  ? "Demonstração"
                  : "Central pessoal"}
              </small>
            </div>
          </Link>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p>{date.charAt(0).toUpperCase() + date.slice(1)}</p>
          </div>
          <button
            className="search"
            onClick={() => setSearchOpen(true)}
            style={{ color: "var(--muted)", textAlign: "left" }}
          >
            <Search size={16} />
            <span style={{ flex: 1, fontSize: 12 }}>
              Pesquisar na sua órbita…
            </span>
            <kbd>⌘K</kbd>
          </button>
          <div className="actions">
            <Link
              className="icon-button"
              to="/configuracoes"
              aria-label="Minha conta"
            >
              <UserRound size={20} />
            </Link>
            <Button variant="primary" onClick={() => setQuick(true)}>
              <Plus size={18} />
              <span>Adicionar</span>
            </Button>
          </div>
        </header>
        {config.app_mode === "demo" && (
          <div className="demo-banner">
            Demonstração · seus dados fictícios ficam neste espaço por 24 horas.
            <Link
              to="/configuracoes"
              style={{ marginLeft: 7, textDecoration: "underline" }}
            >
              Gerenciar
            </Link>
          </div>
        )}
        <main id="content">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tarefas" element={<Tasks />} />
              <Route path="/habitos" element={<Habits />} />
              <Route path="/financas" element={<Finance />} />
              <Route path="/treinos" element={<Workouts />} />
              <Route path="/treinos/sessao/:id" element={<WorkoutSession />} />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="/integracoes" element={<Integrations />} />
              <Route
                path="*"
                element={
                  <div className="page not-found">
                    <strong>404</strong>
                    <h1>Fora de órbita por um instante.</h1>
                    <p className="muted">
                      Esta página não foi encontrada. Sua central continua no
                      mesmo lugar.
                    </p>
                    <Link className="button primary" to="/">
                      Voltar à visão geral
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação mobile">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            end={n.to === "/"}
            to={n.to}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <n.icon />
            <span>{n.mobile}</span>
          </NavLink>
        ))}
      </nav>
      <Drawer
        title="O que vamos organizar?"
        description="Um novo passo na sua órbita"
        open={quick}
        onClose={() => setQuick(false)}
      >
        <div className="search-results">
          {[
            {
              to: "/tarefas?new=1",
              icon: CircleCheck,
              title: "Nova tarefa",
              text: "Tire uma ideia da cabeça",
            },
            {
              to: "/habitos?new=1",
              icon: Repeat2,
              title: "Novo hábito",
              text: "Construa sua consistência",
            },
            {
              to: "/financas?new=1",
              icon: Wallet,
              title: "Nova transação",
              text: "Registre uma receita ou despesa",
            },
            {
              to: "/treinos?new=1",
              icon: Dumbbell,
              title: "Nova rotina",
              text: "Prepare seu próximo treino",
            },
          ].map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setQuick(false)}>
              <span className="icon-box">
                <item.icon size={22} />
              </span>
              <div className="row-content">
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </div>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      </Drawer>
      <Drawer
        title="Pesquisar na sua órbita"
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      >
        <label className="search" style={{ marginBottom: 24 }}>
          <Search size={17} />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tarefas, hábitos, páginas…"
            aria-label="Pesquisa global"
          />
        </label>
        <div className="search-results">
          {[
            ...nav.map((n) => ({ id: n.to, title: n.label, to: n.to })),
            ...(d.data?.tasks ?? []).map((t) => ({
              id: t.id,
              title: t.title,
              to: "/tarefas",
            })),
            ...(d.data?.habits ?? []).map((h) => ({
              id: h.id,
              title: h.name,
              to: "/habitos",
            })),
          ]
            .filter((x) => x.title.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 15)
            .map((x) => (
              <Link key={x.id} to={x.to} onClick={() => setSearchOpen(false)}>
                <Search size={16} className="teal" />
                {x.title}
                <ArrowRight size={15} style={{ marginLeft: "auto" }} />
              </Link>
            ))}
        </div>
      </Drawer>
    </>
  );
}
