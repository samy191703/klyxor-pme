import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Code2, Copy, Share2, Eye, Trash2, Edit, Plus, Search, Globe, Lock, Users } from "lucide-react";
import type { CodeSnippet } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Languages supportés avec syntax highlighting
const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "yaml", label: "YAML" },
  { value: "bash", label: "Bash" },
  { value: "markdown", label: "Markdown" },
];

interface CodeSnippetManagerProps {
  context?: string;
  contextId?: string;
  showCreateButton?: boolean;
}

export function CodeSnippetManager({ 
  context, 
  contextId, 
  showCreateButton = true 
}: CodeSnippetManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<CodeSnippet | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupération des snippets
  const { data: snippets = [], isLoading } = useQuery<CodeSnippet[]>({
    queryKey: ["/api/code-snippets", context, contextId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (context) params.append("context", context);
      if (contextId) params.append("contextId", contextId);
      
      const response = await apiRequest("GET", `/api/code-snippets?${params.toString()}`);
      return response.json();
    },
  });

  // Création d'un snippet
  const createMutation = useMutation({
    mutationFn: async (data: Partial<CodeSnippet>) => {
      return apiRequest("POST", "/api/code-snippets", {
        ...data,
        context: context || "general",
        contextId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-snippets"] });
      setIsCreateOpen(false);
      toast({
        title: "Snippet créé",
        description: "Le snippet de code a été créé avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le snippet.",
        variant: "destructive",
      });
    },
  });

  // Modification d'un snippet
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CodeSnippet> & { id: string }) => {
      return apiRequest("PUT", `/api/code-snippets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-snippets"] });
      setEditingSnippet(null);
      toast({
        title: "Snippet modifié",
        description: "Le snippet a été mis à jour.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le snippet.",
        variant: "destructive",
      });
    },
  });

  // Suppression d'un snippet
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/code-snippets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-snippets"] });
      toast({
        title: "Snippet supprimé",
        description: "Le snippet a été supprimé définitivement.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le snippet.",
        variant: "destructive",
      });
    },
  });

  // Copie d'un snippet
  const copySnippet = async (snippet: CodeSnippet) => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      await apiRequest("POST", `/api/code-snippets/${snippet.id}/copy`);
      toast({
        title: "Code copié",
        description: "Le code a été copié dans le presse-papier.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code.",
        variant: "destructive",
      });
    }
  };

  // Filtrage des snippets
  const filteredSnippets = snippets.filter(snippet =>
    snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    snippet.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    snippet.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-snippets"
          />
        </div>
        
        {showCreateButton && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-snippet">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau snippet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un snippet de code</DialogTitle>
                <DialogDescription>
                  Partagez du code avec votre équipe
                </DialogDescription>
              </DialogHeader>
              <SnippetForm
                onSubmit={(data) => createMutation.mutate(data)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement des snippets...
        </div>
      ) : filteredSnippets.length === 0 ? (
        <Alert>
          <Code2 className="h-4 w-4" />
          <AlertDescription>
            {searchQuery 
              ? "Aucun snippet ne correspond à votre recherche."
              : "Aucun snippet de code disponible. Créez le premier !"}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSnippets.map((snippet) => (
            <Card 
              key={snippet.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              data-testid={`card-snippet-${snippet.id}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{snippet.title}</CardTitle>
                    {snippet.description && (
                      <CardDescription className="mt-1">
                        {snippet.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary">{snippet.language}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Aperçu du code */}
                  <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-hidden">
                    <pre className="whitespace-pre-wrap break-all">
                      {snippet.code.substring(0, 100)}
                      {snippet.code.length > 100 && "..."}
                    </pre>
                  </div>

                  {/* Tags */}
                  {snippet.tags && snippet.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {snippet.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Statistiques */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {snippet.viewCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Copy className="h-3 w-3" />
                      {snippet.copyCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      {snippet.isPublic ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSnippet(snippet);
                        setIsPreviewOpen(true);
                      }}
                      data-testid={`button-preview-${snippet.id}`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Voir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copySnippet(snippet)}
                      data-testid={`button-copy-${snippet.id}`}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSnippet(snippet)}
                      data-testid={`button-edit-${snippet.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de prévisualisation */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          {selectedSnippet && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSnippet.title}</DialogTitle>
                <DialogDescription>
                  {selectedSnippet.description}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[500px] mt-4">
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="font-mono text-sm whitespace-pre-wrap">
                    <code>{selectedSnippet.code}</code>
                  </pre>
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => copySnippet(selectedSnippet)}
                  data-testid="button-copy-preview"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le code
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Voulez-vous vraiment supprimer ce snippet ?")) {
                      deleteMutation.mutate(selectedSnippet.id);
                      setIsPreviewOpen(false);
                    }
                  }}
                  data-testid="button-delete-preview"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal d'édition */}
      <Dialog open={!!editingSnippet} onOpenChange={() => setEditingSnippet(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le snippet</DialogTitle>
            <DialogDescription>
              Mettez à jour le contenu du snippet
            </DialogDescription>
          </DialogHeader>
          {editingSnippet && (
            <SnippetForm
              snippet={editingSnippet}
              onSubmit={(data) => updateMutation.mutate({ ...data, id: editingSnippet.id })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Composant formulaire réutilisable
interface SnippetFormProps {
  snippet?: CodeSnippet;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function SnippetForm({ snippet, onSubmit, isLoading }: SnippetFormProps) {
  const [formData, setFormData] = useState({
    title: snippet?.title || "",
    description: snippet?.description || "",
    code: snippet?.code || "",
    language: snippet?.language || "javascript",
    tags: snippet?.tags?.join(", ") || "",
    isPublic: snippet?.isPublic || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Titre *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Fonction de validation des emails"
          required
          data-testid="input-snippet-title"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Décrivez brièvement ce snippet"
          data-testid="input-snippet-description"
        />
      </div>

      <div>
        <Label htmlFor="language">Langage *</Label>
        <Select
          value={formData.language}
          onValueChange={(value) => setFormData({ ...formData, language: value })}
        >
          <SelectTrigger data-testid="select-snippet-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="code">Code *</Label>
        <Textarea
          id="code"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          placeholder="Collez votre code ici..."
          className="font-mono min-h-[200px]"
          required
          data-testid="textarea-snippet-code"
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="Ex: validation, email, regex"
          data-testid="input-snippet-tags"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="public"
          checked={formData.isPublic}
          onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
          data-testid="switch-snippet-public"
        />
        <Label htmlFor="public">
          Rendre ce snippet public (visible par tous les utilisateurs)
        </Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading} data-testid="button-submit-snippet">
          {isLoading ? "En cours..." : snippet ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}