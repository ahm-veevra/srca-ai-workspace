import { VGpt } from "@/components/workspace/v-gpt";

export const dynamic = "force-dynamic";

export default function VGptPage() {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">V-GPT</h1>
        <p className="text-sm text-muted-foreground">
          Your enterprise AI assistant. Chat, analyse documents, images and audio, generate
          reports and presentations, search your knowledge, compare models and run agents —
          every action governed, routed and traced through AICP.
        </p>
      </div>
      <VGpt />
    </div>
  );
}
