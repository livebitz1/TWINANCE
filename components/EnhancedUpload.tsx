"use client";

import React, { useState } from "react";
import { UploadCloud, FileText, Loader2, CheckCircle, AlertCircle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ParsedStatementData, parseStatementWithGemini } from "@/services/transactionParser";

interface EnhancedUploadProps {
  onUploadSuccess: (data: ParsedStatementData) => void;
}

interface UploadProgress {
  step: "upload" | "extract" | "parse" | "complete" | "error";
  message: string;
}

export default function EnhancedUpload({ onUploadSuccess }: EnhancedUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ step: "upload", message: "" });
  
  const { toast } = useToast();

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

  const processStatement = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    
    try {
      // Step 1: Upload and extract text from PDF
      setProgress({ step: "extract", message: "Extracting text from PDF..." });
      
      const formData = new FormData();
      formData.append("file", selectedFile);

      const extractResponse = await fetch("/api/parse-statement", {
        method: "POST",
        body: formData,
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.error || "Failed to extract PDF text");
      }

      const { text, pages, extractedLength } = await extractResponse.json();
      console.log(`📄 Extracted ${extractedLength} characters from ${pages} pages`);

      // Step 2: Parse transactions with Gemini
      setProgress({ step: "parse", message: "Analyzing transactions with AI..." });
      
      const parsedData = await parseStatementWithGemini(text);
      
      if (!parsedData) {
        throw new Error("Failed to parse transactions from extracted text");
      }

      // Step 3: Complete
      setProgress({ step: "complete", message: "Processing complete!" });
      
      console.log(`✅ Successfully processed ${parsedData.transactions.length} transactions`);
      
      toast({
        title: "Statement processed successfully",
        description: `Found ${parsedData.transactions.length} transactions from ${parsedData.accountDetails.bankName}`,
        variant: "default"
      });

      // Pass the parsed data to parent component
      onUploadSuccess(parsedData);

    } catch (error) {
      console.error("❌ Processing error:", error);
      
      setProgress({ 
        step: "error", 
        message: error instanceof Error ? error.message : "Unknown error occurred" 
      });
      
      toast({
        title: "Processing failed",
        description: "Unable to process the bank statement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setSelectedFile(null);
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case "extract":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "parse":
        return <Bot className="h-5 w-5 text-purple-500" />;
      case "complete":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <UploadCloud className="h-5 w-5 text-gray-500" />;
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setProgress({ step: "upload", message: "" });
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl p-8 bg-slate-800 border-slate-700">
        <div className="text-center mb-8">
          <div className="bg-primary/10 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <UploadCloud className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Twinance</h1>
          <p className="text-slate-300 text-lg">Upload your bank statement for instant financial analysis</p>
        </div>

        {/* Progress Steps */}
        {isProcessing && (
          <Card className="p-4 mb-6 bg-slate-700 border-slate-600">
            <div className="flex items-center space-x-4">
              {getStepIcon(progress.step)}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{progress.message}</span>
                  {progress.step !== "complete" && progress.step !== "error" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
                <div className="mt-2 bg-slate-600 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: progress.step === "extract" ? "33%" : 
                             progress.step === "parse" ? "66%" : 
                             progress.step === "complete" ? "100%" : "0%" 
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Upload Area */}
        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive 
              ? "border-primary bg-primary/5" 
              : selectedFile 
                ? "border-green-500 bg-green-500/5" 
                : "border-slate-600 hover:border-slate-500"
          } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isProcessing && document.getElementById("file-upload")?.click()}
        >
          <input
            id="file-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isProcessing}
          />

          {selectedFile ? (
            <div className="flex flex-col items-center">
              <FileText className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{selectedFile.name}</h3>
              <p className="text-slate-300 mb-2">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-green-400 text-sm">Ready to process</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {dragActive ? "Drop your PDF here" : "Upload Bank Statement"}
              </h3>
              <p className="text-slate-300 mb-4">
                Drag and drop your PDF file here, or click to browse
              </p>
              <p className="text-slate-400 text-sm">
                Supports PDF bank statements from any bank
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          {selectedFile && !isProcessing && (
            <>
              <Button 
                onClick={processStatement} 
                className="flex-1 text-lg py-6"
                disabled={isProcessing}
              >
                <Bot className="h-5 w-5 mr-2" />
                Analyze Statement
              </Button>
              <Button 
                variant="outline" 
                onClick={resetUpload}
                className="px-6 py-6"
              >
                Cancel
              </Button>
            </>
          )}

          {progress.step === "error" && (
            <Button 
              onClick={resetUpload}
              variant="outline" 
              className="flex-1 py-6"
            >
              Try Again
            </Button>
          )}
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <FileText className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <h4 className="text-white font-medium mb-1">Smart Extraction</h4>
            <p className="text-slate-400 text-sm">Automatically extracts text from any PDF format</p>
          </div>
          <div className="p-4">
            <Bot className="h-8 w-8 text-purple-400 mx-auto mb-2" />
            <h4 className="text-white font-medium mb-1">AI Analysis</h4>
            <p className="text-slate-400 text-sm">Powered by Gemini AI for accurate transaction parsing</p>
          </div>
          <div className="p-4">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <h4 className="text-white font-medium mb-1">Real Data</h4>
            <p className="text-slate-400 text-sm">Only displays actual data from your statement</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
