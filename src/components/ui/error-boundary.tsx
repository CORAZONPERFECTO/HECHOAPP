
import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="w-full min-h-[200px] flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-red-700 mb-2">Algo salió mal</h3>
                    <p className="text-sm text-red-600 text-center max-w-md">
                        Ha ocurrido un error al cargar este componente.
                        <br />
                        <span className="text-xs opacity-75 mt-2 block font-mono bg-red-100 p-2 rounded">
                            {this.state.error?.message}
                        </span>
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
