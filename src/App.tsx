import Canvas from './canvas/Canvas';
import { AuthProvider } from './contexts/AuthContext';
import { ToolProvider } from './contexts/ToolContext';

export default function App() {
    return (
        <>
        <AuthProvider>
            <ToolProvider>
                <Canvas/>
            </ToolProvider>
        </AuthProvider>
        </>
    );
}
