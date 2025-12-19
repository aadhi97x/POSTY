import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GroundingLink } from "../types";

// --- INITIALIZATION ---
export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/* -------------------------------
   AUDIO UTILS
-------------------------------- */

export function encodeAudio(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeAudio(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createBlobFromPCM(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encodeAudio(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/* -------------------------------
   CORE AI SERVICES
-------------------------------- */

/**
 * Processes a full voice recording for transcription, translation, and refinement.
 * Updated to take a single object argument to satisfy caller signature expectations.
 */
export async function analyzeVoiceRecording(params: { base64Audio: string, mimeType: string }): Promise<string> {
  const { base64Audio, mimeType } = params;
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { inlineData: { mimeType: mimeType.split(";")[0], data: base64Audio } },
          { text: `Analyze this India Post citizen recording:
                   1. Transcribe the audio precisely.
                   2. If the language is not English, translate it to professional English.
                   3. Refine the text as a formal, official grievance description suitable for the India Post portal.
                   4. Ensure tracking numbers (e.g., EB123456789IN) or office names are preserved.
                   Output ONLY the final refined English text.` }
        ],
      },
    ],
  });
  return response.text?.trim() || "";
}

export async function analyzeComplaint(description: string, imageBase64?: string, context?: string, trackingNumber?: string) {
  const ai = getAI();
  const parts: any[] = [{ text: `Analyze this India Post complaint. Context: ${context || 'N/A'}. Tracking: ${trackingNumber || 'N/A'}. Description: ${description}` }];
  
  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: "image/jpeg"
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          sentiment: { type: Type.STRING },
          urgencyScore: { type: Type.NUMBER },
          priorityScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          suggestedResponse: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          intelligenceBriefing: {
            type: Type.OBJECT,
            properties: {
              riskAssessment: { type: Type.STRING },
              investigationStrategy: { type: Type.ARRAY, items: { type: Type.STRING } },
              logisticsAudit: { type: Type.STRING }
            }
          }
        },
        required: ["category", "sentiment", "priorityScore", "summary", "intelligenceBriefing"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return null;
  }
}

export async function extractDetailsFromImage(imageBase64: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: imageBase64.split(',')[1], mimeType: "image/jpeg" } },
        { text: "Extract Tracking Number and Post Office name." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          trackingNumber: { type: Type.STRING },
          postOffice: { type: Type.STRING }
        }
      }
    }
  });
  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return null;
  }
}

export async function translateAndRefine(text: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate and refine as official India Post grievance: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translated: { type: Type.STRING },
          originalLang: { type: Type.STRING }
        }
      }
    }
  });
  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { translated: text, originalLang: "Unknown" };
  }
}

export async function getQuickSupport(query: string, history: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Query: ${query}\nHistory:\n${history}\nYou are Dak-Mitra, India Post AI.`,
    config: { tools: [{ googleSearch: {} }] }
  });

  const links: GroundingLink[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    .map(chunk => ({ title: chunk.web!.title || "Resource", uri: chunk.web!.uri! })) || [];

  return { text: response.text, links };
}

export async function generateSpeech(text: string): Promise<string | undefined> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}

export async function findNearbyBranches(latitude: number, longitude: number) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Find 3 nearest India Post branches.",
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: { latLng: { latitude, longitude } }
      }
    },
  });

  const links: string[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.maps?.uri)
    .map(chunk => chunk.maps!.uri!) || [];

  return { text: response.text, links };
}

export async function polishDraft(text: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Polish this response: "${text}"`,
  });
  return response.text;
}
