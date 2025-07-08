"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud, FileText, Loader2, Bot, RefreshCw } from "lucide-react";
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
import { generateFileHash } from "@/services/cacheService";

interface BankStatementUploadProps {
  onUploadSuccess: () => void;
}

export default function BankStatementUpload({ onUploadSuccess }: BankStatementUploadProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  
  const { processFile, cachedFiles, setCurrentFileHash } = useBankStatement();
  const { toast } = useToast();

  // When a file is selected, check if it's already in the cache
  useEffect(() => {
    const checkCache = async () => {
      if (selectedFile) {
        try {
          const hash = await generateFileHash(selectedFile);
          setFileHash(hash);
          const fileIsCached = cachedFiles.includes(hash);
          setIsCached(fileIsCached);
          if (fileIsCached) {
            console.log(`File ${selectedFile.name} already cached with hash ${hash}`);
          }
        } catch (err) {
          console.error("Error checking file cache status:", err);
        }
      } else {
        setFileHash(null);
        setIsCached(false);
      }
    };
    
    checkCache();
  }, [selectedFile, cachedFiles]);

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

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      // Store file hash in context for debugging/reference
      if (fileHash) {
        setCurrentFileHash(fileHash);
      }
      
      // Process the file using the context function which uses Gemini API
      const success = await processFile(selectedFile);
      
      if (success) {
        const sourceMessage = isCached ? 
          "Using cached analysis - consistent results guaranteed" : 
          "Your financial data has been analyzed by AI";
          
        toast({
          title: "Statement processed successfully",
          description: sourceMessage,
        });
        setOpen(false);
        setSelectedFile(null);
        onUploadSuccess();
      } else {
        toast({
          title: "Processing failed",
          description: "There was an error processing your statement",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Processing error",
        description: "An unexpected error occurred",
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
        className="flex flex-col items-center justify-center py-16 px-8 border-2 border-dashed border-border/40 rounded-xl bg-background/5 backdrop-blur-sm cursor-pointer hover:bg-background/10 transition-colors shadow-lg hover:shadow-xl hover:border-primary/40 transform hover:scale-[1.01] transition-all"
      >
        <div className="bg-primary/10 p-6 rounded-full mb-6 shadow-inner">
          <UploadCloud className="h-16 w-16 text-primary mb-2" />
        </div>
        <h2 className="text-2xl font-semibold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Welcome to Twinance</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-md text-lg">
          Upload your bank statement to view your personalized financial insights and analytics.
        </p>
        <Button className="text-base px-6 py-6 h-auto font-medium shadow-md hover:shadow-lg">
          Upload Bank Statement
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Bank Statement</DialogTitle>
            <DialogDescription>
              Upload your bank statement in PDF format. Our AI will analyze it to display your financial data.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center mt-2 p-2 rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary mr-2" />
            <p className="text-sm">Powered by Gemini AI for accurate financial analysis</p>
          </div>

          <div 
            className={`mt-4 p-6 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            } ${selectedFile ? "bg-primary/5" : ""}`}
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
              <div className="flex flex-col items-center">
                <FileText className="h-10 w-10 text-primary mb-2" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {isCached && (
                  <div className="mt-2 text-sm text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full flex items-center">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Cached - will provide consistent analysis
                  </div>
                )}
              </div>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="font-medium">Drag and drop your PDF here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className="relative"
            >
              {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isUploading ? "AI Processing..." : isCached ? "Use Cached Analysis" : "Upload & Analyze"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
