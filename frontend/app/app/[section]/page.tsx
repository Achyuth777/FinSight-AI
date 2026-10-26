import Workspace from "@/components/workspace";
import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/session";
const sections = [
  "overview",
  "transactions",
  "investigations",
  "network",
  "laboratory",
  "monitoring",
  "assistant",
];
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  if (!(await isAuthenticated())) redirect("/login");
  return <Workspace section={section} />;
}
