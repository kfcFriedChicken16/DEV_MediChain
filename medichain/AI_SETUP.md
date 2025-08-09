# AI Health Assistant Setup Guide

This guide explains how to set up and use the AI Health Assistant feature in MediChain.

## Features

The AI Assistant provides:
- **Medical Record Analysis**: Analyzes patient records and provides health insights
- **Health Chat**: Allows patients to ask questions about their health
- **Personalized Recommendations**: Suggests lifestyle changes based on medical data
- **Risk Assessment**: Identifies potential health concerns

## Setup Instructions

### 1. Get OpenRouter API Key

1. Visit [OpenRouter](https://openrouter.ai/)
2. Create an account and get your API key
3. The AI uses the free Horizon Beta model (256,000 context window)

### 2. Configure Environment Variables

Add your OpenRouter API key to your `.env.local` file:

```bash
# AI Assistant Configuration
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Test the AI Assistant

1. Start your development server: `npm run dev`
2. Navigate to `/ai-demo` to test with sample data
3. Or use the AI Assistant in the record review pages

## How It Works

### Medical Record Analysis

The AI analyzes medical records and provides:
- **Summary**: Brief overview of key findings
- **Health Insights**: Specific observations about the data
- **Recommendations**: Actionable lifestyle suggestions
- **Risk Factors**: Potential concerns to discuss with providers
- **Disclaimer**: Medical disclaimers and safety notices

### Health Chat

Patients can ask questions like:
- "What does my blood glucose level mean?"
- "How can I lower my cholesterol naturally?"
- "What lifestyle changes should I make?"
- "Are my blood pressure readings concerning?"

## Privacy & Security

- **No Medical Advice**: The AI provides informational content only
- **Clear Disclaimers**: Always recommends consulting healthcare professionals
- **Data Privacy**: Uses OpenRouter's secure API with proper headers
- **User Consent**: Users must actively choose to use AI features

## Example Analysis

For a patient with:
- Elevated blood glucose (125 mg/dL)
- High blood pressure (140/90 mmHg)
- High cholesterol (220 mg/dL)

The AI might suggest:
- Reducing sugar and refined carbohydrate intake
- Increasing physical activity
- Monitoring blood pressure regularly
- Consulting with a healthcare provider

## Troubleshooting

### Common Issues

1. **API Key Not Configured**
   - Error: "OpenRouter API key not configured"
   - Solution: Add your API key to `.env.local`

2. **API Request Failed**
   - Check your internet connection
   - Verify your API key is valid
   - Check OpenRouter service status

3. **Analysis Not Working**
   - Ensure medical record data is properly formatted
   - Check browser console for errors
   - Verify the record contains analyzable data

### Testing

Use the demo page at `/ai-demo` to test with sample data that includes:
- Vital signs (blood pressure, heart rate)
- Lab results (glucose, cholesterol)
- Medical history
- Medications
- Lifestyle factors

## Future Enhancements

Potential improvements:
- Trend analysis over time
- Integration with wearable devices
- Medication interaction checking
- Symptom tracking
- Appointment scheduling suggestions

## Support

For issues with the AI Assistant:
1. Check the browser console for errors
2. Verify your API key is working
3. Test with the demo page first
4. Contact the development team 