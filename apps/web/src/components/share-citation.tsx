"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  Link2,
  Check,
  MessageCircle
} from "lucide-react";

import { copyToClipboard } from "@/lib/clipboard";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

interface ShareCitationButtonProps {
  annotationId: string;
  citationText: string;
  bookTitle: string;
  groupId: string;
  variant?: "button" | "icon" | "menu-item";
  onShared?: () => void;
  allowSocialExport?: boolean; // If false, only copy link is shown
}

export function ShareCitationButton({
  annotationId,
  citationText,
  bookTitle,
  groupId,
  variant = "icon",
  onShared,
  allowSocialExport = true,
}: ShareCitationButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const shareMutation = useMutation({
    mutationFn: async (platform: "twitter" | "facebook" | "linkedin" | "copy_link") => {
      const response = await fetch(`${serverUrl}/trpc/sharing.shareCitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ annotationId, platform }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du partage");
      }

      return response.json();
    },
    onSuccess: async (data, platform) => {
      onShared?.();

      // Ouvrir le lien de partage approprié
      const shareUrl = `${appUrl}/share/${groupId}`;
      const shareText = `"${citationText.substring(0, 200)}${citationText.length > 200 ? "..." : ""}" - ${bookTitle}`;

      switch (platform) {
        case "twitter":
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
            "_blank",
            "width=550,height=420"
          );
          break;
        case "facebook":
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
            "_blank",
            "width=550,height=420"
          );
          break;
        case "linkedin":
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
            "_blank",
            "width=550,height=420"
          );
          break;
        case "copy_link":
          const success = await copyToClipboard(`${shareText}\n\n${shareUrl}`);
          if (success) {
            setCopied(true);
            toast.success("Citation copiée dans le presse-papier");
            setTimeout(() => setCopied(false), 2000);
          } else {
            toast.error("Impossible de copier la citation");
          }
          break;
      }

      setIsOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors du partage");
    },
  });

  const handleShare = (platform: "twitter" | "facebook" | "linkedin" | "copy_link") => {
    shareMutation.mutate(platform);
  };

  const allShareOptions = [
    {
      platform: "twitter" as const,
      icon: <Twitter className="h-4 w-4" />,
      label: "Twitter / X",
      color: "hover:bg-sky-50 hover:text-sky-600",
      isSocial: true,
    },
    {
      platform: "facebook" as const,
      icon: <Facebook className="h-4 w-4" />,
      label: "Facebook",
      color: "hover:bg-blue-50 hover:text-blue-600",
      isSocial: true,
    },
    {
      platform: "linkedin" as const,
      icon: <Linkedin className="h-4 w-4" />,
      label: "LinkedIn",
      color: "hover:bg-indigo-50 hover:text-indigo-600",
      isSocial: true,
    },
    {
      platform: "copy_link" as const,
      icon: copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />,
      label: copied ? "Copié !" : "Copier le lien",
      color: "hover:bg-gray-50 hover:text-gray-600",
      isSocial: false,
    },
  ];

  // Filter options based on allowSocialExport setting
  const shareOptions = allowSocialExport
    ? allShareOptions
    : allShareOptions.filter(option => !option.isSocial);

  if (variant === "menu-item") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {shareOptions.map((option) => (
            <DropdownMenuItem
              key={option.platform}
              onClick={() => handleShare(option.platform)}
              className={option.color}
              disabled={shareMutation.isPending}
            >
              {option.icon}
              <span className="ml-2">{option.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager cette citation</DialogTitle>
          <DialogDescription>
            Partagez cette citation sur vos réseaux sociaux avec un lien vers le groupe de lecture.
          </DialogDescription>
        </DialogHeader>

        {/* Aperçu de la citation */}
        <div className="my-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-400">
          <blockquote className="italic text-gray-700 dark:text-gray-300 text-sm">
            "{citationText.length > 150 ? citationText.substring(0, 150) + "..." : citationText}"
          </blockquote>
          <p className="text-xs text-muted-foreground mt-2">— {bookTitle}</p>
        </div>

        {/* Boutons de partage */}
        <div className="grid grid-cols-2 gap-3">
          {shareOptions.map((option) => (
            <Button
              key={option.platform}
              variant="outline"
              className={`${option.color} transition-colors`}
              onClick={() => handleShare(option.platform)}
              disabled={shareMutation.isPending}
            >
              {option.icon}
              <span className="ml-2">{option.label}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Composant pour partager le groupe directement (sans citation spécifique)
interface ShareGroupButtonProps {
  groupId: string;
  groupName: string;
  variant?: "button" | "icon";
  groupType?: "CLASS" | "CLUB";
  className?: string;
}

export function ShareGroupButton({
  groupId,
  groupName,
  variant = "button",
  groupType = "CLASS",
  className,
}: ShareGroupButtonProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${appUrl}/share/${groupId}`;
  const groupLabel = groupType === "CLUB" ? "le club" : "la classe";
  const shareText = `Rejoignez ${groupLabel} de lecture "${groupName}" sur Conpagina !`;

  const handleShare = async (platform: "twitter" | "facebook" | "linkedin" | "copy_link") => {
    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          "_blank",
          "width=550,height=420"
        );
        break;
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
          "_blank",
          "width=550,height=420"
        );
        break;
      case "linkedin":
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          "_blank",
          "width=550,height=420"
        );
        break;
      case "copy_link":
        const success = await copyToClipboard(shareUrl);
        if (success) {
          setCopied(true);
          toast.success("Lien copié dans le presse-papier");
          setTimeout(() => setCopied(false), 2000);
        } else {
          toast.error("Impossible de copier le lien");
        }
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          variant === "button" ? (
            <Button variant="outline" size="sm" className={className}>
              <Share2 className="h-4 w-4 mr-2" />
              Partager {groupLabel}
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share2 className="h-4 w-4" />
            </Button>
          )
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleShare("twitter")} className="hover:bg-sky-50 hover:text-sky-600">
          <Twitter className="h-4 w-4 mr-2" />
          Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("facebook")} className="hover:bg-blue-50 hover:text-blue-600">
          <Facebook className="h-4 w-4 mr-2" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("linkedin")} className="hover:bg-indigo-50 hover:text-indigo-600">
          <Linkedin className="h-4 w-4 mr-2" />
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("copy_link")} className="hover:bg-gray-50 hover:text-gray-600">
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
          {copied ? "Copié !" : "Copier le lien"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
