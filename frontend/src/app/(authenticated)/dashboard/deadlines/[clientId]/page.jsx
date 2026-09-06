import DeadlineView from "@/components/deadlines/DeadlineView";

export default async function DeadlineViewPage({ params }) {
  const resolvedParams = await params;
  return <DeadlineView clientId={resolvedParams.clientId} />;
}
