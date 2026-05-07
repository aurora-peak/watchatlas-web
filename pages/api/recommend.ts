import type { NextApiRequest, NextApiResponse } from "next";
import { getAIRecommendations } from "@/lib/gemini";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Invalid prompt" });
  }

  try {
    const recommendations = await getAIRecommendations(prompt);
    return res.status(200).json({ recommendations });
  } catch (error: any) {
    console.error("API /recommend error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate recommendations" });
  }
}
