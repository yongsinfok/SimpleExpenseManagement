import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full border border-red-200">
                        <h1 className="text-xl font-bold text-red-600 mb-4">应用发生错误</h1>
                        <div className="bg-red-50 p-4 rounded-md mb-4 overflow-auto max-h-60">
                            <p className="font-mono text-sm text-red-800 whitespace-pre-wrap">
                                {this.state.error?.toString()}
                            </p>
                        </div>
                        {this.state.errorInfo && (
                            <details className="mb-4">
                                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                                    查看堆栈详情
                                </summary>
                                <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40 bg-gray-100 p-2 rounded">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                        >
                            刷新页面
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
