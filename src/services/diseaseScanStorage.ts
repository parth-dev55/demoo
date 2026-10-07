export interface SavedDiseaseScan {
  id: string;
  userId: string;
  createdAt: number;
  crop: string;
  disease: string;
  healthStatus: string;
  confidence: number;
  confidenceLevel: string;
  severity: string;
  language: string;
  imageUrl?: string; // Thumbnail or compressed image preview
  fullResult: any; // Complete structured result
}

const getScansKey = (userId: string) => `agrigpt_disease_scans_${userId}`;

export const diseaseScanStorage = {
  /**
   * Get all saved disease scans for a user, sorted by date DESC.
   */
  async getScans(userId: string): Promise<SavedDiseaseScan[]> {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(getScansKey(userId));
      if (!raw) return [];
      const scans: SavedDiseaseScan[] = JSON.parse(raw);
      return scans.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error('Failed to load disease scan history:', e);
      return [];
    }
  },

  /**
   * Save a scan result to user's scan history.
   */
  async saveScan(userId: string, scan: SavedDiseaseScan): Promise<void> {
    if (!userId || !scan.id) return;
    try {
      const scans = await this.getScans(userId);
      // Limit history to 30 items to save localStorage space
      const filtered = scans.filter(s => s.id !== scan.id);
      const updated = [scan, ...filtered].slice(0, 30);
      localStorage.setItem(getScansKey(userId), JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save disease scan:', e);
    }
  },

  /**
   * Delete a scan from history.
   */
  async deleteScan(userId: string, scanId: string): Promise<void> {
    if (!userId || !scanId) return;
    try {
      const scans = await this.getScans(userId);
      const filtered = scans.filter(s => s.id !== scanId);
      localStorage.setItem(getScansKey(userId), JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete disease scan:', e);
    }
  },

  /**
   * Clear all scan history for user.
   */
  async clearHistory(userId: string): Promise<void> {
    if (!userId) return;
    try {
      localStorage.removeItem(getScansKey(userId));
    } catch (e) {
      console.error('Failed to clear disease scan history:', e);
    }
  }
};
