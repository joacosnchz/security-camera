import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { isAuthenticated } from "@/lib/auth";
import WatchClient from "./WatchClient";

export default async function WatchPage() {
  if (!(await isAuthenticated())) redirect("/login?next=/watch");
  return <><AppHeader current="watch" /><WatchClient /></>;
}

