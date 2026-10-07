-- AgriGPT - PostgreSQL / Supabase Database Schema
-- Production-ready schema for farm decision-support, AI advisory, predictions, and monitoring.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'farmer', -- farmer, agronomist, researcher, admin
    phone VARCHAR(50),
    preferred_language VARCHAR(10) DEFAULT 'en', -- en, hi, mr
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. FARMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    total_area_acres DECIMAL(10, 2) NOT NULL DEFAULT 1.0,
    elevation_meters DECIMAL(8, 2),
    climate_zone VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. FIELDS TABLE (Plots / Zones within a farm)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    area_acres DECIMAL(10, 2) NOT NULL,
    soil_type VARCHAR(100) DEFAULT 'Loamy', -- Loamy, Clay, Sandy, Black Cotton, Red Soil
    irrigation_type VARCHAR(100) DEFAULT 'Drip', -- Drip, Sprinkler, Flood, Rainfed
    polygon_coordinates JSONB, -- GeoJSON or array of lat/long points
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. CROPS TABLE (Planted crops in a field)
-- ============================================================================
CREATE TABLE IF NOT EXISTS crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    sowing_date DATE NOT NULL,
    expected_harvest_date DATE,
    growth_stage VARCHAR(50) DEFAULT 'Vegetative', -- Seedling, Vegetative, Flowering, Fruiting, Harvesting
    target_yield_tons DECIMAL(8, 2),
    actual_yield_tons DECIMAL(8, 2),
    status VARCHAR(50) DEFAULT 'Active', -- Active, Harvested, Failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. SOIL READINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS soil_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    moisture_percentage DECIMAL(5, 2), -- 0 - 100%
    temperature_celsius DECIMAL(5, 2),
    ph_level DECIMAL(4, 2), -- 0.0 - 14.0
    nitrogen_mg_kg DECIMAL(8, 2), -- NPK
    phosphorus_mg_kg DECIMAL(8, 2),
    potassium_mg_kg DECIMAL(8, 2),
    electrical_conductivity_ds_m DECIMAL(6, 2),
    organic_matter_percentage DECIMAL(5, 2),
    sensor_id VARCHAR(100),
    source VARCHAR(50) DEFAULT 'sensor' -- sensor, lab_test, manual_entry
);

-- ============================================================================
-- 6. WEATHER READINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS weather_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    temperature_celsius DECIMAL(5, 2) NOT NULL,
    humidity_percentage DECIMAL(5, 2) NOT NULL,
    apparent_temp_celsius DECIMAL(5, 2),
    rain_probability_pct DECIMAL(5, 2),
    rainfall_mm DECIMAL(7, 2) DEFAULT 0.0,
    wind_speed_kmh DECIMAL(6, 2),
    wind_direction_deg INT,
    weather_code INT,
    condition_text VARCHAR(100),
    uv_index DECIMAL(4, 1),
    forecast_json JSONB
);

-- ============================================================================
-- 7. CROP OBSERVATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS crop_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    observed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    observation_type VARCHAR(100) NOT NULL, -- growth_check, pest_sighting, weed_pressure, water_status
    notes TEXT,
    severity VARCHAR(50) DEFAULT 'Low', -- Low, Medium, High
    image_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- 8. DISEASE SCANS TABLE (Vision AI scan results)
-- ============================================================================
CREATE TABLE IF NOT EXISTS disease_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    image_url TEXT NOT NULL,
    crop_detected VARCHAR(100) NOT NULL,
    disease_detected VARCHAR(255) NOT NULL,
    is_plant_image BOOLEAN DEFAULT TRUE,
    confidence DECIMAL(5, 4) NOT NULL, -- 0.0000 - 1.0000
    confidence_level VARCHAR(50) DEFAULT 'High', -- High, Moderate, Low
    severity VARCHAR(50) DEFAULT 'Moderate', -- None, Low, Moderate, High, Severe
    symptoms JSONB DEFAULT '[]'::jsonb,
    reasoning JSONB DEFAULT '[]'::jsonb,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    prevention JSONB DEFAULT '[]'::jsonb,
    differential_diagnoses JSONB DEFAULT '[]'::jsonb,
    needs_expert_confirmation BOOLEAN DEFAULT FALSE,
    disclaimer TEXT
);

-- ============================================================================
-- 9. CHAT SESSIONS & MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'New Consultation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    visual_blocks JSONB, -- embedded charts, weather, products, forms
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. PREDICTIONS TABLE (AI & Rule-based stress and yield models)
-- ============================================================================
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
    predicted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    prediction_type VARCHAR(100) NOT NULL, -- WATER_STRESS, DISEASE_RISK, HEAT_STRESS, CROP_HEALTH
    risk_level VARCHAR(50) NOT NULL, -- LOW, MODERATE, HIGH, CRITICAL
    confidence DECIMAL(5, 4) NOT NULL,
    model_version VARCHAR(50) DEFAULT 'rule-v1', -- rule-v1, ml-v1
    input_snapshot JSONB NOT NULL,
    explanation TEXT NOT NULL,
    forecast_horizon_days INT DEFAULT 7
);

-- ============================================================================
-- 11. RECOMMENDATIONS TABLE (Actionable advisory engine)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100) NOT NULL, -- IRRIGATION, FERTILIZATION, PEST_CONTROL, HARVEST, GENERAL
    priority VARCHAR(50) NOT NULL, -- LOW, MEDIUM, HIGH, URGENT
    title VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    action_steps JSONB DEFAULT '[]'::jsonb,
    confidence DECIMAL(5, 4) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, COMPLETED, DISMISSED
    due_date DATE
);

-- ============================================================================
-- 12. TASKS TABLE (Farm Operations / Workflows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'FIELDWORK',
    status VARCHAR(50) DEFAULT 'TODO', -- TODO, IN_PROGRESS, DONE, CANCELLED
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 13. TRANSACTIONS TABLE (Store Purchases & Farm Accounting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL, -- INPUT_PURCHASE, HARVEST_SALE, EXPENSE
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- Seeds, Fertilizer, Pesticide, Equipment, Revenue
    quantity DECIMAL(10, 2),
    unit VARCHAR(50),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_status VARCHAR(50) DEFAULT 'COMPLETED', -- PENDING, COMPLETED, REFUNDED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_fields_farm_id ON fields(farm_id);
CREATE INDEX IF NOT EXISTS idx_crops_field_id ON crops(field_id);
CREATE INDEX IF NOT EXISTS idx_soil_readings_field_date ON soil_readings(field_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_weather_farm_date ON weather_readings(farm_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_disease_scans_user ON disease_scans(user_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_predictions_field ON predictions(field_id, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_field ON recommendations(field_id, generated_at DESC);
