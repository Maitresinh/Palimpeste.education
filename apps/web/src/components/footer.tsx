import Link from "next/link";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t py-4 px-4 mt-auto">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
                <p>© {currentYear} Conpagina. Tous droits réservés.</p>
                <nav className="flex gap-4">
                    <Link href={"/privacy" as any} className="hover:text-foreground transition-colors">
                        Confidentialité
                    </Link>
                    <Link href={"/legal" as any} className="hover:text-foreground transition-colors">
                        Mentions légales
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
