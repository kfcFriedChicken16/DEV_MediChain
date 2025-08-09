export interface MedicalAnalysis {
  summary: string;
  healthInsights: string[];
  recommendations: string[];
  riskFactors: string[];
  disclaimer: string;
}

export interface MedicalRecord {
  id: string;
  timestamp: number;
  provider: string;
  cid: string;
  content?: any; // The actual medical record content
}

export class AIService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    // TODO: Replace with your new API key
    this.apiKey = "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";
    console.log('API Key loaded:', this.apiKey ? 'Present' : 'Missing');
  }

  private async makeRequest(prompt: string, language = 'en'): Promise<string> {
    console.log('API Key length:', this.apiKey ? this.apiKey.length : 0);
    console.log('API Key starts with:', this.apiKey ? this.apiKey.substring(0, 10) : 'none');
    
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      console.log('Making request to OpenRouter...');
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'MediDrop AI Assistant'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            {
              role: 'system',
              content: `You are a medical AI assistant that analyzes medical records and provides health insights. 
              You are NOT a doctor and cannot provide medical diagnosis. Your role is to:
              1. Analyze medical data for patterns and trends
              2. Provide general health recommendations based on common knowledge
              3. Identify potential risk factors that should be discussed with a healthcare provider
              4. Always include disclaimers about consulting healthcare professionals
              
              IMPORTANT: 
              - Always respond in clear, complete sentences. Never return JSON or incomplete responses.
              - Be helpful but cautious. Never make definitive medical claims.
              - RESPOND IN ${language === 'zh' ? 'CHINESE (中文)' : language === 'fr' ? 'FRENCH (Français)' : 'ENGLISH'} LANGUAGE ONLY.
              - Use appropriate medical terminology for the target language.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.2,
          timeout: 30000
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      return data.choices[0]?.message?.content || 'Unable to analyze record';
    } catch (error) {
      console.error('AI analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to analyze medical record: ${errorMessage}`);
    }
  }

  async analyzeMedicalRecord(record: MedicalRecord, language = 'en'): Promise<MedicalAnalysis> {
    const prompt = `Analyze this medical record and provide insights:

Record ID: ${record.id}
Date: ${new Date(record.timestamp * 1000).toLocaleDateString()}
Provider: ${record.provider}

Medical Data: ${JSON.stringify(record.content, null, 2)}

Please provide a comprehensive analysis in this format:

SUMMARY: [Brief summary of key findings in 2-3 sentences]

HEALTH INSIGHTS: 
- [Insight 1]
- [Insight 2] 
- [Insight 3]

RECOMMENDATIONS:
- [Recommendation 1]
- [Recommendation 2]
- [Recommendation 3]

RISK FACTORS:
- [Risk factor 1 if any]
- [Risk factor 2 if any]

DISCLAIMER: [Medical disclaimer about consulting healthcare professionals]

Please provide complete, well-formatted responses.`;

    try {
      const response = await this.makeRequest(prompt, language);
      
      // Parse the structured response
      const lines = response.split('\n');
      let summary = '';
      let healthInsights: string[] = [];
      let recommendations: string[] = [];
      let riskFactors: string[] = [];
      let disclaimer = '';

      let currentSection = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('SUMMARY:')) {
          currentSection = 'summary';
          summary = trimmedLine.replace('SUMMARY:', '').trim();
        } else if (trimmedLine.startsWith('HEALTH INSIGHTS:')) {
          currentSection = 'insights';
        } else if (trimmedLine.startsWith('RECOMMENDATIONS:')) {
          currentSection = 'recommendations';
        } else if (trimmedLine.startsWith('RISK FACTORS:')) {
          currentSection = 'risks';
        } else if (trimmedLine.startsWith('DISCLAIMER:')) {
          currentSection = 'disclaimer';
          disclaimer = trimmedLine.replace('DISCLAIMER:', '').trim();
        } else if (trimmedLine.startsWith('-') && trimmedLine.length > 1) {
          const item = trimmedLine.substring(1).trim();
          if (currentSection === 'insights') {
            healthInsights.push(item);
          } else if (currentSection === 'recommendations') {
            recommendations.push(item);
          } else if (currentSection === 'risks') {
            riskFactors.push(item);
          }
        }
      }

      return {
        summary: summary || 'Analysis completed successfully',
        healthInsights: healthInsights.length > 0 ? healthInsights : ['Analysis completed successfully'],
        recommendations: recommendations.length > 0 ? recommendations : ['Consult with your healthcare provider for personalized advice'],
        riskFactors: riskFactors.length > 0 ? riskFactors : ['No specific risks identified'],
        disclaimer: disclaimer || 'This analysis is for informational purposes only. Please consult with a healthcare professional for medical advice.'
      };
    } catch (error) {
      console.error('Analysis failed:', error);
      return {
        summary: 'Unable to analyze record at this time',
        healthInsights: [],
        recommendations: ['Please consult with your healthcare provider'],
        riskFactors: [],
        disclaimer: 'This analysis is for informational purposes only. Please consult with a healthcare professional for medical advice.'
      };
    }
  }

  async getHealthAdvice(question: string, recordContext?: MedicalRecord, language = 'en'): Promise<string> {
    console.log('Record context for health advice:', recordContext);
    
    const context = recordContext ? 
      `Context from medical record: ${JSON.stringify(recordContext.content, null, 2)}` : 
      'No specific medical record context provided';

    const prompt = `A patient is asking: "${question}"

Medical Record Context:
${context}

Please provide a helpful, complete response in 2-3 paragraphs. Remember:
- You are NOT a doctor
- Provide general health information only
- Always recommend consulting healthcare professionals for specific medical concerns
- Be encouraging but realistic
- Include relevant disclaimers
- Write in clear, complete sentences
- Never return JSON or incomplete responses

Provide a helpful response:`;

    try {
      const response = await this.makeRequest(prompt, language);
      return response;
    } catch (error) {
      console.error('Health advice error:', error);
      return 'I apologize, but I cannot provide specific medical advice. Please consult with your healthcare provider for personalized medical guidance.';
    }
  }
}

// Export a singleton instance
export const aiService = new AIService(); 