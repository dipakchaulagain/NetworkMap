import { createContext, useContext } from 'react';

export const MapModeContext = createContext({ mode: 'edit', nodes: [] });
export const useMapMode = () => useContext(MapModeContext);
