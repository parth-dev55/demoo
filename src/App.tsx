/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdvisorChat } from './pages/AdvisorChat';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { WeatherDashboard } from './pages/WeatherDashboard';
import { ThreeDView } from './pages/ThreeDView';
import { AgroStore } from './pages/AgroStore';
import { DiseaseScan } from './pages/DiseaseScan';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ChatProvider } from './contexts/ChatContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { LoadingPage } from './components/LoadingPage';

export default function App() {
  const [isBooting, setIsBooting] = React.useState(true);

  return (
    <AuthProvider>
      <LanguageProvider>
        <ChatProvider>
          <CartProvider>
            <BrowserRouter>
          {isBooting ? (
            <LoadingPage 
              autoRedirect={true} 
              onComplete={() => setIsBooting(false)} 
            />
          ) : (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/loading" element={<LoadingPage standalone={true} targetPath="/" />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<AdvisorChat />} />
                  <Route path="3d-view" element={<ThreeDView />} />
                  <Route path="store" element={<AgroStore />} />
                  <Route path="analytics" element={<AnalyticsDashboard />} />
                  <Route path="weather" element={<WeatherDashboard />} />
                  <Route path="scan" element={<DiseaseScan />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          )}
        </BrowserRouter>
          </CartProvider>
        </ChatProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}


