import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing document data." }, { status: 400 });
    }

    const prompt = `You are an expert document data extractor specifically designed to assist data entry encoders.
Your task is to extract every piece of data, labeled field, value, and table from the provided document (PDF, scan, form, or photo) with 100% precision.

STRICT INSTRUCTIONS:
1. Extract ALL key-value pairs (e.g., Name: Rowell Cruz, Birth Date: Jan 1 1990, Address: ..., Total Amount: ..., Invoice No: ...).
2. If text appears without an explicit label (e.g. document title, unlabelled paragraph, or header), assign a logical key (e.g. "Document Title", "Notes", "Summary").
3. If the document contains tabular rows/columns (e.g. line items, transactions, tables), extract them into the "tables" array.
4. Normalize keys to clean, human-readable Title Case (e.g., "Full Name", "Date of Birth", "ID Number", "Total Price").
5. Preserve the exact spelling, numbers, punctuation, dates, currency, and capitalization of all values. Never truncate, summarize, or alter data.
6. Strictly output ONLY valid JSON matching this exact schema:

{
  "fields": [
    { "key": "Field Name", "value": "Extracted Value" }
  ],
  "tables": [
    {
      "title": "Table Title or Section Name",
      "headers": ["Column 1", "Column 2", "Column 3"],
      "rows": [
        ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"],
        ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3"]
      ]
    }
  ]
}

If there are no tables, return "tables": [].`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType || "image/jpeg",
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    let rawText = response.text || "{}";
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const data = JSON.parse(rawText.trim());

    let fields = [];
    let tables = [];

    if (Array.isArray(data.fields)) {
      fields = data.fields.filter(f => f && (f.key || f.value));
    } else if (typeof data === "object" && data !== null) {
      for (const [k, v] of Object.entries(data)) {
        if (k === "tables" && Array.isArray(v)) {
          tables = v;
        } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          fields.push({ key: k, value: String(v) });
        } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
          for (const [subK, subV] of Object.entries(v)) {
            fields.push({ key: `${k} - ${subK}`, value: String(subV) });
          }
        }
      }
    }

    if (Array.isArray(data.tables)) {
      tables = data.tables;
    }

    return NextResponse.json({
      fields,
      tables,
      raw: data,
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process document." },
      { status: 500 }
    );
  }
}