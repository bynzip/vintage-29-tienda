import StorefrontLayout from "@/components/StorefrontLayout";

export default function StorefrontGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorefrontLayout>{children}</StorefrontLayout>;
}
