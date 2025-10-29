import OpenAI from "openai";
import type { Message, AnalysisResult, DataRecord, FileMetadata, DataContext, DataQualityIssue } from '../types';
import { MessageType } from '../types';

if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY environment variable not set.");
    throw new Error("GROQ_API_KEY environment variable is required");
}

console.log("GROQ_API_KEY available:", !!process.env.GROQ_API_KEY);

// Configure OpenAI client with Groq settings
const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || '',  // Need to provide a default value
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true  // Enable browser usage
});

const formatChatHistory = (history: Message[]): string => {
    if (!history || history.length === 0) return 'No conversation history yet.';

    // Take last 6 messages (3 user/ai pairs) to keep prompt concise
    const recentHistory = history.slice(-6);

    return recentHistory.map(msg => {
        if (msg.type === MessageType.USER) {
            return `[User]: ${msg.content as string}`;
        }
        if (msg.type === MessageType.AI && typeof msg.content === 'object') {
            const content = msg.content as AnalysisResult;
            let summary = content.summary || content.title;
            if (content.type === 'profile') {
                summary = 'Displayed the initial data profile report.';
            } else if (content.type === 'error') {
                summary = `Encountered an error: ${content.data}`;
            } else if (!summary) {
                 summary = `Responded with a ${content.type}.`;
            }
            // Replace newlines to keep the history compact
            return `[AI]: ${summary.replace(/\n/g, ' ')}`;
        }
        return ''; // Ignore system messages or other malformed messages
    }).filter(line => line).join('\n');
};

const generateMultiCodePrompt = (query: string, metadata: FileMetadata, context: DataContext | null, chatHistory: Message[]): string => {
    const dataSample = JSON.stringify(metadata.preview, null, 2);
    const columns = metadata.columns.join(', ');
    const history = formatChatHistory(chatHistory);

    let contextPrompt = '';
    if (context) {
        if (context.dataDescription) {
            contextPrompt += `\nUser-provided Data Description:\n${context.dataDescription}`;
        }
        const describedColumns = Object.entries(context.columnDescriptions).filter(([_, desc]) => desc.trim() !== '');
        if (describedColumns.length > 0) {
            contextPrompt += `\nUser-provided Column Explanations:\n${describedColumns.map(([col, desc]) => `- ${col}: ${desc}`).join('\n')}`;
        }
    }

    return `You are an expert data analyst AI. Your task is to write code in three different languages to answer the user's question about their dataset, taking into account the conversation history for context.

Conversation History (most recent last):
${history}

User's Current Question: "${query}"

Dataset Information:
- Filename: ${metadata.fileName}
- Total Rows: ${metadata.rowCount}
- Columns: ${columns}
${contextPrompt}
- Data Sample (first 5 rows for schema reference):
${dataSample}

**CRITICAL INSTRUCTIONS:**
1.  **JSON ONLY:** You MUST return ONLY a single, valid JSON object. Do NOT wrap it in \`\`\`json or provide any explanation.
2.  **CODE GENERATION:** You must generate code for all three languages: JavaScript, Python, and SQL.
3.  **JAVASCRIPT:**
    - The generated code will be executed inside an \`async function(data) { YOUR_CODE_HERE }\`.
    - Your code should expect a variable named \`data\` to be available, which is an array of objects representing the full dataset.
    - **CRITICAL:** Do NOT write the function signature yourself (e.g., \`async function(data)\`). Just provide the code for the function's body.
    - The last statement in your code must be a \`return\` statement with the structured result object: \`{ type, title, summary, data }\`.
    - **Valid types**: 'table', 'chart', 'value', and 'statistics'.
4.  **DATA-DRIVEN SUMMARY**: The \`summary\` field is the most important part of the response. Your generated JavaScript code must dynamically create this summary based on the data it processes. The summary must be a **concise, insightful, data-driven explanation** of the result, formatted with **markdown for readability (bolding with \`**\`, newlines with \`\\n\`)**.
    - **FORMAT:** Keep it short: 2-4 key bullet points or a short paragraph.
    - **DO NOT** just list all the data. Provide insights.
    - **BAD SUMMARY:** "This is a bar chart showing sales."
    - **GOOD SUMMARY:** "The analysis reveals that **'Product A'** has 50% higher sales than **'Product B'**.\\nKey observation: The top 3 products account for over 80% of total revenue."
    - **BAD SUMMARY:** "This scatterplot shows the relationship between X and Y."
    - **GOOD SUMMARY:** "The scatterplot shows a **strong positive correlation**, suggesting that as horsepower increases, so does car price."
5.  **PYTHON:**
    - Assume the data is in a pandas DataFrame called \`df\`.
    - Provide a complete, executable Python script using the pandas library to answer the user's question.
6.  **SQL:**
    - Assume the data is in a table named \`dataset\`.
    - Provide a single, complete SQL query to answer the user's question.
7.  **UNSUPPORTED CHARTS**: The only supported chart types are 'bar', 'line', 'pie', 'scatterplot', 'treemap', 'bubble', and 'boxplot'. If the user requests any other chart type (e.g., "word cloud", "heatmap", "sankey diagram"), your JavaScript code MUST return an error object. Do NOT attempt to generate code for unsupported charts.
    - The error object must be: \`return { type: 'error', title: 'Unsupported Chart Type', data: "Sorry, I cannot create that type of chart. Supported types are: bar, line, pie, scatterplot, treemap, bubble, and box plot." };\`
    - For the pythonCode and sqlCode fields, return a simple comment indicating the reason, e.g., \`"pythonCode": "# Unsupported chart type requested.", "sqlCode": "-- Unsupported chart type requested."\`

**RESULT STRUCTURES:**
- **For charts ('chart' type):** The 'data' object must be \`{ chartType: 'bar' | 'line' | 'pie' | 'scatterplot' | 'treemap' | 'bubble' | 'boxplot', payload: [...], xAxisLabel?: string, yAxisLabel?: string, drillDownQueryHint?: string }\`.
  - 'bar', 'line', 'pie' payload: \`{ name: string, value: number }[]\`
  - 'scatterplot' payload: \`{ x: number, y: number }[]\`
  - 'bubble' payload: \`{ x: number, y: number, z: number, name: string }[]\`. 'z' is the bubble size.
  - 'treemap' payload: \`{ name: string, size: number }[]\`.
  - 'boxplot' payload: \`{ category: string, min: number, q1: number, median: number, q3: number, max: number, outliers?: number[] }[]\`.
- **For tables ('table' type):** The 'data' field is the array of row objects \`Record<string, any>[]\`.
- **For single values ('value' type):** The 'data' field is a string or number.
- **For statistics ('statistics' type):** The 'data' object must be \`{ payload: { statistic: string, value: string | number }[] }\`.

**RETURN STRUCTURE (JSON):**
Your entire response must be a single JSON object with the following keys:
{
  "javascriptCode": "The complete JS function body.",
  "pythonCode": "The complete Python script.",
  "sqlCode": "The complete SQL query."
}

Now, generate the JSON for the user's question.
`;
};

