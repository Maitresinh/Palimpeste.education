/** @jsxImportSource react */
import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout } from "./base";

interface VerificationEmailProps {
  url: string;
}

export const VerificationEmail = ({ url }: VerificationEmailProps) => (
  <EmailLayout preview="Vérifiez votre adresse email pour Conpagina">
    <Section style={content}>
      <Heading style={heading}>Bienvenue sur Conpagina</Heading>
      <Text style={paragraph}>
        Merci de vous être inscrit. Pour commencer à utiliser Conpagina et
        accéder à votre bibliothèque numérique, veuillez confirmer votre adresse
        email en cliquant sur le bouton ci-dessous.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={url}>
          Vérifier mon email
        </Button>
      </Section>
      <Text style={note}>Ce lien expire dans 24 heures.</Text>
      <Text style={fallback}>
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
      </Text>
      <Text style={link}>{url}</Text>
    </Section>
  </EmailLayout>
);

VerificationEmail.PreviewProps = {
  url: "https://conpagina.com/verify?token=abc123def456",
} as VerificationEmailProps;

export default VerificationEmail;

const content = {
  padding: "32px 0",
};

const heading = {
  color: "#0a0a0a",
  fontSize: "24px",
  fontWeight: "600" as const,
  textAlign: "center" as const,
  margin: "0 0 24px",
  letterSpacing: "-0.025em",
};

const paragraph = {
  color: "#171717",
  fontSize: "15px",
  lineHeight: "26px",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const button = {
  backgroundColor: "#0a0a0a",
  borderRadius: "6px",
  color: "#fafafa",
  fontSize: "14px",
  fontWeight: "500" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const note = {
  color: "#525252",
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const fallback = {
  color: "#a3a3a3",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: "0",
};

const link = {
  color: "#525252",
  fontSize: "12px",
  textAlign: "center" as const,
  wordBreak: "break-all" as const,
  margin: "8px 0 0",
};
