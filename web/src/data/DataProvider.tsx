import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useApp } from '@/boot';
import { DataStore } from './store';

const DataContext = createContext<DataStore | null>(null);

/** Owns the shared pollers. Mount once, inside `BootProvider`, above everything that reads data. */
export function DataProvider({ children }: { children: ReactNode }) {
  const { id } = useApp();
  const [store] = useState(() => new DataStore(id));
  useEffect(() => {
    store.connect();
    return () => store.disconnect();
  }, [store]);
  return <DataContext value={store}>{children}</DataContext>;
}

export function useDataStore(): DataStore {
  const store = useContext(DataContext);
  if (!store) throw new Error('useDataStore must be used inside <DataProvider>');
  return store;
}
