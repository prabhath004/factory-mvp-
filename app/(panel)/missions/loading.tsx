import { Skeleton } from "@/components/ui/skeleton";

export default function MissionsLoading() {
  return <div className="grid flex-1 gap-4 p-5"><Skeleton className="h-10 w-2/3" /><div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div></div>;
}
