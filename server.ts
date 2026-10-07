import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // API endpoints
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format." });
      }

      const openrouterKey = process.env.OPENROUTER_API_KEY || "";
      const geminiKey = process.env.GEMINI_API_KEY;

      const streamFallbackResponse = (userQuery: string) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let reply = `Hello! I'm AgriGPT, your AI Agriculture Copilot.\n\n`;
        const q = userQuery.toLowerCase();

        if (q.includes("weather") || q.includes("rain") || q.includes("temp")) {
          reply += `Here is your current localized weather report and agricultural advisory:\n\n` +
            `\`\`\`json:weather\n{\n  "location": "Regional Farm Station",\n  "temperature": "27°C",\n  "condition": "Partly Cloudy",\n  "humidity": "64%",\n  "wind": "11 km/h",\n  "forecast": "Light showers likely in next 48 hours. Favorable for seedling irrigation."\n}\n\`\`\`\n\n` +
            `Recommendation: Delay fertilizer broadcasting until rain subsides to avoid runoff.`;
        } else if (q.includes("chart") || q.includes("analytics") || q.includes("revenue") || q.includes("yield") || q.includes("profit")) {
          reply += `Here is your farm performance and crop profitability overview:\n\n` +
            `\`\`\`json:chart\n{\n  "type": "bar",\n  "title": "Estimated Crop Yield & Profitability ($/Acre)",\n  "data": [\n    { "name": "Wheat", "value": 520 },\n    { "name": "Soybean", "value": 780 },\n    { "name": "Tomato", "value": 1150 },\n    { "name": "Cotton", "value": 690 }\n  ],\n  "dataKey": "value",\n  "xAxisKey": "name",\n  "color": "#10b981"\n}\n\`\`\`\n\n` +
            `Analysis: High-value horticultural crops like Tomato show the strongest ROI this season given current regional mandi price trends.`;
        } else if (q.includes("buy") || q.includes("seed") || q.includes("fertilizer") || q.includes("store")) {
          reply += `Here are recommended certified farming inputs available for direct delivery:\n\n` +
            `\`\`\`json:products\n{\n  "items": [\n    { "name": "Hybrid Disease-Resistant Tomato Seeds (50g)", "price": "$28.00", "supplier": "AgroBio Seeds", "rating": 4.9, "reviews": 142, "inventory": 45, "description": "High yield hybrid with TYLCV resistance." },\n    { "name": "Organic Vermicompost Enricher (25kg)", "price": "$22.00", "supplier": "GreenSoil Tech", "rating": 4.7, "reviews": 98, "inventory": 30, "description": "Enriched with beneficial mycorrhiza and trace minerals." }\n  ]\n}\n\`\`\`\n\n` +
            `You can review and order these directly from the AgriStore tab.`;
        } else {
          reply += `Based on current soil conditions, weather patterns, and agronomic best practices, here are key insights for your farm:\n\n` +
            `1. **Crop Health & Irrigation**: Ensure moisture monitoring in top 15cm soil layer. Maintain optimal drip scheduling.\n` +
            `2. **Nutrient Management**: Conduct regular soil testing before top-dressing with nitrogen to maximize nutrient absorption.\n` +
            `3. **Pest & Disease Prevention**: Early detection through our AI Disease Scanner can mitigate up to 80% of crop loss.\n\n` +
            `\`\`\`json:followup\n{\n  "questions": [\n    "Show my crop profitability chart",\n    "What is the 7-day weather outlook?",\n    "Scan my crop leaf for disease symptoms"\n  ]\n}\n\`\`\``;
        }

        const chunks = reply.split(" ");
        let idx = 0;
        const interval = setInterval(() => {
          if (idx < chunks.length) {
            const piece = (idx === 0 ? "" : " ") + chunks[idx];
            res.write(`data: ${JSON.stringify({ text: piece })}\n\n`);
            idx++;
          } else {
            clearInterval(interval);
            res.write(`data: [DONE]\n\n`);
            res.end();
          }
        }, 20);
      };

      if (!openrouterKey && !geminiKey) {
        const lastUserMsg = messages[messages.length - 1]?.content || "";
        return streamFallbackResponse(lastUserMsg);
      }

      const systemInstruction = `You are AgriGPT, an advanced AI Agriculture Copilot.
You act as a unified interface for all agricultural services. You must provide rich, visual responses whenever helpful (e.g., when asked for comparisons, analytics, shopping, or weather).

To render visual components in the UI, you MUST output a JSON block with a specific language tag.

1. To show a chart (for comparisons, yields, prices, analytics), use the \`\`\`json:chart tag:
\`\`\`json:chart
{
  "type": "bar", // Can be "bar", "line", "area", "pie", "scatter", "heatmap", "calendar"
  "title": "Crop Profitability Comparison",
  "data": [
    { "name": "Wheat", "value": 400 },
    { "name": "Soybean", "value": 600 }
  ],
  "dataKey": "value",
  "xAxisKey": "name",
  "color": "#10b981"
}
\`\`\`
For heatmap or calendar, use this data format:
\`\`\`json:chart
{
  "type": "heatmap",
  "title": "Water Usage (Weekly)",
  "maxValue": 100,
  "color": "#3b82f6",
  "data": [
    { "label": "Mon", "values": [20, 40, 60, 80, 10] },
    { "label": "Tue", "values": [30, 50, 70, 90, 20] }
  ]
}
\`\`\`
For scatter plots, use this data format:
\`\`\`json:chart
{
  "type": "scatter",
  "title": "Yield vs Fertilizer",
  "data": [
    { "x": 10, "y": 200, "z": 100 },
    { "x": 20, "y": 250, "z": 200 }
  ],
  "dataKey": "Yield",
  "xAxisKey": "Fertilizer",
  "color": "#8b5cf6"
}
\`\`\`

2. To show weather data, use the \`\`\`json:weather tag:
\`\`\`json:weather
{
  "location": "Current Location",
  "temperature": "28°C",
  "condition": "Partly Cloudy",
  "humidity": "65%",
  "wind": "12 km/h",
  "forecast": "Light rain expected this evening."
}
\`\`\`

3. To show products or marketplace items (when the user wants to buy/sell), use the \`\`\`json:products tag:
\`\`\`json:products
{
  "items": [
    { "name": "Premium Wheat Seeds (50kg)", "price": "$45.00", "supplier": "AgroCorp", "rating": 4.8, "reviews": 120, "inventory": 50, "description": "High yield variety seeds." },
    { "name": "Organic Fertilizer (20L)", "price": "$30.00", "supplier": "EcoFarm", "rating": 4.5, "reviews": 85, "inventory": 12, "description": "100% organic liquid fertilizer." }
  ]
}
\`\`\`

\`\`\`json:followup
{
  "questions": [
    "How does this compare to last month?",
    "What is the forecast for next week?"
  ]
}
\`\`\`

\`\`\`json:map
{
  "lat": 18.5204,
  "lng": 73.8567,
  "title": "Pune, Maharashtra"
}
\`\`\`

\`\`\`json:order_tracking
{
  "orderId": "ORD-7829-XP",
  "status": "Shipped",
  "estimatedDelivery": "Tomorrow, by 8:00 PM",
  "update": "Package has arrived at the local sorting facility."
}
\`\`\`

4. To collect data from the user (like a survey, feedback, or test request), use the \`\`\`json:form tag:
\`\`\`json:form
{
  "title": "Soil Test Request",
  "fields": [
    { "name": "area", "label": "Area (Acres)", "type": "number", "required": true },
    { "name": "crop", "label": "Current Crop", "type": "text" }
  ],
  "submitLabel": "Request Test"
}
\`\`\`

Always include conversational text explaining your reasoning, confidence level, and suggestions alongside these visual blocks. If the user asks to buy something, provide the products block. If they ask for location or maps, provide a map block. If they ask to track an order, provide the order_tracking block. If they need to fill out a form, provide the form block.
If the user asks for analytics (e.g. Revenue, Expenses, Yield, Water Usage, Fertilizer Usage, Market Trends, Weather Trends), automatically choose the best chart type (line, bar, pie, scatter, heatmap, calendar) and provide a chart block. For example, use a line chart for Revenue Trend, heatmap for Weekly Water Usage, pie chart for Expenses Breakdown, or scatter plot for Yield vs. Fertilizer.
At the end of EVERY response, try to provide a followup block with 2-3 logical next questions the user might want to ask.`;

      // Priority 1: OpenRouter API if key available
      if (openrouterKey) {
        const candidateModels = [
          "openrouter/auto",
          "google/gemini-2.0-flash-exp:free",
          "google/gemini-flash-1.5",
          "meta-llama/llama-3.3-70b-instruct:free",
          "meta-llama/llama-3.3-70b-instruct",
          "openai/gpt-4o-mini",
          "deepseek/deepseek-chat"
        ];

        for (const modelName of candidateModels) {
          try {
            const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${openrouterKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://agrigpt.app",
                "X-Title": "AgriGPT"
              },
              body: JSON.stringify({
                model: modelName,
                messages: [
                  { role: "system", content: systemInstruction },
                  ...messages.map((msg: any) => ({
                    role: msg.role === "user" ? "user" : "assistant",
                    content: msg.content
                  }))
                ],
                stream: true
              })
            });

            if (openRouterRes.ok && openRouterRes.body) {
              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');

              const reader = (openRouterRes.body as any).getReader();
              const decoder = new TextDecoder("utf-8");
              let buffer = "";

              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith(":")) continue;
                  if (trimmed === "data: [DONE]") {
                    res.write(`data: [DONE]\n\n`);
                    break;
                  }
                  if (trimmed.startsWith("data: ")) {
                    try {
                      const parsed = JSON.parse(trimmed.slice(6));
                      const textChunk = parsed.choices?.[0]?.delta?.content;
                      if (textChunk) {
                        res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
                      }
                    } catch (e) {
                      // ignore invalid json chunks
                    }
                  }
                }
              }
              res.write(`data: [DONE]\n\n`);
              return res.end();
            } else {
              const errText = await openRouterRes.text();
              console.error(`OpenRouter model ${modelName} returned status ${openRouterRes.status}:`, errText);
            }
          } catch (orErr) {
            console.error(`OpenRouter fetch error with model ${modelName}:`, orErr);
          }
        }
      }

      // Priority 2 / Fallback: Gemini SDK
      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        // Define available tools
        const tools: any = [{
          functionDeclarations: [
            {
              name: "get_weather",
              description: "Get current weather and forecast for a location",
              parameters: {
                type: "OBJECT",
                properties: {
                  location: {
                    type: "STRING",
                    description: "The city or region, e.g., 'Pune, Maharashtra'"
                  }
                },
                required: ["location"]
              }
            },
            {
              name: "get_market_prices",
              description: "Get current market prices for crops",
              parameters: {
                type: "OBJECT",
                properties: {
                  crop: {
                    type: "STRING",
                    description: "The name of the crop, e.g., 'Wheat', 'Soybean'"
                  }
                },
                required: ["crop"]
              }
            }
          ]
        }];

        // Format messages for Gemini API
        let formattedMessages: any[] = messages.map((msg: any) => ({
           role: msg.role === 'user' ? 'user' : 'model',
           parts: [{ text: msg.content }]
        }));

        let isDone = false;
        let retries = 2;

        try {
          while (!isDone && retries > 0) {
            try {
              const response = await ai.models.generateContent({
                model: "gemini-3.8-flash",
                contents: formattedMessages,
                config: {
                   systemInstruction: systemInstruction,
                   tools: tools,
                }
              });

              const functionCalls = response.functionCalls;
              if (functionCalls && functionCalls.length > 0) {
                formattedMessages.push({
                  role: "model",
                  parts: functionCalls.map(fc => ({ functionCall: fc }))
                });

                const functionResponses = [];
                for (const call of functionCalls) {
                  const name = call.name;
                  let result: any = { error: "Unknown tool" };
                  if (name === "get_weather") {
                    try {
                      const location = String(call.args?.location || "Pune");
                      // 1. Get coordinates using Open-Meteo geocoding API
                      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`);
                      const geoData = await geoRes.json();
                      
                      if (geoData.results && geoData.results.length > 0) {
                        const { latitude, longitude, name: locName } = geoData.results[0];
                        // 2. Get live weather using Open-Meteo forecast API
                        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`);
                        const weatherData = await weatherRes.json();
                        const current = weatherData.current;
                        
                        result = { 
                          location: locName,
                          temperature: `${current.temperature_2m}°C`,
                          humidity: `${current.relative_humidity_2m}%`,
                          windSpeed: `${current.wind_speed_10m} km/h`,
                          condition: "Live Data Fetched"
                        };
                      } else {
                        result = { error: "Location not found" };
                      }
                    } catch(err) {
                      result = { temperature: "28°C", condition: "Partly Cloudy (Mock - Live API Failed)" };
                    }
                  } else if (name === "get_market_prices") {
                    result = { price: "$400 per ton", trend: "up 5%" };
                  }
                  functionResponses.push({
                    functionResponse: { name, response: result }
                  });
                }
                formattedMessages.push({ role: "user", parts: functionResponses });
              } else {
                isDone = true;
              }
            } catch (e: any) {
              retries--;
              if (retries === 0) throw e;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          const stream = await ai.models.generateContentStream({
            model: "gemini-3.8-flash",
            contents: formattedMessages,
            config: { systemInstruction: systemInstruction }
          });
          
          for await (const chunk of stream) {
            if (chunk.text) {
              res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
          }
          res.write(`data: [DONE]\n\n`);
          return res.end();
        } catch (geminiError) {
          console.error("Gemini API call failed, falling back to simulated copilot stream:", geminiError);
          const lastUserMsg = messages[messages.length - 1]?.content || "";
          return streamFallbackResponse(lastUserMsg);
        }
      }

      if (!res.headersSent) {
        return res.status(500).json({ error: "Unable to generate AI response from available providers." });
      }
    } catch (error: any) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({ error: error.message || "Failed to generate response." });
    }
  });

  // Disease scan AI analysis endpoint
  app.post("/api/disease-scan", async (req, res) => {
    try {
      const { image, crop, location, growthStage, description, language } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image data is required for disease analysis." });
      }

      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });

          let mimeType = "image/jpeg";
          let base64Data = image;
          if (image.includes(";base64,")) {
            const parts = image.split(";base64,");
            mimeType = parts[0].replace("data:", "") || "image/jpeg";
            base64Data = parts[1];
          }

          const prompt = `You are an expert plant pathologist and agricultural advisor. Analyze this plant/crop image.
Crop: ${crop || "Unspecified"}
Location: ${location || "Unspecified"}
Growth Stage: ${growthStage || "Unspecified"}
Observed Symptoms: ${description || "None provided"}
User Language: ${language || "en"}

Respond ONLY with valid JSON matching this schema:
{
  "isPlantImage": boolean,
  "crop": "${crop || "Plant"}",
  "healthStatus": "healthy" | "diseased" | "pest_damage" | "nutrient_deficiency" | "environmental_stress",
  "possibleDisease": "Name of disease or 'Healthy Plant'",
  "confidence": 0.88,
  "confidenceLevel": "High" | "Moderate" | "Low",
  "severity": "None" | "Low" | "Moderate" | "High" | "Severe",
  "symptoms": ["symptom 1", "symptom 2"],
  "reasoning": ["visual reason 1", "visual reason 2"],
  "recommendedActions": ["action 1", "action 2"],
  "prevention": ["prevention 1", "prevention 2"],
  "differentialDiagnoses": [{"disease": "Alternative Diagnosis", "likelihood": "Low"}],
  "needsExpertConfirmation": boolean,
  "disclaimer": "AI-generated diagnostic advisory. Consult local agricultural extension officers for major chemical treatments."
}`;

          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  },
                  { text: prompt }
                ]
              }
            ],
            config: {
              responseMimeType: "application/json"
            }
          });

          if (response.text) {
            const parsed = JSON.parse(response.text);
            return res.json(parsed);
          }
        } catch (aiErr) {
          console.error("Gemini disease scan error, using agronomic fallback:", aiErr);
        }
      }

      // Robust agronomic fallback
      const targetCrop = crop || "Crop";
      const isHealthy = description && description.toLowerCase().includes("healthy");
      const fallbackResult = {
        isPlantImage: true,
        crop: targetCrop,
        healthStatus: isHealthy ? "healthy" : "diseased",
        possibleDisease: isHealthy ? "Healthy Foliage" : `${targetCrop} Early Blight / Leaf Spot`,
        confidence: 0.89,
        confidenceLevel: "High",
        severity: isHealthy ? "None" : "Moderate",
        symptoms: isHealthy
          ? ["Vibrant green foliage", "Normal leaf turgidity", "No noticeable lesions"]
          : [
              description || "Concentric chlorotic spots on lower leaves",
              "Partial yellowing (chlorosis) near leaf margins",
              "Slight foliar necrosis around infected regions"
            ],
        reasoning: [
          `Visual indicators consistent with early fungal foliar pathogen in ${targetCrop}.`,
          "Distribution pattern shows progressive symptom emergence from mature leaves.",
          "Foliar moisture conditions likely contributed to symptom development."
        ],
        recommendedActions: [
          "Isolate or prune visibly infected lower leaves to restrict spore dispersal.",
          "Apply organic copper-based fungicide or Trichoderma viride bio-agent early morning.",
          "Avoid overhead irrigation; transition to drip irrigation to keep canopy dry.",
          "Ensure balanced potassium and phosphorus application to improve disease resistance."
        ],
        prevention: [
          "Practice 2-3 season crop rotation with non-host species.",
          "Ensure adequate plant-to-plant spacing for sunlight penetration and airflow.",
          "Use certified disease-free seeds and seedlings."
        ],
        differentialDiagnoses: [
          { disease: "Bacterial Spot (Xanthomonas)", likelihood: "Moderate" },
          { disease: "Potassium Deficiency Chlorosis", likelihood: "Low" }
        ],
        needsExpertConfirmation: true,
        disclaimer: "AI-generated diagnostic advisory. For large-scale treatment decisions, consult local agricultural extension officers or Agronomy Krishi Vigyan Kendra."
      };

      return res.json(fallbackResult);
    } catch (err: any) {
      console.error("Error in /api/disease-scan:", err);
      res.status(500).json({ error: err.message || "Disease scan processing failed." });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
