// app/admin/reports/page.tsx
import NftSalesReportClient from "@/components/admin/NftSalesReportClient";

export default function AdminReportsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">NFT sales report</h1>
      <NftSalesReportClient />
    </div>
  );
}
