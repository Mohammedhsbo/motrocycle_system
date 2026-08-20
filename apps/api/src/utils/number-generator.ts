import { Prisma } from '@prisma/client';

/**
 * Retries an operation if a unique constraint violation (P2002) occurs.
 * This is used to ensure concurrency-safe number generation.
 */
export async function withUniqueRetry<T>(
  operation: (attempt: number) => Promise<T>,
  maxRetries = 5
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error('Failed to generate a unique sequence number after maximum retries.');
        }
        // Small random delay before retry to avoid thundering herd
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Unreachable');
}

/**
 * Generates the next sequential purchase number for a given branch and year.
 * Format: PO-{branchCode}-{year}-{sequence}
 * Example: PO-RYD-2026-00001
 */
export async function generatePurchaseNumber(
  prisma: any, // using any to avoid tight coupling to PrismaService implementation in utils
  branchCode: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `PO-${branchCode.toUpperCase()}-${year}-`;

  const lastPurchase = await prisma.purchase.findFirst({
    where: {
      purchaseNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      purchaseNumber: 'desc',
    },
    select: {
      purchaseNumber: true,
    },
  });

  let nextSeq = 1;
  if (lastPurchase?.purchaseNumber) {
    const lastSeqStr = lastPurchase.purchaseNumber.replace(prefix, '');
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(5, '0')}`;
}

/**
 * Generates the next sequential transfer number globally for a given year.
 * Format: TRF-{year}-{sequence}
 * Example: TRF-2026-00001
 */
export async function generateTransferNumber(
  prisma: any,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `TRF-${year}-`;

  const lastTransfer = await prisma.transfer.findFirst({
    where: {
      transferNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      transferNumber: 'desc',
    },
    select: {
      transferNumber: true,
    },
  });

  let nextSeq = 1;
  if (lastTransfer?.transferNumber) {
    const lastSeqStr = lastTransfer.transferNumber.replace(prefix, '');
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(5, '0')}`;
}

/**
 * Generates the next sequential order number for a given branch and year.
 * Format: ORD-{branchCode}-{year}-{sequence}
 * Example: ORD-RYD-2026-00001
 */
export async function generateOrderNumber(
  prisma: any,
  branchCode: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `ORD-${branchCode.toUpperCase()}-${year}-`;

  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: 'desc',
    },
    select: {
      orderNumber: true,
    },
  });

  let nextSeq = 1;
  if (lastOrder?.orderNumber) {
    const lastSeqStr = lastOrder.orderNumber.replace(prefix, '');
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(5, '0')}`;
}

/**
 * Generates the next sequential invoice number for a given branch and year.
 * Format: INV-{branchCode}-{year}-{sequence}
 * Example: INV-RYD-2026-00001
 */
export async function generateInvoiceNumber(
  prisma: any,
  branchCode: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `INV-${branchCode.toUpperCase()}-${year}-`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
    select: {
      invoiceNumber: true,
    },
  });

  let nextSeq = 1;
  if (lastInvoice?.invoiceNumber) {
    const lastSeqStr = lastInvoice.invoiceNumber.replace(prefix, '');
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(5, '0')}`;
}

/**
 * Generates a unique payment reference.
 * Format: PAY-{timestamp}-{random}
 * Example: PAY-1704067200000-A3F9
 */
export async function generatePaymentReference(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PAY-${timestamp}-${random}`;
}

/**
 * Generates a unique refund reference.
 * Format: REF-{timestamp}-{random}
 * Example: REF-1704067200000-B7D2
 */
export async function generateRefundReference(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REF-${timestamp}-${random}`;
}

/**
 * Generates the next sequential financing contract number for a given branch and year.
 * Format: FIN-{branchCode}-{year}-{sequence}
 * Example: FIN-RYD-2026-00001
 */
export async function generateFinancingContractNumber(
  prisma: any,
  branchCode: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `FIN-${branchCode.toUpperCase()}-${year}-`;

  const lastContract = await prisma.financingContract.findFirst({
    where: {
      contractNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      contractNumber: 'desc',
    },
    select: {
      contractNumber: true,
    },
  });

  let nextSeq = 1;
  if (lastContract?.contractNumber) {
    const lastSeqStr = lastContract.contractNumber.replace(prefix, '');
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(5, '0')}`;
}

/**
 * Generates the next sequential letter number for a given branch and year.
 * Format: LTR-{branchCode}-{year}-{sequence}
 * Example: LTR-RYD-2026-00001
 */
export async function generateLetterNumber(
  prisma: any,
  branchCode: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `LTR-${branchCode.toUpperCase()}-${year}-`;

  const lastLetter = await prisma.letter.findFirst({
    where: {
      letterNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      letterNumber: 'desc',
    },
    select: {
      letterNumber: true,
    },
  });

  let nextSeq = 1;
  if (lastLetter?.letterNumber) {
    const lastSeqStr = lastLetter.letterNumber.replace(prefix, '');
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(5, '0')}`;
}
