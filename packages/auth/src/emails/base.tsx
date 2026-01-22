/** @jsxImportSource react */
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

// Use CORS_ORIGIN or APP_URL on the server, NEXT_PUBLIC_APP_URL on the frontend
const baseUrl =
  process.env.CORS_ORIGIN ||
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3001";

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html>
    <Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      `}</style>
    </Head>
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src={`${baseUrl}/logo.png`}
            alt="Conpagina"
            height="32"
            style={logo}
          />
        </Section>
        <Section style={divider} />
        {children}
        <Section style={divider} />
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} Conpagina — Tous droits réservés
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "48px 24px",
  maxWidth: "560px",
};

const logoSection = {
  textAlign: "center" as const,
  padding: "0 0 32px",
};

const logo = {
  margin: "0 auto",
};

const divider = {
  borderTop: "1px solid #e5e5e5",
  margin: "0",
};

const footer = {
  padding: "32px 0 0",
};

const footerText = {
  color: "#737373",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0",
};
