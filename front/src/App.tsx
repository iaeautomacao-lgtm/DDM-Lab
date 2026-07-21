import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ThemeProvider } from './lib/ThemeContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { Admin } from './pages/Admin';
import { Cases } from './pages/Cases';
import { Dashboard } from './pages/Dashboard';
import { ForgotPassword } from './pages/ForgotPassword';
import { Generator } from './pages/Criar pedido';
import { IAs } from './pages/IAs';
import { ImageGenerator } from './pages/GerarImagem';
import { DDMCreator } from './pages/DDMCreator';
import { Library } from './pages/Library';
import { Login } from './pages/Login';
import { Profile } from './pages/Meu perfil';
import { RHLogin } from './pages/RHLogin';
import { RHPanel } from './pages/RHPanel';
import { Settings } from './pages/Uso responsavel';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-primary">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login principal DDM */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Login exclusivo RH */}
        <Route path="/rh-login" element={<RHLogin />} />

        {/* Painel RH — protegido: requer role 'rh' */}
        <Route element={<ProtectedRoute requireRH />}>
          <Route path="/rh" element={<RHPanel />} />
        </Route>

        {/* Rotas Protegidas - Só entra quem passar pelo filtro de e-mail DDM */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="generator" element={<Generator />} />
            <Route path="cases" element={<Cases />} />
            <Route path="insights" element={<Navigate to="/admin" replace />} />
            <Route path="library" element={<Library />} />
            <Route path="ias" element={<IAs />} />

            {/* Rota de Admin: precisa da flag 'admin' no banco */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="admin" element={<Admin />} />
            </Route>

            <Route path="ddmcreator" element={<DDMCreator />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