export const getAnalysisCodes = async (
    query: string,
    metadata: FileMetadata,
    context: DataContext | null,
    chatHistory: Message[]
): Promise<{ javascriptCode: string; pythonCode: string; sqlCode: string; }> => {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('API key is not configured. Please set the GROQ_API_KEY environment variable.');
    }

    const prompt = generateMultiCodePrompt(query, metadata, context, chatHistory);

    try {
        const response = await client.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                { role: "system", content: "You are a data analysis expert. Please provide code to answer the user's question." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });
        
        const candidate = response.choices[0];
        if (!candidate || !candidate.message.content) {
            throw new Error("The AI returned an empty response.");
        }

        let parsedResult;
        try {
            parsedResult = JSON.parse(candidate.message.content);
        } catch(parseError) {
             console.error("Failed to parse AI response as JSON:", candidate.message.content);
             throw new Error("Response from AI was not valid JSON. The AI might have returned an explanation or malformed text instead of the expected code object.");
        }

        if (parsedResult === null || typeof parsedResult !== 'object') {
            throw new Error("The AI returned a null or non-object response instead of a code object.");
        }
    
        const { javascriptCode, pythonCode, sqlCode } = parsedResult;

        if (!javascriptCode || !pythonCode || !sqlCode) {
            console.error("AI response missing required code fields:", parsedResult);
            throw new Error("The AI did not return the required code in all three languages (JavaScript, Python, SQL).");
        }
        
        return { javascriptCode, pythonCode, sqlCode };

    } catch (error) {
        console.error("Error getting code from Groq:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while generating analysis code.";
        throw new Error(errorMessage);
    }
};

