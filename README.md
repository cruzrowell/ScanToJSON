# ScanToJSON 📄⚡

**ScanToJSON** is an AI-powered document data extractor designed to assist data entry encoders. Upload scanned documents, PDFs, photos, forms, IDs, receipts, and invoices to extract clean key-value pairs and structured JSON with 1-click copy buttons for rapid data entry.

Powered by **Google Gemini** (`@google/genai`) and **Next.js**.

---

## Features

- 📑 **Multi-Format Support**: Upload PDF documents or images (JPEG, JPG, PNG, WEBP).
- 🔍 **Side-by-Side Document Inspection**:
  - Embedded PDF preview with direct full-document view.
  - High-res image preview with interactive Zoom In, Zoom Out, and Reset Zoom controls.
- 📋 **Encoder-Focused Key-Value Table**:
  - Individual **1-Click Copy** buttons for each extracted value with instant visual feedback.
  - Works on desktop and mobile browsers (includes resilient fallback for non-secure HTTP local network contexts).
  - Real-time search filter to quickly find specific fields (e.g. *Name*, *Date*, *Total*).
  - Tabular data detection for line items and receipts with row-level copy.
- 📤 **Bulk Export Tools**:
  - **Copy Key:Value**: Plain text format (`Field: Value`).
  - **Copy for Excel / TSV**: Tab-delimited format for instant multi-column pasting into Microsoft Excel or Google Sheets.
  - **JSON Extractor**: Syntax-highlighted JSON viewer with **Copy JSON** and **Download .json** options.

---

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node.js 20 & 24)
- A Google Gemini API Key (obtain from [Google AI Studio](https://aistudio.google.com/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cruzrowell/ScanToJSON.git
   cd ScanToJSON
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Add your Gemini API key inside `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **AI Engine**: [Google Gen AI SDK](https://www.npmjs.com/package/@google/genai) (`@google/genai`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## License

MIT
