import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type loginContextType = {
  id: string,
  setId: (id: string) => void,
  token: string,
  setToken: (token: string) => void,
}

const LoginContext = createContext<loginContextType|undefined>(undefined);

type loginProviderProps = {
  children: ReactNode,
}

export const LoginProvider: React.FC<loginProviderProps> = ({ children }) => {
  const [id, setId] = useState("");
  const [token, setToken] = useState("");

  const contextValue:loginContextType = {
    id,
    setId,
    token,
    setToken,
  }

  return <LoginContext.Provider value={contextValue}>{children}</LoginContext.Provider>;
}

export const useLogin = (): loginContextType => {
  const context = useContext(LoginContext);
  if (!context) {
    throw new Error("useLogin must be used within a LoginProvider");
  }
  return context;
}