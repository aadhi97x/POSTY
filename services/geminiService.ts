
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GroundingLink } from "../types";

// --- INITIALIZATION ---
export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/* -------------------------------
   AUDIO UTILS
-------------------------------- */

export const encodeAudio = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudio = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> => {
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
};

export const createBlobFromPCM = (data: Float32Array): { data: string, mimeType: string } => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encodeAudio(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
};

/* -------------------------------
   CORE AI SERVICES
-------------------------------- */

export const analyzeVoiceRecording = async (params: { base64Audio: string, mimeType: string }): Promise<string> => {
  const { base64Audio, mimeType } = params;
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType.split(";")[0], data: base64Audio } },
        { text: `Transcribe this POSTY citizen recording. 
                 If the language is not English, translate it to natural English. 
                 Keep the output direct and clear. Preserve tracking numbers (e.g. EB123456789IN).
                 Output ONLY the transcribed/translated text.` }
      ],
    },
  });
  return response.text?.trim() || "";
};

export const analyzeComplaint = async (params: { description: string, imageBase64?: string, context?: string, trackingNumber?: string }) => {
  const { description, imageBase64, context, trackingNumber } = params;
  const ai = getAI();
  const parts: any[] = [{ text: `Analyze this POSTY complaint. Context: ${context || 'N/A'}. Tracking: ${trackingNumber || 'N/A'}. Description: ${description}` }];
  
  if (imageBase64) {
    const data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    parts.push({
      inlineData: {
        data: data,
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
    console.error("Failed to parse complaint analysis", e);
    return null;
  }
};

export const extractDetailsFromImage = async (imageBase64: string) => {
  const ai = getAI();
  const data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: data, mimeType: "image/jpeg" } },
        { text: `Examine this image of a POSTY receipt, consignment, or postcard. 
        Perform deep OCR and entity extraction to identify:
        1. Tracking Number: Usually starts with two letters (e.g., EF, EB, RT) and ends with 'IN'.
        2. Sender Details: Name, full Address, and 6-digit PIN code from the 'From' section.
        3. Receiver Details: Name, full Address, and 6-digit PIN code from the 'To' section.
        4. Post Office: The originating branch name if visible (often near 'At+PO' or on stamps).
        
        Return the result in the specified JSON format. If a field is not found, return an empty string.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          trackingNumber: { type: Type.STRING },
          postOffice: { type: Type.STRING },
          senderName: { type: Type.STRING },
          senderAddress: { type: Type.STRING },
          senderPin: { type: Type.STRING },
          receiverName: { type: Type.STRING },
          receiverAddress: { type: Type.STRING },
          receiverPin: { type: Type.STRING }
        }
      }
    }
  });
  
  try {
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    console.error("Extraction JSON parse error", e);
    return null;
  }
};

export const translateAndRefine = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate and refine as official POSTY grievance: "${text}"`,
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
};

export const getQuickSupport = async (query: string, history: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Query: ${query}\nHistory:\n${history}\nYou are Dak-Mitra, POSTY AI assistant. Be professional.`,
    config: { tools: [{ googleSearch: {} }] }
  });

  const links: GroundingLink[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    .map(chunk => ({ title: chunk.web!.title || "Resource", uri: chunk.web!.uri! })) || [];

  return { text: response.text, links };
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
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
};

export const findNearbyBranches = async (latitude: number, longitude: number) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Find the 3 nearest POSTY branches for the user based on their current location.",
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
};

export const polishDraft = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Polish this response to a citizen as a professional POSTY officer: "${text}"`,
  });
  return response.text;
};
