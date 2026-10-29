import { Types } from 'mongoose';
import { User, DiamondSellerApplication } from '../models';
import { notificationService } from './notification.service';
import { AppError } from '../middleware/errorHandler';
import { getSkip } from '../utils/pagination';

export const DIAMOND_SELLER_MIN_DIAMONDS = 5000000;

export const diamondSellerService = {
  /**
   * Check eligibility for becoming a Diamond Seller:
   * Rule: User must possess at least 5,000,000 diamonds.
   */
  async getEligibility(userId: string) {
    const user = await User.findById(userId).select(
      'uid nickname avatar diamonds role sellerType isDiamondSeller diamondSellerBadge phone paymentInfo'
    );
    if (!user) throw new AppError('User not found', 404);

    const currentDiamonds = user.diamonds || 0;
    const requiredDiamonds = DIAMOND_SELLER_MIN_DIAMONDS;
    const isEligible = currentDiamonds >= requiredDiamonds;
    const isDiamondSeller = Boolean(
      user.role === 'diamond_seller' ||
      user.sellerType === 'diamond_seller' ||
      (user as any).isDiamondSeller
    );

    const latestApplication = await DiamondSellerApplication.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const hasPendingApplication = latestApplication?.status === 'pending';

    return {
      isEligible,
      currentDiamonds,
      requiredDiamonds,
      progressPercent: Math.min(100, Math.round((currentDiamonds / requiredDiamonds) * 100)),
      isDiamondSeller,
      hasPendingApplication,
      latestApplication,
      user: {
        _id: String(user._id),
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        diamonds: currentDiamonds,
        role: user.role,
        sellerType: user.sellerType,
        isDiamondSeller,
        diamondSellerBadge: Boolean((user as any).diamondSellerBadge),
        paymentInfo: user.paymentInfo,
      },
    };
  },

  /**
   * Submit diamond seller application
   */
  async submitApplication(
    userId: string,
    data: {
      realName: string;
      phone: string;
      whatsapp?: string;
      notes?: string;
      paymentMethods?: {
        bkash?: string;
        nagad?: string;
        rocket?: string;
        binance?: string;
        bybit?: string;
      };
    }
  ) {
    if (!data.realName || !data.realName.trim()) {
      throw new AppError('Real name is required', 400);
    }
    if (!data.phone || !data.phone.trim()) {
      throw new AppError('Phone number is required', 400);
    }

    const eligibility = await this.getEligibility(userId);

    if (eligibility.isDiamondSeller) {
      throw new AppError('You are already an approved Diamond Seller', 400);
    }

    if (eligibility.hasPendingApplication) {
      throw new AppError('You already have an application under review', 400);
    }

    if (!eligibility.isEligible) {
      throw new AppError(
        `You must have at least ${DIAMOND_SELLER_MIN_DIAMONDS.toLocaleString()} diamonds to apply for Diamond Seller. Current diamonds: ${eligibility.currentDiamonds.toLocaleString()}`,
        400
      );
    }

    const application = await DiamondSellerApplication.create({
      userId: new Types.ObjectId(userId),
      status: 'pending',
      diamondsAtApplication: eligibility.currentDiamonds,
      realName: data.realName.trim(),
      phone: data.phone.trim(),
      whatsapp: (data.whatsapp || '').trim(),
      notes: (data.notes || '').trim(),
      paymentMethods: {
        bkash: data.paymentMethods?.bkash?.trim() || '',
        nagad: data.paymentMethods?.nagad?.trim() || '',
        rocket: data.paymentMethods?.rocket?.trim() || '',
        binance: data.paymentMethods?.binance?.trim() || '',
        bybit: data.paymentMethods?.bybit?.trim() || '',
      },
    });

    // Optionally update user's payment info with the details provided
    if (data.paymentMethods) {
      const piUpdate: Record<string, any> = {};
      if (data.paymentMethods.bkash) {
        piUpdate['paymentInfo.bkash.number'] = data.paymentMethods.bkash;
        piUpdate['paymentInfo.bkash.phone'] = data.paymentMethods.bkash;
      }
      if (data.paymentMethods.nagad) {
        piUpdate['paymentInfo.nagad.number'] = data.paymentMethods.nagad;
        piUpdate['paymentInfo.nagad.phone'] = data.paymentMethods.nagad;
      }
      if (data.paymentMethods.rocket) {
        piUpdate['paymentInfo.rocket.number'] = data.paymentMethods.rocket;
        piUpdate['paymentInfo.rocket.phone'] = data.paymentMethods.rocket;
      }
      if (data.paymentMethods.binance) {
        piUpdate['paymentInfo.binance.walletAddress'] = data.paymentMethods.binance;
      }
      if (data.paymentMethods.bybit) {
        piUpdate['paymentInfo.bybit.walletAddress'] = data.paymentMethods.bybit;
      }
      if (Object.keys(piUpdate).length > 0) {
        await User.findByIdAndUpdate(userId, { $set: piUpdate }).catch(() => {});
      }
    }

    // Confirmation notification
    notificationService
      .createNotification({
        userId,
        type: 'system',
        title: '💎 Diamond Seller Application Submitted',
        message:
          'Your Diamond Seller application has been received with ' +
          eligibility.currentDiamonds.toLocaleString() +
          ' diamonds verified. The Admin team is reviewing your application.',
        targetUrl: '/diamond-seller-apply',
      })
      .catch(() => {});

    return application;
  },

  /**
   * Admin: List applications with filters and search
   */
  async getApplications(options: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));

    const filter: any = {};
    if (options.status && options.status !== 'all') {
      filter.status = options.status;
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingUsers = await User.find({
        $or: [
          { uid: { $regex: escaped, $options: 'i' } },
          { nickname: { $regex: escaped, $options: 'i' } },
        ],
      }).select('_id');

      filter.$or = [
        { realName: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { userId: { $in: matchingUsers.map((u) => u._id) } },
      ];
    }

    const total = await DiamondSellerApplication.countDocuments(filter);
    const applications = await DiamondSellerApplication.find(filter)
      .sort({ createdAt: -1 })
      .skip(getSkip(page, limit))
      .limit(limit)
      .populate('userId', 'uid nickname avatar diamonds role sellerType isDiamondSeller diamondSellerBadge phone isBanned')
      .populate('reviewedBy', 'nickname uid');

    return {
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Admin: Detailed view of application
   */
  async getApplicationDetail(applicationId: string) {
    const app = await DiamondSellerApplication.findById(applicationId)
      .populate('userId', 'uid nickname avatar diamonds coins role sellerType isDiamondSeller diamondSellerBadge phone paymentInfo createdAt isBanned')
      .populate('reviewedBy', 'nickname uid');

    if (!app) throw new AppError('Application not found', 404);

    return app;
  },

  /**
   * Admin: Review (Approve / Reject) application
   */
  async reviewApplication(
    applicationId: string,
    action: 'approve' | 'reject',
    adminId: string,
    reason?: string
  ) {
    const app = await DiamondSellerApplication.findById(applicationId);
    if (!app) throw new AppError('Application not found', 404);

    if (app.status !== 'pending') {
      throw new AppError(`Application is already ${app.status}`, 400);
    }

    if (action === 'approve') {
      app.status = 'approved';
      app.reviewedBy = new Types.ObjectId(adminId);
      app.reviewedAt = new Date();
      await app.save();

      // Automatically upgrade user to Diamond Seller role, badge, and sellerType
      await User.findByIdAndUpdate(app.userId, {
        $set: {
          role: 'diamond_seller',
          sellerType: 'diamond_seller',
          isDiamondSeller: true,
          diamondSellerBadge: true,
          isAgent: true,
        },
      });

      // Send congratulations notification
      notificationService
        .createNotification({
          userId: String(app.userId),
          type: 'system',
          title: '🎉 Diamond Seller Approved!',
          message:
            'Congratulations! Your Diamond Seller application has been approved by the Admin team. Your official DIAMOND SELLER badge is now active on your ID and profile!',
          targetUrl: '/profile',
        })
        .catch(() => {});

      return { success: true, status: 'approved' };
    } else {
      app.status = 'rejected';
      app.rejectionReason = reason || 'Requirements not met or information invalid';
      app.reviewedBy = new Types.ObjectId(adminId);
      app.reviewedAt = new Date();
      await app.save();

      notificationService
        .createNotification({
          userId: String(app.userId),
          type: 'system',
          title: 'Diamond Seller Application Update',
          message: `Your Diamond Seller application was not approved. Reason: ${app.rejectionReason}. You may re-apply when eligible.`,
          targetUrl: '/diamond-seller-apply',
        })
        .catch(() => {});

      return { success: true, status: 'rejected', reason: app.rejectionReason };
    }
  },
};
