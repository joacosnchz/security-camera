import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { isAuthenticated } from "@/lib/auth";
import StreamClient from "./StreamClient";

export default async function StreamPage() {
  if (!(await isAuthenticated())) redirect("/login?next=/stream");
  return <><AppHeader current="stream" /><StreamClient /></>;
}

