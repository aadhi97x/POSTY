import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GroundingLink } from "../types";

// --- INITIALIZATION ---
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/* -------------------------------
   AUDIO UTILS (Browser-only)
-------------------------------- */

export const decodeAudio = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

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

/* -------------------------------
   CORE AI SERVICES
-------------------------------- */

// 🔹 Calls Vercel backend for transcription (or implements directly)
export async function transcribeAudio(
  base64Audio: string,
  mimeType: string
): Promise<string> {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64: base64Audio,
      mimeType: mimeType,
    }),
  });

  if (!res.ok) {
    throw new Error("Transcription request failed");
  }

  const data = await res.json();
  return data.text || "";
}

// 🔹 Find Nearby Branches using Google Maps Grounding
export async function findNearbyBranches(latitude: number, longitude: number) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Find 3 nearest India Post branches or Post Offices to my current location.",
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: { latitude, longitude }
        }
      }
    },
  });

  const links: string[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.maps?.uri)
    .map(chunk => chunk.maps!.uri!) || [];

  return {
    text: response.text,
    links
  };
}

// 🔹 Comprehensive Complaint Analysis
export async function analyzeComplaint(description: string, imageBase64?: string, context?: string, trackingNumber?: string) {
  const ai = getAI();
  const parts: any[] = [{ text: `Analyze this India Post complaint. Citizen context: ${context || 'N/A'}. Tracking Number: ${trackingNumber || 'N/A'}. Description: ${description}` }];
  
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
    console.error("Failed to parse analysis JSON", e);
    return null;
  }
}

// 🔹 Extract Details from Image (OCR + Logic)
export async function extractDetailsFromImage(imageBase64: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: imageBase64.split(',')[1], mimeType: "image/jpeg" } },
        { text: "Extract the India Post Tracking Number (usually 13 chars, starts/ends with letters) and the Post Office name mentioned in this document/receipt." }
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

// 🔹 Translation and Refinement
export async function translateAndRefine(text: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following text to professional English and refine it as an official India Post grievance description. Text: "${text}"`,
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

// 🔹 Polish Agent Draft
export async function polishDraft(text: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Polish the following response from a postal officer to a citizen. Make it more professional, empathetic, and clear. Original: "${text}"`,
  });
  return response.text;
}

// 🔹 Chat Assistant with Search Grounding
export async function getQuickSupport(query: string, history: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `User Query: ${query}\nUser Complaint History:\n${history}\nYou are Dak-Mitra, an India Post AI. Help the user. Use search if needed for current rules/rates.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const links: GroundingLink[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    .map(chunk => ({
      title: chunk.web!.title || "India Post Resource",
      uri: chunk.web!.uri!
    })) || [];

  return {
    text: response.text,
    links
  };
}

// 🔹 Text to Speech
export async function generateSpeech(text: string): Promise<string | undefined> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
