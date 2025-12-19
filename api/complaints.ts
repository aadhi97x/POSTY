import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Complaint } from '../types';

// Simple in-memory storage for hackathon purposes.
// For production, connect to a database like MongoDB or PostgreSQL using a connection string.
let complaintsStore: Complaint[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers for local development if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // In a real app, you would filter by userId from a session/token
    return res.status(200).json(complaintsStore);
  }

  if (req.method === 'POST') {
    const { complaint, type } = req.body;

    if (type === 'CREATE') {
      complaintsStore = [complaint, ...complaintsStore];
      return res.status(201).json({ message: "Complaint saved to backend", complaint });
    }

    if (type === 'UPDATE_FEEDBACK') {
      const { id, rating, comment, timestamp } = req.body;
      complaintsStore = complaintsStore.map(c => 
        c.id === id ? { ...c, feedback: { rating, comment, timestamp } } : c
      );
      return res.status(200).json({ message: "Feedback updated" });
    }
    
    if (type === 'UPDATE_LIST') {
      complaintsStore = req.body.complaints;
      return res.status(200).json({ message: "Store synchronized" });
    }

    return res.status(400).json({ error: "Invalid action type" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}