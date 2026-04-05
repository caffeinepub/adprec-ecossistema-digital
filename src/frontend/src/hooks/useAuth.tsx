import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  isLoading: boolean;
  principalText: string | null;
  requestApproval: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isAdmin: false,
  isApproved: false,
  isLoading: true,
  principalText: null,
  requestApproval: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const principalText = isAuthenticated
    ? identity.getPrincipal().toText()
    : null;

  useEffect(() => {
    if (!actor || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all([
      actor.isCallerAdmin().catch(() => false),
      actor.isCallerApproved().catch(() => false),
    ])
      .then(([admin, approved]) => {
        setIsAdmin(admin);
        setIsApproved(approved);
      })
      .finally(() => setIsLoading(false));
  }, [actor, isAuthenticated]);

  const requestApproval = async () => {
    if (!actor) return;
    await actor.requestApproval();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        isApproved,
        isLoading,
        principalText,
        requestApproval,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
