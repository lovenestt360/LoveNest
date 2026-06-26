import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Depois de um novo deploy, o ficheiro principal que o telemóvel ainda tem
// em cache pode apontar para um "chunk" lazy (ex: Index-xxxx.js) que já não
// existe na versão publicada. Isto rebenta como erro de import dinâmico —
// um simples "tentar novamente" não resolve, porque o JS antigo continua
// na memória. Só uma recarga completa (fetch de um novo index.html, que
// aponta para os hashes certos) resolve. Guarda-se 1 tentativa por sessão
// para não entrar em loop infinito se o erro for outra coisa.
const CHUNK_ERROR_PATTERN = /Failed to fetch dynamically imported module|Loading chunk|dynamically imported module/i;
const RELOAD_GUARD_KEY = "ln_chunk_reload_attempted";

function isChunkLoadError(error: Error | null): boolean {
  return !!error && CHUNK_ERROR_PATTERN.test(error.message);
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  // Propriedade de instância (não é state) — só fica true no preciso
  // momento em que ESTA instância decide recarregar. Ao contrário da
  // flag em sessionStorage (que persiste e serviria para identificar
  // "já tentei uma vez"), esta começa sempre false em cada montagem,
  // por isso uma 2ª falha a seguir à recarga já mostra o ecrã normal
  // com o botão, em vez de ficar em branco para sempre.
  private willReload = false;

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });

    if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_GUARD_KEY)) {
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      this.willReload = true;
      window.location.reload();
    }
  }

  private handleRetry = () => {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      // Recarga automática já a caminho — evita mostrar o ecrã vermelho
      // por uma fração de segundo só para desaparecer logo a seguir.
      if (this.willReload) {
        return null;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-red-50/50 rounded-lg border border-red-200 m-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-lg font-bold text-red-700">Ocorreu um erro no ecrã</h2>
          <div className="text-xs text-red-600 bg-red-100 p-2 rounded w-full break-words max-h-48 overflow-auto font-mono">
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </div>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-bold shadow-sm"
            onClick={this.handleRetry}
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
