import { isValidObjectId } from 'mongoose';
import { User, Agency, OtpChannel, OtpPurpose } from '../models';
import { signToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/hash';
import { AppError } from '../middleware/errorHandler';
import { verifyIdToken } from '../config/firebase';
import { otpService, SendOtpServiceResult } from './otp.service';
import { normalizePhoneNumber, getPhoneSearchVariants } from '../utils/phone.util';

const generateUid = async (): Promise<string> => {
  const count = await User.countDocuments();
  return String(168000 + count + 1);
};

// Self-heal: if a user is the agent of an agency but their role was corrupted
// (e.g., set to 'host' by a bad link operation), correct it so agent login/search work.
const ensureAgentRole = async (user: any) => {
  let changed = false;

  if (!user.role) {
    user.role = user.isAdmin ? 'admin' : user.isAgent ? 'agent' : user.agencyId ? 'host' : 'user';
    console.warn(`[Auth] User ${user.uid} had no role — derived role '${user.role}' from legacy flags`);
    changed = true;
  }

  // If user is an agency owner, they must be role 'agent' and not a host of their own agency
  const ownsAgency = await Agency.exists({ agentId: user._id });
  if (ownsAgency && user.role !== 'agent') {
    console.warn(`[Auth] User ${user.uid} is an agency owner but role is '${user.role}' — correcting to 'agent'`);
    user.role = 'agent';
    changed = true;
  }
  if (ownsAgency && user.agencyId) {
    // An agent cannot be a host of their own agency
    const own = await Agency.findById(user.agencyId);
    if (own && own.agentId.toString() === user._id.toString()) {
      console.warn(`[Auth] User ${user.uid} was host of their own agency — clearing agencyId`);
      user.agencyId = undefined as any;
      changed = true;
    }
  }

  if (changed) await user.save();
  return user;
};

export const authService = {
  async sendOtp(
    phone: string,
    channel: OtpChannel = 'sms',
    purpose: OtpPurpose = 'signup'
  ): Promise<SendOtpServiceResult> {
    return otpService.sendOtp({
      rawPhone: phone,
      channel,
      purpose,
      checkExistingUser: purpose === 'signup',
    });
  },

  async resendOtp(
    phone: string,
    channel: OtpChannel = 'sms',
    purpose: OtpPurpose = 'signup'
  ): Promise<SendOtpServiceResult> {
    return otpService.sendOtp({
      rawPhone: phone,
      channel,
      purpose,
      checkExistingUser: purpose === 'signup',
    });
  },

  async verifyOtpOnly(phone: string, code: string, purpose: OtpPurpose = 'signup') {
    return otpService.verifyOtp({ rawPhone: phone, code, purpose });
  },

  async verifyOtpAndLogin(phone: string, code?: string, idToken?: string, purpose: OtpPurpose = 'login') {
    let verifiedPhone = phone;

    if (code) {
      const verifyRes = await otpService.verifyOtp({ rawPhone: phone, code, purpose });
      verifiedPhone = verifyRes.phone;
    } else if (idToken) {
      const decoded = await verifyIdToken(idToken);
      if (!decoded) throw new AppError('Firebase auth unavailable', 503);
      verifiedPhone = decoded.phone_number || phone;
    } else {
      throw new AppError('Verification code is required', 400);
    }

    const norm = normalizePhoneNumber(verifiedPhone);
    const targetPhone = norm.isValid ? norm.e164 : verifiedPhone;

    let user = await User.findOne({ phone: targetPhone });

    if (!user) {
      // Auto-register
      const uid = await generateUid();
      user = await User.create({
        uid,
        phone: targetPhone,
        nickname: `User${uid.slice(-4)}`,
        avatar: '',
      });
    }

    if (user.isBanned) {
      throw new AppError('Account is banned', 403);
    }

    await ensureAgentRole(user);

    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });

    return { token, user: user.toObject() };
  },

  async loginWithPassword(identifier: string, password: string) {
    const raw = (identifier || '').trim();
    console.log(`[Auth] Login attempt — identifier: ${raw}`);
    if (!raw) {
      throw new AppError('Phone number or email is required', 400);
    }
    if (!password) {
      throw new AppError('Password is required', 400);
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
    let user;

    if (isEmail) {
      user = await User.findOne({ email: raw.toLowerCase() }).select('+password');
    } else {
      const variants = getPhoneSearchVariants(raw);
      user = await User.findOne({
        $or: [
          { phone: { $in: variants } },
          { email: raw.toLowerCase() },
          { username: new RegExp(`^${raw}$`, 'i') },
          { uid: raw },
        ],
      }).select('+password');
    }

    if (!user) {
      console.warn(`[Auth] Login FAILED — no user found for identifier: ${raw}`);
      throw new AppError('Invalid credentials. No account found.', 404);
    }

    // Self-heal: fix missing/corrupted roles before proceeding
    await ensureAgentRole(user);

    console.log(`[Auth] User found — uid: ${user.uid}, role: ${user.role}, isAgent: ${user.isAgent}, isAdmin: ${user.isAdmin}, banned: ${user.isBanned}`);

    if (!user.password) {
      console.warn(`[Auth] Login FAILED — user ${user.uid} has no password set (OTP-only account)`);
      throw new AppError('Please use OTP login or reset password', 400);
    }
    if (user.isBanned) {
      console.warn(`[Auth] Login FAILED — user ${user.uid} is banned`);
      throw new AppError('Account is banned', 403);
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      console.warn(`[Auth] Login FAILED — invalid password for user ${user.uid} (${raw})`);
      throw new AppError('Invalid password', 401);
    }

    console.log(`[Auth] Login SUCCESS — uid: ${user.uid}, role: ${user.role}`);
    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });

    return { token, user: user.toObject() };
  },

  async loginWithGoogle(idToken: string) {
    const decoded = await verifyIdToken(idToken);
    if (!decoded) throw new AppError('Firebase auth unavailable — check FIREBASE_SERVICE_ACCOUNT', 503);
    const googleId = decoded.uid;
    const email = decoded.email || '';
    const name = decoded.name || 'User';

    let user = await User.findOne({ googleId });

    if (!user) {
      const uid = await generateUid();
      user = await User.create({
        uid,
        phone: `google_${googleId}`,
        googleId,
        nickname: name,
        avatar: decoded.picture || '',
      });
    }

    if (user.isBanned) throw new AppError('Account is banned', 403);

    await ensureAgentRole(user);

    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });

    return { token, user: user.toObject() };
  },

  async loginWithFacebook(idToken?: string, accessToken?: string) {
    let facebookId: string = '';
    let email: string = '';
    let name: string = 'Facebook User';
    let avatar: string = '';

    // 1. Try Firebase ID Token verification
    if (idToken) {
      const decoded = await verifyIdToken(idToken);
      if (decoded) {
        facebookId = decoded.uid || (decoded as any).user_id || '';
        email = decoded.email || '';
        name = decoded.name || 'Facebook User';
        avatar = decoded.picture || '';
      }
    }

    // 2. If access token provided or fallback
    if (!facebookId && accessToken) {
      try {
        const axios = (await import('axios')).default;
        const fbRes = await axios.get(
          `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
        );
        if (fbRes.data?.id) {
          facebookId = fbRes.data.id;
          name = fbRes.data.name || name;
          email = fbRes.data.email || email;
          avatar = fbRes.data.picture?.data?.url || avatar;
        }
      } catch (e) {
        console.warn('Facebook Graph API fetch failed:', (e as Error).message);
      }
    }

    if (!facebookId) {
      throw new AppError('Unable to authenticate with Facebook. Invalid token or credentials.', 401);
    }

    // Check if user exists by facebookId or matching email
    let user = await User.findOne({
      $or: [
        { facebookId },
        ...(email ? [{ email }] : []),
      ],
    });

    if (!user) {
      const uid = await generateUid();
      user = await User.create({
        uid,
        phone: `fb_${facebookId}`,
        facebookId,
        email: email || undefined,
        nickname: name,
        avatar,
      });
    } else if (!user.facebookId) {
      user.facebookId = facebookId;
      if (!user.avatar && avatar) user.avatar = avatar;
      await user.save();
    }

    if (user.isBanned) throw new AppError('Account is banned', 403);

    await ensureAgentRole(user);

    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });

    return { token, user: user.toObject() };
  },

  async devLogin(phone: string, nickname?: string) {
    let user = await User.findOne({ phone });
    if (!user) {
      const uid = await generateUid();
      user = await User.create({
        uid,
        phone,
        nickname: nickname || `User${uid.slice(-4)}`,
        avatar: '',
      });
    }
    await ensureAgentRole(user);
    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });
    return { token, user: user.toObject() };
  },

  /**
   * Search for a user account by Phone, UID, Username, or Email (for Password Reset flow).
   */
  async searchAccount(query: string) {
    const raw = query.trim();
    if (!raw) throw new AppError('Please enter a phone number, account ID, or username', 400);

    const phoneVariants = getPhoneSearchVariants(raw);
    const safeRaw = raw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    const filter: any[] = [
      { uid: raw },
      { username: new RegExp(`^${safeRaw}$`, 'i') },
      { nickname: new RegExp(`^${safeRaw}$`, 'i') },
      { email: raw.toLowerCase() },
    ];

    if (phoneVariants.length > 0) {
      filter.push({ phone: { $in: phoneVariants } });
      filter.push({ phone: raw });
    }

    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 4) {
      filter.push({ phone: new RegExp(digitsOnly + '$') });
    }

    if (raw.includes('@')) {
      filter.push({ phone: `email_${raw.toLowerCase()}` });
    }

    const user = await User.findOne({ $or: filter }).select('uid nickname avatar phone email username');
    if (!user) {
      throw new AppError('No account found matching this phone number, UID, or username. Please check and try again.', 404);
    }

    // Mask phone for privacy preview
    const phoneStr = user.phone || '';
    const maskedPhone =
      phoneStr.length >= 7
        ? `${phoneStr.slice(0, 4)}****${phoneStr.slice(-4)}`
        : phoneStr;

    return {
      uid: user.uid,
      nickname: user.nickname,
      username: user.username,
      avatar: user.avatar,
      phone: maskedPhone,
      rawPhone: user.phone,
      email: user.email ? `${user.email.slice(0, 2)}****@${user.email.split('@')[1] || ''}` : undefined,
    };
  },

  async register(
    phoneOrParams:
      | string
      | {
          fullName?: string;
          username?: string;
          phone?: string;
          email?: string;
          nickname?: string;
          password?: string;
          confirmPassword?: string;
          birthday?: string | Date;
          dob?: string | Date;
          gender?: 'male' | 'female' | 'other' | 'unspecified';
          inviteCode?: string;
          inviter?: string;
          avatar?: string;
          verificationToken?: string;
          code?: string;
        },
    nicknameParam?: string,
    passwordParam?: string,
    verificationTokenParam?: string,
    codeParam?: string
  ) {
    let fullName: string | undefined;
    let username: string | undefined;
    let phone: string | undefined;
    let email: string | undefined;
    let nickname: string;
    let password: string | undefined;
    let birthday: Date | undefined;
    let gender: 'male' | 'female' | 'other' | 'unspecified' = 'unspecified';
    let inviteCode: string | undefined;
    let verificationToken: string | undefined;
    let code: string | undefined;

    if (typeof phoneOrParams === 'object' && phoneOrParams !== null) {
      fullName = phoneOrParams.fullName;
      username = phoneOrParams.username;
      phone = phoneOrParams.phone;
      email = phoneOrParams.email;
      nickname = phoneOrParams.nickname || phoneOrParams.fullName || phoneOrParams.username || '';
      password = phoneOrParams.password;
      const rawDob = phoneOrParams.birthday || phoneOrParams.dob;
      if (rawDob) {
        const parsed = new Date(rawDob);
        if (!isNaN(parsed.getTime())) {
          birthday = parsed;
        }
      }
      if (phoneOrParams.gender) {
        gender = phoneOrParams.gender;
      }
      inviteCode = phoneOrParams.inviteCode || phoneOrParams.inviter;
      verificationToken = phoneOrParams.verificationToken;
      code = phoneOrParams.code;
    } else {
      phone = phoneOrParams;
      nickname = nicknameParam || '';
      password = passwordParam;
      verificationToken = verificationTokenParam;
      code = codeParam;
    }

    if (!fullName || fullName.trim().length < 1) {
      throw new AppError('Full name is required', 400);
    }

    const rawPhone = phone?.trim();
    const rawEmail = email?.trim().toLowerCase();

    if (!rawPhone && !rawEmail) {
      throw new AppError('Please provide a Mobile Phone Number or Gmail address', 400);
    }

    let normalizedPhone: string | undefined;
    if (rawPhone) {
      const phoneResult = normalizePhoneNumber(rawPhone);
      if (!phoneResult.isValid) {
        throw new AppError(phoneResult.error || 'Invalid phone number format', 400);
      }
      normalizedPhone = phoneResult.e164;

      // Strict One Number = One Account check across all phone variations
      const phoneVariants = getPhoneSearchVariants(rawPhone);
      const existingPhone = await User.findOne({ phone: { $in: phoneVariants } });
      if (existingPhone) {
        throw new AppError('An account with this phone number already exists. Please log in or use Forgot Password.', 409);
      }
    }

    if (rawEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        throw new AppError('Please enter a valid Gmail / email address', 400);
      }
      const existingEmail = await User.findOne({ email: rawEmail });
      if (existingEmail) {
        throw new AppError('An account with this Gmail / email already exists. Please log in.', 409);
      }
    }

    // Ensure we have a valid unique phone field for MongoDB user record
    const finalPhone = normalizedPhone || `email_${rawEmail}`;
    const existingUserPhone = await User.findOne({ phone: finalPhone });
    if (existingUserPhone) {
      throw new AppError('An account with this Gmail already exists. Please log in.', 409);
    }

    if (username && username.trim()) {
      const existingUser = await User.findOne({ username: new RegExp(`^${username.trim()}$`, 'i') });
      if (existingUser) throw new AppError('This username is already taken. Please choose another.', 409);
    }

    if (!password || password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    // Verify OTP token, Firebase idToken, or direct code if registering with phone
    if (normalizedPhone) {
      if ((phoneOrParams as any).idToken) {
        try {
          const decoded = await verifyIdToken((phoneOrParams as any).idToken);
          if (decoded?.phone_number && decoded.phone_number !== normalizedPhone) {
            throw new AppError('Phone verification token mismatch', 401);
          }
        } catch (fbErr: any) {
          if (code) {
            await otpService.verifyOtp({ rawPhone: normalizedPhone, code, purpose: 'signup' });
          } else {
            throw new AppError('Invalid or expired phone verification token', 401);
          }
        }
      } else if (verificationToken) {
        const isValid = await otpService.consumeVerificationToken(
          normalizedPhone,
          verificationToken,
          'signup'
        );
        if (!isValid) {
          throw new AppError('Phone verification expired or invalid. Please verify your phone number again.', 400);
        }
      } else if (code) {
        await otpService.verifyOtp({ rawPhone: normalizedPhone, code, purpose: 'signup' });
      } else {
        throw new AppError('Phone verification OTP code is required to create an account.', 400);
      }
    }

    // Resolve Inviter / Referral Code if provided
    let invitedById: any = undefined;
    const cleanInvite = (inviteCode || '').trim();
    if (cleanInvite) {
      const inviter = await User.findOne({
        $or: [
          { uid: cleanInvite },
          { username: new RegExp(`^${cleanInvite}$`, 'i') },
          { phone: cleanInvite },
          ...(isValidObjectId(cleanInvite) ? [{ _id: cleanInvite }] : []),
        ],
      });
      if (inviter) {
        invitedById = inviter._id;
        console.log(`[Auth] Account linked to inviter: ${inviter.uid} (${inviter._id})`);
      } else {
        console.warn(`[Auth] Referral code '${cleanInvite}' not found — proceeding without inviter`);
      }
    }

    const uid = await generateUid();
    const data: any = {
      uid,
      phone: finalPhone,
      fullName: fullName.trim(),
      username: username?.trim().toLowerCase() || undefined,
      email: rawEmail || undefined,
      nickname: nickname.trim() || fullName.trim() || `User${uid.slice(-4)}`,
      gender: gender || 'unspecified',
      birthday: birthday || undefined,
      invitedBy: invitedById,
      avatar: '',
    };

    data.password = await hashPassword(password);

    const user = await User.create(data);

    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });

    return { token, user: user.toObject() };
  },

  /**
   * Forgot-password reset supporting verificationToken, OTP code or Firebase ID token.
   */
  async resetPassword(phone: string, newPassword: string, code?: string, idToken?: string, verificationToken?: string) {
    const phoneResult = normalizePhoneNumber(phone);
    const normalizedPhone = phoneResult.isValid ? phoneResult.e164 : phone;

    if (verificationToken) {
      const isValid = await otpService.consumeVerificationToken(
        normalizedPhone,
        verificationToken,
        'reset_password'
      );
      if (!isValid) {
        throw new AppError('Verification token expired or invalid. Please verify OTP again.', 400);
      }
    } else if (code) {
      await otpService.verifyOtp({ rawPhone: normalizedPhone, code, purpose: 'reset_password' });
    } else if (idToken) {
      const decoded = await verifyIdToken(idToken);
      if (!decoded) throw new AppError('Firebase auth unavailable', 503);
      if (decoded.phone_number && decoded.phone_number !== normalizedPhone) {
        throw new AppError('Phone verification failed', 401);
      }
    } else {
      throw new AppError('Verification code or token is required to reset password', 400);
    }

    const phoneVariants = getPhoneSearchVariants(phone);
    const user = await User.findOne({
      $or: [
        { phone: { $in: phoneVariants } },
        { phone: phone },
        { email: phone.toLowerCase() },
        { uid: phone },
      ],
    });
    if (!user) throw new AppError('Account not found with this phone number or ID', 404);

    if (user.isBanned) throw new AppError('Account is banned', 403);

    user.password = await hashPassword(newPassword);
    await user.save();

    return { success: true, message: 'Password updated successfully' };
  },
};
