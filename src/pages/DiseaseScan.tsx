import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, RefreshCw, X, Search, AlertTriangle, CheckCircle2, 
  Info, Sparkles, MessageSquare, ShieldAlert, FileText, ChevronRight, 
  Trash2, History, ZoomIn, ArrowLeft, Activity, Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { 
  diseaseDetectionService, 
  DiseaseScanResult 
} from '../services/diseaseDetectionService';
import { 
  diseaseScanStorage, 
  SavedDiseaseScan 
} from '../services/diseaseScanStorage';

const CROP_OPTIONS = [
  "Tomato", "Potato", "Wheat", "Rice", "Cotton", 
  "Onion", "Soybean", "Chilli", "Grapes", "Sugarcane", "Other"
];

const STAGE_OPTIONS = [
  "Seedling", "Vegetative", "Flowering", "Fruiting", "Harvesting"
];

export function DiseaseScan() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { sendMessage } = useChat();
  const navigate = useNavigate();

  // Input states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [growthStage, setGrowthStage] = useState<string>('');
  const [locationText, setLocationText] = useState<string>('Nashik, Maharashtra');
  const [symptomDescription, setSymptomDescription] = useState<string>('');

  // UI Flow & Camera states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<DiseaseScanResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<SavedDiseaseScan[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SavedDiseaseScan | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount or user change
  useEffect(() => {
    if (user?.id) {
      diseaseScanStorage.getScans(user.id).then(setHistoryItems);
    }
  }, [user?.id]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Stop camera stream safely
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start native device camera stream
  const startCamera = async () => {
    setCameraError(null);
    setImageError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setIsCameraActive(true);

      // Attach stream to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera permission was denied or not available. You can upload an image instead.");
      setIsCameraActive(false);
      // Fallback: trigger file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // Capture frame from video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setSelectedImage(dataUrl);
      setAnalysisResult(null);
      setImageError(null);
    }
    stopCameraStream();
  };

  // Process selected file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = diseaseDetectionService.validateImage(file);
    if (!validation.valid) {
      setImageError(validation.error || "Invalid image.");
      return;
    }

    try {
      setImageError(null);
      const processed = await diseaseDetectionService.processImageForUpload(file);
      setSelectedImage(processed);
      setAnalysisResult(null);
      setSelectedHistoryItem(null);
    } catch (err: any) {
      setImageError(err.message || "Failed to process image.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validation = diseaseDetectionService.validateImage(file);
    if (!validation.valid) {
      setImageError(validation.error || "Invalid image.");
      return;
    }

    try {
      setImageError(null);
      const processed = await diseaseDetectionService.processImageForUpload(file);
      setSelectedImage(processed);
      setAnalysisResult(null);
      setSelectedHistoryItem(null);
    } catch (err: any) {
      setImageError(err.message || "Failed to process image.");
    }
  };

  // Execute AI analysis with real step progression
  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setCurrentStep(1); // Step 1: Uploaded & Validated

    // Step animation intervals for user feedback
    const step2Timer = setTimeout(() => setCurrentStep(2), 600); // Step 2: Image Validated
    const step3Timer = setTimeout(() => setCurrentStep(3), 1200); // Step 3: Analyzing AI Vision
    const step4Timer = setTimeout(() => setCurrentStep(4), 2200); // Step 4: Identifying Symptoms

    try {
      const result = await diseaseDetectionService.analyzeCropDisease({
        image: selectedImage,
        crop: selectedCrop,
        growthStage,
        location: locationText,
        description: symptomDescription,
        language
      }, user?.id);

      setCurrentStep(5); // Step 5: Preparing Recommendations
      setTimeout(() => {
        setAnalysisResult(result);
        setIsAnalyzing(false);
        // Refresh history
        if (user?.id) {
          diseaseScanStorage.getScans(user.id).then(setHistoryItems);
        }
      }, 600);
    } catch (err: any) {
      console.error("Scan error:", err);
      setAnalysisError(err.message || "Unable to analyze the image right now. Please try again.");
      setIsAnalyzing(false);
    } finally {
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      clearTimeout(step4Timer);
    }
  };

  // Ask AgriGPT in Chat with Scan Context
  const handleAskAgriGPT = async () => {
    const currentRes = analysisResult || selectedHistoryItem?.fullResult;
    if (!currentRes) return;

    const cropName = currentRes.crop || selectedCrop || 'crop';
    const diseaseName = currentRes.possibleDisease || 'detected issue';
    const confLevel = currentRes.confidenceLevel || 'Moderate';
    const symptomsStr = (currentRes.symptoms || []).join(', ');

    const promptText = language === 'hi'
      ? `मैंने ${cropName} की तस्वीर स्कैन की है। एआई स्कैन ने ${confLevel} विश्वास के साथ ${diseaseName} का संकेत दिया है। लक्षण: ${symptomsStr}। कृपया इस बीमारी के नियंत्रण और बचाव के लिए मुझे विस्तार से मार्गदर्शन दें।`
      : language === 'mr'
      ? `मी ${cropName} ची प्रतिमा स्कॅन केली आहे. एआय स्कॅनने ${confLevel} खात्रीने ${diseaseName} चे निदान केले आहे. लक्षणे: ${symptomsStr}. कृपया या रोगाच्या नियंत्रणासाठी मला सविस्तर सल्ला द्या.`
      : `I just scanned a ${cropName} leaf image. The AgriGPT AI vision model diagnosed ${diseaseName} with ${confLevel} confidence level. Identified symptoms: ${symptomsStr}. Please provide detailed management advice for my farm.`;

    // Navigate to advisor chat and trigger message
    navigate('/');
    setTimeout(() => {
      sendMessage(promptText);
    }, 200);
  };

  // Reset scan view
  const handleReset = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setSelectedHistoryItem(null);
    setAnalysisError(null);
    setImageError(null);
    setSymptomDescription('');
  };

  // Active viewing object (either fresh analysis result or historical item)
  const activeResult: DiseaseScanResult | null = analysisResult || selectedHistoryItem?.fullResult || null;

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur sticky top-0 z-20 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Leaf className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                {language === 'hi' ? 'फसल रोग स्कैनर (Crop Disease Scanner)' : language === 'mr' ? 'पीक रोग स्कॅनर (Crop Disease Scanner)' : 'Crop Disease Scanner'}
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {language === 'hi' 
                ? 'रोगों और कीटों की पहचान के लिए अपनी फसल या पत्ती की स्पष्ट तस्वीर अपलोड करें।' 
                : language === 'mr' 
                ? 'रोगांची ओळख पटवण्यासाठी तुमच्या पिकाचे किंवा पानाचे स्पष्ट छायाचित्र अपलोड करा.' 
                : 'Upload a clear photo of your crop or leaf to identify possible diseases using AI Vision.'}
            </p>
          </div>

          {(selectedImage || activeResult) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {language === 'hi' ? 'नया स्कैन' : language === 'mr' ? 'नवीन स्कॅन' : 'New Scan'}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6 space-y-8 flex-1">
        
        {/* Camera Modal overlay if active */}
        {isCameraActive && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Live Camera</span>
                </div>
                <button 
                  onClick={stopCameraStream} 
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-8 border-2 border-dashed border-emerald-500/50 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-xs text-emerald-400/80 bg-black/60 px-2 py-1 rounded">Align leaf inside box</span>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-center gap-4">
                <button
                  onClick={stopCameraStream}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-xl hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all"
                >
                  <Camera className="w-4 h-4" /> Capture Photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera Permission Error Notification */}
        {cameraError && (
          <div className="p-3 bg-amber-950/50 border border-amber-800/80 rounded-xl text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{cameraError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-amber-800/80 hover:bg-amber-700 text-amber-100 font-medium rounded-lg text-[11px] transition-colors flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Upload Photo</span>
              </button>
              <button onClick={() => setCameraError(null)} className="text-amber-400 hover:text-amber-200 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Scanner Section */}
        {!activeResult && !isAnalyzing && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Image Upload & Camera Box */}
            <div className="lg:col-span-7 space-y-4">
              
              {!selectedImage ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[320px] relative bg-[#18181b]/50",
                    isDragging ? "border-emerald-500 bg-emerald-500/5 scale-[0.99]" : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/jpeg,image/jpg,image/png,image/webp" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />

                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400 shadow-inner">
                    <Upload className="w-8 h-8" />
                  </div>

                  <h3 className="text-base font-semibold text-zinc-200 mb-1">
                    {language === 'hi' ? 'फसल की छवि अपलोड करें' : language === 'mr' ? 'पिकाची प्रतिमा अपलोड करा' : 'Upload Crop or Leaf Image'}
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm mb-6">
                    {language === 'hi' 
                      ? 'तस्वीर यहाँ खींचकर छोड़ें या अपने कैमरा/गैलरी से चुनें (JPG, PNG, WEBP)' 
                      : language === 'mr' 
                      ? 'येथे फोटो ड्रॅग करा किंवा कॅमेरा/गॅलरीमधून निवडा (JPG, PNG, WEBP)' 
                      : 'Drag & drop image here or choose from your camera or gallery (JPG, PNG, WEBP up to 10MB)'}
                  </p>

                  {/* Action Buttons: Camera + Upload */}
                  <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 min-w-[140px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{language === 'hi' ? '📷 फोटो खींचें' : language === 'mr' ? '📷 फोटो काढा' : '📷 Take Photo'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 min-w-[140px] px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl flex items-center justify-center gap-2 border border-zinc-700 transition-all active:scale-95"
                    >
                      <Upload className="w-4 h-4 text-zinc-400" />
                      <span>{language === 'hi' ? '⬆ गैलरी से चुनें' : language === 'mr' ? '⬆ गॅलरी निवडा' : '⬆ Upload Image'}</span>
                    </button>
                  </div>

                  {imageError && (
                    <div className="mt-4 p-2.5 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-lg flex items-center gap-2 max-w-md">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{imageError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Image Preview Container */
                <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4 space-y-4 relative overflow-hidden">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 group">
                    <img 
                      src={selectedImage} 
                      alt="Crop Preview" 
                      className="w-full h-full object-contain" 
                    />

                    {/* Image Control Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                      <button
                        onClick={() => setIsPreviewModalOpen(true)}
                        className="p-2.5 bg-zinc-900/90 text-zinc-200 hover:text-white rounded-xl border border-zinc-700 hover:bg-zinc-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
                        title="Enlarge image"
                      >
                        <ZoomIn className="w-4 h-4" />
                        <span>Enlarge</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 bg-zinc-900/90 text-zinc-200 hover:text-white rounded-xl border border-zinc-700 hover:bg-zinc-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
                        title="Change image"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retake</span>
                      </button>

                      <button
                        onClick={() => setSelectedImage(null)}
                        className="p-2.5 bg-red-950/90 text-red-200 hover:text-white rounded-xl border border-red-800 hover:bg-red-900 transition-colors flex items-center gap-1.5 text-xs font-medium"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Image ready for analysis
                    </span>
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="text-zinc-500 hover:text-zinc-300 underline"
                    >
                      Change photo
                    </button>
                  </div>
                </div>
              )}

              {/* Pre-scanning Quality Tips */}
              <div className="bg-[#18181b]/60 border border-zinc-800/80 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-zinc-300">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <span>
                    {language === 'hi' ? 'सटीक परिणाम के लिए टिप्स:' : language === 'mr' ? 'अचूक निकालासाठी टीप:' : 'Tips for Better AI Accuracy:'}
                  </span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-zinc-400 pl-2">
                  <li className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Good daylight illumination</li>
                  <li className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Focus on affected leaf/spot</li>
                  <li className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Include both healthy & damaged parts</li>
                  <li className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Avoid blur or shadows</li>
                </ul>
              </div>

            </div>

            {/* Right: Optional Farmer Context Inputs + Analyze Button */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-3">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>
                    {language === 'hi' ? 'फ़सल विवरण (वैकल्पिक)' : language === 'mr' ? 'पिकाची माहिती (ऐच्छिक)' : 'Crop Context (Optional)'}
                  </span>
                </div>

                {/* Crop Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    {language === 'hi' ? 'फसल चुनें:' : language === 'mr' ? 'पीक निवडा:' : 'Crop Type:'}
                  </label>
                  <select
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="">-- Auto Detect or Select --</option>
                    {CROP_OPTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Growth Stage Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    {language === 'hi' ? 'विकास चरण:' : language === 'mr' ? 'वाढीचा टप्पा:' : 'Growth Stage:'}
                  </label>
                  <select
                    value={growthStage}
                    onChange={(e) => setGrowthStage(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="">-- Select Stage --</option>
                    {STAGE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    {language === 'hi' ? 'स्थान / क्षेत्र:' : language === 'mr' ? 'स्थान / परिसर:' : 'Farm Location:'}
                  </label>
                  <input
                    type="text"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="e.g. Nashik, Maharashtra"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Symptom Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    {language === 'hi' ? 'दिखने वाली समस्या / लक्षण:' : language === 'mr' ? 'दिसणारी समस्या / लक्षणे:' : 'Observed Symptoms:'}
                  </label>
                  <textarea
                    value={symptomDescription}
                    onChange={(e) => setSymptomDescription(e.target.value)}
                    rows={2}
                    placeholder={language === 'hi' ? 'जैसे पत्तियों पर पीले धब्बे या कीड़े...' : 'e.g. Yellowing leaves with concentric brown spots...'}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={handleAnalyze}
                  disabled={!selectedImage || isAnalyzing}
                  className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.98]"
                >
                  <Search className="w-4 h-4" />
                  <span>
                    {language === 'hi' ? '🔬 फसल रोग विश्लेषण करें' : language === 'mr' ? '🔬 पीक रोग विश्लेषक' : '🔬 Analyze Crop Disease'}
                  </span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Real-time Progress Checklist during analysis */}
        {isAnalyzing && (
          <div className="max-w-2xl mx-auto bg-[#18181b] border border-zinc-800 rounded-2xl p-8 space-y-6 shadow-2xl my-8">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
                <Activity className="w-6 h-6 animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-zinc-100">
                {language === 'hi' ? 'फसल विश्लेषण जारी है...' : language === 'mr' ? 'पीक विश्लेषण सुरू आहे...' : 'Analyzing Crop Image with AI Vision'}
              </h2>
              <p className="text-xs text-zinc-400">
                Evaluating plant health, leaf patterns, and symptom matches in real-time...
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              {[
                { step: 1, label: 'Image uploaded successfully' },
                { step: 2, label: 'Image quality & crop structure validated' },
                { step: 3, label: 'Gemini AI Vision analyzing leaf symptoms' },
                { step: 4, label: 'Matching against agricultural disease database' },
                { step: 5, label: 'Generating localized farmer recommendations' }
              ].map((s) => {
                const isDone = currentStep > s.step;
                const isCurrent = currentStep === s.step;
                return (
                  <div key={s.step} className="flex items-center gap-3 text-xs">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all",
                      isDone ? "bg-emerald-500 text-zinc-950 border-emerald-400" :
                      isCurrent ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 animate-bounce" :
                      "bg-zinc-800 border-zinc-700 text-zinc-500"
                    )}>
                      {isDone ? '✓' : s.step}
                    </div>
                    <span className={cn(
                      "transition-colors",
                      isDone ? "text-zinc-200 font-medium" :
                      isCurrent ? "text-emerald-400 font-semibold" :
                      "text-zinc-500"
                    )}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Analysis Error State */}
        {analysisError && !isAnalyzing && (
          <div className="max-w-2xl mx-auto bg-red-950/50 border border-red-800/80 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-700 flex items-center justify-center mx-auto text-red-300">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-red-100">
              {language === 'hi' ? 'विश्लेषण विफल हुआ' : language === 'mr' ? 'विश्लेषण अयशस्वी' : 'Analysis Unsuccessful'}
            </h3>
            <p className="text-xs text-red-200">{analysisError}</p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleAnalyze}
                className="px-4 py-2 bg-red-800 hover:bg-red-700 text-red-100 text-xs font-semibold rounded-xl"
              >
                Retry Analysis
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl"
              >
                Try Another Image
              </button>
            </div>
          </div>
        )}

        {/* RESULT VIEW PRESENTATION */}
        {activeResult && !isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Condition 1: Non-Plant Image */}
            {!activeResult.isPlantImage ? (
              <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-8 text-center space-y-4 max-w-2xl mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-900/40 border border-amber-700 flex items-center justify-center mx-auto text-amber-400">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-amber-100">
                  {language === 'hi' ? 'फसल की छवि नहीं पाई गई' : language === 'mr' ? 'पिकाची प्रतिमा आढळली नाही' : 'Non-Crop Image Detected'}
                </h2>
                <p className="text-xs text-amber-200 max-w-md mx-auto leading-relaxed">
                  {language === 'hi'
                    ? 'यह छवि फसल या पत्ती नहीं लगती है। कृपया प्रभावित पौधे या पत्ती की स्पष्ट तस्वीर अपलोड करें।'
                    : language === 'mr'
                    ? 'ही प्रतिमा पीक किंवा पान असल्याचे दिसत नाही. कृपया बाधित पिकाचे किंवा पानाचे स्पष्ट छायाचित्र अपलोड करा.'
                    : 'This image does not appear to contain a crop or plant. Please upload a clear photo of the affected plant or leaf.'}
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg"
                >
                  {language === 'hi' ? 'स्पष्ट फोटो अपलोड करें' : language === 'mr' ? 'स्पष्ट फोटो अपलोड करा' : 'Upload Plant Image'}
                </button>
              </div>
            ) : (
              /* Valid Plant Analysis View */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Card: Summary & Visual Badges */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-5">
                    
                    {/* Image Preview */}
                    {selectedImage && (
                      <div className="aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800">
                        <img src={selectedImage} alt="Analyzed Crop" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Disease Header & Health Status Badge */}
                    <div className="space-y-2 border-b border-zinc-800 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                          {activeResult.crop || 'Crop'}
                        </span>
                        
                        {/* Severity Badge */}
                        <span className={cn(
                          "text-[11px] font-bold px-2.5 py-1 rounded-md border",
                          activeResult.severity === 'Severe' || activeResult.severity === 'High' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                          activeResult.severity === 'Moderate' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                          "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        )}>
                          Severity: {activeResult.severity}
                        </span>
                      </div>

                      <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight">
                        {activeResult.possibleDisease}
                      </h2>
                    </div>

                    {/* Confidence Meter */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-medium">AI Visual Confidence:</span>
                        <span className="font-bold text-emerald-400">
                          {activeResult.confidenceLevel} ({Math.round((activeResult.confidence || 0.85) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            (activeResult.confidence || 0.8) > 0.7 ? "bg-emerald-500" :
                            (activeResult.confidence || 0.8) > 0.4 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${Math.round((activeResult.confidence || 0.85) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Primary Chat CTA Button */}
                    <div className="pt-2 space-y-2">
                      <button
                        onClick={handleAskAgriGPT}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>
                          {language === 'hi' ? '💬 एग्रीजीपीटी से आगे पूछें' : language === 'mr' ? '💬 अ‍ॅग्रीजीपीटी ला विचारा' : '💬 Ask AgriGPT About Treatment'}
                        </span>
                      </button>

                      <button
                        onClick={handleReset}
                        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs rounded-xl border border-zinc-700 transition-colors"
                      >
                        {language === 'hi' ? '🔄 दूसरी तस्वीर स्कैन करें' : language === 'mr' ? '🔄 दुसरी प्रतिमा स्कॅन करा' : '🔄 Scan Another Image'}
                      </button>
                    </div>

                  </div>
                </div>

                {/* Right Card: Symptoms, Management & Recommendations */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6 space-y-6">
                    
                    {/* Symptoms List */}
                    {activeResult.symptoms && activeResult.symptoms.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          <span>Visible Symptoms Detected</span>
                        </h3>
                        <ul className="space-y-1.5 pl-1">
                          {activeResult.symptoms.map((s, idx) => (
                            <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                              <span className="text-emerald-500 font-bold mt-0.5">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Reasoning / Evidence */}
                    {activeResult.reasoning && activeResult.reasoning.length > 0 && (
                      <div className="space-y-2 border-t border-zinc-800/80 pt-4">
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>AI Visual Evidence</span>
                        </h3>
                        <ul className="space-y-1.5 pl-1">
                          {activeResult.reasoning.map((r, idx) => (
                            <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                              <span className="text-amber-500 font-bold mt-0.5">✓</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {activeResult.recommendedActions && activeResult.recommendedActions.length > 0 && (
                      <div className="space-y-2 border-t border-zinc-800/80 pt-4">
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Recommended Management Steps</span>
                        </h3>
                        <ol className="space-y-2 pl-1">
                          {activeResult.recommendedActions.map((action, idx) => (
                            <li key={idx} className="text-xs text-zinc-200 flex items-start gap-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{action}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Prevention Tips */}
                    {activeResult.prevention && activeResult.prevention.length > 0 && (
                      <div className="space-y-2 border-t border-zinc-800/80 pt-4">
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                          Prevention & Future Crop Safety
                        </h3>
                        <ul className="space-y-1.5 pl-1">
                          {activeResult.prevention.map((p, idx) => (
                            <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                              <span className="text-emerald-500">🛡️</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Differential Diagnoses if available */}
                    {activeResult.differentialDiagnoses && activeResult.differentialDiagnoses.length > 0 && (
                      <div className="border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
                        <span className="font-semibold text-zinc-300">Alternative possibilities: </span>
                        {activeResult.differentialDiagnoses.map((d, i) => (
                          <span key={i} className="inline-block bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[11px] mr-2 mt-1">
                            {d.disease} ({d.likelihood})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Disclaimer Warning */}
                    <div className="border-t border-zinc-800/80 pt-4 p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl text-[11px] text-amber-300/80 leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>
                        {activeResult.disclaimer || 'AI-generated agricultural guidance. Confirm serious crop disease with a qualified agricultural extension officer before applying chemicals.'}
                      </span>
                    </div>

                  </div>
                </div>

              </div>
            )}
          </motion.div>
        )}

        {/* SCAN HISTORY SECTION */}
        {historyItems.length > 0 && (
          <div className="border-t border-zinc-800 pt-8 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-200">
                  {language === 'hi' ? 'हालिया स्कैन इतिहास' : language === 'mr' ? 'नुकतेच स्कॅन इतिहास' : 'Recent Disease Scans'}
                </h3>
              </div>
              <button 
                onClick={async () => {
                  if (user?.id) {
                    await diseaseScanStorage.clearHistory(user.id);
                    setHistoryItems([]);
                  }
                }}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedHistoryItem(item);
                    setSelectedImage(item.imageUrl || null);
                    setAnalysisResult(null);
                  }}
                  className={cn(
                    "p-3 rounded-xl border bg-[#18181b] hover:border-emerald-500/50 cursor-pointer transition-all flex items-center gap-3",
                    selectedHistoryItem?.id === item.id ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800"
                  )}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.crop} className="w-12 h-12 rounded-lg object-cover border border-zinc-700 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400 flex-shrink-0 font-bold text-xs">
                      {item.crop.substring(0, 2)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200 truncate">{item.crop}</span>
                      <span className="text-[10px] text-zinc-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-emerald-400 truncate font-medium">{item.disease}</p>
                    <span className="text-[10px] text-zinc-500">Confidence: {item.confidenceLevel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Image Zoom Modal */}
      {isPreviewModalOpen && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setIsPreviewModalOpen(false)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-zinc-950 p-2 rounded-2xl border border-zinc-800 overflow-hidden" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-zinc-900/80 text-zinc-300 hover:text-white rounded-full z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedImage} alt="Enlarged preview" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
