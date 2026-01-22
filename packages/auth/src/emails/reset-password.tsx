/** @jsxImportSource react */
import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout } from "./base";

interface ResetPasswordEmailProps {
  url: string;
}

export const ResetPasswordEmail = ({ url }: ResetPasswordEmailProps) => (
  <EmailLayout preview="Réinitialisez votre mot de passe Conpagina">
    <Section style={content}>
      <Heading style={heading}>Réinitialisation du mot de passe</Heading>
      <Text style={paragraph}>
        Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur
        le bouton ci-dessous pour en choisir un nouveau.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={url}>
          Réinitialiser mon mot de passe
        </Button>
      </Section>
      <Text style={note}>Ce lien expire dans 1 heure.</Text>
      <Section style={warningBox}>
        <Text style={warningText}>
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          Votre mot de passe restera inchangé.
        </Text>
      </Section>
      <Text style={fallback}>
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
      </Text>
      <Text style={link}>{url}</Text>
    </Section>
  </EmailLayout>
);

ResetPasswordEmail.PreviewProps = {
  url: "https://conpagina.com/reset-password?token=xyz789abc123",
} as ResetPasswordEmailProps;

export default ResetPasswordEmail;

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

const warningBox = {
  backgroundColor: "#fafafa",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  padding: "16px",
  margin: "0 0 24px",
};

const warningText = {
  color: "#525252",
  fontSize: "13px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0",
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
