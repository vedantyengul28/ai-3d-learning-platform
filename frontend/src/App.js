import React, { useState, useEffect } from 'react';
import './App.css';
import TopicInput from './components/TopicInput';
import ContentDisplay from './components/ContentDisplay';
import Avatar3D from './components/Avatar3D';
import ProgressTracker from './components/ProgressTracker';
import { API_BASE_URL } from './config';

function App() {
  const [topic, setTopic] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [avatarType, setAvatarType] = useState('male'); // 'male' or 'female'
  const [progress, setProgress] = useState(0);
  const [restartCount, setRestartCount] = useState(0);
  const [backCount, setBackCount] = useState(0);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('sessionId');
    const savedTopic = localStorage.getItem('topic');
    const savedCurrentChapter = localStorage.getItem('currentChapter');
    const savedRestartCount = localStorage.getItem('restartCount');
    const savedBackCount = localStorage.getItem('backCount');

    if (savedSessionId && savedTopic) {
      setSessionId(savedSessionId);
      setTopic(savedTopic);
      setCurrentChapter(savedCurrentChapter ? parseInt(savedCurrentChapter) : 1);
      setRestartCount(savedRestartCount ? parseInt(savedRestartCount) : 0);
      setBackCount(savedBackCount ? parseInt(savedBackCount) : 0);
      
      // Fetch existing session data
      fetchSessionData(savedSessionId);
    }
  }, []);

  const fetchSessionData = async (sid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/content/${sid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.chapters && Array.isArray(data.chapters)) {
          setChapters(data.chapters);
          setCurrentChapter(data.currentChapter || 1);
          setProgress(data.progress || 0);
          setRestartCount(data.restartCount || 0);
          setBackCount(data.backCount || 0);
        } else {
          setChapters([]);
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      setChapters([]);
    }
  };

  const handleTopicSubmit = async (newTopic) => {
    const newSessionId = `session_${Date.now()}`;
    setTopic(newTopic);
    setSessionId(newSessionId);
    setCurrentChapter(1);
    setRestartCount(0);
    setBackCount(0);

    // Save to localStorage
    localStorage.setItem('sessionId', newSessionId);
    localStorage.setItem('topic', newTopic);
    localStorage.setItem('currentChapter', '1');
    localStorage.setItem('restartCount', '0');
    localStorage.setItem('backCount', '0');

    try {
      const response = await fetch(`${API_BASE_URL}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: newTopic,
          sessionId: newSessionId
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error generating content:', data);
        
        // Show user-friendly error messages
        if (response.status === 429 && (data.code === 'insufficient_quota' || data.code === 'quota_exceeded')) {
          alert(`API Quota Exceeded\n\n${data.message}\n\n${data.details || 'Please try again later or check your API usage.'}`);
        } else if (response.status === 401) {
          alert(`Invalid API Key\n\n${data.message || 'Your Gemini API key is invalid. Please check your backend .env file.'}\n\n${data.details || 'Get a free API key at https://makersuite.google.com/app/apikey'}`);
        } else {
          alert(`${data.error || 'Failed to generate content'}\n\n${data.message || data.details || 'Please try again or check your Gemini API configuration.'}`);
        }
        return;
      }

      if (data.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
        setChapters(data.chapters);
        setCurrentChapter(data.currentChapter || 1);
        setProgress(data.progress || 0);
      } else {
        console.error('Invalid response from API:', data);
        alert('Failed to generate content. Invalid response from server.');
        setChapters([]);
      }

      if (data.usedFallback) {
        console.log('Using fallback content. Check OpenAI API key configuration for AI-generated content.');
        // Optionally show a non-intrusive notification instead of alert
        // You can implement a toast notification here if desired
      }
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    }
  };

  const handleChapterChange = async (newChapter, isRestart = false, isBack = false) => {
    if (!chapters || chapters.length === 0) return;
    if (newChapter < 1 || newChapter > chapters.length) return;

    let newRestartCount = restartCount;
    let newBackCount = backCount;

    if (isRestart && newChapter === 1) {
      newRestartCount = restartCount + 1;
      setRestartCount(newRestartCount);
    }

    if (isBack && newChapter < currentChapter) {
      newBackCount = backCount + 1;
      setBackCount(newBackCount);
    }

    setCurrentChapter(newChapter);
    const newProgress = Math.round((newChapter / chapters.length) * 100);
    setProgress(newProgress);

    // Update localStorage
    localStorage.setItem('currentChapter', newChapter.toString());
    localStorage.setItem('restartCount', newRestartCount.toString());
    localStorage.setItem('backCount', newBackCount.toString());

    // Update backend
    if (sessionId) {
      try {
        await fetch(`${API_BASE_URL}/api/session/${sessionId}/progress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentChapter: newChapter,
            restartCount: newRestartCount,
            backCount: newBackCount
          })
        });
      } catch (error) {
        console.error('Error updating session:', error);
      }
    }
  };

  return (
    <div className="App">
      <div className="app-container">
        <div className="left-panel">
          <ContentDisplay
            chapters={chapters}
            currentChapter={currentChapter}
            onChapterChange={handleChapterChange}
            sessionId={sessionId}
            avatarType={avatarType}
          />
        </div>
        <div className="right-panel">
          <TopicInput onSubmit={handleTopicSubmit} currentTopic={topic} />
          <Avatar3D avatarType={avatarType} onAvatarChange={setAvatarType} />
          <ProgressTracker
            progress={progress}
            currentChapter={currentChapter}
            totalChapters={chapters && chapters.length ? chapters.length : 0}
            restartCount={restartCount}
            backCount={backCount}
          />
        </div>
      </div>
    </div>
  );
}

export default App;


