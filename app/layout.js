import "./global.css";

export const metadata = {
  title: "ScanToJSON | Document to Key-Value & JSON Extractor",
  description: "Extract clean key-values, tabular data, and structured JSON from documents and PDFs using Gemini AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}