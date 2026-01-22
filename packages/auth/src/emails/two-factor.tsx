/** @jsxImportSource react */
import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout } from "./base";

interface TwoFactorEmailProps {
  otp: string;
}

export const TwoFactorEmail = ({ otp }: TwoFactorEmailProps) => (
  <EmailLayout preview="Votre code de vérification Conpagina">
    <Section style={content}>
      <Heading style={heading}>Code de vérification</Heading>
      <Text style={paragraph}>
        Utilisez le code ci-dessous pour compléter votre connexion :
      </Text>
      <Section style={codeContainer}>
        <Text style={code}>{otp}</Text>
      </Section>
      <Text style={note}>Ce code expire dans 5 minutes.</Text>
      <Section style={warningBox}>
        <Text style={warningText}>
          Ne partagez jamais ce code avec qui que ce soit. L'équipe Conpagina ne
          vous le demandera jamais.
        </Text>
      </Section>
    </Section>
  </EmailLayout>
);

TwoFactorEmail.PreviewProps = {
  otp: "847293",
} as TwoFactorEmailProps;

export default TwoFactorEmail;

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

const codeContainer = {
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const code = {
  backgroundColor: "#fafafa",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  color: "#0a0a0a",
  fontSize: "32px",
  fontWeight: "600" as const,
  letterSpacing: "6px",
  padding: "16px 24px",
  display: "inline-block",
  fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
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
  margin: "0",
};

const warningText = {
  color: "#525252",
  fontSize: "13px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0",
};
