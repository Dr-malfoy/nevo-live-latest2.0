import { VerificationRequest, User, Notification } from '../models';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';
import { getIO } from '../socket';

export const VERIFICATION_REQUIRED_CODE = 'VERIFICATION_REQUIRED';
export const FACE_VERIFICATION_REQUIRED_CODE = 'FACE_VERIFICATION_REQUIRED';
export const NID_VERIFICATION_REQUIRED_CODE = 'NID_VERIFICATION_REQUIRED';

/** Push the user's own verification state into the `User.verification` block. */
const syncUserVerification = async (userId: string, request: any) => {
  const verified = request.status === 'verified';
  const user = await User.findById(userId);
  if (!user) return;

  const currentVer = user.verification || {
    status: 'NOT_SUBMITTED',
    verified: false,
  };

  const isFaceReq = request.verificationType === 'face';
  const isNidReq = request.verificationType === 'nid';

  const newFaceVerified = isFaceReq ? verified : (currentVer.faceVerified || false);
  const newNidVerified = isNidReq ? verified : (currentVer.nidVerified || false);
  const overallVerified = verified || newFaceVerified || newNidVerified;

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        'verification.status': overallVerified
          ? 'VERIFIED'
          : request.status === 'rejected'
          ? 'REJECTED'
          : request.status === 'under_review'
          ? 'UNDER_REVIEW'
          : 'PENDING',
        'verification.type': request.accountType || currentVer.type || 'host',
        'verification.verified': overallVerified,
        'verification.faceVerified': newFaceVerified,
        'verification.faceVerifiedAt': newFaceVerified ? (currentVer.faceVerifiedAt || new Date()) : undefined,
        'verification.facePhotoUrl': request.facePhotoUrl || request.selfieUrl || currentVer.facePhotoUrl,
        'verification.nidVerified': newNidVerified,
        'verification.nidVerifiedAt': newNidVerified ? (currentVer.nidVerifiedAt || new Date()) : undefined,
        'verification.nidStatus': isNidReq
          ? (verified ? 'VERIFIED' : request.status === 'rejected' ? 'REJECTED' : 'PENDING')
          : (currentVer.nidStatus || 'NOT_SUBMITTED'),
        'verification.nidNumber': request.nidNumber || currentVer.nidNumber,
        'verification.verifiedAt': overallVerified ? (currentVer.verifiedAt || new Date()) : undefined,
        'verification.rejectionReason': request.status === 'rejected' ? request.rejectionReason : undefined,
        'verification.submittedAt': request.submittedAt,
        'verification.reviewedAt': request.reviewedAt || undefined,
      },
    }
  );
};

const notifyAdmins = async (title: string, message: string) => {
  const admins = await User.find({ role: 'admin' }).select('_id');
  for (const admin of admins) {
    await Notification.create({ userId: admin._id, type: 'system', title, message });
  }
  try {
    getIO().emit('verification:new', {});
  } catch {
    // socket not initialized
  }
};

/** Does this user need verification for restricted (creator/agency) features? */
export const requiresVerification = (user: any): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return false;
  return true;
};

/** Is this user allowed to use general verified features? */
export const isVerified = (user: any): boolean => {
  return !!user?.verification?.verified || !!user?.verification?.faceVerified || !!user?.verification?.nidVerified || user?.role === 'admin';
};

/** Is this user face verified for Live, Party, Chat, and Moments? */
export const isFaceVerified = (user: any): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return !!user.verification?.faceVerified || !!user.verification?.verified;
};

/** Is this user NID verified for Coin Trading, Buying/Selling Diamonds? */
export const isNidVerified = (user: any): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return !!user.verification?.nidVerified;
};

/** Throw 403 FACE_VERIFICATION_REQUIRED unless the user has completed live face verification. */
export const assertFaceVerified = (user: any) => {
  if (!isFaceVerified(user)) {
    throw new AppError(
      'Live Face Verification is required to Go Live, create Party rooms, send messages, or post Moments. Please complete live face verification.',
      403,
      FACE_VERIFICATION_REQUIRED_CODE
    );
  }
};

/** Throw 403 NID_VERIFICATION_REQUIRED unless the user has completed NID verification. */
export const assertNidVerified = (user: any) => {
  if (!isNidVerified(user)) {
    throw new AppError(
      'NID Verification is required to trade coins and buy/sell diamonds. Please complete NID verification.',
      403,
      NID_VERIFICATION_REQUIRED_CODE
    );
  }
};

/** Throw 403 VERIFICATION_REQUIRED unless the user may use restricted features. */
export const assertVerified = (user: any) => {
  if (!isVerified(user)) {
    throw new AppError('Please verify your account before using this feature', 403, VERIFICATION_REQUIRED_CODE);
  }
};

