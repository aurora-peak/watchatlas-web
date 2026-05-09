export type AIRecommendation = {
  title: string;
  year: string;
  type: "movie" | "tv";
  reason: string;
};

const DEFAULT_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash"];

function getGeminiModels(): string[] {
  const configuredModels = process.env.GEMINI_MODELS ?? process.env.GEMINI_MODEL;

  if (!configuredModels) {
    return DEFAULT_GEMINI_MODELS;
  }

  const models = configuredModels
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return models.length > 0 ? models : DEFAULT_GEMINI_MODELS;
}

export async function getAIRecommendations(prompt: string): Promise<AIRecommendation[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }

  const models = getGeminiModels();

  const systemPrompt = `You are an expert movie and TV show recommendation engine.
The user will provide a mood or request. You must recommend exactly 5 titles.
Your response MUST be a raw JSON array. DO NOT wrap the JSON in markdown formatting blocks like \`\`\`json.
Each object in the array must have the following keys exactly:
- "title": The name of the movie or TV show.
- "year": The release year as a string (e.g., "1999").
- "type": Either "movie" or "tv".
- "reason": A short 1-sentence reason why it matches the user's request.

Example output:
[
  {
    "title": "The Matrix",
    "year": "1999",
    "type": "movie",
    "reason": "A mind-bending sci-fi classic."
  }
]
`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nUser Request: ${prompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
      responseMimeType: "application/json"
    }
  };

  const errors: string[] = [];
  const requestJson = JSON.stringify(requestBody);

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey.trim(),
        },
        body: requestJson,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error (${model}):`, errorText);
      errors.push(`${model}: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`);

      if (response.status === 404) {
        continue;
      }

      throw new Error(`Gemini API failed on ${model}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error(`Invalid response format from Gemini model ${model}`);
    }

    try {
      const parsed = JSON.parse(textContent);
      return parsed as AIRecommendation[];
    } catch (error) {
      console.error(`Failed to parse Gemini JSON output (${model}):`, textContent);
      throw new Error("Failed to parse AI recommendations");
    }
  }

  throw new Error(`Gemini API failed for all configured models. ${errors.join(" | ")}`);
}
