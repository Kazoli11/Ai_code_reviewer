import express from "express";
import cors from "cors";
import path from "path";
import crypto from "node:crypto";
import { fileURLToPath } from "url";
import "dotenv/config";

// Simple in-memory cache for API requests
const analysisCache = new Map<string, any>();

// Keep track of user-provided API keys and fallback mechanism
const API_KEYS = [].filter(Boolean) as string[];

// Push the environment variable key as a fallback too
if (process.env.GROQ_API_KEY && !API_KEYS.includes(process.env.GROQ_API_KEY)) {
  API_KEYS.push(process.env.GROQ_API_KEY);
}

let currentApiKeyIndex = 0;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Important: exit to allow a process manager to restart
  process.exit(1);
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Proxy route to fetch external content
  app.get("/api/fetch-url", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return res.status(400).json({ error: "Invalid protocol" });
      }
      const hostname = urlObj.hostname;
      if (
        hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname === '0.0.0.0' || 
        hostname === '::1' || 
        hostname.startsWith('10.') || 
        hostname.startsWith('192.168.') || 
        hostname.startsWith('172.16.')
      ) {
        return res.status(403).json({ error: "Access to private or local IP addresses is blocked." });
      }
    } catch (e) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    try {
      const axios = (await import("axios")).default;
      const response = await axios.get(url, {
        responseType: 'text',
        headers: {
          'User-Agent': 'AI-Code-Reviewer'
        }
      });
      res.send(response.data);
    } catch (error: any) {
      console.error(`Error fetching URL ${url}:`, error.message);
      res.status(500).json({ error: "Failed to fetch content from URL", details: error.message });
    }
  });

  // API Route for Code Analysis
  app.post("/api/analyze", async (req, res) => {
    const { code, language, apiKey: userApiKey } = req.body;
    console.log(`Analyzing ${language} code with Gemini...`);

    if (!code || !language) {
      return res.status(400).json({ error: "Code and language are required" });
    }

    // Generate a unique hash for this specific code and language combination
    const hashData = `${language}:${code}`;
    const cacheKey = crypto.createHash("sha256").update(hashData).digest("hex");

    // Check if we've analyzed this exact code before
    if (analysisCache.has(cacheKey)) {
      console.log(`[Cache Hit] Returning cached analysis for ${language}`);
      return res.json(analysisCache.get(cacheKey));
    }

    try {
      const Groq = (await import("groq-sdk")).default;

      if (API_KEYS.length === 0) {
        return res.status(500).json({ error: "Server Configuration Error", details: "No GROQ_API_KEY available." });
      }

      const syntaxErrorSchema = {
        type: "object",
        properties: {
          file: { type: "string" },
          line: { type: "string" },
          issue: { type: "string" },
          fix: { type: "string" }
        },
        required: ["line", "issue", "fix"]
      };

      const responseSchema = {
        type: "object",
        properties: {
          language: { type: "string" },
          syntax_errors: { type: "array", items: syntaxErrorSchema },
          logical_issues: { type: "array", items: { type: "string" } },
          optimizations: { type: "array", items: { type: "string" } },
          "memory_issues": { type: "array", items: { type: "string" } },
          "edge_cases": { type: "array", items: { type: "string" } },
          "score": { type: "integer", minimum: 0, maximum: 100 },
          "optimized_files": { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                path: { type: "string" },
                content: { type: "string" }
              },
              required: ["path", "content"]
            } 
          }
        },
        required: [
          "language",
          "syntax_errors",
          "logical_issues",
          "optimizations",
          "memory_issues",
          "edge_cases",
          "score",
          "optimized_files"
        ]
      };

      const systemInstruction = `
You are an expert multi-language code reviewer and optimizer.

Analyze the given code and produce a structured response.

STRICT JSON MODE:
- Your response MUST be a single, raw JSON object.
- NO triple backticks, NO "Here is the JSON", NO preamble, NO post-text.
- If any part of the input is unreadable, garbled, or looks like binary data, IGNORE it completely and do not mention it in your response.
- Your goal is to analyze the valid source code only.

IMPORTANT RULE:
The "optimized_code" MUST be a DIRECT FIX of the ORIGINAL CODE.
You MUST implement ALL fixes for every issue identified in the previous steps:
- syntax_errors
- logical_issues
- optimizations
- memory_issues
- edge_cases

Every identified defect MUST be resolved in the final optimized_code. Failure to apply an identified fix is a violation of these instructions.

PERFORMANCE RULE:
If an optimization suggests a specific data structure (e.g., HashSet, HashMap in Java, Set in Python/JS) or an algorithmic change (e.g., O(n²) → O(n)), you MUST implement it fully in the optimized_code.

IMPORT RULE:
You MUST include all necessary import statements (e.g., "import java.util.*;" for Java) required by the optimized_code.

DO NOT rewrite from scratch.
DO NOT change the algorithm unless explicitly mentioned in optimizations.
DO NOT introduce new approaches that were not explained.

Every change in optimized_code must correspond to a listed issue.

Steps:

1. Detect programming language automatically.

2. SYNTAX ANALYSIS:
   - Identify syntax errors clearly.
   - Show the exact line (or approximate location).
   - Provide corrected syntax.
   - Store in "syntax_errors" array.

3. LOGICAL ANALYSIS:
   - Identify logical mistakes (overcounting, infinite loops, incorrect status).
   - Store in "logical_issues" array.

4. PERFORMANCE OPTIMIZATION:
   - Detect inefficiencies.
   - Suggest better approaches (e.g., O(n²) → O(n)).
   - Store in "optimizations" array.

5. MEMORY & EDGE CASES:
   - Detect memory leaks, null pointers, buffer overflows.
   - Analyze edge cases (empty input, large inputs, bounds).
   - Store in "memory_issues" and "edge_cases" respectively.

6. OPTIMIZED TRANSFORMATION (STRICT RULES):
   - Start from the original code.
   - Apply ALL necessary fixes and performance improvements identified above.
   - Keep structure as similar as possible while incorporating required optimizations.
   - Ensure all necessary imports are present.
   - If the optimized_code differs significantly from the original structure WITHOUT a performance optimization reason, REJECT and regenerate.

OUTPUT FORMAT (JSON):
Your entire response MUST be a valid JSON object conforming to the schema.
{
  "language": "<detected_language>",
  "syntax_errors": [
    {
      "line": "<line>",
      "issue": "<description>",
      "fix": "<corrected_code>"
    }
  ],
  "logical_issues": [],
  "optimizations": [],
  "memory_issues": [],
  "edge_cases": [],
  "score": 85,
  "optimized_files": [
    {
      "path": "filename.ext",
      "content": "fully optimized version of this specific file"
    }
  ]
}

PROJECT ANALYSIS RULES:
- You will often receive MULTIPLE files in a single prompt, separated by headers like "// --- File: <path> ---".
- For every Syntax Error, you MUST include the "file" field indicating which file it belongs to.
- For "optimized_files", you MUST provide the FULL optimized content for EVERY file provided in the input, resolving all issues identified in earlier steps.
- Support projects with 10+ files by keeping per-file optimizations concise yet complete.

SCORE CALCULATION RULES:
- Start at 100.
- -20 for each Syntax Error.
- -15 for each Logical Issue.
- -10 for significant Performance Inefficiency (e.g. O(n^2)).
- -5 for Memory/Edge Case gaps.
- The score should reflect the "Cleanliness/Optimization" of the ORIGINAL code.

STRICT SCHEMA: ${JSON.stringify(responseSchema, null, 2)}
`;

      let attempt = 0;
      const keysToTry = userApiKey ? [userApiKey] : API_KEYS;
      let keyIndex = userApiKey ? 0 : currentApiKeyIndex;

      while (attempt < keysToTry.length) {
        const apiKey = keysToTry[keyIndex];
        const groq = new Groq({ apiKey });

        try {
          // Add a timeout for the API call
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

          let response;
          try {
            response = await groq.chat.completions.create({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: `Code to analyze (${language}):\n\n${code}` }
              ],
              response_format: { type: "json_object" },
            }, { timeout: 60000 });
          } finally {
            clearTimeout(timeoutId);
          }

          const responseText = response.choices[0]?.message?.content;
          if (!responseText) {
             throw new Error("No response text from Groq");
          }
          
          console.log(`[Groq Raw Response] using key index ${currentApiKeyIndex}`, responseText);
          const resultObj = JSON.parse(responseText);

          // Save successful results to cache (evicting oldest if over limit to prevent memory leak)
          if (analysisCache.size >= 100) {
            const oldestKey = analysisCache.keys().next().value;
            if (oldestKey) analysisCache.delete(oldestKey);
          }
          analysisCache.set(cacheKey, resultObj);
          return res.json(resultObj); // Successfully return the response
        } catch (error: any) {
          const errorMsg = error?.message || String(error);
          
          if (error?.status === 429 || errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || error?.status === 503 || errorMsg.includes("overloaded")) {
            console.log(`[Rate Limit] Key index ${keyIndex} hit the limit. Switching to next key...`);
            
            if (userApiKey) {
               // If it's a user key, we don't rotate to other keys automatically to avoid confusion
               return res.status(429).json({ error: "Rate Limit Exceeded", details: "Your provided Groq API key is currently rate limited. Please wait a minute and try again." });
            }

            currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;
            keyIndex = currentApiKeyIndex;
            attempt++;
            
            if (attempt >= API_KEYS.length) {
              console.log("All API keys hit their rate limits.");
              return res.status(429).json({ error: "Rate Limit Exceeded", details: "All AI API keys are currently rate limited. Please wait a minute and try again." });
            }
          } else {
            console.error("Groq API Error details:", errorMsg);
            return res.status(500).json({ error: "Groq Analysis failed", details: errorMsg });
          }
        }
      }
    } catch (globalError: any) {
      console.error("Global Analysis Error:", globalError);
      res.status(500).json({ error: "Internal Server Error", details: String(globalError) });
    }
  });

  // API Route for Chat Support
  app.post("/api/chat", async (req, res) => {
    const { message, code, analysis, history, apiKey: userApiKey } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const systemPrompt = `
You are an expert AI Coding Assistant and Reviewer.
Your goal is to help the user understand their code, the review findings, and the optimized suggestions.

CONTEXT:
1. CURRENT CODE:
${code || "No code provided."}

2. ANALYSIS RESULTS:
${analysis ? JSON.stringify(analysis, null, 2) : "No analysis results yet."}

INSTRUCTIONS:
- Answer concisely as a mentor.
- Refer to specific issues found in the 8-point analysis (Syntax, Logic, Performance, etc.) if asked.
- Explain "optimized_code" if the user has questions about the changes.
- Provide code snippets if necessary.
- If no code/analysis is provided, answer as a general coding expert.
`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
      { role: "user", content: message }
    ];

    let attempt = 0;
    const keysToTry = userApiKey ? [userApiKey] : API_KEYS;
    let keyIndex = userApiKey ? 0 : currentApiKeyIndex;

    while (attempt < keysToTry.length) {
      const apiKey = keysToTry[keyIndex];
      const Groq = (await import("groq-sdk")).default;
      const groq = new Groq({ apiKey });

      try {
        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: chatMessages,
        });

        const responseText = response.choices[0]?.message?.content;
        return res.json({ message: responseText });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (error?.status === 429 || errorMsg.includes("429")) {
          currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;
          keyIndex = currentApiKeyIndex;
          attempt++;
        } else {
          return res.status(500).json({ error: "Chat failed", details: errorMsg });
        }
      }
    }
    res.status(429).json({ error: "Rate limit exceeded" });
  });

  // Dev environment logic (Vite)
  if (!process.env.VERCEL && (process.env.NODE_VITE_DEV === 'true' || process.env.NODE_ENV !== "production")) {
    console.log("Loading Vite dev server...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } 
  // Local production check (not Vercel)
  else if (!process.env.VERCEL && process.env.NODE_ENV === "production") {
    console.log("Serving static files locally from dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.url.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if we're not being wrapped by a serverless function
  if (!process.env.VERCEL && !process.env.LAMBDA_TASK_ROOT) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

// Export for Vercel
export { startServer };

// Self-start if run directly
if (import.meta.url === `file://${process.argv[1]}` || process.env.NODE_ENV !== 'production') {
  startServer().catch(console.error);
}
