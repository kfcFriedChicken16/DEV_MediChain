'use client';

import React, { useState, useRef, useEffect } from 'react';
import { aiService, MedicalRecord } from '@/lib/ai';
import { useRecordContext } from '@/context/RecordContext';
import { useWallet } from '@/context/WalletContext';

import { toast } from 'react-hot-toast';

export default function FloatingAIBot() {
  const { currentRecord, userType } = useRecordContext();
  const { isConnected } = useWallet();

  
  // Debug logging
  console.log('FloatingAIBot - Current record:', currentRecord);
  console.log('FloatingAIBot - User type:', userType);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{question: string, answer: string}>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [chatWidth, setChatWidth] = useState(400); // Default width
  const [isResizing, setIsResizing] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 300 && newWidth <= 800) { // Min 300px, Max 800px
      setChatWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    try {
      setIsAsking(true);
      toast.loading('Getting health advice...', { id: 'floating-ask' });
      
      const answer = await aiService.getHealthAdvice(question, currentRecord || undefined, 'en');
      
      setChatHistory(prev => [...prev, { question, answer }]);
      setQuestion('');
      
      toast.success('Response received!', { id: 'floating-ask' });
    } catch (error) {
      console.error('Question error:', error);
      toast.error('Failed to get response', { id: 'floating-ask' });
    } finally {
      setIsAsking(false);
    }
  };

     const handleAnalyzeRecord = async () => {
     if (!currentRecord) {
       toast.error('No medical record available for analysis');
       return;
     }

     try {
       setIsAnalyzing(true);
       const controller = new AbortController();
       setAbortController(controller);
       toast.loading('Analyzing medical record...', { id: 'floating-analyze' });
       
               const result = await aiService.analyzeMedicalRecord(currentRecord, 'en');
       
       if (controller.signal.aborted) {
         return; // Analysis was cancelled
       }
       
       setAnalysis(result);
       setShowAnalysis(true);
       
       toast.success('Analysis completed!', { id: 'floating-analyze' });
     } catch (error) {
       if (error instanceof Error && error.name === 'AbortError') {
         toast.error('Analysis cancelled', { id: 'floating-analyze' });
       } else {
         console.error('Analysis error:', error);
         toast.error('Failed to analyze record', { id: 'floating-analyze' });
       }
     } finally {
       setIsAnalyzing(false);
       setAbortController(null);
     }
   };

   const cancelAnalysis = () => {
     if (abortController) {
       abortController.abort();
       setIsAnalyzing(false);
       setAbortController(null);
       toast.error('Analysis cancelled', { id: 'floating-analyze' });
     }
   };

  const quickQuestions = [
    "What does this medical data mean?",
    "What lifestyle changes should I consider?",
    "Are there any concerns I should discuss with my doctor?",
    "What questions should I ask my healthcare provider?"
  ];

  return (
    <>
      {/* Floating Bot Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
          title="AI Health Assistant"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>
      </div>

             {/* Chat Interface */}
       {isOpen && (
         <div 
           className="fixed top-0 right-0 z-50 h-screen bg-white shadow-2xl border-l border-gray-200 transition-all duration-300"
           style={{ width: `${chatWidth}px` }}
         >
           {/* Resize Handle */}
           <div
             className="absolute left-0 top-0 w-1 h-full cursor-ew-resize bg-gray-300 hover:bg-blue-500 transition-colors"
             onMouseDown={handleMouseDown}
             title="Drag to resize"
           />
          {/* Header */}
                     <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="font-medium">AI Health Assistant</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:text-gray-200"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMinimized ? "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"} />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

                     {/* Content */}
           {!isMinimized && (
             <div className="flex flex-col h-full">
                             {/* Quick Actions */}
               {currentRecord && (
                 <div className="p-4 border-b border-gray-200">
                   <div className="flex items-center justify-between mb-3">
                     <span className="text-base font-medium text-gray-700">Quick Actions</span>
                     <div className="flex space-x-2">
                       {analysis && !showAnalysis && (
                         <button
                           onClick={() => setShowAnalysis(true)}
                           className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                         >
                           Show Analysis
                         </button>
                       )}
                       <button
                         onClick={isAnalyzing ? cancelAnalysis : handleAnalyzeRecord}
                         className={`text-sm px-3 py-1 rounded ${
                           isAnalyzing 
                             ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                             : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                         }`}
                       >
                         {isAnalyzing ? 'Cancel Analysis' : 'Analyze Record'}
                       </button>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     {quickQuestions.map((q, index) => (
                       <button
                         key={index}
                         onClick={() => setQuestion(q)}
                         className="text-sm text-left p-3 bg-gray-50 hover:bg-gray-100 rounded text-gray-700"
                       >
                         {q}
                       </button>
                     ))}
                   </div>
                 </div>
               )}

                                                           {/* Analysis Results */}
                {analysis && showAnalysis && (
                  <div className="p-3 border-b border-gray-200 bg-blue-50 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-900 text-base">Analysis Summary</h4>
                      <button
                        onClick={() => setShowAnalysis(false)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Hide
                      </button>
                    </div>
                    <p className="text-base text-blue-800 mb-3">{analysis.summary}</p>
                    {analysis.recommendations.length > 0 && (
                      <div className="mt-3">
                        <p className="text-base font-medium text-blue-900 mb-2">Recommendations:</p>
                        <ul className="text-base text-blue-800 space-y-2">
                          {analysis.recommendations.slice(0, 2).map((rec: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2 text-blue-600">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                             {/* Chat History */}
               <div 
                 ref={chatRef}
                 className="flex-1 overflow-y-auto p-4 space-y-3"
               >
                                   {chatHistory.length === 0 && !showAnalysis && (
                    <div className="text-center text-gray-500 text-base">
                      <p>👋 Hi! I'm your AI health assistant.</p>
                      <p className="mt-1">Ask me about your health or click "Analyze Record" to get insights.</p>
                      <p className="mt-2 text-sm">
                        💡 Need help with the dApp? Check out our{' '}
                        <a href="/help" className="text-blue-600 hover:underline">Help & FAQ page</a>
                      </p>
                    </div>
                  )}
                 
                 {chatHistory.map((chat, index) => (
                   <div key={index} className="space-y-3">
                     <div className="bg-blue-50 p-3 rounded-lg">
                       <p className="text-sm font-medium text-blue-900">You:</p>
                       <p className="text-sm text-blue-800 mt-1">{chat.question}</p>
                     </div>
                     <div className="bg-gray-50 p-3 rounded-lg">
                       <p className="text-sm font-medium text-gray-900">AI:</p>
                       <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{chat.answer}</p>
                     </div>
                   </div>
                 ))}
               </div>

                             {/* Input */}
               <div className="p-3 border-t border-gray-200 mt-auto">
                 <div className="flex space-x-2">
                   <input
                     type="text"
                     value={question}
                     onChange={(e) => setQuestion(e.target.value)}
                     placeholder="Ask about your health..."
                     className="flex-1 text-base border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                   />
                   <button
                     onClick={handleAskQuestion}
                     disabled={isAsking || !question.trim()}
                     className="bg-blue-600 text-white px-4 py-2 rounded-md text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isAsking ? '...' : 'Ask'}
                   </button>
                 </div>
                 <p className="text-sm text-gray-500 mt-2">
                   💡 For informational purposes only. Consult healthcare professionals for medical advice.
                 </p>
               </div>
            </div>
          )}
        </div>
      )}
    </>
  );
} 