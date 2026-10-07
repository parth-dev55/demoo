import { diseaseScanStorage, SavedDiseaseScan } from './diseaseScanStorage';

export interface DifferentialDiagnosis {
  disease: string;
  likelihood: 'High' | 'Moderate' | 'Low' | string;
}

export interface DiseaseScanResult {
  isPlantImage: boolean;
  crop: string;
  healthStatus: 'healthy' | 'diseased' | 'pest_damage' | 'nutrient_deficiency' | 'environmental_stress' | 'physical_damage' | 'unknown' | string;
  possibleDisease: string;
  confidence: number; // 0.0 to 1.0
  confidenceLevel: 'High' | 'Moderate' | 'Low' | string;
  severity: 'None' | 'Low' | 'Moderate' | 'High' | 'Severe' | string;
  symptoms: string[];
  reasoning: string[];
  recommendedActions: string[];
  prevention: string[];
  differentialDiagnoses?: DifferentialDiagnosis[];
  needsExpertConfirmation: boolean;
  disclaimer: string;
}

export interface DiseaseScanRequest {
  image: string; // base64 data url or base64 string
  crop?: string;
  location?: string;
  growthStage?: string;
  description?: string;
  language: 'en' | 'hi' | 'mr' | string;
}

export const diseaseDetectionService = {
  /**
   * Validate image file client-side before sending.
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: "Please select an image of the crop or leaf." };
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      return { valid: false, error: "Unsupported image format. Please upload JPG, PNG, or WEBP." };
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      return { valid: false, error: "Image size exceeds 10 MB limit. Please select a smaller photo." };
    }

    return { valid: true };
  },

  /**
   * Resize and compress large image to optimize payload size for AI analysis.
   */
  async processImageForUpload(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error("Invalid image format or corrupted file."));
        img.onload = () => {
          const maxDim = 1280; // Enough resolution for disease symptom detail
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(e.target?.result as string);
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressedDataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * Call backend AI endpoint to perform crop disease scan.
   */
  async analyzeCropDisease(
    request: DiseaseScanRequest,
    userId?: string
  ): Promise<DiseaseScanResult> {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const endpoints = [
      apiBase ? `${apiBase}/api/disease/scan` : '/api/disease/scan',
      '/api/disease-scan'
    ];

    let lastError: Error | null = null;
    let rawResult: any = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        });

        if (response.ok) {
          rawResult = await response.json();
          break;
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!rawResult) {
      throw lastError || new Error("Failed to reach disease scan service.");
    }

    const result: DiseaseScanResult = {
      isPlantImage: rawResult.is_plant_image ?? rawResult.isPlantImage ?? true,
      crop: rawResult.crop || request.crop || 'Crop',
      healthStatus: rawResult.healthStatus || (rawResult.severity === 'None' ? 'healthy' : 'diseased'),
      possibleDisease: rawResult.disease || rawResult.possibleDisease || 'Healthy Plant',
      confidence: rawResult.confidence || 0.85,
      confidenceLevel: rawResult.confidence_level || rawResult.confidenceLevel || 'High',
      severity: rawResult.severity || 'Moderate',
      symptoms: rawResult.symptoms || [],
      reasoning: rawResult.reasoning || [],
      recommendedActions: rawResult.recommendations || rawResult.recommendedActions || [],
      prevention: rawResult.prevention || [],
      differentialDiagnoses: rawResult.differential_diagnoses || rawResult.differentialDiagnoses || [],
      needsExpertConfirmation: rawResult.needs_expert_confirmation ?? rawResult.needsExpertConfirmation ?? true,
      disclaimer: rawResult.disclaimer || 'AI-generated agricultural advisory.'
    };

    // Automatically save valid analysis results to history
    if (userId && result.isPlantImage) {
      const scanHistoryItem: SavedDiseaseScan = {
        id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        createdAt: Date.now(),
        crop: result.crop || request.crop || 'Crop',
        disease: result.possibleDisease || 'Analysis',
        healthStatus: result.healthStatus,
        confidence: result.confidence,
        confidenceLevel: result.confidenceLevel,
        severity: result.severity,
        language: request.language,
        imageUrl: request.image, // Saved in local history
        fullResult: result
      };

      await diseaseScanStorage.saveScan(userId, scanHistoryItem);
    }

    return result;
  }
};
