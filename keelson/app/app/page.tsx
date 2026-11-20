import type { Metadata } from "next";
import "../app.css";
import KeelsonApp from "@/components/KeelsonApp";

export const metadata: Metadata = {
  title: "Keelson — your vessel SMS",
};

export default function AppPage() {
  return <KeelsonApp />;
}
