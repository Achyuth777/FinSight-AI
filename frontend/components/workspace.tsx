"use client";
import { Shell } from "./workspace/shell";
import { useInputMode } from "./workspace/input-mode";
import { useWorkspace } from "./workspace/use-workspace";
import { TransactionsScreen } from "./workspace/transactions-screen";
import { OverviewScreen } from "./workspace/screens/overview";
import { InvestigationsScreen } from "./workspace/screens/investigations";
import { NetworkScreen } from "./workspace/screens/network";
import { LaboratoryScreen } from "./workspace/screens/laboratory";
import { ChecksScreen } from "./workspace/screens/checks";
import { SearchScreen } from "./workspace/screens/search";

// One authenticated route. State and API actions live in useWorkspace; the shell draws navigation, context and feedback;
// each section is its own screen. Sections that need data render once a run exists.
export default function Workspace({ section }: { section: string }) {
  const ws = useWorkspace();
  useInputMode();
  const { run, cases, loaded } = ws;
  return (
    <Shell ws={ws} section={section}>
      {run && section === "overview" && <OverviewScreen ws={ws} />}
      {section === "transactions" && (run || !loaded) && (
        <TransactionsScreen
          key={loaded ? "ready" : "loading"}
          run={run}
          loading={!loaded}
          cases={cases}
          busy={ws.busy}
          error={ws.error}
          initialRisk={ws.landingRisk}
          onCreateCase={ws.createCase}
        />
      )}
      {(run || cases.length > 0) && section === "investigations" && <InvestigationsScreen ws={ws} />}
      {run && section === "network" && <NetworkScreen ws={ws} />}
      {section === "laboratory" && <LaboratoryScreen ws={ws} />}
      {run && section === "monitoring" && <ChecksScreen ws={ws} />}
      {run && section === "assistant" && <SearchScreen ws={ws} />}
    </Shell>
  );
}
