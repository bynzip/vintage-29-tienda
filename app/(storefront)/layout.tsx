import StorefrontLayout from "@/components/StorefrontLayout";

export const revalidate = 60;

export default function StorefrontGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorefrontLayout>{children}</StorefrontLayout>;
}
