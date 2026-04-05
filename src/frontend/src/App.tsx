import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import { ThemeProvider } from "./hooks/useTheme";
import { Admin } from "./pages/Admin";
import { Calendario } from "./pages/Calendario";
import { Cantina } from "./pages/Cantina";
import { Escalas } from "./pages/Escalas";
import { Financeiro } from "./pages/Financeiro";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Membros } from "./pages/Membros";
import { Oracao } from "./pages/Oracao";
import { Projetos } from "./pages/Projetos";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isApproved, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !isApproved) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Home />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/membros"
        element={
          <ProtectedRoute>
            <Layout>
              <Membros />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendario"
        element={
          <ProtectedRoute>
            <Layout>
              <Calendario />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/financeiro"
        element={
          <ProtectedRoute>
            <Layout>
              <Financeiro />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cantina"
        element={
          <ProtectedRoute>
            <Layout>
              <Cantina />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos"
        element={
          <ProtectedRoute>
            <Layout>
              <Projetos />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/escalas"
        element={
          <ProtectedRoute>
            <Layout>
              <Escalas />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/oracao"
        element={
          <ProtectedRoute>
            <Layout>
              <Oracao />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout>
              <Admin />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <InternetIdentityProvider>
          <AuthProvider>
            <AppRoutes />
            <Toaster />
          </AuthProvider>
        </InternetIdentityProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
