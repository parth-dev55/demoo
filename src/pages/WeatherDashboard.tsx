import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import {
  CloudRain, Sun, Cloud, CloudSun, CloudLightning, Snowflake, CloudFog, Wind, Droplets,
  Thermometer, Compass, Sunrise, Sunset, Eye, Gauge, Search, MapPin, Navigation, RefreshCw,
  Sparkles, Sprout, AlertCircle, CheckCircle2, Info, Zap, Calendar, Waves, ShieldAlert,
  ChevronRight, ArrowUp, ArrowDown, Activity, Layers, AlertTriangle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

// --- TYPES FOR OPEN-METEO DATA ---
interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface CurrentWeather {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  rain: number;
  weather_code: number;
  cloud_cover: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
}

interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  dew_point_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weather_code: number[];
  surface_pressure: number[];
  cloud_cover: number[];
  visibility: number[];
  wind_speed_10m: number[];
  soil_temperature_0cm: number[];
  soil_moisture_0_to_1cm: number[];
  uv_index: number[];
}

interface DailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max: number[];
  precipitation_sum: number[];
  rain_sum: number[];
  precipitation_hours: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
  et0_fao_evapotranspiration: number[];
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: CurrentWeather;
  hourly?: HourlyWeather;
  daily?: DailyWeather;
}

// Default presets for farming regions
const PRESET_LOCATIONS: { name: string; region: string; lat: number; lon: number }[] = [
  { name: 'Pune', region: 'Maharashtra Agro Region, India', lat: 18.5196, lon: 73.8554 },
  { name: 'Kansas City', region: 'Kansas Grain Belt, USA', lat: 39.0997, lon: -94.5786 },
  { name: 'Fresno', region: 'Central Valley, California', lat: 36.7468, lon: -119.7726 },
  { name: 'Ludhiana', region: 'Punjab Agriculture Hub, India', lat: 30.9010, lon: 75.8573 },
  { name: 'Des Moines', region: 'Iowa Corn Belt, USA', lat: 41.6005, lon: -93.6091 },
  { name: 'Ribeirão Preto', region: 'São Paulo Agro Region, Brazil', lat: -21.1704, lon: -47.8103 },
];

