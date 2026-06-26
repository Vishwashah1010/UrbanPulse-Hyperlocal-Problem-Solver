import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize GoogleGenAI client (safe check if key exists)
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API Routes
  app.post("/api/gemini/categorize", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API Key is not configured on the server." });
      }

      const { title, description } = req.body;
      if (!description) {
        return res.status(400).json({ error: "Description is required for categorization." });
      }

      const prompt = `Analyze the following road hazard or civil issue details and categorize it:
Title: ${title || "Untitled"}
Description: ${description}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert civil engineer and municipal hazards dispatcher. Categorize the road hazard details into Category (e.g., Pothole, Sewer/Drainage, Debris, Road Signage, Traffic Light, Other), Severity (Critical, High, Moderate, Low), and provide a concise, professional Suggested Title. Also estimate the level of Urgency (Critical, High, Moderate, Low), Local Traffic Impact (Heavy, Moderate, Minor), and a Predicted SLA Resolution timeline (e.g., 'Typically fixed within 24 hours', 'Typically fixed within 48 hours', 'Typically fixed within 5 days' depending on severity and impact). Give a brief, single-sentence municipal rationale.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: "Category of the hazard (e.g., Pothole, Sewer/Drainage, Debris, Road Signage, Traffic Light, Other)"
              },
              severity: {
                type: Type.STRING,
                description: "Severity level: Critical, High, Moderate, Low"
              },
              urgency: {
                type: Type.STRING,
                description: "Urgency level: Critical, High, Moderate, Low"
              },
              trafficImpact: {
                type: Type.STRING,
                description: "Local traffic impact: Heavy, Moderate, Minor"
              },
              predictedSLA: {
                type: Type.STRING,
                description: "Predicted SLA Resolution timeframe (e.g., 'Typically fixed within 48 hours')"
              },
              suggestedTitle: {
                type: Type.STRING,
                description: "A concise, professional title summarizing the issue"
              },
              rationale: {
                type: Type.STRING,
                description: "A brief one-sentence reason for this classification"
              }
            },
            required: ["category", "severity", "urgency", "trafficImpact", "predictedSLA", "suggestedTitle", "rationale"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini API.");
      }

      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.error("Gemini categorization failed:", error);
      res.status(500).json({ error: error.message || "Failed to categorize hazard details." });
    }
  });

  app.post("/api/gemini/polish", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API Key is not configured on the server." });
      }

      const { description } = req.body;
      if (!description) {
        return res.status(400).json({ error: "Description is required for polishing." });
      }

      const prompt = `Rewrite the following road or civil hazard description into a highly professional, concise, and structured municipal dispatch log. Keep it clear, avoid flowery language, and make it actionable for repair crews:

Raw Description: "${description}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert dispatcher polishing public citizen feedback into clear, professional, concise municipal logs. Highlight risks and actionable elements briefly. Keep the total length under 150 characters and avoid commas since it is saved in a CSV file format.",
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini API.");
      }

      res.json({ polished: responseText.trim() });
    } catch (error: any) {
      console.error("Gemini description polish failed:", error);
      res.status(500).json({ error: error.message || "Failed to polish description." });
    }
  });

  app.post("/api/gemini/executive-summary", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API Key is not configured on the server." });
      }

      const { reports } = req.body;
      if (!reports || !Array.isArray(reports)) {
        return res.status(400).json({ error: "Reports array is required." });
      }

      // Format summary of reports
      const summaryText = reports.slice(0, 30).map(r => 
        `- [${r.Severity || 'Moderate'}] Title: ${r.Title || 'Untitled'}. Status: ${r.Status || 'Reported'}. Desc: ${r.Description || 'None'}`
      ).join("\n");

      const prompt = `Analyze the following municipal road hazards active registry log and generate a high-quality, professional executive briefing and dispatch instruction report for city maintenance crews:

Active Registry Log:
${summaryText || "No active issues reported yet."}

Please draft a professional 3-sentence summary highlighting:
1. The most critical hotspots/regions or clusters of issues.
2. An engineering assessment of key risks (traffic, public safety).
3. Clear actionable instructions for municipal dispatch and repair teams.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a Chief Civil Engineer and Director of Municipal Operations. Provide an incredibly professional, crisp, polished executive summary of the logged municipal issues. Output exactly three clean bullet points, each starting with an emoji and a short bold title. Keep the tone completely serious and highly professional. Limit each bullet point to a maximum of 15 words.",
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini API.");
      }

      res.json({ summary: responseText.trim() });
    } catch (error: any) {
      console.error("Gemini executive summary failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate executive summary." });
    }
  });

  // Vite middleware for development or serving build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
