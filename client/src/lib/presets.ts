import { apiRequest } from '@/lib/queryClient';
import { KickPreset } from './types';

/**
 * Service for handling presets
 */
export const PresetService = {
  /**
   * Save a preset to the server or local storage
   * @param preset The preset to save
   */
  savePreset: async (preset: KickPreset): Promise<KickPreset> => {
    try {
      // Try to save to server first
      const response = await apiRequest('POST', '/api/presets', preset);
      return await response.json();
    } catch (error) {
      console.warn('Failed to save preset to server, saving locally instead', error);
      
      // Fallback to local storage
      const presets = PresetService.getLocalPresets();
      
      // If preset with same ID exists, replace it
      const existingIndex = presets.findIndex(p => p.id === preset.id);
      if (existingIndex >= 0) {
        presets[existingIndex] = preset;
      } else {
        presets.push(preset);
      }
      
      localStorage.setItem('hardstyle-kick-presets', JSON.stringify(presets));
      return preset;
    }
  },
  
  /**
   * Load all presets from server or local storage
   */
  loadPresets: async (): Promise<KickPreset[]> => {
    try {
      // Try to load from server first
      const response = await apiRequest('GET', '/api/presets');
      const serverPresets = await response.json();
      
      // Merge with local presets
      const localPresets = PresetService.getLocalPresets();
      
      // Combine and deduplicate based on ID
      const allPresets = [...serverPresets];
      
      // Add local presets that don't exist on server
      localPresets.forEach(localPreset => {
        if (!allPresets.some(p => p.id === localPreset.id)) {
          allPresets.push(localPreset);
        }
      });
      
      return allPresets;
    } catch (error) {
      console.warn('Failed to load presets from server, loading locally instead', error);
      return PresetService.getLocalPresets();
    }
  },
  
  /**
   * Delete a preset from server or local storage
   * @param presetId The ID of the preset to delete
   */
  deletePreset: async (presetId: string): Promise<void> => {
    try {
      // Try to delete from server first
      await apiRequest('DELETE', `/api/presets/${presetId}`);
    } catch (error) {
      console.warn('Failed to delete preset from server, deleting locally instead', error);
    }
    
    // Always remove from local storage as well
    const presets = PresetService.getLocalPresets();
    const filteredPresets = presets.filter(p => p.id !== presetId);
    localStorage.setItem('hardstyle-kick-presets', JSON.stringify(filteredPresets));
  },
  
  /**
   * Get presets from local storage
   */
  getLocalPresets: (): KickPreset[] => {
    try {
      const presetsJson = localStorage.getItem('hardstyle-kick-presets');
      return presetsJson ? JSON.parse(presetsJson) : [];
    } catch (error) {
      console.error('Error reading presets from local storage', error);
      return [];
    }
  }
};
