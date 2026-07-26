import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

const technologies = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "PostgreSQL",
  "Docker",
  "Supabase",
  "GitHub",
];

export function Technology() {
  return (
    <Section>
      <FadeIn>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Technology
        </h2>
      </FadeIn>

      <FadeIn delay={0.08}>
        <ul className="mt-10 flex flex-wrap gap-3">
          {technologies.map((tech) => (
            <li
              key={tech}
              className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-muted transition-colors duration-200 hover:border-white/14 hover:text-foreground"
            >
              {tech}
            </li>
          ))}
        </ul>
      </FadeIn>
    </Section>
  );
}
