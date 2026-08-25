import {
  Inject,
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { MotorcyclesService } from '../motorcycles/motorcycles.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { ReservationsService } from '../reservations/reservations.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  POSDashboardData,
  POSCustomerSearchResult,
  POSMotorcycleSearchResult,
  POSCustomerSearchQuery,
  POSMotorcycleSearchQuery,
  ValidatePOSTransactionDto,
  ValidatePOSTransactionResponse,
  CreatePOSTransactionDto,
  CreatePOSTransactionResponse,
  POSActiveReservationsQuery,
  POSActiveReservation,
  ConvertPOSReservationDto,
  POSErrorCode,
  getDiscountLimits,
  canApplyDiscount,
  MIN_DEPOSIT_PERCENT,
  MIN_DEPOSIT_AMOUNT_SAR,
} from '@motorcycle-system/shared-types';
import type { AuthenticatedUser } from '../common/types/authenticated-request.js';

@Injectable()
export class POSService {
  private idempotencyCache = new Map<string, { result: any; timestamp: number }>();
  private readonly IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CustomersService) private readonly customersService: CustomersService,
    @Inject(MotorcyclesService) private readonly motorcyclesService: MotorcyclesService,
    @Inject(OrdersService) private readonly ordersService: OrdersService,
    @Inject(ReservationsService) private readonly reservationsService: ReservationsService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {
    // Clean up idempotency cache every minute
    setInterval(() => this.cleanupIdempotencyCache(), 60 * 1000);
  }

  private cleanupIdempotencyCache() {
    const now = Date.now();
    for (const [key, value] of this.idempotencyCache.entries()) {
      if (now - value.timestamp > this.IDEMPOTENCY_WINDOW_MS) {
        this.idempotencyCache.delete(key);
      }
    }
  }

  async getDashboard(user: AuthenticatedUser): Promise<POSDashboardData> {
    const branchId = user.branchId;
    const isSuperAdmin = user.roleName === 'super_admin';

    // Super-admins have no assigned branch and see aggregate dashboard data.
    const branch = branchId
      ? await this.prisma.branch.findUnique({
          where: { id: branchId },
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        })
      : null;

    if (!branch && !isSuperAdmin) {
      throw new Error('Branch not found');
    }

    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's stats
    const [ordersCreated, reservationsCreated, orderSales, availableMotorcycles] =
      await Promise.all([
        // Orders created today
        this.prisma.order.count({
          where: {
            branchId: branchId || undefined,
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),

        // Reservations created today
        this.prisma.reservation.count({
          where: {
            branchId: branchId || undefined,
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),

        // Total sales today
        this.prisma.order.aggregate({
          where: {
            branchId: branchId || undefined,
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
            status: {
              in: ['confirmed', 'completed'],
            },
          },
          _sum: {
            netAmount: true,
          },
        }),

        // Available motorcycles count
        this.prisma.motorcycle.count({
          where: {
            branchId: branchId || undefined,
            status: 'available',
          },
        }),
      ]);

    // Get recent transactions (last 10)
    const recentOrders = await this.prisma.order.findMany({
      where: {
        branchId: branchId || undefined,
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        orderNumber: true,
        netAmount: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    const recentReservations = await this.prisma.reservation.findMany({
      where: {
        branchId: branchId || undefined,
      },
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        reservationNumber: true,
        createdAt: true,
      },
    });

    // Combine and sort recent transactions
    const recentTransactions: Array<{
      id: string;
      type: 'order' | 'reservation';
      number: string;
      customerName: string;
      motorcycleModel: string;
      amount: number;
      createdAt: string;
    }> = [
      ...recentOrders.map((order) => ({
        id: order.id,
        type: 'order' as const,
        number: order.orderNumber,
        customerName: 'N/A',
        motorcycleModel: 'N/A',
        amount: Number(order.netAmount),
        createdAt: order.createdAt.toISOString(),
      })),
      ...recentReservations.map((res) => ({
        id: res.id,
        type: 'reservation' as const,
        number: res.reservationNumber,
        customerName: 'N/A',
        motorcycleModel: 'N/A',
        amount: 0,
        createdAt: res.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Get discount limits for user's role
    const discountLimits = getDiscountLimits(user.roleName);

    // Check permissions
    const hasCustomerCreate = user.permissions.some(
      (p: any) => p.resource === 'customer' && p.action === 'create',
    );

    return {
      currentUser: {
        id: user.id,
        name: user.name,
        role: user.roleName,
        branch: branch
          ? {
              id: branch.id,
              nameAr: branch.nameAr,
              nameEn: branch.nameEn,
            }
          : null,
        permissions: {
          canApplyDiscount: true, // All authenticated users can attempt, validated server-side
          maxDiscountPercent: discountLimits.maxPercent,
          maxDiscountAmount: discountLimits.maxAmount,
          canCreateCustomer: hasCustomerCreate,
          canSwitchBranch: isSuperAdmin,
        },
      },
      todayStats: {
        ordersCreated,
        reservationsCreated,
        totalSales: Number(orderSales._sum?.netAmount || 0),
        availableMotorcycles,
      },
      recentTransactions,
    };
  }

  async searchCustomers(
    query: POSCustomerSearchQuery,
  ): Promise<POSCustomerSearchResult[]> {
    // Use existing customer search
    const customers = await this.customersService.search(query.q, query.limit);

    // Enhance with POS-specific data
    const enhancedCustomers = await Promise.all(
      customers.map(async (customer) => {
        // Get recent order count (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [recentOrderCount, activeReservationCount, lastOrder, defaultAddress] =
          await Promise.all([
            this.prisma.order.count({
              where: {
                customerId: customer.id,
                createdAt: {
                  gte: thirtyDaysAgo,
                },
              },
            }),

            this.prisma.reservation.count({
              where: {
                customerId: customer.id,
                status: 'active',
              },
            }),

            this.prisma.order.findFirst({
              where: {
                customerId: customer.id,
              },
              orderBy: {
                createdAt: 'desc',
              },
              select: {
                createdAt: true,
              },
            }),

            this.prisma.address.findFirst({
              where: {
                customerId: customer.id,
              },
              select: {
                addressLine: true,
                city: true,
              },
            }),
          ]);

        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined,
          recentOrderCount,
          activeReservationCount,
          lastTransactionDate: lastOrder?.createdAt.toISOString(),
          defaultAddress: defaultAddress
            ? {
                addressLine: defaultAddress.addressLine,
                city: defaultAddress.city || undefined,
              }
            : undefined,
        };
      }),
    );

    return enhancedCustomers;
  }

  async searchMotorcycles(
    query: POSMotorcycleSearchQuery,
    user: AuthenticatedUser,
  ): Promise<POSMotorcycleSearchResult[]> {
    const isSuperAdmin = user.roleName === 'super_admin';
    const branchId = query.branchId || user.branchId;

    if (!branchId && !isSuperAdmin) {
      throw new Error('Branch ID required');
    }

    // Build where clause
    const where: any = {
      status: 'available',
    };

    // Branch filter (unless super_admin searching across branches)
    if (branchId) {
      where.branchId = branchId;
    } else if (!isSuperAdmin) {
      where.branchId = user.branchId;
    }

    // Search term
    if (query.q) {
      where.OR = [
        { vin: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
        {
          brand: {
            OR: [
              { nameAr: { contains: query.q, mode: 'insensitive' } },
              { nameEn: { contains: query.q, mode: 'insensitive' } },
            ],
          },
        },
        {
          category: {
            OR: [
              { nameAr: { contains: query.q, mode: 'insensitive' } },
              { nameEn: { contains: query.q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const motorcycles = await this.prisma.motorcycle.findMany({
      where,
      take: query.limit,
      select: {
        id: true,
        vin: true,
        model: true,
        year: true,
        color: true,
        price: true,
        status: true,
        images: true,
        brand: {
          select: {
            nameAr: true,
            nameEn: true,
            logo: true,
          },
        },
        category: {
          select: {
            nameAr: true,
            nameEn: true,
          },
        },
      },
    });

    return motorcycles.map((m) => ({
      id: m.id,
      vin: m.vin,
      model: m.model,
      year: m.year,
      color: m.color || undefined,
      brand: {
        nameAr: m.brand.nameAr,
        nameEn: m.brand.nameEn,
        logo: m.brand.logo || undefined,
      },
      category: {
        nameAr: m.category.nameAr,
        nameEn: m.category.nameEn,
      },
      price: Number(m.price),
      status: m.status,
      images: Array.isArray(m.images) ? (m.images as string[]) : [],
    }));
  }

  // ─────────────────────────────────────────────────────────
  // TASK-003: Transaction Validation & Creation
  // ─────────────────────────────────────────────────────────

  async validateTransaction(
    dto: ValidatePOSTransactionDto,
    user: AuthenticatedUser,
  ): Promise<ValidatePOSTransactionResponse> {
    // Validate customer
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Customer not found',
      });
    }

    // Validate motorcycle
    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: dto.motorcycleId },
      select: {
        id: true,
        vin: true,
        model: true,
        price: true,
        status: true,
        branchId: true,
      },
    });

    if (!motorcycle) {
      throw new NotFoundException({
        code: 'MOTORCYCLE_NOT_FOUND',
        message: 'Motorcycle not found',
      });
    }

    // Branch validation
    const isSuperAdmin = user.roleName === 'super_admin';
    if (!isSuperAdmin && motorcycle.branchId !== user.branchId) {
      throw new BadRequestException({
        code: POSErrorCode.BRANCH_SCOPE_VIOLATION,
        message: 'Motorcycle not in your branch',
      });
    }

    const isAvailable = motorcycle.status === 'available';
    const totalAmount = Number(motorcycle.price);
    const discountAmount = dto.discount || 0;
    const netAmount = totalAmount - discountAmount;

    // Validate discount
    const discountAuth = canApplyDiscount(discountAmount, totalAmount, user.roleName);

    // Validate deposit for reservations
    const warnings: string[] = [];
    let depositAmount: number | undefined;
    let remainingAmount: number | undefined;

    if (dto.type === 'reservation' && dto.depositAmount !== undefined) {
      depositAmount = dto.depositAmount;
      const minDeposit = Math.max(
        totalAmount * (MIN_DEPOSIT_PERCENT / 100),
        MIN_DEPOSIT_AMOUNT_SAR,
      );

      if (depositAmount < minDeposit) {
        throw new BadRequestException({
          code: POSErrorCode.INVALID_DEPOSIT_AMOUNT,
          message: `Deposit must be at least ${minDeposit} EGP`,
        });
      }

      if (depositAmount > netAmount) {
        throw new BadRequestException({
          code: POSErrorCode.INVALID_DEPOSIT_AMOUNT,
          message: 'Deposit cannot exceed net amount',
        });
      }

      remainingAmount = netAmount - depositAmount;
    }

    if (!customer.isActive) {
      warnings.push('Customer is inactive');
    }

    if (!isAvailable) {
      warnings.push('Motorcycle is not available');
    }

    return {
      valid: customer.isActive && isAvailable && discountAuth.authorized,
      customer: {
        id: customer.id,
        name: customer.name,
        isActive: customer.isActive,
      },
      motorcycle: {
        id: motorcycle.id,
        vin: motorcycle.vin,
        model: motorcycle.model,
        price: totalAmount,
        status: motorcycle.status,
        isAvailable,
      },
      calculations: {
        totalAmount,
        discountAmount,
        netAmount,
        depositAmount,
        remainingAmount,
      },
      discountAuthorization: discountAuth,
      warnings,
    };
  }

  async createTransaction(
    dto: CreatePOSTransactionDto,
    user: AuthenticatedUser,
  ): Promise<CreatePOSTransactionResponse> {
    // Check idempotency
    const cached = this.idempotencyCache.get(dto.idempotencyKey);
    if (cached) {
      return cached.result;
    }

    // Validate transaction first
    const validation = await this.validateTransaction(
      {
        customerId: dto.customerId,
        motorcycleId: dto.motorcycleId,
        type: dto.type,
        discount: dto.discount?.amount,
        depositAmount: dto.reservationData?.depositAmount,
      },
      user,
    );

    if (!validation.valid) {
      if (!validation.customer.isActive) {
        throw new ConflictException({
          code: POSErrorCode.CUSTOMER_INACTIVE,
          message: 'Customer is inactive',
        });
      }
      if (!validation.motorcycle.isAvailable) {
        throw new ConflictException({
          code: POSErrorCode.MOTORCYCLE_NOT_AVAILABLE,
          message: 'Motorcycle is not available',
        });
      }
      if (!validation.discountAuthorization.authorized) {
        throw new BadRequestException({
          code: POSErrorCode.DISCOUNT_UNAUTHORIZED,
          message: validation.discountAuthorization.reason || 'Discount not authorized',
        });
      }
    }

    const isSuperAdmin = user.roleName === 'super_admin';
    let result: CreatePOSTransactionResponse;

    try {
      if (dto.type === 'order') {
        // Create order using existing OrdersService
        const orderData = {
          customerId: dto.customerId,
          motorcycleIds: [dto.motorcycleId],
          discount: dto.discount?.amount || 0,
          isDraft: false,
          notes: dto.notes,
        };

        const order = await this.ordersService.create(
          orderData,
          user.id,
          user.branchId,
          isSuperAdmin,
          false,
        );

        // Audit
        await this.auditService.log({
          userId: user.id,
          action: 'pos_order_created',
          entityType: 'order',
          entityId: order.id,
          before: {
            orderId: order.id,
            motorcycleId: dto.motorcycleId,
            discount: dto.discount?.amount || 0,
            idempotencyKey: dto.idempotencyKey,
          },
        });

        // Get motorcycle details for response
        const motorcycle = await this.prisma.motorcycle.findUnique({
          where: { id: dto.motorcycleId },
          include: {
            brand: {
              select: {
                nameAr: true,
                nameEn: true,
              },
            },
          },
        });

        result = {
          id: order.id,
          type: 'order',
          number: order.orderNumber,
          customer: {
            id: validation.customer.id,
            name: validation.customer.name,
            phone: order.customer.phone,
          },
          motorcycle: {
            id: dto.motorcycleId,
            vin: motorcycle!.vin,
            model: motorcycle!.model,
            brand: {
              nameAr: motorcycle!.brand.nameAr,
              nameEn: motorcycle!.brand.nameEn,
            },
          },
          totalAmount: validation.calculations.totalAmount,
          discount: validation.calculations.discountAmount,
          netAmount: validation.calculations.netAmount,
          createdAt: order.createdAt,
        };
      } else {
        // Create reservation using existing ReservationsService
        const reservationData = {
          customerId: dto.customerId,
          motorcycleId: dto.motorcycleId,
          paidAmount: dto.reservationData!.depositAmount,
          expirationDays: dto.reservationData?.expirationDays,
          address: dto.address,
          notes: dto.notes,
        };

        const reservation = await this.reservationsService.create(
          reservationData,
          user.id,
          user.branchId,
          isSuperAdmin,
          false,
        );

        // Audit
        await this.auditService.log({
          userId: user.id,
          action: 'pos_reservation_created',
          entityType: 'reservation',
          entityId: reservation.id,
          before: {
            reservationId: reservation.id,
            motorcycleId: dto.motorcycleId,
            depositAmount: dto.reservationData!.depositAmount,
            idempotencyKey: dto.idempotencyKey,
          },
        });

        // Get motorcycle details for response
        const motorcycle = await this.prisma.motorcycle.findUnique({
          where: { id: dto.motorcycleId },
          include: {
            brand: {
              select: {
                nameAr: true,
                nameEn: true,
              },
            },
          },
        });

        result = {
          id: reservation.id,
          type: 'reservation',
          number: reservation.reservationNumber,
          customer: {
            id: validation.customer.id,
            name: validation.customer.name,
            phone: reservation.customer.phone,
          },
          motorcycle: {
            id: dto.motorcycleId,
            vin: motorcycle!.vin,
            model: motorcycle!.model,
            brand: {
              nameAr: motorcycle!.brand.nameAr,
              nameEn: motorcycle!.brand.nameEn,
            },
          },
          totalAmount: validation.calculations.totalAmount,
          discount: 0,
          netAmount: validation.calculations.netAmount,
          depositAmount: dto.reservationData!.depositAmount,
          remainingAmount: validation.calculations.remainingAmount || 0,
          expiresAt: reservation.expiresAt || new Date().toISOString(),
          createdAt: reservation.createdAt,
        };
      }

      // Cache result with idempotency key
      this.idempotencyCache.set(dto.idempotencyKey, {
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error: any) {
      // Re-throw known errors
      if (error.code) {
        throw error;
      }

      // Handle timeout
      if (error.message?.includes('timeout')) {
        throw new ConflictException({
          code: POSErrorCode.TRANSACTION_TIMEOUT,
          message: 'Transaction timeout - please retry',
        });
      }

      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────
  // TASK-004: Reservation Management
  // ─────────────────────────────────────────────────────────

  async getActiveReservations(
    query: POSActiveReservationsQuery,
    user: AuthenticatedUser,
  ): Promise<POSActiveReservation[]> {
    const isSuperAdmin = user.roleName === 'super_admin';
    const branchId = query.branchId || user.branchId;

    // Branch validation
    if (!isSuperAdmin && branchId !== user.branchId) {
      throw new BadRequestException({
        code: POSErrorCode.BRANCH_SCOPE_VIOLATION,
        message: 'Cannot access other branch reservations',
      });
    }

    const where: any = {
      status: 'active',
      expiresAt: {
        gte: new Date(),
      },
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    // Filter by expiring soon
    if (query.expiringInDays !== undefined) {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + query.expiringInDays);
      where.expiresAt = {
        gte: new Date(),
        lte: expiringDate,
      };
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      orderBy: {
        expiresAt: 'asc',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        motorcycle: {
          select: {
            id: true,
            vin: true,
            model: true,
            brand: {
              select: {
                nameEn: true,
              },
            },
          },
        },
      },
    });

    const now = new Date();
    return reservations.map((res) => {
      const expiresAt = res.expiresAt ? new Date(res.expiresAt) : new Date();
      const expiresInDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: res.id,
        reservationNumber: res.reservationNumber,
        customer: {
          id: res.customer.id,
          name: res.customer.name,
          phone: res.customer.phone,
        },
        motorcycle: {
          id: res.motorcycle.id,
          vin: res.motorcycle.vin,
          model: res.motorcycle.model,
          brand: res.motorcycle.brand.nameEn,
        },
        depositAmount: Number(res.paidAmount),
        totalAmount: 0,
        remainingAmount: Number(res.remainingAmount),
        expiresAt: res.expiresAt?.toISOString() || '',
        expiresInDays,
        isExpiringSoon: expiresInDays <= 3,
        createdAt: res.createdAt.toISOString(),
      };
    });
  }

  async convertReservation(
    id: string,
    dto: ConvertPOSReservationDto,
    user: AuthenticatedUser,
  ): Promise<CreatePOSTransactionResponse> {
    // Validate reservation exists and is active
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        motorcycle: {
          include: {
            brand: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException({
        code: 'RESERVATION_NOT_FOUND',
        message: 'Reservation not found',
      });
    }

    if (reservation.status !== 'active') {
      throw new ConflictException({
        code: POSErrorCode.RESERVATION_NOT_ACTIVE,
        message: 'Reservation is not active',
      });
    }

    // Check expiration
    if (reservation.expiresAt && new Date() > reservation.expiresAt) {
      throw new ConflictException({
        code: POSErrorCode.RESERVATION_NOT_ACTIVE,
        message: 'Reservation has expired',
      });
    }

    // Branch validation
    const isSuperAdmin = user.roleName === 'super_admin';
    if (!isSuperAdmin && reservation.branchId !== user.branchId) {
      throw new BadRequestException({
        code: POSErrorCode.BRANCH_SCOPE_VIOLATION,
        message: 'Cannot convert reservation from another branch',
      });
    }

    // Use existing ReservationsService.convert
    const order = await this.reservationsService.convert(
      id,
      { notes: dto.notes },
      user.id,
      user.branchId,
      isSuperAdmin,
    );

    // Audit
    await this.auditService.log({
      userId: user.id,
      action: 'pos_reservation_converted',
      entityType: 'reservation',
      entityId: id,
      before: {
        reservationId: id,
        orderId: order.order.id,
      },
    });

    return {
      id: order.order.id,
      type: 'order',
      number: order.order.orderNumber,
      customer: {
        id: reservation.customer.id,
        name: reservation.customer.name,
        phone: reservation.customer.phone,
      },
      motorcycle: {
        id: reservation.motorcycle.id,
        vin: reservation.motorcycle.vin,
        model: reservation.motorcycle.model,
        brand: {
          nameAr: reservation.motorcycle.brand.nameAr,
          nameEn: reservation.motorcycle.brand.nameEn,
        },
      },
      totalAmount: 0,
      discount: 0,
      netAmount: Number(order.order.netAmount),
      createdAt: new Date().toISOString(),
    };
  }
}

