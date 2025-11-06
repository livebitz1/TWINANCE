"use client";

import React, { useState } from "react";
import { UploadCloud, FileText, Loader2, Bot, CheckCircle, AlertTriangle, Info, Shield, Lock, FileUp, FileCheck2, FileX2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useBankStatement } from "@/contexts/BankStatementContext";
import { useToast } from "@/hooks/use-toast";

interface BankStatementUploadProps {
  onUploadSuccess: () => void;
}

export default function BankStatementUpload({ onUploadSuccess }: BankStatementUploadProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const { processFile } = useBankStatement();
  const { toast } = useToast();  // File processing no longer uses caching
  // useEffect(() => {
  //   // Cache checking removed - always process fresh
  // }, [selectedFile]);

  // Listen for retry upload events from manual entry dialog (DISABLED - no manual entry)
  // useEffect(() => {
  //   const handleRetryUpload = () => {
  //     setOpen(true);
  //   };
  //   window.addEventListener('retryFileUpload', handleRetryUpload);
  //   return () => window.removeEventListener('retryFileUpload', handleRetryUpload);
  // }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive"
        });
      }
    }
  };

  // New UI state for feedback
  const [uploadStatus, setUploadStatus] = useState<"idle"|"success"|"error"|"processing">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadStatus("processing");
    setStatusMessage("Analyzing your statement with AI...");
    try {
      const success = await processFile(selectedFile);
      if (success) {
        setUploadStatus("success");
        setStatusMessage("Statement processed successfully! Your dashboard is ready.");
        toast({
          title: "Statement processed successfully", 
          description: "Your financial data has been analyzed successfully",
          variant: "default"
        });
        setTimeout(() => {
          setOpen(false);
          setSelectedFile(null);
          setUploadStatus("idle");
          setStatusMessage("");
          onUploadSuccess();
        }, 1200);
      } else {
        setUploadStatus("error");
        setStatusMessage("Processing failed. Please try another PDF.");
        toast({
          title: "Processing failed",
          description: "Could not extract data from this PDF. Try another file.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setUploadStatus("error");
      setStatusMessage("An error occurred. Please try again.");
      toast({
        title: "Upload error",
        description: "An error occurred while processing your PDF.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div 
        onClick={() => setOpen(true)}
        className="relative flex flex-col items-center justify-center py-24 px-8 border-2 border-dashed border-primary/40 rounded-3xl bg-gradient-to-br from-background/10 to-blue-950/30 shadow-2xl hover:shadow-3xl hover:border-primary/60 transition-all cursor-pointer group overflow-hidden min-h-[480px]"
      >
        {/* Animated sparkles */}
        <Sparkles className="absolute top-8 left-8 text-blue-400/30 animate-pulse" size={36} />
        <Sparkles className="absolute bottom-8 right-8 text-primary/20 animate-pulse" size={32} />
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-60 group-hover:opacity-80 transition-all" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl opacity-60 group-hover:opacity-80 transition-all" />
        <div className="bg-gradient-to-br from-primary/30 to-blue-500/20 p-10 rounded-full mb-8 shadow-2xl border-8 border-primary/10 animate-pulse group-hover:scale-110 transition-transform">
          <FileUp className="h-24 w-24 text-primary drop-shadow-lg" />
        </div>
        <h2 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400 drop-shadow-xl tracking-tight">Welcome to Twinance</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-xl text-xl font-medium">
          Upload your bank statement to unlock <span className="text-primary font-bold">AI-powered</span> financial insights and analytics.<br/>
          <span className="text-xs text-primary/80 flex items-center justify-center gap-1 mt-2"><Shield className="inline h-4 w-4 mr-1" /> 100% Secure & Private</span>
        </p>
        <Button className="text-lg px-10 py-6 h-auto font-bold shadow-xl hover:shadow-2xl bg-gradient-to-r from-primary to-blue-500 text-white rounded-2xl group-hover:scale-105 transition-transform text-xl">
          <FileUp className="h-6 w-6 mr-2 inline" /> Upload Bank Statement
        </Button>
        <div className="mt-8 flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" /> PDF format only. Max size: 10MB.
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" /> Your data is never stored or shared.
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px] bg-gradient-to-br from-background/80 to-blue-950/80 border-2 border-primary/20 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FileUp className="h-6 w-6 text-primary" /> Upload Bank Statement
            </DialogTitle>
            <DialogDescription className="text-base">
              Upload your bank statement in PDF format. Our AI will analyze it to display your financial data.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center mt-2 p-3 rounded-lg bg-primary/10 border border-primary/20 shadow-sm">
            <Bot className="h-5 w-5 text-primary mr-2" />
            <p className="text-sm font-medium">Powered by Gemini AI for accurate financial analysis</p>
          </div>

          <div 
            className={`mt-6 p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-background/10 to-primary/10 shadow-lg transition-all ${
              dragActive ? "border-primary bg-primary/10" : "border-border"
            } ${selectedFile ? "bg-primary/10" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileCheck2 className="h-14 w-14 text-green-500 mb-2 animate-bounce" />
                <p className="font-semibold text-primary text-lg">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-2"
                  onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                >
                  <FileX2 className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <>
                <FileUp className="h-14 w-14 text-primary mb-2 animate-bounce" />
                <p className="font-semibold text-lg">Drag and drop your PDF here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
              </>
            )}
          </div>

          {/* Upload status feedback */}
          {uploadStatus === "processing" && (
            <div className="flex items-center gap-2 mt-6 text-primary text-lg font-semibold animate-pulse">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>{statusMessage}</span>
            </div>
          )}
          {uploadStatus === "success" && (
            <div className="flex items-center gap-2 mt-6 text-green-600 text-lg font-semibold animate-bounceIn">
              <CheckCircle className="h-6 w-6" />
              <span>{statusMessage}</span>
            </div>
          )}
          {uploadStatus === "error" && (
            <div className="flex items-center gap-2 mt-6 text-red-600 text-lg font-semibold animate-shake">
              <AlertTriangle className="h-6 w-6" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-8">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading} className="rounded-lg px-6 py-3 font-semibold">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className="relative bg-gradient-to-r from-primary to-blue-500 text-white font-bold px-8 py-4 rounded-lg shadow-xl hover:from-blue-500 hover:to-primary transition-all text-lg"
            >
              {isUploading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              {isUploading ? "AI Processing..." : "Upload & Analyze"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
