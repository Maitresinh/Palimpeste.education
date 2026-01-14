import { ImageResponse } from "next/og";

export const runtime = "edge";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;

  // Récupérer les données du groupe
  let groupData = null;
  try {
    const response = await fetch(
      `${serverUrl}/trpc/sharing.getPublicGroupInfo?input=${encodeURIComponent(JSON.stringify({ groupId }))}`,
      { cache: "no-store" }
    );

    if (response.ok) {
      const data = await response.json();
      groupData = data.result?.data || null;
    }
  } catch (error) {
    console.error("Error fetching group data for OG image:", error);
  }

  // Valeurs par défaut si pas de données
  const groupName = groupData?.group?.name || "Groupe de lecture";
  const memberCount = groupData?.memberCount || 0;
  const bookCount = groupData?.books?.length || 0;
  const citationCount = groupData?.stats?.totalShares || 0;
  const teacherName = groupData?.teacher?.name || "Anonyme";
  const timeRemaining = groupData?.timeRemaining;

  // Construire le texte du temps restant
  let timeText = "Sans échéance";
  if (timeRemaining) {
    if (timeRemaining.expired) {
      timeText = "Terminé";
    } else {
      timeText = `${timeRemaining.days}j ${timeRemaining.hours}h restants`;
    }
  }

  // Extraire une citation si disponible
  const featuredCitation = groupData?.recentCitations?.[0]?.citationText || null;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header avec dégradé */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "48px",
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            color: "white",
          }}
        >
          {/* Badge et titre */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              📚 Groupe de lecture
            </div>
          </div>

          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.1,
              maxWidth: "80%",
            }}
          >
            {groupName.length > 40 ? groupName.substring(0, 40) + "..." : groupName}
          </h1>

          <p
            style={{
              fontSize: "24px",
              opacity: 0.9,
              marginTop: "12px",
            }}
          >
            Animé par {teacherName}
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            padding: "32px 48px",
            gap: "24px",
          }}
        >
          {/* Lecteurs */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "white",
              padding: "24px 32px",
              borderRadius: "16px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "36px", marginBottom: "8px" }}>👥</span>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#1e293b" }}>
              {memberCount}
            </span>
            <span style={{ fontSize: "16px", color: "#64748b" }}>
              Lecteur{memberCount > 1 ? "s" : ""}
            </span>
          </div>

          {/* Livres */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "white",
              padding: "24px 32px",
              borderRadius: "16px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "36px", marginBottom: "8px" }}>📖</span>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#1e293b" }}>
              {bookCount}
            </span>
            <span style={{ fontSize: "16px", color: "#64748b" }}>
              Livre{bookCount > 1 ? "s" : ""}
            </span>
          </div>

          {/* Citations */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "white",
              padding: "24px 32px",
              borderRadius: "16px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "36px", marginBottom: "8px" }}>💬</span>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#1e293b" }}>
              {citationCount}
            </span>
            <span style={{ fontSize: "16px", color: "#64748b" }}>
              Citation{citationCount > 1 ? "s" : ""}
            </span>
          </div>

          {/* Temps restant */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: timeRemaining?.expired ? "#fef2f2" : "#f0fdf4",
              padding: "24px 32px",
              borderRadius: "16px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "36px", marginBottom: "8px" }}>⏱️</span>
            <span
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: timeRemaining?.expired ? "#dc2626" : "#16a34a",
                textAlign: "center",
              }}
            >
              {timeText}
            </span>
          </div>
        </div>

        {/* Citation en vedette */}
        {featuredCitation && (
          <div
            style={{
              display: "flex",
              margin: "0 48px 32px",
              padding: "24px",
              backgroundColor: "#fffbeb",
              borderRadius: "16px",
              borderLeft: "4px solid #f59e0b",
            }}
          >
            <span style={{ fontSize: "32px", marginRight: "16px" }}>❝</span>
            <p
              style={{
                fontSize: "20px",
                fontStyle: "italic",
                color: "#78716c",
                margin: 0,
                flex: 1,
              }}
            >
              {featuredCitation.length > 150
                ? featuredCitation.substring(0, 150) + "..."
                : featuredCitation}
            </p>
          </div>
        )}

        {/* Footer avec logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 48px",
            marginTop: "auto",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                backgroundColor: "#4f46e5",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "24px",
                fontWeight: 800,
              }}
            >
              C
            </div>
            <span style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b" }}>
              Conpagina
            </span>
          </div>
          <span style={{ fontSize: "18px", color: "#64748b" }}>
            La plateforme de lecture collaborative
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
