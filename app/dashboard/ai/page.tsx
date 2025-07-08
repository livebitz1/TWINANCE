"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useBankStatement } from "@/contexts/BankStatementContext";
import { geminiNLP } from "@/services/geminiNLPService";
import { aiTraining } from "@/services/aiTrainingService";
import AIAssistant from "@/components/AIAssistant";
import { MessageSquare, Brain, Sparkles, Bot, BarChart3, TrendingUp, Loader2, RefreshCw } from "lucide-react";

export default function AIPage() {
  const { hasUploadedStatement, financialData } = useBankStatement();
  const [activeTab, setActiveTab] = useState("assistant");
  const [isTraining, setIsTraining] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<string | null>(null);

  // Handle AI training
  const handleTrainAI = async () => {
    if (!hasUploadedStatement || !financialData) return;
    
    setIsTraining(true);
    try {
      await aiTraining.trainAI(financialData);
      // Show success message
      setAnalysisResult("AI training completed successfully! Your AI assistant now has a much deeper understanding of your financial situation and can provide highly personalized advice.");
      setAnalysisType("training");
    } catch (error) {
      console.error("Error training AI:", error);
      setAnalysisResult("There was an error training the AI. Please try again later.");
      setAnalysisType("error");
    } finally {
      setIsTraining(false);
    }
  };

  // Handle deep financial analysis
  const handleFinancialAnalysis = async () => {
    if (!hasUploadedStatement || !financialData) return;
    
    setIsAnalyzing(true);
    setAnalysisType("analysis");
    
    try {
      // Create a comprehensive financial analysis prompt
      const analysisPrompt = `
        Perform a deep financial analysis of the following data and provide actionable insights:
        
        ACCOUNT SUMMARY:
        - Total Balance: ${financialData.totalBalance}
        - Income: ${financialData.income}
        - Expenses: ${financialData.expenses}
        - Income Transactions: ${financialData.incomeTransactions}
        - Expense Transactions: ${financialData.expenseTransactions}
        - Month-over-Month Change: ${financialData.comparedToLastMonth}
        
        ACCOUNT DETAILS:
        - Account Holder: ${financialData.accountDetails?.accountHolder || 'Unknown'}
        - Account Type: ${financialData.accountDetails?.accountType || 'Unknown'}
        - Bank: ${financialData.accountDetails?.bankName || 'Unknown'}
        - Statement Period: ${financialData.statementPeriod?.startDate || 'Unknown'} to ${financialData.statementPeriod?.endDate || 'Unknown'}
        
        Analyze this data to provide:
        1. Overall financial health assessment
        2. Specific strengths in the financial profile
        3. Areas for improvement
        4. Personalized recommendations for better financial management
        5. Potential savings opportunities
        
        Format your response in clear sections with concise explanations.
      `;
      
      // Get analysis from Gemini
      const analysis = await geminiNLP.generateResponse(analysisPrompt);
      setAnalysisResult(analysis);
    } catch (error) {
      console.error("Error generating financial analysis:", error);
      setAnalysisResult("There was an error generating your financial analysis. Please try again later.");
      setAnalysisType("error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset analysis results
  const handleResetAnalysis = () => {
    setAnalysisResult(null);
    setAnalysisType(null);
  };

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI Finance Center
        </h1>
        <p className="text-muted-foreground">
          Powered by advanced Gemini AI to analyze and understand your financial data
        </p>
      </div>
      
      {!hasUploadedStatement ? (
        <Card className="border-border/30 bg-background/30 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>Upload Your Bank Statement First</CardTitle>
            <CardDescription>
              To use the AI features, please upload your bank statement from the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Bot className="h-32 w-32 text-muted-foreground opacity-20" />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="assistant" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Deep Analysis
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Train AI
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="assistant" className="mt-0">
            <Card className="border-border/30 bg-background/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Financial AI Assistant
                </CardTitle>
                <CardDescription>
                  Chat with your AI financial assistant to get personalized insights and advice
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[600px] p-0">
                <AIAssistant />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analysis" className="mt-0">
            <Card className="border-border/30 bg-background/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Deep Financial Analysis
                </CardTitle>
                <CardDescription>
                  Generate a comprehensive analysis of your financial situation with actionable recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[300px]">
                {!analysisResult || analysisType !== 'analysis' ? (
                  <div className="flex flex-col items-center justify-center gap-8 py-12">
                    <div className="text-center max-w-md">
                      <TrendingUp className="h-16 w-16 mx-auto mb-4 text-primary opacity-70" />
                      <h3 className="text-xl font-medium mb-2">Analyze Your Finances</h3>
                      <p className="text-muted-foreground mb-8">
                        Our AI will analyze your financial data to provide personalized insights, identify patterns, and suggest improvements.
                      </p>
                    </div>
                    <Button 
                      onClick={handleFinancialAnalysis} 
                      className="px-8" 
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analyze My Finances
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 mb-6">
                      <h3 className="flex items-center text-xl mb-2">
                        <Sparkles className="h-5 w-5 mr-2 text-primary" />
                        Your Financial Analysis
                      </h3>
                      <div className="whitespace-pre-line">
                        {analysisResult.split('\n').map((line, i) => (
                          <div key={i} className={line.match(/^#+\s/) ? 'font-bold text-lg mt-4' : 'mb-2'}>
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleResetAnalysis}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate New Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="training" className="mt-0">
            <Card className="border-border/30 bg-background/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Train Your Financial AI
                </CardTitle>
                <CardDescription>
                  Train the AI on your financial data to provide more personalized and accurate responses
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[300px]">
                {!analysisResult || analysisType !== 'training' ? (
                  <div className="flex flex-col items-center justify-center gap-8 py-12">
                    <div className="text-center max-w-md">
                      <Brain className="h-16 w-16 mx-auto mb-4 text-primary opacity-70" />
                      <h3 className="text-xl font-medium mb-2">Train Your Financial AI</h3>
                      <p className="text-muted-foreground mb-8">
                        Training helps the AI understand your unique financial situation better. It will analyze your spending patterns, income sources, and financial behaviors to provide more personalized advice.
                      </p>
                    </div>
                    <Button 
                      onClick={handleTrainAI} 
                      className="px-8" 
                      disabled={isTraining}
                    >
                      {isTraining ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Training in progress...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Train My Financial AI
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 mb-6">
                    <h3 className="flex items-center text-xl mb-4">
                      <Sparkles className="h-5 w-5 mr-2 text-primary" />
                      Training Complete
                    </h3>
                    <p className="mb-6">{analysisResult}</p>
                    <Button 
                      variant="outline" 
                      onClick={handleResetAnalysis}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Train Again
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
                <p><strong>What happens during training?</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>AI analyzes your transaction patterns and spending habits</li>
                  <li>Identifies recurring expenses and financial behaviors</li>
                  <li>Learns your income patterns and cash flow</li>
                  <li>Builds a personalized financial profile to provide better advice</li>
                  <li>All data is processed securely and never shared</li>
                </ul>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
