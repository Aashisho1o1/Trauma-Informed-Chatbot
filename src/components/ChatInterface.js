import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import MessageBubble from './MessageBubble';
import ConsentCheckpoint from './ConsentCheckpoint';
import ChatOptions from './ChatOptions';
import InputToggle from './InputToggle';
import ImageBasedInput from './ImageBasedInput';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const ALLOWED_MODES = new Set(['report', 'support', 'talk']);

const CLIENT_FALLBACK_BY_LANGUAGE = {
  en: "I'm having a little trouble connecting right now. If you need immediate help, call 911 or the National Domestic Violence Hotline at 1-800-799-7233.",
  es: 'Estoy teniendo un problema de conexion en este momento. Si necesitas ayuda inmediata, llama al 911 o a la linea nacional contra la violencia domestica al 1-800-799-7233.'
};

const normalizeLanguage = (language) => (language === 'es' ? 'es' : 'en');

const toApiHistory = (messages) => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message.sender === 'user' || message.sender === 'bot')
    .slice(-10)
    .map((message) => ({
      role: message.sender === 'user' ? 'user' : 'assistant',
      content: message.text
    }));
};

const ChatInterface = ({ userPreferences }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const queryParams = new URLSearchParams(location.search);
  const requestedMode = queryParams.get('mode') || 'talk';
  const chatMode = ALLOWED_MODES.has(requestedMode) ? requestedMode : 'talk';

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentCheckpoints, setConsentCheckpoints] = useState(0);
  const [showOptions, setShowOptions] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState('text');

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const language = normalizeLanguage(userPreferences.language);

  const talkOptions = useMemo(() => {
    const question = t('options.emotionalFirst');
    const splitOptions = question.split(' or ').map((item) => item.trim()).filter(Boolean);

    if (splitOptions.length >= 2) {
      return [splitOptions[0], splitOptions[1]];
    }

    return [t('support.resourceTitle'), t('welcome.options.report')];
  }, [t]);

  useEffect(() => {
    let initialMessage = '';

    switch (chatMode) {
      case 'report':
        initialMessage = `${t('report.consentReminder')} ${t('report.anonymousOption')} ${t('report.identifiedOption')}`;
        break;
      case 'support':
        initialMessage = t('support.resourceTitle');
        break;
      case 'talk':
        initialMessage = t('options.noDecision');
        break;
      default:
        initialMessage = t('welcome.intro');
    }

    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: initialMessage,
        timestamp: new Date(),
        isCrisis: false
      }
    ]);

    setShowOptions(true);
    setShowConsent(false);
    setConsentCheckpoints(0);
  }, [chatMode, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (transcript && inputMode === 'voice') {
      setInputMessage(transcript);
    }
  }, [transcript, inputMode]);

  useEffect(() => {
    if (inputMode === 'voice' && browserSupportsSpeechRecognition && !listening) {
      SpeechRecognition.startListening({
        continuous: true,
        language: language === 'es' ? 'es-ES' : 'en-US'
      });
    }

    if (inputMode !== 'voice' && listening) {
      SpeechRecognition.stopListening();
    }
  }, [browserSupportsSpeechRecognition, inputMode, language, listening]);

  const appendAssistantMessage = (text, isCrisis = false) => {
    const assistantMessage = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      sender: 'bot',
      text,
      timestamp: new Date(),
      isCrisis
    };

    setMessages((prevMessages) => [...prevMessages, assistantMessage]);
  };

  const sendUserMessage = async (rawMessage) => {
    const messageText = rawMessage?.trim();
    if (!messageText || isProcessing || showConsent) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: messageText,
      timestamp: new Date(),
      isCrisis: false
    };

    const conversationHistory = toApiHistory(messages);
    const userMessageCount = messages.filter((message) => message.sender === 'user').length + 1;

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setShowOptions(false);
    setInputMessage('');
    resetTranscript();
    setIsTyping(true);
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationHistory,
          mode: chatMode,
          language
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data?.response || CLIENT_FALLBACK_BY_LANGUAGE[language];
      appendAssistantMessage(assistantText, Boolean(data?.is_crisis));
    } catch (error) {
      appendAssistantMessage(CLIENT_FALLBACK_BY_LANGUAGE[language], false);
    } finally {
      setIsTyping(false);
      setIsProcessing(false);

      if (userMessageCount % 3 === 0) {
        setShowConsent(true);
        setConsentCheckpoints((prevCount) => prevCount + 1);
      }
    }
  };

  const handleSendMessage = () => {
    const sourceText = inputMode === 'voice' ? transcript : inputMessage;
    sendUserMessage(sourceText);
  };

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      return;
    }

    resetTranscript();
    SpeechRecognition.startListening({
      continuous: true,
      language: language === 'es' ? 'es-ES' : 'en-US'
    });
  };

  const handleConsentResponse = (consented) => {
    setShowConsent(false);

    if (consented) {
      appendAssistantMessage(
        consentCheckpoints > 2 ? t('validation.brave') : t('chat.consentCheck'),
        false
      );

      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    navigate('/');
  };

  const handleOptionSelect = (option) => {
    sendUserMessage(option);
  };

  const handleImageSelect = (meaning) => {
    sendUserMessage(meaning);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>
          {chatMode === 'report'
            ? t('welcome.options.report')
            : chatMode === 'support'
              ? t('welcome.options.support')
              : t('welcome.options.talk')}
        </h2>

        {userPreferences.anonymousMode && (
          <div className="anonymous-indicator" aria-live="polite">
            <span role="img" aria-label="Anonymous Mode Active">🔒</span> {t('common.anonymousMode')}
          </div>
        )}
      </div>

      <div className="chat-messages" aria-live="polite">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            largeText={userPreferences.largeText}
          />
        ))}

        {isTyping && (
          <div className="message bot-message typing-indicator">
            <span>{t('chat.responseLoading')}</span>
            <span className="dots">...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showConsent && (
        <ConsentCheckpoint
          onResponse={handleConsentResponse}
          checkpointNumber={consentCheckpoints}
        />
      )}

      {showOptions && chatMode === 'report' && (
        <ChatOptions
          options={[t('report.anonymousOption'), t('report.identifiedOption')]}
          onSelect={handleOptionSelect}
        />
      )}

      {showOptions && chatMode === 'support' && (
        <ChatOptions
          options={[
            t('support.crisisLine'),
            t('support.therapy'),
            t('support.community'),
            t('support.advocate')
          ]}
          onSelect={handleOptionSelect}
        />
      )}

      {showOptions && chatMode === 'talk' && (
        <ChatOptions
          options={talkOptions}
          onSelect={handleOptionSelect}
        />
      )}

      <InputToggle
        activeInput={inputMode}
        onChange={setInputMode}
      />

      {inputMode === 'text' && (
        <div className="chat-input">
          <input
            type="text"
            ref={inputRef}
            value={inputMessage}
            onChange={(event) => setInputMessage(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && !isProcessing && handleSendMessage()}
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.placeholder')}
            disabled={isProcessing || showConsent}
          />

          <button
            className="btn btn-primary send-btn"
            onClick={handleSendMessage}
            disabled={inputMessage.trim() === '' || isProcessing || showConsent}
            aria-label={t('common.submit')}
          >
            <span role="img" aria-hidden="true">➤</span>
          </button>
        </div>
      )}

      {inputMode === 'voice' && (
        <div className="chat-input voice-input">
          <div className="transcript-display">
            {transcript || t('chat.voicePrompt')}
          </div>

          <button
            className={`voice-input-btn ${listening ? 'listening' : ''}`}
            onClick={toggleListening}
            disabled={isProcessing || showConsent || !browserSupportsSpeechRecognition}
            aria-label={listening ? 'Stop voice input' : t('chat.voiceInput')}
          >
            <span role="img" aria-hidden="true">🎤</span>
          </button>

          <button
            className="btn btn-primary send-btn"
            onClick={handleSendMessage}
            disabled={!transcript || isProcessing || showConsent}
            aria-label={t('common.submit')}
          >
            <span role="img" aria-hidden="true">➤</span>
          </button>
        </div>
      )}

      {inputMode === 'image' && (
        <ImageBasedInput onImageSelect={handleImageSelect} />
      )}

      <div className="privacy-notice">
        <small>
          {userPreferences.anonymousMode
            ? `🔒 ${t('privacy.anonymous')}`
            : `${t('privacy.mandatoryReporting')}`}
        </small>
      </div>
    </div>
  );
};

export default ChatInterface;
