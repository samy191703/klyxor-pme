import { useState, useEffect } from "react";
import { HelpCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface AIHelpBubbleProps {
  context: {
    page: string;
    section: string;
    userAction?: string;
    data?: any;
  };
  trigger?: "hover" | "click";
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

interface HelpContent {
  title: string;
  content: string;
  tips?: string[];
  relatedActions?: Array<{
    label: string;
    description: string;
  }>;
}

export function AIHelpBubble({ 
  context, 
  trigger = "click", 
  position = "top",
  className = "" 
}: AIHelpBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [helpContent, setHelpContent] = useState<HelpContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateHelpContent = async () => {
    if (isLoading || helpContent) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-help/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
      });

      if (!response.ok) {
        throw new Error('Échec de génération du contenu d\'aide');
      }

      const data = await response.json();
      setHelpContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !helpContent && !isLoading) {
      generateHelpContent();
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Génération de l'aide...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4">
          <div className="text-sm text-red-600 mb-2">
            Erreur lors de la génération de l'aide
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setError(null);
              generateHelpContent();
            }}
          >
            Réessayer
          </Button>
        </div>
      );
    }

    if (!helpContent) {
      return (
        <div className="p-4">
          <div className="text-sm text-gray-600">
            Aucun contenu d'aide disponible
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">{helpContent.title}</h4>
          <Badge variant="secondary" className="text-xs">
            IA
          </Badge>
        </div>
        
        <div className="text-sm text-gray-700 leading-relaxed">
          {helpContent.content}
        </div>

        {helpContent.tips && helpContent.tips.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase">
              Conseils
            </div>
            <ul className="text-sm space-y-1">
              {helpContent.tips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                  <span className="text-gray-600">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {helpContent.relatedActions && helpContent.relatedActions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase">
              Actions associées
            </div>
            <div className="space-y-2">
              {helpContent.relatedActions.map((action, index) => (
                <div key={index} className="text-sm">
                  <div className="font-medium text-gray-800">{action.label}</div>
                  <div className="text-gray-600 text-xs">{action.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => {
              setHelpContent(null);
              generateHelpContent();
            }}
            className="text-xs"
          >
            Actualiser l'aide
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 text-gray-400 hover:text-blue-600 transition-colors ${className}`}
          data-testid="ai-help-trigger"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        side={position}
        align="start"
        data-testid="ai-help-content"
      >
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            {renderContent()}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}