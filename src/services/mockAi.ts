/**
 * Mock AI Service for Code Review and Optimization
 */

export interface CodeIssue {
  line: number;
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
  confidence?: number;
}

export interface Explanation {
  original: string;
  fixed: string;
  reason: string;
}

export interface SyntaxError {
  file?: string;
  line: string;
  issue: string;
  fix: string;
}

export interface OptimizedFile {
  path: string;
  content: string;
}

export interface AnalysisResult {
  language: string;
  syntaxErrors: SyntaxError[];
  logicalIssues: string[];
  optimizations: string[];
  memoryIssues: string[];
  edgeCases: string[];
  optimizedCode: string; // Legacy concatenated string
  optimizedFiles?: OptimizedFile[]; // New per-file structure
  // Legacy fields for UI compatibility
  score?: number;
  detectedLanguage?: string;
  issues?: CodeIssue[]; 
}

const MOCK_DATA: Record<string, AnalysisResult> = {
  python: {
    language: 'python',
    syntaxErrors: [],
    logicalIssues: [],
    optimizations: [],
    memoryIssues: [],
    edgeCases: [],
    optimizedCode: "",
    score: 100
  }
};

export const analyzeCode = async (code: string, language: string, apiKey?: string): Promise<AnalysisResult> => {
  const apiUrl = "/api/analyze";
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, language, apiKey }),
    });

    if (!response.ok) {
      let errorDetails = "Analysis failed";
      try {
        const error = await response.json();
        errorDetails = error.details || error.error || errorDetails;
      } catch (e) {
        errorDetails = `HTTP Error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorDetails);
    }

    const data = await response.json();
    
    // Map to the new structure
    const optimizedFiles = data.optimized_files || [];
    const optimizedCodeConcat = optimizedFiles.map((f: any) => `// --- File: ${f.path} ---\n${f.content}`).join("\n\n");

    return {
      language: data.language || language,
      syntaxErrors: data.syntax_errors || [],
      logicalIssues: data.logical_issues || [],
      optimizations: data.optimizations || [],
      memoryIssues: data.memory_issues || [],
      edgeCases: data.edge_cases || [],
      optimizedFiles: optimizedFiles,
      optimizedCode: data.optimized_code || optimizedCodeConcat,
      // Maintain legacy fields for minimal UI breakage until App.tsx is updated
      score: data.score || 100, 
      detectedLanguage: data.language || language,
      issues: (data.syntax_errors || []).map((e: any) => ({
        line: parseInt(e.line) || 1,
        type: 'Bug',
        severity: 'high',
        description: e.file ? `[${e.file}] ${e.issue}` : e.issue,
        suggestion: e.fix
      }))
    };
  } catch (error: any) {
    console.error("Analysis error:", error);
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("Could not connect to the analysis server. Please ensure the backend is running.");
    }
    throw error;
  }
};
