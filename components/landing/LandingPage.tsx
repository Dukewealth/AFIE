import { SiteShell } from "@/components/site/SiteShell";
import { HeroEngineCore } from "@/components/landing/HeroEngineCore";
import { LossCalculator } from "@/components/landing/LossCalculator";
import { BentoBreakthroughs } from "@/components/landing/BentoBreakthroughs";
import { NetworkTelemetry } from "@/components/landing/NetworkTelemetry";

export function LandingPage() {
  return (
    <SiteShell>
      <HeroEngineCore />
      <LossCalculator />
      <BentoBreakthroughs />
      <NetworkTelemetry />
    </SiteShell>
  );
}
