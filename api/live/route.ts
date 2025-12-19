import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality } from "@google/genai";

/**
 * Note: Standard Vercel Serverless Functions do not support persistent WebSockets.
 * This route is provided to satisfy build requirements, but live audio should
 * typically be handled directly from the client using the browser SDK.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
     // ai.live.connect requires a model and a callbacks object.
     const _session = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
           onopen: () => { console.log("Session opened"); },
           onmessage: (msg) => { console.log("Message received", msg); },
           onclose: () => { console.log("Session closed"); },
           onerror: (err) => { console.error("Session error", err); }
        },
        config: {
           responseModalities: [Modality.AUDIO],
           systemInstruction: 'You are a helpful assistant.'
        }
     });

     return res.status(200).json({ message: "Gemini Live endpoint initialized. Use browser SDK for real-time audio." });
  } catch (e) {
     return res.status(500).json({ error: "Failed to initialize Live API" });
  }
}
