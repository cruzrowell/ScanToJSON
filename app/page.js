"use client";

import { useState, useRef, useMemo } from "react";
import { 
  UploadCloud, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  AlertCircle,
  Search,
  Table as TableIcon,
  Code2,
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink
} from "lucide-react";

export default function Home() {
  const [imagePreview, setImagePreview] = useState(null);
  const [fileType, setFileType] = useState("");
  const [fields, setFields] = useState([]);
  const [tables, setTables] = useState([]);
  const [rawJson, setRawJson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [bulkCopiedType, setBulkCopiedType] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const fileInputRef = useRef(null);

  const isPdf = fileType === "application/pdf" || imagePreview?.startsWith("data:application/pdf");

  const handleFile = (file) => {
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdfFile = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPdfFile) {
      setError("Please upload an image (JPG, JPEG, PNG, WEBP) or a PDF document.");
      return;
    }

    setError(null);
    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result;
      setImagePreview(dataUrl);

      // Extract raw base64 data and mime type
      const [header, base64Data] = dataUrl.split(",");
      let mimeType = header.match(/:(.*?);/)?.[1];
      if (!mimeType) {
        mimeType = isPdfFile ? "application/pdf" : (file.type || "image/jpeg");
      }
      setFileType(mimeType);

      await processImage(base64Data, mimeType);
    };

    reader.readAsDataURL(file);
  };

  const processImage = async (imageBase64, mimeType) => {
    setLoading(true);
    setFields([]);
    setTables([]);
    setRawJson(null);
    setSearchQuery("");
    setZoomLevel(1);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract key-value data.");

      setFields(Array.isArray(data.fields) ? data.fields : []);
      setTables(Array.isArray(data.tables) ? data.tables : []);
      setRawJson(data.raw || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Resilient clipboard copy helper with fallback for non-secure contexts (e.g. mobile HTTP live server)
  const safeCopyToClipboard = async (text) => {
    if (typeof window === "undefined") return false;

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn("navigator.clipboard.writeText failed, using fallback:", err);
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      textArea.setAttribute("readonly", "");
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Fallback copy failed:", err);
      return false;
    }
  };

  // Copy single field value
  const copyFieldValue = async (value, index) => {
    await safeCopyToClipboard(value);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Bulk copy: Key-Value text (e.g. "Name: Rowell Cruz")
  const copyAllKeyValueText = async () => {
    const text = fields.map((f) => `${f.key}: ${f.value}`).join("\n");
    await safeCopyToClipboard(text);
    triggerBulkCopy("kv");
  };

  // Bulk copy: TSV for direct paste into Excel / Google Sheets
  const copyAsTSV = async () => {
    const text = fields.map((f) => `${f.key}\t${f.value}`).join("\n");
    await safeCopyToClipboard(text);
    triggerBulkCopy("tsv");
  };

  // Bulk copy: JSON
  const copyJson = async () => {
    const jsonToCopy = rawJson || fields.reduce((acc, f) => {
      acc[f.key] = f.value;
      return acc;
    }, {});
    await safeCopyToClipboard(JSON.stringify(jsonToCopy, null, 2));
    triggerBulkCopy("json");
  };

  // Download JSON file
  const downloadJson = () => {
    const jsonToDownload = rawJson || fields.reduce((acc, f) => {
      acc[f.key] = f.value;
      return acc;
    }, {});
    const blob = new Blob([JSON.stringify(jsonToDownload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const triggerBulkCopy = (type) => {
    setBulkCopiedType(type);
    setTimeout(() => setBulkCopiedType(null), 2000);
  };

  const resetAll = () => {
    setImagePreview(null);
    setFileType("");
    setFields([]);
    setTables([]);
    setRawJson(null);
    setError(null);
    setSearchQuery("");
    setZoomLevel(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Filtered fields based on search query
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return fields;
    const q = searchQuery.toLowerCase();
    return fields.filter(
      (f) =>
        f.key.toLowerCase().includes(q) ||
        String(f.value).toLowerCase().includes(q)
    );
  }, [fields, searchQuery]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-5 mb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            ScanToJSON <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Encoder Assistant</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Extract clean key-values and structured JSON from PDF and image documents for fast, 1-click copy-pasting.
          </p>
        </div>

        {imagePreview && (
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs w-fit"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            Upload Another Document
          </button>
        )}
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!imagePreview && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 transition rounded-2xl p-12 text-center cursor-pointer flex flex-col items-center justify-center min-h-[380px]"
        >
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">
            Upload or drop document here
          </h3>
          <p className="text-sm text-slate-500 mb-5 max-w-md">
            Supports PDF documents, photos, forms, IDs, receipts, and scans (PDF, JPG, JPEG, PNG, WEBP). Extracts every field strictly into copyable key-value pairs.
          </p>
          <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 transition">
            Browse File (PDF or Image)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {imagePreview && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Original Document
                </h2>
                {isPdf && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">
                    PDF
                  </span>
                )}
              </div>

              {isPdf ? (
                <a
                  href={imagePreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                  title="Open PDF in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full PDF</span>
                </a>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-slate-500 px-1">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="relative rounded-lg overflow-auto border border-slate-100 bg-slate-100/70 h-[720px] flex items-start justify-center p-2">
              {isPdf ? (
                <iframe
                  src={`${imagePreview}#toolbar=0`}
                  title="PDF Document Preview"
                  className="w-full h-full min-h-[690px] border-none rounded bg-white shadow-2xs"
                />
              ) : (
                <img
                  src={imagePreview}
                  alt="Uploaded Document"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
                  className="max-w-full h-auto transition-transform duration-150 object-contain shadow-xs rounded"
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col min-h-[770px]">
            <div className="flex flex-wrap items-center justify-between p-4 border-b border-slate-200 gap-3 bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center bg-slate-200/70 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                    activeTab === "table"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Key-Value Table
                  {fields.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-indigo-50 text-indigo-600 rounded-full text-[10px]">
                      {fields.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("json")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                    activeTab === "json"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  JSON Extractor
                </button>
              </div>

              {fields.length > 0 && !loading && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyAllKeyValueText}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition shadow-2xs"
                    title="Copy all lines in 'Key: Value' format"
                  >
                    {bulkCopiedType === "kv" ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    {bulkCopiedType === "kv" ? "Copied!" : "Copy Key:Value"}
                  </button>

                  <button
                    onClick={copyAsTSV}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition shadow-2xs"
                    title="Copy tab-delimited for Excel or Google Sheets"
                  >
                    {bulkCopiedType === "tsv" ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    {bulkCopiedType === "tsv" ? "Copied!" : "Excel / TSV"}
                  </button>

                  <button
                    onClick={copyJson}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                    title="Copy JSON representation"
                  >
                    {bulkCopiedType === "json" ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                    {bulkCopiedType === "json" ? "Copied!" : "JSON"}
                  </button>
                </div>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-3 flex-1">
                <RefreshCw className="w-9 h-9 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold text-slate-700">
                  Extracting key-values and structured fields with Gemini...
                </p>
                <p className="text-xs text-slate-400">
                  Structuring labels, numbers, and tabular data from {isPdf ? "PDF" : "document"} into copyable format.
                </p>
              </div>
            )}

            {!loading && activeTab === "table" && (
              <div className="p-4 flex flex-col flex-1">
                {fields.length > 0 ? (
                  <>
                    <div className="relative mb-3">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search key or value (e.g. Name, Date, Total)..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden flex-1 flex flex-col">
                      <div className="overflow-y-auto max-h-[580px]">
                        <table className="min-w-full divide-y divide-slate-200 text-left">
                          <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5 w-1/3">Key / Field</th>
                              <th className="px-4 py-2.5">Extracted Value</th>
                              <th className="px-3 py-2.5 w-24 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white text-xs">
                            {filteredFields.map((field, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-indigo-50/40 transition group"
                              >
                                <td className="px-4 py-2.5 font-medium text-slate-800 align-top select-all">
                                  {field.key}
                                </td>
                                <td className="px-4 py-2.5 text-slate-700 font-mono text-[12px] break-words align-top select-all">
                                  {String(field.value)}
                                </td>
                                <td className="px-3 py-2.5 text-right align-top whitespace-nowrap">
                                  <button
                                    onClick={() => copyFieldValue(String(field.value), idx)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                                      copiedIndex === idx
                                        ? "bg-green-100 text-green-700 border border-green-200"
                                        : "bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700"
                                    }`}
                                    title={`Copy "${field.value}"`}
                                  >
                                    {copiedIndex === idx ? (
                                      <>
                                        <Check className="w-3 h-3 text-green-600" />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {filteredFields.length === 0 && (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="px-4 py-8 text-center text-slate-400 text-xs"
                                >
                                  No fields match "{searchQuery}"
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {tables.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-slate-200">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <TableIcon className="w-4 h-4 text-indigo-600" />
                          Detected Tables ({tables.length})
                        </h3>

                        {tables.map((table, tIdx) => (
                          <div key={tIdx} className="mb-4 border border-slate-200 rounded-lg overflow-x-auto">
                            {table.title && (
                              <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 border-b border-slate-200">
                                {table.title}
                              </div>
                            )}
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                              {table.headers && table.headers.length > 0 && (
                                <thead className="bg-slate-50">
                                  <tr>
                                    {table.headers.map((h, hIdx) => (
                                      <th key={hIdx} className="px-3 py-2 text-left font-semibold text-slate-700 border-b">
                                        {h}
                                      </th>
                                    ))}
                                    <th className="px-2 py-2 text-right w-16">Copy</th>
                                  </tr>
                                </thead>
                              )}
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {table.rows && table.rows.map((row, rIdx) => {
                                  const rowKey = `tbl-${tIdx}-r-${rIdx}`;
                                  const rowText = Array.isArray(row) ? row.join("\t") : String(row);
                                  return (
                                    <tr key={rIdx} className="hover:bg-slate-50">
                                      {Array.isArray(row) ? (
                                        row.map((cell, cIdx) => (
                                          <td key={cIdx} className="px-3 py-2 text-slate-700 font-mono text-[11px] select-all">
                                            {cell}
                                          </td>
                                        ))
                                      ) : (
                                        <td className="px-3 py-2 text-slate-700 font-mono text-[11px] select-all">
                                          {row}
                                        </td>
                                      )}
                                      <td className="px-2 py-2 text-right">
                                        <button
                                          onClick={() => copyFieldValue(rowText, rowKey)}
                                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                                          title="Copy entire row"
                                        >
                                          {copiedIndex === rowKey ? (
                                            <Check className="w-3.5 h-3.5 text-green-600" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2 flex-1">
                    <FileText className="w-8 h-8 text-slate-300" />
                    <p className="text-sm">No fields extracted yet.</p>
                  </div>
                )}
              </div>
            )}

            {!loading && activeTab === "json" && (
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-mono">
                    application/json
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyJson}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
                    >
                      {bulkCopiedType === "json" ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {bulkCopiedType === "json" ? "Copied" : "Copy JSON"}
                    </button>
                    <button
                      onClick={downloadJson}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download .json
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg bg-slate-900 text-slate-100 p-4 overflow-y-auto max-h-[620px] flex-1 font-mono text-xs leading-relaxed">
                  <pre>
                    <code>
                      {JSON.stringify(rawJson || fields.reduce((acc, f) => { acc[f.key] = f.value; return acc; }, {}), null, 2)}
                    </code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}