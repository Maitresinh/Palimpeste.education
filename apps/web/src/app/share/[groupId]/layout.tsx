import type { Metadata } from "next";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface Props {
  params: Promise<{ groupId: string }>;
}

// Fonction pour récupérer les données du groupe côté serveur
async function getGroupData(groupId: string) {
  try {
    const response = await fetch(
      `${serverUrl}/trpc/sharing.getPublicGroupInfo?input=${encodeURIComponent(JSON.stringify({ groupId }))}`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.result?.data || null;
  } catch (error) {
    console.error("Error fetching group data:", error);
    return null;
  }
}

// Générer les métadonnées dynamiques pour le SEO et les réseaux sociaux
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params;
  const data = await getGroupData(groupId);

  if (!data) {
    return {
      title: "Groupe de lecture - Conpagina",
      description: "Rejoignez ce groupe de lecture sur Conpagina",
    };
  }

  const { group, memberCount, books, timeRemaining, recentCitations } = data;

  // Construire la description
  let description = `${memberCount} lecteur${memberCount > 1 ? "s" : ""} participent à "${group.name}"`;

  if (timeRemaining && !timeRemaining.expired) {
    description += ` • ${timeRemaining.days}j ${timeRemaining.hours}h restants`;
  }

  if (books.length > 0) {
    description += ` • ${books.length} livre${books.length > 1 ? "s" : ""}`;
  }

  if (recentCitations.length > 0) {
    description += ` • ${recentCitations.length} citation${recentCitations.length > 1 ? "s" : ""} partagée${recentCitations.length > 1 ? "s" : ""}`;
  }

  // URL de l'image OG dynamique
  const ogImageUrl = `${appUrl}/share/${groupId}/og-image`;

  return {
    title: `${group.name} - Groupe de lecture | Conpagina`,
    description,
    openGraph: {
      title: `${group.name} - Groupe de lecture`,
      description,
      type: "website",
      url: `${appUrl}/share/${groupId}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Groupe de lecture: ${group.name}`,
        },
      ],
      siteName: "Conpagina",
    },
    twitter: {
      card: "summary_large_image",
      title: `${group.name} - Groupe de lecture`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
