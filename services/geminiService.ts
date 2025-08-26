import { GoogleGenAI, Type, GenerateVideosOperation } from "@google/genai";
import { StoryStructure, ImageAspectRatio } from '../types';
import { TEXT_MODEL, IMAGE_MODEL, VIDEO_MODEL, TTS_MODEL } from '../constants';

// IMPORTANT: This check is for client-side environments where process.env might not be defined.
// In a real production app, you'd handle this more robustly (e.g., server-side or build-time replacement).
const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
  ? process.env.API_KEY
  : (window as any).GEMINI_API_KEY;

if (!apiKey) {
    console.warn("API key not found. Please set GEMINI_API_KEY in your environment or window object.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'MISSING_API_KEY' });

export const generateStoryStructure = async (idea: string, promptTemplate: string): Promise<StoryStructure> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: promptTemplate.replace('{{idea}}', idea),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          logline: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  const jsonText = response.text.trim();
  return JSON.parse(jsonText) as StoryStructure;
};


export const generateScriptStream = async (sceneDescription: string, promptTemplate: string, onChunk: (text: string) => void) => {
  const stream = await ai.models.generateContentStream({
    model: TEXT_MODEL,
    contents: promptTemplate.replace('{{sceneDescription}}', sceneDescription),
  });

  for await (const chunk of stream) {
    onChunk(chunk.text);
  }
};

export const generateImagePrompt = async (script: string, globalStylePrompt: string, promptTemplate: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: promptTemplate.replace('{{script}}', script).replace('{{globalStylePrompt}}', globalStylePrompt),
    config: {
      thinkingConfig: { thinkingBudget: 0 } // low latency for this simple task
    }
  });
  return response.text.replace(/["']/g, "").trim(); // clean up quotes
};

export const generateImage = async (prompt: string, aspectRatio: ImageAspectRatio): Promise<string> => {
    const response = await ai.models.generateImages({
        model: IMAGE_MODEL,
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio
        },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const startVideoGeneration = async (prompt: string): Promise<GenerateVideosOperation> => {
  const operation = await ai.models.generateVideos({
    model: VIDEO_MODEL,
    prompt: prompt,
    config: { numberOfVideos: 1 }
  });
  return operation;
};

export const checkVideoStatus = async (operation: GenerateVideosOperation) => {
    const operationResult = await ai.operations.getVideosOperation({ operation: operation });
    return operationResult;
};

// AI Writer Assistant Functions
export const rewriteText = async (text: string, promptTemplate: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: promptTemplate.replace('{{text}}', text),
    config: { thinkingConfig: { thinkingBudget: 0 } }
  });
  return response.text.trim();
};

export const expandText = async (text: string, promptTemplate: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: promptTemplate.replace('{{text}}', text),
    config: { thinkingConfig: { thinkingBudget: 0 } }
  });
  return response.text.trim();
};

export const shrinkText = async (text: string, promptTemplate: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: promptTemplate.replace('{{text}}', text),
    config: { thinkingConfig: { thinkingBudget: 0 } }
  });
  return response.text.trim();
};

export const changeTone = async (text: string, tone: string, promptTemplate: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: promptTemplate.replace('{{text}}', text).replace('{{tone}}', tone),
    config: { thinkingConfig: { thinkingBudget: 0 } }
  });
  return response.text.trim();
};

// TTS and Music Helpers
const writeString = (view: DataView, offset: number, str: string) => {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
};

const pcmToWavDataUrl = (base64Pcm: string): string => {
  const pcmData = atob(base64Pcm);
  const pcmBytes = new Uint8Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    pcmBytes[i] = pcmData.charCodeAt(i);
  }

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + pcmBytes.length);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmBytes.length, true);

  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmBytes, headerSize);

  let binaryWav = '';
  for (let i = 0; i < wavBytes.length; i++) {
    binaryWav += String.fromCharCode(wavBytes[i]);
  }
  const base64Wav = btoa(binaryWav);
  
  return `data:audio/wav;base64,${base64Wav}`;
};

export const generateTTS = async (text: string, voice: string, promptTemplate: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: promptTemplate.replace('{{text}}', text),
        config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: voice,
                    }
                }
            }
        } as any // Use 'as any' for preview features not yet in the SDK types
    });
    
    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart || !audioPart.inlineData.data) {
        throw new Error("No audio data returned from API.");
    }
    const base64Pcm = audioPart.inlineData.data;

    return pcmToWavDataUrl(base64Pcm);
};

// Simulates music generation as there is no public "Liria" API.
// Returns a short, silent audio clip to allow the UI workflow to function.
export const generateMusic = (prompt: string, promptTemplate: string): Promise<string> => {
    console.log("Simulating music generation for prompt:", promptTemplate.replace('{{prompt}}', prompt));
    return new Promise(resolve => {
        setTimeout(() => {
            // This is a base64 encoded 2-second silent WAV file.
            const silentWav = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
            resolve(silentWav);
        }, 3000); // Simulate a 3-second generation time
    });
};