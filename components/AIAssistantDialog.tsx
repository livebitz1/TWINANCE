"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Bot } from "lucide-react";
import AIAssistant from "./AIAssistant";
import { useBankStatement } from "@/contexts/BankStatementContext";

export default function AIAssistantDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { hasUploadedStatement } = useBankStatement();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="fixed bottom-6 right-6 z-50 rounded-full p-4 h-14 w-14 bg-primary/90 hover:bg-primary border-primary shadow-lg hover:shadow-xl transition-all"
          disabled={!hasUploadedStatement}
        >
          <Bot className="h-6 w-6 text-primary-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 bg-background/90 backdrop-blur-md border-border/30">
        <DialogHeader className="p-4 border-b border-border/20">
          <DialogTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            Financial AI Assistant
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <div className="h-full">
            <AIAssistant />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
