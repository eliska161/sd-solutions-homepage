import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

const technologies = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "PostgreSQL",
  "Docker",
  "Linux",
  "Supabase",
  "GitHub",
];

export function Technology() {
  return (
    <Section>
      <FadeIn>
        <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
          Teknologi
        </h2>
      </FadeIn>

      <FadeIn delay={0.08}>
        <ul className="mt-12 flex flex-wrap gap-x-2 gap-y-2 sm:mt-14">
          {technologies.map((tech) => (
            <li
              key={tech}
              className="rounded-full border border-border px-4 py-2 text-[13px] text-muted transition-colors duration-200 hover:border-white/16 hover:text-foreground"
            >
              {tech}
            </li>
          ))}
        </ul>
      </FadeIn>
    </Section>
  );
}
