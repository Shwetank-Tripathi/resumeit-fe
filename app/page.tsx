import Image from "next/image";
import Button from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <Image
        src="/logo-transparent.png"
        alt="ResumeIt"
        width={244}
        height={80}
        priority
        unoptimized
        className="h-20 w-auto sm:h-24"
      />

      <div className="flex flex-col items-center gap-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          ResumeIt
        </h1>
        <p className="max-w-md text-base text-text-secondary sm:text-lg">
          An extended Overleaf for resumes.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button href="/login" variant="outline" size="md">
          Log in
        </Button>
        <Button href="/signup" variant="primary" size="md">
          Sign up
        </Button>
      </div>
    </div>
  );
}
