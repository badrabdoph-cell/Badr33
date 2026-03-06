import { cn } from "@/lib/utils";
import { reportGlobalError } from "@/lib/globalError";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    const details =
      typeof info?.componentStack === "string" ? info.componentStack : undefined;
    reportGlobalError(error, "react-render", details);
  }

  render() {
    if (this.state.hasError) {
      const errorName = this.state.error?.name ?? "Error";
      const errorMessage = this.state.error?.message ?? "Unknown error";
      const errorStack = this.state.error?.stack ?? "";
      const errorDetails = `${errorName}: ${errorMessage}${errorStack ? `\n${errorStack}` : ""}`;

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">حدث خطأ غير متوقع.</h2>

            <div className="w-full rounded bg-muted p-4 mb-4">
              <p className="text-sm font-semibold text-foreground">تفاصيل الخطأ:</p>
              <p className="text-sm text-muted-foreground mt-2">
                {errorName}: {errorMessage}
              </p>
            </div>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {errorStack}
              </pre>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(errorDetails);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-muted text-foreground border border-white/10",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                نسخ تفاصيل الخطأ
              </button>
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                إعادة تحميل الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
