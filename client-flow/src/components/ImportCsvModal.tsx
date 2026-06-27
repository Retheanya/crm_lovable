import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Download } from "lucide-react";
import { toast } from "sonner";
import { ApiService } from "@/crm/api";
import * as XLSX from "xlsx";

interface ImportCsvModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportCsvModal({ onClose, onSuccess }: ImportCsvModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (selectedFile: File) => {
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith('.csv')) {
      toast.error("Please select a valid CSV file");
      return;
    }
    setFile(selectedFile);
    setIsUploading(true);
    setValidationResult(null);
    setImportResult(null);

    try {
      const rows = await ApiService.uploadCsv(selectedFile);
      const validation = await ApiService.validateCsv(rows);
      setValidationResult(validation);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || error.message || "Failed to parse and validate CSV");
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.rows.length === 0) return;
    
    setIsImporting(true);
    try {
      const result = await ApiService.importCsv(validationResult.rows);
      setImportResult(result);
      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} leads`);
        onSuccess();
      } else {
        toast.error("No leads were imported");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to import leads");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrorReport = () => {
    if (!validationResult) return;
    const errorRows = validationResult.rows.filter((r: any) => !r.isValid || r.isDuplicate);
    if (errorRows.length === 0) return;

    const data = errorRows.map((r: any) => ({
      ...r.originalRow,
      "Error Reason": r.errors.join(' | ')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Errors");
    XLSX.writeFile(wb, `import-errors-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadSample = () => {
    const token = localStorage.getItem('crm_jwt_token');
    const url = ApiService.downloadSampleCsvUrl();
    
    // Create a fetch request so we can pass the auth header
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = 'leads_sample.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    })
    .catch(err => {
      console.error(err);
      toast.error('Failed to download sample CSV');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-[18px] font-bold text-foreground">Import Leads from CSV</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!importResult ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <p className="text-[14px] text-muted-foreground">Upload a CSV file to bulk import leads into your pipeline.</p>
                <button onClick={downloadSample} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted text-foreground transition-colors">
                  <Download className="h-4 w-4 text-muted-foreground" /> Sample CSV
                </button>
              </div>

              {!file && !isUploading && (
                <div 
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted mb-4">
                    <UploadCloud className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-1">Click or drag file to this area to upload</h3>
                  <p className="text-[13px] text-muted-foreground">Supports .csv files only</p>
                  <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                </div>
              )}

              {isUploading && (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-[14px] font-medium text-muted-foreground">Parsing and validating CSV...</p>
                </div>
              )}

              {file && validationResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-4 p-4 border border-border rounded-xl bg-muted/30">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate">{file.name}</p>
                      <p className="text-[12px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • {validationResult.rows.length} rows detected</p>
                    </div>
                    <button onClick={() => setFile(null)} className="text-[13px] font-medium text-red-500 hover:text-red-600">Change File</button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-card">
                      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Valid Rows</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <span className="text-2xl font-bold">{validationResult.validCount}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-card">
                      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Duplicates</p>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <span className="text-2xl font-bold">{validationResult.duplicateCount}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-card">
                      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Invalid Rows</p>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="text-2xl font-bold">{validationResult.rows.length - validationResult.validCount - validationResult.duplicateCount}</span>
                      </div>
                    </div>
                  </div>

                  {(validationResult.rows.length - validationResult.validCount > 0) && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                      <h4 className="text-[13px] font-bold text-red-800 flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4" /> Validation Issues Found
                      </h4>
                      <p className="text-[13px] text-red-700 mb-3">Some rows have missing required fields or duplicate data. They will be skipped during import.</p>
                      <button onClick={downloadErrorReport} className="text-[12px] font-semibold bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors">
                        Download Error Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Import Complete</h3>
              <p className="text-muted-foreground text-[14px] mb-6 max-w-sm">
                Successfully imported {importResult.imported} leads. {importResult.failed > 0 && `${importResult.failed} failed.`} {importResult.duplicateCount > 0 && `${importResult.duplicateCount} skipped as duplicates.`}
              </p>
              
              <div className="flex gap-3">
                {importResult.failed > 0 && (
                  <button onClick={downloadErrorReport} className="h-10 rounded-xl border border-border bg-card px-4 text-[13px] font-medium hover:bg-muted transition-colors">
                    Download Error Report
                  </button>
                )}
                <button onClick={onClose} className="h-10 rounded-xl bg-primary px-6 text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {!importResult && (
          <div className="border-t border-border p-5 bg-muted/20 flex justify-end gap-3">
            <button onClick={onClose} disabled={isImporting} className="h-10 rounded-xl px-4 text-[13px] font-semibold text-foreground hover:bg-muted transition-colors border border-border bg-card">
              Cancel
            </button>
            <button 
              onClick={handleImport} 
              disabled={isImporting || !validationResult || validationResult.validCount === 0} 
              className="h-10 rounded-xl bg-primary px-6 text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {isImporting ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div> Importing...</>
              ) : (
                `Import ${validationResult?.validCount || 0} Leads`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
