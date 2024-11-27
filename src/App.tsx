import { AuthProvider } from './contexts/AuthContext';
import { ToolProvider } from './contexts/ToolContext';
import { AppContent } from './AppContent';

export default function App() {
    return (
        <>
        <AuthProvider>
            <ToolProvider>
                <AppContent />
            </ToolProvider>
        </AuthProvider>
        </>
    );
}