export const verificationService = {
  /** User completes Live Face Verification — automatically verifies live profile! */
  async verifyFace(userId: string, body: { selfieUrl?: string; base64Image?: string }) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const now = new Date();
    const photoUrl = body.selfieUrl || body.base64Image;
    if (!photoUrl || !photoUrl.trim() || photoUrl.length < 10) {
      throw new AppError('A live captured face photo is required for face verification. Please position your face in the camera frame.', 400);
    }

    // Automatically mark user as face verified!
    let existing = await VerificationRequest.findOne({ userId, verificationType: 'face' })
      || await VerificationRequest.findOne({ userId });

    let request;
    if (existing) {
      existing.verificationType = 'face';
      existing.status = 'verified';
      existing.facePhotoUrl = photoUrl;
      existing.selfieUrl = photoUrl;
      existing.reviewedAt = now;
      existing.submittedAt = now;
      existing.auditLog.push({
        action: 'APPROVED',
        from: existing.status,
        to: 'VERIFIED',
        timestamp: now,
      } as any);
      await existing.save();
      request = existing;
    } else {
      try {
        request = await VerificationRequest.create({
          userId,
          verificationType: 'face',
          accountType: user.role === 'agent' ? 'agency' : 'host',
          fullName: user.nickname,
          olaId: user.uid,
          selfieUrl: photoUrl,
          facePhotoUrl: photoUrl,
          status: 'verified',
          submittedAt: now,
          reviewedAt: now,
          auditLog: [
            { action: 'SUBMITTED', from: 'NOT_SUBMITTED', to: 'VERIFIED', timestamp: now },
            { action: 'APPROVED', from: 'SUBMITTED', to: 'VERIFIED', timestamp: now },
          ],
        });
      } catch (err: any) {
        if (err.code === 11000) {
          request = await VerificationRequest.findOneAndUpdate(
            { userId },
            {
              $set: {
                verificationType: 'face',
                status: 'verified',
                selfieUrl: photoUrl,
                facePhotoUrl: photoUrl,
                submittedAt: now,
                reviewedAt: now,
              },
            },
            { new: true, upsert: true }
          );
        } else {
          throw err;
        }
      }
    }

    // Direct User update
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'verification.faceVerified': true,
          'verification.faceVerifiedAt': now,
          'verification.facePhotoUrl': photoUrl,
          'verification.verified': true,
          'verification.status': 'VERIFIED',
          'verification.verifiedAt': user.verification?.verifiedAt || now,
        },
      }
    );

    await auditService.logAudit(userId, 'verification_face_auto_approve', 'VerificationRequest', request?._id?.toString() || '');

    // Send confirmation notification
    await notificationService.createNotification(
      userId,
      'system',
      'Live Face Verification Complete!',
      'Congratulations! Your live face verification is approved. You can now Go Live, host Voice Party rooms, send messages, and post Moments.'
    );

    // Socket update
    try {
      getIO().to(`user:${userId}`).emit('verification:updated', {
        status: 'VERIFIED',
        verified: true,
        faceVerified: true,
        nidVerified: user.verification?.nidVerified || false,
      });
    } catch {
      // socket not initialized
    }

    const updatedUser = await User.findById(userId).select('-password -assetPassword');
    return {
      request,
      user: updatedUser,
      verified: true,
      faceVerified: true,
    };
  },

  /** User submits NID Verification — automatically verifies or submits for trade/diamond buying/selling. */
  async submitNid(userId: string, body: {
    fullName: string;
    nidNumber: string;
    dateOfBirth: string;
    documentType?: 'nid' | 'olaid' | 'passport' | 'driving_license';
    documentFrontUrl: string;
    documentBackUrl: string;
    selfieUrl?: string;
    accountType?: 'host' | 'agency' | 'user';
    autoApprove?: boolean;
  }) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const now = new Date();
    // NID verification strictly requires Admin Review & Approval
    const status = 'pending';

    let existing = await VerificationRequest.findOne({ userId, verificationType: 'nid' })
      || await VerificationRequest.findOne({ userId });

    let request;
    if (existing) {
      existing.verificationType = 'nid';
      existing.fullName = body.fullName;
      existing.nidNumber = body.nidNumber;
      existing.olaId = body.nidNumber;
      existing.dateOfBirth = body.dateOfBirth;
      existing.documentType = body.documentType || 'nid';
      existing.documentFrontUrl = body.documentFrontUrl;
      existing.documentBackUrl = body.documentBackUrl;
      existing.selfieUrl = body.selfieUrl || existing.selfieUrl || '';
      existing.status = status;
      existing.submittedAt = now;
      existing.rejectionReason = undefined;
      existing.auditLog.push({
        action: 'SUBMITTED',
        from: existing.status,
        to: 'PENDING',
        timestamp: now,
      } as any);
      await existing.save();
      request = existing;
    } else {
      try {
        request = await VerificationRequest.create({
          userId,
          verificationType: 'nid',
          accountType: body.accountType || (user.role === 'agent' ? 'agency' : 'host'),
          fullName: body.fullName,
          olaId: body.nidNumber,
          nidNumber: body.nidNumber,
          dateOfBirth: body.dateOfBirth,
          documentType: body.documentType || 'nid',
          documentFrontUrl: body.documentFrontUrl,
          documentBackUrl: body.documentBackUrl,
          selfieUrl: body.selfieUrl || '',
          status: 'pending',
          submittedAt: now,
          auditLog: [
            { action: 'SUBMITTED', from: 'NOT_SUBMITTED', to: 'PENDING', timestamp: now },
          ],
        });
      } catch (err: any) {
        if (err.code === 11000) {
          request = await VerificationRequest.findOneAndUpdate(
            { userId },
            {
              $set: {
                verificationType: 'nid',
                fullName: body.fullName,
                olaId: body.nidNumber,
                nidNumber: body.nidNumber,
                dateOfBirth: body.dateOfBirth,
                documentType: body.documentType || 'nid',
                documentFrontUrl: body.documentFrontUrl,
                documentBackUrl: body.documentBackUrl,
                selfieUrl: body.selfieUrl || '',
                status: 'pending',
                submittedAt: now,
              },
            },
            { new: true, upsert: true }
          );
        } else {
          throw err;
        }
      }
    }

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'verification.nidStatus': 'PENDING',
          'verification.nidVerified': false,
          'verification.nidNumber': body.nidNumber,
          'verification.submittedAt': now,
        },
      }
    );

    // Notify all system administrators to review NID verification at http://localhost:3001/verification
    await notifyAdmins(
      'New NID Verification Request',
      `User ${user.nickname} (UID: ${user.uid}) submitted NID documents for verification. Please review at http://localhost:3001/verification.`
    );

    await auditService.logAudit(userId, 'verification_nid_submit', 'VerificationRequest', request?._id?.toString() || '');

    try {
      getIO().to(`user:${userId}`).emit('verification:updated', {
        status: 'PENDING',
        nidStatus: 'PENDING',
        verified: !!user.verification?.faceVerified,
        nidVerified: false,
        faceVerified: user.verification?.faceVerified || false,
      });
    } catch {
      // socket not initialized
    }

    const updatedUser = await User.findById(userId).select('-password -assetPassword');
    return {
      request,
      user: updatedUser,
      verified: !!user.verification?.faceVerified,
      nidVerified: false,
      nidStatus: 'PENDING',
      message: 'NID documents submitted successfully and are pending admin review.',
    };
  },

  /** Legacy / combined submit handler */
  async submit(userId: string, body: {
    accountType?: 'host' | 'agency' | 'user';
    fullName?: string;
    olaId?: string;
    nidNumber?: string;
    dateOfBirth?: string;
    documentType?: 'nid' | 'olaid' | 'passport' | 'driving_license';
    documentFrontUrl?: string;
    documentBackUrl?: string;
    selfieUrl?: string;
    facePhotoUrl?: string;
  }) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const now = new Date();
    const existing = await VerificationRequest.findOne({ userId });

    if (existing) {
      existing.accountType = body.accountType || 'host';
      if (body.fullName) existing.fullName = body.fullName;
      if (body.olaId || body.nidNumber) existing.olaId = body.olaId || body.nidNumber || '';
      if (body.nidNumber) existing.nidNumber = body.nidNumber;
      if (body.dateOfBirth) existing.dateOfBirth = body.dateOfBirth;
      if (body.documentType) existing.documentType = body.documentType;
      if (body.documentFrontUrl) existing.documentFrontUrl = body.documentFrontUrl;
      if (body.documentBackUrl) existing.documentBackUrl = body.documentBackUrl;
      if (body.selfieUrl) existing.selfieUrl = body.selfieUrl;
      if (body.facePhotoUrl) existing.facePhotoUrl = body.facePhotoUrl;
      existing.status = 'pending';
      existing.submittedAt = now;
      existing.auditLog.push({
        action: 'RESUBMITTED',
        from: existing.status,
        to: 'PENDING',
        timestamp: now,
      } as any);
      await existing.save();
      await syncUserVerification(userId, existing);
      return existing;
    }

    const request = await VerificationRequest.create({
      userId,
      verificationType: body.documentFrontUrl ? 'nid' : 'face',
      accountType: body.accountType || 'host',
      fullName: body.fullName || user.nickname,
      olaId: body.olaId || body.nidNumber || user.uid,
      nidNumber: body.nidNumber,
      dateOfBirth: body.dateOfBirth || '',
      documentType: body.documentType || 'nid',
      documentFrontUrl: body.documentFrontUrl,
      documentBackUrl: body.documentBackUrl,
      selfieUrl: body.selfieUrl || '',
      facePhotoUrl: body.facePhotoUrl || '',
      status: 'pending',
      submittedAt: now,
      auditLog: [{ action: 'SUBMITTED', from: 'NOT_SUBMITTED', to: 'PENDING', timestamp: now }],
    });

    await syncUserVerification(userId, request);
    await notifyAdmins('New verification request', `${user.nickname} submitted a verification request`);

    return request;
  },

  /** The user's own application (returns request and user verification state). */
  async getMyRequest(userId: string) {
    const user = await User.findById(userId).select('verification');
    const requests = await VerificationRequest.find({ userId }).sort({ createdAt: -1 });
    const latestRequest = requests[0] || null;
    return {
      verification: user?.verification || {
        status: 'NOT_SUBMITTED',
        verified: false,
        faceVerified: false,
        nidVerified: false,
      },
      request: latestRequest,
      requests,
    };
  },

  /** Admin: list applications with optional status filter. */
  async getAll(query: { status?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;

    const total = await VerificationRequest.countDocuments(filter);
    const data = await VerificationRequest.find(filter)
      .populate('userId', 'uid nickname avatar phone role verification')
      .populate('reviewedBy', 'uid nickname')
      .sort({ submittedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    return { data, total };
  },

  /** Admin: approve — flips both the request and the user's verification state. */
  async approve(requestId: string, adminId: string) {
    const request = await VerificationRequest.findById(requestId);
    if (!request) throw new AppError('Verification request not found', 404);
    if (request.status === 'verified') throw new AppError('Request is already verified', 400);

    const now = new Date();
    const prevStatus = request.status;

    request.status = 'verified';
    request.reviewedAt = now;
    request.reviewedBy = adminId as any;
    request.auditLog.push({
      action: 'APPROVED',
      adminId,
      from: prevStatus === 'under_review' ? 'UNDER_REVIEW' : 'PENDING',
      to: 'VERIFIED',
      timestamp: now,
    } as any);
    await request.save();

    await syncUserVerification(request.userId.toString(), request);
    await auditService.logAudit(adminId, 'verification_approve', 'VerificationRequest', requestId);

    await notificationService.createNotification(
      request.userId.toString(),
      'system',
      'Account verified',
      'Congratulations! Your account verification has been approved by admin.',
      { verificationId: requestId }
    );

    try {
      getIO().to(`user:${request.userId.toString()}`).emit('verification:updated', {
        status: 'VERIFIED',
        verified: true,
      });
    } catch {
      // socket not initialized
    }

    return request;
  },

  /** Admin: reject with a reason — the user can resubmit. */
  async reject(requestId: string, adminId: string, reason?: string) {
    const request = await VerificationRequest.findById(requestId);
    if (!request) throw new AppError('Verification request not found', 404);
    if (request.status === 'verified') throw new AppError('Verified requests cannot be rejected', 400);

    const now = new Date();
    const prevStatus = request.status;

    request.status = 'rejected';
    request.rejectionReason = reason || 'Documents did not match the required criteria';
    request.reviewedAt = now;
    request.reviewedBy = adminId as any;
    request.auditLog.push({
      action: 'REJECTED',
      adminId,
      from: prevStatus === 'under_review' ? 'UNDER_REVIEW' : 'PENDING',
      to: 'REJECTED',
      timestamp: now,
    } as any);
    await request.save();

    await syncUserVerification(request.userId.toString(), request);
    await auditService.logAudit(adminId, 'verification_reject', 'VerificationRequest', requestId, { reason });

    await notificationService.createNotification(
      request.userId.toString(),
      'system',
      'Verification rejected',
      `Your verification request was not approved. Reason: ${request.rejectionReason}. You can submit a new request.`,
      { verificationId: requestId }
    );

    try {
      getIO().to(`user:${request.userId.toString()}`).emit('verification:updated', {
        status: 'REJECTED',
        verified: false,
        rejectionReason: request.rejectionReason,
      });
    } catch {
      // socket not initialized
    }

    return request;
  },
};

