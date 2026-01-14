"use client";

import { useState, useEffect } from "react";
import { Settings, Type, Palette, LineChart, BookOpen, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { useReaderContext } from "@/contexts/reader-context";

export function ReaderSettings() {
  const { data: settings, refetch } = useQuery(
    trpc.reading.getReaderSettings.queryOptions()
  );

  const updateMutation = useMutation(
    trpc.reading.updateReaderSettings.mutationOptions()
  );

  // Get saveProgressCallback from context to save progress before mode switch
  const { saveProgressCallback } = useReaderContext();

  const [fontSize, setFontSize] = useState(settings?.fontSize || 16);
  const [lineHeight, setLineHeight] = useState(settings?.lineHeight || 150);
  const [theme, setTheme] = useState(settings?.theme || "light");
  const [fontFamily, setFontFamily] = useState(settings?.fontFamily || "system-ui");
  const [readingMode, setReadingMode] = useState(settings?.readingMode || "paginated");
  const [open, setOpen] = useState(false);

  // Synchroniser les états locaux avec les paramètres chargés
  useEffect(() => {
    if (settings) {
      setFontSize(settings.fontSize || 16);
      setLineHeight(settings.lineHeight || 150);
      setTheme(settings.theme || "light");
      setFontFamily(settings.fontFamily || "system-ui");
      setReadingMode(settings.readingMode || "paginated");
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      // If reading mode is changing, save current progress first and wait for it
      if (readingMode !== settings?.readingMode && saveProgressCallback) {
        console.log("📍 Saving progress before reading mode change...");
        await saveProgressCallback();
        console.log("✅ Progress saved, now updating settings");
      }

      await updateMutation.mutateAsync({
        fontSize,
        lineHeight,
        theme: theme as "light" | "dark" | "sepia",
        fontFamily,
        readingMode: readingMode as "paginated" | "scrolled",
      });
      await refetch();
      setOpen(false);
      toast.success("Paramètres sauvegardés");
    } catch (error) {
      console.error("❌ Error saving settings:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 px-1.5 sm:px-3 h-8 sm:h-9">
          <Settings className="h-5 w-5" />
          <span className="hidden sm:inline">Paramètres</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Paramètres de lecture</DialogTitle>
          <DialogDescription>
            Personnalisez votre expérience de lecture
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Taille de police */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Taille de la police
              </Label>
              <span className="text-sm text-muted-foreground">{fontSize}px</span>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={(value: number[]) => setFontSize(value[0])}
              min={8}
              max={32}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Exemple: <span style={{ fontSize: `${fontSize}px` }}>Texte de lecture</span>
            </p>
          </div>

          {/* Espacement des lignes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                Espacement des lignes
              </Label>
              <span className="text-sm text-muted-foreground">{lineHeight}%</span>
            </div>
            <Slider
              value={[lineHeight]}
              onValueChange={(value: number[]) => setLineHeight(value[0])}
              min={100}
              max={250}
              step={10}
              className="w-full"
            />
          </div>

          {/* Thème */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Thème de lecture
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="w-full"
              >
                ☀️ Clair
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="w-full"
              >
                🌙 Sombre
              </Button>
              <Button
                variant={theme === "sepia" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("sepia")}
                className="w-full"
              >
                📜 Sépia
              </Button>
            </div>
          </div>

          {/* Police */}
          <div className="space-y-2">
            <Label>Police de caractères</Label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="system-ui">Système par défaut</option>
              <option value="Georgia, serif">Georgia (Serif)</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Verdana, sans-serif">Verdana</option>
              <option value="'Courier New', monospace">Courier New</option>
            </select>
          </div>

          {/* Mode de lecture */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Mode de lecture
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={readingMode === "paginated" ? "default" : "outline"}
                size="sm"
                onClick={() => setReadingMode("paginated")}
                className="w-full gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Pages
              </Button>
              <Button
                variant={readingMode === "scrolled" ? "default" : "outline"}
                size="sm"
                onClick={() => setReadingMode("scrolled")}
                className="w-full gap-2"
              >
                <ScrollText className="h-4 w-4" />
                Scroll
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {readingMode === "paginated"
                ? "Naviguez page par page avec les flèches"
                : "Défilez le contenu en continu"}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
