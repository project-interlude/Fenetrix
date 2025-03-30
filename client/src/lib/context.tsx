import React, { createContext, useContext, useState } from "react";
import { KickPreset } from "./types";

// Context to store and access UI state like active tab
interface UIContextType {
  activeTab: "punch" | "crunch" | "eq";
  setActiveTab: (tab: "punch" | "crunch" | "eq") => void;
  visualizationType: "waveform" | "spectrum";
  setVisualizationType: (type: "waveform" | "spectrum") => void;
  isPresetMenuOpen: boolean;
  setPresetMenuOpen: (isOpen: boolean) => void;
  isSaveModalOpen: boolean;
  setSaveModalOpen: (isOpen: boolean) => void;
  newPresetName: string;
  setNewPresetName: (name: string) => void;
}

const UIContext = createContext<UIContextType>({
  activeTab: "punch",
  setActiveTab: () => {},
  visualizationType: "waveform",
  setVisualizationType: () => {},
  isPresetMenuOpen: false,
  setPresetMenuOpen: () => {},
  isSaveModalOpen: false,
  setSaveModalOpen: () => {},
  newPresetName: "",
  setNewPresetName: () => {}
});

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<"punch" | "crunch" | "eq">("punch");
  const [visualizationType, setVisualizationType] = useState<"waveform" | "spectrum">("waveform");
  const [isPresetMenuOpen, setPresetMenuOpen] = useState(false);
  const [isSaveModalOpen, setSaveModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  return (
    <UIContext.Provider
      value={{
        activeTab,
        setActiveTab,
        visualizationType,
        setVisualizationType,
        isPresetMenuOpen,
        setPresetMenuOpen,
        isSaveModalOpen,
        setSaveModalOpen,
        newPresetName,
        setNewPresetName
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);

// Context for user presets
interface PresetsContextType {
  userPresets: KickPreset[];
  addPreset: (preset: KickPreset) => void;
  removePreset: (presetId: string) => void;
}

const PresetsContext = createContext<PresetsContextType>({
  userPresets: [],
  addPreset: () => {},
  removePreset: () => {}
});

export const PresetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userPresets, setUserPresets] = useState<KickPreset[]>([]);

  const addPreset = (preset: KickPreset) => {
    setUserPresets(prevPresets => {
      // If preset with same ID exists, replace it
      const exists = prevPresets.some(p => p.id === preset.id);
      
      if (exists) {
        return prevPresets.map(p => p.id === preset.id ? preset : p);
      } else {
        return [...prevPresets, preset];
      }
    });
  };

  const removePreset = (presetId: string) => {
    setUserPresets(prevPresets => prevPresets.filter(p => p.id !== presetId));
  };

  return (
    <PresetsContext.Provider
      value={{
        userPresets,
        addPreset,
        removePreset
      }}
    >
      {children}
    </PresetsContext.Provider>
  );
};

export const usePresets = () => useContext(PresetsContext);
