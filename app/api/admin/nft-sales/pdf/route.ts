// app/api/admin/nft-sales/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/adminAuth';

export const runtime = 'nodejs';

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatSol(amount: number): string {
  return amount.toFixed(4);
}

function tierLabel(tierId: number | null): string {
  switch (tierId) {
    case 0:
      return 'Tree/Steel';
    case 1:
      return 'Bronze';
    case 2:
      return 'Silver';
    case 3:
      return 'Gold';
    case 4:
      return 'Platinum';
    default:
      return tierId === null ? 'Unknown' : `Tier ${tierId}`;
  }
}

function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, Math.floor(max / 2) - 1);
  const tail = text.slice(-Math.floor(max / 2) + 1);
  return `${head}…${tail}`;
}

export async function GET(req: NextRequest) {
  await requireAdminUser();

  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get('start');
  const endStr = searchParams.get('end');

  const startDate = parseDate(startStr);
  const endDate = parseDate(endStr);

  if (!startDate || !endDate) {
    return NextResponse.json(
      { ok: false, error: 'Invalid or missing "start" / "end" query parameters' },
      { status: 400 },
    );
  }

  // Make the end boundary exclusive: [start, end+1 day)
  const endExclusive = new Date(endDate.getTime());
  endExclusive.setDate(endExclusive.getDate() + 1);

  const events = await prisma.nftMintEvent.findMany({
    where: {
      createdAt: { gte: startDate, lt: endExclusive },
      paidSol: { gt: 0 },
      network: 'mainnet',
    },
    orderBy: { createdAt: 'asc' },
  });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const marginLeft = 40;
  const marginRight = width - 40;
  let y = height - 40;
  const lineHeight = 14;

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    opts?: { size?: number; bold?: boolean },
  ) => {
    page.setFont(opts?.bold ? fontBold : font);
    page.setFontSize(opts?.size ?? 10);
    page.drawText(text, { x, y: yPos });
  };

  const newPage = () => {
    page = pdfDoc.addPage();
    y = height - 40;
    page.setFont(font);
  };

  // Header
  drawText('VIGRI NFT Sales Report', marginLeft, y, { size: 14, bold: true });
  y -= lineHeight * 2;

  // Operator info
  drawText('Operator:', marginLeft, y, { bold: true });
  y -= lineHeight;
  drawText('ADET OÜ, reg. nr. 16470156', marginLeft, y);
  y -= lineHeight;
  drawText('Address: Lootsi tn 8, 10151 Tallinn, Estonia', marginLeft, y);
  y -= lineHeight;
  drawText('Email: info@adet.ee   Phone: +372 53077053', marginLeft, y);
  y -= lineHeight;
  drawText('Website: https://adet.ee', marginLeft, y);
  y -= lineHeight * 2;

  // Platform & period
  drawText('Platform: VIGRI', marginLeft, y, { bold: true });
  y -= lineHeight;
  drawText('vigri.ee', marginLeft, y);
  y -= lineHeight;
  drawText(`Report period: ${formatDate(startDate)} – ${formatDate(endDate)}`, marginLeft, y);
  y -= lineHeight;
  drawText(`Report date: ${formatDate(new Date())}`, marginLeft, y);
  y -= lineHeight * 2;

  // Table header
  const colDate = marginLeft;
  const colTier = colDate + 80;
  const colQty = colTier + 80;
  const colUnit = colQty + 40;
  const colTotal = colUnit + 60;
  const colWallet = colTotal + 70;
  const colTx = colWallet + 90;

  drawText('Date', colDate, y, { bold: true });
  drawText('Tier', colTier, y, { bold: true });
  drawText('Qty', colQty, y, { bold: true });
  drawText('Unit SOL', colUnit, y, { bold: true });
  drawText('Total SOL', colTotal, y, { bold: true });
  drawText('Buyer wallet', colWallet, y, { bold: true });
  drawText('Tx signature', colTx, y, { bold: true });
  y -= lineHeight;

  page.drawLine({
    start: { x: marginLeft, y: y + 4 },
    end: { x: marginRight, y: y + 4 },
    thickness: 0.5,
  });

  y -= lineHeight;

  let totalSol = 0;

  if (events.length === 0) {
    drawText('No paid NFT sales for the selected period.', marginLeft, y);
  } else {
    for (const ev of events) {
      if (y < 60) {
        newPage();
      }

      const dateStr = formatDate(ev.createdAt);
      const tierStr = tierLabel(ev.tierId ?? null);
      const qty = ev.quantity ?? 1;
      const unitSol = qty > 0 ? ev.paidSol / qty : ev.paidSol;
      const totalRowSol = ev.paidSol;

      totalSol += totalRowSol;

      const walletShort = shorten(ev.wallet, 14);
      const txShort = shorten(ev.txSignature, 18);

      drawText(dateStr, colDate, y);
      drawText(tierStr, colTier, y);
      drawText(String(qty), colQty, y);
      drawText(formatSol(unitSol), colUnit, y);
      drawText(formatSol(totalRowSol), colTotal, y);
      drawText(walletShort, colWallet, y);
      drawText(txShort, colTx, y);

      y -= lineHeight;
    }
  }

  y -= lineHeight * 2;

  if (y < 60) {
    newPage();
  }

  drawText(`Total for period (SOL): ${formatSol(totalSol)}`, marginLeft, y, {
    bold: true,
  });

  const pdfBytes = await pdfDoc.save();
  const fileName = `vigri-nft-sales-${startStr}-${endStr}.pdf`;

  return new NextResponse(pdfBytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
    },
  });
}
