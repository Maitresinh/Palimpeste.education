"use client";

import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface HighlightToolbarProps {
  position: { x: number; y: number };
  selectedText: string;
  onHighlight: (color: string, comment: string) => void;
  onClose: () => void;
}

const COLORS = [
  { value: "#fef08a", name: "Jaune" },
  { value: "#bbf7d0", name: "Vert" },
  { value: "#bfdbfe", name: "Bleu" },
  { value: "#fbcfe8", name: "Rose" },
  { value: "#fed7aa", name: "Orange" },
];

export function HighlightToolbar({
  position,
  selectedText,
  onHighlight,
  onClose,
}: HighlightToolbarProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (selectedColor && comment.trim()) {
      onHighlight(selectedColor, comment.trim());
      onClose();
    }
  };

  // Si on a sélectionné une couleur, montrer le formulaire d'annotation
  if (selectedColor) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-40" onClick={onClose} />

        <Card
          className="fixed z-50 w-80 p-3 shadow-2xl"
          style={{
            left: `${Math.max(10, Math.min(position.x, window.innerWidth - 330))}px`,
            top: `${Math.max(10, Math.min(position.y, window.innerHeight - 200))}px`,
          }}
        >
          <div className="text-sm font-semibold mb-2">Ajouter une annotation</div>

          {/* Aperçu du texte et de la couleur */}
          <div
            className="mb-3 p-2 rounded text-sm"
            style={{ backgroundColor: selectedColor }}
          >
            "{selectedText.substring(0, 80)}{selectedText.length > 80 ? "..." : ""}"
          </div>

          {/* Commentaire obligatoire */}
          <div className="mb-3">
            <Input
              type="text"
              placeholder="Votre commentaire (obligatoire)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="text-sm"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!comment.trim()}
              className="flex-1"
            >
              Annoter
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedColor(null)}
            >
              Retour
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Backdrop invisible pour fermer au clic */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Mini toolbar */}
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 shadow-2xl rounded-lg p-2 flex gap-1 border"
        style={{
          left: `${Math.max(10, Math.min(position.x, window.innerWidth - 220))}px`,
          top: `${Math.max(10, Math.min(position.y, window.innerHeight - 60))}px`,
        }}
      >
        {COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => setSelectedColor(color.value)}
            className="w-8 h-8 rounded hover:scale-110 transition-transform border border-gray-200 dark:border-gray-600"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>
    </>
  );
}

