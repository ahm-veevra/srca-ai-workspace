import { LearningCenter } from "@/components/learning/learning-center";
import { PageGuide } from "@/components/ui/page-guide";

export const dynamic = "force-dynamic";

export default function LearnPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Learning Center</h1>
        <p className="text-sm text-muted-foreground">
          Short, plain-language guides to using the platform — what things mean, why they
          matter, and where to do them. No technical background needed.
        </p>
      </div>
      <PageGuide
        id="learn"
        title="the Learning Center"
        what="Bite-sized guides and a glossary that explain the platform in business terms."
        why="So anyone can understand and use AI capabilities without a technical background."
        when="Dip in whenever a concept is unfamiliar, or to onboard a new team member."
        example="Read 'Solutions vs Components' to understand what you're actually deploying."
      />
      <LearningCenter />
    </div>
  );
}
