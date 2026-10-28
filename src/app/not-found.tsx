import { ButtonLink, Eyebrow } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-10 sm:py-20">
      <Eyebrow>Error 404</Eyebrow>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-7xl">
        Offside.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="mt-8">
        <ButtonLink href="/">Back to the power ranking</ButtonLink>
      </div>
    </div>
  );
}
