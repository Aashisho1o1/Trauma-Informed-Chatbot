import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WelcomePage from './components/WelcomePage';
import ChatInterface from './components/ChatInterface';
import PrivacyPolicy from './components/PrivacyPolicy';
import GroundingExercises from './components/GroundingExercises';
import EmergencyResources from './components/EmergencyResources';
import SafeExit from './components/SafeExit';
import EmergencyButton from './components/EmergencyButton';
import GroundMeButton from './components/GroundMeButton';
import LanguageSelector from './components/LanguageSelector';

function App() {
  const { t, i18n } = useTranslation();
  const [userPreferences, setUserPreferences] = useState({
    language: i18n.language?.startsWith('es') ? 'es' : 'en',
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    anonymousMode: true
  });

  const updatePreferences = (newPrefs) => {
    setUserPreferences((prevPreferences) => ({ ...prevPreferences, ...newPrefs }));
  };

  const handleLanguageChange = (lang) => {
    updatePreferences({ language: lang });
    i18n.changeLanguage(lang);
  };

  // Quick exit to a safe website
  const handleSafeExit = () => {
    window.location.href = 'https://www.cgu.edu';
  };

  return (
    <div className={`app-container ${userPreferences.highContrast ? 'high-contrast' : ''} 
                    ${userPreferences.largeText ? 'large-text' : ''} 
                    ${userPreferences.reduceMotion ? 'reduce-motion' : ''}`}>
      
      <LanguageSelector 
        currentLanguage={userPreferences.language} 
        onLanguageChange={handleLanguageChange}
      />
      
      <Routes>
        <Route path="/" element={<WelcomePage userPreferences={userPreferences} updatePreferences={updatePreferences} />} />
        <Route path="/chat" element={<ChatInterface userPreferences={userPreferences} />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/grounding" element={<GroundingExercises />} />
        <Route path="/emergency" element={<EmergencyResources />} />
        <Route path="/exit" element={<SafeExit />} />
      </Routes>
      
      <EmergencyButton onEmergencyClick={() => window.location.href = '/emergency'} />
      <GroundMeButton onGroundMeClick={() => window.location.href = '/grounding'} />
      
      {/* Safe Exit Button - always visible */}
      <button 
        className="exit-button fixed-button"
        onClick={handleSafeExit}
        aria-label={t('common.safeExit')}
      >
        {t('common.safeExit')}
      </button>
    </div>
  );
}

export default App; 