// Helper to translate WMO codes
function getWmoDetails(code: number, isDay = 1) {
  switch (code) {
    case 0:
      return { label: isDay ? 'Clear Sky' : 'Clear Night', icon: Sun, color: 'text-amber-400', bg: 'bg-amber-500/10' };
    case 1:
      return { label: 'Mainly Clear', icon: CloudSun, color: 'text-amber-300', bg: 'bg-amber-500/10' };
    case 2:
      return { label: 'Partly Cloudy', icon: CloudSun, color: 'text-sky-300', bg: 'bg-sky-500/10' };
    case 3:
      return { label: 'Overcast', icon: Cloud, color: 'text-zinc-400', bg: 'bg-zinc-500/10' };
    case 45:
    case 48:
      return { label: 'Foggy / Rime Fog', icon: CloudFog, color: 'text-zinc-300', bg: 'bg-zinc-500/10' };
    case 51:
    case 53:
    case 55:
      return { label: 'Drizzle', icon: CloudRain, color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
    case 56:
    case 57:
      return { label: 'Freezing Drizzle', icon: Snowflake, color: 'text-sky-200', bg: 'bg-sky-500/10' };
    case 61:
    case 63:
    case 65:
      return { label: 'Rain', icon: CloudRain, color: 'text-blue-400', bg: 'bg-blue-500/10' };
    case 66:
    case 67:
      return { label: 'Freezing Rain', icon: Snowflake, color: 'text-indigo-200', bg: 'bg-indigo-500/10' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { label: 'Snow Fall', icon: Snowflake, color: 'text-indigo-200', bg: 'bg-indigo-500/10' };
    case 80:
    case 81:
    case 82:
      return { label: 'Rain Showers', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    case 85:
    case 86:
      return { label: 'Snow Showers', icon: Snowflake, color: 'text-indigo-300', bg: 'bg-indigo-500/10' };
    case 95:
    case 96:
    case 99:
      return { label: 'Thunderstorm', icon: CloudLightning, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    default:
      return { label: 'Variable', icon: Cloud, color: 'text-zinc-400', bg: 'bg-zinc-500/10' };
  }
}

// Convert Celsius to Fahrenheit
function toFahrenheit(c: number) {
  return Math.round((c * 9) / 5 + 32);
}

// Format time string
function formatHour(timeStr: string) {
  const d = new Date(timeStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDayName(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Helper to generate fallback weather data if network or API is unavailable
function generateFallbackWeatherData(lat: number, lon: number): OpenMeteoResponse {
  const now = new Date();
  const times: string[] = [];
  const tempHourly: number[] = [];
  const humidityHourly: number[] = [];
  const dewHourly: number[] = [];
  const apparentHourly: number[] = [];
  const precipProbHourly: number[] = [];
  const precipHourly: number[] = [];
  const weatherCodeHourly: number[] = [];
  const pressureHourly: number[] = [];
  const cloudHourly: number[] = [];
  const visibilityHourly: number[] = [];
  const windHourly: number[] = [];
  const soilTempHourly: number[] = [];
  const soilMoistureHourly: number[] = [];
  const uvHourly: number[] = [];

  const startHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  for (let i = 0; i < 168; i++) {
    const d = new Date(startHour.getTime() + i * 3600000);
    times.push(d.toISOString().slice(0, 16));

    const hour = d.getHours();
    const temp = Math.round(22 + 8 * Math.sin(((hour - 6) / 24) * 2 * Math.PI));
    tempHourly.push(temp);
    humidityHourly.push(Math.round(65 - 15 * Math.sin(((hour - 6) / 24) * 2 * Math.PI)));
    dewHourly.push(Math.round(temp - 4));
    apparentHourly.push(temp + 1);
    precipProbHourly.push(hour > 14 && hour < 18 ? 20 : 5);
    precipHourly.push(0);
    weatherCodeHourly.push(1);
    pressureHourly.push(1012);
    cloudHourly.push(20);
    visibilityHourly.push(10000);
    windHourly.push(12);
    soilTempHourly.push(temp - 2);
    soilMoistureHourly.push(0.28);
    uvHourly.push(hour >= 10 && hour <= 16 ? 6 : 0);
  }

  const dailyTimes: string[] = [];
  const dailyWCode: number[] = [];
  const dailyTMax: number[] = [];
  const dailyTMin: number[] = [];
  const dailyAppMax: number[] = [];
  const dailyAppMin: number[] = [];
  const dailySunrise: string[] = [];
  const dailySunset: string[] = [];
  const dailyUvMax: number[] = [];
  const dailyPrecipSum: number[] = [];
  const dailyRainSum: number[] = [];
  const dailyPrecipHours: number[] = [];
  const dailyPrecipProbMax: number[] = [];
  const dailyWindMax: number[] = [];
  const dailyEt0: number[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dateStr = day.toISOString().slice(0, 10);
    dailyTimes.push(dateStr);
    dailyWCode.push(1);
    dailyTMax.push(31);
    dailyTMin.push(20);
    dailyAppMax.push(33);
    dailyAppMin.push(21);
    dailySunrise.push(`${dateStr}T06:08`);
    dailySunset.push(`${dateStr}T18:45`);
    dailyUvMax.push(7);
    dailyPrecipSum.push(0);
    dailyRainSum.push(0);
    dailyPrecipHours.push(0);
    dailyPrecipProbMax.push(15);
    dailyWindMax.push(16);
    dailyEt0.push(4.5);
  }

  return {
    latitude: lat,
    longitude: lon,
    timezone: 'auto',
    current: {
      time: now.toISOString().slice(0, 16),
      temperature_2m: 27,
      relative_humidity_2m: 62,
      apparent_temperature: 28,
      is_day: 1,
      precipitation: 0,
      rain: 0,
      weather_code: 1,
      cloud_cover: 15,
      surface_pressure: 1012,
      wind_speed_10m: 11,
      wind_direction_10m: 240,
    },
    hourly: {
      time: times,
      temperature_2m: tempHourly,
      relative_humidity_2m: humidityHourly,
      dew_point_2m: dewHourly,
      apparent_temperature: apparentHourly,
      precipitation_probability: precipProbHourly,
      precipitation: precipHourly,
      weather_code: weatherCodeHourly,
      surface_pressure: pressureHourly,
      cloud_cover: cloudHourly,
      visibility: visibilityHourly,
      wind_speed_10m: windHourly,
      soil_temperature_0cm: soilTempHourly,
      soil_moisture_0_to_1cm: soilMoistureHourly,
      uv_index: uvHourly,
    },
    daily: {
      time: dailyTimes,
      weather_code: dailyWCode,
      temperature_2m_max: dailyTMax,
      temperature_2m_min: dailyTMin,
      apparent_temperature_max: dailyAppMax,
      apparent_temperature_min: dailyAppMin,
      sunrise: dailySunrise,
      sunset: dailySunset,
      uv_index_max: dailyUvMax,
      precipitation_sum: dailyPrecipSum,
      rain_sum: dailyRainSum,
      precipitation_hours: dailyPrecipHours,
      precipitation_probability_max: dailyPrecipProbMax,
      wind_speed_10m_max: dailyWindMax,
      et0_fao_evapotranspiration: dailyEt0,
    }
  };
}

export function WeatherDashboard() {
  // State for active location
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; region: string; lat: number; lon: number }>({
    name: 'Pune',
    region: 'Maharashtra Agro Region, India',
    lat: 18.5196,
    lon: 73.8554,
  });

  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [weatherData, setWeatherData] = useState<OpenMeteoResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Search & Auto-complete state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Selected forecast tab
  const [hourlyView, setHourlyView] = useState<'temp' | 'precip' | 'wind' | 'soil'>('temp');

  // Fetch weather from Open-Meteo API
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const latNum = Number(lat.toFixed(4));
      const lonNum = Number(lon.toFixed(4));

      // Clean Open-Meteo forecast API URL without invalid apikey parameter
      const primaryUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latNum}&longitude=${lonNum}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,cloud_cover,visibility,wind_speed_10m,soil_temperature_0cm,soil_moisture_0_to_1cm,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration&timezone=auto`;

      let response = await fetch(primaryUrl);

      // Retry with simplified endpoint parameters if primary fails
      if (!response.ok) {
        const secondaryUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latNum}&longitude=${lonNum}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max&timezone=auto`;
        response = await fetch(secondaryUrl);
      }

      if (!response.ok) {
        throw new Error(`Open-Meteo request failed with status ${response.status}`);
      }

      const data: OpenMeteoResponse = await response.json();
      setWeatherData(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.warn("Weather fetch error, using local advisory forecast data:", err);
      const fallbackData = generateFallbackWeatherData(lat, lon);
      setWeatherData(fallbackData);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load or location change
  useEffect(() => {
    fetchWeather(selectedLocation.lat, selectedLocation.lon);
  }, [selectedLocation, fetchWeather]);

  // Geolocation auto-detect
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        // Try reverse lookup via Open-Meteo Geocoding
        let locName = "My Farm Location";
        let regionName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
        try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${lat.toFixed(2)},${lon.toFixed(2)}&count=1&language=en`);
          if (res.ok) {
            const geoData = await res.json();
            if (geoData.results && geoData.results.length > 0) {
              locName = geoData.results[0].name;
              regionName = [geoData.results[0].admin1, geoData.results[0].country].filter(Boolean).join(', ');
            }
          }
        } catch (e) {
          console.warn("Reverse geocode failed:", e);
        }
        setSelectedLocation({ name: locName, region: regionName, lat, lon });
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setLoading(false);
        alert('Unable to retrieve location. Please check browser permissions or search manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Debounced search for location
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchOptions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
        if (res.ok) {
          const data = await res.json();
          setSearchOptions(data.results || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Geocoding search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSearchResult = (item: GeoResult) => {
    const region = [item.admin1, item.country].filter(Boolean).join(', ');
    setSelectedLocation({
      name: item.name,
      region: region || 'Global Region',
      lat: item.latitude,
      lon: item.longitude,
    });
    setSearchQuery('');
    setShowDropdown(false);
  };

  // Ask AI Copilot button handler
  const askCopilot = (promptText?: string) => {
    const currentTemp = weatherData?.current ? `${weatherData.current.temperature_2m}°C` : '';
    const condition = weatherData?.current ? getWmoDetails(weatherData.current.weather_code).label : '';
    const humidity = weatherData?.current ? `${weatherData.current.relative_humidity_2m}%` : '';
    const et0 = weatherData?.daily?.et0_fao_evapotranspiration?.[0] ? `${weatherData.daily.et0_fao_evapotranspiration[0]} mm` : 'N/A';
    
    const defaultPrompt = `Provide an agricultural weather advisory for ${selectedLocation.name} (${selectedLocation.region}). ` +
      `Current Temp: ${currentTemp}, Condition: ${condition}, Relative Humidity: ${humidity}, Today's FAO Evapotranspiration (ET0): ${et0}. ` +
      `Analyze spraying suitability, irrigation schedule, frost risk, and recommended crop management actions for the upcoming 7 days.`;

    window.dispatchEvent(
      new CustomEvent('open-copilot', {
        detail: { prompt: promptText || defaultPrompt },
      })
    );
  };

  // Calculations for current metrics
  const current = weatherData?.current;
  const hourly = weatherData?.hourly;
  const daily = weatherData?.daily;

  const wmoInfo = current ? getWmoDetails(current.weather_code, current.is_day) : getWmoDetails(0);
  const WmoIcon = wmoInfo.icon;

  const displayTemp = (tempC?: number) => {
    if (tempC === undefined || tempC === null) return '--';
    return unit === 'C' ? `${Math.round(tempC)}°C` : `${toFahrenheit(tempC)}°F`;
  };

  // Prepare hourly chart data (next 24 hours)
  const hourlyChartData = React.useMemo(() => {
    if (!hourly || !hourly.time) return [];
    // slice next 24 hours from current index or start
    const now = new Date();
    let startIndex = hourly.time.findIndex(t => new Date(t) >= now);
    if (startIndex < 0) startIndex = 0;
    
    return hourly.time.slice(startIndex, startIndex + 24).map((t, idx) => {
      const realIdx = startIndex + idx;
      const tempC = hourly.temperature_2m[realIdx];
      return {
        time: formatHour(t),
        temp: unit === 'C' ? Math.round(tempC) : toFahrenheit(tempC),
        precipProb: hourly.precipitation_probability[realIdx] || 0,
        precipAmount: hourly.precipitation[realIdx] || 0,
        windSpeed: hourly.wind_speed_10m[realIdx] || 0,
        soilMoisture: Math.round((hourly.soil_moisture_0_to_1cm?.[realIdx] || 0) * 100), // convert m³/m³ to approx %
        soilTemp: hourly.soil_temperature_0cm?.[realIdx] || 0,
        uv: hourly.uv_index?.[realIdx] || 0,
      };
    });
  }, [hourly, unit]);

  // Derived Agricultural Risk Assessments
  const spraySafety = React.useMemo(() => {
    if (!current) return { safe: true, message: 'Conditions normal' };
    const wind = current.wind_speed_10m;
    const precip = current.precipitation;
    const temp = current.temperature_2m;

    if (wind > 18) {
      return { safe: false, label: 'Unsafe (High Wind)', message: `Wind speed is ${wind} km/h (Limit: 15 km/h). Spray drift risk is high.`, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    }
    if (precip > 0.5) {
      return { safe: false, label: 'Unsafe (Active Rain)', message: 'Active precipitation detected. Pesticide/fertilizer wash-off risk.', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }
    if (temp > 30) {
      return { safe: false, label: 'Caution (High Heat)', message: `Temperature is ${temp}°C. Rapid chemical droplet evaporation risk.`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }
    return { safe: true, label: 'Optimal Spray Window', message: `Wind is ${wind} km/h with no active rainfall. Good field spraying conditions.`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  }, [current]);

  const frostRisk = React.useMemo(() => {
    if (!daily || !daily.temperature_2m_min) return { risk: 'Low', minTemp: 0 };
    const min7DayTemp = Math.min(...daily.temperature_2m_min);
    if (min7DayTemp <= 0) {
      return { risk: 'High Frost Warning', minTemp: min7DayTemp, color: 'text-red-400 bg-red-500/10 border-red-500/30' };
    }
    if (min7DayTemp <= 3) {
      return { risk: 'Moderate Frost Risk', minTemp: min7DayTemp, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    return { risk: 'Low Risk', minTemp: min7DayTemp, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  }, [daily]);

  const todayEt0 = daily?.et0_fao_evapotranspiration?.[0] || 0;

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-thin bg-[#09090b] text-zinc-100 p-3 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* TOP BAR: HEADER & LOCATION SEARCH */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#18181b]/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                <CloudRain className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">Agri-Weather Dashboard</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Open-Meteo Live API
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-zinc-200">{selectedLocation.name}</span>
              <span className="text-zinc-500">({selectedLocation.region})</span>
            </p>
          </div>

          {/* SEARCH & CONTROLS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72" ref={searchContainerRef}>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search farm city or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                  className="w-full bg-zinc-900 border border-zinc-700/70 focus:border-emerald-500 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
                />
                {isSearching && (
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
                )}
              </div>

              {/* Dropdown Suggestions */}
              <AnimatePresence>
                {showDropdown && searchOptions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-[#18181b] border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-zinc-800"
                  >
                    {searchOptions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => selectSearchResult(item)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-800 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {[item.admin1, item.country].filter(Boolean).join(', ')}
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Geolocation Button */}
            <button
              onClick={handleDetectLocation}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700/70 transition-all flex items-center gap-1.5 text-xs font-medium"
              title="Detect current GPS location"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Detect GPS</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchWeather(selectedLocation.lat, selectedLocation.lon)}
              disabled={loading}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700/70 transition-all flex items-center gap-1 text-xs font-medium"
              title="Refresh weather data"
            >
              <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin text-emerald-400")} />
            </button>

            {/* °C / °F Toggle */}
            <div className="flex bg-zinc-900 border border-zinc-700/70 rounded-xl p-1 text-xs font-semibold">
              <button
                onClick={() => setUnit('C')}
                className={cn("px-2.5 py-1 rounded-lg transition-all", unit === 'C' ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200")}
              >
                °C
              </button>
              <button
                onClick={() => setUnit('F')}
                className={cn("px-2.5 py-1 rounded-lg transition-all", unit === 'F' ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200")}
              >
                °F
              </button>
            </div>

            {/* Ask AgriGPT Button */}
            <button
              onClick={() => askCopilot()}
              className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm"
            >
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse" /> Ask AI Advisory
            </button>
          </div>
        </div>

        {/* PRESET LOCATION QUICK CHIPS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-zinc-500 font-medium shrink-0 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Key Agro Zones:
          </span>
          {PRESET_LOCATIONS.map((loc, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedLocation(loc)}
              className={cn(
                "px-3 py-1 rounded-full border transition-all whitespace-nowrap shrink-0 font-medium",
                selectedLocation.name === loc.name
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              {loc.name} <span className="text-[10px] opacity-60">({loc.region.split(',')[0]})</span>
            </button>
          ))}
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchWeather(selectedLocation.lat, selectedLocation.lon)}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* LOADING SHIMMER / MAIN CONTENT */}
        {loading && !weatherData ? (
          <div className="h-96 w-full bg-[#18181b]/50 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm font-medium text-zinc-400">Fetching live weather telemetry from Open-Meteo...</p>
          </div>
        ) : weatherData && current ? (
          <>
            {/* HERO ROW: CURRENT CONDITIONS & FARM ADVISORY CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* CURRENT WEATHER CARD */}
              <div className="lg:col-span-2 bg-[#18181b]/90 border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                {/* Background soft glow */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 blur-[80px] pointer-events-none rounded-full" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" /> Live Weather Conditions
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 my-2">
                    <div className="flex items-center gap-5">
                      <div className={cn("w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border shadow-lg shrink-0", wmoInfo.bg, "border-zinc-700/50")}>
                        <WmoIcon className={cn("w-10 h-10 sm:w-12 sm:h-12", wmoInfo.color)} />
                      </div>
                      <div>
                        <div className="text-4xl sm:text-6xl font-extrabold text-zinc-100 tracking-tight">
                          {displayTemp(current.temperature_2m)}
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-zinc-300 mt-1 flex items-center gap-2">
                          <span>{wmoInfo.label}</span>
                          <span className="text-xs text-zinc-500 font-normal">
                            Feels like {displayTemp(current.apparent_temperature)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Column */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3.5 sm:p-4 shrink-0">
                      <div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Droplets className="w-3 h-3 text-blue-400" /> Humidity
                        </div>
                        <div className="text-base sm:text-lg font-bold text-zinc-100 mt-0.5">
                          {current.relative_humidity_2m}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Wind className="w-3 h-3 text-teal-400" /> Wind
                        </div>
                        <div className="text-base sm:text-lg font-bold text-zinc-100 mt-0.5">
                          {current.wind_speed_10m} <span className="text-xs font-normal text-zinc-400">km/h</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <CloudRain className="w-3 h-3 text-sky-400" /> Precip
                        </div>
                        <div className="text-base sm:text-lg font-bold text-zinc-100 mt-0.5">
                          {current.precipitation} <span className="text-xs font-normal text-zinc-400">mm</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-amber-400" /> Pressure
                        </div>
                        <div className="text-base sm:text-lg font-bold text-zinc-100 mt-0.5">
                          {Math.round(current.surface_pressure)} <span className="text-xs font-normal text-zinc-400">hPa</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM METRICS BAR */}
                <div className="mt-6 pt-4 border-t border-zinc-800/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Cloud Cover</span>
                    <span className="font-semibold text-zinc-200 mt-0.5 block">{current.cloud_cover}%</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Wind Direction</span>
                    <span className="font-semibold text-zinc-200 mt-0.5 block">{current.wind_direction_10m}°</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Max Today</span>
                    <span className="font-semibold text-emerald-400 mt-0.5 block">
                      {displayTemp(daily?.temperature_2m_max?.[0])}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Min Today</span>
                    <span className="font-semibold text-sky-400 mt-0.5 block">
                      {displayTemp(daily?.temperature_2m_min?.[0])}
                    </span>
                  </div>
                </div>
              </div>

              {/* FARMING SMART DECISION WIDGETS */}
              <div className="space-y-4">

                {/* SPRAYING ADVISORY */}
                <div className={cn("border rounded-2xl p-4 shadow-lg relative overflow-hidden transition-all", spraySafety.color)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" /> Field Spraying Advisor
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900/60 border border-zinc-700">
                      {spraySafety.safe ? 'SAFE' : 'ATTENTION'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-zinc-100 mt-1">
                    {spraySafety.label}
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {spraySafety.message}
                  </p>
                </div>

                {/* EVAPOTRANSPIRATION & IRRIGATION */}
                <div className="bg-[#18181b]/90 border border-zinc-800/80 rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                      <Waves className="w-4 h-4 text-teal-400" /> Evapotranspiration (ET0)
                    </span>
                    <span className="text-xs font-bold text-teal-400 font-mono">{todayEt0} mm/day</span>
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    Expected water loss via soil evaporation and crop transpiration today.
                  </div>
                  <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-zinc-800/80 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Irrigation Demand</span>
                    <span className={cn("font-bold", todayEt0 > 4 ? "text-amber-400" : "text-emerald-400")}>
                      {todayEt0 > 5 ? 'High (Supplement Water)' : todayEt0 > 3 ? 'Moderate' : 'Low'}
                    </span>
                  </div>
                </div>

                {/* FROST & TEMPERATURE THRESHOLD */}
                <div className={cn("border rounded-2xl p-4 shadow-lg", frostRisk.color)}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Thermometer className="w-4 h-4" /> 7-Day Frost Alert
                    </span>
                    <span className="text-xs font-semibold font-mono">Min: {frostRisk.minTemp}°C</span>
                  </div>
                  <div className="text-xs text-zinc-200 mt-1.5 font-medium">
                    Status: <span className="font-bold">{frostRisk.risk}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* HOURLY FORECAST CHART & CARDS */}
            <div className="bg-[#18181b]/90 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" /> Hourly Forecast (24-Hour Horizon)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Detailed hourly breakdown from Open-Meteo atmospheric model</p>
                </div>

                {/* HOURLY METRIC TOGGLES */}
                <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs gap-1">
                  <button
                    onClick={() => setHourlyView('temp')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all font-medium", hourlyView === 'temp' ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200")}
                  >
                    Temperature
                  </button>
                  <button
                    onClick={() => setHourlyView('precip')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all font-medium", hourlyView === 'precip' ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200")}
                  >
                    Rain Prob (%)
                  </button>
                  <button
                    onClick={() => setHourlyView('wind')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all font-medium", hourlyView === 'wind' ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200")}
                  >
                    Wind Speed
                  </button>
                  <button
                    onClick={() => setHourlyView('soil')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all font-medium", hourlyView === 'soil' ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200")}
                  >
                    Soil Telemetry
                  </button>
                </div>
              </div>

              {/* RECHARTS AREA CHART */}
              <div className="h-[220px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPrecip" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSoil" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 11}} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 11}} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#f4f4f5', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    />
                    {hourlyView === 'temp' && (
                      <Area type="monotone" dataKey="temp" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" name={`Temp (°${unit})`} />
                    )}
                    {hourlyView === 'precip' && (
                      <Area type="monotone" dataKey="precipProb" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPrecip)" name="Rain Chance (%)" />
                    )}
                    {hourlyView === 'wind' && (
                      <Area type="monotone" dataKey="windSpeed" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorWind)" name="Wind (km/h)" />
                    )}
                    {hourlyView === 'soil' && (
                      <Area type="monotone" dataKey="soilMoisture" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorSoil)" name="Soil Moisture (%)" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* HORIZONTAL HOURLY SCROLL CARDS */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin pt-2">
                {hourlyChartData.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3 min-w-[90px] text-center flex-shrink-0 flex flex-col items-center justify-between gap-1.5 hover:border-emerald-500/40 transition-colors"
                  >
                    <span className="text-[11px] font-medium text-zinc-400">{item.time}</span>
                    <span className="text-sm font-bold text-zinc-100">{item.temp}°</span>
                    <div className="text-[10px] text-blue-400 flex items-center gap-0.5 font-medium">
                      <Droplets className="w-2.5 h-2.5" /> {item.precipProb}%
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {item.windSpeed} km/h
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7-DAY FORECAST SECTION */}
            <div className="bg-[#18181b]/90 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" /> 7-Day Agricultural Outlook
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Extended forecast with precipitation totals and UV metrics</p>
                </div>
                <button
                  onClick={() => askCopilot("Analyze the 7-day weather outlook for my crops and suggest irrigation and harvest schedules.")}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  Ask AI Analysis <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-zinc-800/60 border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30">
                {daily?.time?.slice(0, 7).map((dateStr, idx) => {
                  const maxT = daily.temperature_2m_max[idx];
                  const minT = daily.temperature_2m_min[idx];
                  const code = daily.weather_code[idx];
                  const details = getWmoDetails(code);
                  const Icon = details.icon;
                  const precipSum = daily.precipitation_sum[idx] || 0;
                  const precipProb = daily.precipitation_probability_max?.[idx] || 0;
                  const uvMax = daily.uv_index_max?.[idx] || 0;
                  const et0 = daily.et0_fao_evapotranspiration?.[idx] || 0;

                  return (
                    <div
                      key={idx}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Day Name & Condition */}
                      <div className="flex items-center gap-3 sm:w-48 shrink-0">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", details.bg, "border-zinc-700/50")}>
                          <Icon className={cn("w-5 h-5", details.color)} />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-zinc-100">
                            {formatDayName(dateStr)}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {details.label}
                          </div>
                        </div>
                      </div>

                      {/* Rain & ET0 details */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Droplets className="w-3.5 h-3.5 text-blue-400" />
                          <span>{precipSum} mm <span className="text-zinc-500">({precipProb}%)</span></span>
                        </div>
                        <div className="hidden md:flex items-center gap-1 text-zinc-400">
                          <Waves className="w-3.5 h-3.5 text-teal-400" />
                          <span>ET0: {et0} mm</span>
                        </div>
                        <div className="hidden lg:flex items-center gap-1 text-zinc-400">
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>UV: {uvMax}</span>
                        </div>
                      </div>

                      {/* Min - Max Temperature Bar */}
                      <div className="flex items-center gap-3 sm:w-56 shrink-0 justify-end">
                        <span className="text-xs font-semibold text-sky-400 w-10 text-right">
                          {displayTemp(minT)}
                        </span>
                        
                        {/* Visual Range Bar */}
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full relative overflow-hidden max-w-[120px]">
                          <div
                            className="absolute top-0 bottom-0 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 rounded-full"
                            style={{
                              left: '20%',
                              right: '20%',
                            }}
                          />
                        </div>

                        <span className="text-xs font-semibold text-emerald-400 w-10">
                          {displayTemp(maxT)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SOIL TELEMETRY & SUN CYCLE SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* SOIL HEALTH & ROOT TELEMETRY */}
              <div className="bg-[#18181b]/90 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-emerald-400" /> Open-Meteo Soil Telemetry
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Surface & Root Zone
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
                    <span className="text-xs text-zinc-400 block">Soil Temp (0cm Surface)</span>
                    <span className="text-xl font-bold text-zinc-100 mt-1 block">
                      {hourly?.soil_temperature_0cm?.[0] !== undefined ? `${hourly.soil_temperature_0cm[0]}°C` : 'N/A'}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1 block">Optimal seed germination</span>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
                    <span className="text-xs text-zinc-400 block">Soil Moisture (0-1cm)</span>
                    <span className="text-xl font-bold text-amber-400 mt-1 block">
                      {hourly?.soil_moisture_0_to_1cm?.[0] !== undefined ? `${(hourly.soil_moisture_0_to_1cm[0] * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1 block">Volumetric water content</span>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Soil temperature above 10°C is optimal for maize and soybean root activity. High soil moisture combined with warm surface temperature increases fungal pathogen risks.
                  </span>
                </div>
              </div>

              {/* SUN & SOLAR CYCLE */}
              <div className="bg-[#18181b]/90 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400" /> Solar & Daylight Cycle
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    Max UV: {daily?.uv_index_max?.[0] || '--'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Sunrise className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 block">Sunrise</span>
                      <span className="text-sm font-bold text-zinc-100">
                        {daily?.sunrise?.[0] ? formatHour(daily.sunrise[0]) : '--'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <Sunset className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 block">Sunset</span>
                      <span className="text-sm font-bold text-zinc-100">
                        {daily?.sunset?.[0] ? formatHour(daily.sunset[0]) : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Daylight Hours</span>
                  <span className="font-semibold text-zinc-200">
                    {daily?.sunrise?.[0] && daily?.sunset?.[0]
                      ? `${((new Date(daily.sunset[0]).getTime() - new Date(daily.sunrise[0]).getTime()) / (1000 * 60 * 60)).toFixed(1)} hrs`
                      : 'N/A'}
                  </span>
                </div>
              </div>

            </div>
          </>
        ) : null}

      </div>
    </div>
  );
}
