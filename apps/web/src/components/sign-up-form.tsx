import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
      acceptTerms: false,
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
          // @ts-ignore - Better Auth will handle the role
          role: "STUDENT",
          callbackURL: "/email-verified",
        },
        {
          onSuccess: () => {
            toast.success(
              "Compte créé ! Vérifiez votre email pour activer votre compte.",
              { duration: 10000 }
            );
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
        email: z.string().email("Email invalide"),
        password: z.string()
          .min(12, "Le mot de passe doit contenir au moins 12 caractères")
          .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
          .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
          .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
        acceptTerms: z.boolean().refine((val) => val === true, {
          message: "Vous devez accepter les conditions d'utilisation",
        }),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <span className="absolute -top-3 -right-6 z-10 bg-black text-white dark:bg-white dark:text-black text-xs font-semibold px-2 py-1 rounded">BETA</span>
          <img src="/logo_conpagina.png" alt="Conpagina" className="h-32 w-auto dark:invert" />
        </div>
      </div>
      <h1 className="mb-6 text-center text-3xl font-bold">Créer un compte</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Nom</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Mot de passe</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
                <p className="text-xs text-muted-foreground mt-1">
                  12 caractères minimum, avec majuscule, minuscule et chiffre
                </p>
              </div>
            )}
          </form.Field>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Vous êtes enseignant ?</strong> Après votre inscription, vous pourrez demander un compte enseignant sur <br /> <Link href="/dashboard/become-teacher" className="text-primary hover:underline">/dashboard/become-teacher</Link>.
          </p>
        </div>

        <div>
          <form.Field name="acceptTerms">
            {(field) => (
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={field.name}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked === true)}
                  />
                  <Label htmlFor={field.name} className="text-sm leading-normal cursor-pointer">
                    J'accepte les{" "}
                    <Link href={"/legal" as any} className="text-primary hover:underline" target="_blank">
                      CGU
                    </Link>{" "}
                    et la{" "}
                    <Link href={"/privacy" as any} className="text-primary hover:underline" target="_blank">
                      politique de confidentialité
                    </Link>
                  </Label>
                </div>
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? "Création..." : "Créer mon compte"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button
          variant="link"
          onClick={onSwitchToSignIn}
          className="text-indigo-600 hover:text-indigo-800"
        >
          Déjà un compte ? Se connecter
        </Button>
      </div>
    </div>
  );
}
