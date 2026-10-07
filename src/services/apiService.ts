/**
 * AgriGPT Frontend API Service Layer
 * Centralized REST client connecting the React UI to the FastAPI backend.
 * Uses VITE_API_BASE_URL when defined (e.g. http://localhost:8000), falling back to relative paths.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const apiService = {
  /**
   * Health verification
   */
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      return await res.json();
    } catch (e) {
      return { status: 'offline', error: String(e) };
    }
  },

  /**
   * Fetch all registered farms
   */
  async getFarms(userId?: string) {
    try {
      const url = userId ? `${API_BASE}/api/farms?user_id=${encodeURIComponent(userId)}` : `${API_BASE}/api/farms`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch farms from FastAPI backend:', e);
      return [];
    }
  },

  /**
   * Fetch complete decision-support dashboard for a farm
   */
  async getDashboard(farmId: string = 'farm-demo-01') {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/${farmId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch dashboard from backend, using client fallback:', e);
      return null;
    }
  },

  /**
   * Fetch analytics metrics for a farm
   */
  async getAnalytics(farmId: string = 'farm-demo-01') {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/${farmId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch analytics from backend:', e);
      return null;
    }
  },

  /**
   * Fetch field recommendations
   */
  async getRecommendations(fieldId: string = 'field-demo-01') {
    try {
      const res = await fetch(`${API_BASE}/api/fields/${fieldId}/recommendations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch recommendations:', e);
      return [];
    }
  },

  /**
   * Fetch field early warnings
   */
  async getEarlyWarnings(fieldId: string = 'field-demo-01') {
    try {
      const res = await fetch(`${API_BASE}/api/fields/${fieldId}/early-warnings`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch early warnings:', e);
      return [];
    }
  },

  /**
   * Fetch field predictive stress risks
   */
  async getPredictions(fieldId: string = 'field-demo-01') {
    try {
      const res = await fetch(`${API_BASE}/api/fields/${fieldId}/predictions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch predictions:', e);
      return [];
    }
  },

  /**
   * Fetch real-time weather
   */
  async getWeather(location: string = 'Nashik') {
    try {
      const res = await fetch(`${API_BASE}/api/weather?location=${encodeURIComponent(location)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch weather from backend:', e);
      return null;
    }
  },

  /**
   * AI Crop Disease Scan
   */
  async scanDisease(payload: { image: string; crop?: string; description?: string; location?: string }) {
    const url = `${API_BASE}/api/disease/scan`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Server responded with ${res.status}`);
    }
    return await res.json();
  }
};
