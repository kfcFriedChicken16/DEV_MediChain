'use client';

import React, { useState } from 'react';
import { aiService, MedicalAnalysis, MedicalRecord } from '@/lib/ai';

import { toast } from 'react-hot-toast';
import Button from '@/components/ui/Button';

interface AIAssistantProps {
  record?: MedicalRecord;
  onAnalysisComplete?: (analysis: MedicalAnalysis) => void;
}

export default function AIAssistant({ record, onAnalysisComplete }: AIAssistantProps) {

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MedicalAnalysis | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{question: string, answer: string}>>([]);

  const handleAnalyzeRecord = async () => {
    if (!record) {
      toast.error('No record available for analysis');
      return;
    }

    try {
      setIsAnalyzing(true);
      toast.loading('Analyzing medical record...', { id: 'analyze-record' });
      
      const result = await aiService.analyzeMedicalRecord(record, 'en');
      setAnalysis(result);
      onAnalysisComplete?.(result);
      
      toast.success('Analysis completed!', { id: 'analyze-record' });
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze record', { id: 'analyze-record' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    try {
      setIsAsking(true);
      toast.loading('Getting health advice...', { id: 'ask-question' });
      
      const answer = await aiService.getHealthAdvice(question, record, 'en');
      
      setChatHistory(prev => [...prev, { question, answer }]);
      setQuestion('');
      
      toast.success('Response received!', { id: 'ask-question' });
    } catch (error) {
      console.error('Question error:', error);
      toast.error('Failed to get response', { id: 'ask-question' });
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">AI Health Analysis</h3>
          <div className="flex space-x-2">
            <Button
              onClick={handleAnalyzeRecord}
              isLoading={isAnalyzing}
              disabled={isAnalyzing || !record}
              size="sm"
            >
              {analysis ? 'Re-analyze' : 'Analyze Record'}
            </Button>
            <Button
              onClick={() => setShowChat(!showChat)}
              variant="outline"
              size="sm"
            >
              {showChat ? 'Hide Chat' : 'Health Chat'}
            </Button>
          </div>
        </div>

        {analysis && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
              <p className="text-blue-800">{analysis.summary}</p>
            </div>

            {/* Health Insights */}
            {analysis.healthInsights.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Health Insights</h4>
                <ul className="space-y-2">
                  {analysis.healthInsights.map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Factors */}
            {analysis.riskFactors.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Risk Factors</h4>
                <ul className="space-y-2">
                  {analysis.riskFactors.map((risk, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-2">Important Disclaimer</h4>
              <p className="text-yellow-800 text-sm">{analysis.disclaimer}</p>
            </div>
          </div>
        )}

        {!analysis && record && (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-gray-500">Click "Analyze Record" to get AI-powered health insights</p>
          </div>
        )}
      </div>

      {/* Chat Section */}
      {showChat && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Health Chat Assistant</h3>
          
          {/* Chat History */}
          {chatHistory.length > 0 && (
            <div className="mb-4 max-h-64 overflow-y-auto space-y-3">
              {chatHistory.map((chat, index) => (
                <div key={index} className="space-y-2">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">You:</p>
                    <p className="text-blue-800">{chat.question}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">AI Assistant:</p>
                    <p className="text-gray-800">{chat.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Question Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about your health, medications, or lifestyle..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
            />
            <Button
              onClick={handleAskQuestion}
              isLoading={isAsking}
              disabled={isAsking || !question.trim()}
              size="sm"
            >
              Ask
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            💡 Ask questions about your health, medications, or lifestyle. Remember, this is for informational purposes only.
          </p>
        </div>
      )}
    </div>
  );
} 