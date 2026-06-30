import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

  app.post("/api/detect-pothole", async (req, res) => {
    try {
      const { image, filename } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image data is required (base64)." });
      }

      // Parse base64 without regex over the entire string to avoid CPU blocking on large payloads
      if (!image.startsWith("data:")) {
        return res.status(400).json({ error: "Invalid base64 image format." });
      }
      const commaIndex = image.indexOf(",");
      if (commaIndex === -1) {
        return res.status(400).json({ error: "Invalid base64 image format." });
      }
      const header = image.slice(0, commaIndex);
      const base64Data = image.slice(commaIndex + 1);

      const mimeMatch = header.match(/data:([^;]+);base64/);
      if (!mimeMatch) {
        return res.status(400).json({ error: "Invalid base64 image format." });
      }
      const mimeType = mimeMatch[1];
      const buffer = Buffer.from(base64Data, "base64");

      const tempDir = path.join(process.cwd(), "scratch", "temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Sanitize the file extension and use a clean timestamped filename to prevent space/quoting bugs
      const ext = path.extname(filename || "image.jpg") || ".jpg";
      const tempInputPath = path.join(tempDir, `input_${Date.now()}${ext}`);
      const tempOutputPath = path.join(tempDir, `output_${Date.now()}${ext}`);

      fs.writeFileSync(tempInputPath, buffer);

      const { execFile } = await import("child_process");
      const executeYOLO = () => {
        return new Promise<any>((resolve, reject) => {
          // Use execFile to run python safely on Windows without shell interpolation or quoting issues
          execFile("python", ["detect.py", tempInputPath, tempOutputPath], (err, stdout, stderr) => {
            if (err) {
              return reject(err);
            }
            try {
              const stdoutStr = stdout.trim();
              const jsonStartIndex = stdoutStr.indexOf("{");
              const jsonEndIndex = stdoutStr.lastIndexOf("}");
              if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                const jsonStr = stdoutStr.slice(jsonStartIndex, jsonEndIndex + 1);
                const result = JSON.parse(jsonStr);
                resolve(result);
              } else {
                reject(new Error(`No JSON output found in stdout: ${stdout}`));
              }
            } catch (e) {
              reject(new Error(`Failed to parse Python output: ${stdout}`));
            }
          });
        });
      };

      let yoloResult: any = null;
      let missingDependencies = false;

      try {
        yoloResult = await executeYOLO();
        if (!yoloResult.success && yoloResult.error === "MissingDependencies") {
          missingDependencies = true;
        }
      } catch (yoloErr) {
        console.warn("YOLO execution failed, falling back to Gemini:", yoloErr);
        missingDependencies = true;
      }

      // Clean up inputs if YOLO worked
      if (yoloResult && yoloResult.success) {
        const outputBuffer = fs.readFileSync(tempOutputPath);
        const outputBase64 = `data:${mimeType};base64,${outputBuffer.toString("base64")}`;

        try {
          fs.unlinkSync(tempInputPath);
          fs.unlinkSync(tempOutputPath);
        } catch (cleanErr) { }

        return res.json({
          provider: "YOLOv8 Local Model",
          pothole_count: yoloResult.pothole_count,
          damage_percentage: yoloResult.damage_percentage,
          severity: yoloResult.severity,
          description: yoloResult.description,
          title: `${yoloResult.severity} Severity Road Hazard`,
          annotatedImage: outputBase64
        });
      }

      // Fallback to Gemini Vision API if YOLO dependencies are missing
      if (missingDependencies) {
        if (!ai) {
          return res.status(500).json({ error: "Gemini API Key is not configured on the server." });
        }

        console.log("Using Gemini Vision for pothole detection (YOLO dependencies missing)...");
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            "Analyze this road segment photo. Detect if there are potholes or road damage hazards. Return a JSON object with: 1. pothole_count (integer), 2. damage_percentage (float, estimated area percentage of the road surface that is damaged, e.g., 5.4), 3. severity ('Low', 'Moderate', 'High', 'Critical'), 4. description (a brief professional dispatch description under 120 characters), 5. title (a suggested professional title, e.g., 'Large Crater near Bellandur'). Return ONLY raw JSON, do not wrap in markdown ```json."
          ]
        });

        const responseText = response.text;
        if (!responseText) {
          throw new Error("Empty response from Gemini Vision API.");
        }

        let cleanJsonText = responseText.trim();
        if (cleanJsonText.startsWith("```")) {
          cleanJsonText = cleanJsonText.replace(/^```json\s*|```$/g, "");
        }

        const geminiResult = JSON.parse(cleanJsonText);

        try {
          fs.unlinkSync(tempInputPath);
        } catch (cleanErr) { }

        return res.json({
          provider: "Gemini Vision AI (Fallback)",
          pothole_count: Number(geminiResult.pothole_count || 0),
          damage_percentage: Number(geminiResult.damage_percentage || 0.0),
          severity: geminiResult.severity || "Moderate",
          description: geminiResult.description || "Road damage detected.",
          title: geminiResult.title || "Road Surface Hazard",
          annotatedImage: image
        });
      }

      res.status(500).json({ error: yoloResult?.error || "Detection failed." });

    } catch (error: any) {
      console.error("Pothole detection failed:", error);
      res.status(500).json({ error: error.message || "Failed to process image detection." });
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
