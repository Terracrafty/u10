import { createContext } from "react";

type loginContextType = {
  id: string,
  token: string,
}

export const LoginContext = createContext<loginContextType|undefined>(undefined);

