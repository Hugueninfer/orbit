import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Plus,
  Check,
  AlertTriangle,
  RefreshCw,
  Orbit as OrbitIcon,
  Inbox,
  LoaderCircle,
} from "lucide-react";
export function Button({
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export const AddButton = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) => (
  <Button variant="primary" onClick={onClick}>
    <Plus size={17} />
    {children}
  </Button>
);
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <OrbitIcon size={26} />
        <i />
      </span>
      <div>
        <strong>Orbit</strong>
        <span className="brand-caption">Personal Operations Hub</span>
      </div>
    </div>
  );
}
export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function CardTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card-title">
      <h2>{children}</h2>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Drawer({
  title,
  description,
  children,
  open,
  onClose,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className="drawer"
          aria-describedby={description ? "drawer-desc" : undefined}
        >
          <div className="drawer-handle" />
          <header>
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && (
                <Dialog.Description id="drawer-desc">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="icon-button" aria-label="Fechar">
              <X size={20} />
            </Dialog.Close>
          </header>
          <div className="drawer-body">{children}</div>
          {footer && <footer>{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Confirm({
  open,
  title,
  children,
  onClose,
  onConfirm,
  pending = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="confirm">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{children}</Dialog.Description>
          <div className="actions">
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="danger" disabled={pending} onClick={onConfirm}>
              {pending ? "Aguarde…" : "Confirmar"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({
  title = "Tudo em ordem por aqui",
  description = "Adicione seu primeiro registro para começar.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-orbit">
        <Inbox size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      Carregando sua órbita…
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <AlertTriangle />
      <h3>Não foi possível carregar</h3>
      <p>{error.message}</p>
      {retry && (
        <Button onClick={retry}>
          <RefreshCw size={16} />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function Progress({
  value,
  tone = "teal",
}: {
  value: number;
  tone?: string;
}) {
  return (
    <div
      className={`progress ${tone}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function CheckButton({
  checked,
  onClick,
  label,
  disabled = false,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={`check-button ${checked ? "checked" : ""}`}
      aria-label={label}
      aria-pressed={checked}
      disabled={disabled}
      onClick={onClick}
    >
      {checked && <Check size={17} />}
    </button>
  );
}
export function Stat({
  label,
  value,
  icon,
  children,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="stat">
      <div className="stat-label">
        <span>{label}</span>
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      {children}
    </Card>
  );
}
const ToastContext = createContext<(message: string, error?: boolean) => void>(
  () => {},
);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  function show(message: string, error = false) {
    setToast({ message, error });
    window.setTimeout(
      () =>
        setToast((current) => (current?.message === message ? null : current)),
      5000,
    );
  }
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <AlertTriangle size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Dispensar"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