export const generateCleaningCode = async (
    issue: DataQualityIssue,
    metadata: FileMetadata,
    context: DataContext | null
): Promise<string> => {
     if (!process.env.GROQ_API_KEY) {
        throw new Error('API key is not configured.');
    }
    
    const dataSample = JSON.stringify(metadata.preview, null, 2);
    const columns = metadata.columns.join(', ');

    let contextPrompt = '';
    if (context) {
        if (context.dataDescription) {
            contextPrompt += `\nUser-provided Data Description:\n${context.dataDescription}`;
        }
        const describedColumns = Object.entries(context.columnDescriptions).filter(([_, desc]) => desc.trim() !== '');
        if (describedColumns.length > 0) {
            contextPrompt += `\nUser-provided Column Explanations:\n${describedColumns.map(([col, desc]) => `- ${col}: ${desc}`).join('\n')}`;
        }
    }

    const prompt = `You are a data cleaning expert. Your task is to write a single block of JavaScript code to fix a specific data quality issue in a dataset.

**CRITICAL INSTRUCTIONS:**
1.  The code will be executed in an \`async function(data) { YOUR_CODE_HERE }\`.
2.  \`data\` is an array of objects representing the full dataset.
3.  Your code **MUST** only \`return\` the new, cleaned array of objects. Do NOT wrap it in JSON or add explanations.
4.  The cleaning logic must be specific to the issue provided.
5.  Be defensive: handle potential errors or unexpected formats within the data (e.g., use \`?.\`, \`||\`, \`try...catch\`).
6.  Modify the data immutably (e.g., using \`map\` to create a new array). Do not modify the original \`row\` objects directly unless you clone them first (e.g. \`const newRow = {...row}\`).
7.  The returned data should have the same number of rows as the input.

**Issue to Fix:**
- Column: "${issue.column}"
- Issue Type: "${issue.issue}"
- Details: "${issue.details}"

**Dataset Context:**
- Columns: ${columns}
- Data Sample (first 5 rows for schema reference):
${dataSample}
${contextPrompt}

**Example (Fixing missing numeric values):**
Issue: "High Percentage of Missing Values" in column "Age". Details: "20% of values are missing."
Your response would be:
return data.map(row => {
  const newRow = {...row};
  if (newRow['Age'] === null || newRow['Age'] === undefined || newRow['Age'] === '') {
    // Fill with the median age, but let's assume 30 for this example if median is unknown.
    newRow['Age'] = 30; 
  }
  return newRow;
});


**Example (Fixing unparsable numeric values):**
Issue: "Unparsable Values" in column "Price". Details: "15 values (5%) could not be parsed as numbers."
Your response would be:
return data.map(row => {
  const newRow = {...row};
  if (typeof newRow['Price'] === 'string') {
    const cleanedPrice = parseFloat(newRow['Price'].replace(/[^0-9.-]+/g,""));
    newRow['Price'] = isNaN(cleanedPrice) ? null : cleanedPrice; // Set to null if still not a number
  }
  return newRow;
});

Now, write the JavaScript function body to solve the specific issue provided.`;

    try {
        const response = await client.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                { role: "user", content: prompt }
            ]
        });
        
        const responseText = response.choices[0]?.message?.content
            ?.trim()
            ?.replace(/^```javascript/, '')
            ?.replace(/^```js/, '')
            ?.replace(/```$/, '');
          
        if (!responseText) {
            throw new Error("The AI returned empty code.");
        }
        
        return responseText;
    } catch (error) {
        console.error("Error generating cleaning code from Groq:", error);
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred while generating the cleaning code.");
    }
}

export const generateSuggestedQuestions = async (
    metadata: FileMetadata,
    context: DataContext | null,
    chatHistory: Message[]
): Promise<string[]> => {
    if (!process.env.GROQ_API_KEY) {
        return [];
    }
    
    const history = formatChatHistory(chatHistory);
    let contextPrompt = '';
    if (context) {
        if (context.dataDescription) {
            contextPrompt += `\nData Description: ${context.dataDescription}`;
        }
        const describedColumns = Object.entries(context.columnDescriptions).filter(([_, desc]) => desc.trim() !== '');
        if (describedColumns.length > 0) {
            contextPrompt += `\nColumn Explanations:\n${describedColumns.map(([col, desc]) => `- ${col}: ${desc}`).join('\n')}`;
        }
    }

    const prompt = `
You are a helpful assistant that suggests interesting follow-up questions to ask about a dataset, based on the conversation so far.
Generate 3 concise and insightful questions a user might want to ask next. The questions should be logical next steps in the analysis.
Return the questions as a JSON object with a "questions" key containing an array of strings. Do not return anything else.

Dataset Information:
- Columns: ${metadata.columns.join(', ')}${contextPrompt}

Conversation History:
${history}

Example Response:
{"questions": ["How do sales for Product X compare to the overall average?", "What are the sales trends for the top 3 categories?", "Is there a correlation between price and customer rating?"]}
`;

    try {
        const response = await client.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const responseText = response.choices[0]?.message?.content;
        if (!responseText) {
            return [];
        }

        const result = JSON.parse(responseText);
        return result?.questions || [];
    } catch (error) {
        console.error("Error generating suggested questions:", error);
        return [];
    }
};

// A helper function to normalize column names for use as JSON keys/identifiers
const normalizeColumnName = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
};

export const classifyColumnTypes = async (
    metadata: FileMetadata,
    dataSample: DataRecord[],
    context: DataContext | null
): Promise<Record<string, 'numeric' | 'categorical'>> => {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("API key is not configured.");
    }
    
    // Create a safe mapping from original column names to normalized names, handling potential collisions.
    const normalizedColumnMap: Record<string, string> = {}; // { original: normalized }
    const originalColumnMap: Record<string, string> = {}; // { normalized: original }
    const usedNormalizedNames = new Set<string>();

    metadata.columns.forEach(col => {
        let normalized = normalizeColumnName(col);
        let counter = 1;
        let finalNormalized = normalized;
        
        while (usedNormalizedNames.has(finalNormalized)) {
            finalNormalized = `${normalized}_${counter}`;
            counter++;
        }

        usedNormalizedNames.add(finalNormalized);
        normalizedColumnMap[col] = finalNormalized;
        originalColumnMap[finalNormalized] = col;
    });
    
    const normalizedColumns = Object.values(normalizedColumnMap);
    
    let contextPrompt = '';
    if (context) {
        if (context.dataDescription) {
            contextPrompt += `\nData Description: ${context.dataDescription}`;
        }
        const describedColumns = Object.entries(context.columnDescriptions).filter(([_, desc]) => desc.trim() !== '');
        if (describedColumns.length > 0) {
            contextPrompt += `\nColumn Explanations:\n${describedColumns.map(([col, desc]) => `- ${col}: ${desc}`).join('\n')}`;
        }
    }

    const sampleString = JSON.stringify(dataSample, null, 2);

    const prompt = `
You are an expert data analyst AI. Your task is to classify columns from a dataset as either 'numeric' or 'categorical'.

'numeric' columns are those that contain quantitative data where mathematical operations like mean and median are meaningful. Examples: 'Sales', 'Price', 'Age', 'Temperature'.
'categorical' columns are those that contain qualitative data, identifiers, or codes, even if they are numbers. Mathematical operations on them are meaningless. Examples: 'Country', 'Product_ID', 'Store_ID', 'Year', 'Rating' (e.g., 1-5 stars).

Based on the column names, user-provided context, and a sample of the data, classify each column. The column names have been normalized to be safe JSON keys. You MUST use these normalized names in your response.

Dataset Information:
- Normalized Columns to Classify: ${normalizedColumns.join(', ')}
- Original to Normalized Mapping:
${metadata.columns.map(col => `- "${col}" -> "${normalizedColumnMap[col]}"`).join('\n')}
${contextPrompt}
- Data Sample (using original column names):
${sampleString}

Your Task:
Return a JSON object where keys are the **normalized column names** and values are either 'numeric' or 'categorical'. You MUST provide a classification for EVERY column in the 'Normalized Columns to Classify' list.

Example Response for normalized columns ['Year', 'Sales', 'StoreID']:
{
  "classifications": {
    "Year": "categorical",
    "Sales": "numeric",
    "StoreID": "categorical"
  }
}
`;

    try {
        const response = await client.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const responseText = response.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("AI did not return a response");
        }

        const result = JSON.parse(responseText);
        
        if (!result || !result.classifications || typeof result.classifications !== 'object') {
            throw new Error("AI did not return a valid classifications object.");
        }

        const classificationsFromAI = result.classifications;
        
        // Map back to original column names
        const finalClassifications: Record<string, 'numeric' | 'categorical'> = {};
        for (const normalizedName in classificationsFromAI) {
            if (originalColumnMap[normalizedName]) {
                const originalName = originalColumnMap[normalizedName];
                finalClassifications[originalName] = classificationsFromAI[normalizedName];
            }
        }
        
        // Ensure all original columns have a classification, defaulting to categorical if any were missed by the AI.
         metadata.columns.forEach(col => {
            if (!finalClassifications[col]) {
                console.warn(`Column "${col}" was not classified by the AI. Defaulting to categorical.`);
                finalClassifications[col] = 'categorical';
            }
        });

        return finalClassifications;
    } catch (error) {
        console.error("Error classifying column types from Groq:", error);
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred during column classification.");
    }
};