import { type Message } from './i18n';
import { createContext, useContext } from 'react';
import { type Data, type Entity } from './domain';
export interface AppContext {
  data: Data;
  revision: number;
  update: (
    fn: (data: Data) => Data,
    options?: { backup?: boolean },
  ) => Promise<void>;
  save: (entity: Entity) => Promise<void>;
  remove: (id: string, expectedUpdatedAt?: string) => Promise<void>;
  toast: (message: Message) => void;
}
export const Context = createContext<AppContext | null>(null);
export const useApp = () => useContext(Context)!;
